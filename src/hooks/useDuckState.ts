import { useCallback, useEffect, useRef, useState } from "react";
import { DuckState } from "../types";
import usePersistentState from "./usePersistentState";

const AUTO_RESET_MS = 2400;

export default function useDuckState() {
    const [duckState, setDuckState] = useState<DuckState>("normal");
    const [duckCompact, setDuckCompact] = usePersistentState<boolean>("duck_compact_mode", false);
    const resetTimeoutRef = useRef<number | null>(null);

    const clearResetTimeout = useCallback(() => {
        if (resetTimeoutRef.current === null) {
            return;
        }

        window.clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
    }, []);

    const setNormal = useCallback(() => {
        clearResetTimeout();
        setDuckState("normal");
    }, [clearResetTimeout]);

    const setThinking = useCallback(() => {
        clearResetTimeout();
        setDuckState("thinking");
    }, [clearResetTimeout]);

    const setConfused = useCallback((durationMs = AUTO_RESET_MS) => {
        clearResetTimeout();
        setDuckState("confused");

        resetTimeoutRef.current = window.setTimeout(() => {
            setDuckState("normal");
            resetTimeoutRef.current = null;
        }, durationMs);
    }, [clearResetTimeout]);

    const toggleCompact = useCallback(() => {
        setDuckCompact((prev) => !prev);
    }, [setDuckCompact]);

    useEffect(() => {
        return () => {
            clearResetTimeout();
        };
    }, [clearResetTimeout]);

    return {
        duckState,
        duckCompact,
        toggleCompact,
        setNormal,
        setThinking,
        setConfused,
    };
}
