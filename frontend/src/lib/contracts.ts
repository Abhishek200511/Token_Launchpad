import { ethers } from "ethers";

export type LaunchpadConfig = {
    chainId: number;
    rpcUrl: string;
    explorerUrl: string;
    factoryAddress: string;
    factoryABI: any[];
    tokenSaleABI: any[];
    escrowABI: any[];
    tokenSaleBytecode?: string;
    escrowBytecode?: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function fetchConfig(): Promise<LaunchpadConfig> {
    const res = await fetch(`${BACKEND_URL}/api/config`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch launchpad configuration");
    return res.json();
}

export function getFactoryContract(address: string, abi: any[], signerOrProvider: ethers.Signer | ethers.Provider) {
    return new ethers.Contract(address, abi, signerOrProvider);
}

export function getTokenSaleContract(address: string, abi: any[], signerOrProvider: ethers.Signer | ethers.Provider) {
    return new ethers.Contract(address, abi, signerOrProvider);
}

export function getEscrowContract(address: string, abi: any[], signerOrProvider: ethers.Signer | ethers.Provider) {
    return new ethers.Contract(address, abi, signerOrProvider);
}

// State enum mapping
export const SALE_STATE: Record<number, string> = {
    0: "ACTIVE",
    1: "SUCCESSFUL",
    2: "FAILED",
};

export function formatBNB(wei: bigint, decimals = 4): string {
    return parseFloat(ethers.formatEther(wei)).toFixed(decimals);
}

export function explorerTxUrl(hash: string): string {
    return `https://testnet.bscscan.com/tx/${hash}`;
}

export function explorerAddressUrl(addr: string): string {
    return `https://testnet.bscscan.com/address/${addr}`;
}

export function shortAddress(addr: string): string {
    if (!addr) return "";
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
