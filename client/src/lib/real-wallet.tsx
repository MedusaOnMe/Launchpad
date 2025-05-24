import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

interface PhantomProvider {
  isPhantom: boolean;
  publicKey: { toBase58(): string } | null;
  isConnected: boolean;
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions(transactions: any[]): Promise<any[]>;
  on(event: string, callback: Function): void;
  removeAllListeners(): void;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

interface RealWalletContextType {
  isConnected: boolean;
  publicKey: string | null;
  balance: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  user: any | null;
  showUsernameModal: boolean;
  setShowUsernameModal: (show: boolean) => void;
  setUser: (user: any) => void;
  walletType: string | null;
  refreshBalance: () => Promise<void>;
}

const RealWalletContext = createContext<RealWalletContextType | undefined>(undefined);

interface RealWalletProviderProps {
  children: ReactNode;
}

export function RealWalletProvider({ children }: RealWalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [walletType, setWalletType] = useState<string | null>(null);

  // Solana connection (using Helius RPC for reliable balance fetching)
  const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
  const rpcUrl = heliusApiKey 
    ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
    : 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  // Fetch SOL balance via server API (using Helius)
  const fetchBalance = async (walletAddress: string) => {
    try {
      console.log(`Attempting to fetch balance for: ${walletAddress}`);
      
      const response = await fetch(`/api/balance/${walletAddress}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const solBalance = data.balance;
      
      console.log(`Successfully fetched balance: ${solBalance} SOL`);
      setBalance(solBalance);
      return solBalance;
    } catch (error: any) {
      console.error('Detailed error fetching balance:', error);
      console.error('Error message:', error?.message);
      setBalance(0);
      return 0;
    }
  };

  // Check for available wallets
  const getAvailableWallet = (): PhantomProvider | null => {
    if (typeof window !== 'undefined') {
      // Check for Phantom wallet
      if (window.solana?.isPhantom) {
        return window.solana;
      }
    }
    return null;
  };

  // Connect to wallet
  const connect = async () => {
    try {
      const wallet = getAvailableWallet();
      
      if (!wallet) {
        // Redirect to install Phantom wallet
        window.open('https://phantom.app/', '_blank');
        throw new Error('Please install Phantom wallet to continue');
      }

      const response = await wallet.connect();
      const pubKey = response.publicKey.toBase58();
      
      setIsConnected(true);
      setPublicKey(pubKey);
      setWalletType('Phantom');
      
      // Fetch real SOL balance
      await fetchBalance(pubKey);

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
      alert(error.message || 'Failed to connect wallet');
    }
  };

  // Refresh balance manually
  const refreshBalance = async () => {
    if (publicKey) {
      await fetchBalance(publicKey);
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    const wallet = getAvailableWallet();
    if (wallet && wallet.disconnect) {
      wallet.disconnect();
    }
    
    setIsConnected(false);
    setPublicKey(null);
    setBalance(0);
    setUser(null);
    setWalletType(null);
    setShowUsernameModal(false);
  };

  // Listen for wallet events
  useEffect(() => {
    const wallet = getAvailableWallet();
    
    if (wallet) {
      // Check if wallet is already connected
      if (wallet.isConnected && wallet.publicKey) {
        setIsConnected(true);
        setPublicKey(wallet.publicKey.toBase58());
        setWalletType('Phantom');
        setBalance(Math.random() * 10); // Mock balance for demo
      }

      // Listen for connect/disconnect events
      wallet.on('connect', () => {
        console.log('Wallet connected');
        if (wallet.publicKey) {
          setIsConnected(true);
          setPublicKey(wallet.publicKey.toBase58());
          setWalletType('Phantom');
        }
      });

      wallet.on('disconnect', () => {
        console.log('Wallet disconnected');
        disconnect();
      });

      return () => {
        wallet.removeAllListeners();
      };
    }
  }, []);

  const value: RealWalletContextType = {
    isConnected,
    publicKey,
    balance,
    connect,
    disconnect,
    user,
    showUsernameModal,
    setShowUsernameModal,
    setUser,
    walletType,
    refreshBalance,
  };

  return (
    <RealWalletContext.Provider value={value}>
      {children}
    </RealWalletContext.Provider>
  );
}

export function useRealWallet() {
  const context = useContext(RealWalletContext);
  if (context === undefined) {
    throw new Error('useRealWallet must be used within a RealWalletProvider');
  }
  return context;
}