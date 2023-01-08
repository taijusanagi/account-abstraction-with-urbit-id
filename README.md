# Urbit ID Wallet

![top](./docs/top.png)

## Submission

### Live App

https://urbit-id-wallet.vercel.app/

### Pitch Deck

https://docs.google.com/presentation/d/1uyrrvSnV_JtfU4oT_cXduBpttDvWMOpzSBou6nWIxcY/edit?usp=sharing

### Pitch with Demo

https://youtu.be/jdXYte9dUss

## Description

This is the Urbit ID wallet App.

It works as the wallet layer of the Urbit ID.

Users can convert Urbit ID to a contract wallet with Account Abstraction.

## Inspiration

https://www.youtube.com/watch?v=SsALaSdOnx8&t=1780s

This concept is inspired by the above Encode club \* Urbit workshop

## How it works

### Account Abstraction

![account-abstraction](./docs/account-abstraction.png)

1. Connect dApp with Wallet Connect
2. The request is sent to the app
3. Tx is sent from the backend

This is the meta-transaction process with the [ERC4337](https://medium.com/infinitism/erc-4337-account-abstraction-without-ethereum-protocol-changes-d75c9d94dc4a) account abstraction standard.

![erc4337](./docs/erc4337.webp)

### Interact with Urbit ID

Vitalik mentioned the following benefit of Account Abstraction in the above article.

> - Multisigs and social recovery
> - More efficient and simpler signature algorithms (eg. Schnorr, BLS)

In this MVP, We added Urbit ID as public key management infrastructure, and the contract wallet can inherit key management flexibility from Urbit ID.

And [Urbit ID documentation](https://urbit.org/overview/urbit-id) says

> Soon it will also be a master key that allows holding and sending of Bitcoin and other cryptocurrencies.

This Account Abstraction approach gives more choices to users and users can enjoy the feature right now.

![interact-with-urbit](./docs/interact-with-urbit.png)

Account Abstraction contract wallet address is calculated counterfactually with create2.

https://github.com/taijusanagi/account-abstraction-with-urbit-id/blob/main/packages/contracts/contracts/AAWalletDeployer.sol#L19

In this MVP, it takes the Azumith contract address and token ID for the salt to verify the user operation signature against the Urbit ID owner.

https://github.com/taijusanagi/account-abstraction-with-urbit-id/blob/main/packages/contracts/contracts/AAWallet.sol#L51

### Disclaimer

Currently, it is hard to use Urbit ID in Geroli, so prepared a mock Azumith contract for a better demo.

### Future Development

- Flexible key management includes operator
- Interact with Urbit ID master key
