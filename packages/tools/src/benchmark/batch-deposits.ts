import { deploymentConfig } from "../modules/deployment-config";
import { Hash } from "@ckb-lumos/base";
import { initConfigAndSync, waitTxCommitted } from "../account/common";
import { asyncSleep, privateKeyToCkbAddress, privateKeyToEthAddress, promiseAllLimitN, retry, } from "../modules/utils";
import { getRollupTypeHash } from "../modules/deposit";
import { sendTx as sendDepositTx } from "../account/deposit-ckb";
import { privKeys } from "./accounts";
import { GodwokenNetwork, testnetCkbIndexerURL, testnetCkbRpc, testnetCkbRpcUrl } from "../common";
import { CkbIndexer } from "../account/indexer-remote";
import { logger } from "../modules/logger";

const MINIMUM_DEPOSIT_CAPACITY = "30000000000"; // shannons

async function deposit(privKey: string, ckbIndexer: CkbIndexer) {
  const ckbAddress = privateKeyToCkbAddress(privKey);
  const ethAddress = privateKeyToEthAddress(privKey);
  console.log("Using ETH address:", ethAddress);
  console.log("Using CKB address:", ckbAddress);

  return retry(async () => {
    const txHash: Hash = await sendDepositTx(
      deploymentConfig,
      ckbAddress,
      MINIMUM_DEPOSIT_CAPACITY.toString(),
      ethAddress.toLowerCase(),
      ckbIndexer,
      privKey,
      testnetCkbRpcUrl
    );
    console.log("Transaction hash:", txHash);
    logger.debug("--------- wait for deposit transaction ----------");
    await waitTxCommitted(txHash, testnetCkbRpc);
  }, 3, 8000).catch(reason => {
    console.error(`failed to deposit for ${ckbAddress}, reason:`, reason);
  });
}

async function batchDeposits(to: GodwokenNetwork, privKeys: string[]) {
  console.log(`Rollup type hash: ${getRollupTypeHash()}`);

  const indexer = await initConfigAndSync(testnetCkbRpcUrl, testnetCkbIndexerURL);

  const depositPromises = privKeys.map(privKey => async () => {
    await asyncSleep(Math.random() * 8000);
    await deposit(privKey, indexer).catch(console.error);
  });
  await promiseAllLimitN(60, depositPromises).catch(console.error);
  console.log("Deposits finished.");
}

/**
 * Enviroments:
 * - GW_NET=alphanet|testnet
 * - DEBUG=true
 * 
 * Usage:
 *   DEBUG=true GW_NET=testnet yarn ts-node src/benchmark/batch-deposits.ts [accountNum]
 *   args[0]: account num used to test
 * 
 * Example:
 * ```sh
 * DEBUG=true GW_NET=testnet_v1 yarn ts-node src/benchmark/batch-deposits.ts 4
 * ```
 */
(function runTest() {
  const args = process.argv.slice(2);
  const endIdx = args[0] || privKeys.length;
  console.log(`\t Using accounts[0..${endIdx}]`);

  console.log("process.env.GW_NET", process.env.GW_NET);
  batchDeposits(
    (<any>GodwokenNetwork)[process.env.GW_NET || "alphanet"],
    privKeys.reverse().slice(0, Number(endIdx)));
})();
