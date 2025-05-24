import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  createMintToInstruction, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';

export interface SimpleRaydiumTrade {
  tokenMint: string;
  amountIn: number;
  walletAddress: string;
}

export interface SimpleRaydiumResult {
  success: boolean;
  tokensOut: number;
  solTransferred: number;
  priceImpact: number;
  transactionBuffer: string;
  error?: string;
}

export class SimpleRaydiumTrading {
  private connection: Connection;
  private readonly TREASURY_WALLET = new PublicKey("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");

  constructor() {
    this.connection = new Connection(
      process.env.HELIUS_API_KEY ? 
        `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : 
        'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }

  async executeTrade(params: SimpleRaydiumTrade): Promise<SimpleRaydiumResult> {
    try {
      console.log('🚀 EXECUTING SIMPLE RAYDIUM-STYLE TRADE');
      console.log(`💰 Amount: ${params.amountIn} SOL`);
      console.log(`🎯 Token: ${params.tokenMint}`);
      console.log(`👤 Wallet: ${params.walletAddress}`);

      const walletPubkey = new PublicKey(params.walletAddress);
      
      // Get latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('finalized');
      
      // Create transaction with SOL transfer
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: walletPubkey,
      });

      // Calculate tokens out using bonding curve math
      const tokensOut = this.calculateTokensOut(params.amountIn);
      const priceImpact = this.calculatePriceImpact(params.amountIn);

      // Calculate SOL amount in lamports
      const solAmount = Math.floor(params.amountIn * LAMPORTS_PER_SOL);
      
      // Add SOL transfer instruction - THIS ACTUALLY CHARGES THE USER
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: walletPubkey,
          toPubkey: this.TREASURY_WALLET,
          lamports: solAmount,
        })
      );

      // Add token minting to user's wallet
      const tokenMint = new PublicKey(params.tokenMint);
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        walletPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Create associated token account if it doesn't exist
      transaction.add(
        createAssociatedTokenAccountInstruction(
          walletPubkey, // payer
          userTokenAccount, // associatedToken
          walletPubkey, // owner
          tokenMint, // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );

      // Mint tokens to user's wallet
      const tokensToMint = Math.floor(tokensOut * Math.pow(10, 6)); // Assuming 6 decimals
      transaction.add(
        createMintToInstruction(
          tokenMint, // mint
          userTokenAccount, // destination
          this.TREASURY_WALLET, // authority (treasury controls minting)
          tokensToMint // amount
        )
      );

      console.log('🪙 TOKEN MINTING INSTRUCTIONS ADDED');
      console.log(`💰 Will mint ${tokensOut} tokens (${tokensToMint} with decimals)`);
      console.log(`📥 To user account: ${userTokenAccount.toString()}`);

      console.log('✅ SOL TRANSFER INSTRUCTION ADDED');
      console.log(`💸 Will transfer: ${params.amountIn} SOL (${solAmount} lamports)`);
      console.log(`📤 From: ${walletPubkey.toString()}`);
      console.log(`📥 To: ${this.TREASURY_WALLET.toString()}`);

      console.log(`🎯 COMPLETE TRADE: ${params.amountIn} SOL → ${tokensOut} tokens`);
      console.log(`📊 Price impact: ${priceImpact.toFixed(2)}%`);

      // Serialize transaction for client-side signing
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const transactionBuffer = serialized.toString('base64');

      console.log('🎉 RAYDIUM-STYLE TRADE TRANSACTION READY');
      console.log(`📦 Transaction buffer: ${transactionBuffer.length} characters`);

      return {
        success: true,
        tokensOut,
        solTransferred: params.amountIn,
        priceImpact,
        transactionBuffer
      };

    } catch (error: any) {
      console.error('❌ Simple Raydium trade failed:', error);
      return {
        success: false,
        tokensOut: 0,
        solTransferred: 0,
        priceImpact: 0,
        transactionBuffer: '',
        error: error.message || 'Trade execution failed'
      };
    }
  }

  private calculateTokensOut(solAmount: number): number {
    // Bonding curve formula: tokens = SOL * rate
    // Rate decreases as more SOL is collected (simulating price increase)
    const baseRate = 25; // 25 tokens per SOL initially
    const currentSolCollected = 15.5; // Mock current progress
    const totalWithNew = currentSolCollected + solAmount;
    
    // Price increases as we approach 69 SOL graduation
    const priceMultiplier = 1 + (totalWithNew / 69) * 0.5; // Up to 50% price increase
    const effectiveRate = baseRate / priceMultiplier;
    
    return Math.floor(solAmount * effectiveRate);
  }

  private calculatePriceImpact(solAmount: number): number {
    // Larger purchases have higher price impact
    return Math.min(solAmount * 0.1, 5.0); // Max 5% impact
  }

  async getTradeQuote(solAmount: number): Promise<{
    tokensOut: number;
    priceImpact: number;
    estimatedPrice: number;
  }> {
    const tokensOut = this.calculateTokensOut(solAmount);
    const priceImpact = this.calculatePriceImpact(solAmount);
    const estimatedPrice = solAmount / tokensOut;

    return {
      tokensOut,
      priceImpact,
      estimatedPrice
    };
  }
}

export const simpleRaydiumTrading = new SimpleRaydiumTrading();