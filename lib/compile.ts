import { Metadata, Source } from "./sourcify";
import { Compiler } from "hardhat/internal/solidity/compiler/index";
import { CompilerDownloader } from "hardhat/internal/solidity/compiler/downloader";
import os from "os";

const getCompilerInput = (
  metadata: Metadata,
  sources: Record<string, { content: string }>
) => ({
  language: "Solidity",
  sources,
  settings: {
    optimizer: {
      ...metadata.settings.optimizer,
    },
    outputSelection: {
      "*": {
        "*": [
          "abi",
          "evm.bytecode",
          "evm.deployedBytecode",
          "evm.methodIdentifiers",
        ],
        "": ["id", "ast"],
      },
    },
  },
});

const getTempDir = () => {
  return os.tmpdir();
};

export const getCompilerPath = (metadata: Metadata) => {
  const downloader = new CompilerDownloader(getTempDir(), {
    forceSolcJs: true,
  });
  return downloader.getDownloadedCompilerPath(
    metadata.compiler.version.split("+")[0]
  );
};

export const compileSources = async (metadata: Metadata, sources: Source[]) => {
  const sourcesMapping = Object.fromEntries(
    sources.map((s) => [s.file, { content: s.content }])
  );

  const input = getCompilerInput(metadata, sourcesMapping);
  const path = await getCompilerPath(metadata);
  const compiler = new Compiler(path.compilerPath);

  const output = await compiler.compile(input);
  return [input, output];
};
