import { Badge, Box } from "@chakra-ui/layout";

export const StatusBadge = ({ status }) => (
  <Box>
    Status:
    <Badge colorScheme={status === "success" ? "green" : "red"}>{status}</Badge>
  </Box>
);
