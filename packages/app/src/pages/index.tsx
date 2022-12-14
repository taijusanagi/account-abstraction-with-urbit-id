import {
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Link,
  Select,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { SafeFactory } from "@safe-global/safe-core-sdk";
import EthersAdapter from "@safe-global/safe-ethers-lib";
import crypto from "crypto";
import { ethers } from "ethers";
import { NextPage } from "next";
import { useMemo, useState } from "react";
import QRCode from "react-qr-code";

import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { Unit } from "@/components/Unit";
import { useConnected } from "@/hooks/useConnected";
import { useErrorHandler } from "@/hooks/useErrorHandler";

import {
  HYPERLANE_EXPROLER_URI_BASE,
  SAFE_CALLBACK_HANDLER,
  SAFE_FACTORY_ADDRESS,
  SAFE_IMPLEMENTATION_ADDRESS,
} from "../../../contracts/config";
import networkJsonFile from "../../../contracts/network.json";
import { ChainId } from "../../../contracts/types/network";
import configJsonFile from "../../config.json";

const IssuePage: NextPage = () => {
  const { connected } = useConnected();
  const { openConnectModal } = useConnectModal();
  const confirmModalDisclosure = useDisclosure();

  const [destinationChainId, setDestinationChainId] = useState<ChainId>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [predictedAddress, setPredictedAddress] = useState("");
  const [txHash, setTxHash] = useState("");

  const { handle } = useErrorHandler();

  const clear = () => {
    confirmModalDisclosure.onClose();
    setIsProcessing(false);
    setPredictedAddress("");
    setTxHash("");
  };

  const filteredDestinationNetwork = useMemo(() => {
    if (!connected) {
      return [];
    }
    return Object.entries(networkJsonFile).filter(([chainId]) => chainId !== connected.chainId);
  }, [connected]);

  return (
    <Layout>
      <Unit header="Deploy SAFE with Hyperlane">
        {!connected && (
          <Button w="full" onClick={openConnectModal}>
            Connect Wallet
          </Button>
        )}
        {connected && (
          <Stack>
            <FormControl>
              <FormLabel>Source Chain</FormLabel>
              <Input disabled value={connected.networkConfig.name} fontSize="sm" />
            </FormControl>
            <FormControl>
              <FormLabel>Destination Chain</FormLabel>
              <Select fontSize="sm" onChange={(e) => setDestinationChainId(e.target.value as ChainId)}>
                {filteredDestinationNetwork.map(([chainId, { name }]) => {
                  return (
                    <option key={chainId} value={chainId}>
                      {name}
                    </option>
                  );
                })}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Owner</FormLabel>
              <Input disabled value={connected.signerAddress} fontSize="xs" />
            </FormControl>
            <FormControl>
              <FormLabel>Threshold</FormLabel>
              <Input disabled value={"1"} fontSize="xs" />
            </FormControl>
            <Button
              w="full"
              isLoading={isProcessing}
              onClick={async () => {
                try {
                  setIsProcessing(true);
                  let _destinationChainId: ChainId;
                  let destinationDomainId;
                  if (!destinationChainId) {
                    destinationDomainId = filteredDestinationNetwork[0][1].domainId;
                    _destinationChainId = filteredDestinationNetwork[0][0] as ChainId;
                  } else {
                    destinationDomainId = networkJsonFile[destinationChainId].domainId;
                    _destinationChainId = destinationChainId;
                  }
                  const safeAccountConfig = {
                    owners: [connected.signerAddress],
                    threshold: 1,
                  };
                  const safeDeploymentConfig = {
                    saltNonce: `0x${crypto.randomBytes(32).toString("hex")}`,
                    // saltNonce: "999",
                  };
                  const initializer = connected.gnosisSafe.interface.encodeFunctionData("setup", [
                    safeAccountConfig.owners,
                    safeAccountConfig.threshold,
                    ethers.constants.AddressZero,
                    "0x",
                    SAFE_CALLBACK_HANDLER,
                    ethers.constants.AddressZero,
                    0,
                    ethers.constants.AddressZero,
                  ]);
                  const data = connected.gnosisSafeProxyFactory.interface.encodeFunctionData("createProxyWithNonce", [
                    SAFE_IMPLEMENTATION_ADDRESS,
                    initializer,
                    safeDeploymentConfig.saltNonce,
                  ]);
                  const provider = new ethers.providers.JsonRpcProvider(networkJsonFile[_destinationChainId].rpc);
                  const ethAdapter = new EthersAdapter({
                    ethers,
                    // signerOrProvider: connected.signer,
                    signerOrProvider: provider,
                  });
                  const safeFactory = await SafeFactory.create({ ethAdapter });
                  const predictedAddress = await safeFactory.predictSafeAddress({
                    safeAccountConfig,
                    safeDeploymentConfig,
                  });
                  console.log("predictedAddress", predictedAddress);
                  // this is for test
                  // await safeFactory.deploySafe({ safeAccountConfig, safeDeploymentConfig });
                  setPredictedAddress(predictedAddress);
                  const tx = await connected.interchainAccountRouter.dispatch(
                    destinationDomainId,
                    SAFE_FACTORY_ADDRESS,
                    data
                  );
                  setTxHash(`${tx.hash}`);
                  confirmModalDisclosure.onOpen();
                } catch (e) {
                  handle(e);
                } finally {
                  setIsProcessing(false);
                }
              }}
            >
              Deploy
            </Button>
            <Modal header="Deployment Detail" onClose={clear} isOpen={confirmModalDisclosure.isOpen}>
              <Stack spacing="4">
                <Stack spacing="1">
                  <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    Track Tx on Hyperlane
                  </Text>
                  <Text fontSize="xs">
                    <Link
                      href={`${HYPERLANE_EXPROLER_URI_BASE}/?search=${txHash}`}
                      color={configJsonFile.style.color.link}
                      target="_blank"
                    >
                      {`${HYPERLANE_EXPROLER_URI_BASE}/?search=${txHash}`}
                    </Link>
                  </Text>
                </Stack>
                <Stack spacing="1">
                  <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    Predicted SAFE Address
                  </Text>
                  <Text fontSize="xs">{predictedAddress}</Text>
                </Stack>
                <Stack spacing="1">
                  <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    Import to{" "}
                    <Link
                      href={"https://gnosis-safe.io/app/load"}
                      color={configJsonFile.style.color.link}
                      target="_blank"
                    >
                      SAFE App
                    </Link>
                  </Text>
                  <Text fontSize="x-small" color={configJsonFile.style.color.black.text.tertiary}>
                    * Testnet SAFE App is only available in Georli
                  </Text>
                  <Text fontSize="x-small" color={configJsonFile.style.color.black.text.tertiary}>
                    * Please check relay status in Hyperlane exproler before importing
                  </Text>
                  <HStack justify={"center"} py="4">
                    <QRCode value={predictedAddress} />
                  </HStack>
                </Stack>
              </Stack>
            </Modal>
          </Stack>
        )}
      </Unit>
    </Layout>
  );
};

export default IssuePage;
