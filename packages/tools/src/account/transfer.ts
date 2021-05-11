#!/usr/bin/env node
import commander, { Command } from "commander";
import { key } from "@ckb-lumos/hd";
import { transferCLI } from "../modules/godwoken"
import { privateKeyToEthAddress } from "../modules/utils"
import { initConfigAndSync } from "./common";

async function transfer(
  godwokenURL: string,
  privateKey: string,
  fromId: number,
  toId: number,
  sudtId: number,
  amount: bigint,
  fee: bigint,
) {
  return await transferCLI(
    godwokenURL,
    privateKey,
    fromId,
    toId,
    sudtId,
    amount,
    fee
  )
}

export const run = async (program: commander.Command) => {
  const ckbRpc = program.rpc;
  const indexerPath = program.indexerPath
  const _indexer = await initConfigAndSync(ckbRpc, indexerPath)

  const amount = program.amount;
  const fee = program.fee;
  const fromId = program.fromId;
  const toId = program.toId;
  const sudtId = program.sudtId;
  const godwokenURL = program.godwokenRpc;

  const privateKey = program.privateKey;

  const publicKey = key.privateToPublic(privateKey);
  console.log("public key:", publicKey)
  console.log("eth address:", privateKeyToEthAddress(privateKey));

  try {
    await transfer(
      godwokenURL,
      privateKey,
      +fromId,
      +toId,
      +sudtId,
      BigInt(amount),
      BigInt(fee),
    )

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};