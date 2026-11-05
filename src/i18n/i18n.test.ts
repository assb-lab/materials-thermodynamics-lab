import { afterEach, describe, expect, it } from "vite-plus/test";
import { en } from "./en";
import { ja } from "./ja";
import { ko } from "./ko";
import { zhCN } from "./zh-CN";
import { detectLang, setLang, t } from "./index";

afterEach(() => setLang("en"));

describe("shared language support", () => {
  it("keeps all message keys and interpolation parameters across four locales", () => {
    const placeholders = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const dictionary of [en, ko, zhCN]) {
      expect(Object.keys(dictionary).sort()).toEqual(Object.keys(ja).sort());
      for (const key of Object.keys(ja) as (keyof typeof ja)[]) {
        expect(dictionary[key].trim()).not.toBe("");
        expect(placeholders(dictionary[key]), key).toEqual(placeholders(ja[key]));
      }
    }
  });

  it("detects browser and CLI locale forms and translates parameterized messages", () => {
    expect(detectLang("zh-TW")).toBe("zh-CN");
    expect(detectLang("ko-KR")).toBe("ko");
    expect(detectLang("ja_JP.UTF-8")).toBe("ja");
    expect(detectLang("fr-FR")).toBe("en");
    setLang("zh-CN");
    expect(t("regions.title", { n: 3 })).toBe("相区 (3)");
    setLang("ko");
    expect(t("regions.title", { n: 3 })).toBe("상 영역 (3)");
  });
});
