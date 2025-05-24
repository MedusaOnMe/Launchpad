import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriceChart } from "./price-chart";
import { apiRequest } from "@/lib/queryClient";
import { useRealWallet } from "@/lib/real-wallet.tsx";
import { useToast } from "@/hooks/use-toast";
import { X, TrendingUp, Users, DollarSign, Activity } from "lucide-react";
import { Connection, Transaction } from "@solana/web3.js";
import type { Token, Comment } from "@shared/schema";

interface TradingModalProps {
  token: Token;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TradeCalculation {
  tokensAmount: string;
  newPrice: string;
  priceImpact: string;
  fees: string;
}

export function TradingModal({ token, open, onOpenChange }: TradingModalProps) {
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [newComment, setNewComment] = useState("");
  const { publicKey, isConnected } = useRealWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/tokens", token.id, "comments"],
    enabled: open,
  });

  const { data: calculation } = useQuery<TradeCalculation>({
    queryKey: ["/api/calculate-trade", token.id, amount, tradeType],
    enabled: !!amount && parseFloat(amount) > 0,
  });

  const tradeMutation = useMutation({
    mutationFn: async (data: any) => {
      // Step 1: Get real SOL transfer transaction from server
      const response = await fetch("/api/real-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: token.id,
          amount: parseFloat(amount),
          walletAddress: publicKey
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to prepare transaction');
      }
      
      // Step 2: Sign and send real transaction (Bonding Curve or Jupiter)
      if (result.transactionBuffer && window.solana) {
        try {
          console.log('🔐 Signing transaction with wallet...');
          
          // Transaction buffer contains a serialized transaction
          const buffer = new Uint8Array(atob(result.transactionBuffer).split('').map(c => c.charCodeAt(0)));
          const transaction = Transaction.from(buffer);
          
          // Sign transaction with user's wallet
          const signedTransaction = await window.solana.signTransaction(transaction);
          console.log('✅ Transaction signed by wallet, submitting to blockchain...');
          
          // Use the same successful submission method as token creation
          const submitResponse = await fetch('/api/helius/submit-transaction', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transaction: btoa(String.fromCharCode(...signedTransaction.serialize()))
            }),
          });
          
          const submitResult = await submitResponse.json();
          
          if (!submitResult.success) {
            throw new Error(submitResult.error || 'Failed to submit transaction');
          }
          
          console.log('🎉 Trade confirmed on Solana blockchain!');
          console.log('📋 Transaction signature:', submitResult.signature);
          
          return {
            ...result,
            signature: submitResult.signature,
            confirmed: true
          };
        } catch (error) {
          console.error('❌ Transaction failed:', error);
          console.error('Error details:', (error as any).message || 'Unknown error');
          throw new Error(`Trade failed: ${(error as any).message || 'Failed to confirm on blockchain'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tokens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast({
        title: "Trade Executed! 💰",
        description: `Successfully ${tradeType === "buy" ? "bought" : "sold"} ${token.symbol}`,
      });
      setAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Trade Failed",
        description: error.message || "Failed to execute trade",
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/comments", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tokens", token.id, "comments"] });
      setNewComment("");
    },
  });

  const handleTrade = () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to trade",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    // Execute trade with your Solana integration
    tradeMutation.mutate({
      tokenMint: token.mintAddress,
      amountIn: parseFloat(amount),
      isBuy: tradeType === "buy",
      user: publicKey
    });
  };

  const handleComment = () => {
    if (!isConnected || !newComment.trim()) return;

    commentMutation.mutate({
      tokenId: token.id,
      user: publicKey,
      message: newComment.trim(),
    });
  };

  const priceChange = "+187%"; // Mock calculation
  const isPositive = priceChange.startsWith('+');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={token.imageUrl || "/api/placeholder/48/48"}
              alt={token.name}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <DialogTitle className="font-space text-xl">{token.name}</DialogTitle>
              <p className="text-gray-400 font-mono">${token.symbol}</p>
            </div>
            <Badge 
              className={`${isPositive ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-500'} border-0`}
            >
              {priceChange}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chart and Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart */}
            <Card className="bg-background border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Price Chart</h4>
                  <div className="flex space-x-2">
                    <Button size="sm" className="bg-neon-orange text-black">1H</Button>
                    <Button size="sm" variant="ghost" className="text-gray-400">4H</Button>
                    <Button size="sm" variant="ghost" className="text-gray-400">1D</Button>
                    <Button size="sm" variant="ghost" className="text-gray-400">1W</Button>
                  </div>
                </div>
                <PriceChart tokenId={token.id} />
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-background border-border text-center p-4">
                <div className="text-lg font-bold text-neon-orange mb-1">
                  {parseFloat(token.currentPrice).toFixed(6)} SOL
                </div>
                <div className="text-xs text-gray-400">Current Price</div>
              </Card>
              <Card className="bg-background border-border text-center p-4">
                <div className="text-lg font-bold text-neon-blue mb-1">
                  ${(parseFloat(token.marketCap) * 150).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">Market Cap</div>
              </Card>
              <Card className="bg-background border-border text-center p-4">
                <div className="text-lg font-bold text-neon-green mb-1">
                  {parseFloat(token.volume24h).toFixed(2)} SOL
                </div>
                <div className="text-xs text-gray-400">24h Volume</div>
              </Card>
              <Card className="bg-background border-border text-center p-4">
                <div className="text-lg font-bold text-neon-gold mb-1">
                  {token.holders.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">Holders</div>
              </Card>
            </div>
          </div>

          {/* Trading Panel */}
          <div className="space-y-6">
            <Tabs value={tradeType} onValueChange={(value) => setTradeType(value as "buy" | "sell")}>
              <TabsList className="grid w-full grid-cols-2 bg-background">
                <TabsTrigger value="buy" className="data-[state=active]:bg-neon-green data-[state=active]:text-black">
                  Buy
                </TabsTrigger>
                <TabsTrigger value="sell" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                  Sell
                </TabsTrigger>
              </TabsList>

              <TabsContent value={tradeType} className="space-y-4 mt-4">
                <Card className="bg-background border-border">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label>Amount (SOL)</Label>
                      <Input
                        type="number"
                        placeholder="0.1"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-card border-border font-mono"
                      />
                    </div>

                    <div className="flex space-x-2">
                      {["0.1", "0.5", "1.0"].map((value) => (
                        <Button
                          key={value}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-border hover:border-neon-orange/50"
                          onClick={() => setAmount(value)}
                        >
                          {value} SOL
                        </Button>
                      ))}
                    </div>

                    {calculation && (
                      <Card className="bg-card border-border">
                        <CardContent className="p-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">You'll receive</span>
                            <span className="font-mono">{parseFloat(calculation.tokensAmount).toLocaleString()} {token.symbol}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Price impact</span>
                            <span className="font-mono text-yellow-500">{calculation.priceImpact}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Fees</span>
                            <span className="font-mono">{calculation.fees} SOL</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Button
                      onClick={handleTrade}
                      disabled={tradeMutation.isPending || !isConnected || !amount}
                      className={`w-full ${tradeType === "buy" 
                        ? "bg-gradient-to-r from-neon-green to-neon-blue" 
                        : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {tradeMutation.isPending ? "Processing..." : `${tradeType === "buy" ? "Buy" : "Sell"} ${token.symbol}`}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Bonding Curve */}
            <Card className="bg-background border-border">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Bonding Curve Progress</h4>
                <div className="relative mb-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-neon-orange to-neon-pink h-2 rounded-full transition-all duration-300"
                      style={{ width: `${parseFloat(token.bondingCurveProgress)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{parseFloat(token.marketCap).toFixed(0)} SOL</span>
                  <span>69 SOL</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  When 69 SOL is reached, liquidity will be deposited to Raydium and burned.
                </p>
              </CardContent>
            </Card>

            {/* Comments */}
            <Card className="bg-background border-border">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-4">Community Chat ({comments.length})</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex items-start space-x-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-neon-orange to-neon-pink rounded-full flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{comment.user}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{comment.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Say something..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleComment()}
                    className="bg-card border-border"
                  />
                  <Button
                    onClick={handleComment}
                    disabled={!isConnected || !newComment.trim() || commentMutation.isPending}
                    className="bg-gradient-to-r from-neon-orange to-neon-pink"
                  >
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
