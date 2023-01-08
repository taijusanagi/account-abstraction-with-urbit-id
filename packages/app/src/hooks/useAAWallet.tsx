/* eslint-disable camelcase */
import { HttpRpcClient } from "@account-abstraction/sdk/dist/src/HttpRpcClient";
import { ethers } from "ethers";
import { useEffect, useState } from "react";

import { AAWalletUserOpHandler } from "../../../contracts/lib/account-abstraction";
import networkJsonFile from "../../../contracts/network.json";
import { AAWallet, AAWallet__factory } from "../../../contracts/typechain-types";
import { useConnected } from "./useConnected";

export const useAAWallet = (urbitId: string) => {
  const { connected } = useConnected();

  const [aaWallet, setAAWallet] = useState<{
    bundlerClient: HttpRpcClient;
    userOpHandler: AAWalletUserOpHandler;
    address: string;
    contract: AAWallet;
    isDeployed: boolean;
    signerAddress: string;
    ethBalanceBigNumber: ethers.BigNumber;
    ethFormatedBalance: string;
  }>();

  useEffect(() => {
    (async () => {
      if (!connected || !urbitId || urbitId === "invalid") {
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
        azimuth: networkJsonFile[connected.chainId].deployments.azimuth,
        urbitId,
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
  }, [connected, urbitId]);

  return { aaWallet };
};
