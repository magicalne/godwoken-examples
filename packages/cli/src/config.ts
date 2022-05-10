import * as lumosConfigManager from "@ckb-lumos/config-manager";
import { Hash, CellDep, Script } from "@ckb-lumos/lumos";
import { BETANET } from "./predefined";
import { HexString } from "@ckb-lumos/base";
import { computeScriptHash } from "@ckb-lumos/base/lib/utils";

export { ScriptConfig } from "@ckb-lumos/config-manager";

export function CKB_RPC_URL(): string {
  return process.env.CKB_RPC_URL || "http://127.0.0.1:8114";
}

export function CKB_INDEXER_URL(): string {
  return process.env.CKB_INDEXER_URL || "http://127.0.0.1:8116";
}

export function GODWOKEN_WEB3_URL(): string {
  return process.env.GODWOKEN_WEB3_URL || "http://127.0.0.1:8024";
}

/*
  @returns Rollup script hash
 */
export function ROLLUP_TYPE_HASH(): Hash {
  return computeScriptHash(ROLLUP_SCRIPT());
}

export function ROLLUP_SCRIPT_ARGS(): HexString {
  return process.env.ROLLUP_SCRIPT_ARGS!;
}

export function ROLLUP_SCRIPT(): Script {
  const scriptConfig = getScriptConfig("rollup_type_script");
  return {
    code_hash: scriptConfig.CODE_HASH,
    hash_type: scriptConfig.HASH_TYPE,
    args: ROLLUP_SCRIPT_ARGS(),
  };
}

export function getCellDep(scriptName: string): CellDep {
  const scriptConfig = lumosConfigManager.getConfig().SCRIPTS[scriptName]!;
  return {
    dep_type: scriptConfig.DEP_TYPE,
    out_point: {
      tx_hash: scriptConfig.TX_HASH,
      index: scriptConfig.INDEX,
    },
  };
}

export function getScriptConfig(
  scriptName: string
): lumosConfigManager.ScriptConfig {
  return lumosConfigManager.getConfig().SCRIPTS[scriptName]!;
}

// TODO: Verify if all the scripts code exist
export function initializeConfig(lumosConfigFile: string) {
  if (!process.env.ROLLUP_TYPE_HASH) {
    throw new Error('Miss environment variable "ROLLUP_TYPE_HASH"');
  }
  if (
    !process.env.ROLLUP_TYPE_HASH!.startsWith("0x") ||
    process.env.ROLLUP_TYPE_HASH!.length != 66
  ) {
    throw new Error(
      `Invalid environment variable "ROLLUP_TYPE_HASH": "${process.env
        .ROLLUP_TYPE_HASH!}", expected 0x-prefix 20bytes`
    );
  }

  console.log("CKB_RPC_URL:", CKB_RPC_URL());
  console.log("CKB_INDEXER_URL:", CKB_INDEXER_URL());
  console.log("GODWOKEN_WEB3_URL:", GODWOKEN_WEB3_URL());
  console.log();

  if (lumosConfigFile.toUpperCase() === "BETANET") {
    console.log(`Load pre-defined configuration: "BETANET"`);
    lumosConfigManager.initializeConfig(BETANET);
  } else {
    console.log(`Load self-defined configuration: "${lumosConfigFile}"`);
    const config: lumosConfigManager.Config = require(lumosConfigFile);
    lumosConfigManager.initializeConfig(config);
  }
}
