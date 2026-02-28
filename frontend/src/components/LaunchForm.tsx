"use client";
import { useState, FormEvent } from "react";
import { ethers } from "ethers";
import { LaunchpadConfig, getFactoryContract, explorerTxUrl } from "@/lib/contracts";
import { useWallet } from "@/lib/WalletProvider";
import { toast } from "@/lib/toast";

interface Props {
    config: LaunchpadConfig;
}

export default function LaunchForm({ config }: Props) {
    const { address, signer } = useWallet();
    const [launching, setLaunching] = useState(false);

    const handleLaunch = async (e: FormEvent) => {
        e.preventDefault();
        if (!signer || !address) return toast("Connect wallet first", "warning");
        if (!config.factoryAddress) return toast("Factory address not configured", "error");

        const formData = new FormData(e.target as HTMLFormElement);
        const tName = formData.get("tokenName") as string;
        const tSymbol = formData.get("tokenSymbol") as string;
        const tPrice = formData.get("tokenPrice") as string;
        const sCap = formData.get("softCap") as string;
        const hCap = formData.get("hardCap") as string;

        // Parse duration (default 1 day)
        const duration = 86400;

        setLaunching(true);
        try {
            toast("Sending transaction to Factory...", "info");
            const factory = getFactoryContract(config.factoryAddress, config.factoryABI, signer);

            const tx = await factory.createSale(
                tName,
                tSymbol,
                ethers.parseEther(tPrice),
                ethers.parseEther(sCap),
                ethers.parseEther(hCap),
                duration
            );

            toast("Transaction submitted, waiting for confirmation...", "info");
            const receipt = await tx.wait();

            // Find SaleLaunched event to get addresses
            const event = receipt.logs
                // @ts-ignore
                .map(log => { try { return factory.interface.parseLog(log); } catch { return null; } })
                .find((parsed: any) => parsed?.name === "SaleLaunched");

            if (event) {
                const saleAddr = event.args.tokenSale;
                toast(`Sale Launched Successfully!`, "success");
                window.open(explorerTxUrl(receipt.hash), "_blank");

                // Redirect founder to their dashboard
                setTimeout(() => {
                    window.location.href = `/manage/${saleAddr}`;
                }, 2000);
            } else {
                toast("Launch confirmed, but couldn't parse addresses from logs.", "warning");
            }
        } catch (err: any) {
            toast(err.reason || err.message || "Failed to launch sale", "error");
        } finally {
            setLaunching(false);
        }
    };

    const Spinner = () => (
        <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
    );

    return (
        <div className="glass p-8 space-y-6">
            <form onSubmit={handleLaunch} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-white/60 ml-1">Token Name</label>
                        <input name="tokenName" defaultValue="ChainVault Token" required className="input w-full" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-white/60 ml-1">Token Symbol</label>
                        <input name="tokenSymbol" defaultValue="CVT" required className="input w-full" />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-white/60 ml-1">Price per Token (BNB)</label>
                    <input name="tokenPrice" type="number" step="0.0001" defaultValue="0.001" required className="input w-full" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-emerald-400/80 ml-1">Soft Cap (BNB) - For Success</label>
                        <input name="softCap" type="number" step="0.01" defaultValue="0.5" required className="input w-full" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-amber-400/80 ml-1">Hard Cap (BNB) - Max Raise</label>
                        <input name="hardCap" type="number" step="0.01" defaultValue="2.0" required className="input w-full" />
                    </div>
                </div>

                <button type="submit" disabled={launching} className="btn-primary w-full mt-4 !py-4 text-base font-bold flex justify-center items-center gap-2">
                    {launching ? <><Spinner /> Calling Factory Contract...</> : "🚀 Launch Sale on BSC Testnet"}
                </button>

                {!address && (
                    <p className="text-xs text-center text-red-400 mt-2">Please connect your wallet first.</p>
                )}
            </form>
        </div>
    );
}
