/**
 * Update config-files from kicker/workspace/config.toml to:
 * -> tools/packages/tools/configs/devnet.env
 * -> testcases/lending-contracts/config.json
 */

// Include envfile
// Usage of envfile: https://github.com/bevry/envfile#via-nodejs
const { stringify } = require('envfile');
const path = require("path");
const fs = require('fs');

// read godwoken-config.toml from godwoken-kicker workspace
const godwokenConfigPath = process.env.GW_CONFIG_PATH || path.resolve(
  __dirname, "../../../../kicker/workspace/config.toml");
const tomlStr = fs.readFileSync(godwokenConfigPath);
const configJson = require('@iarna/toml').parse(tomlStr);
const ROLLUP_TYPE_HASH = configJson.genesis.rollup_type_hash;
const ETH_ACCOUNT_LOCK_CODE_HASH = configJson.web3_indexer.eth_account_lock_hash;
const POLYJUICE_CONTRACT_CODE_HASH = configJson.web3_indexer.polyjuice_script_type_hash;

const CREATOR_ACCOUNT_ID = 3;
const DEPLOYER_PRIVATE_KEY = "6cd5e7be2f6504aa5ae7c0c04178d8f47b7cfc63b71d95d9e6282f5b090431bf";
const SIGNER_PRIVATE_KEYS = "bdb4474bdd46bf9897accc60c5eb945793e7a3d321bf3b70c30295ceb3433f28,f2d929da616e74fe61bbf5a87a910ac60cfd300d2011bd6212b84ddedddce8ea";
const RPC_URL = "http://localhost:8024";
const GODWOKEN_API_URL = "http://localhost:6101";
const NETWORK_SUFFIX = "gwk-devnet"

const envfileJson = {
  ROLLUP_TYPE_HASH,
  ETH_ACCOUNT_LOCK_CODE_HASH,
  POLYJUICE_CONTRACT_CODE_HASH,
  CREATOR_ACCOUNT_ID,
  DEPLOYER_PRIVATE_KEY,
  SIGNER_PRIVATE_KEYS,
  RPC_URL,
  GODWOKEN_API_URL,
  NETWORK_SUFFIX
};
console.debug("\n> tools/packages/tools/configs/devnet.env:", envfileJson);

// Stringify a javascript object to an envfile
fs.writeFileSync(path.resolve(__dirname, './devnet.env'), stringify(envfileJson));

try {
  updateLendingContractConfig();
} catch (error) {
  console.error("Failed to Update testcases/lending-contracts/config.json");
  console.error(error);
}

/**
 * Update testcases/lending-contracts/config.json
 */
function updateLendingContractConfig() {
  let lendingContractsConfigs = require('../../../../testcases/lending-contracts/config.json');
  lendingContractsConfigs.deployer = "0x6cd5e7be2f6504aa5ae7c0c04178d8f47b7cfc63b71d95d9e6282f5b090431bf";
  lendingContractsConfigs.nervos.rollup_type_hash = ROLLUP_TYPE_HASH;
  lendingContractsConfigs.nervos.rollup_type_script = {
    code_hash: configJson.chain.rollup_type_script.code_hash,
    hash_type: configJson.chain.rollup_type_script.hash_type,
    args: configJson.chain.rollup_type_script.args
  };
  lendingContractsConfigs.nervos.eth_account_lock_hash = ETH_ACCOUNT_LOCK_CODE_HASH;
  lendingContractsConfigs.nervos.deposit_lock_script_type_hash
    = configJson.genesis.rollup_config.deposit_script_type_hash;
  console.debug("\n> testcases/lending-contracts/config.json:",
    lendingContractsConfigs);
  fs.writeFileSync(
    path.resolve(__dirname, '../../../../testcases/lending-contracts/config.json'),
    JSON.stringify(lendingContractsConfigs, null, 2));
}