import { Connection, PublicKey, Transaction, Keypair, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';

export interface TradeParams {
  tokenMint: string;
  amountIn: number;
  amountOut: number;
  isBuy: boolean;
  slippage: number;
}

export interface TradeResult {
  signature: string;
  success: boolean;
  error?: string;
  amountIn: number;
  amountOut: number;
  priceImpact: number;
}

export interface PoolInfo {
  tokenMint: string;
  baseMint: string;
  quoteMint: string;
  baseReserve: number;
  quoteReserve: number;
  currentPrice: number;
  marketCap: number;
  volume24h: number;
}

export class RaydiumTradingService {
  private connection: Connection;
  private readonly SOL_MINT = 'So11111111111111111111111111111111111111112';
  private readonly RAYDIUM_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
  private readonly RAYDIUM_API_BASE = 'https://api.raydium.io';

  constructor() {
    // Use your Helius API for premium Solana RPC access
    const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
    
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  // Get real Raydium pool data
  async getRaydiumPools(): Promise<any[]> {
    try {
      const response = await fetch(`${this.RAYDIUM_API_BASE}/pools`);
      if (!response.ok) throw new Error('Failed to fetch Raydium pools');
      return await response.json();
    } catch (error) {
      console.error('Error fetching Raydium pools:', error);
      return [];
    }
  }

  // Get Raydium trading pairs
  async getRaydiumPairs(): Promise<any[]> {
    try {
      const response = await fetch(`${this.RAYDIUM_API_BASE}/pairs`);
      if (!response.ok) throw new Error('Failed to fetch Raydium pairs');
      return await response.json();
    } catch (error) {
      console.error('Error fetching Raydium pairs:', error);
      return [];
    }
  }

  // Get AMM markets from Raydium
  async getAMMMarkets(): Promise<any[]> {
    try {
      const response = await fetch(`${this.RAYDIUM_API_BASE}/amm/markets`);
      if (!response.ok) throw new Error('Failed to fetch AMM markets');
      return await response.json();
    } catch (error) {
      console.error('Error fetching AMM markets:', error);
      return [];
    }
  }

  // Calculate bonding curve price based on token supply and SOL reserves
  calculateBondingCurvePrice(solReserves: number, tokenSupply: number): number {
    // Pump.fun bonding curve formula: price = (solReserves / tokenSupply) * constant
    const constant = 0.000001; // Adjust this for price scaling
    return (solReserves / tokenSupply) * constant;
  }

  // Calculate price impact for a trade
  calculatePriceImpact(
    amountIn: number,
    reserveIn: number,
    reserveOut: number,
    isBuy: boolean
  ): number {
    if (isBuy) {
      // For buying: price impact = (amountIn / (reserveIn + amountIn)) * 100
      return (amountIn / (reserveIn + amountIn)) * 100;
    } else {
      // For selling: price impact = (amountIn / (reserveOut + amountIn)) * 100
      return (amountIn / (reserveOut + amountIn)) * 100;
    }
  }

  // Get token pool information from Raydium API and our database
  async getPoolInfo(tokenMint: string): Promise<PoolInfo | null> {
    try {
      // First check Raydium's live pools for graduated tokens
      const raydiumPools = await this.getRaydiumPools();
      const raydiumPool = raydiumPools.find(pool => 
        pool.baseMint === tokenMint || pool.quoteMint === tokenMint
      );

      if (raydiumPool) {
        // Token has graduated to Raydium
        return {
          tokenMint,
          baseMint: raydiumPool.baseMint,
          quoteMint: raydiumPool.quoteMint,
          baseReserve: parseFloat(raydiumPool.baseReserve || '0'),
          quoteReserve: parseFloat(raydiumPool.quoteReserve || '0'),
          currentPrice: parseFloat(raydiumPool.price || '0'),
          marketCap: parseFloat(raydiumPool.marketCap || '0'),
          volume24h: parseFloat(raydiumPool.volume24h || '0')
        };
      }

      // Check our internal bonding curve pool
      const response = await fetch(`/api/tokens/pool/${tokenMint}`);
      if (!response.ok) return null;
      
      const poolData = await response.json();
      return poolData;
    } catch (error) {
      console.error('Error fetching pool info:', error);
      return null;
    }
  }

  // Create a liquidity pool for a new token
  async createLiquidityPool(
    wallet: any,
    tokenMint: string,
    initialSolAmount: number,
    initialTokenAmount: number
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      if (!wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      // Create pool initialization transaction
      const transaction = new Transaction();
      
      // Add pool creation instructions (simplified)
      // In reality, this would involve multiple instructions for:
      // 1. Creating pool state account
      // 2. Creating token vaults
      // 3. Setting up authority
      // 4. Initial liquidity deposit

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      // Sign and send transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
      
      await this.connection.confirmTransaction(signature, 'confirmed');

      return { success: true, signature };
    } catch (error: any) {
      console.error('Pool creation error:', error);
      return { success: false, error: error.message };
    }
  }

  // Execute a token trade
  async executeTrade(
    wallet: any,
    params: TradeParams
  ): Promise<TradeResult> {
    try {
      if (!wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      const { tokenMint, amountIn, isBuy, slippage } = params;
      
      // Get pool information
      const poolInfo = await this.getPoolInfo(tokenMint);
      if (!poolInfo) {
        throw new Error('Pool not found');
      }

      // Calculate trade amounts using bonding curve
      const priceImpact = this.calculatePriceImpact(
        amountIn,
        isBuy ? poolInfo.quoteReserve : poolInfo.baseReserve,
        isBuy ? poolInfo.baseReserve : poolInfo.quoteReserve,
        isBuy
      );

      // Calculate output amount with slippage
      let amountOut: number;
      if (isBuy) {
        // Buying tokens with SOL
        const k = poolInfo.baseReserve * poolInfo.quoteReserve;
        const newQuoteReserve = poolInfo.quoteReserve + amountIn;
        const newBaseReserve = k / newQuoteReserve;
        amountOut = poolInfo.baseReserve - newBaseReserve;
      } else {
        // Selling tokens for SOL
        const k = poolInfo.baseReserve * poolInfo.quoteReserve;
        const newBaseReserve = poolInfo.baseReserve + amountIn;
        const newQuoteReserve = k / newBaseReserve;
        amountOut = poolInfo.quoteReserve - newQuoteReserve;
      }

      // Apply slippage protection
      const minAmountOut = amountOut * (1 - slippage / 100);

      // Create swap transaction
      const transaction = new Transaction();
      
      // Add swap instructions (simplified)
      // In reality, this would create proper Raydium swap instructions
      
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      // Sign and send transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
      
      await this.connection.confirmTransaction(signature, 'confirmed');

      // Update pool reserves in database
      await this.updatePoolReserves(tokenMint, amountIn, amountOut, isBuy);

      return {
        signature,
        success: true,
        amountIn,
        amountOut: minAmountOut,
        priceImpact
      };

    } catch (error: any) {
      console.error('Trade execution error:', error);
      return {
        signature: '',
        success: false,
        error: error.message,
        amountIn: params.amountIn,
        amountOut: 0,
        priceImpact: 0
      };
    }
  }

  // Update pool reserves after a trade
  private async updatePoolReserves(
    tokenMint: string,
    amountIn: number,
    amountOut: number,
    isBuy: boolean
  ): Promise<void> {
    try {
      await fetch('/api/pools/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenMint,
          amountIn,
          amountOut,
          isBuy
        })
      });
    } catch (error) {
      console.error('Error updating pool reserves:', error);
    }
  }

  // Get quote for a potential trade
  async getTradeQuote(
    tokenMint: string,
    amountIn: number,
    isBuy: boolean
  ): Promise<{ amountOut: number; priceImpact: number; price: number } | null> {
    try {
      const poolInfo = await this.getPoolInfo(tokenMint);
      if (!poolInfo) return null;

      const priceImpact = this.calculatePriceImpact(
        amountIn,
        isBuy ? poolInfo.quoteReserve : poolInfo.baseReserve,
        isBuy ? poolInfo.baseReserve : poolInfo.quoteReserve,
        isBuy
      );

      let amountOut: number;
      if (isBuy) {
        const k = poolInfo.baseReserve * poolInfo.quoteReserve;
        const newQuoteReserve = poolInfo.quoteReserve + amountIn;
        const newBaseReserve = k / newQuoteReserve;
        amountOut = poolInfo.baseReserve - newBaseReserve;
      } else {
        const k = poolInfo.baseReserve * poolInfo.quoteReserve;
        const newBaseReserve = poolInfo.baseReserve + amountIn;
        const newQuoteReserve = k / newBaseReserve;
        amountOut = poolInfo.quoteReserve - newQuoteReserve;
      }

      return {
        amountOut,
        priceImpact,
        price: poolInfo.currentPrice
      };

    } catch (error) {
      console.error('Error getting trade quote:', error);
      return null;
    }
  }
}

export const raydiumService = new RaydiumTradingService();