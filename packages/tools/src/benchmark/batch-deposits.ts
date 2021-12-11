import { deploymentConfig } from "../modules/deployment-config";
import { Hash } from "@ckb-lumos/base";
import { initConfigAndSync, waitForDeposit, waitTxCommitted } from "../account/common";
import { asyncSleep, privateKeyToCkbAddress, privateKeyToEthAddress, retry, } from "../modules/utils";
import { getRollupTypeHash } from "../modules/deposit";
import { getBalanceByScriptHash, ethAddressToScriptHash } from "../modules/godwoken";
import { Godwoken } from "@godwoken-examples/godwoken";
import { sendTx as sendDepositTx } from "../account/deposit-ckb";
import { privKeys } from "./accounts";
import { alphanetWeb3RpcUrl, CKB_SUDT_ID, GodwokenNetwork, testnetCkbIndexerURL, testnetCkbRpc, testnetCkbRpcUrl, testnetGodwokenRpcUrl } from "../common";
import { CkbIndexer } from "../account/indexer-remote";

const MINIMUM_DEPOSIT_CAPACITY = "30000000000"; // 500 CKB
// const defaultEthAddress = "0x6daf63d8411d6e23552658e3cfb48416a6a2ca78"

async function deposit(privKey: string, ckbIndexer: CkbIndexer, godwokenRPC: Godwoken) {
  const ckbAddress = privateKeyToCkbAddress(privKey);
  const ethAddress = privateKeyToEthAddress(privKey);

  console.log("Using ETH address:", ethAddress);
  console.log("Using CKB address:", ckbAddress);

  return retry(async () => {
    const accountScriptHash = ethAddressToScriptHash(ethAddress);
    const currentBalance = await getBalanceByScriptHash(
      godwokenRPC,
      CKB_SUDT_ID,
      accountScriptHash
    );

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
    console.log("--------- wait for deposit transaction ----------");
    await waitTxCommitted(txHash, testnetCkbRpc);
    await waitForDeposit(godwokenRPC, accountScriptHash, currentBalance);
  }, 3, 10000);
}

async function batchDeposits(to: GodwokenNetwork, privKeys: string[]) {
  console.log(`Rollup type hash: ${getRollupTypeHash()}`);

  const indexer = await initConfigAndSync(testnetCkbRpcUrl, testnetCkbIndexerURL);
  let godwokenRPC: Godwoken;
  switch (to) {
    case GodwokenNetwork.alphanet:
      godwokenRPC = new Godwoken(alphanetWeb3RpcUrl);
      break;
    case GodwokenNetwork.testnet:
      godwokenRPC = new Godwoken(testnetGodwokenRpcUrl);
      break;
    default:
      throw new Error("Undefined GodwokenNetwork");
  }

  let idx = 0;
  let depositingNum = 0;
  const batchNum = 50;
  while (idx < privKeys.length) {
    if (depositingNum < batchNum) {
      depositingNum++;
      deposit(privKeys[idx++], indexer, godwokenRPC).finally(() => depositingNum--);
      console.debug(`depositingNum: ${depositingNum} | idx = ${idx}`);
    }
    await asyncSleep(100);
  }
  while(depositingNum > 0) {
    console.debug(`depositingNum: ${depositingNum}`);
    await asyncSleep(1000);
  }
  console.log("Deposits finished.");
}

/**
 * args[0]: account num used to test
 */
(function runTest() {
  const args = process.argv.slice(2);
  const endIdx = args[0] || privKeys.length;
  console.log(`\t Using accounts[0..${endIdx}]`);
  
  batchDeposits(GodwokenNetwork.alphanet,
                privKeys.reverse().slice(0, Number(endIdx)));
})();
