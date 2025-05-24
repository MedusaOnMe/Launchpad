import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TokenCard } from "@/components/token-card";
import { CreateTokenModal } from "@/components/create-token-modal";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Rocket, Search, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import type { Token } from "@shared/schema";

export default function Home() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: trendingTokens = [] } = useQuery<Token[]>({
    queryKey: ["/api/tokens/trending"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/tokens"],
    select: (tokens: Token[]) => ({
      tokensLaunched: tokens.length,
      totalVolume: tokens.reduce((sum, token) => sum + parseFloat(token.volume24h), 0),
      graduated: tokens.filter(token => token.isGraduated).length,
    }),
  });

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-space font-bold text-4xl md:text-6xl lg:text-7xl mb-6"
            >
              Launch Your{" "}
              <span className="bg-gradient-to-r from-neon-orange via-neon-pink to-neon-blue bg-clip-text text-transparent animate-glow">
                Memecoin
              </span>
              <br />
              on Solana
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto mb-8"
            >
              The easiest way to create and launch memecoins on Solana. No coding required. Fair launch with bonding curves.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                size="lg"
                className="px-8 py-4 bg-gradient-to-r from-neon-orange to-neon-pink hover:shadow-2xl hover:shadow-neon-orange/30 text-lg font-semibold animate-float"
                onClick={() => setShowCreateModal(true)}
              >
                <Rocket className="mr-2 h-5 w-5" />
                Launch Token
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-4 border-2 border-neon-blue text-neon-blue hover:bg-neon-blue/10 text-lg font-semibold"
              >
                <Search className="mr-2 h-5 w-5" />
                Explore Tokens
              </Button>
            </motion.div>
          </div>

          {/* Stats Section */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <Card className="bg-card border-border hover:border-neon-orange/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl md:text-3xl font-bold text-neon-orange mb-2">
                      {stats.tokensLaunched.toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-sm">Tokens Launched</div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <Card className="bg-card border-border hover:border-neon-blue/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl md:text-3xl font-bold text-neon-blue mb-2">
                      ${(stats.totalVolume / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-gray-400 text-sm">Total Volume</div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <Card className="bg-card border-border hover:border-neon-gold/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl md:text-3xl font-bold text-neon-gold mb-2">
                      {stats.graduated}
                    </div>
                    <div className="text-gray-400 text-sm">Graduated</div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* Trending Tokens */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-space font-bold text-3xl flex items-center">
              <TrendingUp className="mr-2 h-8 w-8 text-neon-orange" />
              Trending Now
            </h2>
            <Button variant="ghost" className="text-neon-orange hover:text-neon-pink">
              View All →
            </Button>
          </div>
          
          <div className="flex space-x-6 overflow-x-auto pb-4">
            {trendingTokens.map((token) => (
              <motion.div
                key={token.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="min-w-[300px]"
              >
                <TokenCard token={token} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <CreateTokenModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
}
