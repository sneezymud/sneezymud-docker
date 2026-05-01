import type { z } from "zod";

import { apiErrorSchema } from "./schemas/common.ts";

export class ApiResponseError extends Error {
  readonly body: string;
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
    this.body = message;
  }
}

export async function apiFetch<T extends z.ZodType>(
  path: string,
  schema: T,
  options?: RequestInit,
): Promise<z.infer<T>> {
  const headers = new Headers(options?.headers);
  const method = options?.method?.toUpperCase() ?? "GET";
  if (method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Requested-With", "XMLHttpRequest");

  const response = await fetch(path, {
    ...options,
    headers,
    signal: options?.signal ?? AbortSignal.timeout(30_000),
  });

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ApiResponseError(
      response.status,
      `Server returned non-JSON response (${response.status})`,
    );
  }

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    if (parsed.success) {
      const issues = parsed.data.issues;
      if (issues && issues.length > 0) {
        const detail = issues
          .map(({ message, path }) => `${path.join(".")}: ${message}`)
          .join("; ");
        throw new ApiResponseError(response.status, detail);
      }
      throw new ApiResponseError(response.status, parsed.data.error);
    }
    throw new ApiResponseError(response.status, "Request failed");
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiResponseError(
      0,
      `Invalid response from server (expected ${schema.description ?? "valid data"})`,
    );
  }

  return parsed.data;
}
