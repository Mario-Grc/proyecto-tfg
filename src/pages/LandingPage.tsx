import LanguageToggle from "../components/LanguageToggle";
import { useTranslation } from "../i18n/LanguageContext";

interface LandingPageProps {
    onStart: () => void;
    canContinue: boolean;
    onContinue: () => void;
}

export default function LandingPage({ onStart, canContinue, onContinue }: LandingPageProps) {
    const { translate } = useTranslation();

    return (
        <div className="landing-screen">
            <div className="page-corner-actions">
                <LanguageToggle />
            </div>
            <main className="landing-container">
                <header className="landing-hero">
                    <h1 className="landing-title">QuackCode</h1>
                    <p className="landing-subtitle">
                        {translate("landing.subtitle")}
                    </p>

                    <div className="landing-actions">
                        <button type="button" className="landing-btn-primary" onClick={onStart}>
                            {translate("landing.start")}
                        </button>
                        {canContinue && (
                            <button type="button" className="landing-btn-secondary" onClick={onContinue}>
                                {translate("landing.continue")}
                            </button>
                        )}
                    </div>
                </header>

                <div className="landing-divider"></div>

                <section className="landing-steps">
                    <article className="landing-step">
                        <div className="step-number">01</div>
                        <h2>{translate("landing.step1.title")}</h2>
                        <p>{translate("landing.step1.desc")}</p>
                    </article>

                    <article className="landing-step">
                        <div className="step-number">02</div>
                        <h2>{translate("landing.step2.title")}</h2>
                        <p>{translate("landing.step2.desc")}</p>
                    </article>

                    <article className="landing-step">
                        <div className="step-number">03</div>
                        <h2>{translate("landing.step3.title")}</h2>
                        <p>{translate("landing.step3.desc")}</p>
                    </article>
                </section>
            </main>
        </div>
    );
}
