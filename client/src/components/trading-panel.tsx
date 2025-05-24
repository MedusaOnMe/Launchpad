import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface TradingPanelProps {
  token: {
    id: number;
    symbol: string;
    name: string;
    mintAddress: string;
    currentPrice: string;
    marketCap: string;
    bondingCurveProgress: string;
    isGraduated: boolean;
  };
  walletAddress?: string;
  balance?: number;
}

export function TradingPanel({ token, walletAddress, balance }: TradingPanelProps) {
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const buyMutation = useMutation({
    mutationFn: async (solAmount: number) => {
      if (!walletAddress) {
        throw new Error("Please connect your wallet first");
      }

      return apiRequest("/api/tokens/buy", {
        method: "POST",
        body: JSON.stringify({
          tokenMint: token.mintAddress,
          solAmount,
          walletAddress,
          isBuy: true
        })
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tokens"] });
      setBuyAmount("");
      
      toast({
        title: "Buy Order Successful! 🎉",
        description: `Purchased ${result.tokensAmount.toLocaleString()} ${token.symbol} for ${buyAmount} SOL`,
        duration: 5000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Buy Order Failed",
        description: error.message || "Failed to execute buy order",
        variant: "destructive",
      });
    }
  });

  const sellMutation = useMutation({
    mutationFn: async (tokenAmount: number) => {
      if (!walletAddress) {
        throw new Error("Please connect your wallet first");
      }

      return apiRequest("/api/tokens/sell", {
        method: "POST",
        body: JSON.stringify({
          tokenMint: token.mintAddress,
          tokenAmount,
          walletAddress,
          isBuy: false
        })
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tokens"] });
      setSellAmount("");
      
      toast({
        title: "Sell Order Successful! 💰",
        description: `Sold ${sellAmount} ${token.symbol} for ${result.solReceived?.toFixed(6)} SOL`,
        duration: 5000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sell Order Failed",
        description: error.message || "Failed to execute sell order",
        variant: "destructive",
      });
    }
  });

  const handleBuy = () => {
    const solAmount = parseFloat(buyAmount);
    if (!solAmount || solAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid SOL amount",
        variant: "destructive",
      });
      return;
    }

    if (balance && solAmount > balance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${balance.toFixed(4)} SOL`,
        variant: "destructive",
      });
      return;
    }

    buyMutation.mutate(solAmount);
  };

  const handleSell = () => {
    const tokenAmount = parseFloat(sellAmount);
    if (!tokenAmount || tokenAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid token amount",
        variant: "destructive",
      });
      return;
    }

    sellMutation.mutate(tokenAmount);
  };

  const progressPercentage = Math.min(parseFloat(token.bondingCurveProgress || "0"), 100);

  return (
    <Card className="w-full max-w-md mx-auto bg-gray-900/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-center text-white">
          Trade {token.symbol}
        </CardTitle>
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold text-green-400">
            ${parseFloat(token.currentPrice).toFixed(8)}
          </div>
          <div className="text-sm text-gray-400">
            Market Cap: ${parseFloat(token.marketCap).toLocaleString()}
          </div>
          
          {/* Bonding Curve Progress */}
          <div className="w-full bg-gray-700 rounded-full h-2 mt-4">
            <div 
              className="bg-gradient-to-r from-orange-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-400">
            Bonding Curve Progress: {progressPercentage.toFixed(1)}% 
            {token.isGraduated && <span className="text-green-400 ml-2">✅ Graduated</span>}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="buy" className="text-green-400 data-[state=active]:bg-green-500/20">
              <TrendingUp className="w-4 h-4 mr-2" />
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="text-red-400 data-[state=active]:bg-red-500/20">
              <TrendingDown className="w-4 h-4 mr-2" />
              Sell
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">SOL Amount</label>
              <Input
                type="number"
                placeholder="0.1"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                step="0.001"
                min="0"
              />
              {walletAddress && balance && (
                <div className="text-xs text-gray-400 flex items-center">
                  <Wallet className="w-3 h-3 mr-1" />
                  Balance: {balance.toFixed(4)} SOL
                </div>
              )}
            </div>

            <Button 
              onClick={handleBuy}
              disabled={!walletAddress || buyMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {buyMutation.isPending ? "Buying..." : "Buy Tokens"}
            </Button>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Token Amount</label>
              <Input
                type="number"
                placeholder="1000"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                step="1"
                min="0"
              />
              <div className="text-xs text-gray-400">
                Estimated: ~{sellAmount ? (parseFloat(sellAmount) * parseFloat(token.currentPrice)).toFixed(6) : "0"} SOL
              </div>
            </div>

            <Button 
              onClick={handleSell}
              disabled={!walletAddress || sellMutation.isPending}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {sellMutation.isPending ? "Selling..." : "Sell Tokens"}
            </Button>
          </TabsContent>
        </Tabs>

        {!walletAddress && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-center">
            <p className="text-yellow-400 text-sm">
              Connect your wallet to start trading
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}