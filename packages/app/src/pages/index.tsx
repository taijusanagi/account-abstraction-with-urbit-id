import { Button, HStack, IconButton, Image, Input, Link, Stack, Text, VStack } from "@chakra-ui/react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
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

import configJsonFile from "../../config.json";

const IssuePage: NextPage = () => {
  const router = useRouter();
  const { connected } = useConnected();
  const { openConnectModal } = useConnectModal();
  const qrCodeScannerModal = useQRCodeScannerModal();
  const { instance, id, setId, ...walletConnect } = useWalletConnect();
  const { aaWallet } = useAAWallet();
  const { start, hash, ...accountAbstractionTxStepModal } = useAccountAbstractionTxStepModal();

  useEffect(() => {
    if (walletConnect.tx) {
      start(walletConnect.tx);
      walletConnect.setTx(undefined);
    }
  }, [start, walletConnect]);

  return (
    <Layout>
      <VStack py="6" spacing={"4"}>
        <Image src={"/assets/icon.png"} w="24" alt="hero" />
        <Text color={configJsonFile.style.color.accent} fontWeight={"bold"} fontSize="xl">
          {configJsonFile.name}
        </Text>
      </VStack>
      {(!connected || !aaWallet) && (
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
      {connected && aaWallet && (
        <Stack spacing="2">
          <Unit header="Wallet" position="relative">
            <Stack spacing="2">
              <Stack spacing="1">
                <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                  Account Abstraction Wallet
                </Text>
                <Text fontSize="xs" color={configJsonFile.style.color.link}>
                  <Link href={`${connected.networkConfig.explorer.url}/address/${aaWallet.address}`} target={"_blank"}>
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
              <Stack spacing="3.5">
                <Stack spacing="0">
                  {!walletConnect.app && (
                    <Text fontSize="xs" fontWeight={"medium"} color={configJsonFile.style.color.black.text.secondary}>
                      Not Connected
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
                </Stack>
                <Stack>
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
              </Stack>
            </Stack>
          </Unit>
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
        tx={accountAbstractionTxStepModal.accountAbstractionTx}
        hash={hash}
      />
    </Layout>
  );
};

export default IssuePage;
