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
          <a
            className="github-link"
            href="https://github.com/assb-lab/materials-thermodynamics-lab"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("shell.github")}
            title={t("shell.github")}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
              <path d="M12 .75a11.25 11.25 0 0 0-3.557 21.923c.563.104.77-.244.77-.542 0-.267-.01-.975-.015-1.914-3.13.68-3.791-1.508-3.791-1.508-.512-1.3-1.25-1.646-1.25-1.646-1.022-.7.077-.686.077-.686 1.13.08 1.724 1.16 1.724 1.16 1.005 1.723 2.637 1.225 3.28.937.102-.728.393-1.225.715-1.507-2.499-.284-5.126-1.25-5.126-5.565 0-1.23.439-2.234 1.16-3.022-.117-.285-.503-1.43.11-2.98 0 0 .946-.303 3.095 1.154A10.79 10.79 0 0 1 12 6.175c.956.004 1.919.13 2.817.379 2.148-1.457 3.092-1.154 3.092-1.154.615 1.55.229 2.695.113 2.98.722.788 1.158 1.792 1.158 3.022 0 4.327-2.631 5.278-5.138 5.557.404.348.766 1.034.766 2.084 0 1.505-.014 2.719-.014 3.088 0 .3.203.65.774.54A11.252 11.252 0 0 0 12 .75Z" />
            </svg>
          </a>
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
