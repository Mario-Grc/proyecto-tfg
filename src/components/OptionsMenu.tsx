import { useEffect, useState } from "react";
import useConfirmAction from "../hooks/useConfirmAction";
import { useTranslation } from "../i18n/LanguageContext";
import type { Language } from "../i18n/translations";

interface OptionsMenuProps {
    themeMode: "dark" | "light";
    onToggleTheme: () => void;
    onClearConversation: () => void;
}

export default function OptionsMenu({
    themeMode,
    onToggleTheme,
    onClearConversation,
}: OptionsMenuProps) {
    const { translate, language, setLanguage } = useTranslation();
    const [open, setOpen] = useState(false);
    const { pending: clearPending, trigger: triggerClear } = useConfirmAction(onClearConversation);

    useEffect(() => {
        if (!open) {
            return;
        }

        function handleEscape(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setOpen(false);
            }
        }

        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open]);

    function renderLanguageButton(target: Language, label: string) {
        const isActive = language === target;
        return (
            <button
                type="button"
                className={`options-item${isActive ? " is-active" : ""}`}
                onClick={() => setLanguage(target)}
                aria-pressed={isActive}
            >
                {label}
            </button>
        );
    }

    return (
        <div className="options-menu">
            <button
                type="button"
                className="options-trigger"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls="app-settings-dialog"
            >
                {translate("options.trigger")}
            </button>

            {open && (
                <div className="options-overlay" onMouseDown={() => setOpen(false)}>
                    <section
                        id="app-settings-dialog"
                        className="options-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="options-modal-title"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <header className="options-modal-header">
                            <div>
                                <h2 id="options-modal-title" className="options-modal-title">{translate("options.title")}</h2>
                                <p className="options-modal-subtitle">{translate("options.subtitle")}</p>
                            </div>
                            <button
                                type="button"
                                className="options-close-btn"
                                onClick={() => setOpen(false)}
                                aria-label={translate("options.closeAria")}
                            >
                                {translate("options.close")}
                            </button>
                        </header>

                        <div className="options-modal-body">
                            <section className="options-section">
                                <h3 className="options-section-title">{translate("options.section.appearance")}</h3>
                                <button
                                    type="button"
                                    className="options-item"
                                    onClick={onToggleTheme}
                                >
                                    {themeMode === "dark"
                                        ? translate("options.toggleTheme.toLight")
                                        : translate("options.toggleTheme.toDark")}
                                </button>
                            </section>

                            <section className="options-section">
                                <h3 className="options-section-title">{translate("options.section.language")}</h3>
                                <div className="options-language-row">
                                    {renderLanguageButton("es", translate("options.language.spanish"))}
                                    {renderLanguageButton("en", translate("options.language.english"))}
                                </div>
                            </section>

                            <section className="options-section">
                                <h3 className="options-section-title">{translate("options.section.conversation")}</h3>
                                <button
                                    type="button"
                                    className={`options-item danger${clearPending ? " confirming" : ""}`}
                                    onClick={triggerClear}
                                >
                                    {clearPending
                                        ? translate("options.clearConversation.confirm")
                                        : translate("options.clearConversation")}
                                </button>
                            </section>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
