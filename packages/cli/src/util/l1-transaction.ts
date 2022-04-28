// NOTE: Assume the user use SECP256K1_BLAKE2B as lock script.
import { CkbUser } from "../user";
import {
  Cell,
  CellDep,
  helpers,
  Transaction,
  WitnessArgs,
} from "@ckb-lumos/lumos";
import { ckbIndexer } from "../alias";
import { SerializeWitnessArgs } from "../schema/generated";
import { normalizers, Reader } from "@ckb-lumos/toolkit";
import NormalizeWitnessArgs = normalizers.NormalizeWitnessArgs;
import { common } from "@ckb-lumos/common-scripts";
import { key } from "@ckb-lumos/hd";
import { sealTransaction } from "@ckb-lumos/helpers";

export function buildL1SecpTransaction(
  l1CkbUser: CkbUser,
  inputCells: Cell[],
  outputCells: Cell[],
  cellDeps: CellDep[]
): Transaction {
  let txSkeleton = helpers
    .TransactionSkeleton({ cellProvider: ckbIndexer })
    .update("outputs", (outputs) => {
      return outputs.push(...outputCells);
    })
    .update("inputs", (inputs) => {
      return inputs.push(...inputCells);
    })
    .update("cellDeps", (cellDeps_) => {
      return cellDeps_.push(...cellDeps);
    })
    .update("witnesses", (witnesses) => {
      const witnessArgs: WitnessArgs = {
        lock: `0x${"0".repeat(65 * 2)}`,
      };
      const serializedWitnessArgs = SerializeWitnessArgs(
        NormalizeWitnessArgs(witnessArgs)
      );
      witnesses = witnesses.push(
        Reader.from(serializedWitnessArgs).serializeJson()
      );
      return witnesses;
    });
  txSkeleton = common.prepareSigningEntries(txSkeleton);
  const message = txSkeleton.signingEntries.get(0)!.message;
  const signature = key.signRecoverable(message, l1CkbUser.privateKey__);
  return sealTransaction(txSkeleton, [signature]);
}
