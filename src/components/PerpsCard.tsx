// src/components/PerpsCard.tsx
import Image from "next/image";
import type { PerpsPosition } from "@/lib/hyperliquidTypes";

type Props = {
    pos: PerpsPosition;
};

export function PerpsCard({ pos }: Props) {
    const isLong = pos.side === "Long";
    const isProfitable = pos.pnlUsd >= 0;

    const pnlPercent = pos.marginUsd > 0
        ? (pos.pnlUsd / pos.marginUsd) * 100
        : 0;

    return (
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-4 shadow-[0_0_40px_rgba(0,0,0,0.45)] flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-black/40">
                        {pos.positionLogoUrl && (
                            <Image
                                src={pos.positionLogoUrl}
                                alt={pos.positionSymbol}
                                fill
                                className="object-cover"
                            />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                                {pos.positionSymbol}/{pos.quoteSymbol}
                            </span>
                            <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isLong
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                                        : "bg-red-500/20 text-red-400 border border-red-500/50"
                                    }`}
                            >
                                {pos.side}
                            </span>
                            <span className="rounded-md border border-slate-600/70 bg-slate-800/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-400">
                                {pos.leverage}x
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                            {pos.account} • Hyperliquid
                        </div>
                    </div>
                </div>

                {/* Position Size */}
                <div className="text-right text-xs text-slate-400">
                    <div>Size</div>
                    <div className="text-lg font-bold text-slate-50">
                        {pos.positionSize.toLocaleString(undefined, { maximumFractionDigits: 4 })} {pos.positionSymbol}
                    </div>
                </div>
            </div>

            {/* PnL Block */}
            <div className="rounded-2xl bg-slate-950/70 border border-slate-700/60 px-4 py-3 flex flex-col gap-1">
                <div className="text-[11px] text-slate-400">Unrealized PnL</div>
                <div className="flex items-baseline gap-2">
                    <span
                        className={`text-2xl font-bold drop-shadow-[0_0_10px_rgba(16,185,129,0.6)] ${isProfitable ? "text-emerald-300" : "text-red-400"
                            }`}
                    >
                        {isProfitable ? "+" : ""}${pos.pnlUsd.toFixed(2)}
                    </span>
                    <span
                        className={`text-sm font-semibold ${isProfitable ? "text-emerald-400" : "text-red-400"
                            }`}
                    >
                        ({isProfitable ? "+" : ""}{pnlPercent.toFixed(2)}%)
                    </span>
                </div>
            </div>

            {/* Price Info Grid */}
            <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl bg-slate-800/50 px-3 py-2">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">Entry</div>
                    <div className="font-semibold text-slate-100">
                        ${pos.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </div>
                </div>
                <div className="rounded-xl bg-slate-800/50 px-3 py-2">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">Mark</div>
                    <div className="font-semibold text-slate-100">
                        ${pos.markPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </div>
                </div>
                <div className="rounded-xl bg-slate-800/50 px-3 py-2">
                    <div className="text-[10px] text-red-400 uppercase tracking-wide">Liq.</div>
                    <div className="font-semibold text-red-300">
                        ${pos.liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Margin Footer */}
            <div className="flex justify-between items-center text-[10px] text-slate-500">
                <span>Margin: ${pos.marginUsd.toFixed(2)} USDC</span>
                <span>ID: {shorten(pos.id)}</span>
            </div>
        </div>
    );
}

function shorten(id: string) {
    if (!id) return "";
    if (id.length <= 16) return id;
    return `${id.slice(0, 8)}…${id.slice(-6)}`;
}
