import { z } from "zod"

export const loginSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
  captcha_code: z.string().trim().min(1, "请输入验证码"),
})

export type LoginFormValues = z.infer<typeof loginSchema>
