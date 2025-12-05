// src/components/LpGroupCard.tsx
"use client";

import type { LpGroup } from "@/lib/history";
import { TxCard } from "./TxCard"; // use the TxCard we had before

export function LpGroupCard({ group }: { group: LpGroup }) {
  const status = group.removeTx ? "Closed" : "Active";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            LP group · {group.projectId ?? "Unknown project"} ·{" "}
            {group.chain.toUpperCase()}
          </h3>
          <p className="text-xs text-slate-400">
            Opened {group.openedAt.toLocaleString()}
            {" · "}
            {group.removeTx
              ? `Closed ${group.closedAt?.toLocaleString()}`
              : "Still active (no remove yet)"}
          </p>
        </div>
        <span
          className={
            "rounded-full px-3 py-1 text-xs font-semibold " +
            (group.removeTx
              ? "bg-slate-800 text-slate-200"
              : "bg-emerald-500/15 text-emerald-300")
          }
        >
          {status}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {/* Add liquidity */}
        <TxCard tx={group.addTx} />

        {/* Claims */}
        {group.claimTxs.map((tx) => (
          <TxCard key={tx.hash} tx={tx} />
        ))}

        {/* Remove liquidity */}
        {group.removeTx && <TxCard tx={group.removeTx} />}
      </div>
    </div>
  );
}
