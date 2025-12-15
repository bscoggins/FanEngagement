#!/bin/bash

# Solana Adapter Wallet Address (derived from .env)
ADAPTER_WALLET="2p7ji7RTkmNJTEHwd7mRkiscmZXFETHavtYyNJMyLzcg"
RPC_URL="https://api.devnet.solana.com"

echo "Checking balance for Solana Adapter wallet: $ADAPTER_WALLET on Devnet"
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0", "id":1, "method":"getBalance", "params":["'$ADAPTER_WALLET'"]}' $RPC_URL
echo ""
