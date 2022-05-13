export const L1_FEE = BigInt(100000); // TODO find a good fee
export const SHANNON_PER_CKB = BigInt(100000000);
export const MINIMAL_CKB_CELL_CAPACITY =
  BigInt(2) * BigInt(75) * SHANNON_PER_CKB; // TODO find a good capacity
export const MINIMAL_DEPOSIT_CAPACITY = BigInt(242 * 2) * SHANNON_PER_CKB; // TODO find a good deposit capacity
export const MINIMAL_WITHDRAWAL_CAPACITY = BigInt(242 * 2) * SHANNON_PER_CKB;
