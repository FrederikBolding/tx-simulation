import { NextApiRequest, NextApiResponse } from "next";
import { interpretResult } from "../../lib/interpretation";
import { simulateTx } from "../../lib/simulation";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const to = "0x9f2817015caF6607C1198fB943A8241652EE8906";
  const data = {
    to,
    data: "0xc97336f3",
    gasLimit: 150000,
    nonce: 187,
    value: "0x2386f26fc10000",
  };
  const { result, trace, vm } = await simulateTx(
    data,
    "0xe77162b7D2CEb3625a4993Bab557403a7B706F18"
  );
  const interpreted = await interpretResult(vm, to, result, trace);
  res.status(200).json({ interpreted, raw: result, trace });
};
