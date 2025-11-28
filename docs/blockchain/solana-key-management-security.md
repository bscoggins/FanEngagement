# Solana Key Management Security Requirements

> **Document Type:** Security Research / Requirements Specification  
> **Epic:** E-004 - Blockchain Integration Initiative (Solana)  
> **Issue:** E-004-04  
> **Status:** Complete  
> **Last Updated:** November 2024

## Executive Summary

This document establishes security requirements for Solana key management in the FanEngagement platform. It covers key generation, storage options, rotation strategies, backup/recovery procedures, and multi-signature requirements for high-value operations. These requirements are critical for securing platform signing keys that control token minting, governance operations, and treasury management.

**Key Recommendations:**

1. **Development/Testing:** Use file-based keypairs with encrypted storage; suitable for rapid iteration
2. **Staging:** Use cloud KMS (AWS KMS or Azure Key Vault) with proper IAM policies
3. **Production:** Use HSM-backed cloud KMS or dedicated HSM for maximum security
4. **Multi-signature:** Implement Squads Protocol for treasury operations and high-value minting
5. **Key Rotation:** Establish quarterly rotation schedule with documented procedures

**Security Classification:**

| Environment | Risk Level | Recommended Storage | Multi-sig Required |
|-------------|------------|--------------------|--------------------|
| Development | Low | File-based (encrypted) | No |
| Staging | Medium | Cloud KMS | Optional |
| Production | High | HSM or HSM-backed KMS | Yes (for treasury) |

---

## Table of Contents

