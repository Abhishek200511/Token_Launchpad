require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
    origin: "*", // Allow all origins for the public config API
    methods: ["GET"],
}));
app.use(express.json());

// ── Contract Data Loader (ABI + Bytecode) ────────────────────────────────────────────────────────────────
function loadContractData(contractName) {
    // Try Docker volume path first, then local dev path
    const paths = [
        path.join("/app/abis", `${contractName}.sol`, `${contractName}.json`), // Docker mount usually has the .sol folder
        path.join("/app/abis", `${contractName}.json`), // Fallback for flat structure
        path.join(__dirname, "../../contracts/artifacts/contracts", `${contractName}.sol`, `${contractName}.json`),
        path.join(__dirname, "../abis", `${contractName}.json`),
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) {
            const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
            return { abi: raw.abi, bytecode: raw.bytecode };
        }
    }

    console.warn(`⚠️  Contract data not found for ${contractName}.`);
    return { abi: [], bytecode: "" };
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Health check endpoint
 */
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * GET /api/config
 * Returns global launchpad configuration, factory address, and ABIs
 */
app.get("/api/config", (req, res) => {
    const factoryData = loadContractData("LaunchpadFactory");
    const saleData = loadContractData("TokenSaleContract");
    const escrowData = loadContractData("EscrowContract");

    res.json({
        // Network config
        chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID) || 97,
        rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545",
        explorerUrl: "https://testnet.bscscan.com",

        // Launchpad Factory
        factoryAddress: process.env.LAUNCHPAD_FACTORY_ADDRESS || process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "",

        // ABIs
        factoryABI: factoryData.abi,
        tokenSaleABI: saleData.abi,
        escrowABI: escrowData.abi,

        // Bytecodes (Optional: if frontend still needs to verify or deploy components manually, though Factory handles it now)
        tokenSaleBytecode: saleData.bytecode,
        escrowBytecode: escrowData.bytecode,
    });
});

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// ── Export ────────────────────────────────────────────────────────────────────
module.exports = app;

// ── Start ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 ChainVault Factory API running on http://localhost:${PORT}`);
        console.log(`   Health: http://localhost:${PORT}/api/health`);
        console.log(`   Config: http://localhost:${PORT}/api/config`);
        console.log(`   Factory: ${process.env.LAUNCHPAD_FACTORY_ADDRESS || "(not set)"}`);
    });
}

