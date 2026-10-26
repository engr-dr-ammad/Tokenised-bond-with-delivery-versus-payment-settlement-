# Tokenised Bond with Delivery-Versus-Payment (DVP) Settlement

## Overview

This project implements a wholesale CBDC cash token and a tokenised bond token with an atomic swap mechanism that ensures delivery-versus-payment settlement. The core guarantee is that the bond and payment move together—either both transfers complete or neither does.

## System Components

### 1. CBDCToken (ERC20)
A wholesale Central Bank Digital Currency (CBDC) token representing cash. This token can be minted by the central bank (contract owner) and transferred between parties.

**Key Features:**
- ERC20 standard compliant
- Burnable by token holders
- Mintable only by the contract owner
- Transfer and approval mechanisms for settlement participation

### 2. BondToken (ERC20)
A tokenised bond token representing a fixed-income security. This token can be minted by the issuer and transferred between parties.

**Key Features:**
- ERC20 standard compliant
- Burnable by token holders
- Mintable only by the contract owner
- Transfer and approval mechanisms for settlement participation

### 3. DVPSettlement
The core contract that orchestrates atomic delivery-versus-payment swaps between CBDC and Bond tokens.

**Key Responsibilities:**
- Settlement proposal management
- Atomic execution of token swaps
- Expiry time enforcement
- Settlement state tracking
- Nonce-based replay protection

## Atomicity & Finality Model

### Why the Swap Can't Half-Complete

The DVP settlement guarantees atomicity through several mechanisms:

#### 1. **Single Transaction Execution**
```solidity
function executeSettlement(bytes32 settlementId)
    external
    nonReentrant
    onlyValidSettlement(settlementId)
{
    // Both transfers happen in one transaction
    require(cbdcToken.transferFrom(...), "CBDC transfer failed");
    require(bondToken.transferFrom(...), "Bond transfer failed");
    
    // Balance verification ensures correctness
    require(finalBalance == expected, "Balance verification failed");
}
```

The entire settlement execution happens within a single blockchain transaction. If any step fails, the entire transaction reverts, preventing partial transfers.

#### 2. **ERC20 TransferFrom Semantics**
The ERC20 `transferFrom` function is atomic at the individual token level:
- It checks the sender's balance and allowance
- It updates both the sender's and recipient's balances
- It reverts if any check fails
- The update happens atomically within the EVM (Ethereum Virtual Machine)

#### 3. **Require Guards**
Explicit require statements ensure both transfers must succeed:
```solidity
require(cbdcToken.transferFrom(...), "CBDC transfer from buyer failed");
require(bondToken.transferFrom(...), "Bond transfer from seller failed");
```

If the CBDC transfer succeeds but the bond transfer fails, the entire transaction reverts, undoing the CBDC transfer.

#### 4. **Balance Verification**
Post-transfer verification ensures no balance anomalies:
```solidity
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
```

This prevents token loss or duplication scenarios.

