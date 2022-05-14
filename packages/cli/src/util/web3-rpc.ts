import http from "http";
import https from "https";
import { RPC as Rpc } from "@ckb-lumos/toolkit";
import { EthAddress } from "../alias";
import { WithdrawalRequestExtra, WithdrawalRequestExtraCodec } from "../schema";
import { Hash, Script, HexNumber, HexString } from "@ckb-lumos/lumos";
import { normalizeHexNumber } from "../schema/normalizers";
import { EthUser, ETH_REGISTRY_ID } from "../user";
import { computeScriptHash } from "@ckb-lumos/base/lib/utils";

const httpAgent = new http.Agent({
  keepAlive: true,
});
const httpsAgent = new https.Agent({
  keepAlive: true,
});

export class RPC extends Rpc {
  constructor(url: string, options?: object) {
    let agent: http.Agent | https.Agent = httpsAgent;
    if (url.startsWith("http:")) {
      agent = httpAgent;
    }

    options = options || {};
    (options as any).agent ||= agent;
    super(url, options);
  }
}

export class GodwokenWeb3Rpc {
  readonly rpc__: RPC;
  constructor(url: string, options?: object) {
    this.rpc__ = new RPC(url, options);
  }

  public async getBalance(ethAddress: EthAddress): Promise<bigint> {
    const hexBalance = (await this.call_(
      "eth_getBalance",
      ethAddress,
      "latest"
    )) as HexNumber;
    return BigInt(hexBalance);
  }

  public async getAccountIdByScriptHash(scriptHash: Hash): Promise<number> {
    const hexAccountId = (await this.call_(
      "gw_get_account_id_by_script_hash",
      scriptHash
    )) as HexNumber;
    return Number(hexAccountId);
  }

  public async getSudtBalance(
    ethAddress: EthAddress,
    sudtScript: Script
  ): Promise<bigint> {
    console.log("bilibili", sudtScript);
    const sudtScriptHash = computeScriptHash(sudtScript);
    const sudtId = await this.getAccountIdByScriptHash(sudtScriptHash);
    const registryAddress = new EthUser(ethAddress).registryAddress();
    const hexBalance = (await this.call_(
      "gw_get_balance",
      registryAddress,
      "0x" + sudtId.toString(16)
    )) as HexNumber;
    return BigInt(hexBalance);
  }

  public async getNonce(ethAddress: EthAddress): Promise<number> {
    const hexNonce = (await this.call_(
      "eth_getTransactionCount",
      ethAddress,
      "latest"
    )) as HexNumber;
    return Number(hexNonce);
  }

  public async getChainId(): Promise<bigint> {
    const hexChainId = (await this.call_("eth_chainId")) as HexNumber;
    return BigInt(hexChainId);
  }

  public async getWithdrawal(
    withdrawalHash: Hash
  ): Promise<{ status: string }> {
    return (await this.call_("gw_get_withdrawal", withdrawalHash, 1)) as {
      status: string;
    };
  }

  public async submitWithdrawalRequest(
    withdrawalRequestExtra: WithdrawalRequestExtra
  ): Promise<Hash> {
    const serialized = new WithdrawalRequestExtraCodec(
      withdrawalRequestExtra
    ).HexSerialize();
    return (await this.call_(
      "gw_submit_withdrawal_request",
      serialized
    )) as Hash;
  }

  public async getEthAccountLockHash(): Promise<Hash> {
    return (await this.call_("poly_getEthAccountLockHash")) as Hash;
  }

  public async getRollupTypeHash(): Promise<Hash> {
    return (await this.call_("poly_getRollupTypeHash")) as Hash;
  }

  private async call_(method: string, ...args: any[]): Promise<any> {
    return await this.retryCall_(0, method, ...args);
  }

  private async retryCall_(
    retries: number,
    method: string,
    ...args: any[]
  ): Promise<any> {
    try {
      return await this.rpc__[method](...args);
    } catch (err: any) {
      if (retries === 20) {
        throw err;
      } else {
        console.error(
          `Call to GodwokenWeb3 ${method}(${args}), error: ${err.message}`
        );
        return await this.retryCall_(retries + 1, method, ...args);
      }
    }
  }
}
