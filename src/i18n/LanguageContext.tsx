import { ReactNode, createContext, useCallback, useContext, useMemo } from "react";
import usePersistentState from "../hooks/usePersistentState";
import { Language, SUPPORTED_LANGUAGES, translations } from "./translations";

export type TranslateVars = Record<string, string | number>;

interface LanguageContextValue {
    language: Language;
    setLanguage: (lang: Language) => void;
    translate: (key: string, vars?: TranslateVars) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLanguage(value: unknown): value is Language {
    return typeof value === "string" && (SUPPORTED_LANGUAGES as string[]).includes(value);
}

interface LanguageProviderProps {
    children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
    const [language, setLanguage] = usePersistentState<Language>(
        "quack:language",
        "es",
        { validate: isLanguage },
    );

    const translate = useCallback(
        (key: string, vars?: TranslateVars) => {
            let result = translations[language][key] ?? key;
            if (vars) {
                for (const [name, value] of Object.entries(vars)) {
                    result = result.split(`{${name}}`).join(String(value));
                }
            }
            return result;
        },
        [language],
    );

    const value = useMemo(
        () => ({ language, setLanguage, translate }),
        [language, setLanguage, translate],
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
    const ctx = useContext(LanguageContext);
    if (!ctx) {
        throw new Error("useTranslation debe usarse dentro de <LanguageProvider>");
    }
    return ctx;
}
