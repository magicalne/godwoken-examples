import { deploymentConfig, } from "../modules/deployment-config";
import { Hash } from "@ckb-lumos/base";
import { RPC } from "ckb-js-toolkit";
import { initConfigAndSync, waitForDeposit, waitTxCommitted } from "../account/common";
import { privateKeyToCkbAddress, privateKeyToEthAddress, } from "../modules/utils";
import { getRollupTypeHash } from "../modules/deposit";
import { getBalanceByScriptHash, ethAddressToScriptHash } from "../modules/godwoken";
import { Godwoken } from "@godwoken-examples/godwoken";
import { sendTx as sendDepositTx } from "../account/deposit-ckb";
import { privKeys } from "./accounts";
import { CKB_SUDT_ID } from "../common";

const MINIMUM_DEPOSIT_CAPACITY = "50000000000"; // 500 CKB

const ckbRpcUrl = "https://testnet.ckbapp.dev/rpc";
const ckbRpc = new RPC(ckbRpcUrl);
const ckbIndexerURL = "https://testnet.ckbapp.dev/indexer";
const defaultEthAddress = "0x6daf63d8411d6e23552658e3cfb48416a6a2ca78"
const godwokenRPC = new Godwoken("https://godwoken-testnet-web3-rpc.ckbapp.dev");

async function batchDeposits(privKeys: string[], toDefaultAddress: boolean = true) {
  const indexer = await initConfigAndSync(ckbRpcUrl, ckbIndexerURL);
  privKeys.forEach(async (privKey) => {
    const ckbAddress = privateKeyToCkbAddress(privKey);
    const ethAddress = toDefaultAddress && defaultEthAddress || privateKeyToEthAddress(privKey);

    console.log("Using ETH address:", ethAddress);
    console.log("Using CKB address:", ckbAddress);
    console.log(`Rollup type hash: ${getRollupTypeHash()}`);

    try {
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
        indexer,
        privKey,
        ckbRpcUrl
      );
      console.log("Transaction hash:", txHash);
      console.log("--------- wait for deposit transaction ----------");

      await waitTxCommitted(txHash, ckbRpc);
      await waitForDeposit(godwokenRPC, accountScriptHash, currentBalance);
    } catch (e) {
      console.error(e);
    }
  });
}

/**
 * args[0]: account num used to test
 */
(function runTest() {
  const args = process.argv.slice(2);
  console.log(`\t Using accounts[0..${args[0]}]`);

  // TODO: check balance of the testing accounts
  // filter accounts by checking balance

  batchDeposits(privKeys.slice(0, Number(args[0])), false);
})();
