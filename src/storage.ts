// localStorage can be unavailable (private windows, blocked site data): never let it break the app.

export function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function save(key: string, value: string | null): boolean {
  try {
    if (value === null || value === "") localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export const KEYS = {
  apiKey: "ptpd.mpApiKey",
  ends: "ptpd.endMembers",
  thermoType: "ptpd.thermoType",
  lang: "ptpd.lang",
  theme: "ptpd.theme",
} as const;

interface ApiKeySettings {
  key: string;
  remember: boolean;
}

const LEGACY_API_KEY = "rvc.mpApiKey";
let sessionApiKey: ApiKeySettings | undefined;

export function getApiKeySettings(): ApiKeySettings {
  if (!sessionApiKey) {
    const key = load(KEYS.apiKey) ?? load(LEGACY_API_KEY) ?? "";
    sessionApiKey = { key, remember: Boolean(key) };
  }
  return sessionApiKey;
}

export function setApiKeySettings(settings: ApiKeySettings): void {
  sessionApiKey = settings;
  const stored = settings.remember ? settings.key.trim() || null : null;
  if (save(KEYS.apiKey, stored)) save(LEGACY_API_KEY, null);
}
