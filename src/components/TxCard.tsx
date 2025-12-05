// src/components/TxCard.tsx
"use client";

import Link from "next/link";
import type { ClassifiedTx } from "@/lib/history";

interface Props {
  tx: ClassifiedTx;
  explorerBase?: string; // e.g. "https://hyperevmscan.io/tx/"
}

export function TxCard({ tx, explorerBase = "https://hyperevmscan.io/tx/" }: Props) {
  const totalInUsd =
    tx.tokensIn.reduce((sum, t) => sum + (t.usdValue ?? 0), 0) || undefined;
  const totalOutUsd =
    tx.tokensOut.reduce((sum, t) => sum + (t.usdValue ?? 0), 0) || undefined;
  const timestamp = tx.time ? tx.time.toLocaleString() : "-";
  const chainLabel = tx.chain ? tx.chain.toUpperCase() : "UNKNOWN";
  const formatTokenAmount = (value: number) =>
    value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-slate-400">
            {tx.category}
            {tx.scam && (
              <span className="ml-2 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                Scam flagged
              </span>
            )}
          </span>
          <span className="font-semibold text-slate-100">
            {tx.label}
          </span>
          <span className="text-xs text-slate-400">
            {timestamp} · {chainLabel}
          </span>
        </div>
        <div className="text-right text-xs text-slate-400">
          {typeof tx.gasUsd === "number" && (
            <div>Gas ≈ ${tx.gasUsd.toFixed(4)}</div>
          )}
          {(totalInUsd || totalOutUsd) && (
            <div className="mt-1">
              {totalInUsd && <>In ≈ ${totalInUsd.toFixed(2)} </>}
              {totalOutUsd && (
                <span className="ml-1">
                  Out ≈ ${totalOutUsd.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs">
        {tx.tokensOut.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900/80 px-3 py-2">
            <span className="text-[11px] uppercase tracking-wide text-rose-300">
              Sends
            </span>
            {tx.tokensOut.map((token, idx) => (
              <span key={`${tx.hash}-out-${idx}`} className="font-semibold text-rose-200">
                -{formatTokenAmount(token.amount)} {token.symbol}
              </span>
            ))}
          </div>
        )}

        {tx.tokensIn.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900/80 px-3 py-2">
            <span className="text-[11px] uppercase tracking-wide text-emerald-300">
              Receives
            </span>
            {tx.tokensIn.map((token, idx) => (
              <span key={`${tx.hash}-in-${idx}`} className="font-semibold text-emerald-200">
                +{formatTokenAmount(token.amount)} {token.symbol}
              </span>
            ))}
          </div>
        )}

        {tx.tokensIn.length === 0 && tx.tokensOut.length === 0 && (
          <span className="rounded-2xl bg-slate-900/60 px-3 py-2 text-slate-500">
            No token movements recorded.
          </span>
        )}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        <Link
          href={`${explorerBase}${tx.hash}`}
          target="_blank"
          className="underline hover:text-slate-300"
        >
          View on explorer
        </Link>
      </div>
    </div>
  );
}
