import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
import { RealWalletProvider, useRealWallet } from "@/lib/real-wallet.tsx";
import { UsernameModal } from "@/components/username-modal";
import Home from "@/pages/home";
import CreateCoin from "@/pages/create-coin";
import Discover from "@/pages/discover";
import Profile from "@/pages/profile";
import TokenDetails from "@/pages/token-details";
import NotFound from "@/pages/not-found";

function AppContent() {
  const { publicKey, showUsernameModal, setShowUsernameModal, setUser } = useRealWallet();

  const handleUserCreated = (user: any) => {
    setUser(user);
    setShowUsernameModal(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/create" component={CreateCoin} />
        <Route path="/discover" component={Discover} />
        <Route path="/profile" component={Profile} />
        <Route path="/token/:id" component={TokenDetails} />
        <Route component={NotFound} />
      </Switch>
      
      {publicKey && (
        <UsernameModal
          open={showUsernameModal}
          onOpenChange={setShowUsernameModal}
          walletAddress={publicKey}
          onUserCreated={handleUserCreated}
        />
      )}
    </div>
  );
}

function Router() {
  return <AppContent />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RealWalletProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </RealWalletProvider>
    </QueryClientProvider>
  );
}

export default App;
