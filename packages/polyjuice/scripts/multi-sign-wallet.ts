import { AbiItems } from "@polyjuice-provider/base/lib/abi";
import { PolyjuiceConfig, PolyjuiceWallet } from "@polyjuice-provider/ethers";
import dotenv from "dotenv";
import {
  BigNumber, BigNumberish, CallOverrides, Contract, ContractFactory, Overrides, PopulatedTransaction, providers, Signer, utils as ethersUtils
} from "ethers";
import {
  initGwAccountIfNeeded,
  isGodwoken, networkSuffix, polyjuiceRPC, polyjuice_config as polyjuiceConfig, web3Rpc
} from "../common";
import MintableToken from "../contracts/MintableToken.sol/MintableToken.json";
import WalletSimple from "../contracts/WalletSimple.sol/WalletSimple.json";
import { TransactionSubmitter } from "../TransactionSubmitter";

dotenv.config();

const PolyjuiceWalletConfig: PolyjuiceConfig = {
  godwokerOption: {
    godwoken: {
      rollup_type_hash: process.env.ROLLUP_TYPE_HASH!,
      eth_account_lock: {
        code_hash: process.env.ETH_ACCOUNT_LOCK_CODE_HASH!,
        hash_type: "type",
      },
    },
  },
  web3RpcUrl: process.env.WEB3_RPC!,
  abiItems: WalletSimple.abi as AbiItems,
};

type TCallStatic = Contract["callStatic"];
type TransactionResponse = providers.TransactionResponse;

interface IWalletSimpleStaticMethods extends TCallStatic {
  getNextSequenceId(overrides?: CallOverrides): Promise<BigNumber>;
}

interface IWalletSimple extends Contract, IWalletSimpleStaticMethods {
  callStatic: IWalletSimpleStaticMethods;
  init(
    signers: [string, string, string],
    code_hash: string,
    overrides?: Overrides,
  ): Promise<TransactionResponse>;
  sendMultiSig(
    toAddress: string,
    value: BigNumberish,
    data: string,
    expireTime: number,
    sequenceId: string,
    signature: string,
    overrides?: Overrides,
  ): Promise<TransactionResponse>;
}

interface IPolyjuiceAddressStaticMethods extends TCallStatic {
  getPolyjuiceAddress(overrides?: CallOverrides): Promise<string>;
}

interface IPolyjuiceAddress extends Contract, IPolyjuiceAddressStaticMethods {
  callStatic: IPolyjuiceAddressStaticMethods;
}

interface IMintableTokenStaticMethods extends TCallStatic {
  balanceOf(account: string, overrides?: CallOverrides): Promise<BigNumber>;
}

interface IMintableToken extends Contract, IMintableTokenStaticMethods {
  callStatic: IMintableTokenStaticMethods;
  setMinter(
    minter: string,
    overrides?: Overrides,
  ): Promise<TransactionResponse>;
  mint(
    account: string,
    amount: BigNumberish,
    overrides?: Overrides,
  ): Promise<TransactionResponse>;
  populateTransaction: {
    mint(account: string, amount: BigNumberish): Promise<PopulatedTransaction>;
  };
}


const { SIGNER_PRIVATE_KEYS } = process.env;
if (SIGNER_PRIVATE_KEYS == null) {
  console.log("process.env.SIGNER_PRIVATE_KEYS is required");
  process.exit(1);
}
const signerPrivateKeys = SIGNER_PRIVATE_KEYS.split(",") as [string, string];
if (signerPrivateKeys.length !== 2) {
  console.log(
    "Invalid number of signers, required: 2, got:",
    signerPrivateKeys.length,
  );
  process.exit(1);
}

const [signerOne, signerTwo] = signerPrivateKeys.map(
  (signerPrivateKey) =>
    new PolyjuiceWallet(signerPrivateKey, PolyjuiceWalletConfig, web3Rpc),
);
const [signerOneAddress, signerTwoAddress] = [signerOne, signerTwo].map(
  (wallet) => wallet.address,
);

const txOverride = {
  gasPrice: isGodwoken ? 0 : undefined,
  gasLimit: isGodwoken ? 1_000_000 : undefined,
};

