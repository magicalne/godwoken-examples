import { Godwoken } from "@godwoken-examples/godwoken";
import { initConfig, waitForWithdraw } from "../account/common";
import { withdrawal as withdrawReqFromL2ToL1 } from "../account/withdraw";
import { CKB_SUDT_ID } from "../common";
import { ethAddressToScriptHash, getBalanceByScriptHash } from "../modules/godwoken";
import { ckbAddressToLockHash, privateKeyToCkbAddress, privateKeyToEthAddress } from "../modules/utils";
import { privKeys } from "./accounts";

const ckbRpcUrl = "https://testnet.ckbapp.dev/rpc";

const testnetGodwokenRpcUrl = "https://godwoken-testnet-web3-rpc.ckbapp.dev";
const godwoken = new Godwoken(testnetGodwokenRpcUrl);

async function batchWithdrawals(privKeys: string[]) {
  initConfig();

  privKeys.forEach(async (privKey, idx) => {
    const feeSudtId = CKB_SUDT_ID;
    const feeAmount = 1000n;

    const capacity = 49900000000; // 499 CKB
    const ownerCkbAddress = privateKeyToCkbAddress(privKey);
    console.log(`Withdraw from layer2 to ${ownerCkbAddress}`);
    
    // we don't test sUDT withdrawal here
    const amount = 0;     // other sUDT
    const sudtScriptHash = "0x0000000000000000000000000000000000000000000000000000000000000000";

    const ownerLockHash = ckbAddressToLockHash(ownerCkbAddress);
    const ethAddress = privateKeyToEthAddress(privKey); // short_script_hash
    const accountScriptHash = ethAddressToScriptHash(ethAddress);

    try {
      // get balance on Godwoken
      const curGwBalance = await getBalanceByScriptHash(godwoken, CKB_SUDT_ID, accountScriptHash);
      if (curGwBalance < capacity) {
        throw new Error("insufficient balance on Godwoken");
        // console.warn("insufficient balance on Godwoken");
      }
      await withdrawReqFromL2ToL1(
        godwoken,
        privKey,
        capacity.toString(),
        amount.toString(),
        sudtScriptHash,
        ownerLockHash,
        feeSudtId,
        feeAmount
      );

      await waitForWithdraw(godwoken, accountScriptHash, curGwBalance);

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

  batchWithdrawals(privKeys.slice(0, Number(args[0])));
})();