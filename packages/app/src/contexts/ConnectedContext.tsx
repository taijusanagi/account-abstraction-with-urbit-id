/* eslint-disable camelcase */
import { ethers } from "ethers";
import { createContext, useEffect, useState } from "react";
import { useAccount, useNetwork, useSigner } from "wagmi";

import networkJsonFile from "../../../contracts/network.json";
import { InterchainSafeDeployer, InterchainSafeDeployer__factory } from "../../../contracts/typechain-types";
import { ChainId, isChainId, NetworkConfig } from "../../../contracts/types/network";

export interface ConnectedContextValue {
  chainId: ChainId;
  provider: ethers.providers.Provider;
  signer: ethers.Signer;
  signerAddress: string;
  networkConfig: NetworkConfig;
  interchainSafeDeployer: InterchainSafeDeployer;
}

export interface ConnectedContext {
  connected?: ConnectedContextValue;
}

export const defaultConnectedContextValue = {};

export const ConnectedContext = createContext<ConnectedContext>(defaultConnectedContextValue);

export interface ConnectedContextProviderProps {
  children: React.ReactNode;
}

export const ConnectedContextProvider: React.FC<ConnectedContextProviderProps> = ({ children }) => {
  const { chain } = useNetwork();
  const { data: signer } = useSigner();
  const { address } = useAccount();
  const [connected, setConnected] = useState<ConnectedContextValue>();
  useEffect(() => {
    (async () => {
      if (!chain || !signer || !signer.provider || !address) {
        setConnected(undefined);
        return;
      }
      const chainId = String(chain.id);
      if (!isChainId(chainId)) {
        return;
      }
      const provider = signer.provider;
      const networkConfig = networkJsonFile[chainId];
      const signerAddress = address;
      const interchainSafeDeployer = InterchainSafeDeployer__factory.connect(
        networkConfig.deployments.interchainSafeDeployer,
        signer
      );
      setConnected({
        chainId,
        provider,
        signer,
        signerAddress,
        networkConfig,
        interchainSafeDeployer,
      });
    })();
  }, [chain, signer, address]);
  return <ConnectedContext.Provider value={{ connected }}>{children}</ConnectedContext.Provider>;
};