1. [Key Generation and Storage Options](#1-key-generation-and-storage-options)
2. [Solana Keypair Formats and Derivation Paths](#2-solana-keypair-formats-and-derivation-paths)
3. [Key Rotation Strategy](#3-key-rotation-strategy)
4. [Backup and Recovery Procedures](#4-backup-and-recovery-procedures)
5. [Multi-Signature Requirements](#5-multi-signature-requirements)
6. [Security Requirements Summary](#6-security-requirements-summary)
7. [Compliance Considerations](#7-compliance-considerations)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [References](#9-references)

---

## 1. Key Generation and Storage Options

### 1.1 Overview

Solana uses Ed25519 elliptic curve cryptography for all signing operations. Platform keys must be generated securely and stored with appropriate protection based on risk level and operational requirements.

### 1.2 Key Types for FanEngagement

| Key Type | Purpose | Risk Level | Access Pattern |
|----------|---------|------------|----------------|
| **Platform Authority** | Mint tokens, manage PDAs | Critical | Automated (backend service) |
| **Fee Payer** | Pay transaction fees | Medium | High frequency, automated |
| **Organization Admin** | Per-org governance operations | High | Semi-automated or manual |
| **Upgrade Authority** | Program upgrades | Critical | Infrequent, manual |
| **Emergency Recovery** | Recovery operations | Critical | Rarely used, highly secured |

### 1.3 Storage Option Comparison

#### 1.3.1 File-Based Storage

**Overview:** Keypair stored as JSON file containing a 64-byte array (32-byte private key + 32-byte public key).

```json
[174,47,154,16,202,193,206,113,199,190,53,133,169,175,31,56,...]
```

| Aspect | Details |
|--------|---------|
| **Pros** | Simple, fast access, no external dependencies |
| **Cons** | Vulnerable to file system access, no audit trail |
| **Security Level** | Low (even with encryption) |
| **Use Case** | Development and testing only |
| **Cost** | Free |

**Security Enhancements for File-Based:**

```bash
# Encrypt keypair file at rest
openssl enc -aes-256-cbc -salt -pbkdf2 -in keypair.json -out keypair.json.enc

# Set restrictive permissions
chmod 600 keypair.json
chown service-account:service-account keypair.json
```

**Verdict:** ❌ Not recommended for production

#### 1.3.2 Hardware Security Module (HSM)

**Overview:** Dedicated cryptographic hardware that generates and stores keys in tamper-resistant devices. Keys never leave the HSM boundary.

| Aspect | Details |
|--------|---------|
| **Pros** | Maximum security, FIPS 140-2/3 certified, tamper-evident |
| **Cons** | High cost, complex setup, potential latency |
| **Security Level** | Very High |
| **Use Case** | Production critical keys |
| **Cost** | $1,000-$15,000+ initial, ongoing maintenance |

**HSM Options:**

| Provider | Model | FIPS Level | Ed25519 Support | Notes |
|----------|-------|------------|-----------------|-------|
| **Thales Luna** | Luna Network HSM | 140-2 Level 3 | ✅ | Industry standard |
| **AWS CloudHSM** | Managed HSM | 140-2 Level 3 | ✅ | AWS-integrated |
| **Yubico** | YubiHSM 2 | 140-2 Level 3 | ✅ | Cost-effective |
| **Ledger** | Nano X/S | Not certified | ✅ | Consumer-grade, manual |

**HSM Integration Pattern:**

```text
┌─────────────────────────────────────────────────────────────────┐
│                    HSM Integration Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                     ┌───────────────────────┐ │
│  │ FanEngagement│                     │         HSM           │ │
│  │   Backend    │                     │  ┌─────────────────┐  │ │
│  │              │    PKCS#11 /        │  │  Private Key    │  │ │
│  │  ┌────────┐  │    REST API         │  │  (never leaves) │  │ │
│  │  │ Signer │──┼────────────────────▶│  └─────────────────┘  │ │
│  │  │ Service│  │                     │                       │ │
│  │  └────────┘  │    ◀───────────────┼─  Signature returned   │ │
│  │              │    Signed TX        │                       │ │
│  └──────────────┘                     └───────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Verdict:** ✅ Recommended for production (critical keys)

#### 1.3.3 Cloud Key Management Services

**Overview:** Cloud-managed key storage with built-in encryption, access control, and audit logging.

##### AWS Key Management Service (KMS)

| Aspect | Details |
|--------|---------|
| **Pros** | AWS integration, audit via CloudTrail, automatic rotation |
| **Cons** | Vendor lock-in, no native Ed25519 signing |
| **Security Level** | High |
| **Cost** | ~$1/key/month + $0.03/10,000 requests |

**AWS KMS Pattern for Solana:**

```text
┌─────────────────────────────────────────────────────────────────┐
│                    AWS KMS Pattern for Solana                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Option A: Envelope Encryption (Recommended)                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. KMS stores Data Encryption Key (DEK)                    │ │
│  │ 2. DEK encrypts Solana private key                         │ │
│  │ 3. Encrypted private key stored in Secrets Manager         │ │
│  │ 4. At runtime: KMS decrypts DEK → DEK decrypts Solana key  │ │
│  │ 5. Solana key used for signing (in memory only)            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Option B: AWS CloudHSM (Higher Security)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Generate Ed25519 key inside CloudHSM                    │ │
│  │ 2. Key never leaves HSM                                    │ │
│  │ 3. Sign operations via PKCS#11 interface                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// AWS KMS Envelope Encryption example
import { KMSClient, DecryptCommand, GenerateDataKeyCommand } from "@aws-sdk/client-kms";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Keypair } from "@solana/web3.js";

async function loadSolanaKeypair(): Promise<Keypair> {
  const kmsClient = new KMSClient({ region: "us-east-1" });
  const secretsClient = new SecretsManagerClient({ region: "us-east-1" });

  // Get encrypted keypair from Secrets Manager
  const secretResponse = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: "solana/platform-authority" })
  );
  
  const encryptedData = JSON.parse(secretResponse.SecretString!);
  
  // Decrypt using KMS
  const decryptResponse = await kmsClient.send(
    new DecryptCommand({
      CiphertextBlob: Buffer.from(encryptedData.encryptedKey, "base64"),
      KeyId: encryptedData.kmsKeyId,
    })
  );
  
  // Convert to Keypair (key exists in memory only)
  return Keypair.fromSecretKey(new Uint8Array(decryptResponse.Plaintext!));
}
```

##### Azure Key Vault

| Aspect | Details |
|--------|---------|
| **Pros** | Azure integration, RBAC, native Ed25519 support (preview) |
| **Cons** | Azure ecosystem dependency |
| **Security Level** | High |
| **Cost** | ~$0.03/10,000 operations (Standard), ~$1/key/month (Premium HSM) |

**Azure Key Vault Pattern:**

```typescript
// Azure Key Vault integration
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";
import { Keypair } from "@solana/web3.js";

async function loadSolanaKeypair(): Promise<Keypair> {
  const credential = new DefaultAzureCredential();
  const client = new SecretClient(
    "https://fanengagement-kv.vault.azure.net",
    credential
  );
  
  const secret = await client.getSecret("solana-platform-authority");
  const keyArray = JSON.parse(secret.value!);
  
  return Keypair.fromSecretKey(new Uint8Array(keyArray));
}
```

##### HashiCorp Vault

| Aspect | Details |
|--------|---------|
| **Pros** | Cloud-agnostic, excellent audit, dynamic secrets, transit engine |
| **Cons** | Self-hosted complexity (or HCP cost) |
| **Security Level** | High |
| **Cost** | Self-hosted: free; HCP: $0.03/secret/month + operations |

**HashiCorp Vault Pattern:**

```typescript
// HashiCorp Vault integration
import Vault from "node-vault";
import { Keypair } from "@solana/web3.js";

async function loadSolanaKeypair(): Promise<Keypair> {
  const vault = Vault({
    apiVersion: "v1",
    endpoint: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN, // Or use AppRole auth
  });
  
  // Read from KV secrets engine
  const result = await vault.read("secret/data/solana/platform-authority");
  const keyArray = result.data.data.privateKey;
  
  return Keypair.fromSecretKey(new Uint8Array(keyArray));
}
```

**Verdict:** ✅ Recommended for staging and production

#### 1.3.4 Storage Option Decision Matrix

| Factor | Weight | File | HSM | AWS KMS | Azure KV | HashiCorp Vault |
|--------|--------|------|-----|---------|----------|-----------------|
| Security | 30% | 2 | 10 | 8 | 8 | 8 |
| Cost | 15% | 10 | 2 | 7 | 7 | 6 |
| Ops Complexity | 15% | 10 | 4 | 8 | 8 | 5 |
| Audit/Compliance | 20% | 2 | 10 | 9 | 9 | 9 |
| Performance | 10% | 10 | 7 | 8 | 8 | 8 |
| Flexibility | 10% | 5 | 6 | 7 | 7 | 9 |
| **Weighted Score** | 100% | **5.5** | **7.2** | **8.0** | **8.0** | **7.6** |

> **Methodology:** Weighted scores are calculated as the sum of (weight × score) for each factor. Scores range from 1-10, with 10 being the best. For example, File storage: (0.30×2) + (0.15×10) + (0.15×10) + (0.20×2) + (0.10×10) + (0.10×5) = 5.5.

**Recommendation by Environment:**

| Environment | Primary | Fallback | Rationale |
|-------------|---------|----------|-----------|
| Development | File (encrypted) | - | Speed, simplicity |
| Staging | AWS KMS / Azure KV | HashiCorp Vault | Cloud integration |
| Production | AWS CloudHSM / Azure KV HSM | HashiCorp Vault (HSM-backed) | Maximum security |

---

## 2. Solana Keypair Formats and Derivation Paths

### 2.1 Ed25519 Key Structure

Solana exclusively uses Ed25519 elliptic curve cryptography:

| Component | Size | Description |
|-----------|------|-------------|
| Private Key | 32 bytes | Random seed for key generation |
| Public Key | 32 bytes | Derived from private key |
| Keypair | 64 bytes | Private + Public concatenated |
| Signature | 64 bytes | Ed25519 signature output |

### 2.2 Key Generation Methods

#### 2.2.1 Direct Ed25519 Generation

**Overview:** Generate random 32-byte seed, derive Ed25519 keypair.

```typescript
import { Keypair } from "@solana/web3.js";
import * as crypto from "crypto";

// Method 1: Using Solana Web3.js
const keypair = Keypair.generate();
console.log("Public Key:", keypair.publicKey.toBase58());

// Method 2: From cryptographically secure random bytes
const seed = crypto.randomBytes(32);
const keypairFromSeed = Keypair.fromSeed(seed);

// Method 3: From existing 64-byte secret key array
const secretKey = new Uint8Array([/* 64 bytes */]);
const keypairFromSecret = Keypair.fromSecretKey(secretKey);
```

| Aspect | Details |
|--------|---------|
| **Pros** | Simple, deterministic from seed, no external dependencies |
| **Cons** | No mnemonic backup, single source of entropy |
| **Use Case** | Programmatic key generation, service accounts |
| **Recommendation** | ✅ Use for platform service keys |

#### 2.2.2 BIP39/BIP44 Hierarchical Deterministic (HD) Derivation

**Overview:** Generate mnemonic phrase, derive multiple keys from single seed using standardized derivation paths.

**Derivation Path Standard for Solana:**

```
m / purpose' / coin_type' / account' / change'
m / 44' / 501' / 0' / 0'
```

| Path Component | Value | Meaning |
|----------------|-------|---------|
| `purpose` | 44' | BIP44 standard |
| `coin_type` | 501' | Solana (registered coin type) |
| `account` | 0', 1', 2'... | Account index |
| `change` | 0' | External addresses (Solana convention) |

```typescript
import { derivePath } from "ed25519-hd-key";
import * as bip39 from "bip39";
import { Keypair } from "@solana/web3.js";

// Generate mnemonic
const mnemonic = bip39.generateMnemonic(256); // 24 words
console.log("Mnemonic:", mnemonic);

// Derive seed from mnemonic
const seed = bip39.mnemonicToSeedSync(mnemonic);

// Derive keypairs using BIP44 path
function deriveKeypair(seed: Buffer, accountIndex: number): Keypair {
  const path = `m/44'/501'/${accountIndex}'/0'`;
  const derivedSeed = derivePath(path, seed.toString("hex")).key;
  return Keypair.fromSeed(derivedSeed);
}

const platformAuthority = deriveKeypair(seed, 0);
const feePayer = deriveKeypair(seed, 1);
const upgradeAuthority = deriveKeypair(seed, 2);
```

| Aspect | Details |
|--------|---------|
| **Pros** | Single backup (mnemonic), deterministic derivation, wallet compatibility |
| **Cons** | Mnemonic exposure compromises all keys, additional complexity |
| **Use Case** | User wallets, multiple related keys from single seed |
| **Recommendation** | ⚠️ Use with caution for platform keys (single point of failure) |

#### 2.2.3 Key Generation Comparison

| Method | Backup | Security | Complexity | Recovery | Platform Use |
|--------|--------|----------|------------|----------|--------------|
| Direct Ed25519 | Key file | High (isolated) | Low | Requires key backup | ✅ Recommended |
| BIP39/BIP44 | Mnemonic | Medium (shared seed) | Medium | Mnemonic only | ⚠️ Caution |

### 2.3 Platform Key Derivation Strategy

**Recommendation:** Use separate, independently generated keys for each purpose:

```text
┌─────────────────────────────────────────────────────────────────┐
│              FanEngagement Key Hierarchy                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Platform Authority (Critical)                               ││
│  │ • Generated: Direct Ed25519 in HSM/KMS                     ││
│  │ • Purpose: Mint tokens, manage PDAs                        ││
│  │ • Storage: AWS CloudHSM / Azure KV Premium                  ││
│  │ • Backup: HSM key export to separate HSM                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Fee Payer (High Frequency)                                  ││
│  │ • Generated: Direct Ed25519                                 ││
│  │ • Purpose: Pay transaction fees                            ││
│  │ • Storage: KMS with lower access latency                   ││
│  │ • Backup: Encrypted backup in separate region              ││
│  │ • Note: Lower balance, replenished automatically           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Upgrade Authority (Critical, Rarely Used)                   ││
│  │ • Generated: Direct Ed25519 (offline ceremony)             ││
│  │ • Purpose: Program upgrades                                 ││
│  │ • Storage: Cold storage (HSM or air-gapped)                ││
│  │ • Backup: Split among multiple custodians (Shamir)         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Emergency Recovery (Critical, Never Used Normally)          ││
│  │ • Generated: Offline key ceremony with witnesses           ││
│  │ • Purpose: Recovery from catastrophic failure              ││
│  │ • Storage: Distributed cold storage (multiple locations)   ││
│  │ • Backup: Shamir's Secret Sharing (3-of-5)                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Key Format Standards

| Format | Description | Use Case |
|--------|-------------|----------|
| **JSON Array** | `[b1, b2, ..., b64]` | Solana CLI, testing |
| **Base58** | Public key display | User-facing, URLs |
| **Base64** | Encoded secret key | API transmission |
| **Hex** | Raw bytes as hex string | Debugging, logs (public key only) |

**Security Note:** Never log, transmit, or display private keys in any format.

---

## 3. Key Rotation Strategy

### 3.1 Rotation Requirements

| Key Type | Rotation Frequency | Trigger Events |
|----------|-------------------|----------------|
| Platform Authority | Quarterly | Staff departure, suspected compromise |
| Fee Payer | Monthly | Balance replenishment, routine |
| Upgrade Authority | Annually | Security audit, major releases |
| Organization Keys | Per policy | Org admin changes, security events |

### 3.2 Rotation Process

#### 3.2.1 Platform Authority Rotation

```text
┌─────────────────────────────────────────────────────────────────┐
│              Platform Authority Key Rotation Process             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: Preparation (Day -7)                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Generate new keypair in HSM/KMS                         │ │
│  │ 2. Deploy new key to staging environment                   │ │
│  │ 3. Test all signing operations with new key               │ │
│  │ 4. Verify no functional regressions                        │ │
│  │ 5. Document new public key for on-chain updates           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Phase 2: On-Chain Authority Transfer (Day 0)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Pause automated minting operations                      │ │
│  │ 2. Execute SetAuthority for each token mint:               │ │
│  │    - Old authority signs transfer to new authority         │ │
│  │    - Verify new authority on each mint                     │ │
│  │ 3. Update PDA authority references (if applicable)         │ │
│  │ 4. Resume operations with new key                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Phase 3: Deployment and Verification (Day 0-1)                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Update production configuration to use new key          │ │
│  │ 2. Deploy updated backend services                         │ │
│  │ 3. Verify minting operations succeed                       │ │
│  │ 4. Monitor for errors and anomalies                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Phase 4: Old Key Decommission (Day +7)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Verify all mints transferred to new authority           │ │
│  │ 2. Archive old key material (encrypted, offline)           │ │
│  │ 3. Revoke access to old key in KMS/HSM                     │ │
│  │ 4. Update security documentation                           │ │
│  │ 5. Notify stakeholders of successful rotation              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.2.2 Authority Transfer Code

The following example demonstrates the on-chain authority transfer process during key rotation. This is a critical operation that transfers mint authority from the current (old) key to the new key.

```typescript
import { 
  Connection, 
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction 
} from "@solana/web3.js";
import { 
  createSetAuthorityInstruction, 
  AuthorityType,
  TOKEN_PROGRAM_ID 
} from "@solana/spl-token";

async function rotateTokenMintAuthority(
  connection: Connection,
  mint: PublicKey,
  currentAuthority: Keypair,
  newAuthority: PublicKey
): Promise<string> {
  const transaction = new Transaction().add(
    createSetAuthorityInstruction(
      mint,
      currentAuthority.publicKey,
      AuthorityType.MintTokens,
      newAuthority,
      [],
      TOKEN_PROGRAM_ID
    )
  );
  
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [currentAuthority],
    { commitment: "finalized" }
  );
  
  console.log(`Authority transferred. Signature: ${signature}`);
  return signature;
}
```

### 3.3 Emergency Rotation Procedure

**Trigger Conditions:**
- Suspected or confirmed key compromise
- Unauthorized transaction detected
- Security incident response

**Immediate Actions (within 1 hour):**

1. **Pause Operations:**
   ```bash
   # Set maintenance mode flag
   kubectl set env deployment/blockchain-sync-service PAUSE_MINTING=true
   ```

2. **Assess Scope:**
   - Identify which keys may be compromised
   - Review recent transactions for unauthorized activity
   - Document timeline of potential exposure

3. **Execute Emergency Rotation:**
   - Generate new keys in clean environment
   - Transfer authorities to new keys
   - Revoke old keys immediately

4. **Post-Incident:**
   - Conduct security review
   - Update incident report
   - Implement additional controls

---

## 4. Backup and Recovery Procedures

### 4.1 Backup Strategy Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Key Backup Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Primary Key Storage                     Backup Storage          │
│  ┌───────────────────┐                  ┌───────────────────┐   │
│  │ AWS CloudHSM      │                  │ AWS CloudHSM      │   │
│  │ (us-east-1)       │ ════════════════▶│ (us-west-2)       │   │
│  │                   │    Sync          │                   │   │
│  │ • Platform Auth   │                  │ • Platform Auth   │   │
│  │ • Fee Payer       │                  │ • Fee Payer       │   │
│  └───────────────────┘                  └───────────────────┘   │
│                                                                 │
│  ┌───────────────────┐                  ┌───────────────────┐   │
│  │ AWS Secrets Mgr   │                  │ Cold Storage      │   │
│  │ (Encrypted Keys)  │                  │ (Air-gapped)      │   │
│  │                   │ ════════════════▶│                   │   │
│  │ • Encrypted with  │    Quarterly     │ • Encrypted USB   │   │
│  │   KMS key         │    Export        │ • Safety deposit  │   │
│  └───────────────────┘                  └───────────────────┘   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Emergency Recovery Keys (Shamir's Secret Sharing)         │  │
│  │                                                           │  │
│  │  Share 1      Share 2      Share 3      Share 4  Share 5  │  │
│  │  ┌─────┐      ┌─────┐      ┌─────┐      ┌─────┐  ┌─────┐  │  │
│  │  │ CEO │      │ CTO │      │ Sec │      │Legal│  │Escrow│ │  │
│  │  │     │      │     │      │Lead │      │     │  │     │  │  │
│  │  └─────┘      └─────┘      └─────┘      └─────┘  └─────┘  │  │
│  │                                                           │  │
│  │  Threshold: 3-of-5 required to reconstruct               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Backup Procedures

#### 4.2.1 HSM Key Backup

```text
Procedure: HSM Key Backup (Quarterly)
Personnel: Security Lead + Witness
Duration: 2-4 hours

1. Preparation
   □ Schedule maintenance window
   □ Notify operations team
   □ Prepare air-gapped backup workstation
   □ Verify backup HSM availability

2. Key Export (Primary HSM)
   □ Authenticate to HSM with admin credentials
   □ Export key material (encrypted with KEK)
   □ Verify export checksum
   □ Document key metadata (ID, creation date, purpose)

3. Key Import (Backup HSM)
   □ Authenticate to backup HSM
   □ Import encrypted key material
   □ Verify import succeeded
   □ Test key operations on backup

4. Cold Storage Backup
   □ Export encrypted key to air-gapped device
   □ Create additional encrypted copy
   □ Store in geographically separate locations
   □ Update backup inventory

5. Verification
   □ Verify backup can sign test transactions
   □ Update backup status in documentation
   □ Sign backup completion certificate
```

#### 4.2.2 Shamir's Secret Sharing for Emergency Keys

> **Note:** The following example uses [`secrets.js-grempe`](https://github.com/grempe/secrets.js), a well-established JavaScript implementation of Shamir's Secret Sharing. Alternative libraries include [`shamir`](https://www.npmjs.com/package/shamir), [`shamir-secret-sharing`](https://www.npmjs.com/package/shamir-secret-sharing), or implementations in other languages such as Python's [`secretsharing`](https://pypi.org/project/secretsharing/) and Rust's [`shamir`](https://crates.io/crates/shamir).

```typescript
import * as secrets from "secrets.js-grempe";
import { Keypair } from "@solana/web3.js";

// Split emergency recovery key into 5 shares, requiring 3 to reconstruct
function splitKey(privateKeyHex: string): string[] {
  const shares = secrets.share(
    privateKeyHex,
    5,    // Total shares
    3     // Threshold to reconstruct
  );
  return shares;
}

// Reconstruct key from shares
function reconstructKey(shares: string[]): string {
  if (shares.length < 3) {
    throw new Error("Minimum 3 shares required");
  }
  return secrets.combine(shares);
}

// Example usage during key ceremony
const emergencyKey = Keypair.generate();
const privateKeyHex = Buffer.from(emergencyKey.secretKey).toString("hex");

const shares = splitKey(privateKeyHex);
// Distribute shares to custodians:
// shares[0] -> CEO (secure envelope)
// shares[1] -> CTO (secure envelope)
// shares[2] -> Security Lead (secure envelope)
// shares[3] -> Legal Counsel (secure envelope)
// shares[4] -> Escrow Service (secure envelope)
```

### 4.3 Recovery Procedures

#### 4.3.1 Standard Recovery (HSM Backup)

```text
Procedure: Key Recovery from HSM Backup
Trigger: Primary HSM failure or data center outage
RTO: 4 hours
RPO: 0 (synchronous replication)

1. Incident Assessment
   □ Confirm primary HSM is unavailable
   □ Assess scope of impact
   □ Activate incident response team

2. Failover to Backup
   □ Update DNS/service discovery to backup region
   □ Verify backup HSM connectivity
   □ Test signing operations

3. Service Restoration
   □ Deploy services pointing to backup HSM
   □ Resume blockchain operations
   □ Monitor for errors

4. Post-Recovery
   □ Investigate primary failure
   □ Restore primary when available
   □ Update incident report
```

#### 4.3.2 Emergency Recovery (Shamir Shares)

```text
Procedure: Emergency Key Reconstruction
Trigger: Complete loss of all HSM backups
Personnel: Minimum 3 share custodians + Security Lead
Duration: 4-8 hours

1. Activation
   □ Executive authorization required
   □ Contact share custodians
   □ Schedule secure reconstruction ceremony

2. Ceremony Setup
   □ Prepare air-gapped workstation
   □ Verify ceremony witnesses present
   □ Document all participants

3. Share Collection
   □ Each custodian decrypts their share
   □ Enter shares into reconstruction software
   □ Verify share validity

4. Key Reconstruction
   □ Combine shares to reconstruct key
   □ Verify reconstructed public key matches expected
   □ Test signing operation

5. Key Installation
   □ Generate new keys for operational use
   □ Transfer authorities from recovered key
   □ Install new keys in HSM/KMS
   □ Securely destroy reconstructed key

6. Post-Recovery
   □ Generate new emergency shares
   □ Distribute to custodians
   □ Update security documentation
```

### 4.4 Backup Testing Schedule

| Backup Type | Test Frequency | Test Scope |
|-------------|----------------|------------|
| HSM Replication | Weekly | Verify sync, test signing |
| Cold Storage | Quarterly | Full restore, verify operations |
| Shamir Shares | Annually | Full reconstruction ceremony |
| Recovery Runbooks | Semi-annually | Tabletop exercise |

---

## 5. Multi-Signature Requirements

### 5.1 Multi-Sig Use Cases

| Operation | Value/Risk | Multi-sig Required | Threshold |
|-----------|------------|-------------------|-----------|
| Token minting (< 10,000 units) | Low | No | N/A |
| Token minting (> 10,000 units) | Medium | Optional | 2-of-3 |
| Token mint authority transfer | High | Yes | 2-of-3 |
| Treasury transfer (< $1,000) | Low | No | N/A |
| Treasury transfer ($1,000 - $10,000) | Medium | Yes | 2-of-3 |
| Treasury transfer (> $10,000) | High | Yes | 3-of-5 |
| Program upgrade | Critical | Yes | 3-of-5 |
| Emergency pause | Critical | Yes | 2-of-3 |

### 5.2 Multi-Sig Implementation Options

#### 5.2.1 Squads Protocol (Recommended)

**Overview:** The leading multi-signature solution for Solana, battle-tested with billions in TVL.

| Aspect | Details |
|--------|---------|
| **Architecture** | Smart account (Squad) with configurable signers |
| **Threshold** | Configurable M-of-N (e.g., 2-of-3, 3-of-5) |
| **Features** | Vaults, proposals, time locks, spending limits |
| **UI** | Web interface at squads.so |
| **Cost** | Free (transaction fees only) |
| **Audit Status** | Multiple audits by OtterSec, Halborn |

```text
┌─────────────────────────────────────────────────────────────────┐
│              Squads Protocol Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Squad Account (PDA)                      │ │
│  │                                                             │ │
│  │  Members:                 Configuration:                    │ │
│  │  ┌─────────────────┐     ┌─────────────────────┐          │ │
│  │  │ Platform Admin  │     │ Threshold: 2-of-3   │          │ │
│  │  │ Security Lead   │     │ Time Lock: 24h      │          │ │
│  │  │ CTO             │     │ Spending Limit: 1000│          │ │
│  │  └─────────────────┘     └─────────────────────┘          │ │
│  │                                                             │ │
│  │  Vault Accounts:                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │ Treasury Vault    │ Holds SOL and SPL tokens        │  │ │
│  │  │ Authority Vault   │ Controls token mint authorities │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Transaction Flow:                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │ Propose  │───▶│ Sign #1  │───▶│ Sign #2  │───▶│ Execute  │ │
│  │          │    │ (Admin)  │    │ (Security)│   │          │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Squads Setup Example:**

```typescript
import { PublicKey, Connection, Keypair, TransactionInstruction } from "@solana/web3.js";
import Squads, { Permissions } from "@sqds/sdk";

async function setupPlatformMultisig(
  connection: Connection,
  members: PublicKey[]
): Promise<PublicKey> {
  const squads = Squads.endpoint(connection);
  
  // Create 2-of-3 multisig
  const { squad } = await squads.createSquad({
    threshold: 2,
    members: members.map(pubkey => ({
      publicKey: pubkey,
      permissions: Permissions.all(), // Full permissions for all members
    })),
    name: "FanEngagement Platform Authority",
  });
  
  console.log("Squad created:", squad.publicKey.toBase58());
  return squad.publicKey;
}

// Create a transaction proposal
async function proposeTokenMint(
  squads: Squads,
  squadPubkey: PublicKey,
  mintInstruction: TransactionInstruction
): Promise<PublicKey> {
  // Create proposal
  const { transaction } = await squads.createTransaction(squadPubkey, 1);
  
  // Add mint instruction
  await squads.addInstruction(transaction.publicKey, mintInstruction);
  
  // Activate for signing
  await squads.activateTransaction(transaction.publicKey);
  
  return transaction.publicKey;
}
```

#### 5.2.2 Native SPL Multisig

**Overview:** Built into the SPL Token program, simpler but less feature-rich.

| Aspect | Details |
|--------|---------|
| **Architecture** | Multisig account as token authority |
| **Threshold** | M-of-N where N ≤ 11 |
| **Features** | Basic signing only |
| **UI** | Requires custom implementation |
| **Cost** | Rent for multisig account (~0.0028 SOL) |

```typescript
import {
  Connection,
  Keypair,
  PublicKey
} from "@solana/web3.js";
import { 
  createMultisig,
  TOKEN_PROGRAM_ID 
} from "@solana/spl-token";

async function createNativeMultisig(
  connection: Connection,
  payer: Keypair,
  signers: PublicKey[]
): Promise<PublicKey> {
  const multisigPubkey = await createMultisig(
    connection,
    payer,
    signers,
    2, // Require 2 signatures
    undefined,
    undefined,
    TOKEN_PROGRAM_ID
  );
  
  return multisigPubkey;
}
```

**Verdict:** ⚠️ Use only for simple token authority multi-sig; prefer Squads for full functionality

#### 5.2.3 Multi-Sig Comparison

| Feature | Squads Protocol | Native SPL Multisig |
|---------|----------------|---------------------|
| Threshold | Configurable | Configurable (max 11) |
| Time locks | ✅ | ❌ |
| Spending limits | ✅ | ❌ |
| Proposal system | ✅ | ❌ |
| UI | ✅ (squads.so) | ❌ |
| Treasury management | ✅ | ❌ |
| Audit trail | ✅ | ❌ |
| **Recommendation** | ✅ Production | ⚠️ Simple cases only |

### 5.3 Multi-Sig Configuration for FanEngagement

**Recommended Configuration:**

```text
┌─────────────────────────────────────────────────────────────────┐
│           FanEngagement Multi-Sig Structure                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Treasury Operations Squad (3-of-5)                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Members:                                                   │ │
│  │   • Platform Admin (automated signer for routine ops)      │ │
│  │   • CEO                                                    │ │
│  │   • CTO                                                    │ │
│  │   • CFO                                                    │ │
│  │   • Security Lead                                          │ │
│  │                                                            │ │
│  │ Policies:                                                  │ │
│  │   • < $1,000: No multi-sig required                       │ │
│  │   • $1,000 - $10,000: 2-of-5                              │ │
│  │   • > $10,000: 3-of-5                                     │ │
│  │   • Time lock: 24 hours for amounts > $10,000             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Token Authority Squad (2-of-3)                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Members:                                                   │ │
│  │   • Platform Service (automated - HSM-backed)              │ │
│  │   • CTO                                                    │ │
│  │   • Security Lead                                          │ │
│  │                                                            │ │
│  │ Policies:                                                  │ │
│  │   • Routine minting: Automated (single signer)            │ │
│  │   • Authority transfers: 2-of-3                           │ │
│  │   • Mint creation: 2-of-3                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Program Upgrade Squad (3-of-5)                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Members:                                                   │ │
│  │   • CEO                                                    │ │
│  │   • CTO                                                    │ │
│  │   • Security Lead                                          │ │
│  │   • Lead Engineer                                          │ │
│  │   • External Auditor (optional, for critical upgrades)    │ │
│  │                                                            │ │
│  │ Policies:                                                  │ │
│  │   • All upgrades require 3-of-5                           │ │
│  │   • 48-hour time lock                                     │ │
│  │   • Security audit required before proposal               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Security Requirements Summary

### 6.1 Key Generation Requirements

| ID | Requirement | Priority | Environment |
|----|-------------|----------|-------------|
| KG-01 | All keys MUST be generated using cryptographically secure random number generators | Critical | All |
| KG-02 | Production keys MUST be generated inside HSM or secure key ceremony | Critical | Production |
| KG-03 | Key generation MUST be audited with witnesses for critical keys | High | Production |
| KG-04 | Generated keys MUST be verified against expected public key before use | High | All |
| KG-05 | Key generation process MUST be documented and reproducible | Medium | All |

### 6.2 Key Storage Requirements

| ID | Requirement | Priority | Environment |
|----|-------------|----------|-------------|
| KS-01 | Production keys MUST be stored in HSM or HSM-backed KMS | Critical | Production |
| KS-02 | Keys MUST never be stored in plaintext outside secure hardware | Critical | All |
| KS-03 | Key access MUST be logged and auditable | Critical | Production, Staging |
| KS-04 | Keys MUST be encrypted at rest with AES-256 or equivalent | High | All |
| KS-05 | Development keys MUST be clearly marked and isolated from production | High | Development |
| KS-06 | Key storage systems MUST be in separate security domains from application | Medium | Production |

### 6.3 Key Access Requirements

| ID | Requirement | Priority | Environment |
|----|-------------|----------|-------------|
| KA-01 | Key access MUST use principle of least privilege | Critical | All |
| KA-02 | Human access to production keys MUST require MFA | Critical | Production |
| KA-03 | Service accounts MUST use role-based access with time-limited tokens | High | Production, Staging |
| KA-04 | Key access MUST be revocable within 1 hour of personnel departure | High | All |
| KA-05 | All key operations MUST be logged with requester identity | High | Production, Staging |

### 6.4 Key Rotation Requirements

| ID | Requirement | Priority | Environment |
|----|-------------|----------|-------------|
| KR-01 | Critical keys MUST be rotatable without service interruption | Critical | Production |
| KR-02 | Rotation procedures MUST be documented and tested quarterly | High | Production |
| KR-03 | Emergency rotation MUST be completable within 4 hours | High | Production |
| KR-04 | Old keys MUST be securely archived for audit purposes | Medium | Production |
| KR-05 | Rotation events MUST trigger security team notification | Medium | Production |

### 6.5 Backup and Recovery Requirements

| ID | Requirement | Priority | Environment |
|----|-------------|----------|-------------|
| BR-01 | All production keys MUST have geographically separated backups | Critical | Production |
| BR-02 | Emergency recovery keys MUST use Shamir's Secret Sharing (3-of-5 minimum) | Critical | Production |
| BR-03 | Backup restoration MUST be tested quarterly | High | Production |
| BR-04 | Recovery Time Objective (RTO) MUST be < 4 hours | High | Production |
| BR-05 | Recovery Point Objective (RPO) MUST be 0 (no key loss acceptable) | Critical | Production |

### 6.6 Multi-Signature Requirements

| ID | Requirement | Priority | Environment |
|----|-------------|----------|-------------|
| MS-01 | Treasury transfers > $1,000 MUST require multi-signature | Critical | Production |
| MS-02 | Token mint authority transfers MUST require multi-signature (2-of-3) | Critical | Production |
| MS-03 | Program upgrades MUST require multi-signature (3-of-5) | Critical | Production |
| MS-04 | Multi-sig configuration changes MUST require same threshold as operations | High | Production |
| MS-05 | Multi-sig signers MUST have geographically distributed access | Medium | Production |

### 6.7 Audit and Monitoring Requirements

| ID | Requirement | Priority | Environment |
|----|-------------|----------|-------------|
| AM-01 | All signing operations MUST be logged with transaction details | Critical | All |
| AM-02 | Anomaly detection MUST alert on unusual signing patterns | High | Production |
| AM-03 | Security logs MUST be retained for minimum 1 year | High | Production |
| AM-04 | Quarterly security audits MUST review key management practices | Medium | Production |
| AM-05 | Annual penetration testing MUST include key management systems | Medium | Production |

---

## 7. Compliance Considerations

### 7.1 SOC 2 Type II Requirements

Key management practices should support SOC 2 certification:

| SOC 2 Criteria | Key Management Control |
|----------------|----------------------|
| **CC6.1** - Logical access security | HSM/KMS access controls, MFA, audit logging |
| **CC6.6** - Encryption | AES-256 encryption at rest, TLS 1.3 in transit |
| **CC6.7** - Protect from malware | Air-gapped key ceremonies, secure development |
| **CC7.1** - Detection of unauthorized activities | Anomaly detection, real-time alerting |
| **CC7.2** - Monitor system components | Key access monitoring, usage analytics |

### 7.2 PCI DSS Considerations (If Applicable)

If handling payment-related cryptographic keys:

| PCI DSS Requirement | Key Management Control |
|---------------------|----------------------|
| **Requirement 3.5** | HSM storage for sensitive keys |
| **Requirement 3.6** | Documented key management procedures |
| **Requirement 3.6.4** | Annual cryptographic key changes |
| **Requirement 3.6.5** | Key retirement and destruction procedures |
| **Requirement 3.6.6** | Split knowledge and dual control |

### 7.3 GDPR Considerations

| GDPR Principle | Key Management Relevance |
|----------------|-------------------------|
| **Data minimization** | Keys contain no personal data |
| **Security** | Strong encryption protects any signed data |
| **Accountability** | Audit trails demonstrate security controls |

### 7.4 Recommended Certifications for KMS Providers

| Provider | Relevant Certifications |
|----------|------------------------|
| AWS CloudHSM | FIPS 140-2 Level 3, SOC 1/2/3, PCI DSS, HIPAA |
| Azure Key Vault | FIPS 140-2 Level 2 (Premium: Level 3), ISO 27001, SOC 1/2 |
| HashiCorp Vault | SOC 2 Type II (HCP), FIPS 140-2 (with HSM backend) |
| Thales Luna | FIPS 140-2 Level 3, Common Criteria EAL4+ |

---

## 8. Implementation Roadmap

### 8.1 Phase 1: Development Environment (Week 1-2)

| Task | Deliverable | Owner |
|------|-------------|-------|
| Set up encrypted file-based key storage | Dev key management scripts | Engineering |
| Create key generation procedures | Documentation | Security |
| Implement basic signing service | Signer module with file backend | Engineering |
| Set up key rotation scripts | Automated rotation for dev | DevOps |

### 8.2 Phase 2: Staging Environment (Week 3-4)

| Task | Deliverable | Owner |
|------|-------------|-------|
| Deploy AWS KMS or Azure Key Vault | KMS configuration | DevOps |
| Integrate signing service with KMS | Signer module with KMS backend | Engineering |
| Implement audit logging | CloudTrail/Azure Monitor integration | DevOps |
| Set up access controls and IAM policies | IAM documentation | Security |
| Test key rotation procedures | Rotation runbook | Security + DevOps |

### 8.3 Phase 3: Production Preparation (Week 5-6)

| Task | Deliverable | Owner |
|------|-------------|-------|
| Provision HSM or HSM-backed KMS | Production key infrastructure | DevOps |
| Conduct key generation ceremony | Documented ceremony, generated keys | Security |
| Set up Squads multi-sig | Multi-sig configuration | Engineering |
| Configure backup replication | Geo-redundant backups | DevOps |
| Implement Shamir's Secret Sharing for emergency keys | Distributed shares | Security |

### 8.4 Phase 4: Production Deployment (Week 7-8)

| Task | Deliverable | Owner |
|------|-------------|-------|
| Deploy signing service to production | Production deployment | DevOps |
| Transfer token authorities to production keys | On-chain authority transfer | Engineering |
| Enable monitoring and alerting | Operational dashboards | DevOps |
| Document all procedures | Complete operations runbook | Security |
| Conduct security review | Security audit report | Security |

### 8.5 Phase 5: Ongoing Operations

| Task | Frequency | Owner |
|------|-----------|-------|
| Key rotation execution | Per schedule (quarterly/monthly) | DevOps + Security |
| Backup verification | Monthly | DevOps |
| Access review | Quarterly | Security |
| Penetration testing | Annually | Security (external) |
| Disaster recovery test | Semi-annually | DevOps + Security |

---

## 9. References

### Solana Documentation

- [Solana Key Concepts](https://solana.com/docs/core/accounts)
- [SPL Token Documentation](https://spl.solana.com/token)
- [Solana CLI Key Management](https://docs.solana.com/cli/manage-key-pairs)

### Key Management Standards

- [NIST SP 800-57: Key Management Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [FIPS 140-3: Security Requirements for Cryptographic Modules](https://csrc.nist.gov/publications/detail/fips/140/3/final)
- [PCI DSS Key Management Requirements](https://www.pcisecuritystandards.org/)

### Multi-Signature Solutions

- [Squads Protocol Documentation](https://docs.squads.so/)
- [SPL Token Multisig](https://spl.solana.com/token#multisig)

### Cloud KMS Documentation

- [AWS KMS Developer Guide](https://docs.aws.amazon.com/kms/latest/developerguide/)
- [AWS CloudHSM User Guide](https://docs.aws.amazon.com/cloudhsm/latest/userguide/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)

### HSM Vendors

- [Thales Luna HSM](https://cpl.thalesgroup.com/encryption/hardware-security-modules/network-hsms)
- [YubiHSM](https://www.yubico.com/products/hardware-security-module/)

### Related FanEngagement Documents

- [Solana Capabilities Analysis](./solana-capabilities-analysis.md) - Technical analysis and cost projections
- [ShareType Tokenization Strategy](./sharetype-tokenization-strategy.md) - Token design and authority management
- [Governance Models Evaluation](./governance-models-evaluation.md) - On-chain vs off-chain voting

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Ed25519** | Elliptic curve digital signature algorithm used by Solana |
| **HSM** | Hardware Security Module - dedicated cryptographic hardware |
| **KMS** | Key Management Service - cloud-based key management |
| **BIP39** | Bitcoin Improvement Proposal for mnemonic seed phrases |
| **BIP44** | Bitcoin Improvement Proposal for hierarchical deterministic wallets |
| **PDA** | Program Derived Address - deterministic Solana account address |
| **Shamir's Secret Sharing** | Cryptographic scheme to split secrets into multiple shares |
| **Squads Protocol** | Multi-signature solution for Solana |
| **KEK** | Key Encryption Key - key used to encrypt other keys |
| **FIPS 140-2/3** | Federal standard for cryptographic module security |
| **SOC 2** | Service Organization Control 2 - security compliance framework |
| **RTO** | Recovery Time Objective - maximum acceptable downtime |
| **RPO** | Recovery Point Objective - maximum acceptable data loss |

## Appendix B: Key Ceremony Checklist

```text
Pre-Ceremony (Day -7)
□ Schedule ceremony date with all participants
□ Reserve secure room (no windows, signal blocking)
□ Prepare air-gapped workstation
□ Verify HSM firmware and software versions
□ Prepare ceremony documentation templates
□ Brief all participants on their roles
□ Confirm external auditor availability (if required)

Ceremony Day
□ Verify participant identities
□ Collect and secure all electronic devices
□ Initialize HSM in secure mode
□ Generate keys using HSM RNG
□ Verify generated public keys
□ Export encrypted key backups
□ Split emergency key using Shamir's scheme
□ Distribute shares to custodians (sealed envelopes)
□ Document all actions with timestamps
□ Sign ceremony completion certificate

Post-Ceremony
□ Securely destroy any temporary materials
□ Store HSM in secure location
□ File ceremony documentation
□ Configure production systems with new keys
□ Verify production signing operations
□ Schedule backup verification
```

## Appendix C: Emergency Response Contacts

| Role | Responsibility | Contact Method |
|------|---------------|----------------|
| Security Lead | Incident command, key rotation authorization | 24/7 on-call |
| CTO | Technical decisions, multi-sig approval | 24/7 on-call |
| DevOps Lead | Infrastructure access, deployment | 24/7 on-call |
| CEO | Executive authorization (large transfers) | Business hours + emergency |
| External Security Consultant | Forensic analysis, audit support | As needed |

---

*Document End*
