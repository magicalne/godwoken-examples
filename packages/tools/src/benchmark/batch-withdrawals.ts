import { Godwoken } from "@godwoken-examples/godwoken";
import { initConfig, waitForWithdraw } from "../account/common";
import { withdrawal as withdrawReqFromL2ToL1 } from "../account/withdraw";
import { alphanetWeb3RpcUrl, CKB_SUDT_ID } from "../common";
import { ethAddressToScriptHash, getBalanceByScriptHash } from "../modules/godwoken";
import { ckbAddressToLockHash, privateKeyToCkbAddress, privateKeyToEthAddress, promiseAllLimitN } from "../modules/utils";
import { privKeys } from "./accounts";

const godwoken = new Godwoken(alphanetWeb3RpcUrl);

async function batchWithdrawals(privKeys: string[]) {
  initConfig();

  let promiseArray = privKeys.map(privKey => async () => {
    const feeSudtId = CKB_SUDT_ID;
    const feeAmount = 1000n;

    const capacity = 26500000000; // 265 CKB
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
        throw new Error(`insufficient balance(${curGwBalance}) on Godwoken`);
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
      return Promise.resolve("Withdrawal finished");
    } catch (e) {
      console.error(e);
      return Promise.reject("Failed to withdraw");
    }
  });

  promiseAllLimitN(12, promiseArray).catch(console.error);
}

/**
 * args[0]: account num used to test
 */
(function runTest() {
  const args = process.argv.slice(2);
  const endIdx = args[0] || privKeys.length;
  console.log(`\t Using accounts[0..${endIdx}]`);

  batchWithdrawals(privKeys.slice(0, Number(endIdx)));
})();