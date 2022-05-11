import { Cell, Hash, Script, utils } from "@ckb-lumos/lumos";
import { ckbIndexer, ckbRpc, EthAddress, godwokenWeb3 } from "../alias";
import { CkbUser } from "../user";
import { FEE, MINIMAL_CKB_CELL_CAPACITY } from "../constant";
import { computeScriptHash, toBigUInt128LE } from "@ckb-lumos/base/lib/utils";
import * as config from "../config";

export function sumCkbCapacity(cells: Cell[]): bigint {
  return cells.reduce(
    (acc, cell) => (acc += BigInt(cell.cell_output.capacity)),
    BigInt(0)
  );
}

export function sumSudtAmount(cells: Cell[], sudtScript: Script): bigint {
  const amount = cells.reduce((acc, cell) => {
    if (cell.cell_output.type == null) {
      return acc;
    } else {
      const amount =
        computeScriptHash(cell.cell_output.type) ===
        computeScriptHash(sudtScript)
          ? acc + utils.readBigUInt128LE(cell.data)
          : BigInt(0);
      return acc + amount;
    }
  }, BigInt(0));
  return amount;
}

export async function waitL1TxCommitted(
  txHash: Hash,
  timeoutMs: number = 1000 * 120
): Promise<void> {
  const startTime = new Date().getTime();
  let lastStatus: string | undefined = undefined;
  while (true) {
    const txWithStatus = await ckbRpc.get_transaction(txHash);
    const status = txWithStatus?.tx_status.status;
    const elapsed = new Date().getTime() - startTime;
    if (status === "committed") {
      break;
    } else if (status != lastStatus) {
      lastStatus = status;
      console.log(
        `[waitL1TxCommitted] ckb.get_transaction("${txHash}") ==> "${status}", elapsed ${elapsed}ms`
      );
      if (status === "rejected") {
        throw new Error(
          `Rejected by CKB for waitL1TxCommitted("${txHash}, ${timeoutMs}ms)`
        );
      }
    }
    if (elapsed > timeoutMs) {
      throw new Error(
        `Timeout for waitL1TxCommitted("${txHash}, ${timeoutMs}ms)"`
      );
    }
  }
  console.log(
    `[waitL1TxCommitted] ckb.get_transaction("${txHash}") ==> committed, commit transaction success`
  );
}

// TODO Check deposit status via get out-point on layer1
export async function waitL2Deposit(
  ethAddress: EthAddress,
  initBalance_?: bigint,
  timeoutMs: number = 1000 * 120
): Promise<void> {
  const startTime = new Date().getTime();
  const initBalance =
    initBalance_ != null
      ? initBalance_
      : await godwokenWeb3.getBalance(ethAddress);
  console.log(
    `[waitL2Deposit] "${ethAddress}" has initialized balance ${initBalance}`
  );
  while (true) {
    const balance = await godwokenWeb3.getBalance(ethAddress);
    if (initBalance != balance) {
      break;
    }
    if (new Date().getTime() - startTime > timeoutMs) {
      throw new Error(
        `[waitL2Deposit] Timeout for waitL2Deposit("${ethAddress}", ${timeoutMs}ms)`
      );
    }
    await asyncSleep(500);
  }

  const balance = await godwokenWeb3.getBalance(ethAddress);
  console.log(
    `[waitL2Deposit] "${ethAddress}" has current balance ${balance}, deposit success`
  );
}

export async function waitL2Withdrawal(
  withdrawalHash: Hash,
  timeoutMs: number = 1000 * 120
): Promise<void> {
  const startTime = new Date().getTime();
  let lastStatus = (await godwokenWeb3.getWithdrawal(withdrawalHash)) || {
    status: "nil",
  };
  console.log(
    `[waitL2Withdrawal] web3.gw_get_withdrawal("${withdrawalHash}") ==> ${lastStatus.status}`
  );
  while (true) {
    const withdrawalStatus = (await godwokenWeb3.getWithdrawal(
      withdrawalHash
    )) || { status: "nil" };
    if (withdrawalStatus.status !== lastStatus.status) {
      lastStatus = withdrawalStatus;
      console.log(
        `[waitL2Withdrawal] web3.gw_get_withdrawal("${withdrawalHash}") ==> ${lastStatus}`
      );
      if (withdrawalStatus.status === "committed") {
        break;
      }
    }
    if (new Date().getTime() - startTime > timeoutMs) {
      throw new Error(
        `[waitL2Deposit] Timeout for waitL2Withdrawal("${withdrawalHash}", ${timeoutMs}ms)`
      );
    }
    await asyncSleep(500);
  }
  console.log(
    `[waitL2Withdrawal] web3.gw_get_withdrawal("${withdrawalHash}") ==> ${lastStatus.status}, withdraw success`
  );
}

