export interface MockWallet {
  address: string;
  publicKey: string;
  balance: number; // SOL balance
}

export interface WalletTransaction {
  signature: string;
  type: 'send' | 'receive';
  amount: number;
  timestamp: Date;
  status: 'confirmed' | 'pending' | 'failed';
}

export class MockWalletService {
  private static instance: MockWalletService;
  private wallets: Map<string, MockWallet> = new Map();
  private transactions: Map<string, WalletTransaction[]> = new Map();

  private constructor() {
    this.initializeDefaultWallets();
  }

  static getInstance(): MockWalletService {
    if (!MockWalletService.instance) {
      MockWalletService.instance = new MockWalletService();
    }
    return MockWalletService.instance;
  }

  private initializeDefaultWallets() {
    // Create some default mock wallets
    const defaultWallets = [
      { address: "7xA8B9C2D3E4F59kL2", balance: 10.5 },
      { address: "9xK5M6N7P8Q1R2S3T4", balance: 25.3 },
      { address: "3xF2G3H4J5K6L7M8N9", balance: 5.8 },
    ];

    defaultWallets.forEach(wallet => {
      const mockWallet: MockWallet = {
        address: wallet.address,
        publicKey: wallet.address, // Simplified for mock
        balance: wallet.balance,
      };
      this.wallets.set(wallet.address, mockWallet);
      this.transactions.set(wallet.address, []);
    });
  }

  generateWallet(): MockWallet {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const address = `7x${randomSuffix}9kL2`;
    
    const wallet: MockWallet = {
      address,
      publicKey: address,
      balance: Math.random() * 50 + 1, // 1-51 SOL
    };

    this.wallets.set(address, wallet);
    this.transactions.set(address, []);
    
    return wallet;
  }

  getWallet(address: string): MockWallet | undefined {
    return this.wallets.get(address);
  }

  updateBalance(address: string, newBalance: number): boolean {
    const wallet = this.wallets.get(address);
    if (wallet) {
      wallet.balance = Math.max(0, newBalance);
      return true;
    }
    return false;
  }

  transferSol(fromAddress: string, toAddress: string, amount: number): string | null {
    const fromWallet = this.wallets.get(fromAddress);
    const toWallet = this.wallets.get(toAddress);

    if (!fromWallet || !toWallet) {
      return null;
    }

    if (fromWallet.balance < amount) {
      return null; // Insufficient funds
    }

    // Execute transfer
    fromWallet.balance -= amount;
    toWallet.balance += amount;

    // Generate mock transaction signature
    const signature = this.generateSignature();

    // Record transactions
    const sendTransaction: WalletTransaction = {
      signature,
      type: 'send',
      amount: -amount,
      timestamp: new Date(),
      status: 'confirmed',
    };

    const receiveTransaction: WalletTransaction = {
      signature,
      type: 'receive',
      amount: amount,
      timestamp: new Date(),
      status: 'confirmed',
    };

    this.addTransaction(fromAddress, sendTransaction);
    this.addTransaction(toAddress, receiveTransaction);

    return signature;
  }

  getTransactions(address: string): WalletTransaction[] {
    return this.transactions.get(address) || [];
  }

  private addTransaction(address: string, transaction: WalletTransaction) {
    const transactions = this.transactions.get(address) || [];
    transactions.unshift(transaction); // Add to beginning
    
    // Keep only last 50 transactions
    if (transactions.length > 50) {
      transactions.splice(50);
    }
    
    this.transactions.set(address, transactions);
  }

  private generateSignature(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let signature = '';
    for (let i = 0; i < 88; i++) {
      signature += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return signature;
  }

  // Simulate network operations with delays
  async simulateTransaction(fromAddress: string, toAddress: string, amount: number): Promise<string> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const signature = this.transferSol(fromAddress, toAddress, amount);
        if (signature) {
          resolve(signature);
        } else {
          reject(new Error('Transaction failed'));
        }
      }, 1000 + Math.random() * 2000); // 1-3 second delay
    });
  }

  async simulateTokenPurchase(walletAddress: string, solAmount: number, tokenSymbol: string): Promise<string> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const wallet = this.wallets.get(walletAddress);
        if (!wallet || wallet.balance < solAmount) {
          reject(new Error('Insufficient SOL balance'));
          return;
        }

        // Deduct SOL from wallet
        wallet.balance -= solAmount;

        // Create transaction record
        const transaction: WalletTransaction = {
          signature: this.generateSignature(),
          type: 'send',
          amount: -solAmount,
          timestamp: new Date(),
          status: 'confirmed',
        };

        this.addTransaction(walletAddress, transaction);
        resolve(transaction.signature);
      }, 1500 + Math.random() * 2000); // 1.5-3.5 second delay
    });
  }

  async simulateTokenSale(walletAddress: string, solAmount: number, tokenSymbol: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const wallet = this.wallets.get(walletAddress);
        if (wallet) {
          // Add SOL to wallet
          wallet.balance += solAmount;

          // Create transaction record
          const transaction: WalletTransaction = {
            signature: this.generateSignature(),
            type: 'receive',
            amount: solAmount,
            timestamp: new Date(),
            status: 'confirmed',
          };

          this.addTransaction(walletAddress, transaction);
        }
        resolve(this.generateSignature());
      }, 1500 + Math.random() * 2000); // 1.5-3.5 second delay
    });
  }

  // Get formatted balance for display
  getFormattedBalance(address: string): string {
    const wallet = this.wallets.get(address);
    return wallet ? `${wallet.balance.toFixed(4)} SOL` : '0.0000 SOL';
  }

  // Check if address is valid format
  isValidAddress(address: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) || 
           /^[0-9]x[A-Za-z0-9]{10,20}$/.test(address); // Our mock format
  }
}

// Export singleton instance
export const mockWalletService = MockWalletService.getInstance();

// Utility functions for common operations
export function generateMockWalletAddress(): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `7x${randomSuffix}9kL2`;
}

export function formatSolAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M SOL`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(2)}K SOL`;
  } else {
    return `${amount.toFixed(4)} SOL`;
  }
}

export function validateSolAmount(amount: string): boolean {
  const parsed = parseFloat(amount);
  return !isNaN(parsed) && parsed > 0 && parsed <= 1000000;
}
