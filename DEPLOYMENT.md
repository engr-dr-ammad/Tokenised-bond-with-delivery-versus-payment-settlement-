# Deployment Guide

## Overview

This guide covers deploying the Tokenised Bond with Delivery-Versus-Payment Settlement system to various environments.

## Prerequisites

1. Node.js 18+ and npm 9+
2. Git for version control
3. For mainnet: Ethereum wallet with sufficient funds for gas
4. For testnet: Testnet ETH from a faucet

## Installation

```bash
git clone https://github.com/engr-dr-ammad/tokenised-bond-with-delivery-versus-payment-settlement-.git
cd tokenised-bond-with-delivery-versus-payment-settlement-
npm install
```

## Compilation

Compile the smart contracts:

```bash
npm run compile
```

This generates:
- ABI files in `artifacts/contracts/`
- Bytecode for deployment
- TypeChain types for TypeScript

## Testing

Run the comprehensive test suite:

```bash
npm test
```

Expected output: All tests passing

Generate coverage report:

```bash
npm run test:coverage
```

## Deployment to Local Hardhat Network

### 1. Start Hardhat Node (Terminal 1)

```bash
npx hardhat node
```

This starts a local Hardhat network at `http://localhost:8545` with 20 pre-funded accounts.

### 2. Deploy Contracts (Terminal 2)

Create a deployment script `scripts/deploy.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  console.log("Deploying contracts...");

  // Deploy CBDCToken
  const CBDCToken = await ethers.getContractFactory("CBDCToken");
  const cbdcToken = await CBDCToken.deploy();
  await cbdcToken.deployed();
  console.log("CBDCToken deployed to:", cbdcToken.address);

  // Deploy BondToken
  const BondToken = await ethers.getContractFactory("BondToken");
  const bondToken = await BondToken.deploy();
  await bondToken.deployed();
  console.log("BondToken deployed to:", bondToken.address);

  // Deploy DVPSettlement
  const DVPSettlement = await ethers.getContractFactory("DVPSettlement");
  const dvpSettlement = await DVPSettlement.deploy(
    cbdcToken.address,
    bondToken.address
  );
  await dvpSettlement.deployed();
  console.log("DVPSettlement deployed to:", dvpSettlement.address);

  // Mint initial tokens
  const ownerAddress = (await ethers.getSigners())[0].address;
  const INITIAL_CBDC = ethers.parseUnits("1000000", 18); // 1M CBDC
  const INITIAL_BOND = ethers.parseUnits("100000", 18); // 100K bonds

  await cbdcToken.mint(ownerAddress, INITIAL_CBDC);
  await bondToken.mint(ownerAddress, INITIAL_BOND);

  console.log("\nDeployment Summary:");
  console.log("===================");
  console.log("CBDCToken:", cbdcToken.address);
  console.log("BondToken:", bondToken.address);
  console.log("DVPSettlement:", dvpSettlement.address);
  console.log("\nInitial Supply:");
  console.log("CBDC:", INITIAL_CBDC.toString());
  console.log("Bond:", INITIAL_BOND.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run deployment:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

## Deployment to Ethereum Testnet (Sepolia)

### 1. Configure Environment

Create `.env` file:

```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_wallet_private_key
```

### 2. Update Hardhat Config

Update `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
```

### 3. Deploy

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

## Production Deployment (Ethereum Mainnet)

### Security Checklist

Before mainnet deployment:

- [ ] All tests passing with 100% coverage
- [ ] Code security audit completed
- [ ] Gas optimization reviewed
- [ ] Events properly indexed
- [ ] Access control properly implemented
- [ ] Upgrade path considered (if needed)

### Deployment Steps

1. Get quotes from multiple security auditing firms
2. Conduct internal security review
3. Deploy to testnet first
4. Community review period (1-2 weeks)
5. Final audit approval
6. Mainnet deployment

### Mainnet Deployment Command

```bash
npx hardhat run scripts/deploy.ts --network mainnet
```

## Post-Deployment Verification

### 1. Verify Contracts on Etherscan

```bash
npx hardhat verify --network sepolia DEPLOYED_ADDRESS "Constructor arguments"
```

Example:

```bash
npx hardhat verify --network sepolia 0x123... 0x456... 0x789...
```

### 2. Test Contract Interactions

Create a test script to verify contract functionality:

```typescript
import { ethers } from "hardhat";

async function main() {
  const CBDC_ADDRESS = "0x...";
  const BOND_ADDRESS = "0x...";
  const DVP_ADDRESS = "0x...";

  const cbdc = await ethers.getContractAt("CBDCToken", CBDC_ADDRESS);
  const bond = await ethers.getContractAt("BondToken", BOND_ADDRESS);
  const dvp = await ethers.getContractAt("DVPSettlement", DVP_ADDRESS);

  // Check balances
  const cbdcBalance = await cbdc.balanceOf(await ethers.getSigner());
  const bondBalance = await bond.balanceOf(await ethers.getSigner());

  console.log("CBDC Balance:", cbdcBalance.toString());
  console.log("Bond Balance:", bondBalance.toString());

  // Check contract state
  console.log("DVP Contract Owner:", await dvp.owner());
}

main().catch(console.error);
```

## Monitoring and Maintenance

### 1. Monitor Contract Events

Use Etherscan or The Graph to monitor:
- `SettlementProposed` events
- `SettlementExecuted` events
- `SettlementCancelled` events

### 2. Regular Backups

Maintain backups of:
- Deployment scripts
- ABI files
- Transaction records
- Access control credentials

### 3. Upgrade Considerations

For future upgrades:
- Consider using proxy patterns (UUPS or Transparent)
- Maintain version history
- Document breaking changes
- Communicate clearly with users

## Troubleshooting

### Common Issues

**Issue: "Connection refused" when deploying**
```
Solution: Ensure Hardhat node is running in another terminal
```

**Issue: "Insufficient gas"**
```
Solution: Increase gas limit in hardhat.config.js or check gas prices
```

**Issue: "Nonce too high"**
```
Solution: Clear account nonce in pending transactions
```

**Issue: "Invalid signature"**
```
Solution: Check private key format and account balance
```

## Gas Optimization

### Deployment Costs (Approximate)

- CBDCToken: ~450,000 gas
- BondToken: ~450,000 gas
- DVPSettlement: ~1,200,000 gas

**Total: ~2,100,000 gas (~$3-5 at current rates)**

### Settlement Execution Costs

- Settlement Proposal: ~80,000 gas
- Settlement Execution: ~120,000 gas
- Settlement Cancellation: ~45,000 gas

## Disaster Recovery

### 1. Key Loss Recovery

If access keys are lost:
- Redeploy contracts with new owner
- Migrate state if necessary
- Notify stakeholders

### 2. Contract Upgrade Path

If bugs are found:
1. Deploy patched version to testnet
2. Conduct security audit
3. Deploy to mainnet
4. Provide migration instructions
5. Sunset old contracts

## Support and Maintenance

For issues and questions:
- GitHub Issues: Report bugs and feature requests
- GitHub Discussions: Community support
- Security Issues: Follow responsible disclosure

## References

- [Hardhat Deployment Guide](https://hardhat.org/guides/deploying/)
- [Etherscan Contract Verification](https://docs.etherscan.io/v/etherscan-docs/getting-started/viewing-contract-source-code)
- [OpenZeppelin Deployment Guide](https://docs.openzeppelin.com/contracts/4.x/deploying-and-interacting)
