"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { LaunchpadConfig, SALE_STATE, formatBNB, explorerAddressUrl, getTokenSaleContract } from "@/lib/contracts";
import { useWallet } from "@/lib/WalletProvider";
import Link from "next/link";

interface Props {
    config: LaunchpadConfig;
    saleAddress: string;
    isClickable?: boolean;
}

function Countdown({ deadline }: { deadline: number }) {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const update = () => {
            const now = Math.floor(Date.now() / 1000);
            const diff = deadline - now;
            if (diff <= 0) { setTimeLeft("Sale ended"); return; }
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            setTimeLeft(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [deadline]);

    return <span className="font-mono text-sm text-amber-400">{timeLeft}</span>;
}

export default function SaleCard({ config, saleAddress, isClickable }: Props) {
    const { provider } = useWallet();
    const [saleInfo, setSaleInfo] = useState<{
        name: string; symbol: string; price: bigint;
        raised: bigint; softCap: bigint; hardCap: bigint;
        deadline: number; state: number;
    } | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!saleAddress || !config.tokenSaleABI?.length) return;

        const load = async () => {
            try {
                const p = provider || new ethers.JsonRpcProvider(config.rpcUrl);
                const contract = getTokenSaleContract(saleAddress, config.tokenSaleABI, p);
                const info = await contract.getSaleInfo();
                setSaleInfo({
                    name: info.name,
                    symbol: info.symbol,
                    price: info.price,
                    raised: info.raised,
                    softCap: info.soft,
                    hardCap: info.hard,
                    deadline: Number(info.deadlineTs),
                    state: Number(info.state),
                });
            } catch (e: any) {
                setError("Failed to fetch sale data: " + (e?.message || ""));
            }
        };

        load();
        const id = setInterval(load, 10000);
        return () => clearInterval(id);
    }, [saleAddress, config, provider]);

    const progress = saleInfo
        ? Math.min(100, Number((saleInfo.raised * 10000n) / saleInfo.hardCap) / 100)
        : 0;

    const softCapProgress = saleInfo
        ? Math.min(100, Number((saleInfo.softCap * 10000n) / saleInfo.hardCap) / 100)
        : 0;

    const stateLabel = saleInfo !== null ? SALE_STATE[saleInfo.state] : "LOADING";
    const stateClass = stateLabel === "ACTIVE" ? "badge-active" : stateLabel === "SUCCESSFUL" ? "badge-success" : "badge-failed";

    const CardContent = (
        <div className={`glass p-6 space-y-6 max-w-full overflow-hidden ${isClickable ? "hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/10 transition-all cursor-pointer" : ""}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg,#f5c842,#f97316)", color: "#0a0c14" }}>
                        {saleInfo?.symbol?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-bold text-lg text-white truncate">{saleInfo?.name || "Loading..."}</h2>
                        <p className="text-sm text-white/50 truncate">{saleInfo?.symbol || "..."} · BSC Testnet</p>
                    </div>
                </div>
                <span className={`badge ${stateClass} shrink-0`}>
                    {stateLabel === "ACTIVE" && <span className="live-dot" />}
                    {stateLabel}
                </span>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: "Token Price", value: saleInfo ? `${formatBNB(saleInfo.price, 6)} BNB` : "..." },
                    { label: "Soft Cap", value: saleInfo ? `${formatBNB(saleInfo.softCap, 3)} BNB` : "..." },
                    { label: "Hard Cap", value: saleInfo ? `${formatBNB(saleInfo.hardCap, 3)} BNB` : "..." },
                    { label: "Total Raised", value: saleInfo ? `${formatBNB(saleInfo.raised, 4)} BNB` : "..." },
                ].map(s => (
                    <div key={s.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-xs text-white/40 mb-1">{s.label}</p>
                        <p className="text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Progress */}
            {saleInfo && (
                <div className="space-y-3">
                    <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        {/* Soft cap marker */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/40 z-10" style={{ left: `${softCapProgress}%` }} />
                        {/* Fill */}
                        <div className="h-full rounded-full progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-white/40">
                        <span>0 BNB</span>
                        <span className="text-amber-400/60">↑ Soft Cap</span>
                        <span>{formatBNB(saleInfo.hardCap, 2)} BNB</span>
                    </div>
                </div>
            )}

            {!saleInfo && !error && (
                <div className="space-y-3">
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-3 w-full" />
                    <div className="skeleton h-3 w-3/4" />
                </div>
            )}

            {error && <p className="text-xs text-red-400 p-3 rounded-xl bg-red-400/10 truncate">{error}</p>}

            {/* Countdown */}
            {saleInfo && saleInfo.state === 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(245,200,66,0.06)", border: "1px solid rgba(245,200,66,0.12)" }}>
                    <span className="text-xs text-white/50">Time Remaining</span>
                    <Countdown deadline={saleInfo.deadline} />
                </div>
            )}

            {/* Contract Links (only if not clickable) */}
            {!isClickable && saleAddress && (
                <>
                    <div className="divider" />
                    <div className="flex flex-wrap gap-3 text-xs text-white/40">
                        <a href={explorerAddressUrl(saleAddress)} target="_blank" rel="noreferrer" className="hover:text-amber-400 transition-colors">
                            Sale Contract ↗
                        </a>
                    </div>
                </>
            )}
        </div>
    );

    if (isClickable) {
        return (
            <Link href={`/token/${saleAddress}`}>
                {CardContent}
            </Link>
        );
    }
    return CardContent;
}
