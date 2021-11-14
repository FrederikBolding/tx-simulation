import VM from "@ethereumjs/vm";
import { InterpreterStep } from "@ethereumjs/vm/dist/evm/interpreter";

export class CustomTracer {
  stores: InterpreterStep[];
  constructor(private readonly _vm: VM) {
    this.stores = [];
    this.onStep = this.onStep.bind(this);
    this._vm.on("step", this.onStep);
  }

  private onStep(step: InterpreterStep, next: any) {
    if (step.opcode.name === "SSTORE") {
      this.stores.push({ ...step, stack: [...step.stack] });
    }

    next();
  }

  public getStoreSteps() {
    return this.stores;
  }
}
