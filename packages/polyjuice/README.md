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

```sh
# concurrent calls with 20 accounts
yarn ts-node ./scripts/multi-sign-wallet.ts
```

Contracts: [WalletSimple.sol](./contracts/WalletSimple.sol), [MintableToken.sol](./contracts/MintableToken.sol)
