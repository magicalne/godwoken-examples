import { HexString, utils } from "@ckb-lumos/base";
import { generateAddress, parseAddress } from "@ckb-lumos/helpers";
import { key } from "@ckb-lumos/hd";
import { getConfig } from "@ckb-lumos/config-manager";
import crypto from "crypto";
import keccak256 from "keccak256";
import { Address } from "@ckb-lumos/base";

export function privateKeyToCkbAddress(privateKey: HexString): Address {
  const publicKey = key.privateToPublic(privateKey);
  const publicKeyHash = key.publicKeyToBlake160(publicKey);
  const scriptConfig = getConfig().SCRIPTS.SECP256K1_BLAKE160!;
  const script = {
    code_hash: scriptConfig.CODE_HASH,
    hash_type: scriptConfig.HASH_TYPE,
    args: publicKeyHash,
  };
  const address = generateAddress(script);
  return address;
}

export function privateKeyToEthAddress(privateKey: HexString) {
  const ecdh = crypto.createECDH(`secp256k1`);
  ecdh.generateKeys();
  ecdh.setPrivateKey(Buffer.from(privateKey.slice(2), "hex"));
  const publicKey: string = "0x" + ecdh.getPublicKey("hex", "uncompressed");
  const ethAddress =
    "0x" +
    keccak256(Buffer.from(publicKey.slice(4), "hex"))
      .slice(12)
      .toString("hex");
  return ethAddress;
}

export function ckbAddressToLockHash(address: Address): HexString {
  const lock = parseAddress(address);
  const lockHash = utils.computeScriptHash(lock);
  return lockHash;
}

export async function asyncSleep(ms = 0) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function retry<T>(fn: () => Promise<T>, retriesLeft = 3, interval = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.warn(error);
    console.log("=".repeat(80));
    if (retriesLeft === 0) {
      throw new Error(`Max retries reached for function ${fn.name}`);
    }
    await asyncSleep(interval);
    return await retry(fn, --retriesLeft, interval);
  }
}

export const promiseAllLimitN = async <T>(n: number, list: (() => Promise<T>)[]) => {
  const head = list.slice(0, n)
  const tail = list.slice(n)
  const result: T[] = []
  const execute = async (promise: () => Promise<T>, i: number, runNext: () => Promise<void>) => {
    result[i] = await promise()
    await runNext()
  }
  const runNext = async () => {
    const i = list.length - tail.length
    const promise = tail.shift()
    if (promise !== undefined) {
      await execute(promise, i, runNext)
    }
  }
  await Promise.all(head.map((promise, i) => execute(promise, i, runNext)))
  return result
}

/**
 * Randomize the order of the values of an array, returning a new array.
 * Use the Fisher-Yates algorithm to reorder the elements of the array.
 * > https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#Fisher_and_Yates'_original_method
 */
 export const shuffle = ([...arr]) => {
  let m = arr.length;
  while (m) {
    const i = Math.floor(Math.random() * m--);
    [arr[m], arr[i]] = [arr[i], arr[m]];
  }
  return arr;
}