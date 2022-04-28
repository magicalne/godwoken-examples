import { RPC, Indexer, HexString } from "@ckb-lumos/lumos";
import * as config from "./config";
import { GodwokenWeb3Rpc } from "./util/web3-rpc";

// CKB SECP256K1 lock args, 0x-prefixed 160-bites string
export type CkbSecpLockArgs = HexString;

// ETH address, 0x-prefixed 160-bits string
export type EthAddress = HexString;

// SECP256k1 private key, 0x-prefixed string
export type SECP256K1PrivateKey = HexString;

export const ckbRpc = new RPC(config.CKB_RPC_URL());
export const ckbIndexer = new Indexer(
  config.CKB_INDEXER_URL(),
  config.CKB_RPC_URL()
);
export const godwokenWeb3 = new GodwokenWeb3Rpc(config.GODWOKEN_WEB3_URL());
