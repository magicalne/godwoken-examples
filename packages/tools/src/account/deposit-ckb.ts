import { DeploymentConfig, deploymentConfig } from "../modules/deployment-config";
import { HexString, Cell, Script, Hash, utils } from "@ckb-lumos/base";
import { Indexer } from "@ckb-lumos/indexer";
import {
  TransactionSkeleton,
  parseAddress,
  sealTransaction,
} from "@ckb-lumos/helpers";
import {
  generateDepositionLock,
  DepositionLockArgs,
  getDepositionLockArgs,
  serializeArgs,
  getRollupTypeHash,
} from "../modules/deposition";
import { common } from "@ckb-lumos/common-scripts";
import { key } from "@ckb-lumos/hd";
import { RPC } from "ckb-js-toolkit";
import commander from "commander";
import { privateKeyToCkbAddress, privateKeyToEthAddress } from "../modules/utils"
import { initConfigAndSync } from "./common";

async function sendTx(
  deploymentConfig: DeploymentConfig,
  fromAddress: string,
  amount: string,
  layer2LockArgs: HexString,
  indexer: Indexer,
  privateKey: HexString,
  ckbUrl: string
): Promise<Hash> {
  let txSkeleton = TransactionSkeleton({ cellProvider: indexer });

  const ownerLock: Script = parseAddress(fromAddress);
  const ownerLockHash: Hash = utils.computeScriptHash(ownerLock);
  const layer2Lock: Script = {
    code_hash: deploymentConfig.eth_account_lock.code_hash,
    hash_type: deploymentConfig.eth_account_lock.hash_type as "data" | "type",
    args: getRollupTypeHash() + layer2LockArgs.slice(2),
  };
  const depositionLockArgs: DepositionLockArgs = getDepositionLockArgs(
    ownerLockHash,
    layer2Lock
  );
  console.log(
    `Layer 2 lock script hash: ${utils.computeScriptHash(
      depositionLockArgs.layer2_lock
    )}`
  );
  const serializedArgs: HexString = serializeArgs(depositionLockArgs);
  const depositionLock: Script = generateDepositionLock(
    deploymentConfig,
    serializedArgs
  );

  console.log("deposition lock:", depositionLock);

  const outputCell: Cell = {
    cell_output: {
      capacity: "0x" + BigInt(amount).toString(16),
      lock: depositionLock,
    },
    data: "0x",
  };

  txSkeleton = txSkeleton.update("outputs", (outputs) => {
    return outputs.push(outputCell);
  });

  txSkeleton = await common.injectCapacity(
    txSkeleton,
    [fromAddress],
    BigInt(amount)
  );

  txSkeleton = await common.payFeeByFeeRate(
    txSkeleton,
    [fromAddress],
    BigInt(1000)
  );

  txSkeleton = common.prepareSigningEntries(txSkeleton);

  const message: HexString = txSkeleton.get("signingEntries").get(0)!.message;
  const content: HexString = key.signRecoverable(message, privateKey);

  const tx = sealTransaction(txSkeleton, [content]);

  const rpc = new RPC(ckbUrl);
  const txHash: Hash = await rpc.send_transaction(tx);

  return txHash;
}


export const run = async (program: commander.Command) => {
  const ckbRpc = program.rpc
  const indexerPath = program.indexerPath
  const indexer = await initConfigAndSync(ckbRpc, indexerPath);

  const privateKey = program.privateKey;
  const ckbAddress = privateKeyToCkbAddress(privateKey);
  const ethAddress = program.ethAddress || privateKeyToEthAddress(privateKey);
  console.log("using eth address:", ethAddress);
  try {
    const txHash: Hash = await sendTx(
      deploymentConfig,
      ckbAddress,
      program.capacity,
      ethAddress.toLowerCase(),
      indexer,
      privateKey,
      program.rpc
    );

    console.log("txHash:", txHash);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};