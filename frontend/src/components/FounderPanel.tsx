"use client";
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { LaunchpadConfig, SALE_STATE, formatBNB, explorerTxUrl, explorerAddressUrl, shortAddress, getTokenSaleContract, getEscrowContract } from "@/lib/contracts";
import { useWallet } from "@/lib/WalletProvider";
import { toast } from "@/lib/toast";

interface Props {
    config: LaunchpadConfig;
    saleAddress: string;
    escrowAddress: string;
}

interface LiveConfig {
    tokenName: string;
    tokenSymbol: string;
    tokenPrice: bigint;
    softCap: bigint;
    hardCap: bigint;
    deadline: number;
    state: number;
    totalRaised: bigint;
    escrowBalance: bigint;
    m1Released: boolean;
    m2Released: boolean;
    progress: number;
    softCapProgress: number;
    timeLeft: string;
    owner: string;
}

function useCountdown(deadline: number) {
    const [label, setLabel] = useState("");
    useEffect(() => {
        const tick = () => {
            const now = Math.floor(Date.now() / 1000);
            const diff = deadline - now;
            if (diff <= 0) { setLabel("Expired"); return; }
            const d = Math.floor(diff / 86400);
            const h = Math.floor((diff % 86400) / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            setLabel(d > 0 ? `${d}d ${h}h ${m}m` : `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [deadline]);
    return label;
}

export default function FounderPanel({ config, saleAddress, escrowAddress }: Props) {
    const { address, signer, provider } = useWallet();
    const [cfg, setCfg] = useState<LiveConfig | null>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const countdown = useCountdown(cfg?.deadline ?? 0);

    // ── Load live data from both contracts ────────────────────────────────────
    const refresh = useCallback(async () => {
        if (!saleAddress || !escrowAddress) return;
        try {
            const p = provider || new ethers.JsonRpcProvider(config.rpcUrl);
            const sale = getTokenSaleContract(saleAddress, config.tokenSaleABI, p);
            const escrow = getEscrowContract(escrowAddress, config.escrowABI, p);

            const [info, escBal, mStatus, saleOwner] = await Promise.all([
                sale.getSaleInfo(),
                escrow.getBalance(),
                escrow.getMilestoneStatus(),
                sale.owner()
            ]);

            const raised = info.raised as bigint;
            const hard = info.hard as bigint;
            const soft = info.soft as bigint;

            setCfg({
                tokenName: info.name,
                tokenSymbol: info.symbol,
                tokenPrice: info.price as bigint,
                softCap: soft,
                hardCap: hard,
                deadline: Number(info.deadlineTs),
                state: Number(info.state),
                totalRaised: raised,
                escrowBalance: escBal as bigint,
                m1Released: mStatus.m1Released,
                m2Released: mStatus.m2Released,
                progress: hard > 0n ? Math.min(100, Number((raised * 10000n) / hard) / 100) : 0,
                softCapProgress: hard > 0n ? Math.min(100, Number((soft * 10000n) / hard) / 100) : 0,
                timeLeft: "",
                owner: saleOwner
            });
            setLastRefresh(new Date());
        } catch (e: any) {
            console.error("Founder data load error:", e?.message);
        }
    }, [saleAddress, escrowAddress, config, provider]);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 15000);
        return () => clearInterval(id);
    }, [refresh]);

    // ── Execute a contract transaction ────────────────────────────────────────
    const execTx = async (label: string, fn: () => Promise<any>) => {
        if (!signer) { toast("Connect your founder wallet first", "warning"); return; }
        setLoading(label);
        try {
            const tx = await fn();
            toast(`${label} — transaction submitted…`, "info");
            const receipt = await tx.wait();
            toast(`${label} confirmed! 🎉`, "success");
            window.open(explorerTxUrl(receipt.hash), "_blank");
            await refresh();
        } catch (e: any) {
            const msg = e?.reason || e?.message || "Transaction failed";
            toast(msg.includes("user rejected") || msg.includes("User denied") ? "Transaction cancelled" : msg,
                msg.includes("user rejected") || msg.includes("User denied") ? "warning" : "error");
        } finally {
            setLoading(null);
        }
    };

    const handleEndSale = () => execTx("End Sale", () => getTokenSaleContract(saleAddress, config.tokenSaleABI, signer!).endSale());
    const handleRelease = (n: 1 | 2) => execTx(`Release Milestone ${n}`, () => getEscrowContract(escrowAddress, config.escrowABI, signer!).releaseMilestone(n));

    // ── Helpers ───────────────────────────────────────────────────────────────
    const Spinner = ({ size = 14 }: { size?: number }) => (
        <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
    );

    const stateLabel = cfg ? SALE_STATE[cfg.state] : "LOADING";
    const stateColor: Record<string, string> = { ACTIVE: "#f5c842", SUCCESSFUL: "#22c55e", FAILED: "#ef4444", LOADING: "#6b7280" };
    const stateBg: Record<string, string> = { ACTIVE: "rgba(245,200,66,0.12)", SUCCESSFUL: "rgba(34,197,94,0.12)", FAILED: "rgba(239,68,68,0.12)", LOADING: "rgba(107,114,128,0.12)" };

    const isFounder = address && cfg?.owner && address.toLowerCase() === cfg.owner.toLowerCase();

    return (
        <div className="space-y-5">

            {/* ── TOP HEADER: Sale Identity ───────────────────────────────────────── */}
            {cfg ? (
                <div className="glass p-5 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-extrabold shrink-0"
                            style={{ background: "linear-gradient(135deg,#f5c842,#f97316)", color: "#0a0c14" }}>
                            {cfg.tokenSymbol?.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{cfg.tokenName}</h2>
                            <p className="text-sm text-white/50">{cfg.tokenSymbol} · BSC Testnet · {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : "Loading…"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="badge" style={{ background: stateBg[stateLabel], color: stateColor[stateLabel], border: `1px solid ${stateColor[stateLabel]}44` }}>
                            {stateLabel === "ACTIVE" && <span className="live-dot" />}
                            {stateLabel}
                        </span>
                        <button onClick={refresh} title="Refresh" className="btn-secondary !px-3 !py-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="glass p-5 space-y-3"><div className="skeleton h-14 w-full rounded-xl" /></div>
            )}

            {/* ── ALERT banner ────────────────────────────────────────────────────── */}
            <div className={`p-4 rounded-xl flex gap-3 items-start text-sm ${isFounder ? 'bg-amber-400/10 border-amber-400/20' : 'bg-red-400/10 border-red-400/20 border'}`}>
                <span className="text-xl shrink-0">{isFounder ? '🛡️' : '⚠️'}</span>
                <div>
                    <p className={`font-semibold ${isFounder ? 'text-amber-400' : 'text-red-400'}`}>
                        {isFounder ? "Founder Zone" : "Access Denied: Not the Founder"}
                    </p>
                    <p className="text-xs text-white/50 mt-0.5">
                        {isFounder
                            ? "All actions require your founder wallet signed via MetaMask. Tx are irreversible on-chain."
                            : "You are not connected with the founder wallet that deployed this sale. You cannot execute actions."}
                    </p>
                    {address && <p className="text-xs text-white/40 mt-1">Connected: <span className="font-mono text-white/80">{address}</span></p>}
                    {cfg?.owner && <p className="text-xs text-white/40 mt-0.5">Founder: <span className="font-mono text-white/80">{cfg.owner}</span></p>}
                </div>
            </div>

            {/* ── TOKEN CONFIGURATION (read from contract) ────────────────────────── */}
            <div className="glass p-5 space-y-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <span className="text-amber-400">⚙️</span> Token Sale Configuration
                    <span className="text-xs text-white/30 font-normal ml-auto">Live from contract</span>
                </h3>
                {cfg ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                            { label: "Token Name", value: cfg.tokenName, icon: "🏷️" },
                            { label: "Symbol", value: cfg.tokenSymbol, icon: "💠" },
                            { label: "Token Price", value: `${formatBNB(cfg.tokenPrice, 6)} BNB`, icon: "💰" },
                            { label: "Soft Cap", value: `${formatBNB(cfg.softCap, 4)} BNB`, icon: "🔽" },
                            { label: "Hard Cap", value: `${formatBNB(cfg.hardCap, 4)} BNB`, icon: "🔼" },
                            { label: "Deadline", value: cfg.deadline ? new Date(cfg.deadline * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—", icon: "📅" },
                        ].map(({ label, value, icon }) => (
                            <div key={label} className="p-3 rounded-xl space-y-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs">{icon}</span>
                                    <p className="text-xs text-white/40">{label}</p>
                                </div>
                                <p className="text-sm font-semibold text-white">{value}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
                )}
            </div>

            {/* ── LIVE SALE METRICS ────────────────────────────────────────────────── */}
            <div className="glass p-5 space-y-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <span className="text-amber-400">📊</span> Live Sale Metrics
                </h3>
                {cfg ? (
                    <>
                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/60">Raise Progress</span>
                                <span className="font-semibold text-white">{formatBNB(cfg.totalRaised, 4)} <span className="text-white/40">/ {formatBNB(cfg.hardCap, 4)} BNB</span></span>
                            </div>
                            <div className="relative h-4 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                <div className="absolute top-0 bottom-0 w-0.5 z-10" style={{ left: `${cfg.softCapProgress}%`, background: "rgba(245,200,66,0.6)" }} />
                                <div className="h-full rounded-full progress-bar-fill transition-all duration-700" style={{ width: `${cfg.progress}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-white/40">
                                <span>0 BNB</span>
                                <span className="text-amber-400/60">↑ Soft {formatBNB(cfg.softCap, 3)}</span>
                                <span>Hard {formatBNB(cfg.hardCap, 3)}</span>
                            </div>
                        </div>

                        {/* Stat grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { label: "Raised", value: `${formatBNB(cfg.totalRaised, 4)} BNB`, color: "#f5c842" },
                                { label: "Escrow Balance", value: `${formatBNB(cfg.escrowBalance, 4)} BNB`, color: "#22c55e" },
                                { label: "Fill Rate", value: `${cfg.progress.toFixed(1)}%`, color: "#a78bfa" },
                                { label: "Time Left", value: cfg.state === 0 ? countdown || "—" : "Ended", color: cfg.state === 0 ? "#f97316" : "#6b7280" },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <p className="text-xs text-white/40 mb-1">{label}</p>
                                    <p className="text-base font-bold" style={{ color }}>{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Milestone trackers */}
                        <div className="grid grid-cols-2 gap-3">
                            {([1, 2] as const).map(n => {
                                const released = n === 1 ? cfg.m1Released : cfg.m2Released;
                                return (
                                    <div key={n} className="p-3 rounded-xl flex items-center gap-3" style={{ background: released ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${released ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0" style={{ background: released ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)" }}>
                                            {released ? "✅" : "⏳"}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-white">Milestone {n} <span className="text-white/40">(50%)</span></p>
                                            <p className="text-xs" style={{ color: released ? "#22c55e" : "#6b7280" }}>{released ? "Released" : "Pending"}</p>
                                        </div>
                                        {released && (
                                            <span className="ml-auto text-xs font-medium text-green-400">{formatBNB(cfg.escrowBalance + (released && n === 1 && !cfg.m2Released ? 0n : 0n), 3)} BNB</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="space-y-3"><div className="skeleton h-4 rounded" /><div className="skeleton h-20 rounded-xl" /></div>
                )}
            </div>

            {/* ── CONTRACT ADDRESSES ───────────────────────────────────────────────── */}
            <div className="glass p-5 space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2"><span className="text-amber-400">🔗</span> Contract Addresses</h3>
                {[
                    { label: "TokenSaleContract", address: saleAddress, color: "#a78bfa" },
                    { label: "EscrowContract", address: escrowAddress, color: "#22c55e" },
                ].map(({ label, address: addr, color }) => (
                    <div key={label} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div>
                            <p className="text-xs text-white/40">{label}</p>
                            <p className="font-mono text-xs mt-0.5" style={{ color }}>{addr ? shortAddress(addr) : "Not deployed"}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => { if (addr) navigator.clipboard.writeText(addr); toast("Address copied!", "info"); }}
                                className="text-xs px-2 py-1 rounded-lg transition-colors text-white/40 hover:text-white"
                                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                Copy
                            </button>
                            {addr && (
                                <a href={explorerAddressUrl(addr)} target="_blank" rel="noreferrer"
                                    className="text-xs px-2 py-1 rounded-lg transition-colors text-white/40 hover:text-amber-400"
                                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                    BSCScan ↗
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── ACTIONS ──────────────────────────────────────────────────────────── */}
            <div className="glass p-5 space-y-4">
                <h3 className="font-semibold text-white flex items-center gap-2"><span className="text-amber-400">🎮</span> Sale Controls</h3>

                {/* End Sale */}
                <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-sm font-medium text-white">End Sale</p>
                            <p className="text-xs text-white/40 mt-0.5">Closes the sale permanently. Funds escrow if soft cap met; enables refunds if not.</p>
                        </div>
                        <span className={`badge shrink-0 ${cfg?.state === 0 ? "badge-active" : "badge-failed"}`}>
                            {cfg?.state === 0 ? "Available" : "Executed"}
                        </span>
                    </div>
                    <button onClick={handleEndSale} disabled={!isFounder || cfg?.state !== 0 || loading !== null} className="btn-secondary w-full">
                        {!isFounder ? "Not Founder" : loading === "End Sale" ? <span className="flex items-center justify-center gap-2"><Spinner />Confirming…</span>
                            : cfg?.state !== 0 ? `Sale Already ${stateLabel}` : "⏹  End Sale Now"}
                    </button>
                </div>

                {/* Release Milestone 1 */}
                <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-sm font-medium text-white">Release Milestone 1 <span className="text-amber-400">(50%)</span></p>
                            <p className="text-xs text-white/40 mt-0.5">
                                Releases first half of escrowed BNB to the founder wallet.
                                {cfg && cfg.state === 1 && !cfg.m1Released && <span className="text-emerald-400 ml-1">~{formatBNB(cfg.escrowBalance / 2n, 4)} BNB</span>}
                            </p>
                        </div>
                        <span className={`badge shrink-0 ${cfg?.m1Released ? "badge-success" : "badge-active"}`}>
                            {cfg?.m1Released ? "Released" : "Pending"}
                        </span>
                    </div>
                    <button onClick={() => handleRelease(1)} disabled={!isFounder || cfg?.state !== 1 || cfg?.m1Released || loading !== null} className="btn-primary w-full">
                        {!isFounder ? "Not Founder" : loading === "Release Milestone 1" ? <span className="flex items-center justify-center gap-2"><Spinner />Confirming…</span>
                            : cfg?.m1Released ? "✅ Milestone 1 Released"
                                : cfg?.state !== 1 ? "End Sale First" : "🎯 Release Milestone 1"}
                    </button>
                </div>

                {/* Release Milestone 2 */}
                <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-sm font-medium text-white">Release Milestone 2 <span className="text-amber-400">(Remaining 50%)</span></p>
                            <p className="text-xs text-white/40 mt-0.5">
                                Releases remaining escrowed BNB to founder. Must complete Milestone 1 first.
                                {cfg && cfg.m1Released && !cfg.m2Released && <span className="text-emerald-400 ml-1">~{formatBNB(cfg.escrowBalance, 4)} BNB remaining</span>}
                            </p>
                        </div>
                        <span className={`badge shrink-0 ${cfg?.m2Released ? "badge-success" : !cfg?.m1Released ? "badge-failed" : "badge-active"}`}>
                            {cfg?.m2Released ? "Released" : !cfg?.m1Released ? "Locked" : "Ready"}
                        </span>
                    </div>
                    <button onClick={() => handleRelease(2)} disabled={!isFounder || !cfg?.m1Released || cfg?.m2Released || loading !== null} className="btn-primary w-full">
                        {!isFounder ? "Not Founder" : loading === "Release Milestone 2" ? <span className="flex items-center justify-center gap-2"><Spinner />Confirming…</span>
                            : cfg?.m2Released ? "✅ Milestone 2 Released"
                                : !cfg?.m1Released ? "🔒 Release Milestone 1 First"
                                    : "🏆 Release Milestone 2 (Final)"}
                    </button>
                </div>
            </div>

            {/* ── CONTRACT FLOW DIAGRAM ─────────────────────────────────────────────── */}
            <div className="glass p-5 space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2"><span className="text-amber-400">🗺️</span> Escrow Flow</h3>
                <div className="space-y-1.5 font-mono text-xs">
                    {[
                        { text: "Investor  →  invest()  →  TokenSaleContract", done: cfg ? cfg.totalRaised > 0n : false, color: "#a78bfa" },
                        { text: "endSale() [softCap met]  →  depositFunds()  →  Escrow", done: cfg?.state === 1 || false, color: "#f5c842" },
                        { text: "releaseMilestone(1)  →  50% BNB  →  Founder", done: cfg?.m1Released || false, color: "#22c55e" },
                        { text: "releaseMilestone(2)  →  50% BNB  →  Founder ✓", done: cfg?.m2Released || false, color: "#22c55e" },
                    ].map((step, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: step.done ? `${step.color}10` : "rgba(255,255,255,0.02)", border: `1px solid ${step.done ? step.color + "30" : "rgba(255,255,255,0.05)"}` }}>
                            <span style={{ color: step.done ? step.color : "#374151" }}>{step.done ? "●" : "○"}</span>
                            <span style={{ color: step.done ? step.color : "#6b7280" }}>{step.text}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg mt-2" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}>
                        <span style={{ color: cfg?.state === 2 ? "#ef4444" : "#374151" }}>{cfg?.state === 2 ? "●" : "○"}</span>
                        <span className="text-red-400/60">endSale() [softCap missed]  →  refund()  →  Investor</span>
                    </div>
                </div>
            </div>

        </div>
    );
}
