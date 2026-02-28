// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TokenSaleContract.sol";
import "./EscrowContract.sol";

contract LaunchpadFactory {
    // Array to keep track of all launched sales
    address[] public allSales;

    // Optional: map token sale address to escrow address for easy lookup
    mapping(address => address) public saleToEscrow;
    
    // Map founder address to their sales
    mapping(address => address[]) public founderSales;

    event SaleLaunched(
        address indexed founder,
        address indexed tokenSale,
        address indexed escrow,
        string name,
        string symbol
    );

    /**
     * @dev Deploys a new Escrow and TokenSale contract pair, links them, and stores the addresses.
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _priceInWei Price per token in wei
     * @param _softCap Soft cap in wei
     * @param _hardCap Hard cap in wei
     * @param _durationInSeconds Sale duration in seconds
     */
    function createSale(
        string memory _name,
        string memory _symbol,
        uint256 _priceInWei,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _durationInSeconds
    ) external returns (address saleAddress, address escrowAddress) {
        
        // 1. Deploy EscrowContract (founder = msg.sender, initialOwner = Factory)
        EscrowContract newEscrow = new EscrowContract(msg.sender, address(this));
        escrowAddress = address(newEscrow);

        // 2. Deploy TokenSaleContract (initialOwner = Factory)
        TokenSaleContract newSale = new TokenSaleContract(
            _name,
            _symbol,
            _priceInWei,
            _softCap,
            _hardCap,
            _durationInSeconds,
            escrowAddress,
            address(this)
        );
        saleAddress = address(newSale);

        // 3. Link Escrow to TokenSale (Factory is owner, so this works)
        newEscrow.setTokenSaleContract(saleAddress);

        // 4. Transfer ownership to the actual founder
        newEscrow.transferOwnership(msg.sender);
        newSale.transferOwnership(msg.sender);

        // 5. Save to factory state
        allSales.push(saleAddress);
        saleToEscrow[saleAddress] = escrowAddress;
        founderSales[msg.sender].push(saleAddress);

        emit SaleLaunched(msg.sender, saleAddress, escrowAddress, _name, _symbol);

        return (saleAddress, escrowAddress);
    }

    /**
     * @dev Returns all token sale addresses created by this factory
     */
    function getAllSales() external view returns (address[] memory) {
        return allSales;
    }

    /**
     * @dev Returns the number of total sales created
     */
    function getSalesCount() external view returns (uint256) {
        return allSales.length;
    }
    
    /**
     * @dev Returns all sales created by a specific founder
     */
    function getSalesByFounder(address founder) external view returns (address[] memory) {
        return founderSales[founder];
    }
}
