const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("ChainVault — TokenSaleContract + EscrowContract", function () {
    let tokenSale, escrow;
    let owner, founder, investor1, investor2, attacker;

    const TOKEN_NAME = "TestToken";
    const TOKEN_SYMBOL = "TTK";
    const TOKEN_PRICE = ethers.parseEther("0.001"); // 0.001 BNB per token
    const SOFT_CAP = ethers.parseEther("1");       // 1 BNB
    const HARD_CAP = ethers.parseEther("10");      // 10 BNB
    const DURATION = 3600;                         // 1 hour

    beforeEach(async function () {
        [owner, founder, investor1, investor2, attacker] = await ethers.getSigners();

        // Deploy EscrowContract first
        const Escrow = await ethers.getContractFactory("EscrowContract");
        escrow = await Escrow.deploy(founder.address, owner.address);
        await escrow.waitForDeployment();

        // Deploy TokenSaleContract
        const Sale = await ethers.getContractFactory("TokenSaleContract");
        tokenSale = await Sale.deploy(
            TOKEN_NAME,
            TOKEN_SYMBOL,
            TOKEN_PRICE,
            SOFT_CAP,
            HARD_CAP,
            DURATION,
            await escrow.getAddress(),
            owner.address
        );
        await tokenSale.waitForDeployment();

        // Link escrow to sale contract
        await escrow.setTokenSaleContract(await tokenSale.getAddress());
    });

    // ──────────────────────────────────────────────────────────────────────────
    // DEPLOYMENT
    // ──────────────────────────────────────────────────────────────────────────
    describe("Deployment", function () {
        it("Should set correct sale parameters", async function () {
            const info = await tokenSale.getSaleInfo();
            expect(info.name).to.equal(TOKEN_NAME);
            expect(info.symbol).to.equal(TOKEN_SYMBOL);
            expect(info.soft).to.equal(SOFT_CAP);
            expect(info.hard).to.equal(HARD_CAP);
            expect(info.state).to.equal(0); // ACTIVE
        });

        it("Should set founder wallet correctly in escrow", async function () {
            expect(await escrow.founderWallet()).to.equal(founder.address);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // INVEST
    // ──────────────────────────────────────────────────────────────────────────
    describe("invest()", function () {
        it("Should accept BNB investment and record it", async function () {
            const investAmount = ethers.parseEther("2");
            await expect(tokenSale.connect(investor1).invest({ value: investAmount }))
                .to.emit(tokenSale, "Invested")
                .withArgs(investor1.address, investAmount);

            expect(await tokenSale.investments(investor1.address)).to.equal(investAmount);
            expect(await tokenSale.totalRaised()).to.equal(investAmount);
        });

        it("Should reject zero-value investments", async function () {
            await expect(
                tokenSale.connect(investor1).invest({ value: 0 })
            ).to.be.revertedWith("Sale: investment must be > 0");
        });

        it("Should reject investments that exceed hard cap", async function () {
            const overHardCap = ethers.parseEther("11");
            await expect(
                tokenSale.connect(investor1).invest({ value: overHardCap })
            ).to.be.revertedWith("Sale: would exceed hard cap");
        });

        it("Should reject investments after deadline", async function () {
            // Fast forward past deadline
            await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
            await ethers.provider.send("evm_mine");

            await expect(
                tokenSale.connect(investor1).invest({ value: ethers.parseEther("1") })
            ).to.be.revertedWith("Sale: sale deadline has passed");
        });

        it("Should accumulate multiple investments from same investor", async function () {
            await tokenSale.connect(investor1).invest({ value: ethers.parseEther("1") });
            await tokenSale.connect(investor1).invest({ value: ethers.parseEther("0.5") });
            expect(await tokenSale.investments(investor1.address)).to.equal(ethers.parseEther("1.5"));
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // HAPPY PATH — SUCCESSFUL SALE
    // ──────────────────────────────────────────────────────────────────────────
    describe("Happy Path — Successful Sale", function () {
        beforeEach(async function () {
            // Invest enough to meet soft cap
            await tokenSale.connect(investor1).invest({ value: ethers.parseEther("3") });
            await tokenSale.connect(investor2).invest({ value: ethers.parseEther("2") });
        });

        it("Should end sale as SUCCESSFUL when soft cap is met", async function () {
            await expect(tokenSale.connect(owner).endSale())
                .to.emit(tokenSale, "SaleEnded")
                .withArgs(1, ethers.parseEther("5")); // state 1 = SUCCESSFUL

            const info = await tokenSale.getSaleInfo();
            expect(info.state).to.equal(1); // SUCCESSFUL
        });

        it("Should transfer BNB to escrow on success", async function () {
            await tokenSale.connect(owner).endSale();
            const escrowBalance = await escrow.getBalance();
            expect(escrowBalance).to.equal(ethers.parseEther("5"));
        });

        it("Should release Milestone 1 (50%) to founder", async function () {
            await tokenSale.connect(owner).endSale();
            const founderBalanceBefore = await ethers.provider.getBalance(founder.address);

            await expect(escrow.connect(owner).releaseMilestone(1))
                .to.emit(escrow, "MilestoneReleased")
                .withArgs(1, ethers.parseEther("2.5"), founder.address);

            const founderBalanceAfter = await ethers.provider.getBalance(founder.address);
            expect(founderBalanceAfter - founderBalanceBefore).to.equal(ethers.parseEther("2.5"));
        });

        it("Should release Milestone 2 (remaining 50%) to founder", async function () {
            await tokenSale.connect(owner).endSale();
            await escrow.connect(owner).releaseMilestone(1);

            const escrowBalanceAfterM1 = await escrow.getBalance();
            const founderBalanceBefore = await ethers.provider.getBalance(founder.address);

            await expect(escrow.connect(owner).releaseMilestone(2))
                .to.emit(escrow, "MilestoneReleased");

            const founderBalanceAfter = await ethers.provider.getBalance(founder.address);
            // Founder should receive the remaining balance
            expect(founderBalanceAfter - founderBalanceBefore).to.equal(escrowBalanceAfterM1);
            expect(await escrow.getBalance()).to.equal(0);
        });

        it("Should block Milestone 2 before Milestone 1", async function () {
            await tokenSale.connect(owner).endSale();
            await expect(
                escrow.connect(owner).releaseMilestone(2)
            ).to.be.revertedWith("Escrow: Must release Milestone 1 first");
        });

        it("Should block double-release of Milestone 1", async function () {
            await tokenSale.connect(owner).endSale();
            await escrow.connect(owner).releaseMilestone(1);
            await expect(
                escrow.connect(owner).releaseMilestone(1)
            ).to.be.revertedWith("Escrow: Milestone 1 already released");
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // REFUND PATH — FAILED SALE
    // ──────────────────────────────────────────────────────────────────────────
    describe("Refund Path — Failed Sale", function () {
        beforeEach(async function () {
            // Invest below soft cap
            await tokenSale.connect(investor1).invest({ value: ethers.parseEther("0.5") });
            await tokenSale.connect(investor2).invest({ value: ethers.parseEther("0.3") });
        });

        it("Should end sale as FAILED when soft cap is not met", async function () {
            await expect(tokenSale.connect(owner).endSale())
                .to.emit(tokenSale, "SaleEnded")
                .withArgs(2, ethers.parseEther("0.8")); // state 2 = FAILED

            const info = await tokenSale.getSaleInfo();
            expect(info.state).to.equal(2); // FAILED
        });

        it("Should allow investor to claim full refund", async function () {
            await tokenSale.connect(owner).endSale();
            const balBefore = await ethers.provider.getBalance(investor1.address);

            const tx = await tokenSale.connect(investor1).refund();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const balAfter = await ethers.provider.getBalance(investor1.address);
            expect(balAfter + gasUsed - balBefore).to.equal(ethers.parseEther("0.5"));
        });

        it("Should emit Refunded event", async function () {
            await tokenSale.connect(owner).endSale();
            await expect(tokenSale.connect(investor1).refund())
                .to.emit(tokenSale, "Refunded")
                .withArgs(investor1.address, ethers.parseEther("0.5"));
        });

        it("Should reject double refund", async function () {
            await tokenSale.connect(owner).endSale();
            await tokenSale.connect(investor1).refund();
            await expect(
                tokenSale.connect(investor1).refund()
            ).to.be.revertedWith("Sale: no investment to refund");
        });

        it("Should block refund on SUCCESSFUL sale", async function () {
            // Investor3 invests enough to hit soft cap
            await tokenSale.connect(investor1).invest({ value: ethers.parseEther("5") });
            await tokenSale.connect(owner).endSale();
            await expect(
                tokenSale.connect(investor1).refund()
            ).to.be.revertedWith("Sale: refund not available");
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // ACCESS CONTROL
    // ──────────────────────────────────────────────────────────────────────────
    describe("Access Control", function () {
        it("Should reject non-admin calling endSale()", async function () {
            await expect(
                tokenSale.connect(attacker).endSale()
            ).to.be.revertedWithCustomError(tokenSale, "OwnableUnauthorizedAccount");
        });

        it("Should reject non-admin calling releaseMilestone()", async function () {
            await tokenSale.connect(investor1).invest({ value: ethers.parseEther("5") });
            await tokenSale.connect(owner).endSale();
            await expect(
                escrow.connect(attacker).releaseMilestone(1)
            ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
        });

        it("Should reject non-TokenSaleContract calling depositFunds()", async function () {
            await expect(
                escrow.connect(attacker).depositFunds({ value: ethers.parseEther("1") })
            ).to.be.revertedWith("Escrow: caller is not TokenSaleContract");
        });

        it("Should prevent double-ending sale", async function () {
            await tokenSale.connect(investor1).invest({ value: ethers.parseEther("5") });
            await tokenSale.connect(owner).endSale();
            await expect(
                tokenSale.connect(owner).endSale()
            ).to.be.revertedWith("Sale: sale already ended");
        });
    });
});
