import { Box, Code, Text } from "@chakra-ui/layout";

export const StateChanges = ({ rawStateChanges, storageChanges }) => (
  <Box>
    {storageChanges.map((change) => (
      <Box>
        <Box>
          {/**<Text as="span" fontWeight="bold">
            {change.address}
          </Text>**/}
          <Code as="span">{change.type?.label}</Code>
          <Text as="span" fontWeight="bold">
            {change.storageInfo?.label}
            {change.index && `[${change.index}]`}
          </Text>
          {!change.index && <Text as="span">({change.storageKey})</Text>}
          <Code colorScheme="red" as="span">
            {
              rawStateChanges
                .find((c) => c.address === change.address)
                ?.storageDiff.find((d) => d.key === change.storageKey)?.original
            }
          </Code>
          <Code colorScheme="green" as="span">
            {change.storageValue}
          </Code>
        </Box>
      </Box>
    ))}
  </Box>
);
