import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/** Lazy singleton so nothing touches ANTHROPIC_API_KEY until a request actually needs it. */
export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  client ??= new Anthropic();
  return client;
}
