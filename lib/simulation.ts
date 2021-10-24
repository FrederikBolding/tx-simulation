import { Transaction, TxData } from "@ethereumjs/tx";
import VM from "@ethereumjs/vm";
import { Address } from "ethereumjs-util";
import { ForkStateManager } from "hardhat/internal/hardhat-network/provider/fork/ForkStateManager";
import { ForkBlockchain } from "hardhat/internal/hardhat-network/provider/fork/ForkBlockchain";
import { makeForkClient } from "hardhat/internal/hardhat-network/provider/utils/makeForkClient";
import { makeForkCommon } from "hardhat/internal/hardhat-network/provider/utils/makeForkCommon";

const CONFIG = {
  networkId: 1,
  forkConfig: {
    jsonRpcUrl: "https://api.mycryptoapi.com/eth",
  },
};

const createVM = async () => {
  const { forkClient, forkBlockNumber } = await makeForkClient(
    CONFIG.forkConfig
  );
  const stateManager = new ForkStateManager(forkClient, forkBlockNumber);
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
  const result = await vm.runTx({ tx, reportAccessList: false });
  return result;
};