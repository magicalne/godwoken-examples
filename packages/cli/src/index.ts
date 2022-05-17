import { Command } from "commander";
import * as lumosConfigManager from "@ckb-lumos/config-manager";
import puppeteer from "puppeteer";
import * as config from "./config";
import { Cell, CellDep, Hash, Script, Transaction } from "@ckb-lumos/lumos";
import { CkbUser, EthUser } from "./user";
import {
  buildDepositCellDeps,
  buildDepositOutputCell,
} from "./functional/deposit";
import { buildL1SecpTransaction } from "./util/l1-transaction";
import { ckbIndexer, ckbRpc, godwokenWeb3, SECP256K1PrivateKey } from "./alias";
import {
  waitL1TxCommitted,
  waitL2Deposit,
  waitL2Withdrawal,
  buildChangeOutputCell,
  collectInputCells,
  sumCkbCapacity,
  sumSudtAmount,
  asyncSleep,
} from "./util";
import {
  L1_FEE,
  MINIMAL_DEPOSIT_CAPACITY,
  MINIMAL_WITHDRAWAL_CAPACITY,
} from "./constant";
import { initializeConfig } from "./config";
import { WithdrawalRequestExtra } from "./schema";
import { buildWithdrawalRequest } from "./functional/withdraw";
import { HexString } from "@ckb-lumos/base";
import keccak256 from "keccak256";
import { faucet } from "./functional/faucet";
import { collectFinalizedWithdrawals } from "./functional/unlock";
import { TransactionSkeletonType } from "@ckb-lumos/helpers";

function getCapacity(ckbCapacity: string): bigint {
  return BigInt(ckbCapacity);
}

function getSudtAmount(sudtAmount?: string): bigint {
  return sudtAmount == null ? BigInt(0) : BigInt(sudtAmount);
}

function getSudtScript(sudtScriptArgs: string): Script {
  if (!sudtScriptArgs!.startsWith("0x")) {
    throw new Error("Invalid --sudt-script-args, expected 0x-prefix string");
  }
  return {
    code_hash: config.getScriptConfig("SUDT").CODE_HASH,
    hash_type: config.getScriptConfig("SUDT").HASH_TYPE,
    args: sudtScriptArgs!,
  };
}

function newCkbUser(privateKey: string): CkbUser {
  if (!privateKey!.startsWith("0x")) {
    throw new Error("Invalid --private-key, expected 0x-prefix string");
  }
  return new CkbUser(privateKey);
}

function newEthUser(privateKey: string, ethAddress?: string): EthUser {
  if (ethAddress == null) {
    return new EthUser(EthUser.privateKeyToEthAddress(privateKey), privateKey);
  } else {
    return new EthUser(ethAddress);
  }
}

function newDerivedCkbUsers(
  initPrivKey: HexString,
  nDerivedAccounts: number
): CkbUser[] {
  let privkeys: SECP256K1PrivateKey[] = [initPrivKey];
  for (let i = 0; i < nDerivedAccounts; i++) {
    const newKey =
      "0x" + keccak256(privkeys[privkeys.length - 1]).toString("hex");
    privkeys.push(newKey);
  }
  return privkeys.slice(1).map((privkey) => new CkbUser(privkey));
}

function newDerivedEthUsers(
  initPrivKey: HexString,
  nDerivedAccounts: number
): EthUser[] {
  let privkeys: SECP256K1PrivateKey[] = [initPrivKey];
  for (let i = 0; i < nDerivedAccounts; i++) {
    const newKey =
      "0x" + keccak256(privkeys[privkeys.length - 1]).toString("hex");
    privkeys.push(newKey);
  }
  return privkeys
    .slice(1)
    .map(
      (privkey) => new EthUser(EthUser.privateKeyToEthAddress(privkey), privkey)
    );
}

