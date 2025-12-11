// src/app/page.tsx
"use client";

import { useMemo, useState } from "react";
import type { ActiveLPPosition } from "@/lib/activeLp";
import { LpCard } from "@/components/LpCard";
import type { ClassifiedTx } from "@/lib/history";
import { classifyHyperscanHistory } from "@/lib/history";
import type {
  HyperscanAddressTxResponse,
  HyperscanNextPageParams,
} from "@/lib/hyperscanTypes";
import { TxCard } from "@/components/TxCard";
import { PerpsCard } from "@/components/PerpsCard";
import type {
  PerpsPosition,
  HyperliquidAppListResponse,
  HyperliquidPortfolioItem,
  HyperliquidPerpsDetail,
} from "@/lib/hyperliquidTypes";

const PRJX_PROJECT_ID = "hyper_prjx";

export default function HomePage() {
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<ActiveLPPosition[]>([]);
  const [perpsPositions, setPerpsPositions] = useState<PerpsPosition[]>([]);
  const [txs, setTxs] = useState<ClassifiedTx[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchInitial();
  };

  const fetchInitial = async () => {
    const addr = address.trim();
    if (!addr) return;

    setLoading(true);
    setError(null);
    setTxs([]);
    setPerpsPositions([]);

    try {
      const lpPromise = (async () => {
        const lpRes = await fetch(
          `https://api.rabby.io/v1/user/complex_protocol_list?id=${addr}`
        );
        if (!lpRes.ok) {
          const text = await lpRes.text();
          throw new Error(
            `Rabby LP error ${lpRes.status} ${lpRes.statusText} – ${text.slice(
              0,
              120
            )}`
          );
        }
        const { extractActiveLPPositions } = await import("@/lib/activeLp");
        const lpJson = (await lpRes.json()) as any;
        const lp = extractActiveLPPositions(lpJson);
        setPositions(lp);
      })();

      const historyPromise = (async () => {
        let cursor: HyperscanNextPageParams | null = null;
        while (true) {
          const result = await loadHyperscanPage(addr, cursor);
          cursor = result.nextParams;
          if (!result.hasMore || !cursor) {
            break;
          }
        }
      })();

      const tokenPricesPromise = (async () => {
        const fallback: Record<string, number> = {
          WHYPE: 32.19563123986137,
          "USD₮0": 0.998,
          UBTC: 90979.19,
        };
        try {
          const resp = await fetch("https://api.prjx.com/tokens", {
            cache: "no-store",
            headers: {
              Accept: "application/json",
              "If-None-Match": "",
            },
          });
          if (!resp.ok) {
            throw new Error(
              `Token price error ${resp.status} ${resp.statusText}`
            );
          }
          const json = (await resp.json()) as {
            tokens?: Array<{
              symbol?: string;
              priceUsd?: number;
            }>;
          };
          const map: Record<string, number> = {};
          for (const token of json.tokens ?? []) {
            let sym = (token.symbol ?? "").trim();
            if (!sym) continue;
            if (sym === "USD?0") sym = "USD₮0";
            const upper = sym.toUpperCase();
            const price = Number(token.priceUsd);
            if (Number.isFinite(price)) {
              map[upper] = price;
            }
          }
          setTokenPrices(Object.keys(map).length ? map : fallback);
        } catch (tokenErr) {
          console.warn("Failed to fetch token metadata", tokenErr);
          setTokenPrices(fallback);
        }
      })();

      // Fetch Hyperliquid perps from complex_app_list
      const perpsPromise = (async () => {
        try {
          const appRes = await fetch(
            `https://api.rabby.io/v1/user/complex_app_list?id=${addr}`
          );
          if (!appRes.ok) {
            console.warn("Rabby app list error", appRes.status, appRes.statusText);
            return;
          }
          const appJson = (await appRes.json()) as HyperliquidAppListResponse;
          const hyperliquidApp = appJson.apps?.find((app) => app.id === "hyperliquid");
          if (!hyperliquidApp) return;

          const perps: PerpsPosition[] = [];
          for (const item of hyperliquidApp.portfolio_item_list) {
            if (item.detail_types.includes("perpetuals")) {
              const detail = item.detail as HyperliquidPerpsDetail;
              perps.push({
                id: item.position_index,
                account: detail.description || "Unknown",
                side: detail.side,
                leverage: detail.leverage,
                entryPrice: detail.entry_price,
                markPrice: detail.mark_price,
                liquidationPrice: detail.liquidation_price,
                pnlUsd: detail.pnl_usd_value,
                marginUsd: detail.margin_token?.amount ?? 0,
                positionSize: detail.position_token?.amount ?? 0,
                positionSymbol: detail.position_token?.symbol ?? "?",
                positionLogoUrl: detail.position_token?.logo_url ?? null,
                quoteSymbol: detail.quote_token?.symbol ?? "USDC",
              });
            }
          }
          setPerpsPositions(perps);
        } catch (perpsErr) {
          console.warn("Failed to fetch Hyperliquid perps", perpsErr);
        }
      })();

      await Promise.all([lpPromise, historyPromise, tokenPricesPromise, perpsPromise]);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Request failed");
      setPositions([]);
      setTxs([]);
    } finally {
      setLoading(false);
    }
  };

  type LoadHistoryResult = {
    nextParams: HyperscanNextPageParams | null;
    hasMore: boolean;
  };

  const buildHyperscanUrl = (
    addr: string,
    params?: HyperscanNextPageParams | null
  ) => {
    const base = `https://www.hyperscan.com/api/v2/addresses/${addr}/transactions`;
    if (!params) return base;
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      search.set(key, String(value));
    });
    return `${base}?${search.toString()}`;
  };

  /**
   * Load one page of Hyperscan history, append PRJX txs, keep track of pagination.
   */
  const loadHyperscanPage = async (
    addr: string,
    params?: HyperscanNextPageParams | null
  ): Promise<LoadHistoryResult> => {
    const historyRes = await fetch(buildHyperscanUrl(addr, params));

    if (!historyRes.ok) {
      const text = await historyRes.text();
      console.warn(
        "Hyperscan history error",
        historyRes.status,
        historyRes.statusText,
        text.slice(0, 120)
      );
      return {
        nextParams: null,
        hasMore: false,
      };
    }

    const historyJson =
      (await historyRes.json()) as HyperscanAddressTxResponse;

    const classifiedPage = classifyHyperscanHistory(
      historyJson,
      addr
    );
    const prjxTxs = classifiedPage.filter(
      (tx) =>
        tx.projectId === PRJX_PROJECT_ID &&
        tx.category === "CLAIM_FEES"
    );

    setTxs((prev) => {
      const map = new Map<string, ClassifiedTx>();
      for (const t of [...prev, ...prjxTxs]) {
        map.set(t.hash, t);
      }
      return Array.from(map.values());
    });

    const nextParams = historyJson.next_page_params ?? null;
    const pageHasMore = Boolean(nextParams);

    return {
      nextParams,
      hasMore: pageHasMore,
    };
  };

  const claimTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const tx of txs) {
      for (const token of tx.tokensIn) {
        totals.set(token.symbol, (totals.get(token.symbol) ?? 0) + token.amount);
      }
    }
    return Array.from(totals.entries()).map(([symbol, amount]) => {
      const price = tokenPrices[symbol.toUpperCase()];
      return {
        symbol,
        amount,
        usdValue: typeof price === "number" ? amount * price : undefined,
      };
    });
  }, [txs, tokenPrices]);

  const totalUsdClaimed = useMemo(() => {
    return claimTotals.reduce((sum, token) => sum + (token.usdValue ?? 0), 0);
  }, [claimTotals]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
        {/* Header */}
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            LP Radar
          </h1>
          <p className="max-w-xl text-sm text-slate-300">
            Paste any EVM wallet address. We show active LP positions
            plus PRJX transaction history (filtered to hyper_prjx).
          </p>
        </header>

        {/* Address input */}
        <section>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <div className="flex-1">
              <label
                htmlFor="address"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                EVM wallet address
              </label>
              <input
                id="address"
                type="text"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/70"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                spellCheck={false}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex items-center justify-center rounded-xl border border-emerald-500/60 bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-6"
            >
              {loading ? "Fetching..." : "Fetch data"}
            </button>
          </form>

          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </section>

        {/* LP cards (current snapshot) */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
              Active LP positions
            </h2>
            {positions.length > 0 && (
              <span className="text-xs text-slate-400">
                {positions.length} position
                {positions.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {positions.length === 0 && !loading && !error && (
            <p className="text-sm text-slate-400">
              Nothing found yet. Try an address with LPs.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {positions.map((pos) => (
              <LpCard
                key={`${pos.protocolId}-${pos.positionIndex}`}
                pos={pos}
              />
            ))}
          </div>
        </section>

        {/* Hyperliquid Perpetuals */}
        {(perpsPositions.length > 0 || loading) && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                Hyperliquid Perpetuals
              </h2>
              {perpsPositions.length > 0 && (
                <span className="text-xs text-slate-400">
                  {perpsPositions.length} position{perpsPositions.length === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {loading && perpsPositions.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
                Fetching Hyperliquid perps…
              </div>
            )}

            {/* Perps Summary */}
            {perpsPositions.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-200">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Total Unrealized PnL
                </p>
                {(() => {
                  const totalPnl = perpsPositions.reduce((sum, p) => sum + p.pnlUsd, 0);
                  const totalMargin = perpsPositions.reduce((sum, p) => sum + p.marginUsd, 0);
                  const isProfitable = totalPnl >= 0;
                  return (
                    <p className={`mt-1 text-lg font-bold ${isProfitable ? "text-emerald-300" : "text-red-400"}`}>
                      {isProfitable ? "+" : ""}${totalPnl.toFixed(2)}
                      <span className="ml-2 text-sm text-slate-400">
                        on ${totalMargin.toFixed(2)} margin
                      </span>
                    </p>
                  );
                })()}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {perpsPositions.map((pos) => (
                <PerpsCard key={pos.id} pos={pos} />
              ))}
            </div>
          </section>
        )}

        {/* PRJX transactions */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
              PRJX claim fees
            </h2>
            {txs.length > 0 && (
              <span className="text-xs text-slate-400">
                {txs.length} record{txs.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
              Fetching PRJX claim fees…
            </div>
          )}

          {txs.length === 0 && !loading && (
            <p className="text-sm text-slate-400">
              No PRJX claim fees detected yet for this address.
            </p>
          )}

          {claimTotals.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-200">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Claimed totals
              </p>
              {totalUsdClaimed > 0 && (
                <p className="mt-1 text-sm font-semibold text-emerald-200">
                  Total ≈ $
                  {totalUsdClaimed.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-3">
                {claimTotals.map((token) => (
                  <div
                    key={token.symbol}
                    className="flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1.5"
                  >
                    <span className="text-[11px] uppercase tracking-wide text-emerald-300">
                      {token.symbol}
                    </span>
                    <span className="font-semibold text-emerald-100">
                      +{token.amount.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}
                    </span>
                    {typeof token.usdValue === "number" && (
                      <span className="text-[11px] text-slate-300">
                        ≈ $
                        {token.usdValue.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {txs.map((tx) => (
              <TxCard key={tx.hash} tx={tx} />
            ))}
          </div>
        </section>
      </div>

    </main>
  );
}
