import { deploymentConfig } from "../modules/deployment-config";
import { Hash } from "@ckb-lumos/base";
import { initConfigAndSync, waitTxCommitted } from "../account/common";
import { asyncSleep, privateKeyToCkbAddress, privateKeyToEthAddress, promiseAllLimitN, retry, } from "../modules/utils";
import { getRollupTypeHash } from "../modules/deposit";
// import { getBalanceByScriptHash, ethAddressToScriptHash } from "../modules/godwoken";
import { Godwoken } from "@godwoken-examples/godwoken";
import { sendTx as sendDepositTx } from "../account/deposit-ckb";
import { privKeys } from "./accounts";
import { getGodwokenWeb3, GodwokenNetwork, testnetCkbIndexerURL, testnetCkbRpc, testnetCkbRpcUrl } from "../common";
import { CkbIndexer } from "../account/indexer-remote";
import { logger } from "../modules/logger";

const MINIMUM_DEPOSIT_CAPACITY = "30000000000"; // 500 CKB
// const defaultEthAddress = "0x6daf63d8411d6e23552658e3cfb48416a6a2ca78"

async function deposit(privKey: string, ckbIndexer: CkbIndexer, godwokenRPC: Godwoken) {
  const ckbAddress = privateKeyToCkbAddress(privKey);
  const ethAddress = privateKeyToEthAddress(privKey);

  console.log("Using ETH address:", ethAddress);
  console.log("Using CKB address:", ckbAddress);

  return retry(async () => {
    // const accountScriptHash = ethAddressToScriptHash(ethAddress);
    // const currentBalance = await getBalanceByScriptHash(
    //   godwokenRPC,
    //   CKB_SUDT_ID,
    //   accountScriptHash
    // );

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
    // await waitForDeposit(godwokenRPC, accountScriptHash, currentBalance);
  }, 3, 10000).catch(reason => {
    console.error(`failed to deposit for ${ckbAddress}, reason:`, reason);
  });
}

async function batchDeposits(to: GodwokenNetwork, privKeys: string[]) {
  console.log(`Rollup type hash: ${getRollupTypeHash()}`);

  const indexer = await initConfigAndSync(testnetCkbRpcUrl, testnetCkbIndexerURL);
  let godwokenWeb3: Godwoken = getGodwokenWeb3(to);

  const depositPromises = privKeys.map(privKey => async () => {
    await asyncSleep(Math.random() * 6000);
    await deposit(privKey, indexer, godwokenWeb3)
      .catch(console.error)
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
 * DEBUG=true GW_NET=testnet yarn ts-node src/benchmark/batch-deposits.ts 4
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
