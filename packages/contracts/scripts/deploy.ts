/* eslint-disable camelcase */
import { EntryPoint__factory } from "@account-abstraction/contracts";
import fs from "fs";
import { ethers, network } from "hardhat";
import path from "path";

import { DEV_SIGNER_ADDRESS, PAYMASTER_STAKE, UNSTAKE_DELAY_SEC } from "../config";
import { compareAddressInLowerCase } from "../lib/utils";
import networkJsonFile from "../network.json";
import { AAWalletDeployer__factory } from "../typechain-types";
import { ChainId, isChainId } from "../types/network";

// polygon evm needs to specify gas limit manually
async function main() {
  const chainId = String(network.config.chainId) as ChainId;
  console.log("chainId", chainId);

  const signer = await ethers.provider.getSigner();
  const signerAddress = await signer.getAddress();
  console.log("signer", signerAddress);
  if (!compareAddressInLowerCase(signerAddress, DEV_SIGNER_ADDRESS)) {
    throw new Error("signer invalid");
  }
  const EntryPoint = new EntryPoint__factory(signer);
  const entryPoint = await EntryPoint.deploy(PAYMASTER_STAKE, UNSTAKE_DELAY_SEC);
  await entryPoint.deployed();
  const Factory = new AAWalletDeployer__factory(signer);
  const factory = await Factory.deploy();
  await factory.deployed();
  const deployments = {
    entryPoint: entryPoint.address,
    factory: factory.address,
  };

  if (isChainId(chainId)) {
    networkJsonFile[chainId].deployments = deployments;
    fs.writeFileSync(path.join(__dirname, `../network.json`), JSON.stringify(networkJsonFile));
  }

  console.log("deployements", deployments);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
