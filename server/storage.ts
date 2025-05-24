import { 
  tokens, 
  trades, 
  comments, 
  portfolios,
  pools,
  users,
  type Token, 
  type InsertToken,
  type Trade,
  type InsertTrade,
  type Comment,
  type InsertComment,
  type Portfolio,
  type InsertPortfolio,
  type Pool,
  type InsertPool,
  type User,
  type InsertUser
} from "@shared/schema";

export interface IStorage {
  // Token operations
  getToken(id: number): Promise<Token | undefined>;
  getTokenBySymbol(symbol: string): Promise<Token | undefined>;
  getAllTokens(): Promise<Token[]>;
  getTrendingTokens(limit?: number): Promise<Token[]>;
  createToken(token: InsertToken): Promise<Token>;
  updateToken(id: number, updates: Partial<Token>): Promise<Token | undefined>;

  // Trade operations
  getTrades(tokenId: number): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;

  // Comment operations
  getComments(tokenId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  // Portfolio operations
  getPortfolio(user: string): Promise<Portfolio[]>;
  getPortfolioPosition(user: string, tokenId: number): Promise<Portfolio | undefined>;
  updatePortfolio(user: string, tokenId: number, amount: string, averagePrice: string): Promise<Portfolio>;

  // User operations
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Pool operations
  getPool(tokenId: number): Promise<Pool | undefined>;
  getPoolByMint(tokenMint: string): Promise<Pool | undefined>;
  createPool(pool: InsertPool): Promise<Pool>;
  updatePoolReserves(tokenMint: string, baseReserve: string, quoteReserve: string): Promise<Pool | undefined>;
}

export class MemStorage implements IStorage {
  private tokens: Map<number, Token>;
  private trades: Map<number, Trade>;
  private comments: Map<number, Comment>;
  private portfolios: Map<string, Portfolio>; // key: `${user}-${tokenId}`
  private pools: Map<number, Pool>; // key: tokenId
  private users: Map<string, User>; // key: walletAddress
  private currentTokenId: number;
  private currentTradeId: number;
  private currentCommentId: number;
  private currentPortfolioId: number;
  private currentPoolId: number;
  private currentUserId: number;

  constructor() {
    this.tokens = new Map();
    this.trades = new Map();
    this.comments = new Map();
    this.portfolios = new Map();
    this.pools = new Map();
    this.users = new Map();
    this.currentTokenId = 1;
    this.currentTradeId = 1;
    this.currentCommentId = 1;
    this.currentPortfolioId = 1;
    this.currentPoolId = 1;
    this.currentUserId = 1;
    this.seedData();
  }

  private seedData() {
    // No seed tokens - start with a clean slate
  }

  async getToken(id: number): Promise<Token | undefined> {
    return this.tokens.get(id);
  }

  async getTokenBySymbol(symbol: string): Promise<Token | undefined> {
    return Array.from(this.tokens.values()).find(token => token.symbol === symbol);
  }

