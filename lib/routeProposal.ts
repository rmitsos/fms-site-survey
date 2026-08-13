import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "./anthropic";
import type { JobParameters } from "./jobParameters";

export const RouteSegmentProposalSchema = z.object({
  label: z.string().describe("Short name for this route segment, e.g. 'Entrance to BEP'"),
  fromWaypointLabel: z.string().describe("Label or sequence number of the segment's starting waypoint"),
  toWaypointLabel: z.string().describe("Label or sequence number of the segment's ending waypoint"),
  method: z.enum(["conduit_new", "conduit_existing", "aerial", "blowing", "trench", "indoor_routing"])
    .describe("How the cable should be routed along this segment"),
  distanceMeters: z.number().nullable().describe("Estimated distance in meters, or null if unknown"),
  rationale: z.string().describe("Why this method and path were chosen, referencing the survey data, job parameters, or design rules"),
  cautions: z.array(z.string()).describe("Site-specific risks or constraints a crew should know before construction"),
});

export const RouteProposalSchema = z.object({
  summary: z.string().describe("2-4 sentence overview of the proposed route plan"),
  segments: z.array(RouteSegmentProposalSchema),
  openQuestions: z.array(z.string()).describe("Anything the survey data doesn't resolve that a human should confirm before this is used"),
});

export type RouteProposal = z.infer<typeof RouteProposalSchema>;

const SYSTEM_PROMPT = `You are a fiber-optic site survey engineer. Given one site survey's captured
waypoints and segments, its job parameters, a library of install/cabling design rules, and
summaries of similar past surveys, propose a cable routing plan connecting the waypoints in order.

Prefer routing methods consistent with the design rules and with precedent from the past surveys.
Ground every segment in the actual waypoints and segments provided - do not invent locations. If
the survey data doesn't give you enough to confidently choose a method or flag a risk, say so in
openQuestions rather than guessing.`;

export type PastSurveyContext = { siteName: string; summary: string };

export type RouteProposalInput = {
  siteName: string;
  jobParameters: JobParameters | null;
  waypoints: Array<{ sequence: number; label: string; notes: string }>;
  segments: Array<{ fromSequence: number; toSequence: number; distanceMeters: number | null; headingDegrees: number | null; method: string }>;
  designRules: Array<{ name: string; category: string; rule: string }>;
  pastSurveys: PastSurveyContext[];
};

export async function generateRouteProposal(input: RouteProposalInput): Promise<RouteProposal> {
  const client = getAnthropicClient();
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify(input, null, 2) }],
    output_config: {
      effort: "medium",
      format: zodOutputFormat(RouteProposalSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Claude did not return a parsable route proposal.");
  }
  return response.parsed_output;
}
