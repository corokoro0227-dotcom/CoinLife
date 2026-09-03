import { config } from "../config.js";
import type { SignalProvider } from "../types.js";
import { createXApiProviderFromConfig } from "./x.js";
import { MockSignalProvider } from "./mock.js";

export function createSignalProvider(): SignalProvider {
  switch (config.signalProvider) {
    case "x":
      return createXApiProviderFromConfig();
    case "mock":
      return new MockSignalProvider();
    default:
      throw new Error(`未知の SIGNAL_PROVIDER: ${config.signalProvider}`);
  }
}
