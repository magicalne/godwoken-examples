import { Cell, core as LumosBaseCore, Hash, HexString, Script, utils as LumosUtils, WitnessArgs } from "@ckb-lumos/base";
import { CkbIndexer } from "../account/indexer-remote";
import { asyncSleep, privateKeyToCkbAddress, promiseAllLimitN, retry } from "../modules/utils";
import { core as GodwokenSchemas, normalizer } from "@godwoken-examples/godwoken";
import { normalizers, Reader, RPC } from "ckb-js-toolkit";
import { logger } from "../modules/logger";
import { deploymentConfig } from "../modules/deployment-config";
import { parseAddress, sealTransaction, TransactionSkeleton } from "@ckb-lumos/helpers";
import { privKeys } from "./accounts";
import { initConfigAndSync } from "../account/common";
import { getSudtCellDep } from "../account/unlock";
import { common as LumosCommonScripts } from "@ckb-lumos/common-scripts";
import { key as LumosHdKey } from "@ckb-lumos/hd";
import { testnetCkbIndexerURL, testnetCkbRpcUrl } from "../common";
import { ROLLUP_TYPE_HASH } from "../modules/godwoken-config";

interface WithdrawalCellList {
  privKey: string;
  withdrawalCells: Cell[];
}

let totalSentTxCount = 0;
let succeedCount = 0;

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

  // Build UnlockWithdrawal::UnlockWithdrawalViaFinalize and put it into withess
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

  let rollupCell = await ckbIndexer.getRollupCell();
  if (rollupCell == null) {
    console.error("[ERROR]: rollupCell not found");
    return;
  }
  // wait for the next live rollupCell
  const ckbRpc = new RPC(process.env.CKB_RPC_URL || testnetCkbRpcUrl);
  while (true) {
    const result = await ckbRpc.get_live_cell(rollupCell!.out_point, false);
    logger.debug("waiting for the next rollupCell...");
    if (result.status !== 'live') {
      break;
    }
    await asyncSleep(2000);
  }

  // use the fresh rollupCell to construct the transaction
  rollupCell = await ckbIndexer.getRollupCell();
  if (rollupCell == null) {
    console.error("[ERROR]: rollupCell not found");
    return;
  }
  let txSkeleton = TransactionSkeleton({ cellProvider: ckbIndexer });
  // TODO: handle multi withdrawalCells
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
      out_point: rollupCell!.out_point!,
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

  const txHash: Hash | undefined = await ckbRpc.send_transaction(tx, "passthrough");
  console.log("UnlockTransaction Hash:", txHash);
  totalSentTxCount++;

  let timeout: boolean = false;
  let timeoutId = setTimeout(() => timeout = true, 300000); // 300s
  while (true) { // waitForTxCommitted
    if (timeout) return Promise.reject("Withdrawal timeout");
    await asyncSleep(6710); // average block time of CKB aggron testnet

    try {
      const txWithStatus = await ckbRpc.get_transaction(txHash);
      logger.debug(`current tx status: ${txWithStatus.tx_status?.status}`);
      if (txWithStatus.tx_status.status === "committed") {
        logger.debug(`UnlockTransaction ${txHash} committed!`);
        clearTimeout(timeoutId);
        succeedCount++;
        console.log(`|
| SuccessRate (succeedCount/totalSentTxCount): ${(succeedCount * 100 / totalSentTxCount).toFixed(2)}% (${succeedCount}/${totalSentTxCount})
|`);
        return txHash;
      }
      if (txWithStatus.tx_status.status === "rejected") {
        clearTimeout(timeoutId);
        return Promise.reject(`UnlockTransaction ${txHash} failed!`);
      }
    } catch (error) {
      console.error("Unknown Error:", error);
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

/**
 * To complete the withdrawal process, we should unlock the withdrawable funds
 * generated by witdraw-request.
 */
async function searchFinalizedWithdrawals(
  ckbIndexer: CkbIndexer,
  lockScriptHashMap: Map<string, WithdrawalCellList>,
  sudtScript?: Script,
) {
  let rollupCell = await ckbIndexer.getRollupCell();
  if (rollupCell == null) {
    console.error("[ERROR]: rollupCell not found");
    return;
  }

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
    // skip: 30, // this config does not work?
  });
  let finalizedWithdrawalCellNum = 0;
  const searchTime = 300; // senconds
  let timeout: boolean = false;
  let timeoutId = setTimeout(() => timeout = true, searchTime * 1000);
  try {
    console.time(`search withdrawal_cells took`);
    for await (const cell of withdrawalCollector.collect()) {
      const lock_args = cell.cell_output.lock.args;
      const withdrawal_lock_args_data = "0x" + lock_args.slice(66);
      const withdrawal_lock_args = new GodwokenSchemas.WithdrawalLockArgs(
        new Reader(withdrawal_lock_args_data)
      );
      const owner_lock_hash = new Reader(
        withdrawal_lock_args.getOwnerLockHash().raw()
      ).serializeJson();

      if (!lockScriptHashMap.has(owner_lock_hash)) {
        continue;
      }

      logger.debug(`[${owner_lock_hash}]: withdrawalCell:`, cell);
      const withdrawal_block_number = withdrawal_lock_args
        .getWithdrawalBlockNumber()
        .toLittleEndianBigUint64();
      logger.debug("withdrawal_block_number", withdrawal_block_number);
      if (withdrawal_block_number > last_finalized_block_number) {
        logger.debug(`(${withdrawal_block_number} > ${last_finalized_block_number})
        => This withdrawal cell is not finalized.`);
        continue;
      }

      logger.debug("withdrawalCell.out_point", cell.out_point);
      lockScriptHashMap.get(owner_lock_hash)?.withdrawalCells.push(cell);
      finalizedWithdrawalCellNum++;
      logger.debug(`Found ${finalizedWithdrawalCellNum} finalized withdrawal cells`);
      await asyncSleep(10);

      if (timeout) break;
    }
  } catch (error) {
    console.error("withdrawalCollector.collect Error:", error);
    return;
  } finally {
    clearTimeout(timeoutId);
    console.timeEnd(`search withdrawal_cells took`);
    console.log(`Found ${finalizedWithdrawalCellNum} finalized withdrawal cells`);
  }

  if (finalizedWithdrawalCellNum === 0) {
    console.warn(`No finalized withdrawal cell belongs to the accounts found`);
  }
}

