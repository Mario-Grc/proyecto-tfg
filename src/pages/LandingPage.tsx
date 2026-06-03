import { useState } from "react";
import LanguageToggle from "../components/LanguageToggle";
import { useTranslation } from "../i18n/LanguageContext";
import duckNormal from "../assets/pato/pato-normal.webp";

interface LandingPageProps {
    onStart: () => void;
    canContinue: boolean;
    onContinue: () => void;
}

export default function LandingPage({ onStart, canContinue, onContinue }: LandingPageProps) {
    const { translate } = useTranslation();
    const [duckPressed, setDuckPressed] = useState(false);

    function handleDuckClick() {
        setDuckPressed(true);
        window.setTimeout(() => setDuckPressed(false), 240);
    }

    return (
        <div className="landing-screen">
            <div className="page-corner-actions">
                <LanguageToggle />
            </div>
            <main className="landing-container">
                <div className="landing-layout">
                    <header className="landing-hero">
                        <h1 className="landing-title">
                            <span>Quack</span>
                            <span className="landing-title-accent">Code</span>
                        </h1>
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

                    <div className="landing-divider-vertical" aria-hidden="true"></div>

                    <section className="landing-steps">
                        <h2 className="landing-steps-overline">{translate("landing.howItWorks")}</h2>

                        <article className="landing-step">
                            <span className="step-number">01</span>
                            <div className="landing-step-body">
                                <h3>{translate("landing.step1.title")}</h3>
                                <p>{translate("landing.step1.desc")}</p>
                            </div>
                        </article>

                        <article className="landing-step">
                            <span className="step-number">02</span>
                            <div className="landing-step-body">
                                <h3>{translate("landing.step2.title")}</h3>
                                <p>{translate("landing.step2.desc")}</p>
                            </div>
                        </article>

                        <article className="landing-step">
                            <span className="step-number">03</span>
                            <div className="landing-step-body">
                                <h3>{translate("landing.step3.title")}</h3>
                                <p>{translate("landing.step3.desc")}</p>
                            </div>
                        </article>
                    </section>
                </div>
            </main>
            <img
                className={`landing-duck-corner${duckPressed ? " is-pressed" : ""}`}
                src={duckNormal}
                alt=""
                aria-hidden="true"
                draggable={false}
                onClick={handleDuckClick}
            />
        </div>
    );
}
