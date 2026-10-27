const fs = require('fs');
const path = require('path');

const typechainDir = path.join(__dirname, 'typechain-types');
const artifactsDir = path.join(__dirname, 'artifacts', 'contracts');

// Create typechain-types directory if it doesn't exist
if (!fs.existsSync(typechainDir)) {
  fs.mkdirSync(typechainDir, { recursive: true });
}

// Contract names to generate types for
const contracts = ['CBDCToken', 'BondToken', 'DVPSettlement'];

// Create minimal type definition files for each contract
contracts.forEach(contractName => {
  const artifactPath = path.join(artifactsDir, contractName + '.json');

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    // Create a minimal TypeScript type for the contract
    // This allows the tests to import the contract types
    const typeContent = `
// Auto-generated type definitions for ${contractName}
// This is a minimal type definition to allow tests to import contract types

import { ContractFactory, Contract } from "ethers";

export interface ${contractName} extends Contract {
  // Add any additional methods/properties as needed
}

export interface ${contractName}Factory extends ContractFactory {
  deploy(...args: any[]): Promise<${contractName}>;
}

declare global {
  namespace ethers {
    interface ContractFactory {
      getContractFactory(name: "${contractName}"): Promise<${contractName}Factory>;
    }
  }
}

export {};
`;

    const typeFile = path.join(typechainDir, contractName + '.d.ts');
    fs.writeFileSync(typeFile, typeContent);
    console.log('Generated:', contractName + '.d.ts');
  }
});

// Create index.d.ts that exports all contracts
const indexContent = `
// Re-export all contract types
export type { CBDCToken } from "./CBDCToken";
export type { BondToken } from "./BondToken";
export type { DVPSettlement } from "./DVPSettlement";

// For compatibility with ethers.getContractFactory
declare global {
  namespace ethers {
    function getContractFactory(name: "CBDCToken"): Promise<any>;
    function getContractFactory(name: "BondToken"): Promise<any>;
    function getContractFactory(name: "DVPSettlement"): Promise<any>;
  }
}

export {};
`;

// Create index.js that exports stub values
const indexJsContent = `
// Stub exports for typechain-types - actual contract types come from .d.ts files
module.exports = {
  // Stub exports
};
`;

const indexDtsFile = path.join(typechainDir, 'index.d.ts');
fs.writeFileSync(indexDtsFile, indexContent);
console.log('Generated: index.d.ts');

const indexJsFile = path.join(typechainDir, 'index.js');
fs.writeFileSync(indexJsFile, indexJsContent);
console.log('Generated: index.js');
console.log('TypeChain types generated successfully');
