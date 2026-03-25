interface LandingPageProps {
    onStart: () => void;
    canContinue: boolean;
    onContinue: () => void;
}

export default function LandingPage({ onStart, canContinue, onContinue }: LandingPageProps) {
    return (
        <div className="app-shell">
            <section className="landing-screen">
                <div className="landing-card">
                    <h1>QuackCode</h1>
                    <p>
                        Entrena problemas de programacion con un flujo guiado:
                        selecciona un enunciado y resuelvelo en el editor con ayuda del chat.
                    </p>
                    <button type="button" className="landing-cta" onClick={onStart}>
                        Comenzar
                    </button>
                    {canContinue && (
                        <button type="button" className="ghost-btn landing-continue" onClick={onContinue}>
                            Continuar sesion
                        </button>
                    )}
                </div>
            </section>
        </div>
    );
}
