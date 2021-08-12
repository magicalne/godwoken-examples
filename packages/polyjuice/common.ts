import { ethers } from "ethers";
import { PolyjuiceWallet, PolyjuiceConfig } from "@polyjuice-provider/ethers";
import { PolyjuiceJsonRpcProvider } from "@polyjuice-provider/ethers";
import dotenv from "dotenv";
import axios from "axios";
import WalletSimple from "./contracts/WalletSimple.sol/WalletSimple.json";
import { AbiItems } from "@polyjuice-provider/base/lib/abi";
import path from "path";

dotenv.config({
  path: path.resolve(process.env.ENV_PATH ?? "./.env"),
});
axios.defaults.withCredentials = true;

const { DEPLOYER_PRIVATE_KEY, NETWORK_SUFFIX, GODWOKEN_API_URL } = process.env;

if (DEPLOYER_PRIVATE_KEY == null) {
  console.log("process.env.DEPLOYER_PRIVATE_KEY is required");
  process.exit(1);
}

// godwoken-config.toml -> relative path: ../../../kicker/workspace/config.toml 
const godwokenConfigPath = require("path").resolve(
  __dirname, "../../../kicker/workspace/config.toml");
const tomlStr = require("fs").readFileSync(godwokenConfigPath);
const configJson = require('@iarna/toml').parse(tomlStr);
const ROLLUP_TYPE_HASH
  = process.env.ROLLUP_TYPE_HASH || configJson.genesis.rollup_type_hash;
const ETH_ACCOUNT_LOCK_CODE_HASH 
  = process.env.ETH_ACCOUNT_LOCK_CODE_HASH || configJson.web3_indexer.eth_account_lock_hash;

export const PolyjuiceWalletConfig: PolyjuiceConfig = {
  rollupTypeHash: ROLLUP_TYPE_HASH,
  ethAccountLockCodeHash: ETH_ACCOUNT_LOCK_CODE_HASH,
  web3Url: process.env.WEB3_RPC!,
  abiItems: WalletSimple.abi as AbiItems,
};

// const godwokerOption: GodwokerOption = {
//   godwoken: {
//     rollup_type_hash: ROLLUP_TYPE_HASH!,
//     eth_account_lock: {
//       code_hash: ETH_ACCOUNT_LOCK_CODE_HASH!,
//       hash_type: "type",
//     },
//   },
// };
// export const token_rpc = new PolyjuiceJsonRpcProvider(
//   godwokerOption,
//   SimpleToken.abi as AbiItems,
//   process.env.WEB3_RPC,
// );

export const polyjuiceConfig: PolyjuiceConfig = {
  rollupTypeHash: ROLLUP_TYPE_HASH,
  ethAccountLockCodeHash: ETH_ACCOUNT_LOCK_CODE_HASH,
  web3Url: process.env.WEB3_RPC!
};

export const polyjuiceRPC = new PolyjuiceJsonRpcProvider(
  polyjuiceConfig,
  polyjuiceConfig.web3Url
);

export const polyjuiceDeployer = new PolyjuiceWallet(
  DEPLOYER_PRIVATE_KEY,
  polyjuiceConfig,
  polyjuiceRPC,
);

export const defaultRPC = new ethers.providers.JsonRpcProvider(
  process.env.WEB3_RPC,
);
export const defaultDeployer = new ethers.Wallet(
  DEPLOYER_PRIVATE_KEY,
  defaultRPC,
);

export const networkSuffix = NETWORK_SUFFIX;
export const isGodwokenDevnet = networkSuffix === "gw-devnet";

export async function depositFromL1toL2(wallet: PolyjuiceWallet, minBalance = 400n) {
  const balance = await web3Rpc.getBalance(wallet.address);
  if (balance.gt(minBalance)) {
    console.log(`\t Balance of ${wallet.address} is ${balance}`);
    return;
  }

  if (GODWOKEN_API_URL == null) {
    throw new Error("process.env.GODWOKEN_API_URL is required");
  }

  console.log("\t", wallet.address, "self depositing");
  let res = await axios.get(`${GODWOKEN_API_URL}/deposit`, {
    params: { privKey: wallet.privateKey }
  });

  if (res.data.status !== "ok") {
    console.error(`    ${wallet.address} Failed to self deposit, try again...`);
    // console.debug(res);
    res = await axios.get(`${GODWOKEN_API_URL}/deposit`, {
      params: { eth_address: wallet.address }
    });
    if (res.data.status !== "ok") {
      console.error(`    ${wallet.address} Failed to deposit.`);
      return;
      // throw new Error("Failed to deposit");
    }
  }

  console.log(`    Account ID:`, res.data.data.account_id);
}

export async function initGwAccountIfNeeded(account: string, usingRPC = web3Rpc) {
  const balance = await usingRPC.getBalance(account);
  if (balance.gt(0)) {
    return;
  }

  if (!isGodwoken) {
    console.log(`[warn] account(${account}) balance is 0`);
    return;
  }

  console.log(`Running: Initialize Godwoken account for ${account} by deposit`);

  if (GODWOKEN_API_URL == null) {
    throw new Error("process.env.GODWOKEN_API_URL is required");
  }

  console.log("    It may take a few minutes...");
  let res = await axios.get(`${GODWOKEN_API_URL}/deposit`, {
    params: {
      eth_address: account,
    },
  });

  if (res.data.status !== "ok") {
    console.log("    Failed to deposit, res:", res);
    throw new Error();
  }

  console.log(`    Initialized, id:`, res.data.data.account_id);
}

export const isGodwoken = networkSuffix?.startsWith("gw");
export const web3Rpc = isGodwoken ? polyjuiceRPC : defaultRPC;
export const deployer = isGodwoken ? polyjuiceDeployer : defaultDeployer;
