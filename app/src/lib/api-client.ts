import { authStorage } from "./auth-storage"
import { ApiError, type ApiResponse, type ValidationIssue } from "./api-types"

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function validationIssues(value: unknown): ValidationIssue[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((issue): ValidationIssue[] => {
    const record = asRecord(issue)
    if (
      record === null || !Array.isArray(record.loc) ||
      !record.loc.every((part) => typeof part === "string" || typeof part === "number") ||
      typeof record.msg !== "string" || typeof record.type !== "string"
    ) return []

    return [{ loc: [...record.loc], msg: record.msg, type: record.type }]
  })
}

function errorFromResponse(body: unknown, status: number): ApiError {
  const record = asRecord(body)
  const code = typeof record?.code === "number" ? record.code : status
  const issues = status === 422 ? validationIssues(record?.detail) : []
  const message = issues.length > 0
    ? issues.map((issue) => `${issue.loc.join(".")}: ${issue.msg}`).join("; ")
    : typeof record?.message === "string" && record.message
      ? record.message
      : typeof record?.detail === "string" && record.detail
        ? record.detail
        : `请求失败 (${status})`

  return new ApiError(message, code, status, issues)
}

/** 拼接 Base URL 与请求路径；空 Base URL 时使用相对路径，交给 Vite 代理处理 */
export function apiUrl(path: string): string {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "")
  const requestPath = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl}${requestPath}`
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = authStorage.getToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (options.body != null && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(apiUrl(path), { ...options, headers })
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      if (!response.ok) throw errorFromResponse(null, response.status)
      throw new ApiError("响应格式错误", response.status, response.status)
    }
  }

  if (!response.ok) throw errorFromResponse(body, response.status)

  const envelope = asRecord(body)
  if (typeof envelope?.code !== "number") {
    throw new ApiError("响应格式错误", response.status, response.status)
  }
  if (envelope.code !== 200) throw errorFromResponse(envelope, response.status)

  return (body as ApiResponse<T>).data as T
}
