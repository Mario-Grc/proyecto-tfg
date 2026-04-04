import { DuckState } from "../types";
import duckConfused from "../assets/pato/pato-extrañado.png";
import duckNormal from "../assets/pato/pato-normal.png";
import duckThinking from "../assets/pato/pato-pensando.png";

interface DuckAssistantProps {
    state: DuckState;
    compact: boolean;
    onToggleCompact: () => void;
}

const DUCK_VISUAL_BY_STATE: Record<DuckState, { image: string; label: string; alt: string }> = {
    normal: {
        image: duckNormal,
        label: "Normal",
        alt: "Pato en estado normal",
    },
    thinking: {
        image: duckThinking,
        label: "Pensando",
        alt: "Pato pensando",
    },
    confused: {
        image: duckConfused,
        label: "Extraniado",
        alt: "Pato extranado",
    },
};

export default function DuckAssistant({ state, compact, onToggleCompact }: DuckAssistantProps) {
    const visual = DUCK_VISUAL_BY_STATE[state];
    const rootClassName = `duck-widget duck-${state} ${compact ? "is-compact" : ""}`.trim();

    if (compact) {
        return (
            <section className={rootClassName} aria-label={`Pato asistente en estado ${visual.label.toLowerCase()}`}>
                <img className="duck-avatar" src={visual.image} alt={visual.alt} draggable={false} />
                <button
                    type="button"
                    className="duck-compact-btn"
                    onClick={onToggleCompact}
                    aria-label="Mostrar pato grande"
                    title="Mostrar pato grande"
                >
                    +
                </button>
            </section>
        );
    }

    return (
        <section className={rootClassName} aria-live="polite" aria-label={`Pato asistente en estado ${visual.label.toLowerCase()}`}>
            <button
                type="button"
                className="duck-compact-btn duck-collapse-btn"
                onClick={onToggleCompact}
                aria-label="Mostrar pato pequeno"
                title="Mostrar pato pequeno"
            >
                -
            </button>
            <img className="duck-avatar" src={visual.image} alt={visual.alt} draggable={false} />
        </section>
    );
}
