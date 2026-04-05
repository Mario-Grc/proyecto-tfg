import { useEffect, useState } from "react";

interface PersistentStateOptions<T> {
    validate?: (value: T) => boolean;
}

function resolveInitialValue<T>(initialValue: T | (() => T)): T {
    return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
}

export default function usePersistentState<T>(
    key: string,
    initialValue: T | (() => T),
    options?: PersistentStateOptions<T>
) {
    const [state, setState] = useState<T>(() => {
        const fallback = resolveInitialValue(initialValue);

        try {
            const stored = localStorage.getItem(key);
            if (!stored) {
                return fallback;
            }

            const parsed = JSON.parse(stored) as T;

            if (options?.validate && !options.validate(parsed)) {
                return fallback;
            }

            return parsed;
        } catch {
            return fallback;
        }
    });

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(state));
    }, [key, state]);

    return [state, setState] as const;
}
