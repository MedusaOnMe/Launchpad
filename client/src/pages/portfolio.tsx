import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRealWallet } from "@/lib/real-wallet.tsx";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

interface PortfolioPosition {
  id: number;
  user: string;
  tokenId: number;
  amount: string;
  averagePrice: string;
  updatedAt: Date;
  token: {
    id: number;
    name: string;
    symbol: string;
    imageUrl: string | null;
    currentPrice: string;
  };
}

export default function Portfolio() {
  const { publicKey, isConnected } = useRealWallet();

  const { data: portfolio = [], isLoading } = useQuery<PortfolioPosition[]>({
    queryKey: ["/api/portfolio", publicKey],
    enabled: !!publicKey,
  });

  const portfolioValue = portfolio.reduce((total, position) => {
    const currentValue = parseFloat(position.amount) * parseFloat(position.token.currentPrice);
    return total + currentValue;
  }, 0);

  const totalInvested = portfolio.reduce((total, position) => {
    const invested = parseFloat(position.amount) * parseFloat(position.averagePrice);
    return total + invested;
  }, 0);

  const totalPnL = portfolioValue - totalInvested;
  const totalPnLPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  if (!isConnected) {
    return (
      <div className="pt-16 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Wallet className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to view your memecoin portfolio
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="font-space font-bold text-4xl mb-2">Portfolio</h1>
          <p className="text-gray-400 mb-8">Track your memecoin investments</p>
        </motion.div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Total Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {portfolioValue.toFixed(4)} SOL
                </div>
                <p className="text-xs text-gray-400">
                  ${(portfolioValue * 150).toFixed(2)} USD
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Total P&L
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold flex items-center ${totalPnL >= 0 ? 'text-neon-green' : 'text-red-500'}`}>
                  {totalPnL >= 0 ? (
                    <TrendingUp className="mr-2 h-5 w-5" />
                  ) : (
                    <TrendingDown className="mr-2 h-5 w-5" />
                  )}
                  {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(4)} SOL
                </div>
                <p className={`text-xs ${totalPnL >= 0 ? 'text-neon-green' : 'text-red-500'}`}>
                  {totalPnL >= 0 ? '+' : ''}{totalPnLPercentage.toFixed(2)}%
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{portfolio.length}</div>
                <p className="text-xs text-gray-400">Active positions</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Positions */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-card border-border animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-gray-700 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : portfolio.length > 0 ? (
          <div className="space-y-4">
            {portfolio.map((position, index) => {
              const currentValue = parseFloat(position.amount) * parseFloat(position.token.currentPrice);
              const invested = parseFloat(position.amount) * parseFloat(position.averagePrice);
              const pnl = currentValue - invested;
              const pnlPercentage = invested > 0 ? (pnl / invested) * 100 : 0;

              return (
                <motion.div
                  key={position.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="bg-card border-border hover:border-neon-orange/50 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <img
                            src={position.token.imageUrl || "/api/placeholder/48/48"}
                            alt={position.token.name}
                            className="w-12 h-12 rounded-full"
                          />
                          <div>
                            <h3 className="font-semibold text-lg">{position.token.name}</h3>
                            <p className="text-gray-400 font-mono">${position.token.symbol}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {parseFloat(position.amount).toFixed(2)} {position.token.symbol}
                          </div>
                          <div className="text-sm text-gray-400">
                            {currentValue.toFixed(4)} SOL
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-lg font-semibold ${pnl >= 0 ? 'text-neon-green' : 'text-red-500'}`}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(4)} SOL
                          </div>
                          <div className={`text-sm ${pnl >= 0 ? 'text-neon-green' : 'text-red-500'}`}>
                            {pnl >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
                          </div>
                        </div>

                        <Button variant="outline" className="border-neon-orange text-neon-orange hover:bg-neon-orange/10">
                          Trade
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">No positions yet</h3>
            <p className="text-gray-400 mb-8">
              Start trading memecoins to build your portfolio
            </p>
            <Button className="bg-gradient-to-r from-neon-orange to-neon-pink">
              Discover Tokens
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
