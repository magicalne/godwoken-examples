import { RawWithdrawalRequest, WithdrawalRequest } from "../schema";
import { Hash, HexNumber, Script } from "@ckb-lumos/lumos";
import { CkbUser, EthUser } from "../user";
import { computeScriptHash } from "@ckb-lumos/base/lib/utils";
import { signTypedData, SignTypedDataVersion } from "@metamask/eth-sig-util";

export function buildRawWithdrawalRequest(
  l1CkbUser: CkbUser,
  l2EthUser: EthUser,
  nonce: number,
  chain_id: bigint,
  ckbCapacity: bigint,
  fee: bigint,
  sudtAmount: bigint = BigInt(0),
  sudtScript?: Script
): RawWithdrawalRequest {
  const sudtScriptHash: Hash =
    sudtScript == null
      ? "0x0000000000000000000000000000000000000000000000000000000000000000"
      : computeScriptHash(sudtScript);
  const accountScriptHash: Hash = l2EthUser.accountScriptHash();
  const ownerLockHash: Hash = l1CkbUser.l1LockHash();
  const registryId: HexNumber = "0x" + l2EthUser.ethRegistryId().toString(16);
  return {
    nonce: "0x" + nonce.toString(16),
    chain_id: "0x" + chain_id.toString(16),
    capacity: "0x" + ckbCapacity.toString(16),
    amount: "0x" + sudtAmount.toString(16),
    fee: "0x" + fee.toString(16),
    sudt_script_hash: sudtScriptHash,
    account_script_hash: accountScriptHash,
    owner_lock_hash: ownerLockHash,
    registry_id: registryId,
  };
}

export function buildWithdrawalRequest(
  l1CkbUser: CkbUser,
  l2EthUser: EthUser,
  nonce: number,
  chainId: bigint,
  ckbCapacity: bigint,
  fee: bigint,
  sudtAmount: bigint = BigInt(0),
  sudtScript?: Script
): WithdrawalRequest {
  const raw = buildRawWithdrawalRequest(
    l1CkbUser,
    l2EthUser,
    nonce,
    chainId,
    ckbCapacity,
    fee,
    sudtAmount,
    sudtScript
  );

  // Reference https://github.com/nervosnetwork/godwoken/blob/e1d5279ac442a785bace655758cdb570c0fa7f43/crates/generator/src/account_lock_manage/eip712/types.rs#L194-L204
  const typedMsg = {
    domain: {
      name: "Godwoken",
      version: "1",
      chainId: Number(raw.chain_id),
    },
    message: {
      address: {
        registry: l2EthUser.ethRegistryName(),
        address: l2EthUser.ethAddress(),
      },
      nonce: Number(raw.nonce),
      chainId: Number(raw.chain_id),
      fee: Number(fee),
      layer1OwnerLock: {
        codeHash: l1CkbUser.l1LockScript().code_hash,
        hashType: l1CkbUser.l1LockScript().hash_type,
        args: l1CkbUser.l1LockScript().args,
      },
      withdraw: {
        ckbCapacity: Number(raw.capacity),
        UDTAmount: Number(raw.amount),
        UDTScriptHash: raw.sudt_script_hash,
      },
    },
    primaryType: "Withdrawal" as const,
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
      ],
      Withdrawal: [
        { name: "address", type: "RegistryAddress" },
        { name: "nonce", type: "uint256" },
        { name: "chainId", type: "uint256" },
        { name: "fee", type: "uint256" },
        { name: "layer1OwnerLock", type: "Script" },
        { name: "withdraw", type: "WithdrawalAsset" },
      ],
      RegistryAddress: [
        { name: "registry", type: "string" },
        { name: "address", type: "address" },
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
    },
  };
  const privateKey = Buffer.from(l2EthUser.privateKey__!.slice(2), "hex");
  const signature = signTypedData({
    privateKey,
    data: typedMsg,
    version: SignTypedDataVersion.V4,
  });
  return {
    raw,
    signature,
  };
}