async function buildDepositL1Transaction(
  ckbUser: CkbUser,
  outputs: Cell[],
  cellDeps: CellDep[],
  sudtScript?: Script,
  ckbIndexerSkipParam?: number
): Promise<Transaction> {
  const sumOutputsCapacity = sumCkbCapacity(outputs);
  const sumOutputsSudtAmount =
    sudtScript == null ? BigInt(0) : sumSudtAmount(outputs, sudtScript!);
  const inputs = await collectInputCells(
    ckbUser,
    sumOutputsCapacity,
    sumOutputsSudtAmount,
    sudtScript,
    ckbIndexerSkipParam
  );
  const changeOutput = buildChangeOutputCell(
    ckbUser,
    inputs,
    outputs,
    sudtScript
  );
  return buildL1SecpTransaction(
    ckbUser,
    inputs,
    [...outputs, changeOutput],
    cellDeps
  );
}

async function sendL1Transaction(
  tx: Transaction,
  retries: number = 0
): Promise<Hash> {
  try {
    return await ckbRpc.send_transaction(tx, "passthrough");
  } catch (err) {
    console.info(
      `[DEBUG] [sendL1Transaction] error: ${err}`
    );
    if (retries === 30) {
      console.error(`[sendL1Transaction] throw error ${err}`);
      throw err;
    }

    await asyncSleep(3000);
    return await sendL1Transaction(tx, retries + 1);
  }
}

async function sendL1TransactionAndWaitConfirmation(
  tx: Transaction,
  retries: number = 0
): Promise<Hash> {
  try {
    const txHash = await ckbRpc.send_transaction(tx, "passthrough");
    await waitL1TxCommitted(txHash);
    return txHash;
  } catch (err) {
    console.info(
      `[DEBUG] [sendL1TransactionAndWaitConfirmation] error: ${err}`
    );
    if (retries === 300) {
      console.error(`[sendL1TransactionAndWaitConfirmation] throw error ${err}`);
      throw err;
    }

    await asyncSleep(1000);
    return await sendL1TransactionAndWaitConfirmation(tx, retries + 1);
  }
}

async function tryWithdraw(
  ckbUser: CkbUser,
  ethUser: EthUser,
  fee: bigint,
  ckbCapacity: bigint,
  sudtAmount: bigint,
  sudtScript?: Script,
  retries: number = 0
): Promise<Hash> {
  const nonce = await godwokenWeb3.getNonce(ethUser.ethAddress());
  const chainId = await godwokenWeb3.getChainId();
  const withdrawalRequest = buildWithdrawalRequest(
    ckbUser,
    ethUser,
    nonce,
    chainId,
    ckbCapacity,
    fee,
    sudtAmount,
    sudtScript
  );
  const withdrawalRequestExtra: WithdrawalRequestExtra = {
    request: withdrawalRequest,
    owner_lock: ckbUser.l1LockScript(),
  };
  try {
    return await godwokenWeb3.submitWithdrawalRequest(withdrawalRequestExtra);
  } catch (err) {
    if (retries === 10) {
      throw err;
    } else {
      await asyncSleep(5000);
      return tryWithdraw(
        ckbUser,
        ethUser,
        fee,
        ckbCapacity,
        sudtAmount,
        sudtScript,
        retries + 1
      );
    }
  }
}

const program = new Command().version(require("./../package.json").version);

program
  .command("get-balance")
  .option("-l, --eth-address <ADDRESS>", "ETH address")
  .option("-p, --private-key <PRIVATEKEY>", "private key")
  .option("-s --sudt-script-args <SUDTSCRIPTARGS>", "SUDT script args")
  .action(async (program: Command) => {
    let ethAddress = program.ethAddress;
    if (ethAddress == null) {
      if (program.privateKey == null) {
        throw new Error(
          "require one of --eth-address and --private-key parameter"
        );
      } else {
        ethAddress = EthUser.privateKeyToEthAddress(program.privateKey);
      }
    }

    const sudtScriptArgs = program.sudtScriptArgs;
    if (sudtScriptArgs == null) {
      const balance = await godwokenWeb3.getBalance(ethAddress);
      console.log(`"${ethAddress}" has balance ${balance}`);
    } else {
      const sudtScript = getSudtScript(sudtScriptArgs!);
      const amount = await godwokenWeb3.getSudtBalance(ethAddress, sudtScript);
      console.log(
        `"${ethAddress}" has balance ${amount} of SUDT ${sudtScriptArgs}`
      );
    }
  });

