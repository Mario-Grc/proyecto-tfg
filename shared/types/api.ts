export interface ApiHealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}
