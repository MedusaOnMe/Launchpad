import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TradingModal } from "./trading-modal";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, ExternalLink } from "lucide-react";
import type { Token } from "@shared/schema";

interface TokenCardProps {
  token: Token;
}

export function TokenCard({ token }: TokenCardProps) {
  const [showTradingModal, setShowTradingModal] = useState(false);
  const { toast } = useToast();

  // Calculate mock price change percentage
  const priceChange = Math.random() > 0.3 ? `+${(Math.random() * 200 + 10).toFixed(0)}%` : `-${(Math.random() * 30 + 5).toFixed(0)}%`;
  const isPositive = priceChange.startsWith('+');

  const copyContractAddress = async () => {
    if (token.mintAddress) {
      try {
        await navigator.clipboard.writeText(token.mintAddress);
        toast({
          title: "Contract Address Copied!",
          description: "CA copied to clipboard",
        });
      } catch (err) {
        toast({
          title: "Copy failed",
          description: "Unable to copy to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  const openInSolscan = () => {
    if (token.mintAddress) {
      window.open(`https://solscan.io/token/${token.mintAddress}`, '_blank');
    }
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="bg-card border-border hover:border-neon-orange/50 transition-all duration-300 cursor-pointer group">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <img
                src={token.imageUrl || "/api/placeholder/48/48"}
                alt={token.name}
                className="w-12 h-12 rounded-full mr-3"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/api/placeholder/48/48";
                }}
              />
              <div className="flex-1">
                <h3 className="font-semibold text-lg group-hover:text-neon-orange transition-colors">
                  {token.name}
                </h3>
                <p className="text-gray-400 text-sm font-mono">${token.symbol}</p>
                {token.mintAddress && (
                  <div className="flex items-center gap-1 mt-1">
                    <p className="text-xs text-gray-500 font-mono">
                      CA: {token.mintAddress.slice(0, 6)}...{token.mintAddress.slice(-4)}
                    </p>
                    <button
                      onClick={copyContractAddress}
                      className="text-gray-500 hover:text-neon-orange transition-colors p-1"
                      title="Copy contract address"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={openInSolscan}
                      className="text-gray-500 hover:text-neon-blue transition-colors p-1"
                      title="View on Solscan"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <Badge 
                className={`${isPositive ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-500'} border-0`}
              >
                {priceChange}
              </Badge>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Market Cap</span>
                <span className="font-mono">${(parseFloat(token.marketCap) * 150).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Volume (24h)</span>
                <span className="font-mono">{parseFloat(token.volume24h).toFixed(2)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Holders</span>
                <span className="font-mono">{token.holders.toLocaleString()}</span>
              </div>
            </div>

            {/* Bonding Curve Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Bonding Curve</span>
                <span>{parseFloat(token.bondingCurveProgress).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-gradient-to-r from-neon-orange to-neon-pink h-1 rounded-full transition-all duration-300"
                  style={{ width: `${parseFloat(token.bondingCurveProgress)}%` }}
                ></div>
              </div>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-neon-orange to-neon-pink hover:shadow-lg hover:shadow-neon-orange/20 transition-all duration-300"
              onClick={() => setShowTradingModal(true)}
            >
              Trade Now
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <TradingModal 
        token={token} 
        open={showTradingModal} 
        onOpenChange={setShowTradingModal} 
      />
    </>
  );
}
