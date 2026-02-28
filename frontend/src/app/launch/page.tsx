import { fetchConfig } from "@/lib/contracts";
import LaunchForm from "@/components/LaunchForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LaunchPage() {
    let config;
    try {
        config = await fetchConfig();
    } catch {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="glass p-8 text-center max-w-sm">
                    <div className="text-4xl mb-4">🔌</div>
                    <h2 className="font-bold text-white mb-2">Backend Offline</h2>
                    <p className="text-sm text-white/50">Start the backend server to load factory configuration.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 pt-10">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Launch a <span className="gradient-text">Token Sale</span>
                </h1>
                <p className="text-white/50 text-base">
                    Deploy a fully decentralized, rug-proof IDO. Escrow and TokenSale contracts are automatically deployed and linked.
                </p>
            </div>

            <LaunchForm config={config} />
        </div>
    );
}
