import { RunTxResult } from "@ethereumjs/vm/dist/runTx";
import { Address, bufferToHex, toBuffer, unpadBuffer } from "ethereumjs-util";
import { ForkStateManager } from "hardhat/internal/hardhat-network/provider/fork/ForkStateManager";
import { AccountState } from "hardhat/internal/hardhat-network/provider/fork/AccountState";
import { decodeLog } from "./abi";
import { CONFIG } from "./config";
import {
  CallMessageTrace,
  isEvmStep,
  MessageTrace,
} from "hardhat/internal/hardhat-network/stack-traces/message-trace";
import { VmTraceDecoder } from "hardhat/internal/hardhat-network/stack-traces/vm-trace-decoder";
import { ContractsIdentifier } from "hardhat/internal/hardhat-network/stack-traces/contracts-identifier";
import { createModelsAndDecodeBytecodes } from "hardhat/internal/hardhat-network/stack-traces/compiler-to-model";
import { fetchMetadata, fetchSources, Metadata } from "./sourcify";
import { compileSources } from "./compile";
import { JumpType } from "hardhat/internal/hardhat-network/stack-traces/model";
import { Opcode } from "hardhat/internal/hardhat-network/stack-traces/opcodes";
import { nestedSearch, searchASTs } from "./ast";
import { InterpreterStep } from "@ethereumjs/vm/dist/evm/interpreter";

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
              key: bufferToHex(unpadBuffer(storageKeyBuf)),
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
  trace: MessageTrace,
  stores: InterpreterStep[]
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
  const decoded = decoder.tryToDecodeMessageTrace(trace) as CallMessageTrace;

  var depth = -1;
  const callStack = decoded.steps?.reduce((acc, step) => {
    if (isEvmStep(step)) {
      const instruction = decoded.bytecode.getInstruction(step.pc);
      const func = instruction.location?.getContainingFunction();
      if (func && instruction.jumpType === JumpType.INTO_FUNCTION) {
        depth++;
        const lineNum = instruction.location.getStartingLineNumber();

        return [
          ...acc,
          {
            sourceName: instruction.location.file.sourceName,
            functionName: func.name,
            lineNum,
            depth,
          },
        ];
      } else if (instruction.jumpType === JumpType.OUTOF_FUNCTION) {
        depth--;
      }
    }
    return acc;
  }, []);

  const outputSources = Object.values(output.sources);
  const asts = outputSources.map((o) => o.ast);

  const storage = Object.entries(output.contracts)
    .map(([contract, c]) =>
      Object.values(c).map((innerContract) => ({
        contract,
        ...innerContract.storageLayout,
      }))
    )
    .flat();

  const instructions = decoded.steps?.filter(isEvmStep).map((step) => {
    const instruction = decoded.bytecode.getInstruction(step.pc);
    const sourceName = instruction.location?.file.sourceName;
    const file = outputSources.find((o) => o.ast.absolutePath === sourceName);
    const sourceLocation =
      file &&
      instruction.location &&
      `${instruction.location.offset}:${instruction.location.length}:${file.id}`;
    return {
      pc: step.pc,
      opcode: Object.keys(Opcode).find(
        (key) => Opcode[key] === instruction.opcode
      ),
      pushData: instruction.pushData && bufferToHex(instruction.pushData),
      sourceLocation,
    };
  });

  const storageChanges = decoded.steps?.reduce((acc, step) => {
    if (isEvmStep(step)) {
      const instruction = decoded.bytecode.getInstruction(step.pc);
      if (instruction.opcode === Opcode.SSTORE) {
        const sourceName = instruction.location.file.sourceName;
        const file = outputSources.find(
          (o) => o.ast.absolutePath === sourceName
        );
        const sourceLocation =
          file &&
          `${instruction.location.offset}:${instruction.location.length}:${file.id}`;

        const astNode = searchASTs(asts, (i) => i.src === sourceLocation);
        // @todo Improve

        const defaultDeclaration =
          astNode?.expression?.leftHandSide?.baseExpression
            ?.referencedDeclaration;
        const pushDeclaration = nestedSearch(
          astNode,
          (i) => i.nodeType === "MemberAccess" && i.memberName === "push"
        )?.expression.referencedDeclaration;

        const referencedDeclaration = pushDeclaration ?? defaultDeclaration;

        const contractStorage = storage.find((s) => s.contract === sourceName);
        const storageInfo = contractStorage.storage.find(
          (s) => s.astId === referencedDeclaration
        );
        const type = storageInfo && contractStorage.types[storageInfo.type];

        const s = stores.find((s) => s.pc === instruction.pc);

        const storageKey = bufferToHex(
          unpadBuffer(toBuffer(s.stack[s.stack.length - 1]))
        );
        const storageValue = bufferToHex(
          unpadBuffer(toBuffer(s.stack[s.stack.length - 2] ?? 0))
        );
        const index =
          storageKey.length === 66
            ? (type?.key ?? type?.base)?.includes("int")
              ? parseInt(s.lastSHA?.potentialIndex)
              : s.lastSHA?.potentialIndex
            : null;
        const address = s.address.toString();

        return [
          ...acc,
          {
            address,
            referencedDeclaration,
            astNode,
            storageInfo,
            type,
            storageKey,
            storageValue,
            index,
          },
        ];
      }
    }
    return acc;
  }, []);

  return { callStack, storage, asts, storageChanges, instructions };
};

export const interpretResult = async (
  contractAddress: string,
  result: RunTxResult,
  trace: MessageTrace,
  stores: InterpreterStep[]
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
    metadata &&
    (await decodeTrace(contractAddress, partial, metadata, trace, stores));
  return { logs, status, gasUsed, stateChanges, metadata, decodedTrace };
};
