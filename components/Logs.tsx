import { Box, Text } from "@chakra-ui/layout";

export const Logs = ({ logs }) => (
  <Box>
    {logs.map((log) => (
      <Box>
        {log.decoded && (
          <Text>
            {log.decoded.name}(
            {log.decoded.inputs
              .map((input) => `${input.type} ${input.name}`)
              .join(", ")}
            )
          </Text>
        )}

        {log.topics.map((topic) => (
          <Text>{topic}</Text>
        ))}
      </Box>
    ))}
  </Box>
);
