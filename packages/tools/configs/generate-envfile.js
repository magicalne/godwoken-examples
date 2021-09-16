// Usage: https://github.com/bevry/envfile#via-nodejs

// Include envfile
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
const DEPLOYER_PRIVATE_KEY = "bdb4474bdd46bf9897accc60c5eb945793e7a3d321bf3b70c30295ceb3433f28";
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
console.log(envfileJson);

// Stringify a javascript object to an envfile
fs.writeFileSync(path.resolve(__dirname, './devnet.env'), stringify(envfileJson));
