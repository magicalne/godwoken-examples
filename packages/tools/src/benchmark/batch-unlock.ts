import { Cell, core as LumosBaseCore, Hash, HexString, Script, utils as LumosUtils, WitnessArgs } from "@ckb-lumos/base";
import { CkbIndexer } from "../account/indexer-remote";
import { asyncSleep, privateKeyToCkbAddress, promiseAllLimitN, retry } from "../modules/utils";
import { core as GodwokenSchemas, normalizer } from "@godwoken-examples/godwoken";
import { normalizers, Reader } from "ckb-js-toolkit";
import { logger } from "../modules/logger";
import { deploymentConfig } from "../modules/deployment-config";
import { parseAddress, sealTransaction, TransactionSkeleton } from "@ckb-lumos/helpers";
import { privKeys } from "./accounts";
import { initConfigAndSync } from "../account/common";
import { getSudtCellDep } from "../account/unlock";
import { common as LumosCommonScripts } from "@ckb-lumos/common-scripts";
import { key as LumosHdKey } from "@ckb-lumos/hd";
import { testnetCkbIndexerURL, testnetCkbRpc, testnetCkbRpcUrl } from "../common";
import { ROLLUP_TYPE_HASH } from "../modules/godwoken-config";

/**
 * Send unlock Transaction for multi finalized withdrawal cells
 * @param ckbIndexer 
 * @param withdrawalCells multi finalized withdrawal cells
 * @param privKey 
 * @param sudtScript 
 * @returns 
 */
async function sendUnlockTransaction(
  ckbIndexer: CkbIndexer,
  withdrawalCells: Cell[],
  privKey: string,
  sudtScript?: Script): Promise<Hash | undefined> {

  logger.debug("withdrawalCell:", withdrawalCells);
  if (withdrawalCells.length === 0) return undefined;

  const ckbAddress = privateKeyToCkbAddress(privKey);
  console.log("CKB address:", ckbAddress);
  const lockScript = parseAddress(ckbAddress);

  // Build UnlockWithdrawal::UnlockWithdrawalViaFinalize and put into withess
  const data = "0x00000000" + new Reader(
    GodwokenSchemas.SerializeUnlockWithdrawalViaFinalize(
      normalizer.NormalizeUnlockWithdrawalViaFinalize({})
    )
  ).serializeJson().slice(2);
  logger.debug("withdrawal_witness:", data);
  const newWitnessArgs: WitnessArgs = {
    lock: data,
  };
  const withdrawalWitness = new Reader(
    LumosBaseCore.SerializeWitnessArgs(
      normalizers.NormalizeWitnessArgs(newWitnessArgs)
    )
  ).serializeJson();

  const rollupCell = await ckbIndexer.getRollupCell();
  if (rollupCell == null) {
    console.error("[ERROR]: rollupCell not found");
    return;
  }

  let txSkeleton = TransactionSkeleton({ cellProvider: ckbIndexer });
  // TODO: andle multi withdrawalCells
  for (const withdrawalCell of withdrawalCells) {
    txSkeleton = txSkeleton
      .update("inputs", inputs => inputs.push(withdrawalCell))
      .update("outputs", outputs => outputs.push({
        cell_output: {
          capacity: withdrawalCell.cell_output.capacity,
          lock: lockScript,
          type: withdrawalCell.cell_output.type,
        },
        data: withdrawalCell.data,
      }));
  }
  txSkeleton = txSkeleton
    .update("cellDeps", cellDeps => cellDeps.push(deploymentConfig.withdrawal_lock_dep))
    .update("cellDeps", cellDeps => cellDeps.push({
      out_point: rollupCell.out_point!,
      dep_type: "code"
    }))
    .update("witnesses", witnesses => witnesses.push(withdrawalWitness))
    .update("fixedEntries", fixedEntries => fixedEntries.push(
      { field: "outputs", index: 0 })
    );
  if (!!sudtScript) {
    txSkeleton = txSkeleton.update("cellDeps",
      cellDeps => cellDeps.push(getSudtCellDep()));
  }
  txSkeleton = await LumosCommonScripts.payFeeByFeeRate(
    txSkeleton,
    [ckbAddress],
    BigInt(1000)
  );
  txSkeleton = LumosCommonScripts.prepareSigningEntries(txSkeleton);

  logger.debug("UnlockTransaction:", JSON.stringify(txSkeleton.toJS(), null, 2));
  const message: HexString = txSkeleton.get("signingEntries").get(0)!.message;
  const content: HexString = LumosHdKey.signRecoverable(message, privKey);
  const tx = sealTransaction(txSkeleton, [content]);
  logger.debug("sealTransaction.inputs:", tx.inputs);

  const txHash: Hash | undefined = await testnetCkbRpc.send_transaction(tx, "passthrough");
  console.log("UnlockTransaction Hash:", txHash);
  
  let timeoutID = setTimeout(() => {
    throw new Error("Withdrawal timeout");
  }, 300000); // 300s
  // waitForTxCommitted
  while (true) {
    await asyncSleep(6710); // average block time of CKB aggron testnet
    try {
      const txWithStatus = await testnetCkbRpc.get_transaction(txHash);
      logger.debug(`current tx status: ${txWithStatus.tx_status}`);
      if (txWithStatus.tx_status.status === "committed") {
        console.log(`UnlockTransaction ${txHash} committed!`);
        clearTimeout(timeoutID);
        return txHash;
      }
      if (txWithStatus.tx_status.status === "rejected") {
        clearTimeout(timeoutID);
        return Promise.reject("UnlockTransaction ${txHash} failed!");
      }
    } catch (error) {
      console.error("Unknown Error:", error);
      clearTimeout(timeoutID);
      throw error;
    }
  }
}

