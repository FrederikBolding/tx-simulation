import { RunTxResult } from "@ethereumjs/vm/dist/runTx";
import { Address, bufferToHex, toBuffer } from "ethereumjs-util";
import { ForkStateManager } from "hardhat/internal/hardhat-network/provider/fork/ForkStateManager";
import { AccountState } from "hardhat/internal/hardhat-network/provider/fork/AccountState";

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

    const keyDiff = await storageKeys.reduce(async (storageAcc, storageKey) => {
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
    }, []);

    if (keyDiff.length > 0) {
      return [...(await acc), { address, keyDiff }];
    }
    return acc;
  }, []);

  return diff;
};

export const interpretResult = async (result: RunTxResult) => {
  const logs = result.execResult.logs?.map((l) => ({
    address: bufferToHex(l[0]),
    topics: l[1].map(bufferToHex),
    data: bufferToHex(l[2]),
  }));
  const status = result.receipt.status ? "success" : "reverted";
  const gasUsed = result.gasUsed.toString(10);
  const stateChanges = await findStateChanges(result);
  return { logs, status, gasUsed, stateChanges };
};