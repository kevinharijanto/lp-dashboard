// src/lib/history.ts

export type RabbyHistoryResponse = {
  history_list: RabbyHistoryItem[];
  token_dict: Record<string, RabbyToken>;
  project_dict: Record<string, RabbyProject>;
  cate_dict: Record<string, { id: string; name: string }>;
};

export type RabbyHistoryItem = {
  cate_id: string | null;
  cex_id: string | null;
  chain: string;
  id: string; // tx hash
  idx: number;
  is_scam: boolean;
  other_addr: string | null;
  project_id: string | null;
  receives: Array<{
    amount: number;
    from_addr: string;
    price?: number | null;
    token_id: string;
  }>;
  sends: Array<{
    amount: number;
    price?: number | null;
    to_addr: string;
    token_id: string;
  }>;
  time_at: number; // unix seconds
  token_approve: null | {
    spender: string;
    token_id: string;
    value: number;
  };
  tx: {
    eth_gas_fee?: number;
    usd_gas_fee?: number;
    from_addr: string;
    id: string;
    idx: number;
    message: string | null;
    name: string | null;
    params: unknown[];
    selector: string | null;
    status: number;
    to_addr: string;
    value: number;
  };
};

export type RabbyToken =
  | RabbyErc20Token
  | RabbyNativeToken
  | RabbyNftToken;

export type RabbyErc20Token = {
  chain: string;
  credit_score: number;
  decimals: number;
  display_symbol: string | null;
  id: string;
  is_core: boolean | null;
  is_scam: boolean;
  is_suspicious: boolean;
  is_verified: boolean | null;
  is_wallet: boolean | null;
  logo_url: string | null;
  name: string;
  optimized_symbol: string;
  price: number;
  price_24h_change: number | null;
  protocol_id: string;
  symbol: string;
  time_at: number | null;
  total_supply: number;
};

export type RabbyNativeToken = RabbyErc20Token;

export type RabbyNftToken = {
  chain: string;
  collection: {
    chain: string;
    credit_score: number;
    description: string | null;
    floor_price: number;
    id: string;
    is_core: boolean | null;
    is_scam: boolean | null;
    is_suspicious: boolean | null;
    is_verified: boolean | null;
    logo_url: string;
    name: string;
  };
  collection_id: string;
  content: string;
  content_type: string | null;
  contract_id: string;
  description: string | null;
  detail_url: string;
  id: string;
  inner_id: string;
  is_erc1155: boolean;
  is_erc721: boolean;
  name: string;
  pay_token: unknown | null;
  symbol: string;
  thumbnail_url: string;
  total_supply: number;
};

export type RabbyProject = {
  chain: string;
  id: string;
  logo_url: string;
  name: string;
  site_url: string;
};

export type TxCategory =
  | "ADD_LIQUIDITY"
  | "REMOVE_LIQUIDITY"
  | "CLAIM_FEES"
  | "SWAP"
  | "APPROVE"
  | "SEND"
  | "RECEIVE"
  | "OTHER";

export interface ClassifiedTx {
  hash: string;
  chain: string;
  projectId: string | null;
  category: TxCategory;
  label: string;
  time: Date;
  scam: boolean;
  gasUsd?: number;
  tokensIn: Array<{
    symbol: string;
    amount: number;
    usdValue?: number;
  }>;
  tokensOut: Array<{
    symbol: string;
    amount: number;
    usdValue?: number;
  }>;
}

/**
 * One LP lifecycle:
 * - addTx   : ADD_LIQUIDITY
 * - claimTxs: zero or more CLAIM_FEES
 * - removeTx: optional REMOVE_LIQUIDITY (if missing => still active)
 */
export interface LpGroup {
  id: string;
  chain: string;
  projectId: string | null;
  openedAt: Date;
  closedAt?: Date;
  addTx: ClassifiedTx;
  claimTxs: ClassifiedTx[];
  removeTx?: ClassifiedTx;
}

/* ---------- helpers ---------- */

function isNftToken(t?: RabbyToken): t is RabbyNftToken {
  if (!t) return false;
  return (t as RabbyNftToken).collection !== undefined;
}