async function testMultiSignWallet(deployer: PolyjuiceWallet) {
  const deployerAddress = deployer.address;
  console.log("Deployer address", deployerAddress);
  await initGwAccountIfNeeded(deployerAddress);

  const transactionSubmitter = await TransactionSubmitter.newWithHistory(
    `cache/multi-sign-wallet${networkSuffix ? `-${networkSuffix}-${deployerAddress}` : ""}.json`,
  );

  let receipt = await transactionSubmitter.submitAndWait(
    `Deploy WalletSimple`,
    () => {
      const implementationFactory = new ContractFactory(
        WalletSimple.abi,
        WalletSimple.bytecode,
        deployer,
      );
      const tx = implementationFactory.getDeployTransaction();
      tx.gasPrice = txOverride.gasPrice;
      tx.gasLimit = txOverride.gasLimit;
      return deployer.sendTransaction(tx);
    },
  );
  const walletSimpleAddress = receipt.contractAddress;
  console.log(`    WalletSimple address:`, walletSimpleAddress);

  const walletSimple = new Contract(
    walletSimpleAddress,
    WalletSimple.abi,
    deployer,
  ) as IWalletSimple;

  const signerAddresses: [string, string, string] = [
    signerOneAddress,
    signerTwoAddress,
    deployerAddress,
  ];
  console.log("Signer addresses:", signerAddresses.join(", "));

  await transactionSubmitter.submitAndWait(`Init WalletSimple`, () => {
    return walletSimple.init(
      signerAddresses,
      process.env.ETH_ACCOUNT_LOCK_CODE_HASH!,
      txOverride,
    );
  });

  receipt = await transactionSubmitter.submitAndWait(
    `Deploy MintableToken`,
    () => {
      const implementationFactory = new ContractFactory(
        MintableToken.abi,
        MintableToken.bytecode,
        deployer,
      );
      const tx = implementationFactory.getDeployTransaction();
      tx.gasPrice = txOverride.gasPrice;
      tx.gasLimit = txOverride.gasLimit;
      return deployer.sendTransaction(tx);
    },
  );
  const mintableTokenAddress = receipt.contractAddress;
  console.log(`    MintableToken address:`, mintableTokenAddress);

  const mintableToken = new Contract(
    mintableTokenAddress,
    MintableToken.abi,
    deployer,
  ) as IMintableToken;

  await transactionSubmitter.submitAndWait(`Set WalletSimple as minter`, () => {
    return mintableToken.setMinter(walletSimpleAddress, txOverride);
  });

  console.log(
    "Balance before mint:",
    (await mintableToken.balanceOf(deployerAddress)).toString(),
  );

  await initGwAccountIfNeeded(signerTwoAddress);
  await transactionSubmitter.submitAndWait(
    `Mint 1006 using WalletSimple`,
    async () => {
      const walletSimpleForSignerTwo = new Contract(
        walletSimpleAddress,
        WalletSimple.abi,
        signerTwo,
      ) as IWalletSimple;

      const baseTx = await mintableToken.populateTransaction.mint(
        deployerAddress,
        "1006",
      );

      const sequenceId = await walletSimple.getNextSequenceId();

      console.log(`    Signing tx using signer one(${signerOneAddress})`);
      const signedTx = await generateSignedTx(
        sequenceId,
        baseTx,
        60,
        signerOne,
      );

      console.log(`    Executing tx using signer two(${signerTwoAddress})`);
      return walletSimpleForSignerTwo.sendMultiSig(
        signedTx.toAddress,
        signedTx.value.toString(),
        signedTx.data,
        signedTx.expireTime,
        signedTx.sequenceId,
        signedTx.signature,
        txOverride,
      );
    }, false,
  );

  console.log(
    "Balance after mint:",
    (await mintableToken.balanceOf(deployerAddress)).toString(),
  );
}

async function getSignature(
  signer: Signer,
  prefix: string,
  toAddress: string,
  value: string,
  data: string,
  expireTime: number,
  sequenceId: BigNumber,
): Promise<string> {
  console.log([prefix, toAddress, value, data, expireTime, sequenceId]);
  const operationHash = ethersUtils.solidityKeccak256(
    ["string", "address", "uint256", "bytes", "uint256", "uint256"],
    [prefix, toAddress, value, data, expireTime, sequenceId],
  );

  const signature = await signer.signMessage(
    ethersUtils.arrayify(operationHash),
  );

  // const packed_signature = deployer.godwoker.packSignature(origin_signature);

  // console.log(`origin_signature: ${origin_signature}, packed_signature: ${packed_signature}`);

  return signature;
}

