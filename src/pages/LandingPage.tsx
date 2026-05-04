interface LandingPageProps {
    onStart: () => void;
    canContinue: boolean;
    onContinue: () => void;
}

export default function LandingPage({ onStart, canContinue, onContinue }: LandingPageProps) {
    return (
        <div className="landing-screen">
            <main className="landing-container">
                <header className="landing-hero">
                    <h1 className="landing-title">QuackCode</h1>
                    <p className="landing-subtitle">
                        Mejora tu lógica de programación con un tutor integrado. 
                        Lee, piensa, codifica y entiende el <em>porqué</em> de cada solución.
                    </p>
                    
                    <div className="landing-actions">
                        <button type="button" className="landing-btn-primary" onClick={onStart}>
                            Comenzar un reto
                        </button>
                        {canContinue && (
                            <button type="button" className="landing-btn-secondary" onClick={onContinue}>
                                Continuar sesión
                            </button>
                        )}
                    </div>
                </header>

                <div className="landing-divider"></div>

                <section className="landing-steps">
                    <article className="landing-step">
                        <div className="step-number">01</div>
                        <h2>Selecciona un problema</h2>
                        <p>Escoge un reto acorde a tu nivel. La idea es mantener una práctica constante y focalizada.</p>
                    </article>

                    <article className="landing-step">
                        <div className="step-number">02</div>
                        <h2>Piensa y ejecuta</h2>
                        <p>Usa el editor al lado de las instrucciones. Ejecuta y prueba tu código al instante para validar tu lógica.</p>
                    </article>

                    <article className="landing-step">
                        <div className="step-number">03</div>
                        <h2>Apóyate en el tutor</h2>
                        <p>¿Bloqueado? Pide pistas, no respuestas. El modelo te guía didácticamente viendo el mismo código que tú.</p>
                    </article>
                </section>
            </main>
        </div>
    );
}

