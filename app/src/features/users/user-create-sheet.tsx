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
import { useCreateUser } from "./queries"
import { userCreateSchema, type UserCreateValues } from "./schemas"

type UserCreateSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserCreateSheet({ open, onOpenChange }: UserCreateSheetProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const createMutation = useCreateUser()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserCreateValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { username: "", email: "", password: "" },
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset()
      setFormError(null)
    }
    onOpenChange(next)
  }

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    createMutation.mutate(values, {
      onSuccess: () => {
        toast.success("用户已创建")
        handleOpenChange(false)
      },
      onError: (error: unknown) => {
        setFormError(error instanceof Error ? error.message : "创建失败，请稍后重试。")
      },
    })
  })

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>新建用户</SheetTitle>
          <SheetDescription>创建后可在用户详情里为该用户分配角色。</SheetDescription>
        </SheetHeader>

        <form className="flex flex-1 flex-col overflow-y-auto" onSubmit={onSubmit} noValidate>
          <div className="flex flex-1 flex-col gap-4 px-4">
            <FieldGroup>
              <Field data-invalid={errors.username ? true : undefined}>
                <FieldLabel htmlFor="user-create-username">用户名</FieldLabel>
                <Input
                  id="user-create-username"
                  autoComplete="off"
                  aria-invalid={errors.username ? true : undefined}
                  aria-describedby={errors.username ? "user-create-username-error" : undefined}
                  {...register("username")}
                />
                <FieldError id="user-create-username-error" errors={errors.username ? [errors.username] : undefined} />
              </Field>

              <Field data-invalid={errors.email ? true : undefined}>
                <FieldLabel htmlFor="user-create-email">邮箱</FieldLabel>
                <Input
                  id="user-create-email"
                  type="email"
                  autoComplete="off"
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "user-create-email-error" : undefined}
                  {...register("email")}
                />
                <FieldError id="user-create-email-error" errors={errors.email ? [errors.email] : undefined} />
              </Field>

              <Field data-invalid={errors.password ? true : undefined}>
                <FieldLabel htmlFor="user-create-password">密码</FieldLabel>
                <Input
                  id="user-create-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? "user-create-password-error" : undefined}
                  {...register("password")}
                />
                <FieldError id="user-create-password-error" errors={errors.password ? [errors.password] : undefined} />
                <p className="text-xs text-muted-foreground">至少 6 个字符。</p>
              </Field>
            </FieldGroup>

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
          </div>

          <SheetFooter>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  正在创建
                </>
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
