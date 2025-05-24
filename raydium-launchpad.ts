import express from 'express';
import cors from 'cors';
import { Connection, Keypair, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Raydium, TxVersion, parseTokenAccountResp } from '@raydium-io/raydium-sdk-v2';
import { TokenLaunchRequest, LaunchResponse, PoolData, PoolStatus } from './launchpad-types';

// In-memory storage for pool data
const poolStorage = new Map<string, PoolData>();

export class RaydiumLaunchpadService {
  private connection: Connection;
  private raydium: Raydium | null = null;
  private wallet: Keypair;
  private pollingIntervals = new Map<string, NodeJS.Timeout>();

  constructor() {
    // Initialize Solana connection
    const rpcUrl = process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
    
    this.connection = new Connection(rpcUrl, 'confirmed');
    
    // Load wallet from environment or generate new one
    this.wallet = this.loadOrCreateWallet();
    
    console.log('🚀 Raydium LaunchLab Service initialized');
    console.log(`📍 Wallet: ${this.wallet.publicKey.toString()}`);
  }

  private loadOrCreateWallet(): Keypair {
    try {
      const privateKey = process.env.SOLANA_PRIVATE_KEY;
      if (privateKey) {
        const secretKey = new Uint8Array(JSON.parse(privateKey));
        return Keypair.fromSecretKey(secretKey);
      }
    } catch (error) {
      console.log('⚠️ No valid private key found, generating new wallet');
    }
    
    const newWallet = Keypair.generate();
    console.log('🔑 Generated new wallet. Save this private key to .env:');
    console.log(`SOLANA_PRIVATE_KEY=[${Array.from(newWallet.secretKey).join(',')}]`);
    return newWallet;
  }

  async initializeRaydium(): Promise<void> {
    if (this.raydium) return;

    try {
      console.log('🔄 Initializing Raydium SDK v2...');
      
      this.raydium = await Raydium.load({
        owner: this.wallet,
        connection: this.connection,
        cluster: 'mainnet',
        disableFeatureCheck: true,
        disableLoadToken: false,
        blockhashCommitment: 'finalized',
      });

      console.log('✅ Raydium SDK v2 initialized successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize Raydium SDK:', error.message);
      throw new Error(`Raydium initialization failed: ${error.message}`);
    }
  }

