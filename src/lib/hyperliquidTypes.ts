// src/lib/hyperliquidTypes.ts

export type HyperliquidToken = {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  logo_url: string | null;
  price: number;
  amount: number;
  app_id?: string;
};

export type HyperliquidPerpsDetail = {
  side: "Long" | "Short";
  leverage: number;
  entry_price: number;
  mark_price: number;
  liquidation_price: number;
  pnl_usd_value: number;
  margin_rate: number;
  daily_funding_rate: number;
  description?: string;
  base_token: HyperliquidToken;
  quote_token: HyperliquidToken;
  margin_token: HyperliquidToken;
  position_token: HyperliquidToken;
};

export type HyperliquidPortfolioItem = {
  name: string;
  detail_types: string[];
  detail: HyperliquidPerpsDetail | Record<string, unknown>;
  stats: {
    asset_usd_value: number;
    debt_usd_value: number;
    net_usd_value: number;
  };
  position_index: string;
  update_at: number;
  base?: {
    app_id: string;
    user_addr: string;
  };
  asset_token_list?: HyperliquidToken[];
};

export type HyperliquidApp = {
  id: string;
  name: string;
  logo_url: string;
  site_url: string;
  is_support_portfolio: boolean;
  is_visible: boolean;
  portfolio_item_list: HyperliquidPortfolioItem[];
  create_at: number;
  update_at: number;
};

export type HyperliquidAppListResponse = {
  apps: HyperliquidApp[];
  error_apps: unknown[];
};

// Helper type for extracted perps position
export type PerpsPosition = {
  id: string;
  account: string; // "Main-Account" or "Sub-Account"
  side: "Long" | "Short";
  leverage: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  pnlUsd: number;
  marginUsd: number;
  positionSize: number;
  positionSymbol: string;
  positionLogoUrl: string | null;
  quoteSymbol: string;
};
