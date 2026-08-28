// Minimal Sign-In With Solana message format (subset of the CAIP-122 style
// message used by SIWE/SIWS conventions).

export function buildSiwsMessage(params: {
  domain: string;
  publicKey: string;
  nonce: string;
  issuedAt: string;
}): string {
  const { domain, publicKey, nonce, issuedAt } = params;
  return [
    `${domain} wants you to sign in with your Solana account:`,
    publicKey,
    "",
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

export function parseSiwsMessage(
  message: string,
): { domain: string; publicKey: string; nonce: string; issuedAt: string } | null {
  const lines = message.split("\n");
  const header = lines[0];
  const publicKey = lines[1];
  const nonceLine = lines.find((line) => line.startsWith("Nonce: "));
  const issuedAtLine = lines.find((line) => line.startsWith("Issued At: "));
  const domain = header?.match(/^(.*) wants you to sign in with your Solana account:$/)?.[1];

  if (!domain || !publicKey || !nonceLine || !issuedAtLine) return null;

  return {
    domain,
    publicKey,
    nonce: nonceLine.slice("Nonce: ".length),
    issuedAt: issuedAtLine.slice("Issued At: ".length),
  };
}
