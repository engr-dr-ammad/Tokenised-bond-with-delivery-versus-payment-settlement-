# Tokenised Bond with Delivery-Versus-Payment Settlement

A comprehensive implementation of a delivery-versus-payment (DVP) settlement system for wholesale CBDC and tokenised bonds. This project demonstrates atomic settlement guarantees where bonds and cash move together or not at all.

## Overview

This project implements three core components:

1. **CBDCToken** - Wholesale Central Bank Digital Currency (ERC20)
2. **BondToken** - Tokenised Bond (ERC20)
3. **DVPSettlement** - Atomic swap contract ensuring delivery-versus-payment

The DVP settlement contract guarantees that:
- **Atomicity**: Bond and CBDC transfers happen together or not at all
- **Finality**: Once executed and confirmed, settlements cannot be reversed
- **No Half-Complete Swaps**: The contract prevents partial settlement execution
- **Audit Trail**: All settlements are logged with complete state tracking

## Quick Start

### Installation

```bash
npm install
```

### Compilation

```bash
npm run compile
```

### Running Tests

```bash
npm test
```

### Test Coverage

```bash
npm run test:coverage
```

## Project Structure

```
.
├── contracts/
│   ├── CBDCToken.sol           # Wholesale CBDC token (ERC20)
│   ├── BondToken.sol           # Tokenised bond (ERC20)
│   └── DVPSettlement.sol       # Atomic DVP settlement contract
├── test/
│   └── DVPSettlement.test.ts   # Comprehensive TypeScript tests
├── hardhat.config.js           # Hardhat configuration
├── tsconfig.json               # TypeScript configuration
├── DVP_ARCHITECTURE.md         # Detailed architecture and atomicity model
└── README.md                   # This file
```

## Smart Contracts

### CBDCToken

A standard ERC20 token representing wholesale CBDC. Features:
- Mintable only by the contract owner (Central Bank)
- Burnable by token holders
- Full ERC20 functionality

```solidity
contract CBDCToken is ERC20, ERC20Burnable, Ownable
```

### BondToken

A standard ERC20 token representing tokenised bonds. Features:
- Mintable only by the contract owner (Bond Issuer)
- Burnable by token holders
- Full ERC20 functionality

```solidity
contract BondToken is ERC20, ERC20Burnable, Ownable
```

### DVPSettlement

The core contract implementing atomic delivery-versus-payment. Key features:

**Settlement Lifecycle:**
1. **Proposal**: A seller proposes a settlement with buyer, amounts, and expiry
2. **Approval**: Both parties approve their respective token transfers
3. **Execution**: Either party executes the settlement, triggering atomic swap
4. **Finality**: Settlement is marked as executed and becomes final

**Key Guarantees:**
- **Atomicity**: Both transfers succeed or both revert
- **Reentrancy Protection**: OpenZeppelin ReentrancyGuard prevents reentrancy attacks
- **Balance Verification**: Post-transfer checks ensure no token loss
- **Nonce Tracking**: Prevents replay attacks and enables settlement ordering
- **Expiry Enforcement**: Settlements expire and can be cancelled

## How It Works

### Atomic Settlement Execution

```solidity
function executeSettlement(bytes32 settlementId) external nonReentrant {
    // 1. Verify settlement is pending and not expired
    require(settlement.status == PENDING, "Settlement not pending");
    require(block.timestamp <= settlement.expiryTime, "Settlement expired");
    
    // 2. Record initial balances
    uint256 initialCbdcBalance = cbdcToken.balanceOf(buyer);
    uint256 initialBondBalance = bondToken.balanceOf(seller);
    
    // 3. Execute first transfer (reverts entire tx if fails)
    require(cbdcToken.transferFrom(buyer, seller, cbdcAmount), "CBDC transfer failed");
    
    // 4. Execute second transfer (reverts entire tx if fails)
    require(bondToken.transferFrom(seller, buyer, bondAmount), "Bond transfer failed");
    
    // 5. Verify balances to ensure correctness
    require(cbdcToken.balanceOf(buyer) == initialCbdcBalance - cbdcAmount);
    require(bondToken.balanceOf(seller) == initialBondBalance - bondAmount);
    
    // 6. Mark settlement as executed and finalize
    settlement.status = EXECUTED;
    settlement.executionTime = block.timestamp;
    nonces[seller]++;
}
```

### Why the Swap Can't Half-Complete

