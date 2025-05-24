import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useRealWallet } from "@/lib/real-wallet.tsx";
import { Menu, Wallet } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();
  const { publicKey, isConnected, connect, disconnect, user, walletType, balance } = useRealWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/create", label: "Create Coin" },
    { href: "/discover", label: "Tokens" },
    { href: "/profile", label: "Profile" },
  ];

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  const NavLinks = ({ mobile = false }) => (
    <>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant="ghost"
            className={`${
              isActive(item.href)
                ? "text-neon-orange"
                : "text-gray-300 hover:text-neon-orange"
            } transition-colors ${mobile ? "w-full justify-start" : ""}`}
            onClick={() => mobile && setMobileMenuOpen(false)}
          >
            {item.label}
          </Button>
        </Link>
      ))}
    </>
  );

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <span className="font-space font-bold text-xl text-white">WENLAUNCH</span>
              </div>
            </Link>
            <div className="hidden md:flex space-x-6">
              <NavLinks />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isConnected ? (
              <Button
                onClick={disconnect}
                className="hidden md:flex bg-neon-orange/20 text-neon-orange hover:bg-neon-orange/30 border border-neon-orange/50"
              >
                <Wallet className="mr-2 h-4 w-4" />
                {parseFloat(balance).toFixed(3)} SOL | {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
              </Button>
            ) : (
              <Button
                onClick={connect}
                className="hidden md:flex bg-gradient-to-r from-neon-orange to-neon-pink hover:shadow-lg hover:shadow-neon-orange/20"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </Button>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-card border-border">
                <div className="flex flex-col space-y-4 mt-8">
                  <NavLinks mobile />
                  <div className="pt-4 border-t border-border">
                    {isConnected ? (
                      <Button
                        onClick={() => {
                          disconnect();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full bg-neon-orange/20 text-neon-orange hover:bg-neon-orange/30 border border-neon-orange/50"
                      >
                        <Wallet className="mr-2 h-4 w-4" />
                        {parseFloat(balance).toFixed(3)} SOL | {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          connect();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full bg-gradient-to-r from-neon-orange to-neon-pink"
                      >
                        <Wallet className="mr-2 h-4 w-4" />
                        Connect Wallet
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
