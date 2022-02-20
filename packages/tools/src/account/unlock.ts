import {
  Cell,
  CellDep,
  Hash,
  HexString,
  utils,
  WitnessArgs,
  core as LumosBaseCore,
  Transaction,
  OutPoint,
  Script,
} from "@ckb-lumos/base";
import {
  parseAddress,
  sealTransaction,
  TransactionSkeleton,
} from "@ckb-lumos/helpers";
import { CkbIndexer, ScriptType } from "./indexer-remote";
import { deploymentConfig } from "../modules/deployment-config";
import {
  ROLLUP_TYPE_HASH,
  ROLLUP_TYPE_SCRIPT,
} from "../modules/godwoken-config";
import { asyncSleep, privateKeyToCkbAddress } from "../modules/utils";
import { exit } from "process";
import { core as GodwokenSchemas, normalizer } from "@godwoken-examples/godwoken";
import { normalizers, Reader } from "ckb-js-toolkit";
import { common as LumosCommonScripts } from "@ckb-lumos/common-scripts";
import { key } from "@ckb-lumos/hd";
import { Command } from "commander";
import { initConfigAndSync } from "./common";
import { getConfig } from "@ckb-lumos/config-manager";
import { RPC } from "@ckb-lumos/rpc";

async function unlock(
  privateKey: HexString,
  indexer: CkbIndexer,
  rpc: RPC,
  sudtScript?: Script,
  retryTime = 10
) {
  try {
    for (let i = 0; i < retryTime; i++) {
      if (i > 0) {
        await asyncSleep(6000);
        console.log("-".repeat(15) + ` Retry ${i} ` + "-".repeat(15));
      }

      const isRetry = await unlockInner(privateKey, indexer, rpc, sudtScript);
      if (!isRetry) {
        break;
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(-1);
  }
}


/**
 * getRollupCell by the ROLLUP_TYPE_SCRIPT of godwoken-config
 */
async function getRollupCell(indexer: CkbIndexer): Promise<undefined | Cell> {
  await indexer.waitForSync();
  const rollupCells = await indexer.getCells({
    script: ROLLUP_TYPE_SCRIPT,
    script_type: ScriptType.type
  });
  if (rollupCells.length === 0) return undefined;
  return rollupCells[0];
}

const withdrawal_cells: any[] = [];
/**
 *
 * @param privateKey
 * @param indexer
 * @param ckbRpc
 * @param sudtScript
 *
 * @returns should retry again or not, if true, try again
 */
async function unlockInner(
  privateKey: HexString,
  indexer: CkbIndexer,
  ckbRpc: RPC,
  sudtScript?: Script
): Promise<boolean> {
  const rollup_type_script = ROLLUP_TYPE_SCRIPT;
  const rollup_type_hash: Hash = ROLLUP_TYPE_HASH;
  console.log("rollup_type_hash:", rollup_type_hash);

  const ckb_address = privateKeyToCkbAddress(privateKey);
  console.log("CKB address:", ckb_address);

  const lock_script = parseAddress(ckb_address);
  const lock_script_hash = utils.computeScriptHash(lock_script);

  // Ready to build L1 CKB transaction

  // search rollup cell and then get last_finalized_block_number from cell data (GlobalState) 
  let rollupCell = await getRollupCell(indexer);
  if (rollupCell == null) {
    console.error("[ERROR]: rollup_cell not found");
    exit(-1);
  }
  const globalState = new GodwokenSchemas.GlobalState(new Reader(rollupCell.data));
  const last_finalized_block_number = globalState
    .getLastFinalizedBlockNumber()
    .toLittleEndianBigUint64();

  console.log("last_finalized_block_number", last_finalized_block_number);

  // * search withdrawal locked cell by:
  //   - withdrawal lock code hash
  //   - owner secp256k1 blake2b160 lock hash
  //   - last_finalized_block_number
  //   - TODO: withdrawal_block_hash (to proof the block is on current rollup)
  const withdrawal_lock = deploymentConfig.withdrawal_lock;
  const withdrawalCollector = indexer.collector({
    lock: {
      code_hash: withdrawal_lock.code_hash,
      hash_type: withdrawal_lock.hash_type,
      args: rollup_type_hash, // prefix search
    },
    type: sudtScript ? sudtScript : "empty",
    argsLen: "any",
    // skip: 4000000,
  });

  console.log("searching withdrawal_cells...");
  for await (const cell of withdrawalCollector.collect()) {
    if (withdrawal_cells.length > 0) break;

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

    console.debug("[DEBUG]: withdrawalCell:", cell);
    const withdrawal_block_number = withdrawal_lock_args
      .getWithdrawalBlockNumber()
      .toLittleEndianBigUint64();
    console.log("withdrawal_block_number", withdrawal_block_number);
    if (withdrawal_block_number > last_finalized_block_number) {
      console.debug("[INFO] This withdrawal cell is not finalized.");
      continue;
    }

    withdrawal_cells.push(cell);
  }
  if (withdrawal_cells.length == 0) {
    console.warn("[ERROR]: No valid withdrawal cell found");
    exit(-1);
  }
  // console.log(
  //   `[INFO] found ${withdrawal_cells.length} withdrawal cells, only process first one`
  // );
  const withdrawal_cell = withdrawal_cells[0];
  const output_cell: Cell = {
    cell_output: {
      capacity: withdrawal_cell.cell_output.capacity,
      lock: lock_script,
      type: withdrawal_cell.cell_output.type,
    },
    data: withdrawal_cell.data,
  };

  // * Build UnlockWithdrawal::UnlockWithdrawalViaFinalize and put into withess
  const data =
    "0x00000000" +
    new Reader(
      GodwokenSchemas.SerializeUnlockWithdrawalViaFinalize(
        normalizer.NormalizeUnlockWithdrawalViaFinalize({})
      )
    )
      .serializeJson()
      .slice(2);
  console.log("withdrawal_witness:", data);
  const new_witness_args: WitnessArgs = {
    lock: data,
  };
  const withdrawal_witness = new Reader(
    LumosBaseCore.SerializeWitnessArgs(
      normalizers.NormalizeWitnessArgs(new_witness_args)
    )
  ).serializeJson();

  // fetch the fresh rollupCell
  await indexer.waitForSync();
  rollupCell = await getRollupCell(indexer);
  if (rollupCell == null) {
    console.error("[ERROR]: rollup_cell not found");
    exit(-1);
  }
  while (true) { // wait for the next live rollupCell
    const result = await ckbRpc.get_live_cell(rollupCell!.out_point!, false);
    if (result.status !== 'live') {
      break;
    }
    await asyncSleep(2000);
  }
  rollupCell = await getRollupCell(indexer);
  if (rollupCell == null) {
    console.error("[ERROR]: rollup_cell not found");
    exit(-1);
  }

  // use rollup cell's out point as cell_deps
  const rollup_cell_dep: CellDep = {
    out_point: rollupCell.out_point!,
    dep_type: "code",
  };

  let txSkeleton = TransactionSkeleton({ cellProvider: indexer });
  txSkeleton = txSkeleton
    .update("inputs", (inputs) => {
      return inputs.push(withdrawal_cell);
    })
    .update("outputs", (outputs) => {
      return outputs.push(output_cell);
    })
    .update("cellDeps", (cell_deps) => {
      return cell_deps.push(deploymentConfig.withdrawal_lock_dep);
    })
    .update("cellDeps", (cell_deps) => {
      return cell_deps.push(rollup_cell_dep);
    })
    .update("witnesses", (witnesses) => {
      return witnesses.push(withdrawal_witness);
    });

  if (!!sudtScript) {
    txSkeleton = txSkeleton.update("cellDeps", (cell_deps) => {
      return cell_deps.push(getSudtCellDep());
    });
  }

  txSkeleton = txSkeleton.update("fixedEntries", (fixedEntries) => {
    return fixedEntries.push({
      field: "outputs",
      index: 0,
    });
  });
  txSkeleton = await LumosCommonScripts.payFeeByFeeRate(
    txSkeleton,
    [ckb_address],
    BigInt(1000)
  );
  txSkeleton = LumosCommonScripts.prepareSigningEntries(txSkeleton);
  // console.debug("tx:", JSON.stringify(txSkeleton.toJS(), null, 2))

  const message: HexString = txSkeleton.get("signingEntries").get(0)!.message;
  const content: HexString = key.signRecoverable(message, privateKey);
  const tx = sealTransaction(txSkeleton, [content]);

  let txHash: Hash | undefined = await retry(async function sendUnlockTransaction() {
    return ckbRpc.send_transaction(tx, "passthrough");
  }).catch(e => { return undefined; })
  console.log("txHash:", txHash);
  if (!txHash) return true; /* return true to external unlock function */

  const isSuccess = await waitForTxCommitted(ckbRpc, tx, txHash);
  if (isSuccess === false) {
    return true;
  }
  return false;
}

const wait = (interval: any) => new Promise(resolve => setTimeout(resolve, interval));
async function retry<T>(fn: () => Promise<T>, retriesLeft = 3, interval = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.warn(error);
    console.log("===============================================");
    if (retriesLeft === 0) {
      throw new Error(`Max retries reached for function ${fn.name}`);
    }
    await wait(interval);
    return await retry(fn, --retriesLeft, interval);
  }
}

async function waitForTxCommitted(
  rpc: RPC,
  tx: Transaction,
  txHash: Hash,
  timeout = 300,
  loopInterval = 1
): Promise<boolean | undefined> {
  const getOutPointStr = (outPoint: OutPoint) =>
    `OutPoint { tx_hash: ${outPoint.tx_hash}, index: ${outPoint.index} }`;

  for (let i = 0; i < timeout; i += loopInterval) {
    const txWithStatus = await rpc.get_transaction(txHash);

    // tx failed
    if (txWithStatus === null) {
      for await (const cellDep of tx.cell_deps) {
        const liveCell = await rpc.get_live_cell(cellDep.out_point, false);
        if (liveCell.status !== "live") {
          console.log(
            `CellDep ${getOutPointStr(cellDep.out_point)} has already used!`
          );
        }
      }

      for await (const input of tx.inputs) {
        const liveCell = await rpc.get_live_cell(input.previous_output, false);
        if (liveCell.status !== "live") {
          console.log(
            `Input ${getOutPointStr(input.previous_output)} has already used!`
          );
        }
      }

      console.log("tx failed, please resend!");
      return false;
    }

    const status = txWithStatus.tx_status.status;

    if (status === "committed") {
      console.log(`tx ${txHash} committed!`);
      return true;
    }
    console.log(`current tx status: ${status}, waiting for ${i} seconds`, status);
    if (status === "rejected") return false;
    await asyncSleep(loopInterval * 1000);
  }

  console.log(`... timeout ... please check tx ${txHash} status by your self`);
  return undefined;
}

function getSudtScript(args: HexString): Script {
  const sudtInfo = getConfig().SCRIPTS.SUDT;
  if (sudtInfo === undefined || sudtInfo === null) {
    throw new Error("SUDT info not found in lumos config!");
  }
  return {
    code_hash: sudtInfo.CODE_HASH,
    hash_type: sudtInfo.HASH_TYPE,
    args,
  };
}

export function getSudtCellDep(): CellDep {
  const sudtInfo = getConfig().SCRIPTS.SUDT;
  if (sudtInfo === undefined || sudtInfo === null) {
    throw new Error("SUDT info not found in lumos config!");
  }
  return {
    dep_type: sudtInfo.DEP_TYPE,
    out_point: {
      tx_hash: sudtInfo.TX_HASH,
      index: sudtInfo.INDEX,
    },
  };
}

export const run = async (program: Command) => {
  const ckbUrl = program.rpc;
  const ckbRpc = new RPC(ckbUrl);
  const ckbIndexerURL = program.indexer;
  const indexer = await initConfigAndSync(ckbUrl, ckbIndexerURL);

  const privateKey = program.privateKey;

  const sudtScriptArgs = program.sudtScriptArgs;

  let sudtScript = undefined;
  if (!!sudtScriptArgs) {
    sudtScript = getSudtScript(sudtScriptArgs);
  }

  try {
    await unlock(privateKey, indexer, ckbRpc, sudtScript);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
