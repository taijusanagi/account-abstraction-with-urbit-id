import { Button, HStack, IconButton, Image, Input, Link, Stack, Text, VStack } from "@chakra-ui/react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AiOutlineQrcode } from "react-icons/ai";

import {
  AccountAbstractionTxStepModal,
  useAccountAbstractionTxStepModal,
} from "@/components/AccountAbstractionTxStepModal";
import { Layout } from "@/components/Layout";
import { QRCodeScannerModal, useQRCodeScannerModal } from "@/components/QRCodeScannerModal";
import { Unit } from "@/components/Unit";
import { useAAWallet } from "@/hooks/useAAWallet";
import { useConnected } from "@/hooks/useConnected";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { compareInLowerCase } from "@/lib/utils";

import configJsonFile from "../../config.json";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ob = require("urbit-ob");

const HomePage: NextPage = () => {
  const router = useRouter();
  const { connected } = useConnected();
  const { openConnectModal } = useConnectModal();
  const qrCodeScannerModal = useQRCodeScannerModal();

  // urbit id related state
  const [inputUrbitIdString, setInputUrbitIdString] = useState("");
  const [calculateUrbitIdNumber, setCalculatedUrbitIdNumber] = useState("invalid");
  const [owner, setOwner] = useState(ethers.constants.AddressZero);

  const { aaWallet } = useAAWallet(calculateUrbitIdNumber);
  const { setId, instance, id, ...walletConnect } = useWalletConnect(calculateUrbitIdNumber);
  const { start, hash, ...accountAbstractionTxStepModal } = useAccountAbstractionTxStepModal(calculateUrbitIdNumber);

  useEffect(() => {
    if (!connected) {
      return;
    }
    if (ob.isValidPatq(inputUrbitIdString)) {
      const tokenId = ob.patp2dec(inputUrbitIdString);
      console.log("tokenId for", inputUrbitIdString, "is", tokenId);
      setCalculatedUrbitIdNumber(tokenId);
      connected.azimuth
        .getOwner(tokenId)
        .then((owner) => {
          console.log(tokenId, "is minted to", owner);
          setOwner(owner);
        })
        .catch(() => {
          console.log("Not minted Urbit ID");
        });
    } else {
      setCalculatedUrbitIdNumber("invalid");
      setOwner(ethers.constants.AddressZero);
    }
  }, [connected, inputUrbitIdString]);

  useEffect(() => {
    if (walletConnect.tx) {
      console.log("get request from wallet connect");
      start(walletConnect.tx);
      walletConnect.setTx(undefined);
    }
  }, [start, walletConnect]);

  useEffect(() => {
    if (instance && id && hash) {
      instance.approveRequest({ id, result: hash });
      setId(undefined);
    }
  }, [instance, id, setId, hash]);
  return (
    <Layout>
      <VStack py="6" spacing={"4"}>
        <Image src={"/assets/icon.png"} w="24" alt="hero" />
        <Text color={configJsonFile.style.color.accent} fontWeight={"bold"} fontSize="xl">
          {configJsonFile.name}
        </Text>
      </VStack>
      {!connected && (
        <VStack>
          <HStack>
            <Button
              variant="secondary"
              onClick={() => {
                router.push(configJsonFile.url.docs);
              }}
            >
              Docs
            </Button>
            <Button onClick={openConnectModal}>Connect Wallet</Button>
          </HStack>
        </VStack>
      )}
      {connected && (
        <Stack>
          <Unit header="Urbit ID" position="relative">
            <Stack>
              <Text fontSize="x-small" color={configJsonFile.style.color.accent}>
                * Using mock Azimuth since Urbit ID is hard to get in Georli
              </Text>
              <Stack spacing="1">
                <Text fontSize="xs" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                  Input Urbit ID (string)
                </Text>
                <Input
                  type={"text"}
                  value={inputUrbitIdString}
                  fontSize="xs"
                  onChange={(e) => setInputUrbitIdString(e.target.value)}
                />
              </Stack>
              <Stack spacing="1">
                <Text fontSize="xs" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                  Calculated Urbit ID (number)
                </Text>
                <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                  {calculateUrbitIdNumber}
                </Text>
              </Stack>
              <Stack spacing="1">
                <Text fontSize="xs" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                  Fetched Urbit ID owner
                </Text>
                <Text fontSize="x-small" color={configJsonFile.style.color.black.text.secondary}>
                  {owner}
                </Text>
              </Stack>
              <Button
                disabled={
                  calculateUrbitIdNumber === "invalid" || !compareInLowerCase(owner, ethers.constants.AddressZero)
                }
                onClick={async () => {
                  console.log("request to mint Urbit ID", calculateUrbitIdNumber);
                  const tx = await connected.azimuth.faucet(calculateUrbitIdNumber, connected.signerAddress);
                  console.log("processing tx...");
                  await tx.wait();
                  connected.azimuth
                    .getOwner(calculateUrbitIdNumber)
                    .then((owner) => {
                      console.log(calculateUrbitIdNumber, "is minted to", owner);
                      setOwner(owner);
                    })
                    .catch(() => {
                      console.log("Not minted Urbit ID");
                    });
                }}
              >
                Mint at faucet
              </Button>
            </Stack>
          </Unit>
          {aaWallet && (
            <>
              <Unit header="Account Abstraction" position="relative">
                <Stack>
                  <Text fontSize="x-small" color={configJsonFile.style.color.accent}>
                    * No paymaster available for this demo, please deposit 0.05 ETH
                  </Text>
                  <Stack spacing="1">
                    <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                      Calculated contract wallet address
                    </Text>
                    <Text fontSize="x-small" color={configJsonFile.style.color.link}>
                      <Link
                        href={`${connected.networkConfig.explorer.url}/address/${aaWallet.address}`}
                        target={"_blank"}
                      >
                        {aaWallet.address}
                      </Link>
                    </Text>
                  </Stack>
                  <Stack spacing="1">
                    <Text fontSize="xs" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                      ETH
                    </Text>
                    <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                      <Text as="span" mr="1">
                        {aaWallet.ethFormatedBalance}
                      </Text>
                      <Text as="span">ETH</Text>
                    </Text>
                  </Stack>
                </Stack>
              </Unit>
              <Unit header="Wallet Connect" position="relative">
                <Stack>
                  <HStack position="absolute" top="0" right="0" p="4">
                    <Text fontSize="xs" color={configJsonFile.style.color.link} fontWeight="bold">
                      <Link href={"https://example.walletconnect.org"} target={"_blank"}>
                        Example
                      </Link>
                    </Text>
                    <Text fontSize="xs" fontWeight={"bold"}>
                      <IconButton
                        size="xs"
                        variant={"ghost"}
                        shadow="none"
                        icon={<AiOutlineQrcode size="24" />}
                        aria-label="qrcode"
                        color={configJsonFile.style.color.link}
                        cursor="pointer"
                        disabled={!!walletConnect.isConnected}
                        onClick={qrCodeScannerModal.onOpen}
                      />
                    </Text>
                  </HStack>
                  {!walletConnect.app && (
                    <Text fontSize="xs" fontWeight={"medium"} color={configJsonFile.style.color.black.text.secondary}>
                      Not connected
                    </Text>
                  )}
                  {walletConnect.app && (
                    <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                      Connected with{" "}
                      <Link
                        color={configJsonFile.style.color.link}
                        href={walletConnect.app.url}
                        target={"_blank"}
                        fontWeight={"bold"}
                      >
                        {walletConnect.app.name}
                      </Link>
                    </Text>
                  )}
                  <Input
                    placeholder={"wc:"}
                    type={"text"}
                    value={walletConnect.uri}
                    fontSize="xs"
                    onChange={(e) => walletConnect.setURI(e.target.value)}
                  />
                  <Button
                    variant={!walletConnect.isConnected ? "primary" : "secondary"}
                    onClick={
                      !walletConnect.isConnected ? () => walletConnect.connect() : () => walletConnect.disconnect()
                    }
                    isLoading={walletConnect.isConnecting}
                  >
                    {!walletConnect.isConnected ? "Connect" : "Disconnect"}
                  </Button>
                </Stack>
              </Unit>
            </>
          )}
        </Stack>
      )}
      <QRCodeScannerModal
        isOpen={qrCodeScannerModal.isOpen}
        onScan={walletConnect.setURI}
        onClose={qrCodeScannerModal.onClose}
      />
      <AccountAbstractionTxStepModal
        mode={accountAbstractionTxStepModal.mode}
        process={accountAbstractionTxStepModal.process}
        currentStep={accountAbstractionTxStepModal.currentStep}
        isProcessing={accountAbstractionTxStepModal.isProcessing}
        isOpen={accountAbstractionTxStepModal.isOpen}
        onClose={accountAbstractionTxStepModal.clear}
        urbitId={calculateUrbitIdNumber}
        tx={accountAbstractionTxStepModal.accountAbstractionTx}
        hash={hash}
      />
    </Layout>
  );
};

export default HomePage;
