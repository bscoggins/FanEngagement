import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Connection, Keypair, Transaction, TransactionInstruction, PublicKey, sendAndConfirmTransaction, SystemProgram, ComputeBudgetProgram } from '@solana/web3.js';
import bs58 from 'bs58';
import winston from 'winston';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

app.use(cors());
app.use(express.json());

// Configuration
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;
const PROGRAM_ID_STR = process.env.SOLANA_PROGRAM_ID;

if (!PRIVATE_KEY) {
  logger.error('SOLANA_PRIVATE_KEY is not set');
  process.exit(1);
}

let payer: Keypair;
try {
  if (PRIVATE_KEY.trim().startsWith('[')) {
      const raw = Uint8Array.from(JSON.parse(PRIVATE_KEY));
      payer = Keypair.fromSecretKey(raw);
  } else {
      payer = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
  }
} catch (e) {
  logger.error('Invalid SOLANA_PRIVATE_KEY');
  process.exit(1);
}

const connection = new Connection(RPC_URL, 'confirmed');
let programId: PublicKey;

try {
    if (PROGRAM_ID_STR) {
        programId = new PublicKey(PROGRAM_ID_STR);
    } else {
        logger.warn('SOLANA_PROGRAM_ID not set. Transactions will fail.');
    }
} catch (e) {
    logger.error('Invalid SOLANA_PROGRAM_ID');
}

// Health check
app.get('/v1/adapter/health', (req, res) => {
  res.json({ status: 'ok', network: 'solana', rpcUrl: RPC_URL });
});

