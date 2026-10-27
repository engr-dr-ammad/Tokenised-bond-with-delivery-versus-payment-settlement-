
// Auto-generated type definitions for DVPSettlement
// This is a minimal type definition to allow tests to import contract types

import { ContractFactory, Contract } from "ethers";

export interface DVPSettlement extends Contract {
  // Add any additional methods/properties as needed
}

export interface DVPSettlementFactory extends ContractFactory {
  deploy(...args: any[]): Promise<DVPSettlement>;
}

declare global {
  namespace ethers {
    interface ContractFactory {
      getContractFactory(name: "DVPSettlement"): Promise<DVPSettlementFactory>;
    }
  }
}

export {};
