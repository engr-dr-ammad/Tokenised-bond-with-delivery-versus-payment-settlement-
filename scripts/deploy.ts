import { ethers } from "hardhat";

async function main() {
  console.log("========================================");
  console.log("Deploying Tokenised Bond DVP Settlement");
  console.log("========================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy CBDCToken
  console.log("\n1. Deploying CBDCToken...");
  const CBDCTokenFactory = await ethers.getContractFactory("CBDCToken");
  const cbdcToken = await CBDCTokenFactory.deploy();
  await cbdcToken.waitForDeployment();
  const cbdcAddress = await cbdcToken.getAddress();
  console.log("   ✓ CBDCToken deployed to:", cbdcAddress);

  // Deploy BondToken
  console.log("\n2. Deploying BondToken...");
  const BondTokenFactory = await ethers.getContractFactory("BondToken");
  const bondToken = await BondTokenFactory.deploy();
  await bondToken.waitForDeployment();
  const bondAddress = await bondToken.getAddress();
  console.log("   ✓ BondToken deployed to:", bondAddress);

  // Deploy DVPSettlement
  console.log("\n3. Deploying DVPSettlement...");
  const DVPSettlementFactory = await ethers.getContractFactory("DVPSettlement");
  const dvpSettlement = await DVPSettlementFactory.deploy(cbdcAddress, bondAddress);
  await dvpSettlement.waitForDeployment();
  const dvpAddress = await dvpSettlement.getAddress();
  console.log("   ✓ DVPSettlement deployed to:", dvpAddress);

  // Mint initial tokens
  console.log("\n4. Minting initial tokens...");
  const INITIAL_CBDC = ethers.parseUnits("10000000", 18); // 10M CBDC
  const INITIAL_BOND = ethers.parseUnits("1000000", 18);  // 1M bonds

  const cbdcMintTx = await cbdcToken.mint(deployer.address, INITIAL_CBDC);
  await cbdcMintTx.wait();
  console.log("   ✓ Minted", ethers.formatUnits(INITIAL_CBDC, 18), "CBDC tokens");

  const bondMintTx = await bondToken.mint(deployer.address, INITIAL_BOND);
  await bondMintTx.wait();
  console.log("   ✓ Minted", ethers.formatUnits(INITIAL_BOND, 18), "Bond tokens");

  // Verify deployment
  console.log("\n5. Verifying deployment...");
  const cbdcBalance = await cbdcToken.balanceOf(deployer.address);
  const bondBalance = await bondToken.balanceOf(deployer.address);
  const dvpOwner = await dvpSettlement.owner();

  console.log("   ✓ CBDC Balance:", ethers.formatUnits(cbdcBalance, 18));
  console.log("   ✓ Bond Balance:", ethers.formatUnits(bondBalance, 18));
  console.log("   ✓ DVP Owner:", dvpOwner);

  // Print deployment summary
  console.log("\n========================================");
  console.log("Deployment Summary");
  console.log("========================================");
  console.log("\nContract Addresses:");
  console.log("  CBDCToken:     ", cbdcAddress);
  console.log("  BondToken:     ", bondAddress);
  console.log("  DVPSettlement: ", dvpAddress);
  console.log("\nInitial Supply:");
  console.log("  CBDC:          ", ethers.formatUnits(INITIAL_CBDC, 18), "tokens");
  console.log("  Bond:          ", ethers.formatUnits(INITIAL_BOND, 18), "tokens");
  console.log("\nDeployer Account:");
  console.log("  Address:       ", deployer.address);
  console.log("  Balance:       ", ethers.formatEther(await deployer.getBalance()), "ETH");
  console.log("\n========================================");

  // Export addresses for later use
  const addresses = {
    cbdcToken: cbdcAddress,
    bondToken: bondAddress,
    dvpSettlement: dvpAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  console.log("\nAddresses JSON:");
  console.log(JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
