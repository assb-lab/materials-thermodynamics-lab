import Ajv from "ajv";
import { ANALYSIS_SCHEMA, type AnalysisInput } from "./analysisInput";
import { parseFormula } from "./core/formula";
import { buildHull, type Entry } from "./core/hull";
import { computeSection, makeEndMember, molToW, type Bary } from "./core/pseudoTernary";
import { analyzePoint, endMemberEnergies } from "./core/reaction";
import { describeEndpoint, reactionLine } from "./core/reactionLine";
import { parseThermoJson, type ThermoType } from "./data/mp";
import { excludeEntries } from "./voltage/core/entries";
import { computeProfile } from "./voltage/core/profile";
import { filmForRegion } from "./voltage/core/film";
import { parseEntryFiles } from "./voltage/data/io";
import { profileToCsv, profileToJson } from "./voltage/ui/export";
import { renderProfileSvg } from "./voltage/ui/plot";

const validate = new Ajv({ allErrors: true }).compile<AnalysisInput>(ANALYSIS_SCHEMA);

export function parseAnalysisInput(value: unknown): AnalysisInput {
  if (!validate(value)) {
    throw new Error(
      validate.errors?.map((error) => `${error.instancePath || "/"} ${error.message}`).join("; "),
    );
  }
  if (value.sample && value.data) throw new Error("Choose data or sample.");
  if (value.command === "profile" && !value.formula) throw new Error("profile requires formula.");
  if (value.command === "decompose" && !value.point) throw new Error("decompose requires point.");
  if (value.command === "reaction-line" && (!value.start || !value.end)) {
    throw new Error("reaction-line requires start and end.");
  }
  const common = ["command", "data", "sample", "thermoType"];
  const perCommand = {
    section: ["ends", "stableMeV"],
    decompose: ["ends", "stableMeV", "point", "basis"],
    "reaction-line": ["ends", "stableMeV", "start", "end", "basis"],
    profile: ["formula", "ion", "stabilize", "deltaMeV", "exclude", "gasPhases", "volume", "film"],
  };
  const allowed = new Set([...common, ...perCommand[value.command]]);
  const unused = Object.keys(value).filter(
    (key) => value[key as keyof AnalysisInput] !== undefined && !allowed.has(key),
  );
  if (unused.length)
    throw new Error(`Options not applicable to ${value.command}: ${unused.join(", ")}`);
  return value;
}

function coordinates(
  value: Bary,
  basis: AnalysisInput["basis"],
  ends: ReturnType<typeof makeEndMember>[],
): Bary {
  const sum = value.reduce((total, item) => total + item, 0);
  if (!(sum > 0) || !Number.isFinite(sum))
    throw new Error("Coordinates must have a positive finite sum.");
  const normalized = value.map((item) => item / sum) as Bary;
  return basis === "atom" ? normalized : molToW(normalized, ends);
}

export interface Provenance {
  source?: string;
  fetchedAt?: string;
  thermoType?: string;
}

function rawDocuments(texts: string[]) {
  const raw = texts.every((text) => {
    try {
      const body = JSON.parse(text);
      return (
        Array.isArray(body?.data) ||
        (Array.isArray(body) && body.every((entry) => typeof entry?.material_id === "string"))
      );
    } catch {
      return false;
    }
  });
  return raw ? parseThermoJson(texts) : null;
}

