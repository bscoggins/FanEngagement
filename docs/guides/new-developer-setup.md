# New Developer Setup (macOS)

Use this guide to get a fresh macOS laptop ready to build, test, and contribute to FanEngagement.

## 1) Prerequisites

- macOS with admin rights
- Docker Desktop (install manually from https://www.docker.com/products/docker-desktop/)
- Homebrew (if missing, install via the command shown in the script output)
- GitHub access to the repository

## 2) Clone the repository

```bash
git clone git@github.com:bscoggins/FanEngagement.git
cd FanEngagement
```

## 3) Run the macOS bootstrap script

This installs toolchains (Node 20, pnpm, Rust, Solana CLI, Anchor 0.32.x, .NET SDK) and restores project dependencies.

```bash
./scripts/setup-mac-dev.sh
```

Re-run the script anytime; it is idempotent.

## 4) Optional environment files

- Solana adapter: copy [adapters/solana/.env.example](../../adapters/solana/.env.example) to `.env` and set `SOLANA_KEYPAIR_PATH` and `API_KEY` if you intend to run the adapter locally.
- Polygon adapter: copy [adapters/polygon/.env.example](../../adapters/polygon/.env.example) to `.env` and set RPC/private key when needed.
- Frontend: create `frontend/.env` if you want to point to non-default API hosts.

## 5) Start the stack locally

```bash
./scripts/dev-up --full
```

- `--full` starts Postgres, backend, and frontend. Use `./scripts/dev-down` to stop, `./scripts/dev-down --clean` to remove volumes.

## 6) Run tests

```bash
# Governance program build + unit tests + validator deploy check
./scripts/run-solana-governance-tests.sh

# Backend + frontend + e2e suites (includes governance script first)
./scripts/run-all-tests.sh
```

You can also run individual suites:

- Backend: `./scripts/test-backend`
- Frontend: `./scripts/test-frontend`
- E2E (Playwright): `./scripts/run-e2e.sh`

## 7) Verify Solana toolchain

If you plan to touch the governance program:

```bash
solana --version
anchor --version
solana config get
```

The program ID is declared in [adapters/solana/program/programs/fan-governance/src/lib.rs](../../adapters/solana/program/programs/fan-governance/src/lib.rs).

## 8) Contribute effectively

- Read the architecture overview: [docs/architecture.md](../architecture.md)
- Follow coding standards in the relevant subprojects (C#, TypeScript/Node, Rust/Anchor).
- Keep docs in sync when adding features; update [docs/README.md](../README.md) and related indices.
- Prefer the existing helper scripts in `scripts/` instead of custom commands so CI parity is maintained.

## 9) Troubleshooting

- If `anchor` or `solana` are not on PATH after install, re-source the cargo env:

```bash
source "$HOME/.cargo/env"
```

- Docker Desktop must be running for `dev-up` and validator-based tests.
- If brew installs fail, run `brew doctor` and fix reported issues before retrying.
