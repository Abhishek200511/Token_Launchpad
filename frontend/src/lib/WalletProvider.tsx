"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";

const BSC_TESTNET = {
    chainId: "0x61",           // 97 in hex
    chainName: "BSC Testnet",
    nativeCurrency: { name: "tBNB", symbol: "BNB", decimals: 18 },
    rpcUrls: [
        "https://data-seed-prebsc-1-s1.binance.org:8545",
        "https://data-seed-prebsc-2-s1.binance.org:8545",
    ],
    blockExplorerUrls: ["https://testnet.bscscan.com"],
};

interface WalletContextType {
    address: string | null;
    provider: ethers.BrowserProvider | null;
    signer: ethers.JsonRpcSigner | null;
    chainId: number | null;
    isConnecting: boolean;
    isCorrectNetwork: boolean;
    connect: () => Promise<void>;
    switchNetwork: () => Promise<void>;
    disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
    address: null,
    provider: null,
    signer: null,
    chainId: null,
    isConnecting: false,
    isCorrectNetwork: false,
    connect: async () => { },
    switchNetwork: async () => { },
    disconnect: () => { },
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [address, setAddress] = useState<string | null>(null);
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
    const [chainId, setChainId] = useState<number | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    const isCorrectNetwork = chainId === 97;

    const initProvider = useCallback(async (eth: any) => {
        const p = new ethers.BrowserProvider(eth);
        const network = await p.getNetwork();
        const cid = Number(network.chainId);
        setChainId(cid);
        setProvider(p);
        if (cid === 97) {
            const s = await p.getSigner();
            setSigner(s);
            setAddress(await s.getAddress());
        }
        return p;
    }, []);

    const switchNetwork = useCallback(async () => {
        const eth = (window as any).ethereum;
        if (!eth) return;
        try {
            await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BSC_TESTNET.chainId }] });
        } catch (err: any) {
            // Chain not added — add it
            if (err.code === 4902) {
                await eth.request({ method: "wallet_addEthereumChain", params: [BSC_TESTNET] });
            }
        }
    }, []);

    const connect = useCallback(async () => {
        const eth = (window as any).ethereum;
        if (!eth) { alert("MetaMask not found. Please install it from metamask.io"); return; }
        setIsConnecting(true);
        try {
            await eth.request({ method: "eth_requestAccounts" });
            const p = await initProvider(eth);
            const network = await p.getNetwork();
            if (Number(network.chainId) !== 97) await switchNetwork();
            await initProvider(eth);
        } catch (e) {
            console.error("Connect error:", e);
        } finally {
            setIsConnecting(false);
        }
    }, [initProvider, switchNetwork]);

    const disconnect = useCallback(() => {
        setAddress(null); setProvider(null); setSigner(null); setChainId(null);
    }, []);

    // Auto-reconnect on page load
    useEffect(() => {
        const eth = (window as any).ethereum;
        if (!eth) return;
        eth.request({ method: "eth_accounts" }).then((accounts: string[]) => {
            if (accounts.length > 0) initProvider(eth);
        });
        eth.on("accountsChanged", (accounts: string[]) => {
            if (accounts.length === 0) disconnect();
            else initProvider(eth);
        });
        eth.on("chainChanged", () => initProvider(eth));
        return () => { eth.removeAllListeners?.(); };
    }, [initProvider, disconnect]);

    return (
        <WalletContext.Provider value={{ address, provider, signer, chainId, isConnecting, isCorrectNetwork, connect, switchNetwork, disconnect }}>
            {children}
        </WalletContext.Provider>
    );
}

export const useWallet = () => useContext(WalletContext);
