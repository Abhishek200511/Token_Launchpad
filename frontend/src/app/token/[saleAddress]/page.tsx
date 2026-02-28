import { fetchConfig } from "@/lib/contracts";
import SaleCard from "@/components/SaleCard";
import InvestForm from "@/components/InvestForm";
import InvestorDashboard from "@/components/InvestorDashboard";
import Link from "next/link";
import { ethers } from "ethers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TokenSalePage({ params }: { params: { saleAddress: string } }) {
    const saleAddress = params.saleAddress;
    let config;
    let isValid = false;

    try {
        config = await fetchConfig();

        // Verify it exists in factory
        if (config.factoryAddress && config.factoryABI) {
            const provider = new ethers.JsonRpcProvider(config.rpcUrl);
            const factory = new ethers.Contract(config.factoryAddress, config.factoryABI, provider);
            const escrowAddress = await factory.saleToEscrow(saleAddress);
            if (escrowAddress && escrowAddress !== ethers.ZeroAddress) {
                isValid = true;
            }
        }
    } catch {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="glass p-8 text-center max-w-sm">
                    <div className="text-4xl mb-4">🔌</div>
                    <h2 className="font-bold text-white mb-2">Backend Offline</h2>
                    <p className="text-sm text-white/50">Start the backend server to load project data.</p>
                </div>
            </div>
        );
    }

    if (!isValid) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="glass p-8 text-center max-w-sm space-y-4">
                    <div className="text-4xl mb-2">❌</div>
                    <h2 className="font-bold text-white text-xl">Sale Not Found</h2>
                    <p className="text-sm text-white/50">This smart contract is not registered as a verified ChainVault token sale.</p>
                    <Link href="/" className="btn-secondary inline-block mt-4">Return Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="mb-4">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-white/50 hover:text-white transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mr-1"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    Back to Launchpad
                </Link>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Sale Card + Dashboard */}
                <div className="lg:col-span-3 space-y-6">
                    <SaleCard config={config} saleAddress={saleAddress} isClickable={false} />
                    <InvestorDashboard config={config} saleAddress={saleAddress} />
                </div>
                {/* Right: Invest Form */}
                <div className="lg:col-span-2">
                    <div className="sticky top-24">
                        <InvestForm config={config} saleAddress={saleAddress} />
                    </div>
                </div>
            </div>
        </div>
    );
}
