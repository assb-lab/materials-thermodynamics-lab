import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { runAnalysis } from "./analysis";
import { detectLang, LANGS, setLang, type Lang } from "./i18n";
import { setLang as setVoltageLang } from "./voltage/i18n";

const help = `Materials Thermodynamics Lab

pnpm cli <section|decompose|reaction-line|profile> [options]

  --input <file>           JSON input, repeat for MP pages; "-" reads stdin
  --sample                 Bundled real MP Cl-Li-P-S data
  --ends <A,B,C>            Section end members (default Li2S,P2S5,LiCl)
  --point <A,B,C>           Decomposition coordinates
  --start <A,B,C> --end <A,B,C>   Reaction-line endpoints
  --basis <mol|atom>        Coordinate basis (default mol); ratios normalized
  --formula <formula>      Target for profile
  --ion <element>          Working ion (default Li)
  --thermo-type <type>     MP thermo type
  --original-energies      Disable target stabilization (enabled by default)
  --delta-mev <number>     Additional target stabilization in meV/atom
  --stable-mev <number>    Phase-section stability threshold in meV/atom
  --exclude <list>         Comma-separated phase formulas or material IDs
  --volume                 Include solid volume expansion
  --gas-phases <list>      Extra phases released as gas
  --diameter-um <number>   Film model particle diameter
  --fraction <0..1>        Decomposed volume fraction
  --charge-mahg <number>   Reacted charge, alternative to fraction
  --format <json|csv|svg>  CSV/SVG available for profile
  --output <file>          Write output to file (default stdout)
  --lang <ja|en|zh-CN|ko>  Localized messages and SVG labels
  --help                  Show help
`;

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      input: { type: "string", multiple: true },
      sample: { type: "boolean" },
      ends: { type: "string" },
      point: { type: "string" },
      start: { type: "string" },
      end: { type: "string" },
      basis: { type: "string" },
      formula: { type: "string" },
      ion: { type: "string" },
      "thermo-type": { type: "string" },
      "original-energies": { type: "boolean" },
      "delta-mev": { type: "string" },
      "stable-mev": { type: "string" },
      exclude: { type: "string" },
      volume: { type: "boolean" },
      "gas-phases": { type: "string" },
      "diameter-um": { type: "string" },
      fraction: { type: "string" },
      "charge-mahg": { type: "string" },
      format: { type: "string", default: "json" },
      output: { type: "string" },
      lang: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    process.stdout.write(help);
    return;
  }
  if (positionals.length !== 1) throw new Error("Choose one command. Use --help for usage.");
  const lang = values.lang ?? detectLang(process.env.LANG ?? "en");
  if (!LANGS.includes(lang as Lang)) throw new Error("Unsupported language.");
  setLang(lang as Lang);
  setVoltageLang(lang as Lang);
  const format = values.format;
  if (format !== "json" && format !== "csv" && format !== "svg")
    throw new Error("Unsupported output format.");
  const numeric = (value: string | undefined) => (value === undefined ? undefined : Number(value));
  const list = (value: string | undefined) => value?.split(",").map((item) => item.trim());
  const coords = (value: string | undefined) => list(value)?.map(Number);
  const readStdin = async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString("utf8");
  };
  const stdin = values.input?.includes("-") ? readStdin() : undefined;
  const data = values.input
    ? await Promise.all(
        values.input.map((file) => (file === "-" ? stdin! : readFile(file, "utf8"))),
      )
    : undefined;
  if (
    !values["diameter-um"] &&
    (values.fraction !== undefined || values["charge-mahg"] !== undefined)
  ) {
    throw new Error("Film fraction or charge requires --diameter-um.");
  }
  if (values["original-energies"] !== undefined && positionals[0] !== "profile") {
    throw new Error("--original-energies applies only to profile.");
  }
  const output = await runAnalysis(
    {
      command: positionals[0],
      data,
      sample: values.sample,
      ends: list(values.ends),
      point: coords(values.point),
      start: coords(values.start),
      end: coords(values.end),
      basis: values.basis,
      formula: values.formula,
      ion: values.ion,
      thermoType: values["thermo-type"],
      stabilize: positionals[0] === "profile" ? !values["original-energies"] : undefined,
      deltaMeV: numeric(values["delta-mev"]),
      stableMeV: numeric(values["stable-mev"]),
      exclude: list(values.exclude),
      volume: values.volume,
      gasPhases: list(values["gas-phases"]),
      ...(values["diameter-um"] !== undefined
        ? {
            film: {
              diameterUm: numeric(values["diameter-um"]),
              fraction: numeric(values.fraction),
              chargeMAhG: numeric(values["charge-mahg"]),
            },
          }
        : {}),
    },
    format,
  );
  const text = typeof output === "string" ? output : JSON.stringify(output, null, 2) + "\n";
  if (values.output) await writeFile(values.output, text);
  else process.stdout.write(text);
}

main().catch((error: unknown) => {
  process.stderr.write(
    JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) + "\n",
  );
  process.exitCode = 1;
});
