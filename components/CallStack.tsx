import { Box, Text } from "@chakra-ui/layout";

export const CallStack = ({ callStack }) => (
  <Box>
    {callStack.map((call) => (
      <Box>
        <Box ml={`${call.depth * 10}px`}>
          <Text as="span" fontWeight="bold">
            {call.functionName}
          </Text>
          <Text as="span" ml="1" fontStyle="italic">
            {call.sourceName}:{call.lineNum}
          </Text>
        </Box>
      </Box>
    ))}
  </Box>
);
