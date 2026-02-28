"use client";
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { LaunchpadConfig, SALE_STATE, formatBNB, explorerTxUrl, getTokenSaleContract } from "@/lib/contracts";
import { useWallet } from "@/lib/WalletProvider";
import { toast } from "@/lib/toast";

interface Props {
    config: LaunchpadConfig;
    saleAddress: string;
}

export default function InvestorDashboard({ config, saleAddress }: Props) {
    const { address, signer, provider, connect } = useWallet();
    const [investment, setInvestment] = useState<bigint>(0n);
    const [saleState, setSaleState] = useState<number>(0);
    const [loadingRefund, setLoadingRefund] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [price, setPrice] = useState(0n);
    const [symbol, setSymbol] = useState("");

    const loadData = useCallback(async () => {
        if (!address || !saleAddress) {
            setIsLoading(false);
            return;
        }
        try {
            const p = provider || new ethers.JsonRpcProvider(config.rpcUrl);
            const contract = getTokenSaleContract(saleAddress, config.tokenSaleABI, p);
            const [inv, info] = await Promise.all([
                contract.getInvestment(address),
                contract.getSaleInfo(),
            ]);
            setInvestment(inv);
            setSaleState(Number(info.state));
            setPrice(info.price as bigint);
            setSymbol(info.symbol);
        } catch (e: any) {
            console.error("Dashboard load error:", e);
        } finally {
            setIsLoading(false);
        }
    }, [address, saleAddress, config, provider]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleRefund = async () => {
        if (!signer) return;
        setLoadingRefund(true);
        try {
            const contract = getTokenSaleContract(saleAddress, config.tokenSaleABI, signer);
            const tx = await contract.refund();
            toast("Refund transaction submitted…", "info");
            const receipt = await tx.wait();
            toast(`Refund of ${formatBNB(investment, 4)} BNB confirmed!`, "success");
            window.open(explorerTxUrl(receipt.hash), "_blank");
            setInvestment(0n);
        } catch (e: any) {
            const msg = e?.reason || e?.message || "Refund failed";
            if (msg.includes("user rejected") || msg.includes("User denied")) {
                toast("Refund cancelled", "warning");
            } else {
                toast(msg, "error");
            }
        } finally {
            setLoadingRefund(false);
        }
    };

    if (!address) {
        return (
            <div className="glass p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-2xl" style={{ background: "rgba(255,255,255,0.04)" }}>📊</div>
                <div>
                    <h3 className="font-semibold text-white mb-1">Your Investor Dashboard</h3>
                    <p className="text-sm text-white/40">Connect your wallet to view your investment status</p>
                </div>
                <button onClick={connect} className="btn-primary" id="dashboard-connect">Connect Wallet</button>
            </div>
        );
    }

    const stateLabel = SALE_STATE[saleState];
    const stateClass = stateLabel === "ACTIVE" ? "badge-active" : stateLabel === "SUCCESSFUL" ? "badge-success" : "badge-failed";
    const canRefund = saleState === 2 && investment > 0n;

    return (
        <div className="glass p-6 space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Your Dashboard</h3>
                <span className={`badge ${stateClass}`}>{stateLabel}</span>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    <div className="skeleton h-16 w-full rounded-xl" />
                    <div className="skeleton h-10 w-full rounded-xl" />
                </div>
            ) : (
                <>
                    {/* Investment amount */}
                    <div className="p-4 rounded-xl space-y-1 text-center" style={{ background: "rgba(245,200,66,0.06)", border: "1px solid rgba(245,200,66,0.12)" }}>
                        <p className="text-xs text-white/40">Total Invested</p>
                        <p className="text-3xl font-bold gradient-text">{formatBNB(investment, 4)} BNB</p>
                        {investment > 0n && price > 0n && (
                            <p className="text-xs text-white/40">
                                ≈ {(Number(formatBNB(investment, 6)) / parseFloat(ethers.formatEther(price))).toLocaleString("en-US", { maximumFractionDigits: 0 })} {symbol}
                            </p>
                        )}
                    </div>

                    {/* Status messages */}
                    {saleState === 0 && investment > 0n && (
                        <div className="p-3 rounded-xl flex items-start gap-2 text-xs text-amber-200/70" style={{ background: "rgba(245,200,66,0.06)", border: "1px solid rgba(245,200,66,0.12)" }}>
                            <span>⏳</span>
                            <span>Sale is active. Your funds are safe in the contract. Refunds are available if the soft cap is not met.</span>
                        </div>
                    )}
                    {saleState === 1 && (
                        <div className="p-3 rounded-xl flex items-start gap-2 text-xs text-green-200/70" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}>
                            <span>🎉</span>
                            <span>Sale was successful! Funds are in escrow and will be released to the founder in milestones. Stay tuned for project updates.</span>
                        </div>
                    )}
                    {saleState === 2 && investment === 0n && (
                        <div className="p-3 rounded-xl flex items-start gap-2 text-xs text-white/50" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span>✅</span>
                            <span>You have successfully claimed your refund.</span>
                        </div>
                    )}

                    {/* Refund button */}
                    {canRefund && (
                        <div className="space-y-2">
                            <div className="p-3 rounded-xl flex items-start gap-2 text-xs text-red-200/70" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
                                <span>⚠️</span>
                                <span>Sale failed to reach soft cap. You can claim a full refund of your {formatBNB(investment, 4)} BNB.</span>
                            </div>
                            <button
                                onClick={handleRefund}
                                disabled={loadingRefund}
                                className="btn-danger w-full"
                                id="refund-button"
                            >
                                {loadingRefund ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                        Processing…
                                    </span>
                                ) : `Claim Refund — ${formatBNB(investment, 4)} BNB`}
                            </button>
                        </div>
                    )}

                    {investment === 0n && saleState === 0 && (
                        <p className="text-center text-sm text-white/30">You haven&apos;t invested yet. Use the form to participate.</p>
                    )}
                </>
            )}
        </div>
    );
}
