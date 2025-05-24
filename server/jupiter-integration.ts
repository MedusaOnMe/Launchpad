import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

export interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps: number;
}

export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: any;
  priceImpactPct: string;
  routePlan: any[];
}

export interface JupiterSwapResult {
  swapTransaction: string;
  success: boolean;
  error?: string;
}

export class JupiterService {
  private connection: Connection;
  private readonly JUPITER_API_BASE = 'https://quote-api.jup.ag/v6';
  private readonly SOL_MINT = 'So11111111111111111111111111111111111111112';

  constructor() {
    this.connection = new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
      'confirmed'
    );
  }

  async getQuote(params: JupiterQuoteParams): Promise<JupiterQuote | null> {
    try {
      console.log(`🔍 Getting Jupiter quote: ${params.amount} ${params.inputMint} → ${params.outputMint}`);
      
      const queryParams = new URLSearchParams({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount.toString(),
        slippageBps: params.slippageBps.toString(),
        onlyDirectRoutes: 'false',
        asLegacyTransaction: 'false'
      });

      const response = await fetch(`${this.JUPITER_API_BASE}/quote?${queryParams}`);
      
      if (!response.ok) {
        console.error('❌ Jupiter quote failed:', response.status, await response.text());
        return null;
      }

      const quote = await response.json();
      console.log(`✅ Jupiter quote received: ${quote.outAmount} tokens, impact: ${quote.priceImpactPct}%`);
      
      return quote;
    } catch (error) {
      console.error('❌ Error getting Jupiter quote:', error);
      return null;
    }
  }

  async getSwapTransaction(
    quote: JupiterQuote,
    userPublicKey: string,
    wrapAndUnwrapSol = true
  ): Promise<JupiterSwapResult> {
    try {
      console.log(`🔄 Creating Jupiter swap transaction for ${userPublicKey}`);
      
      const response = await fetch(`${this.JUPITER_API_BASE}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey,
          wrapAndUnwrapSol,
          computeUnitPriceMicroLamports: 'auto',
          asLegacyTransaction: false
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Jupiter swap transaction failed:', response.status, errorText);
        return {
          swapTransaction: '',
          success: false,
          error: `Jupiter API error: ${response.status}`
        };
      }

      const result = await response.json();
      console.log(`✅ Jupiter swap transaction created successfully`);
      
      return {
        swapTransaction: result.swapTransaction,
        success: true
      };
    } catch (error) {
      console.error('❌ Error creating Jupiter swap transaction:', error);
      return {
        swapTransaction: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async executeRealSwap(
    tokenMint: string,
    amountIn: number,
    isBuy: boolean,
    walletAddress: string,
    slippagePercent = 1
  ): Promise<{
    success: boolean;
    quote?: JupiterQuote;
    transactionBuffer?: string;
    error?: string;
    amountOut?: number;
    priceImpact?: number;
  }> {
    try {
      const inputMint = isBuy ? this.SOL_MINT : tokenMint;
      const outputMint = isBuy ? tokenMint : this.SOL_MINT;
      const amount = isBuy ? Math.floor(amountIn * 1e9) : Math.floor(amountIn * 1e6); // SOL has 9 decimals, most tokens have 6

      console.log(`🚀 Executing real Jupiter ${isBuy ? 'BUY' : 'SELL'} swap`);
      console.log(`Input: ${inputMint}, Output: ${outputMint}, Amount: ${amount}`);

      // Step 1: Get quote from Jupiter
      const quote = await this.getQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps: slippagePercent * 100 // Convert percentage to basis points
      });

      if (!quote) {
        return {
          success: false,
          error: 'Failed to get quote from Jupiter'
        };
      }

      // Step 2: Get swap transaction
      const swapResult = await this.getSwapTransaction(quote, walletAddress);
      
      if (!swapResult.success) {
        return {
          success: false,
          error: swapResult.error || 'Failed to create swap transaction'
        };
      }

      // Calculate output amounts
      const amountOut = isBuy 
        ? parseInt(quote.outAmount) / 1e6  // Tokens usually have 6 decimals
        : parseInt(quote.outAmount) / 1e9; // SOL has 9 decimals

      const priceImpact = parseFloat(quote.priceImpactPct);

      console.log(`✅ Real Jupiter swap prepared: ${amountOut.toFixed(6)} tokens, ${priceImpact.toFixed(3)}% impact`);

      return {
        success: true,
        quote,
        transactionBuffer: swapResult.swapTransaction,
        amountOut,
        priceImpact
      };

    } catch (error) {
      console.error('❌ Error executing Jupiter swap:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getTokenPrice(tokenMint: string): Promise<number | null> {
    try {
      const quote = await this.getQuote({
        inputMint: tokenMint,
        outputMint: this.SOL_MINT,
        amount: 1e6, // 1 token (assuming 6 decimals)
        slippageBps: 100
      });

      if (!quote) return null;

      const price = parseInt(quote.outAmount) / 1e9; // SOL price
      return price;
    } catch (error) {
      console.error('❌ Error getting token price:', error);
      return null;
    }
  }
}

export const jupiterService = new JupiterService();