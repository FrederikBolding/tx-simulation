import { Box, Heading, VStack } from "@chakra-ui/layout";
import { Spinner } from "@chakra-ui/react";
import Head from "next/head";
import useSWR from "swr";
import { CallStack } from "../components/CallStack";
import { Logs } from "../components/Logs";
import { TxDetails } from "../components/TxDetails";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

export default function Home() {
  const { data, error } = useSWR("/api/simulate", fetcher);
  console.log(data, error);

  const interpreted = data?.interpreted;

  return (
    <div>
      <Head>
        <title>TX Simulation</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box p="8">
        <Heading>TX Simulation</Heading>
        {data ? (
          <VStack>
            <TxDetails
              status={interpreted.status}
              gasUsed={interpreted.gasUsed}
            />
            <Logs logs={interpreted.logs} />
            <CallStack callStack={interpreted.decodedTrace.callStack} />
          </VStack>
        ) : (
          <Spinner />
        )}
      </Box>
    </div>
  );
}
