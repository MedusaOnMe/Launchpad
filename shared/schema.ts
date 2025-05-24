import { pgTable, text, serial, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull().unique(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  website: text("website"),
  twitter: text("twitter"),
  telegram: text("telegram"),
  mintAddress: text("mint_address").unique(), // Solana mint address
  creator: text("creator").notNull(),
  initialPrice: decimal("initial_price", { precision: 18, scale: 9 }).notNull(),
  currentPrice: decimal("current_price", { precision: 18, scale: 9 }).notNull(),
  maxSupply: decimal("max_supply", { precision: 18, scale: 0 }).notNull(),
  currentSupply: decimal("current_supply", { precision: 18, scale: 0 }).notNull().default("0"),
  marketCap: decimal("market_cap", { precision: 18, scale: 9 }).notNull().default("0"),
  volume24h: decimal("volume_24h", { precision: 18, scale: 9 }).notNull().default("0"),
  holders: integer("holders").notNull().default(0),
  bondingCurveProgress: decimal("bonding_curve_progress", { precision: 5, scale: 2 }).notNull().default("0"),
  isGraduated: boolean("is_graduated").notNull().default(false),
  initialBuy: decimal("initial_buy", { precision: 18, scale: 9 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  tokenId: integer("token_id").notNull().references(() => tokens.id),
  user: text("user").notNull(),
  type: text("type").notNull(), // 'buy' or 'sell'
  amount: decimal("amount", { precision: 18, scale: 9 }).notNull(),
  price: decimal("price", { precision: 18, scale: 9 }).notNull(),
  tokensAmount: decimal("tokens_amount", { precision: 18, scale: 9 }).notNull(),
  signature: text("signature").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  tokenId: integer("token_id").notNull().references(() => tokens.id),
  user: text("user").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const portfolios = pgTable("portfolios", {
  id: serial("id").primaryKey(),
  user: text("user").notNull(),
  tokenId: integer("token_id").notNull().references(() => tokens.id),
  amount: decimal("amount", { precision: 18, scale: 9 }).notNull(),
  averagePrice: decimal("average_price", { precision: 18, scale: 9 }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  username: text("username").notNull().unique(),
  profilePictureUrl: text("profile_picture_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pools = pgTable("pools", {
  id: serial("id").primaryKey(),
  tokenMint: text("token_mint").notNull().unique(),
  baseReserve: text("base_reserve").notNull().default("1073000000"), // Virtual token reserves
  quoteReserve: text("quote_reserve").notNull().default("30"), // Virtual SOL reserves  
  totalSupply: text("total_supply").notNull().default("1000000000"), // Total token supply
  currentPrice: text("current_price").notNull().default("0.000028"), // Current token price
  volume24h: text("volume_24h").notNull().default("0"), // 24h volume
  isGraduated: boolean("is_graduated").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTokenSchema = createInsertSchema(tokens).omit({
  id: true,
  currentPrice: true,
  currentSupply: true,
  marketCap: true,
  volume24h: true,
  holders: true,
  bondingCurveProgress: true,
  isGraduated: true,
  createdAt: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPoolSchema = createInsertSchema(pools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Token = typeof tokens.$inferSelect;
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Pool = typeof pools.$inferSelect;
export type InsertPool = z.infer<typeof insertPoolSchema>;
