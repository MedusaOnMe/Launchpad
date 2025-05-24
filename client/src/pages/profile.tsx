import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRealWallet } from "@/lib/real-wallet.tsx";
import { motion } from "framer-motion";
import { User, Trophy, Rocket, Crown } from "lucide-react";
import type { Token } from "@shared/schema";

export default function Profile() {
  const { publicKey, isConnected, user, balance } = useRealWallet();

  const { data: allTokens = [] } = useQuery<Token[]>({
    queryKey: ["/api/tokens"],
    enabled: !!publicKey,
  });

  // Calculate user stats
  const userTokens = allTokens.filter(token => token.creator === publicKey);
  const bondedTokens = userTokens.filter(token => token.isGraduated);
  const totalVolume = userTokens.reduce((sum, token) => sum + parseFloat(token.volume24h), 0);

  if (!isConnected) {
    return (
      <div className="pt-16 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <User className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to view your profile and token creation stats
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
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-neon-orange to-neon-pink rounded-full flex items-center justify-center overflow-hidden relative">
              {user?.profilePictureUrl && user.profilePictureUrl.trim() !== '' ? (
                <img
                  src={user.profilePictureUrl}
                  alt={user.username || 'Profile'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Hide the broken image and show the default icon
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <User className="h-8 w-8 text-white" />
              )}
              {/* Fallback icon - shows when image fails to load */}
              {user?.profilePictureUrl && (
                <User className="h-8 w-8 text-white absolute inset-0 m-auto" style={{ display: 'none' }} />
              )}
            </div>
            <div>
              <h1 className="font-space font-bold text-4xl">
                {user?.username || "Your Profile"}
              </h1>
              <p className="text-gray-400 font-mono">{publicKey?.slice(0, 8)}...{publicKey?.slice(-8)}</p>
            </div>
          </div>
        </motion.div>

        {/* Profile Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-card border-border hover:border-neon-orange/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                  <Rocket className="h-4 w-4 mr-2" />
                  Tokens Created
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neon-orange">
                  {userTokens.length}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-card border-border hover:border-neon-green/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                  <Crown className="h-4 w-4 mr-2" />
                  Tokens Bonded
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neon-green">
                  {bondedTokens.length}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-card border-border hover:border-neon-blue/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                  <Trophy className="h-4 w-4 mr-2" />
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neon-blue">
                  {userTokens.length > 0 ? Math.round((bondedTokens.length / userTokens.length) * 100) : 0}%
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="bg-card border-border hover:border-neon-gold/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Total Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neon-gold">
                  {totalVolume.toFixed(1)} SOL
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Your Tokens */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xl font-space">Your Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              {userTokens.length > 0 ? (
                <div className="space-y-4">
                  {userTokens.map((token, index) => (
                    <motion.div
                      key={token.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-background rounded-lg border border-border hover:border-neon-orange/30 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <img
                          src={token.imageUrl || "/api/placeholder/48/48"}
                          alt={token.name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <h3 className="font-semibold text-lg">{token.name}</h3>
                          <p className="text-gray-400 font-mono">${token.symbol}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-400">Market Cap</div>
                        <div className="font-mono text-lg">
                          {parseFloat(token.marketCap).toFixed(2)} SOL
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-400">Progress</div>
                        <div className="font-mono text-lg">
                          {parseFloat(token.bondingCurveProgress).toFixed(1)}%
                        </div>
                      </div>

                      <div className="text-right">
                        {token.isGraduated ? (
                          <div className="flex items-center text-neon-green">
                            <Crown className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium">Bonded</span>
                          </div>
                        ) : (
                          <div className="text-yellow-500 text-sm">
                            Trading
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Rocket className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No tokens created yet</h3>
                  <p className="text-gray-400 mb-6">
                    Start your memecoin journey by creating your first token
                  </p>
                  <Button className="bg-gradient-to-r from-neon-orange to-neon-pink">
                    Create Your First Token
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Achievement Badges */}
        {userTokens.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8"
          >
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-xl font-space">Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {userTokens.length >= 1 && (
                    <div className="flex flex-col items-center p-4 bg-background rounded-lg border border-neon-orange/30">
                      <Rocket className="h-8 w-8 text-neon-orange mb-2" />
                      <span className="text-sm font-medium">First Launch</span>
                    </div>
                  )}
                  
                  {bondedTokens.length >= 1 && (
                    <div className="flex flex-col items-center p-4 bg-background rounded-lg border border-neon-green/30">
                      <Crown className="h-8 w-8 text-neon-green mb-2" />
                      <span className="text-sm font-medium">First Bond</span>
                    </div>
                  )}
                  
                  {userTokens.length >= 5 && (
                    <div className="flex flex-col items-center p-4 bg-background rounded-lg border border-neon-blue/30">
                      <Trophy className="h-8 w-8 text-neon-blue mb-2" />
                      <span className="text-sm font-medium">Serial Creator</span>
                    </div>
                  )}
                  
                  {bondedTokens.length >= 3 && (
                    <div className="flex flex-col items-center p-4 bg-background rounded-lg border border-neon-gold/30">
                      <Crown className="h-8 w-8 text-neon-gold mb-2" />
                      <span className="text-sm font-medium">Bond Master</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}