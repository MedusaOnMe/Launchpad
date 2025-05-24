import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { solanaService, TokenCreationParams, TokenCreationResult } from './solana-service';

interface SolanaWalletContextType {
  wallet: any | null;
  isConnected: boolean;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  createToken: (params: TokenCreationParams) => Promise<TokenCreationResult>;
  balance: number;
  user: any | null;
  showUsernameModal: boolean;
  setShowUsernameModal: (show: boolean) => void;
  setUser: (user: any) => void;
}

const SolanaWalletContext = createContext<SolanaWalletContextType | undefined>(undefined);

interface SolanaWalletProviderProps {
  children: ReactNode;
}

export function SolanaWalletProvider({ children }: SolanaWalletProviderProps) {
  const [wallet, setWallet] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  // Check for Phantom wallet
  const getPhantomWallet = () => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      return window?.solana?.isPhantom ? window.solana : null;
    }
    return null;
  };

  // Connect to wallet
  const connect = async () => {
    try {
      const phantomWallet = getPhantomWallet();
      
      if (!phantomWallet) {
        // If no wallet is available, show install prompt
        window.open('https://phantom.app/', '_blank');
        throw new Error('Please install Phantom wallet to continue');
      }

      const response = await phantomWallet.connect();
      const pubKey = response.publicKey.toString();
      
      setWallet(phantomWallet);
      setPublicKey(pubKey);
      setIsConnected(true);

      // Get SOL balance
      const solBalance = await solanaService.getSOLBalance(pubKey);
      setBalance(solBalance);

      // Check if user exists in our system
      try {
        const userResponse = await fetch(`/api/user/${pubKey}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
        } else {
          // User doesn't exist, show username modal
          setShowUsernameModal(true);
        }
      } catch (error) {
        console.error('Error checking user:', error);
        setShowUsernameModal(true);
      }

    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    if (wallet) {
      wallet.disconnect();
    }
    setWallet(null);
    setPublicKey(null);
    setIsConnected(false);
    setBalance(0);
    setUser(null);
    setShowUsernameModal(false);
  };

  // Create token on Solana blockchain
  const createToken = async (params: TokenCreationParams): Promise<TokenCreationResult> => {
    if (!wallet || !isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create token on Solana
      const result = await solanaService.createToken(wallet, params);
      
      if (result.success) {
        // Store token info in our database
        const tokenData = {
          name: params.name,
          symbol: params.symbol,
          description: params.description,
          imageUrl: params.imageUrl || null,
          website: params.website || null,
          twitter: params.twitter || null,
          telegram: params.telegram || null,
          creator: publicKey!,
          initialPrice: "0.00003",
          maxSupply: "1000000000",
          mintAddress: result.mintAddress, // Store the Solana mint address
        };

        // Save to our backend
        const response = await fetch('/api/tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tokenData),
        });

        if (!response.ok) {
          throw new Error('Failed to save token to database');
        }
      }

      return result;
    } catch (error: any) {
      console.error('Error creating token:', error);
      return {
        mintAddress: '',
        signature: '',
        success: false,
        error: error.message || 'Failed to create token'
      };
    }
  };

  // Listen for wallet events
  useEffect(() => {
    const phantomWallet = getPhantomWallet();
    
    if (phantomWallet) {
      phantomWallet.on('connect', () => {
        console.log('Wallet connected');
      });

      phantomWallet.on('disconnect', () => {
        console.log('Wallet disconnected');
        disconnect();
      });

      // Check if wallet is already connected
      if (phantomWallet.isConnected) {
        setWallet(phantomWallet);
        setPublicKey(phantomWallet.publicKey?.toString() || null);
        setIsConnected(true);
      }
    }

    return () => {
      if (phantomWallet) {
        phantomWallet.removeAllListeners();
      }
    };
  }, []);

  // Update balance periodically
  useEffect(() => {
    if (publicKey && isConnected) {
      const updateBalance = async () => {
        const solBalance = await solanaService.getSOLBalance(publicKey);
        setBalance(solBalance);
      };

      updateBalance();
      const interval = setInterval(updateBalance, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [publicKey, isConnected]);

  const value: SolanaWalletContextType = {
    wallet,
    isConnected,
    publicKey,
    connect,
    disconnect,
    createToken,
    balance,
    user,
    showUsernameModal,
    setShowUsernameModal,
    setUser,
  };

  return (
    <SolanaWalletContext.Provider value={value}>
      {children}
    </SolanaWalletContext.Provider>
  );
}

export function useSolanaWallet() {
  const context = useContext(SolanaWalletContext);
  if (context === undefined) {
    throw new Error('useSolanaWallet must be used within a SolanaWalletProvider');
  }
  return context;
}