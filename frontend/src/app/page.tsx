import { fetchConfig } from "@/lib/contracts";
import SaleCard from "@/components/SaleCard";
import { ethers } from "ethers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  let config;
  let allSales: string[] = [];

  try {
    config = await fetchConfig();

    if (config.factoryAddress && config.factoryABI) {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const factory = new ethers.Contract(config.factoryAddress, config.factoryABI, provider);
      // Fetch array of all deployed sales from the factory
      allSales = await factory.getAllSales();
      // Reverse so newest sales appear first
      allSales = [...allSales].reverse();
    }
  } catch {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass p-8 text-center max-w-sm">
          <div className="text-4xl mb-4">🔌</div>
          <h2 className="font-bold text-white mb-2">Backend Offline</h2>
          <p className="text-sm text-white/50">Start the backend server to load project config.</p>
          <code className="mt-4 text-xs block p-3 rounded-lg bg-black/30 text-green-400">docker-compose up backend -d</code>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto space-y-4 py-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-2" style={{ background: "rgba(245,200,66,0.1)", border: "1px solid rgba(245,200,66,0.2)", color: "#f5c842" }}>
          <span className="live-dot" />
          Live on BSC Testnet
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Launch & Invest Without{" "}
          <span className="gradient-text">Rug Pulls</span>
        </h1>
        <p className="text-white/50 text-base leading-relaxed">
          ChainVault is a fully decentralized IDO factory. Funds are locked in escrow and released to founders only after milestones are verified. Exit scams are structurally impossible.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {["🔒 Milestone Escrow", "🔄 Auto-Refund", "⛓️ Permissionless Factory", "🛡️ ReentrancyGuard"].map(f => (
            <span key={f} className="px-3 py-1 rounded-full text-xs text-white/60" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Discovery Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-2xl font-bold text-white">Active <span className="text-amber-400">Launches</span></h2>
          <div className="text-sm text-white/40">{allSales.length} Total</div>
        </div>

        {allSales.length === 0 ? (
          <div className="glass p-10 text-center space-y-4 max-w-md mx-auto">
            <div className="text-4xl">🌱</div>
            <h3 className="font-semibold text-white">No tokens launched yet</h3>
            <p className="text-xs text-white/50">Be the first to create a rug-proof token sale on ChainVault.</p>
            <a href="/launch" className="btn-primary inline-block mt-2">Launch a Token</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allSales.map(addr => (
              <SaleCard key={addr} config={config} saleAddress={addr} isClickable={true} />
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="divider opacity-50" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {[
          { step: "01", icon: "🚀", title: "Launch Token", desc: "Anyone can deploy a pair of Escrow and TokenSale contracts instantly via the Factory." },
          { step: "02", icon: "💰", title: "Invest BNB", desc: "Investors contribute BNB. If soft cap fails, 100% is refunded automatically." },
          { step: "03", icon: "🎯", title: "Milestone Release", desc: "Founder receives funds in two 50% tranches post-success. Investors retain leverage." },
        ].map(({ step, icon, title, desc }) => (
          <div key={step} className="glass p-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400/60">{step}</span>
              <span className="text-lg">{icon}</span>
            </div>
            <p className="font-semibold text-white text-sm">{title}</p>
            <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