function niceSymbol(tokenId: string, dict: Record<string, RabbyToken>): string {
  const t = dict[tokenId];
  if (!t) return tokenId.slice(0, 6) + "…" + tokenId.slice(-4);
  if (isNftToken(t)) return t.symbol || t.name || "NFT";
  const base = (t.display_symbol || t.symbol || t.name || "").trim();
  return base || tokenId.slice(0, 6) + "…" + tokenId.slice(-4);
}

function usdValue(amount: number, tokenId: string, dict: Record<string, RabbyToken>): number | undefined {
  const t = dict[tokenId];
  if (!t || isNftToken(t)) return undefined;
  if (typeof t.price !== "number") return undefined;
  return amount * t.price;
}

function buildLabel(cat: TxCategory): string {
  switch (cat) {
    case "ADD_LIQUIDITY":
      return "Add liquidity";
    case "REMOVE_LIQUIDITY":
      return "Remove liquidity";
    case "CLAIM_FEES":
      return "Claim fees";
    case "SWAP":
      return "Swap";
    case "APPROVE":
      return "Approve token";
    case "SEND":
      return "Send";
    case "RECEIVE":
      return "Receive";
    default:
      return "Other";
  }
}

/* ---------- classification ---------- */

/**
 * Classify a single Rabby history item into a TxCategory.
 *
 * LP rules (generic, any Uniswap-V3-like system):
 *  - ADD_LIQUIDITY   : wallet sends fungible tokens and receives LP NFT(s)
 *  - REMOVE_LIQUIDITY: wallet sends LP NFT(s) and receives fungible tokens
 *  - CLAIM_FEES      : wallet receives only fungible tokens (no NFTs, no sends)
 */
function classifyItem(
  item: RabbyHistoryItem,
  tokenDict: Record<string, RabbyToken>
): TxCategory {
  const name = (item.tx.name || "").toLowerCase();

  const receivesNft = item.receives.some((r) =>
    isNftToken(tokenDict[r.token_id])
  );
  const sendsNft = item.sends.some((s) =>
    isNftToken(tokenDict[s.token_id])
  );
  const sendFungible = item.sends.filter(
    (s) => !isNftToken(tokenDict[s.token_id])
  );
  const receiveFungible = item.receives.filter(
    (r) => !isNftToken(tokenDict[r.token_id])
  );
  const sendsAnyToken = sendFungible.length > 0 || sendsNft;
  const receivesAnyToken = receiveFungible.length > 0 || receivesNft;

  const uniqueSendTokens = new Set(sendFungible.map((s) => s.token_id));
  const uniqueReceiveTokens = new Set(
    receiveFungible.map((r) => r.token_id)
  );
  if (item.tx.value && item.tx.value > 0) {
    uniqueSendTokens.add(`native:${item.chain}`);
  }

  // LP-type operations (works for PRJX and any other Uniswap-V3-like system)
  if (name === "multicall") {
    // pure inflow => claim fees
    if (!receivesNft && !sendsNft && receivesAnyToken && !sendsAnyToken) {
      return "CLAIM_FEES";
    }

    if (receivesNft && sendsAnyToken) {
      return "ADD_LIQUIDITY";
    }
    if (sendsNft && receivesAnyToken) {
      return "REMOVE_LIQUIDITY";
    }

    if (uniqueSendTokens.size >= 2) {
      return "ADD_LIQUIDITY";
    }
    if (sendsAnyToken && uniqueReceiveTokens.size >= 2) {
      // require some outbound tokens to avoid mislabeling claims
      return "REMOVE_LIQUIDITY";
    }
  }

  // Generic fallbacks
  if (item.cate_id === "approve" || name === "approve") {
    return "APPROVE";
  }
  if (item.cate_id === "send") return "SEND";
  if (item.cate_id === "receive") return "RECEIVE";
  if (name === "exactinputsingle") return "SWAP";

  return "OTHER";
}

/**
 * Transform a single Rabby page into classified txs.
 * You can later filter by category / project / chain.
 */
