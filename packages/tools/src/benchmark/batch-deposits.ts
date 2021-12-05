import { deploymentConfig } from "../modules/deployment-config";
import { Hash } from "@ckb-lumos/base";
import { initConfigAndSync, waitForDeposit, waitTxCommitted } from "../account/common";
import { privateKeyToCkbAddress, privateKeyToEthAddress, retry, } from "../modules/utils";
import { getRollupTypeHash } from "../modules/deposit";
import { getBalanceByScriptHash, ethAddressToScriptHash } from "../modules/godwoken";
import { Godwoken } from "@godwoken-examples/godwoken";
import { sendTx as sendDepositTx } from "../account/deposit-ckb";
import { privKeys } from "./accounts";
import { alphanetWeb3RpcUrl, CKB_SUDT_ID, GodwokenNetwork, testnetCkbIndexerURL, testnetCkbRpc, testnetCkbRpcUrl, testnetGodwokenRpcUrl } from "../common";

const MINIMUM_DEPOSIT_CAPACITY = "50000000000"; // 500 CKB
const defaultEthAddress = "0x6daf63d8411d6e23552658e3cfb48416a6a2ca78"

async function batchDeposits(
  to: GodwokenNetwork,
  privKeys: string[],
  toDefaultAddress: boolean = true,
  minBalance = 40000000000n) {

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

  const indexer = await initConfigAndSync(testnetCkbRpcUrl, testnetCkbIndexerURL);
  privKeys.forEach(async (privKey) => {
    const ckbAddress = privateKeyToCkbAddress(privKey);
    const ethAddress = toDefaultAddress && defaultEthAddress || privateKeyToEthAddress(privKey);

    console.log("Using ETH address:", ethAddress);
    console.log("Using CKB address:", ckbAddress);
    console.log(`Rollup type hash: ${getRollupTypeHash()}`);

    retry(async () => {
      const accountScriptHash = ethAddressToScriptHash(ethAddress);
      const currentBalance = await getBalanceByScriptHash(
        godwokenRPC,
        CKB_SUDT_ID,
        accountScriptHash
      );
      if (currentBalance > minBalance) {
        console.debug(`${ckbAddress}'s balance = ${currentBalance} > ${minBalance} shannons`);
        console.log(`Skip deposit for ${ckbAddress}`);
        return;
      }

      const txHash: Hash = await sendDepositTx(
        deploymentConfig,
        ckbAddress,
        MINIMUM_DEPOSIT_CAPACITY.toString(),
        ethAddress.toLowerCase(),
        indexer,
        privKey,
        testnetCkbRpcUrl
      );
      console.log("Transaction hash:", txHash);
      console.log("--------- wait for deposit transaction ----------");

      await waitTxCommitted(txHash, testnetCkbRpc);
      await waitForDeposit(godwokenRPC, accountScriptHash, currentBalance);
    }, 6, 10000);
  });
}

/**
 * args[0]: account num used to test
 */
(function runTest() {
  const args = process.argv.slice(2);
  console.log(`\t Using accounts[0..${args[0]}]`);
  
  batchDeposits(GodwokenNetwork.alphanet, privKeys.slice(0, Number(args[0])), false, 120000000000n);
})();
