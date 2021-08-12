import { PolyjuiceWallet } from "@polyjuice-provider/ethers";
import {
  BigNumber, BigNumberish, CallOverrides, Contract, ContractFactory, Overrides, PopulatedTransaction, providers, Signer, utils as ethersUtils
} from "ethers";
import {
  depositFromL1toL2, PolyjuiceWalletConfig,
  initGwAccountIfNeeded,
  isGodwoken, networkSuffix, polyjuiceRPC, web3Rpc
} from "../common";
import MintableToken from "../contracts/MintableToken.sol/MintableToken.json";
import WalletSimple from "../contracts/WalletSimple.sol/WalletSimple.json";
import { TransactionSubmitter } from "../TransactionSubmitter";

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
  nonce: 0
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
      tx.nonce = ++txOverride.nonce;
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

  ++txOverride.nonce;
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
      tx.nonce = ++txOverride.nonce;
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

  ++txOverride.nonce;
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
      ++txOverride.nonce;
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


let delay = 60;
[
  // "1473ec0e7c507de1d5c734a997848a78ee4d30846986d6b1d22002a57ece74ba",
  // "f5e9bac200a2eca0b0eead8a327ef3dc148ba10e192d07badad2d195f2488b94",
  // "366cbc0fd979df1695613257128ad4a79ba4f11b3cd98048091a190466325581",
  // "d50ef72f0e20ee495153f8b40c135c1675955c006ae75081ba4c824791e25a2a",
  // "a443ed1e456f0f23bcdf4f302f599cf77530d594ad896e84b549a04b0ea40c10",
  // "38c69fca69ac55c50dfae12dcd43c40017dca07050728a65638ddad1d9f8fa04",
  // "2714b4c7cff48976537c27644c3d0ddda12ae880117860bbab94f839375a649f",
  // "775c3f5274046f5759e7663ff36272333c87e823b312fca1df00d53b0c607f19",
  // "66c8f88a0e0363b73106dcffaff896054749d9a7be24cdd17ecd7212635857e1",
  // "481a8a358d7b83c6d7321a5845fef7c7e6f3446abc8bfe0e51d3ae5c36aadcc2",
  // "41d239de35d8d25c7ac66b50f03ef24c821991bb3409f55035a0033b238689ed",
  // "51f55f5a938504330ec567170d60deab291b744ba7e5c264cbfe8d8d35451e80",
  // "e94e8aea22f05e69153fba872c242ec9864929ed14a46fa6a0c423c0bdbeb034",
  // "41767eb58251891d71987874209cb23f7047710313e215585db34f1b8c5ef344",
  // "6fd2c46e497cdbc85166a2d7bc3da2a4dceb0fa57944b2ad01504861bfe614ce",
  // "0fd36b7d7124ee58b89a2c09067ca3fcdac398901bdfcafb442aafd51776199e",
  // "33cfde51bd1946f405967eb7158d43ba2cfe72c596c4eae9bb566739ad2c4e39",
  // "d328f35ca8c46ac4628184c31c4d43bb02ed1cadd4e33a9c6214f51ef2c6b0b1",
  // "5e6ab6b72b5b436ba36bfc3d410f863e9ac9bcb728d88f054b10ea1825c3b5d7",
  // "fd3b6c8b07ed130b78f924523189db5bfebb3cb42f212ec0db9af7e39c21649b",

  // 20
  // "1390c30e5d5867ee7246619173b5922d3b04009cab9e9d91e14506231281a997",
  // "2dc6374a2238e414e51874f514b0fa871f8ce0eb1e7ecaa0aed229312ffc91b0",
  // "15f0805f5ebabda961cca1e97cdae03919b07d3eee4a9074c075ee2e80f2da9f",
  // "a786cd647b24acbdc8ca46757dff3a930744179b6e20d9d8813c9430f954bd73",
  // "21c3849c1d6d150f50806e773458df00c4501118e38f777b4110d50f38d91bfd",
  // "1bd5d82ce33bfeb5824a919127f3f95c50314c1ca72c1fb7c370f3c79ecbe8e6",
  // "acc5997a76ee194e4406b5e4e020efd6ca53dc3276c3d43753d55e936335c25d",
  // "e2b0be6ffdba34a9d1e906f3a83ad24440ea22673b709306b1bc3b51030f79f3",
  // "65d50620ad7f08ef4da10e9992062626daddc3b68907012ece845e9bbc8c14ff",
  // "d1017ca5b9f0242818a33acd18911caadab84c8c92331eb2ecd2b44895e1d099",
  // "991494a67bcfa4c30807f5a1426eaad2b79845672913c259da16926711328ae9",
  // "7f52aecd6e71e2ca3c6dd4b2b82212767598006aee0718f140a8bd0647d2832c",
  // "3826f69f59026faca8aa97f40cd512597b8801ebc40a88db19216d1742fdf4e7",
  // "6edf8a51e2abb4543cacaa57aee366c95d25c8cffe4b41b0a7431d902c81080b",
  // "dc181bbbc3d89ffad393e556949b56e2b44d2d4050d931262b559ef08e5eaf41",
  // "b9a9aafa95299e1d149aca1f002e20a697846889c6540cd37a99193cdc3e742a",
  // "2adc9f91e9686c0838c990e0ad9893ba32fdffa33341eb295cef3b1b0027d8c8",
  // "f59c5e9cfe8ed57a4cda42046fa78fdb016002a651eae27bad65b4ade81dad51",
  // "68777010f63b24b117f7bb28848b9c841d341b3f02b632ae2f6cdf59c6cd575e",
  // "d5ffdf1c0c22c29ac05e7fd15113c47d23c59e671032a4a91f88e989c45aa9a5",

  // 20
  // "423bcbaf313bba759f32860277338eceebfae3fd1f424c9920d0e396f6d08139",
  // "4f05777a56806bda4d6869ceb05ba77992a818839b04131d04cded4f7a545c70",
  // "63a83772e6e06289355fc49179a3b9af7c74a43c679d28430caf31fe6a329cc4",
  // "f9eba38eacf61f3d19a75c3777ddac5fe5e6d6a88ebba84b2cff83a33bbe336d",
  // "6ce28df6f9d6133c84a5eb61585fe7b4a9290cbdcc7ae8aa4552743220e1ffc4",
  // "83eadd19be6bcc45491b2cfa9b8165a8c3a88db6b9aa3e21c71da3a8a4297122",
  // "44d53f416499786cf9c97c5785420672c1bfe83f5813c3120a9da5bb82eea4e6",
  // "36137042101a97767c1b10ce6116e9e281867180628df6477ce0d16ad086a05e",
  // "f44ee8a762e57f11cc016a84ef310a99570a0034ce9cd362dcf998ba6e9f3322",
  // "80993eea293b3403b5ba1fbf5b2ee5a16415af1fce92de838b48c065a5f21480",
  // "f2d474fbf5ba475051974981c8d47af2c882b44b134608bd36397c57ea944797",
  // "b4d053c3e22ac36792504bff325dc225ba15f9c7dace139710008d41b526fb7f",
  // "c27a8b82c7ea9b39ba736cd5e22e7a0b0fc82a5e67cbda8c2187a847d3c8a364",
  // "c6622bf4ff5ecce0e8c57742a9ea596226a4c9f78ff516e3797c9bc6c6b95e29",
  // "72a37607ce365b953382c1ea05ea0712e9b88fd3d77a72e8468f7994d46eac02",
  // "79487e2a3785d94fe6f24f3541ac41f8ae8d5710bd14bd78394dfd135225d79b",
  // "2b296d33e656a6c9367f94301c6781a1401ce20d8cb02722bff676617ffb8dac",
  // "f08f514aa63d99c2aca190b8eaa181cd6783f2b7b229fc7cacb4ca2c4438f5e5",
  // "459dbf4bed9a5698901fcdbb385afb6ead57efa28ca214d96552688e7b7d6a90",
  // "493f323254166759df26aeb7d9c09b580d87cf12339cb45c1a6c9405e223a805",

  // 20
  // "b66d31cb8d1490f9517e7471be480857d8d5b0b8a6e667a02ffa792e82928daf",
  // "bd76398458cde6292427ec0db469b3a5860bd8685b3fa96c0b7b59c7dbc1e57e",
  // "b027d7c1091c54b3d473ad1f4261814e4619e3de8de47d07c85d84f1b68907ed",
  // "b77f3f3edc8152dbc4df1ac3925c31fc309973404d0218d2da168aaa1c6d0073",
  // "3d4e207533110f034cb90472637cffc6037312a859978c499ff8ae055d273845",
  // "cf144a989c711b28d0ec0c735ca3092acf03df3b58bc718698ecd836b57c5968",
  // "e515a1f6c356ecc1702524ad567df9c020e4c02f16c870fcaa8334bc1f7f56e5",
  // "418286b7021fb191b15e9d963fb83d55e7f24e796bee2e2eff340c6b135c1be9",
  // "b8b52a5c6d79b7af3cdd44eaba34821f27f5b08ef7d8296757bcf68c97f6761c",
  // "4d2f0c443e26798b88547af021265ef16f51f8a709c71512797256def49cfc88",
  // "406cefdac85d440a4b289051fb899d2501669eceb798022d90a3d6e7debd0e67",
  // "48ea4a2d7d375e0e796b4fdc58c83f513d6e654a4cc1d7c47eb6ab6f7495788a",
  // "1fbbb89185b44ee6293d0e6a69d705c0cbc1a31515f3c310f003e320c67a6f8f",
  // "84388dca5161014f5af2cb1548e12d0b3cd440ba9ddbc741445b5505aeee7faa",
  // "ae30fa0b1eb0910ba3b446b6cb1aa6a0dc3842404cfa57556b50da6f21b28581",
  // "8ce913701ddf7da2b97a9241eceac1d4610effc93b416dfaf8021784a5440257",
  // "4eb74d85f7af7bad824e8cd281ad51d934997f82fde184ee8540c53d845eee2a",
  // "d97c287fb441f6b1235494535fcd876f362a6b956fe8e7d56866842f0906fc59",
  "9b97552a1745e43d890655c615a1c41242485351c8242708890ec6ab72c18404",
  "60d9b26c641569911a95bb18521ba148b6ac64025e4a11dd0c0649392fbc1c10",

].forEach(async (privKey, idx) => {
  // TODO: wait 10ms

  let polyWallet = new PolyjuiceWallet(privKey, PolyjuiceWalletConfig, polyjuiceRPC);
  console.time(`${polyWallet.address} deposit`);
  await depositFromL1toL2(polyWallet, 399n);
  console.timeEnd(`${polyWallet.address} deposit`);

  testMultiSignWallet(polyWallet)
    .catch(err => {
      console.error(err);
      console.error(polyWallet.address, "failed, will try again.");
      setTimeout(() => {
        testMultiSignWallet(polyWallet).catch(console.error);
      }, delay * 1000);
      delay += 60;
    });
});
