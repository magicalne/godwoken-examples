import { Cell, Script } from "@ckb-lumos/lumos";
import { getRollupCell } from "../util";
import { GlobalState, WithdrawalLockArgs } from "../schema/generated";
import { Reader } from "@ckb-lumos/toolkit";
import { ckbIndexer } from "../alias";
import * as config from "../config";
import { Uint64 } from "@ckb-lumos/base/lib/core";

export async function collectFinalizedWithdrawals(
  sudtScript?: Script
): Promise<Cell[]> {
  const rollupCell = await getRollupCell();
  const globalState = new GlobalState(new Reader(rollupCell.data));
  const lastFinalizedBlockNumber = new Uint64(
    globalState.getLastFinalizedBlockNumber().raw()
  ).toLittleEndianBigUint64();

  const withdrawalLock = config.getScriptConfig("withdrawal_lock");

  // Collect withdrawals cells
  const MAX_WITHDRAWALS: number = 100;
  let nUnfinalizedWithdrawals = 0;
  let finalizedWithdrawals = [];
  const withdrawalCollector = ckbIndexer.collector({
    lock: {
      code_hash: withdrawalLock.CODE_HASH,
      hash_type: withdrawalLock.HASH_TYPE,
      args: config.ROLLUP_TYPE_HASH(),
    },
    type: sudtScript ? sudtScript : "empty",
    argsLen: "any",
  });
  for await (const cell of withdrawalCollector.collect()) {
    const withdrawalBlockNumber = getWithdrawalBlockNumber(cell);
    if (withdrawalBlockNumber < lastFinalizedBlockNumber) {
      console.info(
        `[collectFinalizedWithdrawals] unfinalized, outPoint: ${JSON.stringify(
          cell.out_point
        )}, withdrawalBlockNumber(${withdrawalBlockNumber}) < lastFinalizedBlockNumber(${lastFinalizedBlockNumber})`
      );
      finalizedWithdrawals.push(cell);
      if (finalizedWithdrawals.length >= MAX_WITHDRAWALS) {
        break;
      }
    } else {
      console.info(
        `[collectFinalizedWithdrawals] unfinalized, outPoint: ${JSON.stringify(
          cell.out_point
        )}, withdrawalBlockNumber(${withdrawalBlockNumber}) >= lastFinalizedBlockNumber(${lastFinalizedBlockNumber})`
      );
      nUnfinalizedWithdrawals++;
    }
  }
  console.info(
    `[collectFinalizedWithdrawals] rollupCell.lastFinalizedBlockNumber => ${lastFinalizedBlockNumber}, indexer returns ${finalizedWithdrawals.length} finalized withdrawals, ${nUnfinalizedWithdrawals} unfinalized withdrawals`
  );
  return finalizedWithdrawals;
}

function getWithdrawalBlockNumber(withdrawal: Cell): bigint {
  const lock_args = withdrawal.cell_output.lock.args;
  // skip 66: "0x" + ROLLUP_TYPE_HASH
  // length 104 = WithdrawalLockArgs.TOTAL_SIZE * 2
  const withdrawal_lock_args_data =
    "0x" + lock_args.slice(2 + 32 * 2, 2 + 32 * 2 + 104 * 2);
  const withdrawal_lock_args = new WithdrawalLockArgs(
    new Reader(withdrawal_lock_args_data)
  );
  const withdrawal_block_number = new Uint64(
    withdrawal_lock_args.getWithdrawalBlockNumber().raw()
  ).toLittleEndianBigUint64();
  return withdrawal_block_number;
}
