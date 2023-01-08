/* eslint-disable camelcase */
import { EntryPoint, EntryPoint__factory, UserOperationStruct } from "@account-abstraction/contracts";
import { TransactionDetailsForUserOp } from "@account-abstraction/sdk/dist/src/TransactionDetailsForUserOp";
import { getRequestId } from "@account-abstraction/utils";
import { ethers } from "ethers";

import { GAS_AMOUNT_FOR_DEPLOY, GAS_AMOUNT_FOR_VERIFICATION } from "../../config";
import { AAWallet, AAWallet__factory, AAWalletDeployer, AAWalletDeployer__factory } from "../../typechain-types";
import { ChainId, isChainId } from "../../types/network";
import { calcPreVerificationGas, GasOverheads } from "./lib/calcPreVerificationGas";

export interface TransactionDetailsForUserOpWithPaymasterAndData extends TransactionDetailsForUserOp {
  paymasterAndData?: string;
  passInitCode?: boolean;
}

export interface AAWalletUserOpHandlerParams {
  signer: ethers.Signer;
  index?: number;
  entryPointAddress: string;
  factoryAddress: string;
  azimuth: string;
  urbitId: string;
  overheads?: Partial<GasOverheads>;
}

export class AAWalletUserOpHandler {
  signer: ethers.Signer;
  index: number;
  provider: ethers.providers.Provider;
  entryPoint: EntryPoint;
  factory: AAWalletDeployer;
  azimuth: string;
  urbitId: string;
  chainId?: ChainId;
  signerAddress?: string;
  AAWallet?: AAWallet;
  overheads?: Partial<GasOverheads>;

  constructor(params: AAWalletUserOpHandlerParams) {
    this.signer = params.signer;
    this.index = params.index || 0;
    const provider = this.signer.provider;
    if (!provider) {
      throw new Error("provider is invalid");
    }
    this.provider = provider;
    this.entryPoint = EntryPoint__factory.connect(params.entryPointAddress, this.provider);
    this.factory = AAWalletDeployer__factory.connect(params.factoryAddress, this.provider);
    this.azimuth = params.azimuth;
    this.urbitId = params.urbitId;
    this.overheads = params.overheads;
  }

  async _getChainId() {
    if (!this.chainId) {
      const chainId = await this.provider.getNetwork().then((network) => {
        const chainId = String(network.chainId);
        if (!isChainId(chainId)) {
          throw new Error("chain id is invalid");
        }
        return chainId;
      });
      this.chainId = chainId;
    }
    return this.chainId;
  }

  async _getSignerAddress() {
    if (!this.signerAddress) {
      const signerAddress = await this.signer.getAddress();
      this.signerAddress = signerAddress;
    }
    return this.signerAddress;
  }

  async _getCounterFactualAddress(): Promise<string> {
    return await this.factory.getCreate2Address(this.entryPoint.address, this.azimuth, this.urbitId, this.index);
  }

  async _getAAWallet() {
    if (!this.AAWallet) {
      const AAWalletAddress = await this._getCounterFactualAddress();
      this.AAWallet = AAWallet__factory.connect(AAWalletAddress, this.signer);
    }

    const code = await this.provider.getCode(this.AAWallet.address);

    return { AAWallet: this.AAWallet, isDeployed: code !== "0x" };
  }

  async _getInitCode() {
    const { isDeployed } = await this._getAAWallet();
    if (!isDeployed) {
      const initCode = ethers.utils.hexConcat([
        this.factory.address,
        this.factory.interface.encodeFunctionData("deployWallet", [
          this.entryPoint.address,
          this.azimuth,
          this.urbitId,
          this.index,
        ]),
      ]);
      return initCode;
    } else {
      return "0x";
    }
  }

  async _encodeExecute(target: string, value: ethers.BigNumber, data: string): Promise<string> {
    const { AAWallet } = await this._getAAWallet();
    return AAWallet.interface.encodeFunctionData("execFromEntryPoint", [target, value, data]);
  }

  async _getPreVerificationGas(userOp: Partial<UserOperationStruct>): Promise<number> {
    const p = await ethers.utils.resolveProperties(userOp);
    return calcPreVerificationGas(p, this.overheads);
  }

  async getWalletAddress(): Promise<string> {
    return await this._getCounterFactualAddress();
  }

  async getRequestId(userOp: UserOperationStruct): Promise<string> {
    const chainId = await this._getChainId();
    const op = await ethers.utils.resolveProperties(userOp);
    return getRequestId(op, this.entryPoint.address, Number(chainId));
  }

  async createUnsignedUserOp(info: TransactionDetailsForUserOpWithPaymasterAndData): Promise<UserOperationStruct> {
    const { AAWallet, isDeployed } = await this._getAAWallet();
    const nonce = !isDeployed ? 0 : await AAWallet.nonce();
    const initCode = info.passInitCode ? "0x" : await this._getInitCode();
    const value = ethers.BigNumber.from(info.value || 0);
    const callData = await this._encodeExecute(info.target, value, info.data);
    const callGasLimit =
      info.gasLimit ||
      (await this.provider.estimateGas({
        from: this.entryPoint.address,
        to: AAWallet.address,
        data: callData,
      }));
    let verificationGasLimit = ethers.BigNumber.from(GAS_AMOUNT_FOR_VERIFICATION);
    if (!isDeployed) {
      verificationGasLimit = verificationGasLimit.add(GAS_AMOUNT_FOR_DEPLOY);
    }
    let { maxFeePerGas, maxPriorityFeePerGas } = info;
    if (!maxFeePerGas || !maxPriorityFeePerGas) {
      const feeData = await this.provider.getFeeData();
      if (maxFeePerGas == null) {
        maxFeePerGas = feeData.maxFeePerGas ?? 0;
      }
      if (maxPriorityFeePerGas == null) {
        maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 0;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const partialUserOp: any = {
      sender: AAWallet.address,
      nonce,
      initCode,
      callData,
      callGasLimit,
      verificationGasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
    partialUserOp.paymasterAndData = info.paymasterAndData || "0x";
    return {
      ...partialUserOp,
      preVerificationGas: await this._getPreVerificationGas(partialUserOp),
      signature: "",
    };
  }

  async signUserOp(userOp: UserOperationStruct): Promise<UserOperationStruct> {
    const requestId = await this.getRequestId(userOp);
    const signature = await this.signer.signMessage(ethers.utils.arrayify(requestId));
    return {
      ...userOp,
      signature,
    };
  }

  async createSignedUserOp(info: TransactionDetailsForUserOpWithPaymasterAndData): Promise<UserOperationStruct> {
    const unsignedUserOp = await this.createUnsignedUserOp(info);
    return await this.signUserOp(unsignedUserOp);
  }
}
