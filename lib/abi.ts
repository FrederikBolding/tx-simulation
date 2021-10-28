import { Log } from "@ethereumjs/vm/dist/evm/types";
import { keccakFromString } from "ethereumjs-util";

const getEventHash = (event) => {
  const s = `${event?.name}(${event.inputs.map((a) => `${a.type}`).join(",")})`;
  return keccakFromString(s);
};

export const decodeLog = (abi: any[], log: Log) => {
  const events = abi.filter((a) => a.type === "event");
  return events.find((e) => getEventHash(e).equals(log[1][0]));
};