/**
 * To complete the withdrawal process, we should unlock the withdrawable funds
 * generated by witdraw-request.
 */
async function findFinalizedWithdrawals(
  ckbIndexer: CkbIndexer,
  limit: Number,
  privKey: HexString,
  sudtScript?: Script,
): Promise<Cell[]> {
  const withdrawalCells: Cell[] = [];

  let rollupCell = await ckbIndexer.getRollupCell();
  if (rollupCell == null) {
    console.error("[ERROR]: rollupCell not found");
    return withdrawalCells;
  }

  const ckbAddress = privateKeyToCkbAddress(privKey);
  console.log("CKB address:", ckbAddress);
  const lockScript = parseAddress(ckbAddress);
  const lock_script_hash = LumosUtils.computeScriptHash(lockScript);

  const globalState = new GodwokenSchemas.GlobalState(new Reader(rollupCell.data));
  const last_finalized_block_number = globalState
    .getLastFinalizedBlockNumber()
    .toLittleEndianBigUint64();
  logger.debug("last_finalized_block_number", last_finalized_block_number);

  // * search withdrawal locked cell by:
  //   - withdrawal lock code hash
  //   - owner secp256k1 blake2b160 lock hash
  //   - last_finalized_block_number
  const withdrawal_lock = deploymentConfig.withdrawal_lock;
  const withdrawalCollector = ckbIndexer.collector({
    lock: {
      code_hash: withdrawal_lock.code_hash,
      hash_type: withdrawal_lock.hash_type,
      args: ROLLUP_TYPE_HASH, // prefix search
    },
    type: sudtScript ? sudtScript : "empty",
    argsLen: "any",
    // testnet skip
    skip: 3000000, // TODO: this config does not work?
  });
  let unFinalizedWithdrawalCellNum = 0;
  const searchTime = 300; // senconds
  let timeout: boolean = false;
  setTimeout(() => timeout = true, searchTime * 1000);
  console.time(`[${ckbAddress}] searching withdrawal_cells`);
  for await (const cell of withdrawalCollector.collect()) {
    const lock_args = cell.cell_output.lock.args;
    const withdrawal_lock_args_data = "0x" + lock_args.slice(66);
    const withdrawal_lock_args = new GodwokenSchemas.WithdrawalLockArgs(
      new Reader(withdrawal_lock_args_data)
    );
    const owner_lock_hash = new Reader(
      withdrawal_lock_args.getOwnerLockHash().raw()
    ).serializeJson();
    if (owner_lock_hash !== lock_script_hash) {
      continue;
    }

    logger.debug(`[${ckbAddress}]: withdrawalCell:`, cell);
    const withdrawal_block_number = withdrawal_lock_args
      .getWithdrawalBlockNumber()
      .toLittleEndianBigUint64();
    logger.debug("withdrawal_block_number", withdrawal_block_number);
    if (withdrawal_block_number > last_finalized_block_number) {
      logger.debug(`(${withdrawal_block_number} > ${last_finalized_block_number})
        => This withdrawal cell is not finalized.`);
      unFinalizedWithdrawalCellNum++;
      continue;
    }

    withdrawalCells.push(cell);
    if (timeout || withdrawalCells.length >= limit) break;
  }
  console.timeEnd(`[${ckbAddress}] searching withdrawal_cells`);

  if (withdrawalCells.length === 0 && unFinalizedWithdrawalCellNum === 0) {
    console.warn(`[${ckbAddress}]: No valid withdrawal cell found`);
  }

  console.log(
    `[${ckbAddress}] found ${withdrawalCells.length} finalized withdrawal cells and ${unFinalizedWithdrawalCellNum} unfinalized withdrawal cells`
  );
  return withdrawalCells;
}

async function batchUnlock(privKeys: string[]) {
  const ckbIndexer = await initConfigAndSync(testnetCkbRpcUrl, testnetCkbIndexerURL);
  const maxWithdrawalCells = 1;

  let promiseArray = privKeys.map(privKey => async () => {
    // search finalized withdrawal cells
    const withdrawalCells = await findFinalizedWithdrawals(
      ckbIndexer,
      maxWithdrawalCells,
      privKey
    ).catch(e => {
      console.error(e);
      return [];
    });

    retry(() => sendUnlockTransaction(ckbIndexer, withdrawalCells, privKey), 3)
      .catch(console.error);
  });

  promiseAllLimitN(2, promiseArray).catch(console.error);
}

/**
 * Enviroments:
 * GW_NET=<GodwokenNetwork>
 * DEBUG=true
 * 
 * Usage:
 * DEBUG=true GW_NET=testnet yarn ts-node src/benchmark/batch-unlock.ts [accountNum]
 */
(async () => {
  const args = process.argv.slice(2);
  const endIdx = args[0] || privKeys.length;
  console.log(`\t Using accounts[0..${endIdx}]`);

  batchUnlock(
    // (<any>GodwokenNetwork)[process.env.GW_NET || "alphanet"],
    privKeys.slice(0, Number(endIdx))
  );
})();
