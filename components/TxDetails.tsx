import { Box, Text } from "@chakra-ui/layout";
import { StatusBadge } from "./StatusBadge";

export const TxDetails = ({ status, gasUsed }) => (
  <Box>
    <StatusBadge status={status} />
    <Text>Gas Used: {gasUsed}</Text>
  </Box>
);
