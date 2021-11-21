import VM from "@ethereumjs/vm";
import { InterpreterStep } from "@ethereumjs/vm/dist/evm/interpreter";
import { bufferToHex, bufferToInt, unpadBuffer } from "ethereumjs-util";

export class CustomTracer {
  stores: InterpreterStep[];
  lastSHA = null;
  constructor(private readonly _vm: VM) {
    this.stores = [];
    this.onStep = this.onStep.bind(this);
    this._vm.on("step", this.onStep);
  }

  private onStep(step: InterpreterStep, next: any) {
    if (step.opcode.name === "SSTORE") {
      this.stores.push({ ...step, stack: [...step.stack], lastSHA: this.lastSHA });
    }

    if (step.opcode.name === "SHA3") {
      const offset = step.stack[step.stack.length - 1];
      const length = step.stack[step.stack.length - 2];
      if (!length.isZero()) {
        const data = readBuffer(
          step.memory,
          offset.toNumber(),
          length.toNumber()
        );
        const value = data.slice(0, 32);
        const slot = data.slice(32);
        const potentialIndex = bufferToHex(unpadBuffer(value));
        this.lastSHA = { value, slot, potentialIndex }
      }
    }

    next();
  }

  public getStoreSteps() {
    return this.stores;
  }
}

const readBuffer = (buf: Buffer, offset: number, size: number) => {
  const returnBuffer = Buffer.allocUnsafe(size);
  // Copy the stored "buffer" from memory into the return Buffer

  const loaded = Buffer.from(buf.slice(offset, offset + size));
  returnBuffer.fill(loaded, 0, loaded.length);

  if (loaded.length < size) {
    // fill the remaining part of the Buffer with zeros
    returnBuffer.fill(0, loaded.length, size);
  }

  return returnBuffer;
};