export function classifyHistory(
  resp: RabbyHistoryResponse
): ClassifiedTx[] {
  // Rabby already scopes history_list to the queried wallet, so we keep
  // every entry; filtering by tx.from_addr / tx.to_addr would drop contract
  // calls (multicall, NFT manager, etc.) that still belong to the wallet.
  return resp.history_list.map((item) => {
    const cat = classifyItem(item, resp.token_dict);

    const tokensOut = item.sends.map((s) => ({
      symbol: niceSymbol(s.token_id, resp.token_dict),
      amount: s.amount,
      usdValue: usdValue(s.amount, s.token_id, resp.token_dict),
    }));

    const tokensIn = item.receives.map((r) => ({
      symbol: niceSymbol(r.token_id, resp.token_dict),
      amount: r.amount,
      usdValue: usdValue(r.amount, r.token_id, resp.token_dict),
    }));

    return {
      hash: item.id,
      chain: item.chain,
      projectId: item.project_id,
      category: cat,
      label: buildLabel(cat),
      time: new Date(item.time_at * 1000),
      scam: item.is_scam,
      gasUsd: item.tx.usd_gas_fee,
      tokensIn,
      tokensOut,
    };
  });
}

/* ---------- grouping into LP lifecycles ---------- */

/**
 * Group classified txs into LP lifecycles.
 *
 * Heuristic:
 *  - When we see ADD_LIQUIDITY => open a new group.
 *  - CLAIM_FEES goes to the most recent still-open group with same chain & projectId.
 *  - REMOVE_LIQUIDITY closes the most recent still-open group with same chain & projectId.
 *
 * Assumption: for a given chain + project, user doesn't juggle many LP NFTs
 * at exactly the same time; this will still be "good enough" for tracking PnL.
 */
export function groupLpHistory(txs: ClassifiedTx[]): LpGroup[] {
  // sort oldest -> newest first
  const sorted = [...txs].sort(
    (a, b) => a.time.getTime() - b.time.getTime()
  );

  const groups: LpGroup[] = [];
  const open: LpGroup[] = [];

  for (const tx of sorted) {
    if (tx.category === "ADD_LIQUIDITY") {
      const g: LpGroup = {
        id: `${tx.chain}-${tx.projectId ?? "unknown"}-${tx.hash}`,
        chain: tx.chain,
        projectId: tx.projectId ?? null,
        openedAt: tx.time,
        addTx: tx,
        claimTxs: [],
      };
      groups.push(g);
      open.push(g);
      continue;
    }

    if (tx.category === "CLAIM_FEES") {
      const g = [...open]
        .reverse()
        .find(
          (grp) =>
            grp.chain === tx.chain &&
            grp.projectId === tx.projectId
        );
      if (g) {
        g.claimTxs.push(tx);
      }
      continue;
    }

    if (tx.category === "REMOVE_LIQUIDITY") {
      const idxFromEnd = [...open]
        .reverse()
        .findIndex(
          (grp) =>
            grp.chain === tx.chain &&
            grp.projectId === tx.projectId
        );
      if (idxFromEnd !== -1) {
        const realIndex = open.length - 1 - idxFromEnd;
        const g = open[realIndex];
        g.removeTx = tx;
        g.closedAt = tx.time;
        open.splice(realIndex, 1);
      }
      continue;
    }
  }

  // newest LPs first in UI
  groups.sort(
    (a, b) => b.openedAt.getTime() - a.openedAt.getTime()
  );
  return groups;
}

// NonfungiblePositionManager address
const NPM_ADDRESS =
  "0xeaD19AE861c29bBb2101E834922B2FEee69B9091".toLowerCase();

// Selectors
const SEL_ADD_LIQ_1 = "0x88316456"; // create LP / increase
const SEL_ADD_LIQ_2 = "0x219f5d17"; // alt increase (from your other tx)
const SEL_REMOVE_LIQ = "0x0c49ccbe";
const SEL_COLLECT    = "0xfc6f7865";
const SEL_UNWRAP     = "0x49404b7c";
const SEL_SWEEP      = "0xdf2ab5bb";
const SEL_REFUND     = "0x12210e8a";

const FEE_ONLY_SELECTORS = new Set([
  SEL_COLLECT,
  SEL_UNWRAP,
  SEL_SWEEP,
  SEL_REFUND,
]);

import type { HyperscanAddressTxItem } from "./hyperscanTypes";

function getSelectors(item: HyperscanAddressTxItem): string[] {
  const di = item.decoded_input;
  if (!di || !di.parameters?.length) return [];
  const dataParam = di.parameters[0];
  if (dataParam.type !== "bytes[]" || !Array.isArray(dataParam.value)) return [];
  return dataParam.value.map((hex) => hex.slice(0, 10)); // "0x" + 8 chars
}

