import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon } from "@phosphor-icons/react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useCreateRole, useUpdateRole } from "./queries"
import { roleFormSchema, type RoleFormValues } from "./schemas"
import type { RoleRead } from "./types"

export type RoleFormTarget = { mode: "create" } | { mode: "edit"; role: RoleRead }

type RoleFormSheetProps = {
  target: RoleFormTarget | null
  onOpenChange: (open: boolean) => void
}

export function RoleFormSheet({ target, onOpenChange }: RoleFormSheetProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const createMutation = useCreateRole()
  const updateMutation = useUpdateRole()

  const editingRole = target?.mode === "edit" ? target.role : null
  const isEdit = editingRole !== null
  const pending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      code: editingRole?.code ?? "",
      name: editingRole?.name ?? "",
      description: editingRole?.description ?? "",
    },
  })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    const description = values.description || undefined
    const onSuccess = () => {
      toast.success(isEdit ? "角色已更新" : "角色已创建")
      onOpenChange(false)
    }
    const onError = (error: unknown) => {
      setFormError(error instanceof Error ? error.message : "保存失败，请稍后重试。")
    }

    if (editingRole) {
      // 后端不允许改 code，更新请求里不带上它
      updateMutation.mutate(
        { id: editingRole.id, input: { name: values.name, description } },
        { onSuccess, onError },
      )
      return
    }

    createMutation.mutate({ code: values.code, name: values.name, description }, { onSuccess, onError })
  })

  return (
    <Sheet open={target !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? "编辑角色" : "新建角色"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "角色编码创建后不可修改。" : "角色编码用于权限判断，创建后不可修改。"}
          </SheetDescription>
        </SheetHeader>

        <form className="flex flex-1 flex-col overflow-y-auto" onSubmit={onSubmit} noValidate>
          <div className="flex flex-1 flex-col gap-4 px-4">
            <FieldGroup>
              <Field data-invalid={errors.code ? true : undefined}>
                <FieldLabel htmlFor="role-form-code">角色编码</FieldLabel>
                <Input
                  id="role-form-code"
                  autoComplete="off"
                  readOnly={isEdit}
                  className={isEdit ? "bg-muted text-muted-foreground" : undefined}
                  aria-invalid={errors.code ? true : undefined}
                  aria-describedby={errors.code ? "role-form-code-error" : undefined}
                  {...register("code")}
                />
                <FieldError id="role-form-code-error" errors={errors.code ? [errors.code] : undefined} />
              </Field>

              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="role-form-name">角色名称</FieldLabel>
                <Input
                  id="role-form-name"
                  autoComplete="off"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? "role-form-name-error" : undefined}
                  {...register("name")}
                />
                <FieldError id="role-form-name-error" errors={errors.name ? [errors.name] : undefined} />
              </Field>

              <Field data-invalid={errors.description ? true : undefined}>
                <FieldLabel htmlFor="role-form-description">角色描述</FieldLabel>
                <Textarea
                  id="role-form-description"
                  rows={3}
                  aria-invalid={errors.description ? true : undefined}
                  aria-describedby={errors.description ? "role-form-description-error" : undefined}
                  {...register("description")}
                />
                <FieldError
                  id="role-form-description-error"
                  errors={errors.description ? [errors.description] : undefined}
                />
              </Field>
            </FieldGroup>

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
          </div>

          <SheetFooter>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  正在保存
                </>
              ) : isEdit ? (
                "保存"
              ) : (
                <>
                  <PlusIcon data-icon="inline-start" strokeWidth={1.75} aria-hidden="true" />
                  创建
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
