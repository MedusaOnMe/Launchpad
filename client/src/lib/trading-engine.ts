export interface BondingCurveCalculation {
  newPrice: number;
  tokensAmount: number;
  priceImpact: number;
  fees: number;
}

export class TradingEngine {
  // Simple bonding curve implementation
  static calculateTrade(
    currentPrice: number,
    currentSupply: number,
    maxSupply: number,
    solAmount: number,
    tradeType: "buy" | "sell"
  ): BondingCurveCalculation {
    const k = 0.0001; // Curve steepness parameter
    const feeRate = 0.001; // 0.1% fee
    
    // Calculate price impact based on trade size relative to market cap
    const currentMarketCap = currentPrice * currentSupply;
    const priceImpactBase = Math.min(solAmount / Math.max(currentMarketCap, 1), 0.1); // Max 10% impact
    
    let priceImpact: number;
    let newPrice: number;
    let tokensAmount: number;
    
    if (tradeType === "buy") {
      priceImpact = priceImpactBase;
      newPrice = currentPrice * (1 + priceImpact);
      
      // Calculate tokens received using average price
      const averagePrice = (currentPrice + newPrice) / 2;
      tokensAmount = (solAmount * (1 - feeRate)) / averagePrice;
    } else {
      priceImpact = -priceImpactBase;
      newPrice = currentPrice * (1 + priceImpact);
      
      // For selling, we need to determine how many tokens to sell for given SOL amount
      const averagePrice = (currentPrice + newPrice) / 2;
      tokensAmount = solAmount / averagePrice;
    }
    
    const fees = solAmount * feeRate;
    
    return {
      newPrice,
      tokensAmount,
      priceImpact: Math.abs(priceImpact),
      fees,
    };
  }
  
  static calculateBondingCurveProgress(currentMarketCap: number): number {
    const graduationThreshold = 69; // SOL
    return Math.min((currentMarketCap / graduationThreshold) * 100, 100);
  }
  
  static isGraduated(currentMarketCap: number): boolean {
    return currentMarketCap >= 69;
  }
}
