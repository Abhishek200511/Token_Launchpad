import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/WalletProvider";
import { ToastProvider } from "@/lib/toast";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ChainVault — Rug-Proof IDO Launchpad on BSC",
  description: "A decentralized IDO launchpad on BNB Smart Chain that structurally prevents rug pulls through milestone-based escrow and DAO-governed fund release.",
  keywords: ["IDO", "launchpad", "BSC", "BNB", "DeFi", "anti-rug", "escrow", "blockchain"],
  openGraph: {
    title: "ChainVault",
    description: "Eliminating rug pulls through milestone-based escrow.",
    type: "website",
  },
};

import ConvexClientProvider from "@/lib/ConvexClientProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          <WalletProvider>
            <ToastProvider>
              <Navbar />
              <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 page-fade">
                {children}
              </main>
              <footer className="border-t border-white/5 mt-16 py-8 text-center text-xs text-white/30">
                <div className="max-w-6xl mx-auto px-4">
                  <p className="mb-1">
                    <span className="font-semibold text-white/50">ChainVault</span> · BSC Testnet MVP · Not audited
                  </p>
                  <p>Built for hackathon demonstration. Do not use real funds.</p>
                </div>
              </footer>
            </ToastProvider>
          </WalletProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
