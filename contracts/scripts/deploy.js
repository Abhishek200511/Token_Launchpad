require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("=".repeat(60));
    console.log("ChainVault Launchpad Factory Deployment");
    console.log("=".repeat(60));
    console.log("Deployer:", deployer.address);
    const bal = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(bal), "BNB");
    console.log("=".repeat(60));

    // ── Deploy LaunchpadFactory ─────────────────────────────────────────────
    console.log("\n[1/1] Deploying LaunchpadFactory...");
    const Factory = await ethers.getContractFactory("LaunchpadFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();

    console.log("✅ LaunchpadFactory deployed to:", factoryAddress);

    // ── Output Summary ────────────────────────────────────────────────────
    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT COMPLETE — Update your .env or backend config");
    console.log("=".repeat(60));
    console.log(`LAUNCHPAD_FACTORY_ADDRESS=${factoryAddress}`);
    console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddress}`);
    console.log("=".repeat(60));
    console.log("\nBSCScan Testnet Link:");
    console.log(`  LaunchpadFactory: https://testnet.bscscan.com/address/${factoryAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
