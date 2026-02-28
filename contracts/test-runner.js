const { ethers } = require("hardhat");

async function main() {
    const [owner, user1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("LaunchpadFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    try {
        await factory.connect(user1).createSale(
            "TestToken",
            "TTK",
            ethers.parseEther("0.01"),
            ethers.parseEther("1"),
            ethers.parseEther("2"),
            86400
        );
        console.log("Success");
    } catch (e) {
        console.error("Caught error:", e.message);
    }
}

main().catch(console.error);