export async function asyncSleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function collectInputCells(
  l1CkbUser: CkbUser,
  outputCkbCapacity: bigint,
  outputSudtAmount: bigint,
  outputSudtScript?: Script
): Promise<Cell[]> {
  let collectedCkbCapacity = BigInt(0);
  let collectedSudtAmount = BigInt(0);
  let collectedInputCells: Cell[] = [];

  // 1. Collect SUDT inputs
  if (outputSudtAmount > BigInt(0)) {
    const collector = ckbIndexer.collector({
      lock: l1CkbUser.l1LockScript(),
      type: outputSudtScript,
    });
    for await (const cell of collector.collect()) {
      console.log("bilibili ", cell);
      collectedInputCells.push(cell);
      collectedCkbCapacity += BigInt(cell.cell_output.capacity);
      collectedSudtAmount += utils.readBigUInt128LE(cell.data);

      if (
        collectedSudtAmount >= outputSudtAmount &&
        collectedCkbCapacity >=
          outputCkbCapacity + FEE + MINIMAL_CKB_CELL_CAPACITY
      ) {
        break;
      }
    }
  }
  if (
    collectedSudtAmount >= outputSudtAmount &&
    collectedCkbCapacity >= outputCkbCapacity + FEE + MINIMAL_CKB_CELL_CAPACITY
  ) {
    return collectedInputCells;
  } else if (collectedSudtAmount < outputSudtAmount) {
    throw new Error(
      `Not enough SUDT, expected: ${outputSudtAmount}, actual: ${collectedSudtAmount}`
    );
  }

  // Collect pure CKB inputs
  const collector = ckbIndexer.collector({
    lock: l1CkbUser.l1LockScript(),
    type: "empty",
    data: "0x",
  });
  for await (const cell of collector.collect()) {
    collectedInputCells.push(cell);
    collectedCkbCapacity += BigInt(cell.cell_output.capacity);

    if (
      collectedCkbCapacity >=
      outputCkbCapacity + FEE + MINIMAL_CKB_CELL_CAPACITY
    ) {
      break;
    }
  }
  if (
    collectedCkbCapacity >=
    outputCkbCapacity + FEE + MINIMAL_CKB_CELL_CAPACITY
  ) {
    return collectedInputCells;
  } else {
    throw new Error(
      `Not enough CKB, expected: ${outputCkbCapacity}, actual: ${collectedCkbCapacity}`
    );
  }
}

export function buildChangeOutputCell(
  l1CkbUser: CkbUser,
  inputCells: Cell[],
  outputCells: Cell[],
  sudtScript?: Script
): Cell {
  const outputCkbCapacity = sumCkbCapacity(outputCells);
  let outputSudtAmount = BigInt(0);
  if (sudtScript) {
    outputSudtAmount = sumSudtAmount(outputCells, sudtScript!);
  }
  const inputCkbCapacity = sumCkbCapacity(inputCells);
  let inputSudtAmount = BigInt(0);
  if (sudtScript) {
    inputSudtAmount = sumSudtAmount(inputCells, sudtScript!);
  }

  if (inputCkbCapacity < outputCkbCapacity + FEE + MINIMAL_CKB_CELL_CAPACITY) {
    throw new Error(
      `Not enough CKB, outputs CKB capacity: ${outputCkbCapacity}, inputs CKB capacity: ${inputCkbCapacity}, fee: ${FEE}, minimal_ckb_cell_capacity: ${MINIMAL_CKB_CELL_CAPACITY}`
    );
  }
  if (inputSudtAmount < outputSudtAmount) {
    throw new Error(
      `Not enough SUDT, outputs SUDT amount: ${outputSudtAmount}, inputs SUDT amount: ${inputSudtAmount}`
    );
  }

  if (outputSudtAmount === inputSudtAmount) {
    const cell: Cell = {
      cell_output: {
        capacity:
          "0x" + (inputCkbCapacity - outputCkbCapacity - FEE).toString(16),
        lock: l1CkbUser.l1LockScript(),
        type: undefined,
      },
      data: "0x",
    };
    return cell;
  } else {
    const cell: Cell = {
      cell_output: {
        capacity:
          "0x" + (inputCkbCapacity - outputCkbCapacity - FEE).toString(16),
        lock: l1CkbUser.l1LockScript(),
        // TODO FIXME
        // type: sudtScript,
      },
      data: "0x",
      // TODO FIXME
      //data: toBigUInt128LE(inputSudtAmount - outputSudtAmount),
    };
    return cell;
  }
}

export async function getRollupCell(retries: number = 0): Promise<Cell> {
  const getCellsResults = await ckbIndexer.getCells({
    script: config.ROLLUP_SCRIPT(),
    script_type: "type",
    filter: undefined, // TODO Config filter.block_range
  });

  if (getCellsResults.objects.length === 0) {
    if (retries > 10) {
      throw new Error(
        `Notfound rollup cell, rollup script: ${config.ROLLUP_SCRIPT()}`
      );
    } else {
      await asyncSleep(2000);
      return getRollupCell(retries + 1);
    }
  }
  return getCellsResults.objects[0];
}
