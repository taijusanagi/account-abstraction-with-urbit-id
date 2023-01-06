/* eslint-disable camelcase */
import { HttpRpcClient } from "@account-abstraction/sdk/dist/src/HttpRpcClient";
import { ethers } from "ethers";
import { createContext, useContext, useEffect, useState } from "react";

import { AAWalletUserOpHandler } from "../../../contracts/lib/account-abstraction";
import { AAWallet, AAWallet__factory } from "../../../contracts/typechain-types";
import { ConnectedContext } from "./ConnectedContext";

export interface AAWalletContextValue {
  bundlerClient: HttpRpcClient;
  userOpHandler: AAWalletUserOpHandler;
  address: string;
  contract: AAWallet;
  isDeployed: boolean;
  signerAddress: string;
  ethBalanceBigNumber: ethers.BigNumber;
  ethFormatedBalance: string;
}

export interface AAWalletContext {
  aaWallet?: AAWalletContextValue;
}

export const defaultAAWalletContextValue = {
  aaWallet: undefined,
};

export const AAWalletContext = createContext<AAWalletContext>(defaultAAWalletContextValue);

export interface AAWalletContextProviderProps {
  children: React.ReactNode;
}

export const AAWalletContextProvider: React.FC<AAWalletContextProviderProps> = ({ children }) => {
  const { connected } = useContext(ConnectedContext);

  const [aaWallet, setAAWallet] = useState<AAWalletContextValue>();

  useEffect(() => {
    (async () => {
      if (!connected) {
        setAAWallet(undefined);
        return;
      }
      const bundlerClient = new HttpRpcClient(
        `${window.location.origin}/api/bundler/${connected.chainId}/rpc`,
        connected.networkConfig.deployments.entryPoint,
        Number(connected.chainId)
      );
      const userOpHandler = new AAWalletUserOpHandler({
        entryPointAddress: connected.networkConfig.deployments.entryPoint,
        signer: connected.signer,
        factoryAddress: connected.networkConfig.deployments.factory,
      });
      const address = await userOpHandler.getWalletAddress();
      const contract = AAWallet__factory.connect(address, connected.signer);
      const isDeployed = await connected.provider
        .getCode(address)
        .then((code) => code !== "0x")
        .catch(() => false);
      const signerAddress = connected.signerAddress;
      const ethBalanceBigNumber = await connected.provider.getBalance(address);
      const ethFormatedBalance = ethers.utils.formatEther(ethBalanceBigNumber);
      setAAWallet({
        bundlerClient,
        userOpHandler,
        address,
        contract,
        isDeployed,
        signerAddress,
        ethBalanceBigNumber,
        ethFormatedBalance,
      });
    })();
  }, [connected]);

  return <AAWalletContext.Provider value={{ aaWallet }}>{children}</AAWalletContext.Provider>;
};
