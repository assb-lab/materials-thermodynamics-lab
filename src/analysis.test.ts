import { describe, expect, it } from "vite-plus/test";
import { parseAnalysisInput, runAnalysis } from "./analysis";
import type { PointAnalysis } from "./core/reaction";
import type { ReactionLine } from "./core/reactionLine";
import type { Section } from "./core/pseudoTernary";
import type { FilmResult } from "./voltage/core/film";
import { parseEntryFiles, serializeEntrySet } from "./voltage/data/io";
import sample from "./sample/Cl-Li-P-S_GGA_GGA+U_R2SCAN.json";

const sampleInput = { sample: true };

describe("shared CLI and WebMCP analysis", () => {
  it("returns a covered ternary section with the sample's provenance and phase lookup", async () => {
    const report = (await runAnalysis({ ...sampleInput, command: "section" })) as {
      result: Section;
      phases: { id: string; name: string }[];
    };
    expect(report).toMatchObject({
      command: "section",
      source: expect.stringContaining("Materials Project"),
      thermoType: "GGA_GGA+U_R2SCAN",
      elements: ["Cl", "Li", "P", "S"],
      units: { energy: "eV/atom", coordinates: "atom" },
    });
    expect(report.result.coverage).toBeCloseTo(1, 7);
    expect(report.result.regions.length).toBeGreaterThan(1);
    expect(report.result.endMembers.map((end) => end.label)).toEqual(["Li2S", "P2S5", "LiCl"]);
    for (const region of report.result.regions) {
      for (const index of region.phases) expect(report.phases[index].id).toMatch(/^mp-\d+$/);
    }
  });

  it("normalizes input ratios and converts mole coordinates before decomposing", async () => {
    // 3 Li2S + 1 P2S5 has the composition of 2 Li3PS4.
    const mole = (await runAnalysis({
      ...sampleInput,
      command: "decompose",
      point: [3, 1, 0],
    })) as { result: PointAnalysis; phases: { name: string }[] };
    expect(mole.result.mol).toEqual([
      expect.closeTo(0.75, 10),
      expect.closeTo(0.25, 10),
      expect.closeTo(0, 10),
    ]);
    expect(mole.result.w).toEqual([
      expect.closeTo(9 / 16, 10),
      expect.closeTo(7 / 16, 10),
      expect.closeTo(0, 10),
    ]);
    expect(mole.result.products).toHaveLength(1);
    expect(mole.phases[mole.result.products[0].phase].name).toBe("Li3PS4");
    expect(mole.result.products[0].moles).toBeCloseTo(0.5, 9);

    const atom = (await runAnalysis({
      ...sampleInput,
      command: "decompose",
      basis: "atom",
      point: [9, 7, 0],
    })) as { result: PointAnalysis };
    expect(atom.result).toEqual(mole.result);

    const differentBasis = (await runAnalysis({
      ...sampleInput,
      command: "decompose",
      basis: "atom",
      point: [3, 1, 0],
    })) as { result: PointAnalysis };
    expect(differentBasis.result.mol[0]).toBeCloseTo(0.875, 9);
    expect(differentBasis.result.mol[1]).toBeCloseTo(0.125, 9);
  });

  it("finds the Li3PS4 reaction-line minimum and rejects coincident normalized endpoints", async () => {
    const report = (await runAnalysis({
      ...sampleInput,
      command: "reaction-line",
      start: [5, 0, 0],
      end: [0, 2, 0],
    })) as { result: ReactionLine; phases: { name: string }[] };
    const minimum = report.result.kinks[report.result.minIndex];
    expect(minimum.x).toBeCloseTo(0.25, 9);
    expect(minimum.energy).toBeLessThan(0);
    expect(minimum.products.map((product) => report.phases[product.phase].name)).toEqual([
      "Li3PS4",
    ]);
    expect(report.result.kinks[0].energy).toBeCloseTo(0, 9);
    expect(report.result.kinks.at(-1)!.energy).toBeCloseTo(0, 9);
    await expect(
      runAnalysis({
        ...sampleInput,
        command: "reaction-line",
        start: [1, 2, 3],
        end: [2, 4, 6],
      }),
    ).rejects.toThrow(/endpoints must differ/i);
  });

  it("preserves the real sample's reduction chemistry, volume reference, and film fraction", async () => {
    const report = (await runAnalysis({
      ...sampleInput,
      command: "profile",
      formula: "Li6PS5Cl",
      volume: true,
      film: { diameterUm: 2, fraction: 0.25 },
    })) as {
      result: {
        stabilized: boolean;
        eAboveHull: number;
        regions: {
          x: number;
          reaction: string;
          volume: {
            status: string;
            initial_volume_change_percent: number;
          };
        }[];
      };
      film: FilmResult[];
    };
    expect(report).toMatchObject({
      thermoType: "GGA_GGA+U_R2SCAN",
      energyBasis: "formation",
      warnings: [],
      result: { formula: "Li6PS5Cl", ion: "Li", stabilized: true },
    });
    expect(report.result.eAboveHull).toBeCloseTo(0.0829463, 6);
    const last = report.result.regions.at(-1)!;
    expect(last.x).toBeCloseTo(8, 9);
    expect(last.reaction).toBe("Li6PS5Cl + 8 Li → 5 Li2S + Li3P + LiCl");
    expect(last.volume.status).toBe("volume");
    const film = report.film.at(-1)!;
    expect(film.kind).toBe("film");
    if (film.kind !== "film") throw new Error(film.kind);
    expect(film.fraction).toBe(0.25);
    expect(film.thicknessNm).toBeGreaterThan(0);
    expect(film.particleVolumeChange).toBeCloseTo(
      (0.25 * last.volume.initial_volume_change_percent) / 100,
      10,
    );

    const noCharge = (await runAnalysis({
      ...sampleInput,
      command: "profile",
      formula: "Li6PS5Cl",
      film: { diameterUm: 2, chargeMAhG: 0 },
    })) as { film: FilmResult[] };
    expect(noCharge.film.at(-1)).toMatchObject({
      kind: "film",
      fraction: 0,
      thicknessNm: expect.closeTo(0, 9),
      fromCharge: true,
    });
  });

  it("runs all phase commands from serialized voltage entries while retaining their provenance", async () => {
    const { set } = parseEntryFiles([{ name: "sample.json", text: JSON.stringify(sample) }]);
    const serialized = serializeEntrySet({
      ...set,
      source: "Shared voltage dataset",
      fetchedAt: "2026-09-28T12:34:56Z",
    });
    const section = (await runAnalysis({ command: "section", data: [serialized] })) as {
      result: Section;
    };
    expect(section).toMatchObject({
      source: "Shared voltage dataset",
      energyBasis: "formation",
      fetchedAt: "2026-09-28T12:34:56Z",
    });
    expect(section.result.coverage).toBeCloseTo(1, 7);
    const point = (await runAnalysis({
      command: "decompose",
      data: [serialized],
      point: [3, 1, 0],
    })) as { result: PointAnalysis; phases: { name: string }[] };
    expect(point).toMatchObject({
      source: "Shared voltage dataset",
      energyBasis: "formation",
      fetchedAt: "2026-09-28T12:34:56Z",
    });
    expect(point.result.products).toHaveLength(1);
    expect(point.phases[point.result.products[0].phase].name).toBe("Li3PS4");
    expect(point.result.products[0].moles).toBeCloseTo(0.5, 9);

    const line = (await runAnalysis({
      command: "reaction-line",
      data: [serialized],
      start: [1, 0, 0],
      end: [0, 1, 0],
    })) as { result: ReactionLine; phases: { name: string }[] };
    const raw = (await runAnalysis({
      command: "reaction-line",
      sample: true,
      start: [1, 0, 0],
      end: [0, 1, 0],
    })) as { result: ReactionLine };
    expect(line).toMatchObject({
      source: "Shared voltage dataset",
      energyBasis: "formation",
      fetchedAt: "2026-09-28T12:34:56Z",
    });
    const minimum = line.result.kinks[line.result.minIndex];
    expect(minimum.x).toBeCloseTo(0.25, 9);
    expect(minimum.energy).toBeCloseTo(raw.result.kinks[raw.result.minIndex].energy, 9);
    expect(minimum.products.map((product) => line.phases[product.phase].name)).toEqual(["Li3PS4"]);
  });

  it("selects an explicitly requested thermo type from raw files containing multiple types", async () => {
    const otherThermo = JSON.stringify({
      ...sample,
      data: sample.data.map((doc) => ({ ...doc, thermo_type: "R2SCAN" })),
    });
    const report = await runAnalysis({
      command: "profile",
      data: [JSON.stringify(sample), otherThermo],
      thermoType: "R2SCAN",
      formula: "Li6PS5Cl",
    });
    expect(report).toMatchObject({
      thermoType: "R2SCAN",
      energyBasis: "formation",
      result: { formula: "Li6PS5Cl", ion: "Li" },
    });
  });

  it("distinguishes input ratio coordinates from the returned atomic and mole fields", async () => {
    for (const basis of ["mol", "atom"] as const) {
      const report = await runAnalysis({
        command: "decompose",
        sample: true,
        basis,
        point: [3, 1, 0],
      });
      expect(report).toMatchObject({
        units: {
          inputCoordinates: basis,
          coordinates: "atom",
          w: "atomic fraction",
          mol: "mole fraction",
        },
      });
    }
    const line = await runAnalysis({
      command: "reaction-line",
      sample: true,
      basis: "mol",
      start: [1, 0, 0],
      end: [0, 1, 0],
    });
    expect(line).toMatchObject({
      units: {
        inputCoordinates: "mol",
        coordinates: "atom",
        w: "atomic fraction",
        mol: "mole fraction",
        t: "atomic mixing fraction",
        x: "mole mixing fraction",
      },
    });
  });

  it.each([{ basis: "mol" }, { point: [1, 0, 0] }, { start: [1, 0, 0] }, { end: [0, 1, 0] }])(
    "rejects point and line inputs on whole sections %#",
    (option) => {
      expect(() => parseAnalysisInput({ command: "section", ...option })).toThrow();
    },
  );

  it.each([
    { ends: ["Li2S", "P2S5", "LiCl"] },
    { point: [1, 0, 0] },
    { basis: "mol" },
    { stableMeV: 0 },
    { start: [1, 0, 0] },
    { end: [0, 1, 0] },
  ])("rejects phase-only options on profiles %#", (option) => {
    expect(() =>
      parseAnalysisInput({ command: "profile", formula: "Li6PS5Cl", ...option }),
    ).toThrow();
  });

  for (const command of ["section", "decompose", "reaction-line"]) {
    it.each([
      { ion: "Li" },
      { exclude: ["Li2S"] },
      { volume: false },
      { film: { diameterUm: 1, fraction: 0.25 } },
      { gasPhases: ["S"] },
      { formula: "Li6PS5Cl" },
      { stabilize: false },
      { deltaMeV: 0 },
    ])(`rejects profile-only options on ${command} %#`, (option) => {
      const phaseInput =
        command === "decompose"
          ? { point: [1, 0, 0] }
          : command === "reaction-line"
            ? { start: [1, 0, 0], end: [0, 1, 0] }
            : {};
      expect(() => parseAnalysisInput({ command, ...phaseInput, ...option })).toThrow();
    });
  }

  it("exports usable profile CSV/SVG and rejects unsupported section export formats", async () => {
    const input = { ...sampleInput, command: "profile", formula: "Li6PS5Cl", volume: true };
    const csv = await runAnalysis(input, "csv");
    expect(csv).toContain("initial_volume_change_percent");
    expect(csv).toContain("Li6PS5Cl + 8 Li");
    const svg = await runAnalysis(input, "svg");
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).not.toContain("NaN");
    await expect(runAnalysis({ ...sampleInput, command: "section" }, "csv")).rejects.toThrow(
      /require profile/i,
    );
  });

  it("rejects incomplete files, mixed thermo types, and a requested thermo type absent from data", async () => {
    const incomplete = JSON.stringify({ ...sample, meta: { total_doc: sample.data.length + 10 } });
    await expect(runAnalysis({ command: "section", data: [incomplete] })).rejects.toThrow();
    const otherThermo = JSON.stringify({
      ...sample,
      data: sample.data.map((doc) => ({ ...doc, thermo_type: "R2SCAN" })),
    });
    await expect(
      runAnalysis({
        command: "profile",
        formula: "Li6PS5Cl",
        data: [JSON.stringify(sample), otherThermo],
      }),
    ).rejects.toThrow(/thermo/i);
    await expect(
      runAnalysis({
        ...sampleInput,
        command: "profile",
        formula: "Li6PS5Cl",
        thermoType: "R2SCAN",
      }),
    ).rejects.toThrow(/No entries|does not match/);
    await expect(
      runAnalysis({ ...sampleInput, command: "section", thermoType: "R2SCAN" }),
    ).rejects.toThrow(/No entries/);
  });

  it.each([
    null,
    {},
    { command: "unknown" },
    { command: "section", extra: true },
    { command: "section", data: [] },
    { command: "section", ends: ["Li2S", "P2S5"] },
    { command: "profile" },
    { command: "decompose" },
    { command: "reaction-line", start: [1, 0, 0] },
    { command: "decompose", point: [-1, 1, 1] },
    { command: "decompose", point: [1, 2] },
    { command: "decompose", point: [Infinity, 0, 0] },
    { command: "profile", formula: "Li6PS5Cl", film: { diameterUm: 0, fraction: 0.5 } },
    { command: "profile", formula: "Li6PS5Cl", film: { diameterUm: 1, fraction: 2 } },
    { command: "profile", formula: "Li6PS5Cl", film: { diameterUm: 1, chargeMAhG: -1 } },
    { command: "profile", formula: "Li6PS5Cl", film: { diameterUm: 1 } },
    {
      command: "profile",
      formula: "Li6PS5Cl",
      film: { diameterUm: 1, fraction: 0.1, chargeMAhG: 10 },
    },
    {
      command: "profile",
      formula: "Li6PS5Cl",
      film: { diameterUm: 1, fraction: 0.1, extra: true },
    },
    { command: "section", sample: true, data: ["{}"] },
  ])("rejects malformed or ambiguous requests %#", (input) => {
    expect(() => parseAnalysisInput(input)).toThrow();
  });

  it("rejects missing datasets and zero coordinate sums before producing a result", async () => {
    await expect(runAnalysis({ command: "section" })).rejects.toThrow(/Provide data/);
    await expect(
      runAnalysis({ ...sampleInput, command: "decompose", point: [0, 0, 0] }),
    ).rejects.toThrow(/positive finite sum/);
  });
});
