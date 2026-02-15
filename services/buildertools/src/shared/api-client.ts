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
  headers.set("Content-Type", "application/json");

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const json: unknown = await response.json();

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    const message = parsed.success ? parsed.data.error : "Request failed";
    throw new ApiResponseError(response.status, message);
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiResponseError(response.status, "Unexpected response format");
  }

  return parsed.data;
}
