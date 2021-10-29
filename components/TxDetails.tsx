import { Box } from "@chakra-ui/layout";
import { LabeledData } from "./LabeledData";
import { StatusBadge } from "./StatusBadge";

export const TxDetails = ({ status, gasUsed }) => (
  <Box>
    <StatusBadge status={status} />
    <LabeledData label="Gas Used">{gasUsed}</LabeledData>
  </Box>
);
