import { Cell, core as LumosBaseCore, Hash, HexString, Script, TransactionWithStatus, utils as LumosUtils, utils, WitnessArgs } from "@ckb-lumos/base";
import { CkbIndexer } from "../account/indexer-remote";
import { asyncSleep, privateKeyToCkbAddress, retry } from "../modules/utils";
import { core as GodwokenSchemas, Godwoken, normalizer } from "@godwoken-examples/godwoken";
import { normalizers, Reader, RPC } from "ckb-js-toolkit";
import { logger } from "../modules/logger";
import { deploymentConfig } from "../modules/deployment-config";
import { parseAddress, sealTransaction, TransactionSkeleton } from "@ckb-lumos/helpers";
import { privKeys } from "./accounts";
import { initConfigAndSync } from "../account/common";
import { getSudtCellDep } from "../account/unlock";
import { common as LumosCommonScripts } from "@ckb-lumos/common-scripts";
import { key as LumosHdKey } from "@ckb-lumos/hd";
import { getGodwokenWeb3, GodwokenNetwork, testnetCkbIndexerURL, testnetCkbRpc, testnetCkbRpcUrl } from "../common";
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
  sudtScript?: Script): Promise<Hash | undefined> {

  logger.debug("withdrawalCell:", withdrawalCells);
  if (withdrawalCells.length === 0) return undefined;

  const privKey = (withdrawalCells[0] as any).privKey;
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

  // TODO: use gw_get_last_submitted_info to getRollupCell
  let rollupCell: Cell | undefined;
  if (process.env.GW_NET === GodwokenNetwork.alphanet as string) {
    console.log("getRollupCellByGwLastSubmittedInfo");
    
    rollupCell = await getRollupCellByGwLastSubmittedInfo();
  } else {
    rollupCell = await ckbIndexer.getRollupCell();
  }
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

  const txHash: Hash | undefined = await testnetCkbRpc.send_transaction(tx, "passthrough");
  console.log("UnlockTransaction Hash:", txHash);

  let timeout: boolean = false;
  let timeoutId = setTimeout(() => timeout = true, 300000); // 300s
  while (true) { // waitForTxCommitted
    if (timeout) return Promise.reject("Withdrawal timeout");
    await asyncSleep(6710); // average block time of CKB aggron testnet

    try {
      const txWithStatus = await testnetCkbRpc.get_transaction(txHash);
      console.log(`current tx status: ${txWithStatus.tx_status?.status}`);
      if (txWithStatus.tx_status.status === "committed") {
        console.log(`UnlockTransaction ${txHash} committed!`);
        clearTimeout(timeoutId);
        return txHash;
      }
      if (txWithStatus.tx_status.status === "rejected") {
        clearTimeout(timeoutId);
        return Promise.reject("UnlockTransaction ${txHash} failed!");
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
async function unlockFinalizedWithdrawals(
  ckbIndexer: CkbIndexer,
  limit: Number,
  lockScriptHashMap: Map<string, string>,
  sudtScript?: Script,
) {
  const withdrawalCells: Cell[] = [];

  let rollupCell = await ckbIndexer.getRollupCell();
  if (rollupCell == null) {
    console.error("[ERROR]: rollupCell not found");
    return withdrawalCells;
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
    // skip: 3000000, // TODO: this config does not work?
  });
  let unFinalizedWithdrawalCellNum = 0;
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
        unFinalizedWithdrawalCellNum++;
        continue;
      }

      console.log("withdrawalCell.out_point", cell.out_point);
      (cell as any).privKey = lockScriptHashMap.get(owner_lock_hash);
      withdrawalCells.push(cell);
      if (timeout || withdrawalCells.length >= limit) break;
    }
  } catch (error) {
    console.error("withdrawalCollector.collect Error:", error);
    return;
  } finally {
    clearTimeout(timeoutId);
    console.timeEnd(`search withdrawal_cells took`);
  }

  if (withdrawalCells.length === 0 && unFinalizedWithdrawalCellNum === 0) {
    console.warn(`No valid withdrawal cell belongs to the accounts found`);

  }

  // TODO: successRate
  const unlockTxHash = await retry(() => sendUnlockTransaction(ckbIndexer, withdrawalCells), 6)
    .catch(console.error);
}

async function batchUnlock(privKeys: string[]) {
  const ckbIndexer = await initConfigAndSync(
    process.env.CKB_RPC_URL || testnetCkbRpcUrl,
    // FIXME:
    // Indexer is syncing. Please wait...
    // Cannot read properties of undefined (reading 'data')
    // Error: Can't connect to ckb-indexer. Please make sure ckb-indexer is running and its URL is valid and reachable. Make sure the URL begins with http:// or https://.
    //     at /code/packages/tools/src/account/common.ts:37:15
    //     at processTicksAndRejections (node:internal/process/task_queues:96:5)
    process.env.CKB_INDEXER_URL || testnetCkbIndexerURL
  );
  const maxWithdrawalCellNum = 1;
  const lockScriptHashMap = getLockScriptHashMap(privKeys);

  // search finalized withdrawal cell and unlock it
  // TODO: cache the cursor
  asyncSleep(5 * 3600 * 1000).then(() => process.exit(0))
  while (true) {
    console.log('-'.repeat(80));
    await unlockFinalizedWithdrawals(
      ckbIndexer,
      maxWithdrawalCellNum,
      lockScriptHashMap
    ).catch(e => {
      console.error(e);
    });
  }
}

function getLockScriptHashMap(privKeys: string[]): Map<string, string> {
  let map = new Map<string, string>();
  for (const privKey of privKeys) {
    const ckbAddress = privateKeyToCkbAddress(privKey);
    const lockScript = parseAddress(ckbAddress);
    const lockScriptHash = LumosUtils.computeScriptHash(lockScript);
    map.set(lockScriptHash, privKey);
  }
  return map;
}

async function getRollupCellByGwLastSubmittedInfo(): Promise<Cell> {
  const godwokenClient: Godwoken = getGodwokenWeb3(
    process.env.GW_NET || GodwokenNetwork.alphanet
  );
  
  const result = await godwokenClient.getLastSubmittedInfo();
  const txHash = result.transaction_hash;
  const ckbRpc = new RPC(process.env.CKB_RPC_URL || testnetCkbRpcUrl);
  const tx: TransactionWithStatus | null = await retry(async () => {
    const _tx = await ckbRpc.get_transaction(txHash);
    return _tx || Promise.reject(null);
  }, 10, 1000);
  if (tx == null) {
    throw new Error("Last submitted tx not found!");
  }

  let rollupIndex = tx.transaction.outputs.findIndex((o) => {
    return o.type && utils.computeScriptHash(o.type) === ROLLUP_TYPE_HASH;
  });
  const rollupOutput = tx.transaction.outputs[rollupIndex];
  const rollupOutputData = tx.transaction.outputs_data[rollupIndex];

  if (rollupOutput == null) {
    throw new Error(`Rollup cell not found in last submitted tx!`);
  }

  return {
    out_point: {
      tx_hash: txHash,
      index: "0x" + rollupIndex.toString(16),
    },
    cell_output: rollupOutput,
    data: rollupOutputData,
  } as Cell;
}

/**
 * Enviroments:
 * CKB_RPC_URL=https://testnet.ckb.dev/rpc
 * CKB_INDEXER_URL=https://testnet.ckb.dev/indexer
 * GW_NET=<GodwokenNetwork or GodwokenWeb3Url>
 * DEBUG=true
 * 
 * Usage:
 * DEBUG=true GW_NET=testnet yarn ts-node src/benchmark/batch-unlock.ts [accountNum]
 * ```sh
 * # Example:
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
