import {
  DeploymentConfig,
  deploymentConfig,
} from "../modules/deployment-config";
import { HexString, Cell, Script, Hash, utils } from "@ckb-lumos/base";
import { Indexer } from "@ckb-lumos/base";
import {
  TransactionSkeleton,
  parseAddress,
  sealTransaction,
} from "@ckb-lumos/helpers";
import {
  generateDepositLock,
  DepositLockArgs,
  getDepositLockArgs,
  serializeArgs,
  getRollupTypeHash,
  minimalDepositCapacity,
} from "../modules/deposit";
import { common } from "@ckb-lumos/common-scripts";
import { key } from "@ckb-lumos/hd";
import { RPC } from "ckb-js-toolkit";
import commander from "commander";
import {
  privateKeyToCkbAddress,
  privateKeyToEthAddress,
} from "../modules/utils";
import { initConfigAndSync, waitForDeposit, waitTxCommitted } from "./common";
import { Godwoken } from "@godwoken-examples/godwoken";
import {
  getBalanceByScriptHash,
  ethAddressToScriptHash,
} from "../modules/godwoken";

export async function sendTx(
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
  const depositLockArgs: DepositLockArgs = getDepositLockArgs(
    ownerLockHash,
    layer2Lock
  );
  const l2ScriptHash = utils.computeScriptHash(depositLockArgs.layer2_lock);
  
  if (process.env.DEBUG) {
    console.log(`Layer 2 lock script hash: ${l2ScriptHash}`);
  }

  console.log("Godwoken script hash(160):", l2ScriptHash.slice(0, 42));

  const serializedArgs: HexString = serializeArgs(depositLockArgs);
  const depositLock: Script = generateDepositLock(
    deploymentConfig,
    serializedArgs
  );

  if (process.env.DEBUG) {
    console.log("deposit lock:", depositLock);
  }

  const outputCell: Cell = {
    cell_output: {
      capacity: "0x" + BigInt(amount).toString(16),
      lock: depositLock,
    },
    data: "0x",
  };

  const minCapacity = minimalDepositCapacity(outputCell, depositLockArgs);
  if (BigInt(amount) < minCapacity) {
    throw new Error(
      `Deposit CKB required ${minCapacity} shannons at least, provided ${amount}.`
    );
  }

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
  const txHash: Hash = await rpc.send_transaction(tx, "passthrough");

  return txHash;
}

const MINIMUM_DEPOSIT_CAPACITY = 500n * 100000000n;

export const run = async (program: commander.Command) => {
  const ckbRpc = new RPC(program.rpc);
  const ckbIndexerURL = program.indexer;

  if (BigInt(program.capacity) < MINIMUM_DEPOSIT_CAPACITY) {
    throw new Error(`Minimum deposit capacity required: ${MINIMUM_DEPOSIT_CAPACITY}.`);
  }

  const indexer = await initConfigAndSync(program.rpc, ckbIndexerURL);

  const privateKey = program.privateKey;
  const ckbAddress = privateKeyToCkbAddress(privateKey);
  const ethAddress = program.ethAddress || privateKeyToEthAddress(privateKey);

  const godwoken = new Godwoken(program.parent.godwokenRpc);

  console.log("Using ETH address:", ethAddress);
  console.log("Using CKB address:", ckbAddress);
  console.log(`Rollup type hash: ${getRollupTypeHash()}`);

  try {
    const accountScriptHash = ethAddressToScriptHash(ethAddress);
    const currentBalance = await getBalanceByScriptHash(
      godwoken,
      1,
      accountScriptHash
    );

    const txHash: Hash = await sendTx(
      deploymentConfig,
      ckbAddress,
      program.capacity,
      ethAddress.toLowerCase(),
      indexer,
      privateKey,
      program.rpc
    );
    console.log("Transaction hash:", txHash);
    console.log("--------- wait for deposit transaction ----------");

    await waitTxCommitted(txHash, ckbRpc);
    await waitForDeposit(godwoken, accountScriptHash, currentBalance);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
