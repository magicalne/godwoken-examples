import { HexNumber, Script } from "@ckb-lumos/base";
import {
  Godwoken, WithdrawalRequestV1, RawWithdrawalRequestV1, WithdrawalRequestExtra
} from "@godwoken-examples/godwoken";
import { initConfig, waitForWithdraw } from "../account/common";
import { CKB_SUDT_ID, getGodwokenWeb3, GodwokenNetwork } from "../common";
import {
  ckbAddressToLockHash, privateKeyToCkbAddress, privateKeyToEthAddress, privKeyToLockScript,
  promiseAllLimitN
} from "../modules/utils";
import { ethAddressToScriptHash, getBalanceByScriptHash } from "../modules/godwoken";
import { signTypedData, SignTypedDataVersion } from "@metamask/eth-sig-util";
import { privKeys } from "./accounts";
// import { ROLLUP_TYPE_HASH } from "../modules/godwoken-config";

async function batchWithdrawals(from: GodwokenNetwork, privKeys: string[]) {
  initConfig();

  let godwokenWeb3: Godwoken = getGodwokenWeb3(from);
  let chainId: HexNumber = await godwokenWeb3.getChainId();

  let promiseArray = privKeys.map(privKey => async () => {
    const capacity = 26500000000; // 265 CKB
    const ownerCkbAddress = privateKeyToCkbAddress(privKey);
    console.log(`Withdraw from layer2 to ${ownerCkbAddress}`);

    // we don't test sUDT withdrawal here
    const amount = 0;     // other sUDT
    const sudtScriptHash = "0x0000000000000000000000000000000000000000000000000000000000000000";

    const layer1OwnerLockHash = ckbAddressToLockHash(ownerCkbAddress);
    const ethAddress = privateKeyToEthAddress(privKey);
    console.log("eth_address:", ethAddress);
    const layer2AccountScriptHash = ethAddressToScriptHash(ethAddress);

    try {
      // get balance on Godwoken
      const curGwBalance = await getBalanceByScriptHash(godwokenWeb3, CKB_SUDT_ID, layer2AccountScriptHash);
      if (curGwBalance < capacity) {
        throw new Error(`insufficient balance(${curGwBalance}) on Godwoken`);
      }

      const fromId = await godwokenWeb3.getAccountIdByScriptHash(layer2AccountScriptHash);
      const nonce: number = await godwokenWeb3.getNonce(fromId!);
      // TODO: getNonce from Web3 RPC - getTransactionCount

      // createRawWithdrawalReq
      const fee: HexNumber = '0x0';
      const rawWithdrawalRequest: RawWithdrawalRequestV1 = {
        chain_id: chainId,
        nonce: `0x${nonce.toString(16)}`,
        capacity: "0x" + BigInt(capacity).toString(16),
        amount: "0x" + BigInt(amount).toString(16),
        sudt_script_hash: sudtScriptHash,
        account_script_hash: layer2AccountScriptHash,
        owner_lock_hash: layer1OwnerLockHash,
        fee
      };
      console.log('RawWithdrawalRequestV1:', rawWithdrawalRequest);

      // construct sign-typed-data
      const layer1OwnerLock: Script = privKeyToLockScript(privKey);
      const typedMsg = {
        domain: {
          name: "Godwoken",
          version: "1",
          chainId: Number(chainId),
        },
        message: {
          accountScriptHash: layer2AccountScriptHash,
          nonce,
          chainId: Number(chainId),
          fee: Number(fee),
          layer1OwnerLock: {
            codeHash: layer1OwnerLock.code_hash,
            hashType: layer1OwnerLock.hash_type,
            args: layer1OwnerLock.args,
          },
          withdraw: {
            ckbCapacity: capacity,
            UDTAmount: amount,
            UDTScriptHash: sudtScriptHash,
          }
        },
        primaryType: "Withdrawal" as const,
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
          ],
          Withdrawal: [
            { name: "accountScriptHash", type: "bytes32" },
            { name: "nonce", type: "uint256" },
            { name: "chainId", type: "uint256" },
            { name: "fee", type: "uint256" },
            { name: "layer1OwnerLock", type: "Script" },
            { name: "withdraw", type: "WithdrawalAsset" },
          ],
          Script: [
            { name: "codeHash", type: "bytes32" },
            { name: "hashType", type: "string" },
            { name: "args", type: "bytes" },
          ],
          WithdrawalAsset: [
            { name: "ckbCapacity", type: "uint256" },
            { name: "UDTAmount", type: "uint256" },
            { name: "UDTScriptHash", type: "bytes32" },
          ],
        }
      };
      console.log('typedMsg:', typedMsg);
      
      // sign message
      const privateKey = Buffer.from(privKey.slice(2), 'hex');      
      const signature = signTypedData({
        privateKey,
        data: typedMsg,
        version: SignTypedDataVersion.V4
      });

      // construct WithdrawalRequestExtra
      const withdrawalReq: WithdrawalRequestV1 = {
        raw: rawWithdrawalRequest,
        signature
      };
      const withdrawalReqExtra: WithdrawalRequestExtra = {
        request: withdrawalReq,
        owner_lock: layer1OwnerLock
      };
      console.log("WithdrawalRequestExtra:", withdrawalReqExtra);

      // submit WithdrawalRequestExtra
      const result = await godwokenWeb3.submitWithdrawalReqV1(withdrawalReqExtra);
      console.log("result:", result);
      if (result !== null) {
        const errorMessage = (result as any).message;
        if (errorMessage !== undefined && errorMessage !== null) {
          throw new Error(errorMessage);
        }
      }

      await waitForWithdraw(godwokenWeb3, layer2AccountScriptHash, curGwBalance);
      return Promise.resolve("Withdrawal finished");
    } catch (e) {
      console.error(e);
      return Promise.resolve("Failed to withdraw");
    }
  });

  promiseAllLimitN(60, promiseArray).catch(console.error);
}

/**
 * args[0]: account num used to test
 * 
 * Usage:
 * ```bash
   GW_NET=testnet_v1 yarn ts-node src/benchmark/batch-withdrawals-v1.ts 2
 * ```
 */
(function runTest() {
  const args = process.argv.slice(2);
  const endIdx = args[0] || privKeys.length;
  console.log(`\t Using accounts[0..${endIdx}]`);

  console.log("process.env.GW_NET", process.env.GW_NET);
  batchWithdrawals(
    (<any>GodwokenNetwork)[process.env.GW_NET || "testnet_v1"],
    privKeys.slice(0, Number(endIdx)));
})();
