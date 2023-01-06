import { useContext } from "react";

import { AAWalletContext } from "@/contexts/AAWalletContext";

export const useAAWallet = () => {
  const { aaWallet } = useContext(AAWalletContext);
  return {
    aaWallet,
  };
};
