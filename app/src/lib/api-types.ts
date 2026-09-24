export interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface ValidationIssue {
  loc: Array<string | number>
  msg: string
  type: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly status: number,
    public readonly issues: ValidationIssue[] = [],
  ) {
    super(message)
    this.name = "ApiError"
  }
}
