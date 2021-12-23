import { Godwoken } from "@godwoken-examples/godwoken";
import { initConfig, waitForWithdraw } from "../account/common";
import { withdrawal as withdrawReqFromL2ToL1 } from "../account/withdraw";
import { CKB_SUDT_ID, getGodwokenWeb3, GodwokenNetwork } from "../common";
import { ethAddressToScriptHash, getBalanceByScriptHash } from "../modules/godwoken";
import { ckbAddressToLockHash, privateKeyToCkbAddress, privateKeyToEthAddress, promiseAllLimitN } from "../modules/utils";
import { privKeys } from "./accounts";

async function batchWithdrawals(from: GodwokenNetwork, privKeys: string[]) {
  initConfig();
  let godwokenWeb3: Godwoken = getGodwokenWeb3(from);

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
      const curGwBalance = await getBalanceByScriptHash(godwokenWeb3, CKB_SUDT_ID, accountScriptHash);
      if (curGwBalance < capacity) {
        throw new Error(`insufficient balance(${curGwBalance}) on Godwoken`);
      }
      await withdrawReqFromL2ToL1(
        godwokenWeb3,
        privKey,
        capacity.toString(),
        amount.toString(),
        sudtScriptHash,
        ownerLockHash,
        feeSudtId,
        feeAmount
      );
      await waitForWithdraw(godwokenWeb3, accountScriptHash, curGwBalance);
      return Promise.resolve("Withdrawal finished");
    } catch (e) {
      console.error(e);
      return Promise.resolve("Failed to withdraw");
    }
  });

  promiseAllLimitN(30, promiseArray).catch(console.error);
}

/**
 * args[0]: account num used to test
 */
(function runTest() {
  const args = process.argv.slice(2);
  const endIdx = args[0] || privKeys.length;
  console.log(`\t Using accounts[0..${endIdx}]`);

  console.log("process.env.GW_NET", process.env.GW_NET);
  batchWithdrawals(
    (<any>GodwokenNetwork)[process.env.GW_NET || "alphanet"],
    privKeys.slice(0, Number(endIdx)));
})();