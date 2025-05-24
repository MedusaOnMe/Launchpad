// Core types for the Raydium LaunchLab integration
export interface TokenLaunchRequest {
  name: string;
  symbol: string;
  totalSupply: number;
  description?: string;
  fundraisingGoal?: number; // default 69 SOL
  imageUrl?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}

export interface LaunchResponse {
  success: boolean;
  poolId?: string;
  transactionId?: string;
  bondingCurveAddress?: string;
  tokenMint?: string;
  error?: string;
}

export interface PoolData {
  poolId: string;
  tokenMint: string;
  symbol: string;
  totalSupply: number;
  fundraisingGoal: number;
  wallet: string;
  creationTxId: string;
  quoteCollected: number;
  migrated: boolean;
  migrationTxId?: string;
  createdAt: Date;
}

export interface PoolStatus {
  poolId: string;
  symbol: string;
  quoteCollected: number;
  fundraisingGoal: number;
  progress: number; // percentage
  migrated: boolean;
  migrationTxId?: string;
  status: 'active' | 'migrated' | 'failed';
}