import * as lumosConfigManager from "@ckb-lumos/config-manager";

// https://github.com/cryptape/godwoken-internal/tree/79e4819543594912ca534e1741a8e49025a251c7/deployment-notes/betanet_v1.1
export const BETANET: lumosConfigManager.Config = lumosConfigManager.createConfig(
  {
    PREFIX: lumosConfigManager.predefined.AGGRON4.PREFIX,
    SCRIPTS: {
      ...lumosConfigManager.predefined.AGGRON4.SCRIPTS,

      eth_account_lock: {
        CODE_HASH:
          "0x07521d0aa8e66ef441ebc31204d86bb23fc83e9edc58c19dbb1b0ebe64336ec0",
        HASH_TYPE: "type",
        TX_HASH:
          "0x73ab4934fe0456d4bd38155c8522241f912717063840dd093004df9a8e22c339",
        INDEX: "0x0",
        DEP_TYPE: "code",
      },

      deposit_lock: {
        CODE_HASH:
          "0x50704b84ecb4c4b12b43c7acb260ddd69171c21b4c0ba15f3c469b7d143f6f18",
        HASH_TYPE: "type",
        TX_HASH:
          "0x5fcfff887e6d2a7bb23655722e8003aa1df7ab7ee4385fd3c7e6950f3fa91c81",
        INDEX: "0x0",
        DEP_TYPE: "code",
      },

      withdrawal_lock: {
        CODE_HASH:
          "0x06ae0706bb2d7997d66224741d3ec7c173dbb2854a6d2cf97088796b677269c6",
        HASH_TYPE: "type",
        TX_HASH:
          "0x59d88dd1c634727820b4f03e3d0e795b478a2180a8b96cf0c691c0d606ea4434",
        INDEX: "0x0",
        DEP_TYPE: "code",
      },
    },
  }
);

export const predefined = {
  BETANET,
};
