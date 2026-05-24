import { useCallback, useEffect, useRef, useState } from "react";
import type { CheckResult, CodeLanguage, ProactiveTestSummary, ProactiveTrigger } from "../../shared/types";
import { requestProactiveIntervention } from "../services/backendApi";
import type { Language } from "../i18n/translations";

const COOLDOWN_MS = 90_000;
const TEST_FAIL_MIN_STREAK = 2;
// cuantos test resumir
const MAX_FAILING_TESTS = 3;

export interface ProactiveBubble {
    message: string;
    trigger: ProactiveTrigger;
}

interface UseProactiveAssistantOptions {
    sessionId: string | null;
    enabled: boolean;
    language: CodeLanguage;
    uiLanguage: Language;
    getEditorCode: () => string;
    onIntervention: (message: string, trigger: ProactiveTrigger) => void;
}

function buildTestSummary(result: CheckResult): ProactiveTestSummary {
    const failing = result.tests
        .filter((test) => !test.ok)
        .slice(0, MAX_FAILING_TESTS)
        .map((test) => ({
            input: test.input,
            expected: test.expected,
            actual: test.actual,
            error: test.error,
        }));

    return {
        total: result.tests.length,
        passed: result.tests.filter((test) => test.ok).length,
        failing,
    };
}

export default function useProactiveAssistant({
    sessionId,
    enabled,
    language,
    uiLanguage,
    getEditorCode,
    onIntervention,
}: UseProactiveAssistantOptions) {
    const [bubble, setBubble] = useState<ProactiveBubble | null>(null);

    const lastInterventionAtRef = useRef<number>(0);
    const testFailStreakRef = useRef<number>(0);
    const abortRef = useRef<AbortController | null>(null);

    // Refs para leer los valores mas recientes sin re-crear callbacks.
    const onInterventionRef = useRef(onIntervention);
    const getEditorCodeRef = useRef(getEditorCode);

    useEffect(() => {
        onInterventionRef.current = onIntervention;
    }, [onIntervention]);

    useEffect(() => {
        getEditorCodeRef.current = getEditorCode;
    }, [getEditorCode]);

    // resetear contadores y cancelar peticiones en el cambio
    useEffect(() => {
        lastInterventionAtRef.current = 0;
        testFailStreakRef.current = 0;
        abortRef.current?.abort();
        abortRef.current = null;
        setBubble(null);
    }, [sessionId]);

    const dismissBubble = useCallback(() => {
        setBubble(null);
    }, []);

    const surface = useCallback((message: string, trigger: ProactiveTrigger) => {
        lastInterventionAtRef.current = Date.now();
        setBubble({ message, trigger });
        onInterventionRef.current(message, trigger);
    }, []);

    // Filtro mecanico comun: interruptor, sesion y cooldown.
    const canIntervene = useCallback(() => {
        if (!enabled || !sessionId) {
            return false;
        }

        return Date.now() - lastInterventionAtRef.current >= COOLDOWN_MS;
    }, [enabled, sessionId]);

    const notifyTestResult = useCallback((result: CheckResult) => {
        if (result.allPassed) {
            testFailStreakRef.current = 0;
            return;
        }

        // Solo contar fallos reales de tests
        if (result.tests.length === 0) {
            return;
        }

        testFailStreakRef.current += 1;

        if (testFailStreakRef.current < TEST_FAIL_MIN_STREAK || !sessionId || !canIntervene()) {
            return;
        }

        const summary = buildTestSummary(result);
        const editorCode = getEditorCodeRef.current().trim();

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        void requestProactiveIntervention(
            {
                sessionId,
                trigger: "test_failure",
                language,
                responseLanguage: uiLanguage,
                editorCode: editorCode || undefined,
                testSummary: summary,
            },
            controller.signal,
        )
            .then((response) => {
                if (controller.signal.aborted) {
                    return;
                }

                if (response.intervene && response.message) {
                    testFailStreakRef.current = 0;
                    surface(response.message, "test_failure");
                }
            })
            .catch((error) => {
                if (controller.signal.aborted) {
                    return;
                }

                // la proactividad nunca debe molestar al usuario con errores
                console.error("Proactive intervention failed:", error);
            });
    }, [sessionId, language, uiLanguage, canIntervene, surface]);

    return {
        bubble,
        dismissBubble,
        notifyTestResult,
    };
}
