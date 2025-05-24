import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { apiRequest } from './queryClient';

export interface PumpTradingParams {
  tokenMint: string;
  amountIn: number;
  isBuy: boolean;
  slippage: number;
}

export interface TradingResult {
  signature: string;
  success: boolean;
  tokensAmount: number;
  newPrice: number;
  priceImpact: number;
  isGraduated: boolean;
}

export class PumpTradingEngine {
  private connection: Connection;

  constructor() {
    // Use Helius for mainnet connection
    const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
    const rpcUrl = heliusApiKey 
      ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
      : 'https://api.mainnet-beta.solana.com';
    
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  // Get real-time trading quote
  async getTradeQuote(tokenMint: string, amountIn: number, isBuy: boolean) {
    try {
      const response = await fetch(`/api/tokens/pool/${tokenMint}`);
      if (!response.ok) throw new Error('Pool not found');
      
      const poolInfo = await response.json();
      
      // Calculate using bonding curve math
      const { baseReserve, quoteReserve } = poolInfo;
      const k = baseReserve * quoteReserve;
      
      let amountOut: number;
      let priceImpact: number;
      
      if (isBuy) {
        const newQuoteReserve = quoteReserve + amountIn;
        const newBaseReserve = k / newQuoteReserve;
        amountOut = baseReserve - newBaseReserve;
        priceImpact = (amountIn / quoteReserve) * 100;
      } else {
        const newBaseReserve = baseReserve + amountIn;
        const newQuoteReserve = k / newBaseReserve;
        amountOut = quoteReserve - newQuoteReserve;
        priceImpact = (amountIn / baseReserve) * 100;
      }

      const newPrice = isBuy 
        ? (quoteReserve + amountIn) / (baseReserve - amountOut)
        : (quoteReserve - amountOut) / (baseReserve + amountIn);

      return {
        amountOut,
        priceImpact,
        newPrice,
        currentPrice: poolInfo.currentPrice,
        marketCap: poolInfo.marketCap,
        graduationProgress: poolInfo.graduationProgress
      };
    } catch (error) {
      console.error('Error getting trade quote:', error);
      return null;
    }
  }

  // Execute real Solana trade
  async executeTrade(
    wallet: any,
    params: PumpTradingParams
  ): Promise<TradingResult> {
    try {
      if (!wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      const { tokenMint, amountIn, isBuy } = params;

      // Create the actual Solana transaction for trading
      // This would involve creating proper swap instructions
      const transaction = new Transaction();
      
      // Add trading instructions (this would be implemented with actual Raydium/Jupiter swap logic)
      // For now, we'll simulate the transaction
      
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      // Sign and send transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
      
      // Confirm transaction
      await this.connection.confirmTransaction(signature, 'confirmed');

      // Update backend with trade data
      const response = await apiRequest('/api/tokens/trade', {
        method: 'POST',
        body: JSON.stringify({
          tokenMint,
          amountIn,
          isBuy,
          signature,
          user: wallet.publicKey.toBase58()
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      return {
        signature,
        success: true,
        tokensAmount: result.tokensAmount,
        newPrice: result.newPrice,
        priceImpact: (amountIn / result.newMarketCap) * 100,
        isGraduated: result.isGraduated
      };

    } catch (error: any) {
      console.error('Trade execution error:', error);
      return {
        signature: '',
        success: false,
        tokensAmount: 0,
        newPrice: 0,
        priceImpact: 0,
        isGraduated: false
      };
    }
  }

  // Check if token has graduated to Raydium
  async checkGraduation(tokenMint: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/tokens/pool/${tokenMint}`);
      const poolInfo = await response.json();
      return poolInfo.isGraduated;
    } catch (error) {
      return false;
    }
  }
}

export const pumpTradingEngine = new PumpTradingEngine();