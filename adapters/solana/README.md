# Solana Adapter (Pinocchio)

This directory contains the new, simplified Pinocchio-based implementation of the Solana adapter.

## Components

- **program/**: The Solana on-chain program (Rust) using the `pinocchio` library (zero-dependency).
- **src/**: The Node.js/TypeScript adapter service that exposes an HTTP API to the backend.

## Status

- [x] Archive legacy implementation
- [x] Implement Pinocchio program
- [x] Implement new Adapter service

## Usage

The adapter service exposes a generic logging endpoint:

`POST /v1/adapter/<action_type>`

Payload: JSON object.

The service wraps the payload in a transaction and sends it to the Solana program, which logs it on-chain.

