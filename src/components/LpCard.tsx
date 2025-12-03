// src/components/LpCard.tsx
import Image from "next/image";
import type { ActiveLPPosition } from "@/lib/activeLp";

type Props = {
  pos: ActiveLPPosition;
};

export function LpCard({ pos }: Props) {
  const totalUsd = pos.totalUsdValue ?? 0;
  const rewardUsd = pos.rewardUsdValue ?? 0;

  const suppliedTotalUsd = pos.tokens.reduce(
    (sum, t) => sum + t.amount * t.price,
    0
  );

  const pairLabel =
    pos.tokens.length === 2
      ? `${pos.tokens[0].symbol}/${pos.tokens[1].symbol}`
      : pos.tokens.map((t) => t.symbol).join(" / ");

  return (
    <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-4 shadow-[0_0_40px_rgba(0,0,0,0.45)] flex flex-col gap-4">
      {/* Top header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-black/40">
            {pos.protocolLogoUrl && (
              <Image
                src={pos.protocolLogoUrl}
                alt={pos.protocolName}
                fill
                className="object-cover"
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {pairLabel || pos.protocolName}
              </span>
              <span className="rounded-md border border-slate-600/70 bg-slate-800/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                {pos.chain.toUpperCase()}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {pos.positionLabel} • #{pos.positionIndex}
            </div>
          </div>
        </div>

        <div className="text-right text-xs text-slate-400">
          <div>Est. value</div>
          <div className="text-xl font-bold text-slate-50">
            ${totalUsd.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Middle: Unclaimed Yield block */}
      <div className="rounded-2xl bg-slate-950/70 border border-slate-700/60 px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">
            APR{" "}
            <span className="font-semibold text-slate-100">
              –
            </span>
          </span>
          {rewardUsd > 0 && (
            <span className="text-emerald-300 text-[11px]">
              Pending: ${rewardUsd.toFixed(4)}
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400">Unclaimed Yield</div>
        <div className="text-2xl font-bold text-emerald-300 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
          ${rewardUsd.toFixed(4)}
        </div>
      </div>

      {/* Supplied tokens */}
      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-slate-400">
          Position : ${totalUsd.toFixed(2)}
        </div>
        <div className="flex flex-wrap gap-2">
          {pos.tokens.map((t) => {
            const usd = t.amount * t.price;
            const share =
              suppliedTotalUsd > 0 ? (usd / suppliedTotalUsd) * 100 : 0;
            return (
              <div
                key={`${pos.positionIndex}-${t.symbol}-${t.name}`}
                className="flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1"
              >
                <div className="relative h-5 w-5 rounded-full overflow-hidden bg-black/40">
                  {t.logoUrl && (
                    <Image
                      src={t.logoUrl}
                      alt={t.symbol}
                      fill
                      className="object-contain"
                    />
                  )}
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-medium">
                    {t.amount.toPrecision(4)} {t.symbol}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ≈ ${usd.toFixed(2)} • {share.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rewards list */}
      {pos.rewards.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-slate-400">
            Rewards (unclaimed)
          </div>
          <div className="flex flex-wrap gap-2">
            {pos.rewards.map((t) => {
              const usd = t.amount * t.price;
              return (
                <div
                  key={`${pos.positionIndex}-reward-${t.symbol}-${t.name}`}
                  className="flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-3 py-1"
                >
                  <div className="relative h-5 w-5 rounded-full overflow-hidden bg-black/40">
                    {t.logoUrl && (
                      <Image
                        src={t.logoUrl}
                        alt={t.symbol}
                        fill
                        className="object-contain"
                      />
                    )}
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-medium text-emerald-200">
                      {t.amount.toPrecision(4)} {t.symbol}
                    </span>
                    <span className="text-[10px] text-emerald-300/80">
                      ≈ ${usd.toFixed(4)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-1 flex justify-between items-center text-[10px] text-slate-500">
        <span>Pool: {shorten(pos.poolId)}</span>
        <span>Adapter: {pos.adapterId}</span>
      </div>
    </div>
  );
}

function shorten(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
