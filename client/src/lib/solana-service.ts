import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo, 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress
} from '@solana/spl-token';

export interface TokenCreationParams {
  name: string;
  symbol: string;
  description: string;
  imageUrl?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  decimals?: number;
  supply?: number;
}

export interface TokenCreationResult {
  mintAddress: string;
  signature: string;
  success: boolean;
  error?: string;
}

export class SolanaTokenService {
  private connection: Connection;
  private readonly HELIUS_MAINNET_RPC: string;
  private readonly HELIUS_DEVNET_RPC: string;

  constructor(network: 'devnet' | 'mainnet-beta' = 'mainnet-beta') {
    // Use Helius API for premium Solana RPC access
    const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
    
    this.HELIUS_MAINNET_RPC = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
    this.HELIUS_DEVNET_RPC = `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`;
    
    const rpcUrl = network === 'mainnet-beta' ? this.HELIUS_MAINNET_RPC : this.HELIUS_DEVNET_RPC;
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async createToken(
    wallet: any, // Wallet adapter instance
    params: TokenCreationParams
  ): Promise<TokenCreationResult> {
    try {
      if (!wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      // Generate a new keypair for the mint
      const mintKeypair = Keypair.generate();
      
      // Default token parameters
      const decimals = params.decimals || 9;
      const supply = params.supply || 1000000000; // 1 billion tokens

      // Calculate rent for mint account
      const mintRent = await this.connection.getMinimumBalanceForRentExemption(82);

      // Create mint account instruction
      const createMintAccountInstruction = SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: 82,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      });

      // Initialize mint instruction
      const initializeMintInstruction = await import('@solana/spl-token').then(spl => 
        spl.createInitializeMintInstruction(
          mintKeypair.publicKey,
          decimals,
          wallet.publicKey,
          wallet.publicKey,
          TOKEN_PROGRAM_ID
        )
      );

      // Get associated token account for the creator
      const associatedTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Create associated token account instruction
      const createATAInstruction = await import('@solana/spl-token').then(spl =>
        spl.createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          associatedTokenAccount,
          wallet.publicKey,
          mintKeypair.publicKey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );

      // Mint tokens instruction
      const mintToInstruction = await import('@solana/spl-token').then(spl =>
        spl.createMintToInstruction(
          mintKeypair.publicKey,
          associatedTokenAccount,
          wallet.publicKey,
          supply * Math.pow(10, decimals),
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Create transaction
      const transaction = new Transaction().add(
        createMintAccountInstruction,
        initializeMintInstruction,
        createATAInstruction,
        mintToInstruction
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      // Sign transaction with mint keypair
      transaction.partialSign(mintKeypair);

      // Send transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());

      // Confirm transaction
      await this.connection.confirmTransaction(signature, 'confirmed');

      return {
        mintAddress: mintKeypair.publicKey.toBase58(),
        signature,
        success: true
      };

    } catch (error: any) {
      console.error('Token creation error:', error);
      return {
        mintAddress: '',
        signature: '',
        success: false,
        error: error.message || 'Failed to create token'
      };
    }
  }

  async getTokenBalance(mintAddress: string, walletAddress: string): Promise<number> {
    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const walletPublicKey = new PublicKey(walletAddress);
      
      const associatedTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        walletPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const balance = await this.connection.getTokenAccountBalance(associatedTokenAccount);
      return balance.value.uiAmount || 0;
    } catch (error) {
      console.error('Error getting token balance:', error);
      return 0;
    }
  }

  async getSOLBalance(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting SOL balance:', error);
      return 0;
    }
  }

  // Create token metadata (requires additional metadata program)
  async createTokenMetadata(
    mintAddress: string,
    name: string,
    symbol: string,
    description: string,
    imageUrl?: string
  ) {
    // This would integrate with Metaplex for token metadata
    // For now, we'll store metadata off-chain
    const metadata = {
      name,
      symbol,
      description,
      image: imageUrl,
      external_url: '',
      attributes: []
    };

    // In a real implementation, you'd upload this to IPFS or Arweave
    // and create on-chain metadata using Metaplex
    return metadata;
  }
}

export const solanaService = new SolanaTokenService('devnet');