import { Log } from "@ethereumjs/vm/dist/evm/types";
import { bufferToHex, keccakFromString } from "ethereumjs-util";

export const fetchMetadata = async (chainId: number, address: string) => {
  const fullMatch = await fetch(
    `https://repo.sourcify.dev/contracts/full_match/${chainId}/${address}/metadata.json`
  )
    .then((r) => (r.ok ? r.json() : null))
    .catch(console.error);

  if (fullMatch) {
    return fullMatch;
  }
  return fetch(
    `https://repo.sourcify.dev/contracts/partial_match/${chainId}/${address}/metadata.json`
  )
    .then((r) => (r.ok ? r.json() : null))
    .catch(console.error);
};

const getEventHash = (event) => {
  const s = `${event?.name}(${event.inputs.map((a) => `${a.type}`).join(",")})`;
  return keccakFromString(s);
};

export const decodeLog = (abi: any[], log: Log) => {
  const events = abi.filter((a) => a.type === "event");
  return events.find((e) => getEventHash(e).equals(log[1][0]));
};
