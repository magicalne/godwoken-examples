import * as lumosConfigManager from "@ckb-lumos/config-manager";

export const BETANET: lumosConfigManager.Config = lumosConfigManager.createConfig(
  {
    PREFIX: lumosConfigManager.predefined.AGGRON4.PREFIX,
    SCRIPTS: {
      ...lumosConfigManager.predefined.AGGRON4.SCRIPTS,

      rollup_type_script: {
        CODE_HASH:
          "0x3bda219a967978d2db0316e36f6d39aaa713e1740752283cf184c4c195eeb48a",
        HASH_TYPE: "type",
        // ARGS: "0x375e628d7780e7f00bee16a63bc583b5ceb1ed779a4b2b4ab3f64381376e83ce",
        TX_HASH:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        INDEX: "0x0",
        DEP_TYPE: "code",
      },

      eth_account_lock: {
        CODE_HASH:
          "0x685ae74d35fdbffe2ac08b46c428f89136fd3b10d170f1c0570ddd0b28199235",
        HASH_TYPE: "type",
        TX_HASH:
          "0x21da20f275af89ca7172cb1cd7fcb8676056e4212ba3782e8c77afebae57c6ed",
        INDEX: "0x0",
        DEP_TYPE: "code",
      },

      deposit_lock: {
        CODE_HASH:
          "0x517d68117edfbe5f6397288336c6181e7666d34fc99cc0678ca148b1e97fd64e",
        HASH_TYPE: "type",
        TX_HASH:
          "0x577a86b1885dee66e24f4df41e727a70176fd965ef19b80d2d16362656f616c1",
        INDEX: "0x0",
        DEP_TYPE: "code",
      },

      withdrawal_lock: {
        CODE_HASH:
          "0xaa1a9c892b8bc5c5277b31b99e6e147994daf7cbf160db87bd6b0eb0ea6ce0e6",
        HASH_TYPE: "type",
        TX_HASH:
          "0x309322839bd989c2f97f385dac774471c09643fe4f37ba9613e8dcc2e05bc539",
        INDEX: "0x0",
        DEP_TYPE: "code",
      },
    },
  }
);
