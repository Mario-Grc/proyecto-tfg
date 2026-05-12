import { useCallback, useEffect, useRef, useState } from "react";

export default function useConfirmAction(action: () => void, timeoutMs = 3000) {
    const [pending, setPending] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const clearPending = useCallback(() => {
        if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setPending(false);
    }, []);

    const trigger = useCallback(() => {
        if (pending) {
            clearPending();
            action();
            return;
        }

        setPending(true);
        timeoutRef.current = window.setTimeout(clearPending, timeoutMs);
    }, [pending, action, clearPending, timeoutMs]);

    useEffect(() => clearPending, [clearPending]);

    return { pending, trigger };
}
