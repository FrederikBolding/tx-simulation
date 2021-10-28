import { RunTxResult } from "@ethereumjs/vm/dist/runTx";
import { Address, bufferToHex, toBuffer } from "ethereumjs-util";
import { ForkStateManager } from "hardhat/internal/hardhat-network/provider/fork/ForkStateManager";
import { AccountState } from "hardhat/internal/hardhat-network/provider/fork/AccountState";
import { decodeLog } from "./abi";
import { CONFIG } from "./config";
import { MessageTrace } from "hardhat/internal/hardhat-network/stack-traces/message-trace";
import { VmTraceDecoder } from "hardhat/internal/hardhat-network/stack-traces/vm-trace-decoder";
import { ContractsIdentifier } from "hardhat/internal/hardhat-network/stack-traces/contracts-identifier";
import { printMessageTrace } from "hardhat/internal/hardhat-network/stack-traces/debug";
import { createModelsAndDecodeBytecodes } from "hardhat/internal/hardhat-network/stack-traces/compiler-to-model";
import { fetchMetadata, fetchSources, Metadata } from "./sourcify";
import { compileSources } from "./compile";

export const findStateChanges = async (result: RunTxResult) => {
  const stateManager = result.execResult.runState
    .stateManager as ForkStateManager;
  const stateRoot = bufferToHex(await stateManager.getStateRoot());
  const state: Map<string, AccountState> =
    stateManager["_stateRootToState"].get(stateRoot);

  const addresses = Array.from(state.keys());

  const diff = await addresses.reduce(async (acc, address) => {
    const accountState: AccountState = state.get(address);
    const storageKeys = Array.from(accountState.storage.keys());
    const addressBuf = Address.fromString(address);

    const storageDiff = await storageKeys.reduce(
      async (storageAcc, storageKey) => {
        const storageKeyBuf = toBuffer(storageKey);
        const original = await stateManager.getOriginalContractStorage(
          addressBuf,
          storageKeyBuf
        );
        const now = await stateManager.getContractStorage(
          addressBuf,
          storageKeyBuf
        );

        if (!original.equals(now)) {
          return [
            ...(await storageAcc),
            {
              key: storageKey,
              original: bufferToHex(original),
              now: bufferToHex(now),
            },
          ];
        }
        return storageAcc;
      },
      []
    );

    if (storageDiff.length > 0) {
      return [...(await acc), { address, storageDiff }];
    }
    return acc;
  }, []);

  return diff;
};

const decodeTrace = async (
  contractAddress: string,
  partial: boolean,
  metadata: Metadata,
  trace: MessageTrace
) => {
  const sources = await fetchSources(
    partial,
    CONFIG.networkId,
    contractAddress,
    metadata
  );

  const [input, output] = await compileSources(metadata, sources);
  const contractsIdentifier = new ContractsIdentifier();

  const bytecodes = createModelsAndDecodeBytecodes(
    metadata.compiler.version,
    input,
    output
  );

  for (const bytecode of bytecodes) {
    contractsIdentifier.addBytecode(bytecode);
  }

  const decoder = new VmTraceDecoder(contractsIdentifier);
  const decoded = decoder.tryToDecodeMessageTrace(trace);

  printMessageTrace(decoded);
  // @todo Simplify / increase readability
  return decoded;
};

export const interpretResult = async (
  contractAddress: string,
  result: RunTxResult,
  trace: MessageTrace
) => {
  const { metadata, partial } = await fetchMetadata(
    CONFIG.networkId,
    contractAddress
  );
  const abi = metadata?.output?.abi;
  const logs = result.execResult.logs?.map((l) => ({
    address: bufferToHex(l[0]),
    topics: l[1].map(bufferToHex),
    data: bufferToHex(l[2]),
    decoded: abi && decodeLog(abi, l),
  }));
  const status = result.receipt.status ? "success" : "reverted";
  const gasUsed = result.gasUsed.toString(10);
  const stateChanges = await findStateChanges(result);
  const decodedTrace =
    metadata && (await decodeTrace(contractAddress, partial, metadata, trace));
  return { logs, status, gasUsed, stateChanges, metadata };
};