async function batchUnlock(privKeys: string[]) {
  asyncSleep(5 * 3600 * 1000).then(() => process.exit(0));

  const ckbIndexer = await initConfigAndSync(
    process.env.CKB_RPC_URL || testnetCkbRpcUrl,
    process.env.CKB_INDEXER_URL || testnetCkbIndexerURL
  );
  const lockScriptHashMap = getLockScriptHashMap(privKeys);

  // search finalized withdrawal cells
  let isSearchTaskCompleted = false;
  searchFinalizedWithdrawals( // TODO(P-low): cache the cursor
    ckbIndexer,
    lockScriptHashMap
  ).catch(e => {
    console.error(e);
  }).then(() => {
    isSearchTaskCompleted = true;
  });

  while (true) {
    // run unlock Jobs
    const unlockJobs: (() => Promise<void>)[] = [];
    lockScriptHashMap.forEach((withdrawalCellList, key) => {
      const withdrawalCells = withdrawalCellList.withdrawalCells;
      if (withdrawalCells.length > 0) {
        const wCell = withdrawalCells.shift()!;
        logger.debug("withdrawalCell.out_point", wCell.out_point);
        unlockJobs.push(async () => {
          await asyncSleep(Math.random() * 7220);
          await retry(
            () => sendUnlockTransaction(ckbIndexer, [wCell], withdrawalCellList.privKey),
            3, 6000
          ).catch(console.error);
        });
      }
    });

    if (unlockJobs.length === 0) {
      if (isSearchTaskCompleted) {
        console.log("no finalized withdrawal cells to be unlocked");
        break;
      }
      await asyncSleep(6000);
      continue;
    }

    console.log(`process ${unlockJobs.length} unlockJobs`);  
    await promiseAllLimitN(150, unlockJobs);
  }
}

function getLockScriptHashMap(privKeys: string[]): Map<string, WithdrawalCellList> {
  let map = new Map();
  for (const privKey of privKeys) {
    const ckbAddress = privateKeyToCkbAddress(privKey);
    const lockScript = parseAddress(ckbAddress);
    const lockScriptHash = LumosUtils.computeScriptHash(lockScript);
    map.set(lockScriptHash, {
      privKey,
      withdrawalCells: [] as Cell[]
    });
  }
  return map;
}

/**
 * Default Enviroments:
 * - CKB_RPC_URL=https://testnet.ckb.dev/rpc
 * - CKB_INDEXER_URL=https://testnet.ckb.dev/indexer
 * - GW_NET=<GodwokenNetwork or GodwokenWeb3Url>, default to testnet
 * - DEBUG=false
 * 
 * Usage:
 * DEBUG=true GW_NET=testnet yarn ts-node src/benchmark/batch-unlock.ts [accountNum]
 *
 * ```sh
 * # Example:
 * DEBUG=true \
 * CKB_RPC_URL=http://localhost:18114 CKB_INDEXER_URL=http://localhost:18116 \
 *   GW_NET=alphanet yarn ts-node src/benchmark/batch-unlock.ts 2
 * ```
 */
(async () => {
  const args = process.argv.slice(2);
  const endIdx = args[0] || privKeys.length;
  console.log(`\t Using accounts[0..${endIdx}]`);

  batchUnlock(privKeys.slice(0, Number(endIdx)));
})();
