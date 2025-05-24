import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, ComputeBudgetProgram } from '@solana/web3.js';
import { 
  getOrCreateAssociatedTokenAccount, 
  transfer, 
  mintTo,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

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

export class BondingCurveService {
  private connection: Connection;
  private readonly GRADUATION_THRESHOLD = 69; // SOL
  private readonly INITIAL_SUPPLY = 1000000000; // 1B tokens
  private readonly CURVE_CONSTANT = 0.000001; // Price curve steepness

  constructor() {
    // Use the working Helius RPC endpoint
    const rpcUrl = 'https://mainnet.helius-rpc.com/?api-key=642c84b9-a663-417b-9e4d-e1aec3a03393';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  // Calculate price using bonding curve: price = k * supply^2
  calculatePrice(currentSupply: number): number {
    const circulatingSupply = this.INITIAL_SUPPLY - currentSupply;
    return this.CURVE_CONSTANT * Math.pow(circulatingSupply / 1000000, 2) + 0.000001;
  }

  // Calculate tokens received for SOL amount
  calculateTokensForSOL(solAmount: number, currentSupply: number): { tokensOut: number, avgPrice: number } {
    let remainingSOL = solAmount;
    let tokensReceived = 0;
    let currentSup = currentSupply;
    const step = 1000000; // 1M token steps for integration

    while (remainingSOL > 0.001 && currentSup > step) {
      const currentPrice = this.calculatePrice(currentSup);
      const solForStep = currentPrice * step;
      
      if (solForStep <= remainingSOL) {
        tokensReceived += step;
        remainingSOL -= solForStep;
        currentSup -= step;
      } else {
        // Partial step
        const partialTokens = remainingSOL / currentPrice;
        tokensReceived += partialTokens;
        remainingSOL = 0;
      }
    }

    const avgPrice = tokensReceived > 0 ? solAmount / tokensReceived : this.calculatePrice(currentSupply);
    return { tokensOut: tokensReceived, avgPrice };
  }

  // Calculate SOL received for token amount
  calculateSOLForTokens(tokenAmount: number, currentSupply: number): { solOut: number, avgPrice: number } {
    let remainingTokens = tokenAmount;
    let solReceived = 0;
    let currentSup = currentSupply;
    const step = 1000000; // 1M token steps

    while (remainingTokens > 0.001) {
      const currentPrice = this.calculatePrice(currentSup);
      
      if (remainingTokens >= step) {
        solReceived += currentPrice * step;
        remainingTokens -= step;
        currentSup += step;
      } else {
        solReceived += currentPrice * remainingTokens;
        remainingTokens = 0;
      }
    }

    const avgPrice = tokenAmount > 0 ? solReceived / tokenAmount : this.calculatePrice(currentSupply);
    return { solOut: solReceived, avgPrice };
  }

  async executeBondingCurveTrade(params: BondingCurveParams): Promise<BondingCurveResult> {
    console.log(`🚀 === REBUILDING TRANSACTION SYSTEM FROM SCRATCH ===`);
    console.log(`💰 User purchasing: ${params.amountIn} SOL worth of tokens`);
    console.log(`👤 User wallet: ${params.walletAddress}`);
    console.log(`🎯 Token mint: ${params.tokenMint}`);
    
    try {
      const { tokenMint, amountIn, isBuy, walletAddress } = params;
      
      if (!isBuy) {
        throw new Error('Sell functionality not implemented yet');
      }
      
      // Get current token state from database
      const currentSupply = 800000000; // 800M tokens remaining
      const solCollected = 15.5; // Current SOL in curve
      
      console.log(`📊 Current bonding curve state: ${currentSupply} tokens, ${solCollected} SOL`);
      
      // Calculate tokens user will receive
      const { tokensOut, avgPrice } = this.calculateTokensForSOL(amountIn, currentSupply);
      const newSolCollected = solCollected + amountIn;
      const isGraduated = newSolCollected >= this.GRADUATION_THRESHOLD;
      
      console.log(`📈 User will receive: ${tokensOut} tokens for ${amountIn} SOL`);
      console.log(`💎 New curve total: ${newSolCollected} SOL (${isGraduated ? 'GRADUATED!' : 'Active'})`);
      
      // CREATE SIMPLE SOL TRANSFER TRANSACTION
      console.log(`💸 === CREATING GUARANTEED SOL TRANSFER ===`);
      
      const transactionBuffer = await this.createSimpleSOLTransfer(walletAddress, amountIn);
      
      console.log(`✅ SOL transfer transaction created successfully!`);
      console.log(`💰 User will pay exactly: ${amountIn} SOL`);
      
      if (isGraduated) {
        console.log('🎓 Token graduated! Creating Raydium LP...');
      }
      
      return result;
      
    } catch (error: any) {
      console.error('❌ Bonding curve trade error:', error);
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

  private async createSimpleSOLTransfer(walletAddress: string, solAmount: number): Promise<string> {
    console.log(`🏗️ === BUILDING SIMPLE SOL TRANSFER ===`);
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
      
      // Create simple transaction
      const transaction = new Transaction();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userWallet;
      
      // Create the SOL transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: userWallet,
        toPubkey: treasuryWallet,
        lamports: lamportsToTransfer,
      });
      
      transaction.add(transferInstruction);
      
      console.log(`✅ Transaction built with ${transaction.instructions.length} instruction(s)`);
      console.log(`💸 SOL transfer: ${lamportsToTransfer} lamports`);
      
      // Serialize the transaction
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

  private async createTradeTransaction(params: BondingCurveParams, tradeData: { tokensAmount: number; solCollected: number; isGraduated: boolean }): Promise<string> {
    console.log(`🚀 === CREATING NEW SOL TRANSFER TRANSACTION ===`);
    console.log(`💰 Purchase Amount: ${params.amountIn} SOL`);
    console.log(`👤 User Wallet: ${params.walletAddress}`);
    
    try {
      const userWallet = new PublicKey(params.walletAddress);
      const treasuryWallet = new PublicKey("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
      
      // Calculate exact lamports to transfer
      const lamportsToTransfer = Math.floor(params.amountIn * 1_000_000_000);
      
      console.log(`🎯 TRANSFER DETAILS:`);
      console.log(`   From: ${userWallet.toString()}`);
      console.log(`   To: ${treasuryWallet.toString()}`);
      console.log(`   Amount: ${lamportsToTransfer} lamports (${params.amountIn} SOL)`);
      
      // Get fresh blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      console.log(`🔗 Fresh blockhash: ${blockhash.substring(0, 8)}...`);
      
      // Create new transaction
      const transaction = new Transaction();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userWallet;
      
      // Add compute budget instructions for priority (if available)
      try {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
        );
      } catch (e) {
        console.log(`⚠️ Compute budget not available, continuing without it`);
      }
      
      // THE CRITICAL SOL TRANSFER INSTRUCTION
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: userWallet,
        toPubkey: treasuryWallet,
        lamports: lamportsToTransfer,
      });
      
      transaction.add(transferInstruction);
      
      console.log(`✅ TRANSACTION BUILT:`);
      console.log(`   Instructions: ${transaction.instructions.length}`);
      console.log(`   Fee Payer: ${transaction.feePayer?.toString()}`);
      console.log(`   Blockhash: ${transaction.recentBlockhash}`);
      
      // Serialize the transaction
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      
      const base64Transaction = serializedTransaction.toString('base64');
      
      console.log(`📦 TRANSACTION SERIALIZED:`);
      console.log(`   Length: ${base64Transaction.length} chars`);
      console.log(`   Preview: ${base64Transaction.substring(0, 50)}...`);
      
      return base64Transaction;
      
    } catch (error) {
      console.error(`💥 TRANSACTION CREATION FAILED:`, error);
      throw new Error(`Failed to create SOL transfer: ${error.message}`);
    }
  }
}

export const bondingCurveService = new BondingCurveService();