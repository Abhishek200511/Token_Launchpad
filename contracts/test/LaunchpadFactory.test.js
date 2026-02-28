const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LaunchpadFactory", function () {
    let factory;
    let owner;
    let user1;
    let user2;

    const tokenName = "TestToken";
    const tokenSymbol = "TTK";
    const price = ethers.parseEther("0.01");
    const softCap = ethers.parseEther("1");
    const hardCap = ethers.parseEther("2");
    const defaultDuration = 86400; // 1 day

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        const Factory = await ethers.getContractFactory("LaunchpadFactory");
        factory = await Factory.deploy();
        await factory.waitForDeployment();
    });

    it("Should deploy with zero sales initially", async function () {
        expect(await factory.getSalesCount()).to.equal(0);
        const allSales = await factory.getAllSales();
        expect(allSales.length).to.equal(0);
    });

    it("Should allow a user to launch a new token sale", async function () {
        // User1 creates a sale
        const tx = await factory.connect(user1).createSale(
            tokenName,
            tokenSymbol,
            price,
            softCap,
            hardCap,
            defaultDuration
        );

        const receipt = await tx.wait();

        // Find the SaleLaunched event
        const event = receipt.logs.find(
            (log) => log.fragment && log.fragment.name === "SaleLaunched"
        );
        expect(event).to.not.be.undefined;

        const expectedFounder = event.args.founder;
        const saleAddress = event.args.tokenSale;
        const escrowAddress = event.args.escrow;

        expect(expectedFounder).to.equal(user1.address);
        expect(saleAddress).to.not.equal(ethers.ZeroAddress);
        expect(escrowAddress).to.not.equal(ethers.ZeroAddress);

        // Check factory tracking
        expect(await factory.getSalesCount()).to.equal(1);
        const mappedEscrow = await factory.saleToEscrow(saleAddress);
        expect(mappedEscrow).to.equal(escrowAddress);

        // Check founder tracking
        const user1Sales = await factory.getSalesByFounder(user1.address);
        expect(user1Sales.length).to.equal(1);
        expect(user1Sales[0]).to.equal(saleAddress);
    });

    it("Should correctly set the founder as the owner of the deployed contracts", async function () {
        const tx = await factory.connect(user1).createSale(
            tokenName,
            tokenSymbol,
            price,
            softCap,
            hardCap,
            defaultDuration
        );
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => log.fragment && log.fragment.name === "SaleLaunched");

        const saleAddress = event.args.tokenSale;
        const escrowAddress = event.args.escrow;

        // Connect to the deployed Sale contract and verify Ownership
        const saleContract = await ethers.getContractAt("TokenSaleContract", saleAddress);
        expect(await saleContract.owner()).to.equal(user1.address);

        // Connect to the deployed Escrow contract and verify Ownership
        const escrowContract = await ethers.getContractAt("EscrowContract", escrowAddress);
        expect(await escrowContract.owner()).to.equal(user1.address);
        expect(await escrowContract.founderWallet()).to.equal(user1.address);
    });

    it("Should correctly link Escrow and TokenSale", async function () {
        const tx = await factory.connect(user1).createSale(
            tokenName,
            tokenSymbol,
            price,
            softCap,
            hardCap,
            defaultDuration
        );
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => log.fragment && log.fragment.name === "SaleLaunched");

        const saleAddress = event.args.tokenSale;
        const escrowAddress = event.args.escrow;

        const escrowContract = await ethers.getContractAt("EscrowContract", escrowAddress);
        const saleContract = await ethers.getContractAt("TokenSaleContract", saleAddress);

        expect(await escrowContract.tokenSaleContract()).to.equal(saleAddress);
        expect(await saleContract.escrowContract()).to.equal(escrowAddress);
    });

    it("Should handle multiple sales from different users", async function () {
        await factory.connect(user1).createSale("T1", "T1", price, softCap, hardCap, defaultDuration);
        await factory.connect(user2).createSale("T2", "T2", price, softCap, hardCap, defaultDuration);
        await factory.connect(user1).createSale("T3", "T3", price, softCap, hardCap, defaultDuration);

        expect(await factory.getSalesCount()).to.equal(3);

        const user1Sales = await factory.getSalesByFounder(user1.address);
        expect(user1Sales.length).to.equal(2);

        const user2Sales = await factory.getSalesByFounder(user2.address);
        expect(user2Sales.length).to.equal(1);
    });
});
