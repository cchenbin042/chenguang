import { useQuery } from "@tanstack/react-query"
import { getCaptcha, getCurrentUser } from "./api"

export const authKeys = {
  captcha: ["auth", "captcha"] as const,
  currentUser: ["auth", "current-user"] as const,
}

/** 验证码不自动重试，失败时由用户手动点刷新 */
export function useCaptcha() {
  return useQuery({
    queryKey: authKeys.captcha,
    queryFn: getCaptcha,
    retry: false,
    staleTime: 0,
  })
}

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: getCurrentUser,
    enabled,
    retry: false,
  })
}