program
  .command("deposit")
  .requiredOption("-p, --private-key <PRIVATEKEY>", "private key")
  .requiredOption(
    "-c --capacity <CAPACITY>",
    "depositing CKB capacity in shannons"
  )
  .requiredOption("--lumos-config <FILEPATH>", "scripts config file")
  .option(
    "-l, --eth-address <ADDRESS>",
    "ETH address (using --private-key corresponding ETH address if not provided)"
  )
  .option("-m --sudt-amount <AMOUNT>", "depositing SUDT amount, default is 0")
  .option(
    "-s --sudt-script-args <SUDTSCRIPTARGS>",
    "depositing SUDT script args"
  )
  .action(async (program: Command) => {
    // deposit
    await initializeConfig(program.lumosConfig);
    const ckbCapacity = getCapacity(program.capacity);
    const sudtAmount = getSudtAmount(program.sudtAmount);
    const sudtScript =
      sudtAmount === BigInt(0)
        ? undefined
        : getSudtScript(program.sudtScriptArgs!);
    const ckbUser = newCkbUser(program.privateKey);
    const ethUser = newEthUser(program.privateKey, program.ethAddress);
    console.log(`CkbAddress: "${ckbUser.ckbAddress()}"`);
    console.log(`CkbLockArgs: "${ckbUser.ckbSecpLockArgs()}"`);
    console.log(`EthAddress: "${ethUser.ethAddress()}"`);

    if (ckbCapacity < MINIMAL_DEPOSIT_CAPACITY) {
      throw new Error(
        `Invalid --capacity, expected greater than or equal to ${MINIMAL_DEPOSIT_CAPACITY}`
      );
    }

    const output = buildDepositOutputCell(
      ckbUser,
      ethUser,
      ckbCapacity,
      sudtAmount,
      sudtScript
    );
    const cellDeps = buildDepositCellDeps(sudtAmount > BigInt(0));
    const tx = await buildDepositL1Transaction(
      ckbUser,
      [output],
      cellDeps,
      sudtScript,
      0
    );
    const txHash = await sendL1Transaction(tx);
    await waitL1TxCommitted(txHash);
    await waitL2Deposit(ethUser.ethAddress());
  });