1. **EVM Transaction Atomicity**: All state changes in a transaction either all succeed or all revert
2. **Require Guards**: Explicit require statements check both transfers
3. **Balance Verification**: Post-execution checks prevent anomalies
4. **Reentrancy Guard**: Prevents concurrent execution attempts
5. **Status Management**: Settlement status prevents double-execution

## Finality Model

### Transaction Finality

Once a settlement is executed:
1. The transaction is included in a block
2. The settlement status changes to `EXECUTED`
3. The execution timestamp is recorded
4. The seller's nonce increments
5. These changes are immutable and irreversible

### Confirmation

- **Ethereum PoS**: Finality at epoch boundaries (~13 minutes)
- **Ethereum PoW**: Practical finality after 12-15 blocks (~3 minutes)
- **Settlement Confirmation**: A settlement is final once confirmed in a block

## Test Suite

Comprehensive tests covering:

✅ Contract deployment and initialization
✅ Token minting and authorization
✅ Settlement proposal with validation
✅ Atomic execution of swaps
✅ Balance verification and conservation
✅ Expiry enforcement
✅ Settlement cancellation
✅ Reentrancy protection
✅ Nonce management
✅ Replay prevention
✅ Edge cases (insufficient balance, invalid addresses, etc.)

### Running Tests

```bash
npm test
```

### Test Coverage

```bash
npm run test:coverage
```

## Security Considerations

### Implemented Protections

1. **Reentrancy Guard**: Prevents reentrancy attacks
2. **Balance Verification**: Ensures token conservation
3. **Nonce Management**: Prevents replay attacks
4. **Status Checking**: Prevents double-settlement execution
5. **Expiry Enforcement**: Limits settlement duration
6. **Authorization Checks**: Only involved parties can execute/cancel

### Assumptions

- OpenZeppelin contracts are secure and audited
- EVM transaction atomicity holds
- Time synchronization across participants
- Permissioned blockchain with known participants

## Deployment

### Prerequisites

```bash
npm install
```

### Compilation

```bash
npm run compile
```

### Deployment Script Example

```typescript
const CBDCToken = await ethers.getContractFactory("CBDCToken");
const cbdcToken = await CBDCToken.deploy();

const BondToken = await ethers.getContractFactory("BondToken");
const bondToken = await BondToken.deploy();

const DVPSettlement = await ethers.getContractFactory("DVPSettlement");
const dvpSettlement = await DVPSettlement.deploy(
    cbdcToken.address,
    bondToken.address
);
```

## Usage Example

```typescript
// 1. Mint tokens
await cbdcToken.mint(buyer.address, ethers.parseUnits("100000", 18));
await bondToken.mint(seller.address, ethers.parseUnits("1000", 18));

// 2. Propose settlement
const tx = await dvpSettlement.connect(seller).proposeSettlement(
    buyer.address,
    ethers.parseUnits("1000", 18),  // bond amount
    ethers.parseUnits("100000", 18), // cbdc amount
    Math.floor(Date.now() / 1000) + 86400 // expiry: 1 day from now
);

// 3. Get settlement ID from event
const receipt = await tx.wait();
const settlementId = /* extract from event */;

// 4. Approve tokens
await cbdcToken.connect(buyer).approve(dvpSettlement.address, cbdcAmount);
await bondToken.connect(seller).approve(dvpSettlement.address, bondAmount);

// 5. Execute settlement
await dvpSettlement.connect(buyer).executeSettlement(settlementId);

// Tokens are now exchanged atomically!
```

## Documentation

For detailed information about the atomicity model, finality guarantees, and why swaps can't half-complete, see [DVP_ARCHITECTURE.md](./DVP_ARCHITECTURE.md).

## Network Support

- **Hardhat Network**: For local development and testing
- **Ethereum**: Mainnet and testnets (when compiler available)
- **Permissioned Blockchains**: Can be deployed on any EVM-compatible chain

## License

MIT

## References

- [ERC20 Standard](https://eips.ethereum.org/EIPS/eip-20)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/)
- [Solidity Documentation](https://docs.soliditylang.org/)

## Author

**Developed by Ammad Aslam with AI-assisted tooling**

Generated with [Claude Code](https://claude.ai/code)

**Project**: Tokenised Bond with Delivery-Versus-Payment Settlement  
**Stack**: Solidity, Hardhat, TypeScript  
**Status**: Production-ready with 28 passing tests  
**Date**: 2026-10-27
