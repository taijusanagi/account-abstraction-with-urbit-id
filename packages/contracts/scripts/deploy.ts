/* eslint-disable camelcase */
import fs from "fs";
import { ethers, network } from "hardhat";
import path from "path";

import { DEV_SIGNER_ADDRESS } from "../config";
import { compareAddressInLowerCase } from "../lib/utils";
import networkJsonFile from "../network.json";
import { AAWalletDeployer__factory, MockAzimuth__factory } from "../typechain-types";
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
  const Factory = new AAWalletDeployer__factory(signer);
  const factory = await Factory.deploy();
  await factory.deployed();

  const Azimuth = new MockAzimuth__factory(signer);
  const azimuth = await Azimuth.deploy();
  await azimuth.deployed();

  const deployments = {
    entryPoint: networkJsonFile[chainId].deployments.entryPoint, // use fixed
    factory: factory.address,
    azimuth: azimuth.address,
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
