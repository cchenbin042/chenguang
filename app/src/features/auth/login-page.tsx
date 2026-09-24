import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowsClockwiseIcon, SignInIcon } from "@phosphor-icons/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { authStorage } from "@/lib/auth-storage"
import { getCurrentUser, login } from "./api"
import { authKeys, useCaptcha } from "./queries"
import { loginSchema, type LoginFormValues } from "./schemas"

type LoginLocationState = { from?: string } | null

function CaptchaPreview({ status, image }: { status: "pending" | "error" | "ready"; image?: string }) {
  const [decodeFailed, setDecodeFailed] = useState(false)

  if (status === "pending") {
    return <Skeleton className="h-8 w-[108px] shrink-0" />
  }

  if (status === "error" || !image || decodeFailed) {
    return <span className="w-[108px] shrink-0 text-xs text-destructive">验证码加载失败</span>
  }

  return (
    <img
      src={image}
      alt="验证码图片"
      width={108}
      height={36}
      onError={() => setDecodeFailed(true)}
      className="h-8 w-[108px] shrink-0 border border-border"
    />
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const captcha = useCaptcha()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", captcha_code: "" },
  })

  const captchaKey = captcha.data?.key

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      if (!captchaKey) throw new Error("验证码尚未加载，请刷新后重试。")
      const result = await login({ ...values, captcha_key: captchaKey })
      // 先落令牌，再校验登录态，避免带着无效令牌进入受保护页面
      authStorage.setToken(result.access_token)
      return await getCurrentUser()
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.currentUser, user)
      const from = (location.state as LoginLocationState)?.from
      navigate(from && from !== "/login" ? from : "/overview", { replace: true })
    },
    onError: (error: unknown) => {
      setFormError(error instanceof Error ? error.message : "登录失败，请稍后重试。")
      setValue("password", "")
      void captcha.refetch()
    },
  })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    loginMutation.mutate(values)
  })

  const captchaStatus = captcha.isError || (!captcha.isPending && !captcha.data) ? "error" : captcha.data ? "ready" : "pending"

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="w-full max-w-[400px] border border-border bg-card p-8">
        <p className="text-sm font-medium text-primary">辰光管理后台</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">登录</h1>
        <p className="mt-1 text-sm text-muted-foreground">请输入账号、密码与验证码。</p>

        <form className="mt-6" onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={errors.username ? true : undefined}>
              <FieldLabel htmlFor="login-username">用户名</FieldLabel>
              <Input
                id="login-username"
                autoComplete="username"
                aria-invalid={errors.username ? true : undefined}
                aria-describedby={errors.username ? "login-username-error" : undefined}
                {...register("username")}
              />
              <FieldError id="login-username-error" errors={errors.username ? [errors.username] : undefined} />
            </Field>

            <Field data-invalid={errors.password ? true : undefined}>
              <FieldLabel htmlFor="login-password">密码</FieldLabel>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                {...register("password")}
              />
              <FieldError id="login-password-error" errors={errors.password ? [errors.password] : undefined} />
            </Field>

            <Field data-invalid={errors.captcha_code ? true : undefined}>
              <FieldLabel htmlFor="login-captcha">验证码</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="login-captcha"
                  className="flex-1"
                  autoComplete="off"
                  aria-invalid={errors.captcha_code ? true : undefined}
                  aria-describedby={errors.captcha_code ? "login-captcha-error" : undefined}
                  {...register("captcha_code")}
                />
                {/* 换一张验证码就重挂载，顺带清掉上一张的图片解码失败状态 */}
                <CaptchaPreview key={captchaKey ?? "none"} status={captchaStatus} image={captcha.data?.image} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="刷新验证码"
                  disabled={captcha.isFetching}
                  onClick={() => void captcha.refetch()}
                >
                  <ArrowsClockwiseIcon aria-hidden="true" />
                </Button>
              </div>
              <FieldError id="login-captcha-error" errors={errors.captcha_code ? [errors.captcha_code] : undefined} />
            </Field>
          </FieldGroup>

          {formError ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <Button type="submit" className="mt-6 w-full" disabled={loginMutation.isPending || !captchaKey}>
            {loginMutation.isPending ? (
              <>
                <Spinner data-icon="inline-start" aria-hidden="true" />
                正在登录
              </>
            ) : (
              <>
                <SignInIcon data-icon="inline-start" aria-hidden="true" />
                登录
              </>
            )}
          </Button>
        </form>
      </div>
    </main>
  )
}
