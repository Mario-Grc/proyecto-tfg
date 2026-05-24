// Bocadillo del pato para las intervenciones proactivas (corto y descartable)
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "../i18n/LanguageContext";

interface DuckSpeechBubbleProps {
    message: string;
    onAsk: () => void;
    onDismiss: () => void;
}

export default function DuckSpeechBubble({ message, onAsk, onDismiss }: DuckSpeechBubbleProps) {
    const { translate } = useTranslation();

    return (
        <div className="duck-bubble" role="status" aria-live="polite" aria-label={translate("duck.bubble.ariaLabel")}>
            <button
                type="button"
                className="duck-bubble-dismiss"
                onClick={onDismiss}
                aria-label={translate("duck.bubble.dismiss")}
                title={translate("duck.bubble.dismiss")}
            >
                ×
            </button>

            <div className="duck-bubble-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message}</ReactMarkdown>
            </div>

            <div className="duck-bubble-actions">
                <button type="button" className="duck-bubble-ask" onClick={onAsk}>
                    {translate("duck.bubble.ask")}
                </button>
            </div>
        </div>
    );
}