function getInnerCalls(item: HyperscanAddressTxItem): string[] {
  const di = item.decoded_input;
  if (!di || !di.parameters?.length) return [];
  const dataParam = di.parameters[0];
  if (dataParam.type !== "bytes[]" || !Array.isArray(dataParam.value)) return [];
  return dataParam.value as string[];
}

function chunk32(dataWithoutSelector: string): string[] {
  const body = dataWithoutSelector.replace(/^0x/, "");
  const chunks: string[] = [];
  for (let i = 0; i < body.length; i += 64) {
    chunks.push(body.slice(i, i + 64).padEnd(64, "0"));
  }
  return chunks;
}

function classifyHyperscanCategory(
  item: HyperscanAddressTxItem,
  myAddress: string
): TxCategory {
  const toAddr = item.to?.hash?.toLowerCase() ?? "";
  const selectors = getSelectors(item);

  const hasAdd =
    selectors.includes(SEL_ADD_LIQ_1) ||
    selectors.includes(SEL_ADD_LIQ_2);

  const hasRemove = selectors.includes(SEL_REMOVE_LIQ);

  const isFeeOnly =
    !hasAdd &&
    !hasRemove &&
    selectors.length > 0 &&
    selectors.every((s) => FEE_ONLY_SELECTORS.has(s));

  if (
    toAddr === NPM_ADDRESS &&
    item.method === "multicall" &&
    selectors.length > 0
  ) {
    if (hasAdd) return "ADD_LIQUIDITY";
    if (hasRemove) return "REMOVE_LIQUIDITY";
    if (isFeeOnly) return "CLAIM_FEES";
  }

  // For now we don't try to classify swaps/sends/etc.
  return "OTHER";
}

import type {
  HyperscanAddressTxResponse,
  HyperscanAddressTxItem,
} from "./hyperscanTypes";

// simple decimal scaler
function toDecimal(raw: string | bigint, decimals: number): number {
  const big =
    typeof raw === "bigint"
      ? raw
      : raw.startsWith("0x")
      ? BigInt(raw)
      : BigInt(raw);
  const factor = 10n ** BigInt(decimals);
  const intPart = big / factor;
  const fracPart = big % factor;
  const fracStr = fracPart.toString().padStart(decimals, "0");
  return Number(`${intPart}.${fracStr}`);
}

const TOKENS: Record<
  string,
  {
    symbol: string;
    decimals: number;
  }
> = {
  "0x5555555555555555555555555555555555555555": {
    symbol: "WHYPE",
    decimals: 18,
  },
  "0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb": {
    symbol: "USD₮0",
    decimals: 6,
  },
  "0x9fdbda0a5e284c32744d2f17ee5c74b284993463": {
    symbol: "UBTC",
    decimals: 8,
  },
  "0x8bd19e19ef8d5ecbe6bbeeab59c51fdda0c74023": {
    symbol: "USD₮0",
    decimals: 6,
  },
};

function extractTokensInOut(
  item: HyperscanAddressTxItem,
  myAddress: string
): { tokensIn: ClassifiedTx["tokensIn"]; tokensOut: ClassifiedTx["tokensOut"] } {
  const me = myAddress.toLowerCase();
  const tokensIn: ClassifiedTx["tokensIn"] = [];
  const tokensOut: ClassifiedTx["tokensOut"] = [];
  const transfers = item.token_transfers ?? [];

  for (const transfer of transfers) {
    const tokenAddr = transfer.token?.hash?.toLowerCase();
    if (!tokenAddr) continue;
    const meta = TOKENS[tokenAddr];
    if (!meta) continue;

    const amount = toDecimal(transfer.value, meta.decimals);
    const from = transfer.from?.hash?.toLowerCase();
    const to = transfer.to?.hash?.toLowerCase();

    if (to === me) {
      tokensIn.push({
        symbol: meta.symbol,
        amount,
      });
    }

    if (from === me) {
      tokensOut.push({
        symbol: meta.symbol,
        amount,
      });
    }
  }

  return { tokensIn, tokensOut };
}