#### 5. **Reentrancy Protection**
The `nonReentrant` modifier (from OpenZeppelin's ReentrancyGuard) prevents reentrancy attacks:
```solidity
function executeSettlement(bytes32 settlementId)
    external
    nonReentrant  // <- Prevents reentrancy
    onlyValidSettlement(settlementId)
```

This prevents an attacker from calling the function recursively to exploit timing windows.

### Finality Model

#### Transaction-Level Finality
1. **Immediate Finality**: Once a transaction is confirmed in a block, the state change is final for that block
2. **Settlement Mark**: The settlement is immediately marked as `EXECUTED` with the execution timestamp
3. **Nonce Increment**: The seller's nonce is incremented, preventing any replay of this exact settlement

#### Confirmation Guarantees
- **Ethereum PoS**: Finality occurs at epoch boundaries (about 13 minutes)
- **Ethereum PoW**: Practical finality after ~12-15 blocks (~3 minutes)
- **Settlement Confirmation**: A settlement can be considered final once the transaction is confirmed in a block

#### Prevention of Reversal
Once a settlement is executed:
1. The settlement status changes to `EXECUTED`
2. Any attempt to execute it again fails: `"Settlement not pending"`
3. The nonce prevents creation of an identical settlement
4. The transaction hash is immutable

## Settlement Lifecycle

### State 1: Proposal
```
Seller proposes a settlement with:
- Buyer address
- Bond amount to transfer
- CBDC amount to transfer
- Expiry time

Settlement Status: PENDING
```

### State 2: Approval & Preparation
```
Both parties approve their respective token amounts:
- Buyer approves CBDC for DVPSettlement contract
- Seller approves Bond for DVPSettlement contract

Settlement Status: PENDING
```

### State 3: Execution
```
Either buyer or seller calls executeSettlement()

Atomic operation:
1. CBDC transfers from Buyer → Seller
2. Bond transfers from Seller → Buyer
3. Balance verification
4. Nonce increment
5. Status change to EXECUTED

Settlement Status: EXECUTED
```

### State 4: Finality
```
Once confirmed in a block:
- Settlement is final and irreversible
- Balances are updated permanently
- Settlement cannot be re-executed
```

## Key Security Properties

### 1. Atomicity ✓
- Both transfers succeed or both fail
- No partial settlements possible
- Verified through EVM transaction semantics

### 2. Consistency ✓
- Balance verification ensures token conservation
- Nonce tracking prevents replays
- Settlement status prevents double-execution

### 3. Isolation ✓
- Reentrancy guard prevents concurrent execution
- Each transaction is independent
- State changes are atomic

### 4. Durability ✓
- Once confirmed in a block, changes are permanent
- Settlement timestamp records finality moment
- Can be audited through blockchain history

## Nonce Management

### Purpose
Nonces prevent replay attacks and ensure settlement ordering.

### Increment Timing
- Nonce increments ONLY upon successful execution
- Incrementing after execution ensures the nonce represents completed work

### Replay Prevention
- Each settlement includes a unique nonce at proposal time
- Even with identical parameters, different nonces create different settlement IDs
- The same settlement cannot be re-executed

### Usage Pattern
```
Seller creates Settlement 1 (nonce 0)
  └─ Execution succeeds
  └─ Nonce becomes 1

Seller creates Settlement 2 (nonce 1)
  └─ Different settlement ID from Settlement 1
  └─ Even with same amounts due to nonce difference

Settlement 1 cannot be re-created (different nonce now)
```

## Expiry Handling

### Expiry Time
Settlements have a configurable expiry time, typically 1 day from proposal.

### Expiry Check
```solidity
require(block.timestamp <= settlements[settlementId].expiryTime, "Settlement expired");
```

### Purpose
- Prevents indefinite holding of proposed settlements
- Allows parties to cancel stale settlements
- Reduces system's settlement obligation footprint

## Audit Trail

All settlements maintain complete audit information:

```solidity
struct Settlement {
    address seller;           // Settlement initiator
    address buyer;           // Settlement counterparty
    uint256 bondAmount;      // Bonds to transfer
    uint256 cbdcAmount;      // CBDC to transfer
    uint256 nonce;           // Replay prevention
    uint256 expiryTime;      // Deadline for execution
    SettlementStatus status; // PENDING, EXECUTED, or CANCELLED
    uint256 executionTime;   // When settlement completed
}
```

### Events Logged
1. **SettlementProposed**: Records initial proposal with all parameters
2. **SettlementExecuted**: Records successful completion with timestamp
3. **SettlementCancelled**: Records cancellation with parties

These events are immutable blockchain records for regulatory compliance.

## Deployment Architecture

### Production Setup (Bundesbank Model)

```
┌─────────────────────────────────────────┐
│   Blockchain Network (Permissioned)     │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ CBDC Tok │  │ Bond Tok │  │  DVP   │ │
│  │   en    │  │   en    │  │Settlmnt│ │
│  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────┘
         ▲               ▲          ▲
         │               │          │
    ┌────┴────────┬──────┴──────┬───┴──────┐
    │   Central   │  Bond       │  Trading │
    │   Bank      │  Issuer     │  Desk    │
    │             │             │          │
    └─────────────┴─────────────┴──────────┘
```

### Key Deployment Considerations

1. **Permissioned Blockchain**: Only authorized participants can execute settlements
2. **Central Bank as Owner**: Can mint/burn CBDC as needed
3. **Bond Issuer**: Controls bond token supply
4. **Settlement Contract**: Owned by central authority, immutable once deployed
5. **Time Synchronization**: All participants use synchronized time sources

## Testing Strategy

The test suite validates:

✓ Contract deployment with correct parameters
✓ Token minting authorization
✓ Settlement proposal with validation
✓ Atomic execution of swaps
✓ Balance verification and conservation
✓ Expiry enforcement
✓ Cancellation policies
✓ Reentrancy protection
✓ Nonce management and replay prevention
✓ Edge cases (insufficient balance, invalid addresses, etc.)

Run tests with:
```bash
npm test
```

## Conclusion

This implementation provides a production-ready delivery-versus-payment settlement system with:
- **Cryptographic Certainty**: Atomicity guaranteed by EVM transaction semantics
- **Auditability**: Complete event logging for regulatory compliance
- **Finality**: Irreversible once confirmed in a block
- **No Half-Complete Swaps**: Both transfers happen together or not at all

The system is suitable for wholesale CBDC transactions where settlement integrity is paramount.
