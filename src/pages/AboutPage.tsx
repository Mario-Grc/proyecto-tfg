import LanguageToggle from "../components/LanguageToggle";
import { useTranslation } from "../i18n/LanguageContext";
import duckNormal from "../assets/pato/pato-normal.webp";
import logoUlpgcEii from "../assets/logos/logo-ulpgc-eii.png";

const YEAR = "2026";

interface AboutPageProps {
    onBack: () => void;
}

export default function AboutPage({ onBack }: AboutPageProps) {
    const { translate } = useTranslation();

    return (
        <div className="about-screen">
            <button type="button" className="about-back" onClick={onBack}>
                {translate("about.back")}
            </button>
            <div className="page-corner-actions">
                <LanguageToggle />
            </div>

            <main className="about-content">
                <img
                    className="about-duck"
                    src={duckNormal}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                />
                <h1 className="about-title">
                    <span>Quack</span>
                    <span className="about-title-accent">Code</span>
                </h1>
                <p className="about-description">{translate("about.description")}</p>

                <p className="about-tfg">{translate("about.tfg")}</p>
                <div className="about-academia">
                    <span>{translate("about.degree")}</span>
                    <span>{translate("about.school")}</span>
                    <span>{translate("about.university")}</span>
                </div>

                <div className="about-people">
                    <div className="about-person">
                        <span className="about-people-label">{translate("about.authorLabel")}</span>
                        <span className="about-author-name">Mario García Abellán</span>
                    </div>
                    <div className="about-person">
                        <span className="about-people-label">{translate("about.tutorLabel")}</span>
                        <span className="about-tutor-name">José Miguel Santana Núñez</span>
                    </div>
                </div>

                <div className="about-logo-band">
                    <img src={logoUlpgcEii} alt={translate("about.logo.alt")} />
                </div>

                <span className="about-year">{YEAR}</span>
            </main>
        </div>
    );
}