type TokenAmount = { symbol: string; amount: number };

function wordToAddress(word: string): string {
  return ("0x" + word.slice(-40)).toLowerCase();
}

function decodePrjxTokens(
  item: HyperscanAddressTxItem,
  category: TxCategory
): { tokensIn: TokenAmount[]; tokensOut: TokenAmount[] } {
  const tokensIn: TokenAmount[] = [];
  const tokensOut: TokenAmount[] = [];
  const innerCalls = getInnerCalls(item);

  if (category === "ADD_LIQUIDITY") {
    const addCall = innerCalls.find(
      (call) =>
        call.startsWith(SEL_ADD_LIQ_1) ||
        call.startsWith(SEL_ADD_LIQ_2)
    );
    if (addCall) {
      const words = chunk32(addCall.slice(10));
      if (words.length > 6) {
        const amount0Desired = BigInt("0x" + words[5]);
        const amount1Desired = BigInt("0x" + words[6]);
        tokensOut.push({
          symbol: "WHYPE",
          amount: toDecimal(amount0Desired, 18),
        });
        tokensOut.push({
          symbol: "USD₮0",
          amount: toDecimal(amount1Desired, 6),
        });
      }
    }
  }

  if (category === "CLAIM_FEES" || category === "REMOVE_LIQUIDITY") {
    const unwrapCall = innerCalls.find((call) =>
      call.startsWith(SEL_UNWRAP)
    );
    if (unwrapCall) {
      const words = chunk32(unwrapCall.slice(10));
      if (words.length > 0) {
        const amountMinimum = BigInt("0x" + words[0]);
        tokensIn.push({
          symbol: "WHYPE",
          amount: toDecimal(amountMinimum, 18),
        });
      }
    }

    const sweepCall = innerCalls.find((call) =>
      call.startsWith(SEL_SWEEP)
    );
    if (sweepCall) {
      const words = chunk32(sweepCall.slice(10));
      if (words.length > 1) {
        const tokenAddr = wordToAddress(words[0]);
        const meta = TOKENS[tokenAddr];
        if (meta) {
          const amountMinimum = BigInt("0x" + words[1]);
          tokensIn.push({
            symbol: meta.symbol,
            amount: toDecimal(amountMinimum, meta.decimals),
          });
        }
      }
    }
  }

  return { tokensIn, tokensOut };
}

function isSuccessfulHyperscanTx(item: HyperscanAddressTxItem): boolean {
  if (item.status !== "ok") return false;
  if (item.result && item.result !== "success") return false;
  if (item.has_error_in_internal_transactions) return false;
  return true;
}

/**
 * Map Hyperscan transactions to ClassifiedTx[]
 *
 * For now:
 * - we only fill tokensIn/tokensOut for PRJX LP actions
 * - projectId is hard-coded to "hyper_prjx" when NPM is hit
 */
export function classifyHyperscanHistory(
  resp: HyperscanAddressTxResponse,
  myAddress: string
): ClassifiedTx[] {
  return resp.items.filter(isSuccessfulHyperscanTx).map((item) => {
    const category = classifyHyperscanCategory(item, myAddress);
    const toAddr = item.to?.hash?.toLowerCase() ?? "";
    const isPrjxNpm = toAddr === NPM_ADDRESS;
    let tokensIn: ClassifiedTx["tokensIn"] = [];
    let tokensOut: ClassifiedTx["tokensOut"] = [];

    if (
      isPrjxNpm &&
      (category === "ADD_LIQUIDITY" ||
        category === "REMOVE_LIQUIDITY" ||
        category === "CLAIM_FEES")
    ) {
      ({ tokensIn, tokensOut } = decodePrjxTokens(item, category));
    }

    if (tokensIn.length === 0 && tokensOut.length === 0) {
      ({ tokensIn, tokensOut } = extractTokensInOut(item, myAddress));
    }

    return {
      hash: item.hash,
      chain: item.chain,
      projectId: isPrjxNpm ? "hyper_prjx" : null,
      category,
      label: buildLabel(category),
      time: new Date(item.timestamp),
      scam: false, // Hyperscan has is_scam? if yes, map it.
      gasUsd: null, // fill if Hyperscan provides gas price * price
      tokensIn,
      tokensOut,
    };
  });
}
