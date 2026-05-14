import { HttpError } from "../middleware/error-handler";
import { ProblemRepository } from "../repositories/problem-repository";
import { runJavaScriptCode, runPythonCode } from "../tools/code-runner";

// Estos tipos se duplican intencionalmente en shared/types/problem.ts para el frontend
interface TestCase {
  input: unknown[];
  expected: unknown;
}

interface TestResult {
  index: number;
  ok: boolean;
  input: unknown[];
  expected: unknown;
  actual?: unknown;
  error?: string;
}

interface CheckResult {
  tests: TestResult[];
  harnessError?: string;
  allPassed: boolean;
}

const TIMEOUT_MS = 5000;
const MARKER = "__TESTS__";

function buildHarnessJS(userCode: string, functionName: string, cases: TestCase[]): string {
  const casesJson = JSON.stringify(cases);
  return `
${userCode}

;(function() {
  const __TESTS_cases = ${casesJson};
  const __TESTS_results = [];

  let __TESTS_fn;
  try {
    __TESTS_fn = (typeof globalThis["${functionName}"] === "function")
      ? globalThis["${functionName}"]
      : (0, eval)("typeof ${functionName} === 'function' ? ${functionName} : undefined");
  } catch (_) {}

  if (typeof __TESTS_fn !== "function") {
    process.stdout.write("${MARKER}" + JSON.stringify({ harnessError: "Funcion '${functionName}' no encontrada. Asegurate de definirla con ese nombre." }) + "\\n");
    process.exit(0);
  }

  for (let __TESTS_i = 0; __TESTS_i < __TESTS_cases.length; __TESTS_i++) {
    const __TESTS_c = __TESTS_cases[__TESTS_i];
    try {
      const __TESTS_actual = __TESTS_fn(...__TESTS_c.input);
      const __TESTS_ok = JSON.stringify(__TESTS_actual) === JSON.stringify(__TESTS_c.expected);
      __TESTS_results.push({ index: __TESTS_i, ok: __TESTS_ok, input: __TESTS_c.input, expected: __TESTS_c.expected, actual: __TESTS_actual });
    } catch (__TESTS_err) {
      __TESTS_results.push({ index: __TESTS_i, ok: false, input: __TESTS_c.input, expected: __TESTS_c.expected, error: String(__TESTS_err) });
    }
  }

  process.stdout.write("${MARKER}" + JSON.stringify({ results: __TESTS_results }) + "\\n");
})();
`;
}

function buildHarnessPython(userCode: string, functionName: string, cases: TestCase[]): string {
  const casesJsonOfJson = JSON.stringify(JSON.stringify(cases));
  const snakeName = functionName.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`).replace(/^_/, "");
  return `
${userCode}

import json as __TESTS_json, sys as __TESTS_sys

__TESTS_cases = __TESTS_json.loads(${casesJsonOfJson})
__TESTS_results = []

__TESTS_fn = None
for __TESTS_name in ["${functionName}", "${snakeName}"]:
    __TESTS_fn = globals().get(__TESTS_name)
    if callable(__TESTS_fn):
        break

if not callable(__TESTS_fn):
    __TESTS_sys.stdout.write("${MARKER}" + __TESTS_json.dumps({"harnessError": "Funcion '${functionName}' (o '${snakeName}') no encontrada. Asegurate de definirla con ese nombre."}) + "\\n")
    __TESTS_sys.exit(0)

for __TESTS_i, __TESTS_c in enumerate(__TESTS_cases):
    try:
        __TESTS_actual = __TESTS_fn(*__TESTS_c["input"])
        __TESTS_ok = __TESTS_json.dumps(__TESTS_actual, sort_keys=True) == __TESTS_json.dumps(__TESTS_c["expected"], sort_keys=True)
        __TESTS_results.append({"index": __TESTS_i, "ok": __TESTS_ok, "input": __TESTS_c["input"], "expected": __TESTS_c["expected"], "actual": __TESTS_actual})
    except Exception as __TESTS_err:
        __TESTS_results.append({"index": __TESTS_i, "ok": False, "input": __TESTS_c["input"], "expected": __TESTS_c["expected"], "error": str(__TESTS_err)})

__TESTS_sys.stdout.write("${MARKER}" + __TESTS_json.dumps({"results": __TESTS_results}) + "\\n")
`;
}

function parseHarnessOutput(stdout: string, stderr: string, timedOut: boolean): CheckResult {
  if (timedOut) {
    return { tests: [], harnessError: "Tiempo de ejecucion agotado (posible bucle infinito).", allPassed: false };
  }

  const lines = stdout.split("\n");
  let markerLine: string | undefined;

  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes(MARKER)) {
      markerLine = lines[i];
      break;
    }
  }

  if (!markerLine) {
    const detail = stderr.trim() || stdout.trim() || "Sin salida del proceso.";
    return { tests: [], harnessError: `Error en el codigo: ${detail}`, allPassed: false };
  }

  const jsonPart = markerLine.slice(markerLine.indexOf(MARKER) + MARKER.length).trim();

  let parsed: { results?: TestResult[]; harnessError?: string };
  try {
    parsed = JSON.parse(jsonPart) as typeof parsed;
  } catch {
    return { tests: [], harnessError: "El harness devolvio JSON invalido.", allPassed: false };
  }

  if (parsed.harnessError) {
    return { tests: [], harnessError: parsed.harnessError, allPassed: false };
  }

  const tests = parsed.results ?? [];
  return { tests, allPassed: tests.length > 0 && tests.every((t) => t.ok) };
}

const repo = new ProblemRepository();

export async function checkSolution(
  problemId: string,
  code: string,
  language: "javascript" | "python",
): Promise<CheckResult> {
  const problem = repo.findById(problemId);

  if (!problem) {
    throw new HttpError(404, `Problema no encontrado: ${problemId}`);
  }

  if (!problem.functionName || !problem.testCases) {
    throw new HttpError(400, "Este problema no tiene tests configurados.");
  }

  let cases: TestCase[];
  try {
    cases = JSON.parse(problem.testCases) as TestCase[];
  } catch {
    throw new HttpError(500, "Los test_cases del problema tienen JSON invalido.");
  }

  let harnessCode: string;
  if (language === "javascript") {
    harnessCode = buildHarnessJS(code, problem.functionName, cases);
  } else {
    harnessCode = buildHarnessPython(code, problem.functionName, cases);
  }

  const result = language === "javascript"
    ? await runJavaScriptCode(harnessCode, { timeoutMs: TIMEOUT_MS })
    : await runPythonCode(harnessCode, { timeoutMs: TIMEOUT_MS });

  return parseHarnessOutput(result.stdout, result.stderr, result.timedOut);
}
