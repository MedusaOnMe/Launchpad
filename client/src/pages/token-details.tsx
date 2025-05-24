import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriceChart } from "@/components/price-chart";
import { TradingModal } from "@/components/trading-modal";
import { TradingPanel } from "@/components/trading-panel";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Heart } from "lucide-react";
import { Link } from "wouter";
import type { Token, Comment } from "@shared/schema";

export default function TokenDetails() {
  const { id } = useParams();
  const tokenId = parseInt(id || "0");
  const [showTradingModal, setShowTradingModal] = useState(false);

  const { data: token, isLoading } = useQuery<Token>({
    queryKey: ["/api/tokens", tokenId],
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/tokens", tokenId, "comments"],
    enabled: !!tokenId,
  });

  if (isLoading) {
    return (
      <div className="pt-16 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-700 rounded w-1/4"></div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-700 rounded"></div>
                <div className="h-32 bg-gray-700 rounded"></div>
              </div>
              <div className="space-y-6">
                <div className="h-48 bg-gray-700 rounded"></div>
                <div className="h-32 bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="pt-16 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold mb-2">Token not found</h2>
            <p className="text-gray-400 mb-8">The token you're looking for doesn't exist</p>
            <Link href="/discover">
              <Button>Discover Tokens</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const priceChange = "+187%"; // Mock calculation
  const isPositive = priceChange.startsWith('+');

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <img
                src={token.imageUrl || "/api/placeholder/48/48"}
                alt={token.name}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <h1 className="font-space font-bold text-2xl">{token.name}</h1>
                <p className="text-gray-400 font-mono">${token.symbol}</p>
              </div>
              <Badge 
                className={`${isPositive ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-500'} border-0`}
              >
                {priceChange}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Heart className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button 
              className="bg-gradient-to-r from-neon-green to-neon-blue"
              onClick={() => setShowTradingModal(true)}
            >
              Trade Now
            </Button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-lg">Price Chart</h3>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="bg-neon-orange text-black">1H</Button>
                      <Button size="sm" variant="ghost" className="text-gray-400">4H</Button>
                      <Button size="sm" variant="ghost" className="text-gray-400">1D</Button>
                      <Button size="sm" variant="ghost" className="text-gray-400">1W</Button>
                    </div>
                  </div>
                  <PriceChart tokenId={token.id} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Token Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">About {token.name}</h3>
                  <p className="text-gray-300 mb-4">{token.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>Created by: <span className="text-white">{token.creator}</span></span>
                    <span>•</span>
                    <span>Created: <span className="text-white">{new Date(token.createdAt).toLocaleDateString()}</span></span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Comments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Community Chat ({comments.length})</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-neon-orange to-neon-pink rounded-full flex-shrink-0"></div>
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
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Token Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Token Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Price</span>
                      <span className="font-mono text-neon-orange">{parseFloat(token.currentPrice).toFixed(6)} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Market Cap</span>
                      <span className="font-mono">${(parseFloat(token.marketCap) * 150).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">24h Volume</span>
                      <span className="font-mono text-neon-green">{parseFloat(token.volume24h).toFixed(2)} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Holders</span>
                      <span className="font-mono">{token.holders.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Supply</span>
                      <span className="font-mono">{parseInt(token.maxSupply).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Bonding Curve */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Bonding Curve Progress</h3>
                  <div className="space-y-3">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-neon-orange to-neon-pink h-2 rounded-full transition-all duration-300"
                        style={{ width: `${parseFloat(token.bondingCurveProgress)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>{parseFloat(token.marketCap).toFixed(0)} SOL</span>
                      <span>69 SOL</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      When 69 SOL is reached, liquidity will be deposited to Raydium and burned.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      <TradingModal 
        token={token} 
        open={showTradingModal} 
        onOpenChange={setShowTradingModal} 
      />
    </div>
  );
}
