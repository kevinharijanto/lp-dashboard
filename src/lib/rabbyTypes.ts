// lib/rabbyTypes.ts
export type RabbyToken = {
  id: string;
  chain: string;
  name: string;
  symbol: string;
  display_symbol?: string | null;
  optimized_symbol?: string | null;
  decimals: number;
  logo_url: string;
  protocol_id?: string;
  price: number;
  is_verified: boolean;
  is_core: boolean;
  is_wallet: boolean;
  time_at: number | null;
  amount: number;
  claimable_amount?: number;
};

export type RabbyStats = {
  asset_usd_value: number;
  debt_usd_value: number;
  net_usd_value: number;
};

export type RabbyPortfolioItemDetail = {
  supply_token_list?: RabbyToken[];
  reward_token_list?: RabbyToken[];
  description?: string;
};

export type RabbyPool = {
  id: string;
  chain: string;
  project_id: string;
  adapter_id: string;
  controller: string;
  index: number | null;
  time_at: number;
};

export type RabbyPortfolioItem = {
  stats: RabbyStats;
  asset_dict?: Record<string, number>;
  asset_token_list?: RabbyToken[];
  withdraw_actions?: any[];
  update_at: number;
  name: string; // e.g. "Liquidity Pool", "Rewards"
  detail_types: string[]; // e.g. ["common"]
  detail: RabbyPortfolioItemDetail;
  proxy_detail?: Record<string, unknown>;
  position_index: string;
  pool: RabbyPool;
};

export type RabbyProtocol = {
  id: string; // "hyper_prjx"
  chain: string;
  name: string; // "Project X"
  site_url: string;
  logo_url: string;
  has_supported_portfolio: boolean;
  tvl: number;
  portfolio_item_list: RabbyPortfolioItem[];
};

export type RabbyResponse = RabbyProtocol[];
