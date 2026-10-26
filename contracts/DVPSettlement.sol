// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DVPSettlement is ReentrancyGuard, Ownable {
    enum SettlementStatus {
        PENDING,
        EXECUTED,
        CANCELLED
    }

    struct Settlement {
        address seller;
        address buyer;
        uint256 bondAmount;
        uint256 cbdcAmount;
        uint256 nonce;
        uint256 expiryTime;
        SettlementStatus status;
        uint256 executionTime;
    }

    IERC20 public cbdcToken;
    IERC20 public bondToken;

    mapping(bytes32 => Settlement) public settlements;
    mapping(address => uint256) public nonces;

    uint256 public constant DEFAULT_EXPIRY = 1 days;

    event SettlementProposed(
        bytes32 indexed settlementId,
        address indexed seller,
        address indexed buyer,
        uint256 bondAmount,
        uint256 cbdcAmount,
        uint256 nonce,
        uint256 expiryTime
    );

    event SettlementExecuted(
        bytes32 indexed settlementId,
        address indexed seller,
        address indexed buyer,
        uint256 bondAmount,
        uint256 cbdcAmount,
        uint256 executionTime
    );

    event SettlementCancelled(bytes32 indexed settlementId);

    modifier onlyValidSettlement(bytes32 settlementId) {
        require(
            settlements[settlementId].status == SettlementStatus.PENDING,
            "Settlement not pending"
        );
        require(block.timestamp <= settlements[settlementId].expiryTime, "Settlement expired");
        _;
    }

    constructor(address _cbdcToken, address _bondToken) {
        require(_cbdcToken != address(0), "Invalid CBDC token address");
        require(_bondToken != address(0), "Invalid Bond token address");
        cbdcToken = IERC20(_cbdcToken);
        bondToken = IERC20(_bondToken);
    }

    function proposeSettlement(
        address buyer,
        uint256 bondAmount,
        uint256 cbdcAmount,
        uint256 expiryTime
    ) external returns (bytes32) {
        require(buyer != address(0), "Invalid buyer address");
        require(bondAmount > 0, "Bond amount must be positive");
        require(cbdcAmount > 0, "CBDC amount must be positive");
        require(expiryTime > block.timestamp, "Expiry time must be in future");

        uint256 currentNonce = nonces[msg.sender];
        bytes32 settlementId = keccak256(
            abi.encodePacked(msg.sender, buyer, bondAmount, cbdcAmount, currentNonce, block.timestamp)
        );

        settlements[settlementId] = Settlement({
            seller: msg.sender,
            buyer: buyer,
            bondAmount: bondAmount,
            cbdcAmount: cbdcAmount,
            nonce: currentNonce,
            expiryTime: expiryTime,
            status: SettlementStatus.PENDING,
            executionTime: 0
        });

        emit SettlementProposed(
            settlementId,
            msg.sender,
            buyer,
            bondAmount,
            cbdcAmount,
            currentNonce,
            expiryTime
        );

        return settlementId;
    }

    function executeSettlement(bytes32 settlementId)
        external
        nonReentrant
        onlyValidSettlement(settlementId)
    {
        Settlement storage settlement = settlements[settlementId];

        require(
            msg.sender == settlement.buyer || msg.sender == settlement.seller,
            "Only involved parties can execute"
        );

        uint256 initialCbdcBalance = cbdcToken.balanceOf(settlement.buyer);
        uint256 initialBondBalance = bondToken.balanceOf(settlement.seller);

        require(
            cbdcToken.transferFrom(settlement.buyer, settlement.seller, settlement.cbdcAmount),
            "CBDC transfer from buyer failed"
        );

        require(
            bondToken.transferFrom(settlement.seller, settlement.buyer, settlement.bondAmount),
            "Bond transfer from seller failed"
        );

        uint256 finalCbdcBalance = cbdcToken.balanceOf(settlement.buyer);
        uint256 finalBondBalance = bondToken.balanceOf(settlement.seller);

        require(
            finalCbdcBalance == initialCbdcBalance - settlement.cbdcAmount,
            "CBDC balance verification failed"
        );
        require(
            finalBondBalance == initialBondBalance - settlement.bondAmount,
            "Bond balance verification failed"
        );

        settlement.status = SettlementStatus.EXECUTED;
        settlement.executionTime = block.timestamp;
        nonces[settlement.seller]++;

        emit SettlementExecuted(
            settlementId,
            settlement.seller,
            settlement.buyer,
            settlement.bondAmount,
            settlement.cbdcAmount,
            block.timestamp
        );
    }

    function cancelSettlement(bytes32 settlementId) external {
        Settlement storage settlement = settlements[settlementId];
        require(settlement.status == SettlementStatus.PENDING, "Settlement not pending");
        require(
            msg.sender == settlement.seller || msg.sender == settlement.buyer || msg.sender == owner(),
            "Only involved parties or owner can cancel"
        );

        settlement.status = SettlementStatus.CANCELLED;
        emit SettlementCancelled(settlementId);
    }

    function getSettlement(bytes32 settlementId)
        external
        view
        returns (Settlement memory)
    {
        return settlements[settlementId];
    }

    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }
}
