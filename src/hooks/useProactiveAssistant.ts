import { useCallback, useEffect, useRef, useState } from "react";
import type { CheckResult, CodeLanguage, ProactiveRequest, ProactiveTestSummary, ProactiveTrigger } from "../../shared/types";
import { requestProactiveIntervention } from "../services/backendApi";
import type { Language } from "../i18n/translations";

const COOLDOWN_MS = 90_000;
const TEST_FAIL_MIN_STREAK = 2;
// cuantos test resumir
const MAX_FAILING_TESTS = 3;
// pausa sin teclear antes de poder chequear
const SETTLE_MS = 4_000;
// minimo entre chequeos idle al LLM
const IDLE_CHECK_INTERVAL_MS = 60_000;

export interface ProactiveBubble {
    message: string;
    trigger: ProactiveTrigger;
}

interface UseProactiveAssistantOptions {
    sessionId: string | null;
    enabled: boolean;
    language: CodeLanguage;
    uiLanguage: Language;
    chatLoading: boolean;
    // true solo cuando el workspace esta visible
    active: boolean;
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
    chatLoading,
    active,
    getEditorCode,
    onIntervention,
}: UseProactiveAssistantOptions) {
    const [bubble, setBubble] = useState<ProactiveBubble | null>(null);

    const lastInterventionAtRef = useRef<number>(0);
    const testFailStreakRef = useRef<number>(0);
    const abortRef = useRef<AbortController | null>(null);

    // Estado del chequeo periodico (idle).
    const lastCodeRef = useRef<string>("");
    const lastCheckedCodeRef = useRef<string>("");
    const lastIdleCheckAtRef = useRef<number>(0);
    const idleTimerRef = useRef<number | null>(null);

    // Refs para leer los valores mas recientes sin re-crear callbacks.
    const onInterventionRef = useRef(onIntervention);
    const getEditorCodeRef = useRef(getEditorCode);

    useEffect(() => {
        onInterventionRef.current = onIntervention;
    }, [onIntervention]);

    useEffect(() => {
        getEditorCodeRef.current = getEditorCode;
    }, [getEditorCode]);

    const chatLoadingRef = useRef(chatLoading);
    const activeRef = useRef(active);

    useEffect(() => {
        chatLoadingRef.current = chatLoading;
    }, [chatLoading]);

    useEffect(() => {
        activeRef.current = active;
    }, [active]);

    const dismissBubble = useCallback(() => {
        setBubble(null);
    }, []);

    // cortar la micro-pausa pendiente y la peticion al LLM en vuelo
    const cancelPendingWork = useCallback(() => {
        if (idleTimerRef.current !== null) {
            window.clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }

        abortRef.current?.abort();
        abortRef.current = null;
    }, []);

    const surface = useCallback((message: string, trigger: ProactiveTrigger) => {
        lastInterventionAtRef.current = Date.now();
        setBubble({ message, trigger });
        onInterventionRef.current(message, trigger);
    }, []);

    // Lanza la peticion cancelando cualquier otra en vuelo y muestra la pista si la hay.
    const runProactiveRequest = useCallback((payload: ProactiveRequest) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        void requestProactiveIntervention(payload, controller.signal)
            .then((response) => {
                if (controller.signal.aborted) {
                    return;
                }

                if (response.intervene && response.message) {
                    surface(response.message, response.trigger);
                }
            })
            .catch((error) => {
                if (controller.signal.aborted) {
                    return;
                }

                // la proactividad nunca debe molestar al usuario con errores
                console.error("Proactive intervention failed:", error);
            });
    }, [surface]);

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

        if (
            testFailStreakRef.current < TEST_FAIL_MIN_STREAK ||
            !sessionId ||
            !activeRef.current ||
            chatLoadingRef.current ||
            !canIntervene()
        ) {
            return;
        }

        testFailStreakRef.current = 0;
        const editorCode = getEditorCodeRef.current().trim();

        runProactiveRequest({
            sessionId,
            trigger: "test_failure",
            language,
            responseLanguage: uiLanguage,
            editorCode: editorCode || undefined,
            testSummary: buildTestSummary(result),
        });
    }, [sessionId, language, uiLanguage, canIntervene, runProactiveRequest]);

    // Chequeo periodico de atasco: tras la micro-pausa decide si pedir una pista.
    const maybeIdleCheck = useCallback(() => {
        const code = lastCodeRef.current.trim();

        if (!code || !sessionId || !enabled || !active || chatLoading) {
            return;
        }

        if (Date.now() - lastIdleCheckAtRef.current < IDLE_CHECK_INTERVAL_MS) {
            return;
        }

        if (!canIntervene() || code === lastCheckedCodeRef.current) {
            return;
        }

        lastIdleCheckAtRef.current = Date.now();
        lastCheckedCodeRef.current = code;

        runProactiveRequest({
            sessionId,
            trigger: "idle",
            language,
            responseLanguage: uiLanguage,
            editorCode: code,
        });
    }, [sessionId, enabled, active, chatLoading, language, uiLanguage, canIntervene, runProactiveRequest]);

    const maybeIdleCheckRef = useRef(maybeIdleCheck);

    useEffect(() => {
        maybeIdleCheckRef.current = maybeIdleCheck;
    }, [maybeIdleCheck]);

    // Cada edicion: guarda el codigo, cancela peticiones en vuelo y rearma la micro-pausa.
    const notifyEdit = useCallback((code: string) => {
        lastCodeRef.current = code;
        abortRef.current?.abort();

        if (idleTimerRef.current !== null) {
            window.clearTimeout(idleTimerRef.current);
        }

        idleTimerRef.current = window.setTimeout(() => {
            idleTimerRef.current = null;
            maybeIdleCheckRef.current();
        }, SETTLE_MS);
    }, []);

    // Resetear estado y cancelar todo al cambiar de sesion.
    useEffect(() => {
        lastInterventionAtRef.current = 0;
        testFailStreakRef.current = 0;
        lastIdleCheckAtRef.current = 0;
        lastCodeRef.current = "";
        lastCheckedCodeRef.current = "";

        cancelPendingWork();
        setBubble(null);
    }, [sessionId, cancelPendingWork]);

    // al salir del workspace, cortar cualquier actividad proactiva
    useEffect(() => {
        if (active) {
            return;
        }

        cancelPendingWork();
        setBubble(null);
    }, [active, cancelPendingWork]);

    // Limpieza al desmontar.
    useEffect(() => () => {
        cancelPendingWork();
    }, [cancelPendingWork]);

    return {
        bubble,
        dismissBubble,
        notifyTestResult,
        notifyEdit,
        cancel: cancelPendingWork,
    };
}
