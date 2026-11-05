import { useEffect, useRef, useState } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { LANGS, LANG_LABELS, setLang, t, useLang, type Lang } from "./i18n";
import { Onboarding } from "./components/Onboarding";
import { onboardingMessages } from "./components/onboardingMessages";
import { load, save } from "./storage";
import { THEMES, useTheme } from "./theme";

export function AppShell() {
  const lang = useLang();
  const [theme, setTheme] = useTheme();
  const [guideOpen, setGuideOpen] = useState(() => load("mtl.onboarded") !== "1");
  const guideButton = useRef<HTMLButtonElement>(null);

  const closeGuide = () => {
    setGuideOpen(false);
    save("mtl.onboarded", "1");
    guideButton.current?.focus({ preventScroll: true });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Materials Thermodynamics Lab</h1>
        <div className="header-controls">
          <button
            type="button"
            ref={guideButton}
            aria-controls="lab-onboarding"
            aria-expanded={guideOpen}
            onClick={() => {
              if (guideOpen) closeGuide();
              else setGuideOpen(true);
            }}
          >
            {onboardingMessages[lang].toggle}
          </button>
          <select
            aria-label={t("settings.language")}
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {LANG_LABELS[l]}
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
          aria-label={t("shell.tools")}
        >
          <Link to="/" activeOptions={{ exact: true }}>
            {t("app.title")}
          </Link>
          <Link to="/reaction-voltage">{t("shell.voltage")}</Link>
        </nav>
      </header>
      <main className="tool-content">
        <Onboarding lang={lang} open={guideOpen} onClose={closeGuide} />
        <Outlet />
      </main>
    </div>
  );
}

export function NotFound() {
  useLang();
  useEffect(() => {
    document.title = "Materials Thermodynamics Lab";
  }, []);

  return (
    <div className="card">
      <p>{t("shell.notFound")}</p>
      <Link to="/">{t("app.title")}</Link>
    </div>
  );
}
