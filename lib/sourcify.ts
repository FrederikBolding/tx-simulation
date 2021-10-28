export interface Metadata {
  compiler: {
    version: string;
  };
  language: string;
  output: any;
  settings: {
      optimizer: {
          enabled: boolean;
          runs: number;
      }
  };
  sources: Record<
    string,
    {
      keccak256: string;
      license: string;
      urls: string[];
    }
  >;
}

export interface Source {
    file: string;
    content: string;
}

// @todo Cache
export const fetchMetadata = async (chainId: number, address: string) => {
  const fullMatch = await fetch(
    `https://repo.sourcify.dev/contracts/full_match/${chainId}/${address}/metadata.json`
  )
    .then((r) => (r.ok ? r.json() : null))
    .catch(console.error);

  if (fullMatch) {
    return { metadata: fullMatch, partial: false };
  }
  const partialMatch = await fetch(
    `https://repo.sourcify.dev/contracts/partial_match/${chainId}/${address}/metadata.json`
  )
    .then((r) => (r.ok ? r.json() : null))
    .catch(console.error);
  return { metadata: partialMatch, partial: true };
};

// @todo Cache
export const fetchSources = async (
  partial: boolean,
  chainId: number,
  address: string,
  metadata: Metadata
) => {
  const sourceFiles = Object.keys(metadata.sources);
  return Promise.all(
    sourceFiles.map(async (file) => {
      const sanitized = file.replace("@", "_");
      const content = await fetch(
        `https://repo.sourcify.dev/contracts/${
          partial ? "partial" : "full"
        }_match/${chainId}/${address}/sources/${sanitized}`
      )
        .then((r) => (r.ok ? r.text() : null))
        .catch(console.error);

      return { file, content };
    })
  );
};
