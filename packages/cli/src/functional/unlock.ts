import {
  Transaction,
  Cell,
  CellDep,
  Script,
  WitnessArgs,
} from "@ckb-lumos/lumos";
import { getRollupCell, sumCkbCapacity } from "../util";
import {
  GlobalState,
  SerializeUnlockWithdrawalViaFinalize,
  SerializeWitnessArgs,
  WithdrawalLockArgs,
} from "../schema/generated";
import { normalizers, Reader } from "@ckb-lumos/toolkit";
import { ckbIndexer } from "../alias";
import * as config from "../config";
import { CkbUser } from "../user";
import NormalizeWitnessArgs = normalizers.NormalizeWitnessArgs;
import { normalizeObject } from "../schema/normalizers";
import { sealTransaction, TransactionSkeleton } from "@ckb-lumos/helpers";
import { FEE } from "../constant";
import { common } from "@ckb-lumos/common-scripts";
import { key } from "@ckb-lumos/hd";
import { Uint64 } from "@ckb-lumos/base/lib/core";

export async function collectFinalizedWithdrawals(
  ckbUser: CkbUser,
  sudtScript?: Script
): Promise<Cell[]> {
  const rollupCell = await getRollupCell();
  const globalState = new GlobalState(new Reader(rollupCell.data));

  // TODO dirty code
  // const lastFinalizedBlockNumber = BigInt(globalState .getLastFinalizedBlockNumber().raw());
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
      args: config.ROLLUP_TYPE_HASH(), // TODO FIXME + ckbUser.l1LockHash().slice(2),
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

export function getWithdrawalBlockNumber(withdrawal: Cell): bigint {
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

export async function buildUnlockL1Transaction(
  ckbUser: CkbUser,
  finalizedWithdrawals: Cell[],
  sudtScript?: Script
): Promise<Transaction> {
  // Build UnlockWithdrawal::UnlockWithdrawalViaFinalize and put it into witness
  const lockWitnessArg =
    "0x00000000" +
    new Reader(
      SerializeUnlockWithdrawalViaFinalize(
        // TODO: what is it? why it is an empty object?
        normalizeObject("UnlockWithdrawalViaFinalize", {}, {})
      )
    )
      .serializeJson()
      .slice(2);
  const withdrawalWitness = new Reader(
    SerializeWitnessArgs(
      NormalizeWitnessArgs({ lock: lockWitnessArg } as WitnessArgs)
    )
  ).serializeJson();
  const cellDeps = await buildUnlockCellDeps(sudtScript != null);

  let txSkeleton = TransactionSkeleton({ cellProvider: ckbIndexer });
  txSkeleton
    .update("inputs", (inputs) => inputs.push(...finalizedWithdrawals))
    .update("outputs", (outputs) => {
      for (const withdrawal of finalizedWithdrawals) {
        outputs.push({
          cell_output: {
            capacity:
              "0x" +
              (BigInt(withdrawal.cell_output.capacity) - FEE).toString(16),
            lock: ckbUser.l1LockScript(),
            type: withdrawal.cell_output.type,
          },
          data: withdrawal.data,
        });
      }
      return outputs;
    })
    .update("cellDeps", (cellDeps_) => cellDeps_.push(...cellDeps))
    .update("witnesses", (witnesses) => witnesses.push(withdrawalWitness));

  txSkeleton = common.prepareSigningEntries(txSkeleton);
  const message = txSkeleton.signingEntries.get(0)!.message;
  const signature = key.signRecoverable(message, ckbUser.privateKey__);
  return sealTransaction(txSkeleton, [signature]);
}

export async function buildUnlockCellDeps(
  includingSudtCellDep: boolean
): Promise<CellDep[]> {
  const rollupCell = await getRollupCell();
  const rollupCellDep: CellDep = {
    out_point: rollupCell.out_point!,
    dep_type: "code",
  };
  if (includingSudtCellDep) {
    return [
      config.getCellDep("withdrawal_lock"),
      rollupCellDep,
      config.getCellDep("SECP256K1_BLAKE160"),
      config.getCellDep("SUDT"),
    ];
  } else {
    return [
      config.getCellDep("withdrawal_lock"),
      rollupCellDep,
      config.getCellDep("SECP256K1_BLAKE160"),
    ];
  }
}
