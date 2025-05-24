import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  createMintToInstruction, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';

export interface LetsBonkLaunchParams {
  tokenMint: string;
  creatorWallet: string;
  initialBuyAmount: number; // SOL amount creator wants to buy at launch
  totalSupply: number; // Total token supply (1B)
}

export interface LetsBonkLaunchResult {
  success: boolean;
  creatorTokens: number;
  remainingSupply: number;
  initialPrice: number;
  transactionBuffer: string;
  error?: string;
}

export class LetsBonkLaunchService {
  private connection: Connection;
  private readonly TREASURY_WALLET = new PublicKey("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
  private readonly TOTAL_SUPPLY = 1000000000; // 1B tokens
  private readonly GRADUATION_THRESHOLD = 69; // 69 SOL to graduate

  constructor() {
    this.connection = new Connection(
      process.env.HELIUS_API_KEY ? 
        `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : 
        'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }

  async executeLaunch(params: LetsBonkLaunchParams): Promise<LetsBonkLaunchResult> {
    try {
      console.log('🚀 EXECUTING LETSBONK-STYLE TOKEN LAUNCH');
      console.log(`💰 Creator initial buy: ${params.initialBuyAmount} SOL`);
      console.log(`🪙 Total supply: ${params.totalSupply} tokens`);
      console.log(`👤 Creator: ${params.creatorWallet}`);

      const creatorPubkey = new PublicKey(params.creatorWallet);
      const tokenMint = new PublicKey(params.tokenMint);
      
      // Calculate creator's token allocation
      const creatorTokens = this.calculateCreatorTokens(params.initialBuyAmount);
      const remainingSupply = this.TOTAL_SUPPLY - creatorTokens;
      const initialPrice = params.initialBuyAmount / creatorTokens;

      console.log(`🎯 Creator allocation: ${creatorTokens} tokens`);
      console.log(`📈 Remaining for bonding curve: ${remainingSupply} tokens`);
      console.log(`💵 Initial price: ${initialPrice.toFixed(8)} SOL per token`);

      // Get latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('finalized');
      
      // Create launch transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: creatorPubkey,
      });

      // 1. Creator pays SOL to treasury (like letsbonk)
      const solAmount = Math.floor(params.initialBuyAmount * LAMPORTS_PER_SOL);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: creatorPubkey,
          toPubkey: this.TREASURY_WALLET,
          lamports: solAmount,
        })
      );

      // 2. Mint creator's tokens to their wallet
      const creatorTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        creatorPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Create token account for creator
      transaction.add(
        createAssociatedTokenAccountInstruction(
          creatorPubkey, // payer
          creatorTokenAccount, // associatedToken
          creatorPubkey, // owner
          tokenMint, // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );

      // Mint creator's tokens
      const tokensToMint = Math.floor(creatorTokens * Math.pow(10, 6)); // 6 decimals
      transaction.add(
        createMintToInstruction(
          tokenMint, // mint
          creatorTokenAccount, // destination
          this.TREASURY_WALLET, // authority (treasury controls minting)
          tokensToMint // amount
        )
      );

      console.log('💰 CREATOR PURCHASE TRANSACTION PREPARED');
      console.log(`💸 SOL payment: ${params.initialBuyAmount} SOL`);
      console.log(`🪙 Tokens minted: ${creatorTokens} (${tokensToMint} with decimals)`);
      console.log(`📊 Remaining supply for public: ${remainingSupply} tokens`);

      // Serialize transaction for client-side signing
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const transactionBuffer = serialized.toString('base64');

      console.log('🎉 LETSBONK-STYLE LAUNCH READY FOR SIGNING');

      return {
        success: true,
        creatorTokens,
        remainingSupply,
        initialPrice,
        transactionBuffer
      };

    } catch (error: any) {
      console.error('❌ LetsBonk launch failed:', error);
      return {
        success: false,
        creatorTokens: 0,
        remainingSupply: 0,
        initialPrice: 0,
        transactionBuffer: '',
        error: error.message || 'Launch failed'
      };
    }
  }

  private calculateCreatorTokens(solAmount: number): number {
    // LetsBonk formula: Creator gets tokens based on their SOL investment
    // Early investors get better rates
    const baseRate = 50; // 50 tokens per SOL for creator
    return Math.floor(solAmount * baseRate);
  }

  calculateBondingCurvePrice(tokensRemaining: number): number {
    // Price increases as fewer tokens remain
    const soldTokens = this.TOTAL_SUPPLY - tokensRemaining;
    const progress = soldTokens / this.TOTAL_SUPPLY;
    
    // Price starts low and increases exponentially
    const basePrice = 0.000001; // Very low starting price
    const priceMultiplier = 1 + (progress * 10); // Up to 10x price increase
    
    return basePrice * priceMultiplier;
  }

  calculateTokensForSOL(solAmount: number, currentProgress: number): number {
    // Bonding curve: fewer tokens as price increases
    const currentPrice = this.calculateBondingCurvePrice(currentProgress);
    return Math.floor(solAmount / currentPrice);
  }

  isReadyForGraduation(solCollected: number): boolean {
    return solCollected >= this.GRADUATION_THRESHOLD;
  }
}

export const letsBonkLaunchService = new LetsBonkLaunchService();