  async launchToken(params: TokenLaunchRequest): Promise<LaunchResponse> {
    try {
      console.log('🚀 LAUNCHING TOKEN VIA RAYDIUM LAUNCHLAB');
      console.log(`📋 Token: ${params.symbol} (${params.name})`);
      console.log(`💰 Total Supply: ${params.totalSupply.toLocaleString()}`);
      console.log(`🎯 Fundraising Goal: ${params.fundraisingGoal || 69} SOL`);

      await this.initializeRaydium();
      
      if (!this.raydium) {
        throw new Error('Raydium SDK not initialized');
      }

      const fundraisingGoal = params.fundraisingGoal || 69; // Default 69 SOL

      // Create bonding curve with LaunchLab
      console.log('🏗️ Creating bonding curve pool...');
      
      const createPoolResult = await this.raydium.launchpad.createPool({
        tokenInfo: {
          name: params.name,
          symbol: params.symbol,
          decimals: 6,
          supply: params.totalSupply,
          description: params.description || '',
          imageUrl: params.imageUrl || '',
          website: params.website || '',
          twitter: params.twitter || '',
          telegram: params.telegram || '',
        },
        bondingCurveConfig: {
          totalQuoteFundRaising: fundraisingGoal * LAMPORTS_PER_SOL, // 69 SOL in lamports
          migrateToAmm: true, // Auto-migration enabled
        },
        txVersion: TxVersion.V0,
      });

      if (!createPoolResult.execute) {
        throw new Error('Failed to create pool transaction');
      }

      // Execute the transaction
      console.log('📝 Executing pool creation transaction...');
      const txResult = await createPoolResult.execute();
      
      if (!txResult.txId) {
        throw new Error('Transaction execution failed');
      }

      const poolId = createPoolResult.poolId || 'unknown';
      const tokenMint = createPoolResult.tokenMint || 'unknown';

      // Store pool data
      const poolData: PoolData = {
        poolId,
        tokenMint,
        symbol: params.symbol,
        totalSupply: params.totalSupply,
        fundraisingGoal,
        wallet: this.wallet.publicKey.toString(),
        creationTxId: txResult.txId,
        quoteCollected: 0,
        migrated: false,
        createdAt: new Date(),
      };

      poolStorage.set(poolId, poolData);

      // Start polling for this pool
      this.startPolling(poolId);

      console.log('✅ TOKEN LAUNCHED SUCCESSFULLY');
      console.log(`🎯 Pool ID: ${poolId}`);
      console.log(`🪙 Token Mint: ${tokenMint}`);
      console.log(`📄 Transaction: ${txResult.txId}`);

      return {
        success: true,
        poolId,
        transactionId: txResult.txId,
        bondingCurveAddress: poolId,
        tokenMint,
      };

    } catch (error: any) {
      console.error('❌ Token launch failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  private startPolling(poolId: string): void {
    console.log(`🔄 Starting polling for pool: ${poolId}`);
    
    const interval = setInterval(async () => {
      try {
        await this.checkPoolStatus(poolId);
      } catch (error) {
        console.error(`❌ Polling error for pool ${poolId}:`, error);
      }
    }, 15000); // Every 15 seconds

    this.pollingIntervals.set(poolId, interval);
  }

  private async checkPoolStatus(poolId: string): Promise<void> {
    const poolData = poolStorage.get(poolId);
    if (!poolData || poolData.migrated) {
      return;
    }

    try {
      if (!this.raydium) {
        await this.initializeRaydium();
      }

      // Fetch current pool status
      const poolInfo = await this.raydium!.launchpad.getPoolInfo(poolId);
      
      if (!poolInfo) {
        console.log(`⚠️ Pool info not found for ${poolId}`);
        return;
      }

      const quoteCollected = poolInfo.quoteCollected / LAMPORTS_PER_SOL;
      poolData.quoteCollected = quoteCollected;

      console.log(`📊 Pool ${poolData.symbol}: ${quoteCollected.toFixed(2)}/${poolData.fundraisingGoal} SOL`);

      // Check if fundraising goal is reached
      if (quoteCollected >= poolData.fundraisingGoal) {
        console.log(`🎯 FUNDRAISING GOAL REACHED FOR ${poolData.symbol}!`);
        await this.migrateToAmm(poolId);
      }

    } catch (error) {
      console.error(`❌ Error checking pool status for ${poolId}:`, error);
    }
  }

  private async migrateToAmm(poolId: string): Promise<void> {
    const poolData = poolStorage.get(poolId);
    if (!poolData || poolData.migrated) {
      return;
    }

    try {
      console.log(`🚀 MIGRATING ${poolData.symbol} TO AMM...`);

      if (!this.raydium) {
        await this.initializeRaydium();
      }

      // Execute migration to AMM
      const migrationResult = await this.raydium!.launchpad.migrateToAmm({
        poolId,
        txVersion: TxVersion.V0,
      });

      if (!migrationResult.execute) {
        throw new Error('Failed to create migration transaction');
      }

      const txResult = await migrationResult.execute();
      
      if (!txResult.txId) {
        throw new Error('Migration transaction failed');
      }

      // Update pool data
      poolData.migrated = true;
      poolData.migrationTxId = txResult.txId;
      poolStorage.set(poolId, poolData);

      // Stop polling for this pool
      const interval = this.pollingIntervals.get(poolId);
      if (interval) {
        clearInterval(interval);
        this.pollingIntervals.delete(poolId);
      }

      console.log('✅ MIGRATION TO AMM SUCCESSFUL');
      console.log(`🎯 Pool: ${poolData.symbol}`);
      console.log(`📄 Migration TX: ${txResult.txId}`);

      // Send webhook notification if configured
      await this.sendWebhookNotification(poolData);

    } catch (error) {
      console.error(`❌ Migration failed for ${poolId}:`, error);
    }
  }

  private async sendWebhookNotification(poolData: PoolData): Promise<void> {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL || process.env.TELEGRAM_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return;
    }

    try {
      const message = `🚀 **TOKEN MIGRATED TO AMM**\n\n` +
                     `Token: ${poolData.symbol}\n` +
                     `Pool ID: ${poolData.poolId}\n` +
                     `SOL Raised: ${poolData.quoteCollected.toFixed(2)}\n` +
                     `Migration TX: ${poolData.migrationTxId}`;

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      });

      console.log('📢 Webhook notification sent');
    } catch (error) {
      console.error('❌ Webhook notification failed:', error);
    }
  }

  getPoolStatus(poolId: string): PoolStatus | null {
    const poolData = poolStorage.get(poolId);
    if (!poolData) {
      return null;
    }

    const progress = (poolData.quoteCollected / poolData.fundraisingGoal) * 100;
    const status = poolData.migrated ? 'migrated' : progress >= 100 ? 'migrated' : 'active';

    return {
      poolId: poolData.poolId,
      symbol: poolData.symbol,
      quoteCollected: poolData.quoteCollected,
      fundraisingGoal: poolData.fundraisingGoal,
      progress: Math.min(progress, 100),
      migrated: poolData.migrated,
      migrationTxId: poolData.migrationTxId,
      status,
    };
  }

  getAllPools(): PoolData[] {
    return Array.from(poolStorage.values());
  }
}

// Global service instance
export const launchpadService = new RaydiumLaunchpadService();