import { Output, utils, Script, Cell, CellDep } from "@ckb-lumos/lumos";
import { EthUser, CkbUser } from "../user";
import { DepositLockArgs, DepositLockArgsCodec } from "../schema";
import * as config from "../config";
import { toBigUInt128LE } from "@ckb-lumos/base/lib/utils";

export function buildDepositLockArgs(
  l1CkbUser: CkbUser,
  l2EthUser: EthUser
): DepositLockArgs {
  const l1LockHash = utils.computeScriptHash(l1CkbUser.l1LockScript());
  const l2Lock: Script = l2EthUser.l2LockScript();
  return {
    owner_lock_hash: l1LockHash,
    layer2_lock: l2Lock,
    cancel_timeout: "0xc0000000000004b0",
    registry_id: "0x" + l2EthUser.ethRegistryId().toString(16),
  };
}

export function buildDepositLock(
  l1CkbUser: CkbUser,
  l2EthUser: EthUser
): Script {
  const depositLockArgs = buildDepositLockArgs(l1CkbUser, l2EthUser);
  const depositLockArgsCodec = new DepositLockArgsCodec(depositLockArgs);
  const args =
    "0x" +
    config.ROLLUP_TYPE_HASH().slice(2) +
    depositLockArgsCodec.HexSerialize().slice(2);
  return {
    code_hash: config.getScriptConfig("deposit_lock").CODE_HASH,
    hash_type: config.getScriptConfig("deposit_lock").HASH_TYPE,
    args,
  };
}

export function buildDepositOutputCell(
  l1CkbUser: CkbUser,
  l2EthUser: EthUser,
  ckbCapacity: bigint,
  sudtAmount: bigint = BigInt(0),
  sudtScript?: Script
): Cell {
  if (sudtAmount === BigInt(0)) {
    // Deposit CKB only
    const cell_output: Output = {
      capacity: "0x" + ckbCapacity.toString(16),
      lock: buildDepositLock(l1CkbUser, l2EthUser),
      type: undefined,
    };
    return {
      cell_output,
      data: "0x",
    };
  } else {
    // Deposit CKB and SUDT
    const cell_output: Output = {
      capacity: "0x" + ckbCapacity.toString(16),
      lock: buildDepositLock(l1CkbUser, l2EthUser),
      type: sudtScript!,
    };
    return {
      cell_output,
      data: toBigUInt128LE(sudtAmount),
    };
  }
}

export function buildDepositCellDeps(includingSudtCellDep: boolean): CellDep[] {
  if (includingSudtCellDep) {
    return [
      config.getCellDep("deposit_lock"),
      config.getCellDep("SECP256K1_BLAKE160"),
      config.getCellDep("SUDT"),
    ];
  } else {
    return [
      config.getCellDep("deposit_lock"),
      config.getCellDep("SECP256K1_BLAKE160"),
    ];
  }
}
