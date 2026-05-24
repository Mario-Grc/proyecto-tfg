import type { CodeLanguage, ResponseLanguage } from "./chat";

export type ProactiveTrigger = "test_failure" | "idle";

// resumen de un test fallido
export interface ProactiveFailingTest {
  input: unknown[];
  expected: unknown;
  actual?: unknown;
  error?: string;
}

// resumen total de tests
export interface ProactiveTestSummary {
  total: number;
  passed: number;
  failing: ProactiveFailingTest[];
}

export interface ProactiveRequest {
  sessionId: string;
  trigger: ProactiveTrigger;
  language?: CodeLanguage;
  responseLanguage?: ResponseLanguage;
  editorCode?: string;
  testSummary?: ProactiveTestSummary;
}

export interface ProactiveResponse {
  intervene: boolean;
  message: string | null;
  trigger: ProactiveTrigger;
}
