import { Link } from "react-router-dom";
import { useI18n } from "../../i18n/index.jsx";

export function LogoMark() {
  return (
    <img
      className="logo-mark"
      src="/ariana-logo.png"
      alt=""
      aria-hidden="true"
    />
  );
}

export default function Logo({ light = false }) {
  const { t } = useI18n();

  return (
    <Link
      to="/"
      className={`logo ${light ? "logo-light" : ""}`.trim()}
      aria-label={`${t("brand.name")} — ${t("nav.home")}`}
    >
      <LogoMark />

      <span className="logo-text">
        <span className="logo-name">{t("brand.name")}</span>
        <span className="logo-tag">{t("brand.tagline")}</span>
      </span>
    </Link>
  );
}
