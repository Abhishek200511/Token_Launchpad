"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { LaunchpadConfig, explorerTxUrl, getTokenSaleContract } from "@/lib/contracts";
import { useWallet } from "@/lib/WalletProvider";
import { toast } from "@/lib/toast";

interface Props {
    config: LaunchpadConfig;
    saleAddress: string;
    onSuccess?: () => void;
}

export default function InvestForm({ config, saleAddress, onSuccess }: Props) {
    const { signer, provider, address, connect, isCorrectNetwork } = useWallet();
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [price, setPrice] = useState(0n);
    const [softCap, setSoftCap] = useState(0n);
    const [symbol, setSymbol] = useState("");

    // Fetch basic details to render the form properly
    useEffect(() => {
        if (!saleAddress) return;
        const load = async () => {
            try {
                const p = provider || new ethers.JsonRpcProvider(config.rpcUrl);
                const contract = getTokenSaleContract(saleAddress, config.tokenSaleABI, p);
                const info = await contract.getSaleInfo();
                setPrice(info.price as bigint);
                setSoftCap(info.soft as bigint);
                setSymbol(info.symbol);
            } catch (e) {
                console.error("Failed to load InvestForm details");
            }
        };
        load();
    }, [saleAddress, config, provider]);

    const handleInvest = async () => {
        if (!signer) { connect(); return; }
        if (!isCorrectNetwork) { toast("Please switch to BSC Testnet", "warning"); return; }
        const bnbAmount = parseFloat(amount);
        if (!bnbAmount || bnbAmount <= 0) { toast("Enter a valid BNB amount", "warning"); return; }

        setLoading(true);
        try {
            const contract = getTokenSaleContract(saleAddress, config.tokenSaleABI, signer);
            const tx = await contract.invest({ value: ethers.parseEther(amount) });
            toast("Transaction submitted — waiting for confirmation…", "info");
            const receipt = await tx.wait();
            toast(`✅ Investment confirmed! ${amount} BNB invested.`, "success");
            const txUrl = explorerTxUrl(receipt.hash);
            window.open(txUrl, "_blank");
            setAmount("");
            onSuccess?.();
        } catch (e: any) {
            const msg = e?.reason || e?.message || "Transaction failed";
            if (msg.includes("user rejected") || msg.includes("User denied")) {
                toast("Transaction cancelled by user", "warning");
            } else {
                toast(msg, "error");
            }
        } finally {
            setLoading(false);
        }
    };

    const softCapBNB = softCap > 0n ? parseFloat(ethers.formatEther(softCap)) : 0;
    const priceBNB = price > 0n ? parseFloat(ethers.formatEther(price)) : 0;
    const tokenEstimate = (amount && priceBNB > 0)
        ? (parseFloat(amount) / priceBNB).toLocaleString("en-US", { maximumFractionDigits: 0 })
        : "0";

    const quickAmounts = [
        (softCapBNB * 0.1).toFixed(4),
        (softCapBNB * 0.25).toFixed(4),
        (softCapBNB * 0.5).toFixed(4),
        (softCapBNB > 0 ? softCapBNB : 1.0).toFixed(4),
    ].filter(a => parseFloat(a) > 0);

    return (
        <div className="glass p-6 space-y-5">
            <div>
                <h3 className="font-semibold text-white mb-0.5">Invest in This Sale</h3>
                <p className="text-xs text-white/40">Funds are secured in escrow — released only on milestone completion</p>
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((q, i) => (
                    <button
                        key={i}
                        onClick={() => setAmount(q)}
                        className={`text-xs py-2 rounded-lg font-medium transition-all duration-150 ${amount === q ? "border-amber-400/50 text-amber-400" : "border-white/10 text-white/50 hover:text-white hover:border-white/20"}`}
                        style={{ border: "1px solid" }}
                    >
                        {q} BNB
                    </button>
                ))}
            </div>

            {/* Input */}
            <div className="relative">
                <input
                    id="invest-amount"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input-field pr-16 text-lg font-semibold"
                    disabled={loading}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/40 font-medium">BNB</span>
            </div>

            {/* Token estimate */}
            <div className="flex justify-between text-xs text-white/40">
                <span>You receive (estimated)</span>
                <span className="text-white/70 font-medium">{tokenEstimate} {symbol}</span>
            </div>

            {/* Invest button */}
            {!address ? (
                <button onClick={connect} className="btn-primary w-full" id="invest-connect">
                    Connect Wallet to Invest
                </button>
            ) : !isCorrectNetwork ? (
                <button onClick={() => { }} className="btn-primary w-full opacity-70 cursor-not-allowed">
                    Switch to BSC Testnet First
                </button>
            ) : (
                <button
                    onClick={handleInvest}
                    disabled={loading || !amount || parseFloat(amount) <= 0}
                    className="btn-primary w-full"
                    id="invest-button"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            Confirming…
                        </span>
                    ) : `Invest ${amount || "0"} BNB`}
                </button>
            )}

            {/* Security note */}
            <div className="flex items-start gap-2 p-3 rounded-xl text-xs text-white/40" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-amber-400/60 mt-0.5">🔒</span>
                <span>Your BNB is secured in an on-chain escrow. Founders can only receive funds after milestone completion. You can claim a full refund if the soft cap is not met.</span>
            </div>
        </div>
    );
}
