import { DuckState } from "../types";
import duckConfused from "../assets/pato/pato-extrañado.png";
import duckNormal from "../assets/pato/pato-normal.png";
import duckThinking from "../assets/pato/pato-pensando.png";
import duckVictory from "../assets/pato/pato-victoria.png";
import { useTranslation } from "../i18n/LanguageContext";

// Precarga las 4 imágenes al importar el módulo para evitar el lag visible
// la primera vez que el pato cambia a un estado distinto del inicial.
[duckNormal, duckThinking, duckConfused, duckVictory].forEach((src) => {
    const img = new Image();
    img.src = src;
});

interface DuckAssistantProps {
    state: DuckState;
    compact: boolean;
    onToggleCompact: () => void;
}

const DUCK_IMAGE_BY_STATE: Record<DuckState, string> = {
    normal: duckNormal,
    thinking: duckThinking,
    confused: duckConfused,
    victory: duckVictory,
};

export default function DuckAssistant({ state, compact, onToggleCompact }: DuckAssistantProps) {
    const { translate } = useTranslation();

    const image = DUCK_IMAGE_BY_STATE[state];
    const stateLabel = translate(`duck.state.${state}`);
    const alt = translate(`duck.alt.${state}`);
    const sectionAria = translate("duck.ariaLabel.section", { state: stateLabel.toLowerCase() });

    const rootClassName = `duck-widget duck-${state} ${compact ? "is-compact" : ""}`.trim();

    if (compact) {
        return (
            <section className={rootClassName} aria-label={sectionAria}>
                <img className="duck-avatar" src={image} alt={alt} draggable={false} />
                <button
                    type="button"
                    className="duck-compact-btn"
                    onClick={onToggleCompact}
                    aria-label={translate("duck.compact.show")}
                    title={translate("duck.compact.show")}
                >
                    +
                </button>
            </section>
        );
    }

    return (
        <section className={rootClassName} aria-live="polite" aria-label={sectionAria}>
            <button
                type="button"
                className="duck-compact-btn duck-collapse-btn"
                onClick={onToggleCompact}
                aria-label={translate("duck.compact.hide")}
                title={translate("duck.compact.hide")}
            >
                -
            </button>
            <img className="duck-avatar" src={image} alt={alt} draggable={false} />
        </section>
    );
}
