import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

export interface BondingCurveParams {
  tokenMint: string;
  amountIn: number; // SOL amount for buy, token amount for sell
  isBuy: boolean;
  walletAddress: string;
}

export interface BondingCurveResult {
  success: boolean;
  tokensAmount: number;
  newPrice: number;
  priceImpact: number;
  solCollected: number;
  isGraduated: boolean;
  transactionBuffer?: string;
  error?: string;
}

export class NewBondingCurveService {
  private connection: Connection;
  private readonly GRADUATION_THRESHOLD = 69; // SOL
  private readonly INITIAL_SUPPLY = 1000000000; // 1B tokens
  private readonly CURVE_CONSTANT = 0.000001; // Price curve steepness

  constructor() {
    this.connection = new Connection(process.env.HELIUS_API_KEY ? 
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : 
      'https://api.mainnet-beta.solana.com'
    );
  }

  calculatePrice(currentSupply: number): number {
    const soldTokens = this.INITIAL_SUPPLY - currentSupply;
    return this.CURVE_CONSTANT * soldTokens;
  }

  calculateTokensForSOL(solAmount: number, currentSupply: number): { tokensOut: number, avgPrice: number } {
    let remainingSol = solAmount;
    let tokensReceived = 0;
    let supply = currentSupply;

    while (remainingSol > 0 && supply > 0) {
      const currentPrice = this.calculatePrice(supply);
      const tokensAtPrice = Math.min(1000, supply); // Process in chunks
      const costForTokens = currentPrice * tokensAtPrice;

      if (costForTokens <= remainingSol) {
        tokensReceived += tokensAtPrice;
        remainingSol -= costForTokens;
        supply -= tokensAtPrice;
      } else {
        const tokensBuyable = Math.floor(remainingSol / currentPrice);
        tokensReceived += tokensBuyable;
        remainingSol = 0;
      }
    }

    const avgPrice = solAmount > 0 ? solAmount / tokensReceived : this.calculatePrice(currentSupply);
    return { tokensOut: tokensReceived, avgPrice };
  }

  async executeBondingCurveTrade(params: BondingCurveParams): Promise<BondingCurveResult> {
    console.log(`🚀 === NEW BONDING CURVE SYSTEM ===`);
    console.log(`💰 User purchasing: ${params.amountIn} SOL worth of tokens`);
    console.log(`👤 User wallet: ${params.walletAddress}`);
    
    try {
      const { tokenMint, amountIn, isBuy, walletAddress } = params;
      
      if (!isBuy) {
        throw new Error('Sell functionality not implemented yet');
      }
      
      // Current token state
      const currentSupply = 800000000; // 800M tokens remaining
      const solCollected = 15.5; // Current SOL in curve
      
      console.log(`📊 Current state: ${currentSupply} tokens, ${solCollected} SOL`);
      
      // Calculate tokens user will receive
      const { tokensOut, avgPrice } = this.calculateTokensForSOL(amountIn, currentSupply);
      const newSolCollected = solCollected + amountIn;
      const isGraduated = newSolCollected >= this.GRADUATION_THRESHOLD;
      
      console.log(`📈 Trade calculation: ${tokensOut} tokens for ${amountIn} SOL`);
      console.log(`💎 New total: ${newSolCollected} SOL (${isGraduated ? 'GRADUATED!' : 'Active'})`);
      
      // CREATE GUARANTEED SOL TRANSFER
      console.log(`💸 === CREATING GUARANTEED SOL TRANSFER ===`);
      
      const transactionBuffer = await this.createSOLTransfer(walletAddress, amountIn);
      
      console.log(`✅ Transaction created! User will pay exactly: ${amountIn} SOL`);
      
      const result: BondingCurveResult = {
        success: true,
        tokensAmount: tokensOut,
        newPrice: this.calculatePrice(currentSupply - tokensOut),
        priceImpact: ((avgPrice - this.calculatePrice(currentSupply)) / this.calculatePrice(currentSupply)) * 100,
        solCollected: newSolCollected,
        isGraduated,
        transactionBuffer
      };
      
      if (isGraduated) {
        console.log('🎓 Token graduated to Raydium!');
      }
      
      return result;
      
    } catch (error: any) {
      console.error('💥 New bonding curve error:', error);
      return {
        success: false,
        tokensAmount: 0,
        newPrice: 0,
        priceImpact: 0,
        solCollected: 0,
        isGraduated: false,
        error: error.message || 'Failed to execute bonding curve trade'
      };
    }
  }

  private async createSOLTransfer(walletAddress: string, solAmount: number): Promise<string> {
    console.log(`🔨 Building SOL transfer transaction`);
    console.log(`💰 Amount: ${solAmount} SOL`);
    console.log(`👤 From: ${walletAddress}`);
    
    try {
      const userWallet = new PublicKey(walletAddress);
      const treasuryWallet = new PublicKey("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
      
      // Convert SOL to lamports
      const lamportsToTransfer = Math.floor(solAmount * 1_000_000_000);
      
      console.log(`🎯 Transfer details:`);
      console.log(`   From: ${userWallet.toString()}`);
      console.log(`   To: ${treasuryWallet.toString()}`);
      console.log(`   Amount: ${lamportsToTransfer} lamports (${solAmount} SOL)`);
      
      // Get fresh blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      console.log(`🔗 Blockhash: ${blockhash.substring(0, 8)}...`);
      
      // Create transaction
      const transaction = new Transaction();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userWallet;
      
      // Create SOL transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: userWallet,
        toPubkey: treasuryWallet,
        lamports: lamportsToTransfer,
      });
      
      transaction.add(transferInstruction);
      
      console.log(`✅ Transaction built with ${transaction.instructions.length} instruction(s)`);
      console.log(`💸 SOL transfer: ${lamportsToTransfer} lamports`);
      
      // Serialize transaction
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      
      const base64Transaction = serializedTransaction.toString('base64');
      
      console.log(`📦 Transaction serialized:`);
      console.log(`   Length: ${base64Transaction.length} characters`);
      console.log(`   Preview: ${base64Transaction.substring(0, 50)}...`);
      
      return base64Transaction;
      
    } catch (error: any) {
      console.error(`💥 SOL transfer creation failed:`, error);
      throw new Error(`Failed to create SOL transfer: ${error.message}`);
    }
  }
}

export const newBondingCurveService = new NewBondingCurveService();