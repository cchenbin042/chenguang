import { z } from "zod"

/** 创建与编辑共用一套校验：编辑时 code 只读但不为空，提交时不进入请求体 */
export const permissionFormSchema = z.object({
  code: z.string().trim().min(1, "请输入权限编码").max(100, "权限编码最多 100 个字符"),
  name: z.string().trim().min(1, "请输入权限名称").max(100, "权限名称最多 100 个字符"),
  description: z.string().trim().max(200, "权限描述最多 200 个字符"),
})

export type PermissionFormValues = z.infer<typeof permissionFormSchema>
