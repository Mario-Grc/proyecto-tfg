import { DuckState } from "../types";
import duckConfused from "../assets/pato/pato-extrañado.webp";
import duckNormal from "../assets/pato/pato-normal.webp";
import duckThinking from "../assets/pato/pato-pensando.webp";
import duckVictory from "../assets/pato/pato-victoria.webp";
import duckIdea from "../assets/pato/pato-idea.webp";
import DuckSpeechBubble from "./DuckSpeechBubble";
import type { ProactiveBubble } from "../hooks/useProactiveAssistant";
import { useTranslation } from "../i18n/LanguageContext";

// tengo que precargar las imágenes para evitar el lag cuando se cargan por primera vez
[duckNormal, duckThinking, duckConfused, duckVictory, duckIdea].forEach((src) => {
    const img = new Image();
    img.src = src;
});

interface DuckAssistantProps {
    state: DuckState;
    compact: boolean;
    onToggleCompact: () => void;
    bubble?: ProactiveBubble | null;
    onAskInChat?: () => void;
    onDismissBubble?: () => void;
}

const DUCK_IMAGE_BY_STATE: Record<DuckState, string> = {
    normal: duckNormal,
    thinking: duckThinking,
    confused: duckConfused,
    victory: duckVictory,
    idea: duckIdea,
};

export default function DuckAssistant({
    state,
    compact,
    onToggleCompact,
    bubble,
    onAskInChat,
    onDismissBubble,
}: DuckAssistantProps) {
    const { translate } = useTranslation();

    const image = DUCK_IMAGE_BY_STATE[state];
    const stateLabel = translate(`duck.state.${state}`);
    const alt = translate(`duck.alt.${state}`);
    const sectionAria = translate("duck.ariaLabel.section", { state: stateLabel.toLowerCase() });

    const rootClassName = `duck-widget duck-${state} ${compact ? "is-compact" : ""}`.trim();

    const bubbleNode = bubble && onAskInChat && onDismissBubble ? (
        <DuckSpeechBubble message={bubble.message} onAsk={onAskInChat} onDismiss={onDismissBubble} />
    ) : null;

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
                {bubbleNode}
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
            {bubbleNode}
        </section>
    );
}
