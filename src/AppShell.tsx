import { useEffect } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { LANGS, setLang, t, useLang, type Lang } from "./i18n";
import { THEMES, useTheme } from "./theme";

export function AppShell() {
  const lang = useLang();
  const [theme, setTheme] = useTheme();

  return (
    <div className="app">
      <header className="header">
        <h1>Materials Thermodynamics Lab</h1>
        <div className="header-controls">
          <select
            aria-label={t("settings.language")}
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {l === "ja" ? "日本語" : "English"}
              </option>
            ))}
          </select>
          <div className="segmented" role="group" aria-label={t("settings.theme")}>
            {THEMES.map((mode) => (
              <button key={mode} aria-pressed={theme === mode} onClick={() => setTheme(mode)}>
                {t(`theme.${mode}`)}
              </button>
            ))}
          </div>
        </div>
        <nav
          className="tool-nav flex w-full flex-wrap items-center gap-1"
          aria-label={lang === "ja" ? "計算ツール" : "Calculation tools"}
        >
          <Link to="/" activeOptions={{ exact: true }}>
            {t("app.title")}
          </Link>
          <Link to="/reaction-voltage">
            {lang === "ja" ? "反応電位計算" : "Reaction voltage calculator"}
          </Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export function NotFound() {
  const lang = useLang();
  useEffect(() => {
    document.title = "Materials Thermodynamics Lab";
  }, []);

  return (
    <div className="card">
      <p>{lang === "ja" ? "ページが見つかりません。" : "Page not found."}</p>
      <Link to="/">{t("app.title")}</Link>
    </div>
  );
}
