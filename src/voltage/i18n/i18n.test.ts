import { afterEach, describe, expect, it } from "vite-plus/test";
import { en } from "./en";
import { ja, type MessageKey } from "./ja";
import { ko } from "./ko";
import { zhCN } from "./zh-CN";
import html from "../template.html?raw";
import { getLang, setLang, t } from ".";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("i18n", () => {
  afterEach(() => setLang("ja"));

  it("has the same keys and placeholders in every language", () => {
    for (const dictionary of [en, zhCN, ko]) {
      expect(Object.keys(dictionary).sort()).toEqual(Object.keys(ja).sort());
      for (const key of Object.keys(ja) as MessageKey[]) {
        expect(placeholders(dictionary[key]), key).toEqual(placeholders(ja[key]));
        expect(dictionary[key].trim(), key).not.toBe("");
      }
    }
  });

  it("has every key used by data-i18n attributes in the voltage template", () => {
    const keys = new Set<string>();
    for (const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) keys.add(m[1]);
    for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g))
      for (const pair of m[1].split(";")) keys.add(pair.split(":")[1].trim());
    expect(keys.size).toBeGreaterThan(50);
    expect([...keys].filter((k) => !(k in ja))).toEqual([]);
  });

  it("fills placeholders for the current language", () => {
    expect(getLang()).toBe("ja");
    expect(t("summary.noneAt", { v: "1.500" })).toBe("なし (1.500 V で分解)");
    setLang("en");
    expect(t("summary.noneAt", { v: "1.500" })).toBe("None (decomposes at 1.500 V)");
    expect(t("io.missingPages", { total: 4, docs: 2, pages: 1 })).toMatch(/Only 2 of 4/);
    setLang("zh-CN");
    expect(t("summary.noneAt", { v: "1.500" })).toBe("无（在 1.500 V 分解）");
    setLang("ko");
    expect(t("summary.noneAt", { v: "1.500" })).toBe("없음 (1.500 V에서 분해)");
  });
});