export async function runAnalysis(
  value: unknown,
  format: "json" | "csv" | "svg" = "json",
  provenance: Provenance = {},
) {
  const input = parseAnalysisInput(value);
  let texts = input.data;
  if (input.sample) {
    const { default: raw } = await import("./sample/Cl-Li-P-S_GGA_GGA+U_R2SCAN.json", {
      with: { type: "json" },
    });
    texts = [JSON.stringify(raw)];
  }
  if (!texts?.length)
    throw new Error("Provide data, select sample, or load data in the current page.");
  if (input.command !== "profile" && format !== "json")
    throw new Error("CSV and SVG formats require profile.");

  if (format !== "json" && input.film) throw new Error("Film results require JSON output.");
  const selectedThermo = input.thermoType ?? provenance.thermoType;
  if (input.command === "profile") {
    // Explicit thermo selection is applied before merging raw MP pages.
    if (selectedThermo) {
      const docs = rawDocuments(texts);
      if (docs) {
        const selected = docs.filter((doc) => doc.thermo_type === selectedThermo);
        if (!selected.length) throw new Error(`No entries with thermo type ${selectedThermo}.`);
        texts = [JSON.stringify({ data: selected })];
      }
    }
    const { set, warnings } = parseEntryFiles(
      texts.map((text, i) => ({ name: `input-${i + 1}`, text })),
    );
    if (selectedThermo && set.thermoType !== selectedThermo) {
      throw new Error(
        `Loaded thermo type ${set.thermoType ?? "unknown"} does not match ${selectedThermo}.`,
      );
    }
    const exclusion = excludeEntries(set.entries, input.exclude ?? []);
    const profile = computeProfile({
      entries: exclusion.entries,
      formula: input.formula!,
      ion: input.ion ?? "Li",
      stabilize: {
        enabled: input.stabilize ?? true,
        delta: (input.deltaMeV ?? 0) / 1000,
        allowVirtual: false,
      },
    });
    const volume = input.volume ? { gasPhases: input.gasPhases ?? [] } : undefined;
    if (format === "csv") return profileToCsv(profile, volume);
    if (format === "svg") return renderProfileSvg(profile);
    return {
      command: input.command,
      source: input.sample
        ? "Bundled Materials Project Cl-Li-P-S sample (2026-09-28)"
        : (provenance.source ?? set.source),
      fetchedAt: provenance.fetchedAt ?? set.fetchedAt ?? null,
      thermoType: set.thermoType ?? null,
      energyBasis: set.energyBasis ?? "total",
      units: {
        voltage: "V vs working-ion metal",
        energyAboveHull: "eV/atom",
        infiniteVoltage: "null",
      },
      warnings,
      excluded: exclusion.excluded.map((entry) => entry.id),
      unmatchedExclusions: exclusion.unmatched,
      result: JSON.parse(profileToJson(profile, volume)) as unknown,
      ...(input.film
        ? {
            filmModel: { ...input.film, gasPhases: input.gasPhases ?? [] },
            film: profile.regions.map((region) =>
              filmForRegion(profile, region, {
                ...input.film!,
                fraction: input.film!.fraction ?? 0,
                gasPhases: input.gasPhases,
              }),
            ),
          }
        : {}),
    };
  }

  const docs = rawDocuments(texts);
  let entries: Entry[];
  let source = provenance.source ?? "Materials Project";
  let fetchedAt = provenance.fetchedAt ?? null;
  let energyBasis: string;
  let warnings: string[] = [];
  let thermoType = selectedThermo ?? "GGA_GGA+U_R2SCAN";
  if (docs) {
    const selected = docs.filter((doc) => doc.thermo_type === thermoType);
    if (!selected.length) throw new Error(`No entries with thermo type ${thermoType}.`);
    const parsed = parseEntryFiles([
      { name: "MP thermo documents", text: JSON.stringify({ data: selected }) },
    ]);
    entries = parsed.set.entries;
    energyBasis =
      parsed.set.energyBasis === "formation" ? "formation (aligned to MP hull)" : "total";
    warnings = parsed.warnings;
  } else {
    const parsed = parseEntryFiles(texts.map((text, i) => ({ name: `input-${i + 1}`, text })));
    if (selectedThermo && parsed.set.thermoType !== selectedThermo)
      throw new Error(`Loaded thermo type does not match ${selectedThermo}.`);
    entries = parsed.set.entries;
    source = provenance.source ?? parsed.set.source;
    fetchedAt = provenance.fetchedAt ?? parsed.set.fetchedAt ?? null;
    thermoType = parsed.set.thermoType ?? thermoType;
    energyBasis = parsed.set.energyBasis ?? "total";
    warnings = parsed.warnings;
  }
  const ends = (input.ends ?? ["Li2S", "P2S5", "LiCl"]).map((formula) =>
    makeEndMember(formula, parseFormula(formula)),
  );
  const elements = [...new Set(ends.flatMap((end) => Object.keys(end.composition)))].sort();
  const hull = buildHull(entries, elements, (input.stableMeV ?? 0) / 1000);
  const section = computeSection(hull, ends);
  const phases = hull.phases.map((phase) => ({
    id: phase.entry.id,
    name: phase.entry.name,
    composition: phase.entry.composition,
    formationPerAtom: phase.formationPerAtom,
  }));
  const metadata = {
    command: input.command,
    source: input.sample ? "Bundled Materials Project Cl-Li-P-S sample (2026-09-28)" : source,
    fetchedAt,
    energyBasis,
    warnings,
    thermoType: thermoType as ThermoType,
    stableMeV: input.stableMeV ?? 0,
    units: {
      energy: "eV/atom",
      inputCoordinates: input.basis ?? "mol",
      coordinates: "atom",
      w: "atomic fraction",
      mol: "mole fraction",
      t: "atomic mixing fraction",
      x: "mole mixing fraction",
    },
    stabilityModel: input.stableMeV
      ? "metastable phases promoted just below the hull"
      : "original hull",
    elements,
    endMembers: ends,
    phases,
  };
  if (input.command === "decompose") {
    return {
      ...metadata,
      result: analyzePoint(
        hull,
        section,
        endMemberEnergies(hull, section),
        coordinates(input.point!, input.basis, ends),
      ),
    };
  }
  if (input.command === "reaction-line") {
    const start = describeEndpoint(hull, section, coordinates(input.start!, input.basis, ends));
    const end = describeEndpoint(hull, section, coordinates(input.end!, input.basis, ends));
    if (start.w.every((item, i) => Math.abs(item - end.w[i]) < 1e-9))
      throw new Error("Reaction-line endpoints must differ.");
    return { ...metadata, result: reactionLine(hull, section, start, end) };
  }
  return { ...metadata, result: section };
}
