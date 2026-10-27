
// Auto-generated type definitions for CBDCToken
// This is a minimal type definition to allow tests to import contract types

import { ContractFactory, Contract } from "ethers";

export interface CBDCToken extends Contract {
  // Add any additional methods/properties as needed
}

export interface CBDCTokenFactory extends ContractFactory {
  deploy(...args: any[]): Promise<CBDCToken>;
}

declare global {
  namespace ethers {
    interface ContractFactory {
      getContractFactory(name: "CBDCToken"): Promise<CBDCTokenFactory>;
    }
  }
}

export {};
