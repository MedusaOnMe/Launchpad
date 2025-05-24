import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface MockWalletContextType {
  address: string | null;
  isConnected: boolean;
  user: any | null;
  connect: () => void;
  disconnect: () => void;
  showUsernameModal: boolean;
  setShowUsernameModal: (show: boolean) => void;
  setUser: (user: any) => void;
}

const MockWalletContext = createContext<MockWalletContextType | undefined>(undefined);

interface MockWalletProviderProps {
  children: ReactNode;
}

export function MockWalletProvider({ children }: MockWalletProviderProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  // Query to fetch user data when wallet is connected
  const { data: userData } = useQuery({
    queryKey: ["/api/user", address],
    enabled: !!address && isConnected,
    retry: false,
  });

  useEffect(() => {
    // Check if wallet was previously connected
    const savedAddress = localStorage.getItem("mock_wallet_address");
    if (savedAddress) {
      setAddress(savedAddress);
      setIsConnected(true);
    }
  }, []);

  useEffect(() => {
    if (isConnected && address && userData === undefined) {
      // User doesn't exist, show username modal
      setShowUsernameModal(true);
    } else if (userData) {
      // User exists, set user data
      setUser(userData);
      setShowUsernameModal(false);
    }
  }, [isConnected, address, userData]);

  const connect = () => {
    // Generate a mock Solana address
    const mockAddress = "7x" + Math.random().toString(36).substring(2, 8) + "9kL2";
    setAddress(mockAddress);
    setIsConnected(true);
    localStorage.setItem("mock_wallet_address", mockAddress);
  };

  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
    setUser(null);
    setShowUsernameModal(false);
    localStorage.removeItem("mock_wallet_address");
  };

  return (
    <MockWalletContext.Provider value={{ 
      address, 
      isConnected, 
      user,
      connect, 
      disconnect,
      showUsernameModal,
      setShowUsernameModal,
      setUser
    }}>
      {children}
    </MockWalletContext.Provider>
  );
}

export function useMockWallet() {
  const context = useContext(MockWalletContext);
  if (context === undefined) {
    throw new Error("useMockWallet must be used within a MockWalletProvider");
  }
  return context;
}

// Re-export everything from the service file for convenience
export * from "./mock-wallet";
