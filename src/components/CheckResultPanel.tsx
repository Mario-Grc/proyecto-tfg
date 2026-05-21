import type { CheckResult } from "../../shared/types";
import { useTranslation } from "../i18n/LanguageContext";

interface CheckResultPanelProps {
    checking: boolean;
    result: CheckResult | null;
}

export default function CheckResultPanel({ checking, result }: CheckResultPanelProps) {
    const { translate } = useTranslation();

    if (checking) {
        return <p className="check-result-loading">{translate("check.loading")}</p>;
    }

    if (!result) {
        return (
            <p className="check-result-empty">
                {translate("check.empty.prefix")} <strong>{translate("check.empty.testWord")}</strong> {translate("check.empty.suffix")}
            </p>
        );
    }

    if (result.harnessError) {
        return (
            <div className="check-harness-error">
                <p className="check-harness-error-title">{translate("check.harnessErrorTitle")}</p>
                <pre className="check-harness-error-detail">{result.harnessError}</pre>
            </div>
        );
    }

    const total = result.tests.length;
    const passed = result.tests.filter((t) => t.ok).length;

    return (
        <div className="check-result">
            <p className={`check-result-summary${result.allPassed ? " check-result-summary--pass" : " check-result-summary--fail"}`}>
                {result.allPassed
                    ? translate("check.allPassed")
                    : translate("check.partialPassed", { passed, total })}
            </p>

            <ul className="check-test-list">
                {result.tests.map((test) => (
                    <li key={test.index} className={`check-test-row${test.ok ? "" : " check-test-row--fail"}`}>
                        <span className="check-test-badge">{test.ok ? translate("check.badge.ok") : translate("check.badge.fail")}</span>
                        <span className="check-test-detail">
                            <span className="check-test-label">{translate("check.label.input")}</span>
                            <code>{JSON.stringify(test.input)}</code>
                            <span className="check-test-label">{translate("check.label.expected")}</span>
                            <code>{JSON.stringify(test.expected)}</code>
                            {!test.ok && test.actual !== undefined && (
                                <>
                                    <span className="check-test-label">{translate("check.label.actual")}</span>
                                    <code>{JSON.stringify(test.actual)}</code>
                                </>
                            )}
                            {!test.ok && test.error && (
                                <>
                                    <span className="check-test-label">{translate("check.label.error")}</span>
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
