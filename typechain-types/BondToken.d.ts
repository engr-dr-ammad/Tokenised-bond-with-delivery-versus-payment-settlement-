
// Auto-generated type definitions for BondToken
// This is a minimal type definition to allow tests to import contract types

import { ContractFactory, Contract } from "ethers";

export interface BondToken extends Contract {
  // Add any additional methods/properties as needed
}

export interface BondTokenFactory extends ContractFactory {
  deploy(...args: any[]): Promise<BondToken>;
}

declare global {
  namespace ethers {
    interface ContractFactory {
      getContractFactory(name: "BondToken"): Promise<BondTokenFactory>;
    }
  }
}

export {};
