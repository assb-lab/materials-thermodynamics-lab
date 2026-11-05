import { en } from "./en";
import { ja, type MessageKey } from "./ja";
import { ko } from "./ko";
import { zhCN } from "./zh-CN";

export type { MessageKey };
export type { Lang } from "../../i18n";
import type { Lang } from "../../i18n";

const dictionaries: Record<Lang, Record<MessageKey, string>> = { ja, en, "zh-CN": zhCN, ko };
let current: Lang = "ja";

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
}

/**
 * Message for the current language with `{name}` placeholders filled in. Parameters are inserted
 * verbatim: escape them first when the message is used as HTML.
 */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  return dictionaries[current][key].replace(/\{(\w+)\}/g, (m, name: string) =>
    name in params ? String(params[name]) : m,
  );
}

/**
 * Translate static markup:
 * - `data-i18n="key"` sets textContent
 * - `data-i18n-html="key"` sets innerHTML (dictionary text is trusted markup)
 * - `data-i18n-attr="attr:key;attr:key"` sets attributes
 */
export function translateDom(root: ParentNode): void {
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n]"))
    el.textContent = t(el.dataset.i18n as MessageKey);
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n-html]"))
    el.innerHTML = t(el.dataset.i18nHtml as MessageKey);
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n-attr]")) {
    for (const pair of el.dataset.i18nAttr!.split(";")) {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key as MessageKey));
    }
  }
}
