import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

export async function createRealSOLTransfer(walletAddress: string, solAmount: number): Promise<string> {
  console.log(`🚀 === CREATING REAL SOL TRANSFER ===`);
  console.log(`💰 Amount: ${solAmount} SOL`);
  console.log(`👤 From: ${walletAddress}`);
  
  try {
    const connection = new Connection(process.env.HELIUS_API_KEY ? 
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : 
      'https://api.mainnet-beta.solana.com'
    );
    
    const userWallet = new PublicKey(walletAddress);
    const treasuryWallet = new PublicKey("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
    const lamportsToTransfer = Math.floor(solAmount * LAMPORTS_PER_SOL);
    
    console.log(`🎯 REAL TRANSFER DETAILS:`);
    console.log(`   From: ${userWallet.toString()}`);
    console.log(`   To: ${treasuryWallet.toString()}`);
    console.log(`   Amount: ${lamportsToTransfer} lamports (${solAmount} SOL)`);
    
    // Get fresh blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    console.log(`🔗 Blockhash: ${blockhash.substring(0, 8)}...`);
    
    // Create transaction with ONLY SOL transfer
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userWallet;
    
    // Add ONLY the SOL transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: userWallet,
        toPubkey: treasuryWallet,
        lamports: lamportsToTransfer,
      })
    );
    
    console.log(`✅ REAL TRANSACTION CREATED:`);
    console.log(`   Instructions: ${transaction.instructions.length}`);
    console.log(`   Fee Payer: ${transaction.feePayer?.toString()}`);
    console.log(`   Will transfer: ${lamportsToTransfer} lamports`);
    
    // Serialize
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    
    const base64Transaction = serializedTransaction.toString('base64');
    console.log(`📦 TRANSACTION READY: ${base64Transaction.length} chars`);
    console.log(`💸 USER WILL PAY EXACTLY: ${solAmount} SOL`);
    
    return base64Transaction;
    
  } catch (error: any) {
    console.error(`💥 REAL SOL TRANSFER FAILED:`, error);
    throw new Error(`Failed to create real SOL transfer: ${error.message}`);
  }
}