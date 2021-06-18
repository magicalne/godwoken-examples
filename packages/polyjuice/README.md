# Client library to interactive with godwoken polyjuice

Deploy Ethereum contracts to [Godwoken](https://github.com/nervosnetwork/godwoken) and interact with them using Ethereum toolchain.

## Prerequisites

[`Node.js` v14+](https://nodejs.org) and [`Yarn`](https://yarnpkg.com/) are required.

Use [godwoken-kicker](https://github.com/RetricSu/godwoken-kicker) to start a quick devnet `godwoken-polyjuice` chain.

## Run

```sh
yarn install
cp example.env .env
# and then edit `.env` with your own environment variables
```

### Multisignature Wallet

Contracts: [WalletSimple.sol](./contracts/WalletSimple.sol), [MintableToken.sol](./contracts/MintableToken.sol), [PolyjuiceAddress.sol](./contracts/PolyjuiceAddress.sol)

```sh
yarn ts-node ./scripts/multi-sign-wallet.ts
```

Result:

```Typescript
Deployer address 0x3beb2e57B4F8c21A5A34227eBe314a7E00A6F9Ae
Running: Initialize Godwoken account for 0x3beb2e57B4F8c21A5A34227eBe314a7E00A6F9Ae by deposit
    It may take a few minutes...
    Initialized, id: 0x10
Running: Load transaction history multi-sign-wallet-gwk-devnet.json
    New file created
Running transaction: Deploy WalletSimple
    Hash: 0x701e37e72a6d5727a23b2e0271d6b3465cc64f47e637fca99e538a23513b38cf
    WalletSimple address: 0x6E5285B85dfE43E3e7e5855B440c543211000000
[Incompatibility] using Polyjuice Address for executor(signer two)
Running: Initialize Godwoken account for 0xcbBcD4691175e20eB71106F7ec5FDb991044d842 by deposit
    It may take a few minutes...
    Initialized, id: 0x12
Running transaction: Deploy PolyjuiceAddress
    Hash: 0x91f8dbcd00ec427b06c09eb5b362057212a8d4b6ac475a6fca5ca7ba6b87750c
    PolyjuiceAddress address: 0x3c1aa0a24924eB2E2A60FE9c16327fF613000000
    Executor(signer two) Polyjuice Address: 0xfB02Bc0c72d0D660735405aF08b2F41F12000000
Signer addresses: 0xc0bf5e5072294950F1ac54989b58BF5ebb020b28, 0xfB02Bc0c72d0D660735405aF08b2F41F12000000, 0x3beb2e57B4F8c21A5A34227eBe314a7E00A6F9Ae
Running transaction: Init WalletSimple
    Hash: 0x2eabd9a9179264c3b869f96393fe822391ed0b9eceb6ce4623b576db734f98f3
Running transaction: Deploy MintableToken
    Hash: 0xa6730f8a5e396ab94db556120a3a8a5d912877516bebb5f3adb3524c8fd46f87
    MintableToken address: 0x6424aE85ae4245b910111Fbe2682cB9914000000
Running transaction: Set WalletSimple as minter
    Hash: 0xa45d80f2018f68554d4794c01efdd62e5b7adafd1cdd67f19235872073109eec
Balance before mint: 0
Running transaction: Mint 100 using WalletSimple
    Signing tx using signer one(0xc0bf5e5072294950F1ac54989b58BF5ebb020b28)
    Executing tx using signer two(0xfB02Bc0c72d0D660735405aF08b2F41F12000000)
    Hash: 0xf284681e6b6559910dafe4d6ed823652aa7d0d0fb26bfb29d96f5eb5d662cbcf
Balance after mint: 100
```

### Incompatibility

- `WalletSimple` verifies two signers: one from `msg.sender` and the other from `ecrecover`. Because `msg.sender` is **Polyjuice Address** in `godwoken-polyjuice`, signer with address stored as **Ethereum Address** can only be used to sign transaction data, and signer with address stored as **Polyjuice Address** can only be used to execute transactions.

  Note that multisignature wallet implementation like [GnosisSafe](https://github.com/gnosis/safe-contracts/blob/main/contracts/GnosisSafe.sol) which verifies signers using only `ecrecover` should fully compatible with `godwoken-polyjuice`.
