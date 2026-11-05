import { useEffect, useRef } from "react";
import { getLang, useLang } from "../i18n";
import { t } from "./i18n";
import { mountVoltage } from "./mount";
import "./voltage.css";

export default function VoltagePage() {
  const root = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof mountVoltage> | null>(null);
  const lang = useLang();

  useEffect(() => {
    const mounted = mountVoltage(root.current!, getLang());
    controller.current = mounted;
    return () => {
      mounted.destroy();
      controller.current = null;
    };
  }, []);

  useEffect(() => {
    controller.current?.applyLanguage(lang);
    document.title = `${t("header.title")} · Materials Thermodynamics Lab`;
  }, [lang]);

  return <div className="voltage stack" ref={root} />;
}
