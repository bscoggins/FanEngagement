const { Connection, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');

const privateKey = [225,65,166,0,235,117,85,232,231,137,243,188,212,253,159,105,243,119,231,160,222,81,15,156,94,123,69,86,9,226,213,217,26,237,154,14,30,218,94,94,18,69,161,167,136,167,154,164,192,193,22,19,151,225,156,204,52,194,8,182,150,99,26,209];
const keypair = Keypair.fromSecretKey(Uint8Array.from(privateKey));
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function checkBalance() {
    try {
        const balance = await connection.getBalance(keypair.publicKey);
        console.log(`Address: ${keypair.publicKey.toBase58()}`);
        console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}

checkBalance();
