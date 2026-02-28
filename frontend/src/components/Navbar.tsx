"use client";
import Link from "next/link";
import { useWallet } from "@/lib/WalletProvider";
import { shortAddress } from "@/lib/contracts";
import { useState } from "react";

export default function Navbar() {
    const { address, connect, disconnect, isConnecting, isCorrectNetwork, switchNetwork } = useWallet();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-40 border-b border-white/5" style={{ backdropFilter: "blur(24px)", background: "rgba(8,11,20,0.8)" }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f5c842,#f97316)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0c14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Chain<span className="gradient-text">Vault</span>
                    </span>
                </Link>

                {/* Nav Links */}
                <div className="hidden md:flex items-center gap-1">
                    <Link href="/" className="px-4 py-2 text-sm text-white/70 hover:text-white rounded-lg hover:bg-white/5 transition-colors">Launchpad</Link>
                    <Link href="/launch" className="px-4 py-2 text-sm text-white/70 hover:text-white rounded-lg hover:bg-white/5 transition-colors">Launch Token</Link>
                </div>

                {/* Wallet */}
                <div className="flex items-center gap-3">
                    {address && !isCorrectNetwork && (
                        <button onClick={switchNetwork} className="hidden sm:block text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: "rgba(245,200,66,0.15)", color: "#f5c842", border: "1px solid rgba(245,200,66,0.3)" }}>
                            Switch to BSC
                        </button>
                    )}
                    {address ? (
                        <button onClick={disconnect} className="btn-secondary text-xs" id="wallet-disconnect">
                            {shortAddress(address)}
                        </button>
                    ) : (
                        <button onClick={connect} disabled={isConnecting} className="btn-primary" id="wallet-connect">
                            {isConnecting ? (
                                <span className="flex items-center gap-2"><Spinner size={14} />Connecting…</span>
                            ) : "Connect Wallet"}
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}

function Spinner({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}
