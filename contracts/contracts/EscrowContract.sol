// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EscrowContract
 * @dev Holds raised BNB and releases it in two 50% tranches to the founder.
 *      Funds are deposited by TokenSaleContract on a successful sale.
 *      Milestone releases are triggered by the admin (owner).
 */
contract EscrowContract is Ownable, ReentrancyGuard {

    address public immutable founderWallet;
    address public tokenSaleContract;

    uint256 public totalDeposited;
    bool public milestone1Released;
    bool public milestone2Released;

    event FundsDeposited(uint256 amount);
    event MilestoneReleased(uint8 milestoneNumber, uint256 amount, address to);
    event TokenSaleContractSet(address indexed contractAddress);

    modifier onlyTokenSaleContract() {
        require(msg.sender == tokenSaleContract, "Escrow: caller is not TokenSaleContract");
        _;
    }

    constructor(address _founderWallet, address initialOwner) Ownable(initialOwner) {
        require(_founderWallet != address(0), "Escrow: invalid founder wallet");
        founderWallet = _founderWallet;
    }

    /**
     * @dev Set the TokenSaleContract address. Can only be called once by owner.
     */
    function setTokenSaleContract(address _tokenSaleContract) external onlyOwner {
        require(tokenSaleContract == address(0), "Escrow: TokenSaleContract already set");
        require(_tokenSaleContract != address(0), "Escrow: invalid address");
        tokenSaleContract = _tokenSaleContract;
        emit TokenSaleContractSet(_tokenSaleContract);
    }

    /**
     * @dev Called by TokenSaleContract to deposit raised funds into escrow.
     */
    function depositFunds() external payable onlyTokenSaleContract {
        require(msg.value > 0, "Escrow: no funds sent");
        totalDeposited += msg.value;
        emit FundsDeposited(msg.value);
    }

    /**
     * @dev Admin releases a milestone tranche (50% each) to the founder wallet.
     * @param milestoneNumber 1 for first milestone, 2 for second milestone
     */
    function releaseMilestone(uint8 milestoneNumber) external onlyOwner nonReentrant {
        require(milestoneNumber == 1 || milestoneNumber == 2, "Escrow: invalid milestone number");
        require(totalDeposited > 0, "Escrow: no funds in escrow");

        if (milestoneNumber == 1) {
            require(!milestone1Released, "Escrow: Milestone 1 already released");
            milestone1Released = true;
            uint256 amount = totalDeposited / 2;
            (bool success, ) = founderWallet.call{value: amount}("");
            require(success, "Escrow: transfer failed");
            emit MilestoneReleased(1, amount, founderWallet);
        } else {
            require(milestone1Released, "Escrow: Must release Milestone 1 first");
            require(!milestone2Released, "Escrow: Milestone 2 already released");
            milestone2Released = true;
            uint256 amount = address(this).balance;
            require(amount > 0, "Escrow: no remaining balance");
            (bool success, ) = founderWallet.call{value: amount}("");
            require(success, "Escrow: transfer failed");
            emit MilestoneReleased(2, amount, founderWallet);
        }
    }

    /**
     * @dev Returns current BNB balance held in escrow.
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Returns milestone release status.
     */
    function getMilestoneStatus() external view returns (bool m1Released, bool m2Released) {
        return (milestone1Released, milestone2Released);
    }

    receive() external payable {
        totalDeposited += msg.value;
        emit FundsDeposited(msg.value);
    }
}