program
  .command("withdraw")
  .requiredOption("-p, --private-key <PRIVATEKEY>", "private key")
  .requiredOption("--lumos-config <FILEPATH>", "scripts config file")
  .requiredOption("--fee <CAPACITY>", "withdrawal fee in shannons")
  .option("-c --capacity <CAPACITY>", "withdrawal CKB capacity in shannons")
  .option("-m --sudt-amount <AMOUNT>", "withdrawal SUDT amount, default is 0")
  .option(
    "-s --sudt-script-args <SUDTSCRIPTARGS>",
    "withdrawal SUDT script args"
  )
  .action(async (program: Command) => {
    await initializeConfig(program.lumosConfig);
    const sudtAmount = getSudtAmount(program.sudtAmount);
    const sudtScript =
      sudtAmount === BigInt(0)
        ? undefined
        : getSudtScript(program.sudtScriptArgs!);
    const fee: bigint = BigInt(program.fee);
    const ckbUser = newCkbUser(program.privateKey); // I don't want to support specifying CKB address ~
    const ethUser = newEthUser(program.privateKey);
    console.log(`CkbAddress: "${ckbUser.ckbAddress()}"`);
    console.log(`CkbLockArgs: "${ckbUser.ckbSecpLockArgs()}"`);
    console.log(`EthAddress: "${ethUser.ethAddress()}"`);

    const initBalance = await godwokenWeb3.getBalance(ethUser.ethAddress());
    const ckbCapacity = program.capacity
      ? getCapacity(program.capacity!)
      : initBalance / BigInt(10) ** BigInt(10);
    console.log(
      `TryWithdraw ${ethUser.ethAddress()} ${ckbCapacity} capacity(aka value ${
        ckbCapacity * BigInt(10) ** BigInt(10)
      }), initBalance: ${await godwokenWeb3.getBalance(ethUser.ethAddress())}`
    );
    if (ckbCapacity < MINIMAL_WITHDRAWAL_CAPACITY) {
      throw new Error(
        `Withdraw capacity ${ckbCapacity}shannon is less than MINIMAL_WITHDRAWAL_CAPACITY(${MINIMAL_WITHDRAWAL_CAPACITY}shannon)`
      );
    }
    const withdrawalHash = await tryWithdraw(
      ckbUser,
      ethUser,
      fee,
      ckbCapacity,
      sudtAmount,
      sudtScript
    );
    await waitL2Withdrawal(withdrawalHash);
  });

program
  .command("batch-deposit")
  .requiredOption("-p, --private-key <PRIVATEKEY>", "private key")
  .requiredOption(
    "-c --capacity <CAPACITY>",
    `depositing CKB capacity in shannons`
  )
  .requiredOption("--lumos-config <FILEPATH>", "scripts config file")
  .option(
    "--n-derived-accounts <NUMBER>",
    "the number of accounts to derived by the provided private key, default is 1000"
  )
  .option("--seconds <SECONDS>", "running time in seconds, default is 600")
  .option(
    "--batch-size <NUMBER>",
    "the batch size of deposit requests, default is 10"
  )
  .option("-m --sudt-amount <AMOUNT>", "depositing SUDT amount, default is 0")
  .option(
    "-s --sudt-script-args <SUDTSCRIPTARGS>",
    "depositing SUDT script args"
  )
  .action(async (program: Command) => {
    // batch-deposit
    await initializeConfig(program.lumosConfig);
    const ckbCapacity = getCapacity(program.capacity);
    const sudtAmount = getSudtAmount(program.sudtAmount);
    const sudtScript =
      sudtAmount === BigInt(0)
        ? undefined
        : getSudtScript(program.sudtScriptArgs!);
    const nDerivedAccounts =
      program.nDerivedAccounts == null ? 100 : Number(program.nDerivedAccounts);
    const ckbUser = newCkbUser(program.privateKey);
    const allEthUsers = newDerivedEthUsers(
      program.privateKey,
      nDerivedAccounts
    );
    console.log(`CkbAddress: "${ckbUser.ckbAddress()}"`);
    console.log(`CkbLockArgs: "${ckbUser.ckbSecpLockArgs()}"`);
    console.log(
      `EthAddresses: ${JSON.stringify(
        allEthUsers.map((ethUser) => ethUser.ethAddress()),
        null,
        2
      )}`
    );

    const batchSize: number = program.batchSize ? +program.batchSize : 10;
    const cellDeps = buildDepositCellDeps(sudtScript != null);
    const allOutputs = allEthUsers.map((ethUser) =>
      buildDepositOutputCell(
        ckbUser,
        ethUser,
        ckbCapacity,
        sudtAmount,
        sudtScript
      )
    );

    console.info("### Collect inputs and construct transactions");
    let skip = 0;
    let txs: Transaction[] = [];
    for (let start = 0; start < allOutputs.length; start += batchSize) {
      const outputs = allOutputs.slice(start, start + batchSize);
      const tx = await buildDepositL1Transaction(
        ckbUser,
        outputs,
        cellDeps,
        sudtScript,
        skip
      );
      txs.push(tx);
      skip += tx.inputs.length;
      console.info(
        `Collected ${tx.inputs.length} inputs, ${sumCkbCapacity(
          outputs
        )} total output capacity, already ${start + batchSize}/${
          allOutputs.length
        } outputs`
      );
    }

    console.info("### Collect accounts' init balances");
    let initBalances: bigint[] = [];
    for (let i = 0; i < allOutputs.length; i++) {
      const balance = await godwokenWeb3.getBalance(
        allEthUsers[i].ethAddress()
      );
      initBalances.push(balance);
    }

    console.info("### Send layer1 transactions");
    let hashes = [];
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      const txHash = await sendL1Transaction(tx);
      hashes.push(txHash);
      console.info(
        `Sent ${i + 1}/${txs.length} layer-1 transaction, hash: ${txHash}`
      );
    }

    console.info("### Wait layer1 transactions confirmation");
    for (const txHash of hashes) {
        await waitL1TxCommitted(txHash);
    }

    console.info("### Wait layer2 deposit successfully");
    for (let i = 0; i < allOutputs.length; i += 1) {
      await waitL2Deposit(allEthUsers[i].ethAddress(), initBalances[i]);
      const balance = await godwokenWeb3.getBalance(
        allEthUsers[i].ethAddress()
      );
      console.info(
        `Successfully batch-deposit accumulated ${
          i + 1
        } accounts, ${allEthUsers[i].ethAddress()} have balance ${balance}`
      );
    }
  });

