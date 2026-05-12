import { spawn } from "node:child_process";
import { config } from "../config";

const DEFAULT_MAX_OUTPUT_CHARS = 12000;

export interface SubprocessRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  durationMs: number;
  outputTruncated: boolean;
  spawnError?: string;
}

interface RunCodeOptions {
  timeoutMs: number;
  maxOutputChars?: number;
}

function appendWithLimit(current: string, chunk: string, maxChars: number): { next: string; truncated: boolean } {
  if (current.length >= maxChars) {
    return { next: current, truncated: true };
  }

  const available = maxChars - current.length;
  if (chunk.length <= available) {
    return { next: `${current}${chunk}`, truncated: false };
  }

  return { next: `${current}${chunk.slice(0, available)}`, truncated: true };
}

async function runSubprocess(
  command: string,
  args: string[],
  options: RunCodeOptions,
): Promise<SubprocessRunResult> {
  const maxOutputChars = options.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
  const timeoutMs = options.timeoutMs;
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let outputTruncated = false;
    let spawnError: string | undefined;
    let settled = false;

    const finalize = (exitCode: number | null, signal: NodeJS.Signals | null) => {
      if (settled) return;
      settled = true;
      resolve({ stdout, stderr, exitCode, signal, timedOut, durationMs: Date.now() - startedAt, outputTruncated, spawnError });
    };

    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      const appended = appendWithLimit(stdout, chunk, maxOutputChars);
      stdout = appended.next;
      outputTruncated = outputTruncated || appended.truncated;
    });

    child.stderr.on("data", (chunk: string) => {
      const appended = appendWithLimit(stderr, chunk, maxOutputChars);
      stderr = appended.next;
      outputTruncated = outputTruncated || appended.truncated;
    });

    child.on("error", (error) => {
      spawnError = error.message;
    });

    child.on("close", (exitCode, signal) => {
      clearTimeout(timeoutId);
      finalize(exitCode, signal);
    });
  });
}

export function runJavaScriptCode(code: string, options: RunCodeOptions): Promise<SubprocessRunResult> {
  return runSubprocess(process.execPath, ["-e", code], options);
}

export function runPythonCode(code: string, options: RunCodeOptions): Promise<SubprocessRunResult> {
  return runSubprocess(config.pythonBin, ["-X", "utf8", "-c", code], options);
}
