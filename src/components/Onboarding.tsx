import { Link } from "@tanstack/react-router";
import type { Lang } from "../i18n";
import { onboardingMessages } from "./onboardingMessages";
import "./onboarding.css";

interface OnboardingProps {
  lang: Lang;
  open: boolean;
  onClose: () => void;
}

export function Onboarding({ lang, open, onClose }: OnboardingProps) {
  const text = onboardingMessages[lang];

  return (
    <section
      id="lab-onboarding"
      className="card lab-onboarding"
      aria-labelledby="lab-onboarding-title"
      hidden={!open}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="row lab-onboarding-heading">
        <h2 id="lab-onboarding-title">{text.title}</h2>
        <button type="button" onClick={onClose} aria-label={text.close}>
          ×
        </button>
      </div>
      <p className="lab-onboarding-intro">{text.intro}</p>
      <div className="lab-onboarding-cards">
        <div>
          <h3>{text.dataTitle}</h3>
          <p>{text.dataBody}</p>
          <p className="hint">{text.dataNote}</p>
        </div>
        <div>
          <h3>{text.phaseTitle}</h3>
          <p>{text.phaseBody}</p>
          <p className="hint">{text.phaseNote}</p>
          <Link to="/" className="lab-onboarding-action" onClick={onClose}>
            {text.phaseOpen}
          </Link>
        </div>
        <div>
          <h3>{text.voltageTitle}</h3>
          <p>{text.voltageBody}</p>
          <p className="hint">{text.voltageNote}</p>
          <Link to="/reaction-voltage" className="lab-onboarding-action" onClick={onClose}>
            {text.voltageOpen}
          </Link>
        </div>
      </div>
    </section>
  );
}