program
  .command("batch-withdraw")
  .requiredOption("-p, --private-key <PRIVATEKEY>", "private key")
  .requiredOption("--lumos-config <FILEPATH>", "scripts config file")
  .option(
    "-c --capacity <CAPACITY>",
    "withdrawal CKB capacity in shannons, default is all balance"
  )
  .option("--seconds <SECONDS>", "running time in seconds, default is 600")
  .option(
    "--n-derived-accounts <NUMBER>",
    "the number of accounts to derived by the provided private key, default is 1000"
  )
  .requiredOption("--fee <CAPACITY>", "withdrawal fee in shannons")
  .option("-m --sudt-amount <AMOUNT>", "withdrawal SUDT amount, default is 0")
  .option(
    "-s --sudt-script-args <SUDTSCRIPTARGS>",
    "withdrawal SUDT script args"
  )
  .action(async (program: Command) => {
    // batch-withdraw
    await initializeConfig(program.lumosConfig);
    const sudtAmount = getSudtAmount(program.sudtAmount);
    const sudtScript =
      sudtAmount === BigInt(0)
        ? undefined
        : getSudtScript(program.sudtScriptArgs!);
    const fee: bigint = BigInt(program.fee);
    const nDerivedAccounts =
      program.nDerivedAccounts == null ? 100 : Number(program.nDerivedAccounts);
    const ckbUser = newCkbUser(program.privateKey); // I don't want to support specifying CKB address ~
    const allEthUsers = newDerivedEthUsers(
      program.privateKey,
      nDerivedAccounts
    );
    console.log(`CkbAddress: "${ckbUser.ckbAddress()}"`);
    console.log(`CkbLockArgs: "${ckbUser.ckbSecpLockArgs()}"`);
    console.log(
      `EthAddresses: "${JSON.stringify(
        allEthUsers.map((ethUser) => ethUser.ethAddress()),
        null,
        2
      )}"`
    );

    let hashes: Hash[] = [];
    for (const ethUser of allEthUsers) {
      const initBalance = await godwokenWeb3.getBalance(ethUser.ethAddress());
      const ckbCapacity = program.capacity
        ? getCapacity(program.capacity!)
        : initBalance / BigInt(10) ** BigInt(10);
      if (ckbCapacity < MINIMAL_WITHDRAWAL_CAPACITY) {
        console.error(
          `skip, withdraw capacity ${ckbCapacity}shannon is less than MINIMAL_WITHDRAWAL_CAPACITY(${MINIMAL_WITHDRAWAL_CAPACITY}shannon)`
        );
        continue;
      }
      const hash = await tryWithdraw(
        ckbUser,
        ethUser,
        fee,
        ckbCapacity,
        sudtAmount,
        sudtScript
      );
      console.log(
        `TryWithdraw ${ethUser.ethAddress()} ${ckbCapacity} capacity(aka value ${
          ckbCapacity * BigInt(10) ** BigInt(10)
        }), initBalance: ${await godwokenWeb3.getBalance(
          ethUser.ethAddress()
        )}, withdrawal hash: ${hash}`
      );
      hashes.push(hash);
    }
    for (const hash of hashes) {
      await waitL2Withdrawal(hash, 10 * 2000 * 1000);
    }
  });