interface ISignedContractInteractionTx {
  toAddress: string;
  value: string;
  data: string;
  expireTime: number;
  sequenceId: string;
  signature: string;
}

export async function generateSignedTx(
  sequenceId: BigNumber,
  baseTx: PopulatedTransaction,
  expireIn: number,
  signer: Signer,
): Promise<ISignedContractInteractionTx> {
  const expireTime = Date.now() + expireIn * 1000;

  const unsignedTx = {
    toAddress: baseTx.to!,
    value: baseTx.value || "0",
    data: baseTx.data!,
    expireTime,
    sequenceId,
  };

  const signature = await getSignature(
    signer,
    "ETHER",
    unsignedTx.toAddress,
    unsignedTx.value.toString(),
    unsignedTx.data,
    unsignedTx.expireTime,
    unsignedTx.sequenceId,
  );

  console.log(`signature: ${signature}`);
  console.log(`unsignedTx.data: ${unsignedTx.data}`);

  return {
    toAddress: unsignedTx.toAddress.toLowerCase(),
    value: unsignedTx.value.toString(),
    data: unsignedTx.data,
    expireTime,
    sequenceId: sequenceId.toString(),
    signature,
  };
}


let delay = 20;
[
  "1473ec0e7c507de1d5c734a997848a78ee4d30846986d6b1d22002a57ece74ba",
  "f5e9bac200a2eca0b0eead8a327ef3dc148ba10e192d07badad2d195f2488b94",
  "366cbc0fd979df1695613257128ad4a79ba4f11b3cd98048091a190466325581",
  "d50ef72f0e20ee495153f8b40c135c1675955c006ae75081ba4c824791e25a2a",
  "a443ed1e456f0f23bcdf4f302f599cf77530d594ad896e84b549a04b0ea40c10",
  "38c69fca69ac55c50dfae12dcd43c40017dca07050728a65638ddad1d9f8fa04",
  "2714b4c7cff48976537c27644c3d0ddda12ae880117860bbab94f839375a649f",
  "775c3f5274046f5759e7663ff36272333c87e823b312fca1df00d53b0c607f19",
  "66c8f88a0e0363b73106dcffaff896054749d9a7be24cdd17ecd7212635857e1",
  "481a8a358d7b83c6d7321a5845fef7c7e6f3446abc8bfe0e51d3ae5c36aadcc2",
  "41d239de35d8d25c7ac66b50f03ef24c821991bb3409f55035a0033b238689ed",
  "51f55f5a938504330ec567170d60deab291b744ba7e5c264cbfe8d8d35451e80",
  "e94e8aea22f05e69153fba872c242ec9864929ed14a46fa6a0c423c0bdbeb034",
  "41767eb58251891d71987874209cb23f7047710313e215585db34f1b8c5ef344",
  "6fd2c46e497cdbc85166a2d7bc3da2a4dceb0fa57944b2ad01504861bfe614ce",
  "0fd36b7d7124ee58b89a2c09067ca3fcdac398901bdfcafb442aafd51776199e",
  "33cfde51bd1946f405967eb7158d43ba2cfe72c596c4eae9bb566739ad2c4e39",
  "d328f35ca8c46ac4628184c31c4d43bb02ed1cadd4e33a9c6214f51ef2c6b0b1",
  "5e6ab6b72b5b436ba36bfc3d410f863e9ac9bcb728d88f054b10ea1825c3b5d7",
  "fd3b6c8b07ed130b78f924523189db5bfebb3cb42f212ec0db9af7e39c21649b",
].forEach(privKey => {
  // TODO: wait 10ms
  let polyWallet = new PolyjuiceWallet(privKey, polyjuiceConfig, polyjuiceRPC);
  testMultiSignWallet(polyWallet)
    .catch(err => {
      console.error(err);
      console.error(polyWallet.address, "failed, will try again.");
      setTimeout(() => {
        testMultiSignWallet(polyWallet).catch(console.error);
      }, delay * 20);
      delay += 20;
    });
});
