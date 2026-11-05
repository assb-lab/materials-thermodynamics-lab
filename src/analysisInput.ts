export const COMMANDS = ["section", "decompose", "reaction-line", "profile"] as const;
export type AnalysisCommand = (typeof COMMANDS)[number];

export interface AnalysisInput {
  command: AnalysisCommand;
  /** Raw JSON texts, allowing multiple MP download pages. */
  data?: string[];
  sample?: boolean;
  thermoType?: string;
  ends?: [string, string, string];
  point?: [number, number, number];
  start?: [number, number, number];
  end?: [number, number, number];
  basis?: "mol" | "atom";
  stableMeV?: number;
  formula?: string;
  ion?: string;
  stabilize?: boolean;
  deltaMeV?: number;
  exclude?: string[];
  gasPhases?: string[];
  volume?: boolean;
  film?: { diameterUm: number; fraction?: number; chargeMAhG?: number };
}

const coordinate = {
  type: "array",
  items: { type: "number", minimum: 0 },
  minItems: 3,
  maxItems: 3,
};
const strings = { type: "array", items: { type: "string", minLength: 1 } };

/** One schema for CLI validation and WebMCP discovery. Coordinates are normalized ratios. */
export const ANALYSIS_SCHEMA = {
  type: "object",
  required: ["command"],
  additionalProperties: false,
  properties: {
    command: { type: "string", enum: COMMANDS },
    data: { ...strings, minItems: 1, description: "Raw JSON texts, one per input file/page." },
    sample: { type: "boolean", description: "Use the bundled real MP Cl-Li-P-S sample." },
    thermoType: { type: "string", enum: ["GGA_GGA+U_R2SCAN", "GGA_GGA+U", "R2SCAN"] },
    ends: { ...strings, minItems: 3, maxItems: 3 },
    point: coordinate,
    start: coordinate,
    end: coordinate,
    basis: { type: "string", enum: ["mol", "atom"], default: "mol" },
    stableMeV: { type: "number", minimum: 0 },
    formula: { type: "string", minLength: 1 },
    ion: { type: "string", minLength: 1 },
    stabilize: { type: "boolean", default: true },
    deltaMeV: { type: "number", minimum: 0 },
    exclude: strings,
    gasPhases: strings,
    volume: { type: "boolean" },
    film: {
      type: "object",
      additionalProperties: false,
      required: ["diameterUm"],
      properties: {
        diameterUm: { type: "number", exclusiveMinimum: 0 },
        fraction: { type: "number", minimum: 0, maximum: 1 },
        chargeMAhG: { type: "number", minimum: 0 },
      },
      oneOf: [{ required: ["fraction"] }, { required: ["chargeMAhG"] }],
    },
  },
} as const;