program
  .command("watch-withdrawal")
  .requiredOption("--lumos-config <FILEPATH>", "scripts config file")
  .action(async (program: Command) => {
    await initializeConfig(program.lumosConfig);
    while (true) {
      try {
        const _withdrawals = await collectFinalizedWithdrawals();
      } catch (err) {
        console.error("Catch error: ", err);
      }
      await asyncSleep(10 * 1000);
    }
  });

program
  .command("faucet")
  .requiredOption("-p, --private-key <PRIVATEKEY>", "private key")
  .action(async (program: Command) => {
    lumosConfigManager.initializeConfig(lumosConfigManager.predefined.AGGRON4);

    if (
      process.env.CKB_RPC_URL === "http://127.0.0.1:8114" ||
      process.env.CKB_INDEXER_URL === "http://127.0.0.1:8116"
    ) {
      throw new Error("Are you sure that you are using AGGRON network???");
    }

    const browser = await puppeteer.launch({ headless: true });
    const admin = new CkbUser(program.privateKey);
    const nDerivedAccounts = 10;
    const ckbUsers = newDerivedCkbUsers(
      Date.now().toString(),
      nDerivedAccounts
    );
    console.log(
      "CkbAddresses:",
      JSON.stringify(
        ckbUsers.map((ckbUser) => ckbUser.ckbAddress()),
        null,
        2
      )
    );
    for (const ckbUser of ckbUsers) {
      const _claimed = await faucet(browser, ckbUser);
    }

    const ckbTipNumber = BigInt(await ckbRpc.get_tip_block_number());
    console.log("Wait chain grow, current CKB tip number is", ckbTipNumber);
    while (true) {
      await asyncSleep(1000);
      if (
        BigInt(
          await ckbRpc.get_tip_block_number().catch((_) => {
            return ckbTipNumber;
          })
        ) >=
        ckbTipNumber + BigInt(5)
      ) {
        break;
      }
    }

    console.log(
      `Try to transfer all ${ckbUsers.length} accounts' capacities to --private-key`
    );
    for (const ckbUser of ckbUsers) {
      const collector = ckbIndexer.collector({
        lock: ckbUser.l1LockScript(),
        type: "empty",
        data: "0x",
      });
      let hashes: Hash[] = [];
      for await (const input of collector.collect()) {
        const output: Cell = {
          data: "0x",
          cell_output: {
            capacity:
              "0x" + (BigInt(input.cell_output.capacity) - L1_FEE).toString(16),
            lock: admin.l1LockScript(),
            type: undefined,
          },
        };
        const tx = buildL1SecpTransaction(
          ckbUser,
          [input],
          [output],
          [config.getCellDep("SECP256K1_BLAKE160")]
        );
        try {
          const hash = await ckbRpc.send_transaction(tx, "passthrough");
          console.info(`faucet send transaction ${hash}`);
          hashes.push(hash);
        } catch (err) {
          console.error(`faucet send transaction, error: ${err}`);
        }
      }
      for (const hash of hashes) {
        await waitL1TxCommitted(hash);
      }
    }

    await browser.close();
  });

program.parse(program.argv);
