import { useState } from "react";
import { CreateTokenModal } from "@/components/create-token-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealWallet } from "@/lib/real-wallet.tsx";
import { Coins, Rocket, TrendingUp } from "lucide-react";

export default function CreateCoin() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { isConnected } = useRealWallet();

  const features = [
    {
      icon: <Rocket className="h-8 w-8 text-neon-orange" />,
      title: "Fair Launch",
      description: "No presale, no team allocation. Everyone starts equal when trading begins."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-neon-blue" />,
      title: "Bonding Curve",
      description: "Price increases automatically as more tokens are bought. Liquidity is guaranteed."
    },
    {
      icon: <Coins className="h-8 w-8 text-neon-green" />,
      title: "Instant Trading",
      description: "Start trading immediately after creation. No waiting for liquidity pools."
    }
  ];

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-space font-bold mb-6 bg-gradient-to-r from-neon-orange via-neon-pink to-neon-blue bg-clip-text text-transparent">
            Launch Your Memecoin
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Create and launch your own memecoin in seconds. No coding required, no liquidity needed upfront.
          </p>
          
          {isConnected ? (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-neon-orange to-neon-pink hover:shadow-lg hover:shadow-neon-orange/20 text-lg px-8 py-3 h-auto font-semibold"
            >
              <Coins className="mr-2 h-5 w-5" />
              Create Your Coin
            </Button>
          ) : (
            <div className="text-center">
              <p className="text-gray-500 mb-4">Connect your wallet to start creating</p>
              <Button
                disabled
                className="bg-gray-600 text-gray-400 cursor-not-allowed text-lg px-8 py-3 h-auto"
              >
                <Coins className="mr-2 h-5 w-5" />
                Connect Wallet First
              </Button>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="bg-card/50 border-border hover:border-neon-orange/30 transition-colors">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400 text-center">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How It Works */}
        <Card className="bg-card/30 border-border">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-neon-orange/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-neon-orange font-bold text-lg">1</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Create Token</h3>
                <p className="text-gray-400 text-sm">Set your token name, symbol, description, and upload an image</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-neon-blue/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-neon-blue font-bold text-lg">2</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Launch & Trade</h3>
                <p className="text-gray-400 text-sm">Your token goes live instantly with automatic price discovery</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-neon-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-neon-green font-bold text-lg">3</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Graduate</h3>
                <p className="text-gray-400 text-sm">Reach 69 SOL market cap to graduate to major exchanges</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateTokenModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal} 
      />
    </div>
  );
}