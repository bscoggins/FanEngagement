# Solana Test Environment Notes

These details capture how the Solana adapter and on-chain tests are configured in the local, fully controlled test environment.

## Key constants

- Program ID (placeholder): `11111111111111111111111111111111` (currently the system program; replace with the deployed program when available).
- Memo program ID: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`.
- Adapter signer: loaded from `SOLANA_PRIVATE_KEY`; the public key is exported as `SOLANA_ADAPTER_PUBKEY` by `scripts/run-solana-onchain-tests.sh` (derived from `test-keypair.json` by default).
- RPC: `http://localhost:8899` (local validator), commitment `confirmed`.

## PDA derivations (from `adapters/solana/src/solana-service.ts`)

All UUIDs are hex-encoded without dashes before use in seeds, and all PDAs are derived with the Program ID above.

- Organization PDA: seeds `[ "organization", organizationIdBytes ]`
- Proposal PDA: seeds `[ "proposal", proposalIdBytes ]`
- Vote PDA: seeds `[ "vote", voteIdBytes ]`
- Proposal results PDA: seeds `[ "proposal_results", proposalIdBytes ]`

## Share types and issuance

- `createShareType` mints an SPL token where **mint authority = adapter signer**; freeze authority also adapter signer. The mint address is returned and stored as `BlockchainMintAddress`.
- `recordShareIssuance` defaults `recipientAddress` to the adapter signer pubkey if not provided; it mints the requested quantity to the recipient’s ATA. If you pass `recipientAddress`, that key becomes the token account owner.

## Test harness exports (see `scripts/run-solana-onchain-tests.sh`)

- `SOLANA_ADAPTER_PUBKEY` is exported for tests to verify balances.
- `SOLANA_ADAPTER_BASE_URL`, `SOLANA_ADAPTER_API_KEY`, `SOLANA_ON_CHAIN_RPC_URL`, `RUN_SOLANA_ON_CHAIN_TESTS=true` are set before running the backend test suite.
- The harness funds the adapter signer with 25 SOL on the local validator prior to tests.

## Using a real Solana test cluster (devnet or testnet)

- Deploy the real program and record its Program ID; update adapter config and tests to use it (replace the placeholder ID above).
- Point RPC to the cluster (`SOLANA_ON_CHAIN_RPC_URL=https://api.devnet.solana.com` or testnet endpoint) and remove local-validator startup/funding from the harness.
- Ensure the adapter signer keypair is funded via faucet/airdrop (devnet) or manual transfer (testnet) and has enough SOL for rent and compute; set `SOLANA_PRIVATE_KEY` to that key.
- Recreate mints on the chosen cluster; set mint/freeze authority to the adapter signer or a managed authority; update any pre-seeded share types to reference the new mint addresses.
- Verify PDAs derived with the real Program ID and confirm their data layouts; extend tests to read PDA account data once program structs are finalized.

## Using Solana mainnet-beta

- Secure key management: store the adapter signer in a hardware wallet or KMS; never commit keys; rotate API keys for the adapter service.
- Choose a stable, permissioned RPC provider and update `SOLANA_ON_CHAIN_RPC_URL`; budget for rate limits and compute-unit fees.
- Fund the adapter signer with sufficient SOL for rent/compute; no airdrops are available on mainnet.
- Deploy the audited program to mainnet and update the Program ID; confirm PDA layouts match the released program and add PDA data validation to tests.
- Mint creation is irreversible: create production mints with correct decimals/authorities, and avoid reusing test mint addresses; consider freeze authority removal if policy requires.
- Update monitoring/alerts for transaction errors, balance thresholds, and RPC health; gate mainnet writes behind explicit environment flags to prevent accidental use.

## Current on-chain test assertions (backend)

- Mint exists, is initialized, and decimals match the configured share type.
- Mint supply increases by the issued amount.
- Adapter owner token balance (ATA for the mint) reaches the issued amount (using `SOLANA_ADAPTER_PUBKEY`).
- Proposal and vote memos are present on-chain with required fields; transactions include memo instructions; RPC meta has no errors.

## Gaps / next steps

- When a real Solana program is deployed, update Program ID and add PDA account data checks (org/proposal/vote/results) to validate stored fields.
- If issuing to real user wallets, expose or derive the user pubkey so tests can check their ATA balances (currently defaults to adapter signer unless `recipientAddress` is supplied).
