import { spawn } from "node:child_process";

const DEFAULT_MAX_OUTPUT_CHARS = 12000;

export interface JavaScriptCodeRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  durationMs: number;
  outputTruncated: boolean;
  spawnError?: string;
}

interface RunJavaScriptCodeOptions {
  timeoutMs: number;
  maxOutputChars?: number;
}

function appendWithLimit(current: string, chunk: string, maxChars: number): { next: string; truncated: boolean } {
  if (current.length >= maxChars) {
    return {
      next: current,
      truncated: true,
    };
  }

  const available = maxChars - current.length;
  if (chunk.length <= available) {
    return {
      next: `${current}${chunk}`,
      truncated: false,
    };
  }

  return {
    next: `${current}${chunk.slice(0, available)}`,
    truncated: true,
  };
}

export async function runJavaScriptCode(
  code: string,
  options: RunJavaScriptCodeOptions,
): Promise<JavaScriptCodeRunResult> {
  const maxOutputChars = options.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
  const timeoutMs = options.timeoutMs;
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["-e", code], {
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
      if (settled) {
        return;
      }

      settled = true;
      resolve({
        stdout,
        stderr,
        exitCode,
        signal,
        timedOut,
        durationMs: Date.now() - startedAt,
        outputTruncated,
        spawnError,
      });
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
