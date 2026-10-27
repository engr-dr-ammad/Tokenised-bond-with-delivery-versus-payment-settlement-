
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
