// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IEscrow {
    function depositFunds() external payable;
}

/**
 * @title TokenSaleContract
 * @dev Manages an IDO token sale with soft cap / hard cap enforcement.
 *      On success, BNB is forwarded to EscrowContract.
 *      On failure, investors can reclaim their BNB via refund().
 */
contract TokenSaleContract is Ownable, ReentrancyGuard {

    // ── Sale Configuration ────────────────────────────────────────────────
    string  public tokenName;
    string  public tokenSymbol;
    uint256 public tokenPriceInWei;   // BNB per token (in wei)
    uint256 public softCap;           // Minimum raise in wei
    uint256 public hardCap;           // Maximum raise in wei
    uint256 public deadline;          // Unix timestamp
    address public escrowContract;

    // ── Sale State ────────────────────────────────────────────────────────
    enum SaleState { ACTIVE, SUCCESSFUL, FAILED }
    SaleState public saleState;

    uint256 public totalRaised;
    mapping(address => uint256) public investments;

    // ── Events ────────────────────────────────────────────────────────────
    event Invested(address indexed investor, uint256 amount);
    event SaleEnded(SaleState state, uint256 totalRaised);
    event Refunded(address indexed investor, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────────────
    constructor(
        string memory _tokenName,
        string memory _tokenSymbol,
        uint256 _tokenPriceInWei,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _durationSeconds,
        address _escrowContract,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_softCap > 0, "Sale: soft cap must be > 0");
        require(_hardCap >= _softCap, "Sale: hard cap must be >= soft cap");
        require(_escrowContract != address(0), "Sale: invalid escrow address");
        require(_tokenPriceInWei > 0, "Sale: token price must be > 0");

        tokenName       = _tokenName;
        tokenSymbol     = _tokenSymbol;
        tokenPriceInWei = _tokenPriceInWei;
        softCap         = _softCap;
        hardCap         = _hardCap;
        deadline        = block.timestamp + _durationSeconds;
        escrowContract  = _escrowContract;
        saleState       = SaleState.ACTIVE;
    }

    // ── Core Functions ────────────────────────────────────────────────────

    /**
     * @dev Invest BNB in the token sale.
     *      Enforces: ACTIVE state, before deadline, not over hard cap, nonzero value.
     */
    function invest() external payable nonReentrant {
        require(saleState == SaleState.ACTIVE, "Sale: sale is not active");
        require(block.timestamp < deadline, "Sale: sale deadline has passed");
        require(msg.value > 0, "Sale: investment must be > 0");
        require(totalRaised + msg.value <= hardCap, "Sale: would exceed hard cap");

        investments[msg.sender] += msg.value;
        totalRaised += msg.value;

        emit Invested(msg.sender, msg.value);
    }

    /**
     * @dev Admin ends the sale. 
     *      If soft cap met → SUCCESSFUL, forward BNB to escrow.
     *      If soft cap missed → FAILED, investors can refund.
     */
    function endSale() external onlyOwner {
        require(saleState == SaleState.ACTIVE, "Sale: sale already ended");

        if (totalRaised >= softCap) {
            saleState = SaleState.SUCCESSFUL;
            IEscrow(escrowContract).depositFunds{value: address(this).balance}();
        } else {
            saleState = SaleState.FAILED;
        }

        emit SaleEnded(saleState, totalRaised);
    }

    /**
     * @dev Investor claims refund when sale FAILED.
     */
    function refund() external nonReentrant {
        require(saleState == SaleState.FAILED, "Sale: refund not available");
        uint256 amount = investments[msg.sender];
        require(amount > 0, "Sale: no investment to refund");

        investments[msg.sender] = 0;
        totalRaised -= amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Sale: refund transfer failed");

        emit Refunded(msg.sender, amount);
    }

    // ── View Functions ─────────────────────────────────────────────────────

    /**
     * @dev Returns core sale info for the frontend.
     */
    function getSaleInfo() external view returns (
        string memory name,
        string memory symbol,
        uint256 price,
        uint256 soft,
        uint256 hard,
        uint256 raised,
        uint256 deadlineTs,
        uint8   state
    ) {
        return (
            tokenName,
            tokenSymbol,
            tokenPriceInWei,
            softCap,
            hardCap,
            totalRaised,
            deadline,
            uint8(saleState)
        );
    }

    /**
     * @dev Returns the investment amount for a specific investor.
     */
    function getInvestment(address investor) external view returns (uint256) {
        return investments[investor];
    }

    /**
     * @dev Returns current contract BNB balance.
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
