interface LandingPageProps {
    onStart: () => void;
    canContinue: boolean;
    onContinue: () => void;
}

const VALUE_PILLARS = [
    {
        title: "Tutor con contexto",
        description:
            "Pregunta sobre tu código, recibe guias paso a paso y aterriza conceptos sin salir del editor.",
    },
    {
        title: "Ejecucion inmediata",
        description:
            "Prueba tus ideas en JavaScript al instante para validar lógica, casos borde y complejidad.",
    },
    {
        title: "Stack local",
        description:
            "Conecta tu endpoint y modelo local para mantener control de latencia, costos y privacidad.",
    },
];

const LEARNING_FLOW = [
    {
        title: "Selecciona un reto",
        description: "Elige un problema con dificultad y tema para mantener practica constante.",
    },
    {
        title: "Razona con el asistente",
        description: "Usa el chat para entender el por que de cada paso, no solo la respuesta final.",
    },
    {
        title: "Implementa y ejecuta",
        description: "Codifica, corre pruebas rapidas y ajusta tu solucion con feedback directo.",
    },
];

const LOCAL_STACK_NOTES = [
    {
        label: "Endpoint local configurable",
    },
    {
        label: "Problema y chat en contexto unico",
    },
    {
        label: "Ejecucion JavaScript integrada",
    },
];

export default function LandingPage({ onStart, canContinue, onContinue }: LandingPageProps) {
    return (
        <div className="app-shell">
            <section className="landing-screen">
                <div className="landing-surface">
                    <header className="landing-hero">
                        <p className="landing-kicker">Asistente de programacion con LLM local</p>
                        <h1>Practica problemas con una ayuda clara, directa y dentro de tu propio entorno.</h1>
                        <p className="landing-lead">
                            QuackCode integra editor, consola y tutor conversaciónal en una sola vista para
                            practicar con metodo. El objetivo es que entiendas el por que de cada decision mientras
                            iteras código.
                        </p>

                        <div className="landing-actions">
                            <button type="button" className="landing-cta" onClick={onStart}>
                                Empezar practica
                            </button>
                            {canContinue && (
                                <button type="button" className="ghost-btn landing-continue" onClick={onContinue}>
                                    Continuar sesión
                                </button>
                            )}
                        </div>

                        <div className="landing-pillars" role="list" aria-label="Ventajas principales">
                            {VALUE_PILLARS.map((pillar) => (
                                <article key={pillar.title} className="landing-pillar" role="listitem">
                                    <h2>{pillar.title}</h2>
                                    <p>{pillar.description}</p>
                                </article>
                            ))}
                        </div>
                    </header>

                    <div className="landing-grid">
                        <article className="landing-card">
                            <h2>Flujo recomendado de practica</h2>
                            <ol className="landing-list landing-list-ordered" aria-label="Pasos de trabajo sugeridos">
                                {LEARNING_FLOW.map((step, index) => (
                                    <li key={step.title}>
                                        <span className="landing-step-index">{String(index + 1).padStart(2, "0")}</span>
                                        <div>
                                            <h3>{step.title}</h3>
                                            <p>{step.description}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </article>

                        <article className="landing-card landing-card-highlight">
                            <h2>Asistencia contextual continua</h2>
                            <p className="landing-card-copy">
                                El asistente siempre trabaja sobre el problema activo y el código que tengas en
                                pantalla. No hay modos distintos: es una sola experiencia de aprendizaje durante toda
                                la sesión.
                            </p>
                            <ul className="landing-badges" aria-label="Capacidades disponibles">
                                {LOCAL_STACK_NOTES.map((item) => (
                                    <li key={item.label}>{item.label}</li>
                                ))}
                            </ul>
                            <pre className="landing-snippet">{`const selected = view.state.doc.sliceString(from, to);
sendPrompt({
  text: userPrompt,
  selectedCode: selected,
});`}</pre>
                        </article>

                        <article className="landing-card">
                            <h2>Que puedes esperar</h2>
                            <ul className="landing-list" aria-label="Resultados esperados">
                                <li>
                                    <h3>Menos bloqueo</h3>
                                    <p>Recibes ayuda puntual sobre dudas de lógica, sintaxis y estrategia.</p>
                                </li>
                                <li>
                                    <h3>Mejor comprension</h3>
                                    <p>Las respuestas priorizan explicacion y razonamiento antes que atajos.</p>
                                </li>
                                <li>
                                    <h3>Iteracion rapida</h3>
                                    <p>Codificas, ejecutas y corriges en el mismo flujo sin perder contexto.</p>
                                </li>
                            </ul>
                        </article>
                    </div>
                </div>
            </section>
        </div>
    );
}
