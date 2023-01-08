import { useDisclosure } from "@chakra-ui/react";
import { useAddRecentTransaction } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { useState } from "react";

import { useStep } from "@/components/Step";
import { useConnected } from "@/hooks/useConnected";
import { Tx } from "@/types/Tx";

import { GAS_AMOUNT_FOR_DEPLOY, GAS_AMOUNT_FOR_VERIFICATION } from "../../../../contracts/config";
import { useAAWallet } from "../../hooks/useAAWallet";
import { useErrorToast } from "../../hooks/useErrorToast";
import { steps } from "./steps";
import { AccountAbstractionTxStepModalMode } from "./types";

export const useAccountAbstractionTxStepModal = (urbitId: string) => {
  const { connected } = useConnected();
  const { aaWallet } = useAAWallet(urbitId);

  const [accountAbstractionTx, setAccountAbstractionTx] = useState<Tx>();
  const [mode, setMode] = useState<AccountAbstractionTxStepModalMode>("choosePaymentMethod");

  const [currentStep, isProcessing, { setStep, setIsProcessing }] = useStep({
    maxStep: steps.length,
    initialStep: 0,
  });
  const [hash, setHash] = useState("");

  const { isOpen, onOpen, onClose } = useDisclosure();
  const addRecentTransaction = useAddRecentTransaction();

  const errorToast = useErrorToast();

  const clear = () => {
    onClose();
    setStep(0);
    setIsProcessing(false);
    setAccountAbstractionTx(undefined);
    setHash("");
    setMode("choosePaymentMethod");
  };

  const start = (accountAbstractionTx: Tx) => {
    setAccountAbstractionTx(accountAbstractionTx);
    onOpen();
  };

  const process = () => {
    setMode("processTx");
    processTx();
  };

  const processTx = async () => {
    try {
      if (!connected) {
        throw new Error("aa wallet is not initialized");
      }
      if (!aaWallet) {
        throw new Error("aa wallet is not initialized");
      }
      if (!accountAbstractionTx) {
        throw new Error("account abstraction tx is not set");
      }
      const paymasterAndData = "0x";

      setStep(0);
      setIsProcessing(true);
      const op = await aaWallet.userOpHandler.createSignedUserOp({
        ...accountAbstractionTx,
        gasLimit: ethers.BigNumber.from(accountAbstractionTx.gasLimit)
          .add(GAS_AMOUNT_FOR_VERIFICATION)
          .add(!aaWallet.isDeployed ? GAS_AMOUNT_FOR_DEPLOY : 0),
        paymasterAndData,
      });
      setIsProcessing(false);
      setStep(1);
      setIsProcessing(true);
      const transactionHash = await aaWallet.bundlerClient.sendUserOpToBundler(op);
      addRecentTransaction({ hash: transactionHash, description: "Account Abstraction Tx" });
      setIsProcessing(false);
      setStep(2);
      setHash(transactionHash);
      return transactionHash;
    } catch (e) {
      errorToast.open(e);
      clear();
    }
  };

  return {
    mode,
    accountAbstractionTx,
    currentStep,
    isProcessing,
    hash,
    isOpen,
    onOpen,
    clear,
    start,
    process,
    processTx,
  };
};