  async getAllTokens(): Promise<Token[]> {
    return Array.from(this.tokens.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTrendingTokens(limit = 10): Promise<Token[]> {
    return Array.from(this.tokens.values())
      .sort((a, b) => parseFloat(b.volume24h) - parseFloat(a.volume24h))
      .slice(0, limit);
  }

  async createToken(insertToken: InsertToken): Promise<Token> {
    const id = this.currentTokenId++;
    const currentPrice = insertToken.initialPrice;
    const marketCap = (parseFloat(insertToken.maxSupply) * parseFloat(currentPrice)).toString();
    
    const token: Token = {
      ...insertToken,
      id,
      currentPrice,
      currentSupply: "0",
      marketCap,
      volume24h: "0",
      holders: 0,
      bondingCurveProgress: "0",
      isGraduated: false,
      createdAt: new Date(),
    };

    this.tokens.set(id, token);
    return token;
  }

  async updateToken(id: number, updates: Partial<Token>): Promise<Token | undefined> {
    const token = this.tokens.get(id);
    if (!token) return undefined;

    const updatedToken = { ...token, ...updates };
    this.tokens.set(id, updatedToken);
    return updatedToken;
  }

  async getTrades(tokenId: number): Promise<Trade[]> {
    return Array.from(this.trades.values())
      .filter(trade => trade.tokenId === tokenId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = this.currentTradeId++;
    const trade: Trade = {
      ...insertTrade,
      id,
      createdAt: new Date(),
    };

    this.trades.set(id, trade);
    
    // Update token metrics
    const token = await this.getToken(insertTrade.tokenId);
    if (token) {
      const newVolume = (parseFloat(token.volume24h) + parseFloat(insertTrade.amount)).toString();
      const newCurrentSupply = insertTrade.type === 'buy' 
        ? (parseFloat(token.currentSupply) + parseFloat(insertTrade.tokensAmount)).toString()
        : (parseFloat(token.currentSupply) - parseFloat(insertTrade.tokensAmount)).toString();
      
      const newMarketCap = (parseFloat(newCurrentSupply) * parseFloat(insertTrade.price)).toString();
      const bondingCurveProgress = Math.min(parseFloat(newMarketCap) / 69, 100).toString();
      
      await this.updateToken(insertTrade.tokenId, {
        currentPrice: insertTrade.price,
        currentSupply: newCurrentSupply,
        marketCap: newMarketCap,
        volume24h: newVolume,
        bondingCurveProgress,
      });
    }

    return trade;
  }

  async getComments(tokenId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.tokenId === tokenId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.currentCommentId++;
    const comment: Comment = {
      ...insertComment,
      id,
      createdAt: new Date(),
    };

    this.comments.set(id, comment);
    return comment;
  }

  async getPortfolio(user: string): Promise<Portfolio[]> {
    return Array.from(this.portfolios.values())
      .filter(portfolio => portfolio.user === user);
  }

  async getPortfolioPosition(user: string, tokenId: number): Promise<Portfolio | undefined> {
    const key = `${user}-${tokenId}`;
    return this.portfolios.get(key);
  }

  async updatePortfolio(user: string, tokenId: number, amount: string, averagePrice: string): Promise<Portfolio> {
    const key = `${user}-${tokenId}`;
    const existing = this.portfolios.get(key);

    if (existing) {
      const updatedPortfolio: Portfolio = {
        ...existing,
        amount,
        averagePrice,
        updatedAt: new Date(),
      };
      this.portfolios.set(key, updatedPortfolio);
      return updatedPortfolio;
    } else {
      const id = this.currentPortfolioId++;
      const portfolio: Portfolio = {
        id,
        user,
        tokenId,
        amount,
        averagePrice,
        updatedAt: new Date(),
      };
      this.portfolios.set(key, portfolio);
      return portfolio;
    }
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    return this.users.get(walletAddress);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const [, user] of this.users) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id,
      walletAddress: insertUser.walletAddress,
      username: insertUser.username,
      profilePictureUrl: insertUser.profilePictureUrl || null,
      createdAt: new Date(),
    };
    this.users.set(insertUser.walletAddress, user);
    return user;
  }

  // Pool operations for bonding curve management
  async getPool(tokenId: number): Promise<Pool | undefined> {
    return this.pools.get(tokenId);
  }

  async getPoolByMint(tokenMint: string): Promise<Pool | undefined> {
    for (const pool of this.pools.values()) {
      if (pool.tokenMint === tokenMint) {
        return pool;
      }
    }
    return undefined;
  }

  async createPool(insertPool: InsertPool): Promise<Pool> {
    const id = this.currentPoolId++;
    const pool: Pool = {
      id,
      tokenMint: insertPool.tokenMint,
      baseReserve: insertPool.baseReserve,
      quoteReserve: insertPool.quoteReserve,
      totalSupply: insertPool.totalSupply,
      currentPrice: insertPool.currentPrice,
      volume24h: insertPool.volume24h,
      isGraduated: insertPool.isGraduated,
      createdAt: new Date(),
    };
    this.pools.set(id, pool);
    return pool;
  }

  async updatePoolReserves(tokenMint: string, baseReserve: string, quoteReserve: string): Promise<Pool | undefined> {
    const pool = await this.getPoolByMint(tokenMint);
    if (pool) {
      pool.baseReserve = baseReserve;
      pool.quoteReserve = quoteReserve;
      const circulating = parseFloat(pool.totalSupply) - parseFloat(baseReserve);
      pool.currentPrice = (parseFloat(quoteReserve) / circulating).toString();
      this.pools.set(pool.id, pool);
      return pool;
    }
    return undefined;
  }

  async getTokenByMint(mintAddress: string): Promise<Token | undefined> {
    for (const token of this.tokens.values()) {
      if (token.mintAddress === mintAddress) {
        return token;
      }
    }
    return undefined;
  }
}

export const storage = new MemStorage();