// Get Platform Wallet Info
app.get('/v1/adapter/wallet', async (req, res) => {
    try {
        const balance = await connection.getBalance(payer.publicKey);
        res.json({
            address: payer.publicKey.toBase58(),
            balance: balance / 1000000000, // Convert lamports to SOL
            currency: 'SOL'
        });
    } catch (error: any) {
        logger.error('Error fetching wallet info:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fetch transaction details
app.get('/v1/adapter/transactions/:signature', async (req, res) => {
    const { signature } = req.params;
    logger.info(`Fetching transaction: ${signature}`);
    try {
        // For now, since we are using a mock environment or might not have full history,
        // we can try to fetch it. If it fails or is a mock signature, we return a mock response
        // to satisfy the UI requirements if the signature looks like a mock one (e.g. "mock-tx-...")
        
        if (signature.startsWith('mock-') || signature.length < 64) {
             return res.json({
                signature,
                slot: 123456,
                blockTime: Math.floor(Date.now() / 1000),
                status: 'confirmed',
                mock: true
            });
        }

        let tx = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!tx) {
            logger.warn(`Transaction not found with 'confirmed' commitment: ${signature}. Trying 'finalized'...`);
            tx = await connection.getTransaction(signature, {
                commitment: 'finalized',
                maxSupportedTransactionVersion: 0
            });
        }

        if (!tx) {
            // Check signature status to see if it exists but maybe failed or expired
            const status = await connection.getSignatureStatus(signature);
            logger.warn(`Transaction not found on chain: ${signature}. Status: ${JSON.stringify(status)}`);
            
            if (status.value?.confirmationStatus) {
                 // It exists but getTransaction failed? Maybe it's too old or not indexed?
                 // We can return a partial response based on status
                 return res.json({
                     signature,
                     slot: status.value.slot,
                     blockTime: null, // We don't have block time from status
                     err: status.value.err,
                     status: status.value.err ? 'failed' : status.value.confirmationStatus,
                     note: "Transaction found via status check but full details unavailable"
                 });
            }

            // Fallback: If we are in a local development environment, and the transaction was recently sent,
            // it might be that the validator was reset or the transaction history is not fully indexed.
            // For the purpose of this demo/dev environment, if we can't find it on chain but we have a valid signature format,
            // we might want to return a "mock" success to avoid blocking the UI flow, OR just return 404.
            // Given the user's issue with "Issued Shares" disappearing, let's try to be more resilient.
            // However, returning fake data is bad practice.
            // Let's try one more thing: fetch with 'confirmed' commitment again but without maxSupportedTransactionVersion
            // Sometimes older transactions might be fetched differently?
            // Actually, 'processed' is not a valid Finality for getTransaction.
            
            return res.status(404).json({ error: 'Transaction not found' });
        }

        logger.info(`Transaction found: ${signature}, slot: ${tx.slot}`);

        // Extract instruction data (payload)
        let transactionData = null;
        try {
            const message = tx.transaction.message;
            // Handle compiled instructions (VersionedMessage) or instructions (Message)
            // @ts-ignore - accessing properties that might differ based on version
            const instructions = message.compiledInstructions || message.instructions;

            if (instructions) {
                for (const ix of instructions) {
                    try {
                        // ix.data is Uint8Array or Buffer
                        const buffer = Buffer.from(ix.data);
                        const str = buffer.toString('utf8');
                        
                        // Check if it looks like our JSON log entry
                        if (str.includes('"type":') && str.includes('"payload":')) {
                            transactionData = JSON.parse(str);
                            break;
                        }
                    } catch (e) {
                        // Continue to next instruction if parsing fails
                    }
                }
            }
        } catch (e) {
            logger.warn('Failed to extract transaction data', e);
        }

        res.json({
            signature,
            slot: tx.slot,
            blockTime: tx.blockTime,
            err: tx.meta?.err,
            status: tx.meta?.err ? 'failed' : 'confirmed',
            data: transactionData
        });
    } catch (error: any) {
        logger.error('Error fetching transaction:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fetch account details
app.get('/v1/adapter/accounts/:address', async (req, res) => {
    const { address } = req.params;
    
    if (address.startsWith('mock-')) {
         return res.json({
             address,
             lamports: 0,
             owner: SystemProgram.programId.toBase58(),
             executable: false,
             rentEpoch: 0,
             mock: true,
             note: "Mock account"
         });
    }

    try {
        const pubKey = new PublicKey(address);
        const accountInfo = await connection.getAccountInfo(pubKey);

        if (!accountInfo) {
            logger.warn(`Account not found on chain: ${address}`);
            return res.status(404).json({ error: 'Account not found' });
        }

        res.json({
            address,
            lamports: accountInfo.lamports,
            owner: accountInfo.owner.toBase58(),
            executable: accountInfo.executable,
            rentEpoch: accountInfo.rentEpoch
        });
    } catch (error: any) {
        logger.error('Error fetching account:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create a new wallet
app.post('/v1/adapter/wallets', async (req, res) => {
    try {
        const keypair = Keypair.generate();
        // In a real production system, we would NOT return the private key like this.
        // It should be encrypted or stored in a secure vault.
        // For this demo/prototype, we return it so the backend can store it.
        res.json({
            address: keypair.publicKey.toBase58(),
            privateKey: Buffer.from(keypair.secretKey).toString('base64')
        });
    } catch (error: any) {
        logger.error('Error creating wallet:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generic endpoint to log any action
app.post('/v1/adapter/*', async (req, res) => {
    const apiKey = req.headers['x-adapter-api-key'];
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const path = req.path.replace('/v1/adapter/', '');
        const payload = req.body;
        
        const logEntry = JSON.stringify({
            type: path,
            payload: payload,
            timestamp: new Date().toISOString()
        });

        const buffer = Buffer.from(logEntry, 'utf-8');

        if (!programId) {
             return res.status(500).json({ error: 'Program ID not configured' });
        }

        const transaction = new Transaction();

        // Increase Compute Unit limit to handle larger payloads
        const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({ 
            units: 400000 
        });
        transaction.add(modifyComputeUnits);

        const signers = [payer];

        // Add the log instruction
        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: payer.publicKey, isSigner: true, isWritable: false }
            ],
            programId: programId,
            data: buffer
        });
        transaction.add(instruction);

        // Handle specific entity creation to ensure accounts exist on chain
        let newAccount: Keypair | null = null;

        if (path === 'organizations' || path === 'proposals' || path === 'share-types') {
            newAccount = Keypair.generate();
            const rentExemption = await connection.getMinimumBalanceForRentExemption(0);
            
            const createAccountIx = SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: newAccount.publicKey,
                lamports: rentExemption,
                space: 0,
                programId: SystemProgram.programId
            });
            
            transaction.add(createAccountIx);
            signers.push(newAccount);
        }

        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            signers
        );

        logger.info(`Transaction sent: ${signature}`);

        // Generate response based on operation type
        let responseData: any = {
            success: true,
            transactionId: signature,
            blockExplorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${RPC_URL}`
        };

        if (path === 'organizations') {
            responseData.accountAddress = newAccount!.publicKey.toBase58();
        } else if (path === 'share-types') {
            responseData.mintAddress = newAccount!.publicKey.toBase58();
        } else if (path === 'proposals') {
            responseData.proposalAddress = newAccount!.publicKey.toBase58();
        } else if (path === 'share-issuances') {
            // For issuances, return the recipient address (from payload if available, or mock)
            responseData.recipientAddress = payload.recipientAddress || Keypair.generate().publicKey.toBase58();
        }

        res.json(responseData);

    } catch (error: any) {
        logger.error('Error sending transaction:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
  logger.info(`Solana Adapter listening on port ${port}`);
});
