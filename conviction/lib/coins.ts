// The full candidate list a user can lock themselves into at signup: BTC
// plus large-cap, established altcoins. No meme coins, no stablecoins —
// this app is deliberately for people who want to follow one serious asset
// without the noise of everything else.
//
// matchPatterns are regex fragments (already `|`-joined, case-insensitive,
// word-boundary-anchored where the symbol is short or a common English
// word) used to decide whether a given news article is about this coin.
// For ambiguous short tickers (LINK, NEAR, ATOM, OP, UNI, DOT) the pattern
// intentionally requires the full project name or a "$TICKER" cashtag
// rather than the bare symbol, to cut down on false positives — documented
// on /about for transparency.
export type Coin = {
  id: string; // CoinGecko coin id
  symbol: string;
  name: string;
  matchPatterns: string[];
};

export const COINS: Coin[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", matchPatterns: ["bitcoin", "\\bbtc\\b"] },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", matchPatterns: ["ethereum", "\\beth\\b"] },
  { id: "solana", symbol: "SOL", name: "Solana", matchPatterns: ["solana", "\\$sol\\b"] },
  { id: "ripple", symbol: "XRP", name: "XRP", matchPatterns: ["\\bxrp\\b", "\\bripple\\b"] },
  { id: "cardano", symbol: "ADA", name: "Cardano", matchPatterns: ["cardano", "\\$ada\\b"] },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", matchPatterns: ["avalanche", "\\bavax\\b"] },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", matchPatterns: ["chainlink", "\\$link\\b"] },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", matchPatterns: ["polkadot", "\\$dot\\b"] },
  { id: "litecoin", symbol: "LTC", name: "Litecoin", matchPatterns: ["litecoin", "\\bltc\\b"] },
  { id: "bitcoin-cash", symbol: "BCH", name: "Bitcoin Cash", matchPatterns: ["bitcoin cash", "\\bbch\\b"] },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos", matchPatterns: ["cosmos hub", "\\bcosmos network\\b", "\\$atom\\b"] },
  { id: "near", symbol: "NEAR", name: "NEAR Protocol", matchPatterns: ["near protocol", "\\$near\\b"] },
  { id: "arbitrum", symbol: "ARB", name: "Arbitrum", matchPatterns: ["arbitrum", "\\$arb\\b"] },
  { id: "optimism", symbol: "OP", name: "Optimism", matchPatterns: ["optimism network", "\\boptimism's\\b", "\\$op\\b"] },
  { id: "polygon-ecosystem-token", symbol: "POL", name: "Polygon", matchPatterns: ["polygon", "\\$pol\\b", "\\$matic\\b"] },
  { id: "uniswap", symbol: "UNI", name: "Uniswap", matchPatterns: ["uniswap", "\\$uni\\b"] },
  { id: "aave", symbol: "AAVE", name: "Aave", matchPatterns: ["\\baave\\b"] },
  { id: "stellar", symbol: "XLM", name: "Stellar", matchPatterns: ["stellar lumens", "\\$xlm\\b"] },
  { id: "hedera-hashgraph", symbol: "HBAR", name: "Hedera", matchPatterns: ["hedera", "\\bhbar\\b"] },
  { id: "monero", symbol: "XMR", name: "Monero", matchPatterns: ["monero", "\\bxmr\\b"] },
];

export function coinById(id: string): Coin | undefined {
  return COINS.find((coin) => coin.id === id);
}

export function buildCoinMatcher(coin: Coin): RegExp {
  return new RegExp(coin.matchPatterns.join("|"), "i");
}
