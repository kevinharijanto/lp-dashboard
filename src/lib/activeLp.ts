// src/lib/activeLp.ts
import type {
  RabbyResponse,
  RabbyProtocol,
  RabbyPortfolioItem,
  RabbyToken,
} from "./rabbyTypes";

export type ActiveLPPosition = {
  protocolId: string;
  protocolName: string;
  protocolLogoUrl: string;
  protocolSiteUrl: string;

  chain: string;
  poolId: string;
  adapterId: string;

  positionIndex: string;
  positionLabel: string;
  description?: string | null;

  totalUsdValue: number;     // position value (what you already had)
  rewardUsdValue: number;    // 🔴 NEW: total unclaimed rewards in USD

  tokens: {
    symbol: string;
    name: string;
    amount: number;
    price: number;
    logoUrl: string;
  }[];

  rewards: {
    symbol: string;
    name: string;
    amount: number;
    price: number;
    logoUrl: string;
  }[];
};

/**
 * Heuristic: is this portfolio item some kind of LP?
 */
function isLiquidityItem(protocol: RabbyProtocol, item: RabbyPortfolioItem) {
  const n = item.name.toLowerCase();
  const adapter = item.pool.adapter_id.toLowerCase();

  if (n.includes("liquidity")) return true;
  if (n.includes("lp")) return true;
  if (adapter.includes("liquidity")) return true;

  return false;
}

function mapToken(t: RabbyToken) {
  return {
    symbol: t.optimized_symbol || t.symbol,
    name: t.name,
    amount: t.amount,
    price: t.price ?? 0,
    logoUrl: t.logo_url,
  };
}

function mapPortfolioItemToActiveLP(
  protocol: RabbyProtocol,
  item: RabbyPortfolioItem
): ActiveLPPosition {
  const supply =
    item.detail?.supply_token_list ??
    item.asset_token_list ??
    [];

  const rewardsRaw = item.detail?.reward_token_list ?? [];

  const rewardUsdValue = rewardsRaw.reduce((acc, t) => {
    const amt = t.amount ?? 0;
    const px = t.price ?? 0;
    return acc + amt * px;
  }, 0);

  return {
    protocolId: protocol.id,
    protocolName: protocol.name,
    protocolLogoUrl: protocol.logo_url,
    protocolSiteUrl: protocol.site_url,

    chain: item.pool.chain,
    poolId: item.pool.id,
    adapterId: item.pool.adapter_id,

    positionIndex: item.position_index,
    positionLabel: item.name,
    description: item.detail?.description ?? null,

    totalUsdValue: item.stats.asset_usd_value,
    rewardUsdValue, // 🔴 NEW

    tokens: supply.map(mapToken),
    rewards: rewardsRaw.map(mapToken),
  };
}

/**
 * Given the raw Rabby response, extract all active LP-like positions
 * across all protocols and sort by USD value desc.
 */
export function extractActiveLPPositions(
  data: RabbyResponse
): ActiveLPPosition[] {
  const result: ActiveLPPosition[] = [];

  for (const protocol of data) {
    for (const item of protocol.portfolio_item_list || []) {
      if (!item.stats || item.stats.asset_usd_value <= 0) continue;
      if (!isLiquidityItem(protocol, item)) continue;

      result.push(mapPortfolioItemToActiveLP(protocol, item));
    }
  }

  result.sort((a, b) => b.totalUsdValue - a.totalUsdValue);
  return result;
}
