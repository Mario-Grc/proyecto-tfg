import type { CheckResult } from "../../shared/types";

interface CheckResultPanelProps {
    checking: boolean;
    result: CheckResult | null;
}

export default function CheckResultPanel({ checking, result }: CheckResultPanelProps) {
    if (checking) {
        return <p className="check-result-loading">Comprobando solución...</p>;
    }

    if (!result) {
        return <p className="check-result-empty">Pulsa <strong>Test</strong> para ejecutar los tests.</p>;
    }

    if (result.harnessError) {
        return (
            <div className="check-harness-error">
                <p className="check-harness-error-title">Error al ejecutar los tests</p>
                <pre className="check-harness-error-detail">{result.harnessError}</pre>
            </div>
        );
    }

    const total = result.tests.length;
    const passed = result.tests.filter((t) => t.ok).length;

    return (
        <div className="check-result">
            <p className={`check-result-summary${result.allPassed ? " check-result-summary--pass" : " check-result-summary--fail"}`}>
                {result.allPassed ? "Todos los tests han pasado" : `${passed} / ${total} tests correctos`}
            </p>

            <ul className="check-test-list">
                {result.tests.map((test) => (
                    <li key={test.index} className={`check-test-row${test.ok ? "" : " check-test-row--fail"}`}>
                        <span className="check-test-badge">{test.ok ? "OK" : "FAIL"}</span>
                        <span className="check-test-detail">
                            <span className="check-test-label">Entrada:</span>
                            <code>{JSON.stringify(test.input)}</code>
                            <span className="check-test-label">Esperado:</span>
                            <code>{JSON.stringify(test.expected)}</code>
                            {!test.ok && test.actual !== undefined && (
                                <>
                                    <span className="check-test-label">Obtenido:</span>
                                    <code>{JSON.stringify(test.actual)}</code>
                                </>
                            )}
                            {!test.ok && test.error && (
                                <>
                                    <span className="check-test-label">Error:</span>
                                    <code>{test.error}</code>
                                </>
                            )}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
