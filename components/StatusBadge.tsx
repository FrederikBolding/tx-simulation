import { Badge, Box } from "@chakra-ui/layout";
import { LabeledData } from "./LabeledData";

export const StatusBadge = ({ status }) => (
  <LabeledData label="Status">
    <Badge colorScheme={status === "success" ? "green" : "red"}>{status}</Badge>
  </LabeledData>
);
