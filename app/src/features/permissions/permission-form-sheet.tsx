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
import { useCreatePermission, useUpdatePermission } from "./queries"
import { permissionFormSchema, type PermissionFormValues } from "./schemas"
import type { PermissionRead } from "./types"

export type PermissionFormTarget = { mode: "create" } | { mode: "edit"; permission: PermissionRead }

type PermissionFormSheetProps = {
  target: PermissionFormTarget | null
  onOpenChange: (open: boolean) => void
}

export function PermissionFormSheet({ target, onOpenChange }: PermissionFormSheetProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const createMutation = useCreatePermission()
  const updateMutation = useUpdatePermission()

  const editing = target?.mode === "edit" ? target.permission : null
  const isEdit = editing !== null
  const pending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: {
      code: editing?.code ?? "",
      name: editing?.name ?? "",
      description: editing?.description ?? "",
    },
  })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    const description = values.description || undefined
    const onSuccess = () => {
      toast.success(isEdit ? "权限已更新" : "权限已创建")
      onOpenChange(false)
    }
    const onError = (error: unknown) => {
      setFormError(error instanceof Error ? error.message : "保存失败，请稍后重试。")
    }

    if (editing) {
      // 后端不允许改 code，更新请求里只带名称和描述
      updateMutation.mutate(
        { id: editing.id, input: { name: values.name, description } },
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
          <SheetTitle>{isEdit ? "编辑权限" : "新建权限"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "权限编码创建后不可修改。" : "权限编码建议使用 资源:动作 形式，创建后不可修改。"}
          </SheetDescription>
        </SheetHeader>

        <form className="flex flex-1 flex-col overflow-y-auto" onSubmit={onSubmit} noValidate>
          <div className="flex flex-1 flex-col gap-4 px-4">
            <FieldGroup>
              <Field data-invalid={errors.code ? true : undefined}>
                <FieldLabel htmlFor="permission-form-code">权限编码</FieldLabel>
                <Input
                  id="permission-form-code"
                  autoComplete="off"
                  readOnly={isEdit}
                  className={isEdit ? "bg-muted text-muted-foreground" : undefined}
                  aria-invalid={errors.code ? true : undefined}
                  aria-describedby={errors.code ? "permission-form-code-error" : undefined}
                  {...register("code")}
                />
                <FieldError id="permission-form-code-error" errors={errors.code ? [errors.code] : undefined} />
              </Field>

              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="permission-form-name">权限名称</FieldLabel>
                <Input
                  id="permission-form-name"
                  autoComplete="off"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? "permission-form-name-error" : undefined}
                  {...register("name")}
                />
                <FieldError id="permission-form-name-error" errors={errors.name ? [errors.name] : undefined} />
              </Field>

              <Field data-invalid={errors.description ? true : undefined}>
                <FieldLabel htmlFor="permission-form-description">权限描述</FieldLabel>
                <Textarea
                  id="permission-form-description"
                  rows={3}
                  aria-invalid={errors.description ? true : undefined}
                  aria-describedby={errors.description ? "permission-form-description-error" : undefined}
                  {...register("description")}
                />
                <FieldError
                  id="permission-form-description-error"
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
