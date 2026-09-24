import { apiRequest } from "@/lib/api-client"
import type { AuthLoginResponse, CaptchaResponse, CurrentUser, LoginInput } from "./types"

/** 获取图片验证码，服务端返回的 key 需要原样回传 */
export function getCaptcha(): Promise<CaptchaResponse> {
  return apiRequest<CaptchaResponse>("/api/v1/captcha")
}

export function login(input: LoginInput): Promise<AuthLoginResponse> {
  return apiRequest<AuthLoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function getCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/api/v1/users/me")
}
