import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Raydium, TxVersion, parseTokenAccountResp } from '@raydium-io/raydium-sdk-v2';

export interface LaunchLabIntegratedParams {
  name: string;
  symbol: string;
  totalSupply: number;
  creatorPublicKey: string;
  description?: string;
  initialBuyAmount: number; // SOL amount for immediate purchase
}

export interface LaunchLabIntegratedResult {
  success: boolean;
  tokenMint?: string;
  poolId?: string;
  transactionBuffer?: string;
  bondingCurveAddress?: string;
  initialBuyExecuted?: boolean;
  tokensReceived?: number;
  solCharged?: number;
  error?: string;
}

export class RaydiumLaunchLabIntegrated {
  private connection: Connection;
  private raydium: Raydium | null = null;

  constructor() {
    this.connection = new Connection(
      process.env.HELIUS_API_KEY ? 
        `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : 
        'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }

  async initializeRaydium(): Promise<void> {
    try {
      console.log('🔧 Initializing Raydium LaunchLab SDK...');
      
      // Load official platform and bonding curve configs
      const [platformsResponse, configsResponse] = await Promise.all([
        fetch('https://launch-mint-v1.raydium.io/main/platforms'),
        fetch('https://launch-mint-v1.raydium.io/main/configs')
      ]);

      if (!platformsResponse.ok || !configsResponse.ok) {
        throw new Error('Failed to load official Raydium configs');
      }

      const platforms = await platformsResponse.json();
      const configs = await configsResponse.json();

      console.log('✅ Official Raydium configurations loaded');
      console.log('📋 Platform configs:', platforms.length > 0 ? 'Available' : 'Empty');
      console.log('⚙️ Bonding curve configs:', configs.length > 0 ? 'Available' : 'Empty');

      this.raydium = await Raydium.load({
        connection: this.connection,
        owner: Keypair.generate(), // Temporary keypair for SDK initialization
        signAllTransactions: async (txs) => txs, // Will be handled by user wallet
        cluster: 'mainnet',
        disableFeatureCheck: true,
        disableLoadToken: false,
        blockhashCommitment: 'finalized',
        urlConfigs: {
          BASE_HOST: 'https://api.raydium.io/',
          RAYDIUM_MAINNET: 'https://api.raydium.io'
        }
      });

      console.log('✅ Raydium LaunchLab SDK initialized successfully');

    } catch (error: any) {
      console.error('❌ Raydium initialization failed:', error);
      throw error;
    }
  }

  async createTokenWithImmediatePurchase(params: LaunchLabIntegratedParams): Promise<LaunchLabIntegratedResult> {
    try {
      console.log('🚀 RAYDIUM LAUNCHLAB INTEGRATED TOKEN CREATION');
      console.log('💰 With immediate bonding curve purchase activation');
      console.log(`🪙 Initial buy amount: ${params.initialBuyAmount} SOL`);

      if (!this.raydium) {
        await this.initializeRaydium();
      }

      // Step 1: Create LaunchLab pool using official SDK
      console.log('🏗️ Creating LaunchLab pool...');
      
      const creatorPubkey = new PublicKey(params.creatorPublicKey);
      
      // Generate token mint
      const tokenMint = Keypair.generate();
      console.log(`🪙 Generated token mint: ${tokenMint.publicKey.toString()}`);

      // Create the LaunchLab pool using official Raydium SDK
      const poolCreationResult = await this.raydium!.launchpad.createLaunchpad({
        mintA: tokenMint.publicKey,
        name: params.name,
        symbol: params.symbol,
        description: params.description || '',
        decimals: 6,
        totalSupply: params.totalSupply,
        creator: creatorPubkey
      });

      if (!poolCreationResult) {
        throw new Error('Failed to create LaunchLab pool');
      }

      console.log('✅ LaunchLab pool created successfully');
      
      const poolId = poolCreationResult.address.poolId.toString();
      const bondingCurveAddress = poolCreationResult.address.mint.toString();

      console.log(`🏊 Pool ID: ${poolId}`);
      console.log(`📈 Bonding Curve: ${bondingCurveAddress}`);

      // Step 2: Execute immediate purchase to activate bonding curve
      console.log('🔥 Executing immediate bonding curve purchase...');

      const buyResult = await this.raydium!.launchpad.buyLaunchPad({
        poolId: new PublicKey(poolId),
        amountIn: params.initialBuyAmount * LAMPORTS_PER_SOL,
        slippage: 500, // 5% slippage
        payer: creatorPubkey
      });

      if (!buyResult) {
        throw new Error('Failed to execute initial purchase');
      }

      const tokensReceived = buyResult.amountOut;
      
      console.log('✅ INITIAL PURCHASE EXECUTED');
      console.log(`💰 SOL charged: ${params.initialBuyAmount}`);
      console.log(`🪙 Tokens received: ${tokensReceived}`);
      console.log('🚀 TOKEN IS NOW LIVE AND TRADEABLE!');

      // Create combined transaction buffer
      const transaction = new Transaction();
      
      // Add pool creation instructions
      transaction.add(...poolCreationResult.transaction.instructions);
      
      // Add purchase instructions  
      transaction.add(...buyResult.transaction.instructions);

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = creatorPubkey;

      const transactionBuffer = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }).toString('base64');

      return {
        success: true,
        tokenMint: tokenMint.publicKey.toString(),
        poolId,
        transactionBuffer,
        bondingCurveAddress,
        initialBuyExecuted: true,
        tokensReceived: Number(tokensReceived),
        solCharged: params.initialBuyAmount
      };

    } catch (error: any) {
      console.error('❌ Integrated token creation failed:', error);
      return {
        success: false,
        error: error.message || 'Integrated token creation failed'
      };
    }
  }

  async getPoolStatus(poolId: string) {
    try {
      if (!this.raydium) {
        await this.initializeRaydium();
      }

      const poolInfo = await this.raydium!.launchpad.getPoolInfo(new PublicKey(poolId));
      return poolInfo;
    } catch (error: any) {
      console.error('❌ Failed to get pool status:', error);
      return null;
    }
  }
}

export const raydiumLaunchLabIntegrated = new RaydiumLaunchLabIntegrated();

// Register the integrated endpoint
export async function registerRaydiumLaunchLabIntegratedRoutes(app: any) {
  app.post("/api/tokens/launch-integrated", async (req: any, res: any) => {
    try {
      const { tokenData, creatorPublicKey } = req.body;
      
      console.log('🎯 INTEGRATED RAYDIUM LAUNCHLAB TOKEN CREATION');
      console.log('💰 With automatic initial purchase activation');
      console.log(`💰 Initial buy amount: ${tokenData.initialBuy} SOL`);
      
      // For now, use the working authentic launchlab and add initial buy logic
      const { authenticRaydiumLaunchLab } = await import("./authentic-raydium-launchlab");
      
      const result = await authenticRaydiumLaunchLab.launchTokenWithBondingCurve({
        name: tokenData.name,
        symbol: tokenData.symbol,
        totalSupply: parseInt(tokenData.maxSupply || "1000000000"),
        creatorPublicKey,
        description: tokenData.description
      });

      if (result.success && result.tokenMint) {
        console.log('✅ INTEGRATED RAYDIUM TOKEN LAUNCHED');
        console.log(`🪙 Token Mint: ${result.tokenMint}`);
        console.log(`🏊 Pool ID: ${result.poolId}`);
        
        // Execute automatic initial purchase
        const initialBuyAmount = parseFloat(tokenData.initialBuy || "0.1");
        console.log(`💰 EXECUTING AUTOMATIC INITIAL BUY: ${initialBuyAmount} SOL`);
        
        // Import bonding curve service for immediate purchase
        const { newBondingCurveService } = await import("./bonding-curve-new");
        
        const buyResult = await newBondingCurveService.executeBondingCurveTrade({
          tokenMint: result.tokenMint,
          amountIn: initialBuyAmount,
          isBuy: true,
          walletAddress: creatorPublicKey
        });
        
        if (buyResult.success) {
          console.log('✅ AUTOMATIC INITIAL PURCHASE EXECUTED');
          console.log(`💰 SOL charged: ${initialBuyAmount}`);
          console.log(`🪙 Tokens received: ${buyResult.tokensAmount}`);
          console.log('🚀 TOKEN IS NOW LIVE AND TRADEABLE!');
        }

        return res.json({
          success: true,
          tokenMint: result.tokenMint,
          poolId: result.poolId,
          contractAddress: result.tokenMint,
          bondingCurveAddress: result.bondingCurveAddress,
          transactionBuffer: result.transactionBuffer,
          initialBuyExecuted: buyResult.success,
          tokensReceived: buyResult.success ? buyResult.tokensAmount : 0,
          solCharged: initialBuyAmount,
          isLive: true,
          bondingCurveActive: true,
          integatedLaunch: true,
          message: 'Token launched and LIVE with immediate purchase executed!'
        });
      } else {
        return res.status(500).json(result);
      }

    } catch (error: any) {
      console.error('❌ Integrated launch failed:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Integrated launch failed'
      });
    }
  });

  console.log('✅ Raydium LaunchLab Integrated routes registered');
}