import { NextApiRequest, NextApiResponse } from "next";
import { interpretResult } from "../../lib/interpretation";
import { simulateTx } from "../../lib/simulation";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const data = {
    to: "0x9f2817015caf6607c1198fb943a8241652ee8906",
    data: "0xc97336f3",
    gasLimit: 150000,
    nonce: 169,
    value: "0x2386f26fc10000",
  };
  const result = await simulateTx(
    data,
    "0xe77162b7D2CEb3625a4993Bab557403a7B706F18"
  );
  const interpreted = await interpretResult(result);
  res.status(200).json({ interpreted, raw: result });
};
