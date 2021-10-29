import { Box, Text } from "@chakra-ui/layout";

export const LabeledData = ({ label, children }) => (
  <Box>
    <Text as="span" fontWeight="bold" mr="1">
      {label}:
    </Text>
    {children}
  </Box>
);
