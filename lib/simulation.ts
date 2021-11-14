import { Transaction, TxData } from "@ethereumjs/tx";
import VM from "@ethereumjs/vm";
import { Address } from "ethereumjs-util";
import { ForkStateManager } from "hardhat/internal/hardhat-network/provider/fork/ForkStateManager";
import { ForkBlockchain } from "hardhat/internal/hardhat-network/provider/fork/ForkBlockchain";
import { makeForkClient } from "hardhat/internal/hardhat-network/provider/utils/makeForkClient";
import { makeForkCommon } from "hardhat/internal/hardhat-network/provider/utils/makeForkCommon";
import { VMTracer } from "hardhat/internal/hardhat-network/stack-traces/vm-tracer";
import { CONFIG } from "./config";
import { CustomTracer } from "./tracer";

const createVM = async () => {
  const { forkClient, forkBlockNumber } = await makeForkClient(
    CONFIG.forkConfig
  );
  const stateManager = new ForkStateManager(forkClient, forkBlockNumber);
  // Disabled since we need the original storage
  stateManager.clearOriginalStorageCache = () => {};

  // @todo Improve typing
  const common = await makeForkCommon(CONFIG as any);
  const blockchain = new ForkBlockchain(forkClient, forkBlockNumber, common);

  return new VM({
    activatePrecompiles: true,
    stateManager,
    blockchain: blockchain as any,
    common,
  });
};

export const simulateTx = async (txData: TxData, from: string) => {
  const tx = Transaction.fromTxData(txData, { freeze: false });
  tx.getSenderAddress = () => Address.fromString(from);

  const vm = await createVM();

  const vmTracer = new VMTracer(vm, vm.stateManager.getContractCode.bind(vm.stateManager));
  vmTracer.enableTracing();

  const customTracer = new CustomTracer(vm);

  const result = await vm.runTx({ tx });

  const trace = vmTracer.getLastTopLevelMessageTrace();
  
  const stores = customTracer.getStoreSteps();

  return { result, trace, stores };
};