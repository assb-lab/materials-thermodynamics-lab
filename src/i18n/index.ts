import { useSyncExternalStore } from "react";
import { zhCN } from "./zh-CN";
import { ko } from "./ko";
import { en } from "./en";
import { ja, type MessageKey } from "./ja";
import { KEYS, load, save } from "../storage";

export const LANGS = ["ja", "en", "zh-CN", "ko"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_LABELS: Record<Lang, string> = {
  ja: "日本語",
  en: "English",
  "zh-CN": "简体中文",
  ko: "한국어",
};

export function detectLang(language: string): Lang {
  const prefix = language.toLowerCase().split(/[-_.]/)[0];
  return prefix === "zh" ? "zh-CN" : prefix === "ja" || prefix === "ko" ? prefix : "en";
}
export type { MessageKey };

/** Param values may be thunks so that nested messages are translated when rendered, not when built. */
export type Params = Record<string, string | number | (() => string)>;

const dicts: Record<Lang, Record<MessageKey, string>> = { ja, en, "zh-CN": zhCN, ko };

function initialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const saved = load(KEYS.lang) ?? load("rvc.lang");
  if (LANGS.includes(saved as Lang)) return saved as Lang;
  return detectLang(typeof navigator === "undefined" ? "en" : navigator.language);
}

let current: Lang = initialLang();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  if (typeof document !== "undefined") {
    save(KEYS.lang, lang);
    document.documentElement.lang = lang;
  }
  listeners.forEach((l) => l());
}

/** Message in the current language with `{name}` placeholders filled. */
export function t(key: MessageKey, params: Params = {}): string {
  return dicts[current][key].replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    if (v === undefined) return m;
    return typeof v === "function" ? v() : String(v);
  });
}

/** Re-render on language change; returns the current language. */
export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getLang,
    getLang,
  );
}

/** Error whose message follows the current language each time it is read. */
export class I18nError extends Error {
  readonly key: MessageKey;
  readonly params: Params;
  constructor(key: MessageKey, params: Params = {}) {
    super();
    this.key = key;
    this.params = params;
    Object.defineProperty(this, "message", { get: () => t(key, params) });
  }
}
