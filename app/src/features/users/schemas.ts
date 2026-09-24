import { z } from "zod"

export const userCreateSchema = z.object({
  username: z.string().trim().min(2, "用户名至少 2 个字符").max(50, "用户名最多 50 个字符"),
  email: z.string().trim().email("请输入有效邮箱").max(100, "邮箱最多 100 个字符"),
  password: z.string().min(6, "密码至少 6 个字符"),
})

export type UserCreateValues = z.infer<typeof userCreateSchema>
