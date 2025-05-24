import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

export async function createWorkingSOLTransfer(walletAddress: string, solAmount: number): Promise<string> {
  console.log(`🚀 === CREATING WORKING SOL TRANSFER ===`);
  console.log(`💰 Transfer Amount: ${solAmount} SOL (${solAmount * LAMPORTS_PER_SOL} lamports)`);
  console.log(`👤 From Wallet: ${walletAddress}`);
  
  const connection = new Connection(
    process.env.HELIUS_API_KEY ? 
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : 
      'https://api.mainnet-beta.solana.com',
    'confirmed'
  );
  
  const fromPubkey = new PublicKey(walletAddress);
  const toPubkey = new PublicKey("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"); // Treasury
  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
  
  console.log(`📤 Transfer Details:`);
  console.log(`   From: ${fromPubkey.toString()}`);
  console.log(`   To: ${toPubkey.toString()}`);
  console.log(`   Amount: ${lamports} lamports`);
  
  // Get latest blockhash
  const { blockhash } = await connection.getLatestBlockhash('finalized');
  console.log(`🔗 Blockhash: ${blockhash.substring(0, 8)}...`);
  
  // Create transaction with ONLY SOL transfer
  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: fromPubkey,
  });
  
  // Add SOL transfer instruction
  transaction.add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports,
    })
  );
  
  console.log(`✅ Transaction created with ${transaction.instructions.length} instruction(s)`);
  console.log(`💸 Will transfer exactly ${solAmount} SOL (${lamports} lamports)`);
  
  // Serialize transaction
  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  
  const base64 = serialized.toString('base64');
  console.log(`📦 Transaction serialized: ${base64.length} characters`);
  console.log(`🎯 User will pay exactly ${solAmount} SOL + network fees`);
  
  return base64;
}