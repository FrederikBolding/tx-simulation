import { Box, Text } from "@chakra-ui/layout";
import { formatUnits } from "@ethersproject/units";

export const TokenTransfers = ({ erc20Transfers, erc721Transfers }) => (
  <Box>
    {erc20Transfers.length > 0 && (
      <>
        <Text fontWeight="bold">ERC-20 Transfers</Text>
        {erc20Transfers.map((erc20) => (
          <ERC20Transfer {...erc20} />
        ))}
      </>
    )}
    {erc721Transfers.length > 0 && (
      <>
        <Text fontWeight="bold">ERC-721 Transfers</Text>
        {erc721Transfers.map((erc721) => (
          <ERC721Transfer {...erc721} />
        ))}
      </>
    )}
  </Box>
);

const ERC20Transfer = ({ from, to, value, symbol, decimals }) => (
  <Box>
    Transfer {formatUnits(value, decimals)} {symbol} {from} {"->"} {to}
  </Box>
);

const ERC721Transfer = ({ from, to, tokenId, name }) => (
  <Box>
    Transfer {name} ({tokenId}) {from} {"->"} {to}
  </Box>
);
