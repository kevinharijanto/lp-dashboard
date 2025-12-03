// app/page.tsx
"use client";

import { useState } from "react";
import type { ActiveLPPosition } from "@/lib/activeLp";
import { LpCard } from "@/components/LpCard";

export default function HomePage() {
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<ActiveLPPosition[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchPositions();
  };

  const fetchPositions = async () => {
    setLoading(true);
    setError(null);

    try {
      const addr = address.trim();
      if (!addr) {
        setError("Please enter an EVM address.");
        setPositions([]);
        return;
      }

      const rabbyRes = await fetch(
        `https://api.rabby.io/v1/user/complex_protocol_list?id=${addr}`
      );

      if (!rabbyRes.ok) {
        const text = await rabbyRes.text();
        setError(
          `Rabby error ${rabbyRes.status} ${rabbyRes.statusText} – ${text.slice(
            0,
            120
          )}`
        );
        setPositions([]);
        return;
      }

      const { extractActiveLPPositions } = await import("@/lib/activeLp");
      const data = (await rabbyRes.json()) as any;
      const lp = extractActiveLPPositions(data);

      setPositions(lp);
    } catch (err: any) {
      setError(err?.message ?? "Request failed");
      setPositions([]);
    } finally {
      setLoading(false);
    }
  };

  const pendingYieldUsd = positions.reduce(
    (sum, p) => sum + (p.rewardUsdValue ?? 0),
    0
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight">LP Radar</h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Paste any EVM wallet address. We ask Rabby for the full portfolio
            and surface only <strong>active LP positions</strong> (any chain /
            protocol) as clean cards.
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
                className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1"
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
              className="mt-2 sm:mt-6 inline-flex items-center justify-center rounded-xl border border-emerald-500/60 bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Fetching..." : "Fetch LP positions"}
            </button>
          </form>

          {error && (
            <p className="mt-2 text-xs text-red-400 whitespace-pre-line">
              {error}
            </p>
          )}
        </section>

        {/* LP list */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                Active LP positions
              </h2>
              {positions.length > 0 && (
                <span className="text-xs text-slate-400">
                  {positions.length} position
                  {positions.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {positions.length > 0 && (
              <div className="text-xs text-slate-300">
                Pending Yield{" "}
                <span className="font-semibold text-emerald-300">
                  ${pendingYieldUsd.toFixed(4)}
                </span>
              </div>
            )}
          </div>

          {positions.length === 0 && !loading && !error && (
            <p className="text-sm text-slate-400">
              Nothing found yet. Try an address with LPs (for example your
              Hyper / PRJX wallet).
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
      </div>
    </main>
  );
}
