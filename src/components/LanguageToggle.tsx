import { useTranslation } from "../i18n/LanguageContext";

interface LanguageToggleProps {
    className?: string;
}

export default function LanguageToggle({ className }: LanguageToggleProps) {
    const { language, setLanguage } = useTranslation();
    const nextLanguage = language === "es" ? "en" : "es";
    const title = language === "es" ? "Switch to English" : "Cambiar a español";

    return (
        <button
            type="button"
            className={`lang-toggle${className ? ` ${className}` : ""}`}
            onClick={() => setLanguage(nextLanguage)}
            title={title}
            aria-label={title}
        >
            {nextLanguage.toUpperCase()}
        </button>
    );
}
