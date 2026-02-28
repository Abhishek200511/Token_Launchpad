import { fetchConfig } from "@/lib/contracts";
import { ethers } from "ethers";
import FounderPanel from "@/components/FounderPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ManageSalePage({ params }: { params: { saleAddress: string } }) {
    const saleAddress = params.saleAddress;
    let config;
    let escrowAddress = "";

    try {
        config = await fetchConfig();

        // Fetch the corresponding escrow address from the Factory
        if (config.factoryAddress && config.factoryABI) {
            const provider = new ethers.JsonRpcProvider(config.rpcUrl);
            const factory = new ethers.Contract(config.factoryAddress, config.factoryABI, provider);
            escrowAddress = await factory.saleToEscrow(saleAddress);

            if (!escrowAddress || escrowAddress === ethers.ZeroAddress) {
                return (
                    <div className="flex items-center justify-center min-h-[50vh]">
                        <div className="glass p-8 text-center max-w-sm">
                            <div className="text-4xl mb-4">❌</div>
                            <h2 className="font-bold text-white mb-2">Sale Not Found</h2>
                            <p className="text-sm text-white/50">This token sale address is not registered with the Launchpad Factory.</p>
                        </div>
                    </div>
                );
            }
        }

    } catch (err: any) {
        console.error("Manage page error:", err.message);
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="glass p-8 text-center max-w-sm">
                    <div className="text-4xl mb-4">🔌</div>
                    <h2 className="font-bold text-white mb-2">Backend Diagnostics</h2>
                    <p className="text-sm text-white/50">Could not connect to the network or Launchpad Factory.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Founder <span className="gradient-text">Dashboard</span>
                </h1>
                <p className="text-white/50 text-sm">
                    Manage your specific token sale, track metrics, and execute milestone withdrawals.
                </p>
            </div>

            <FounderPanel config={config} saleAddress={saleAddress} escrowAddress={escrowAddress} />
        </div>
    );
}
