import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon, SpinnerIcon } from "@phosphor-icons/react";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      {...props}
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CheckCircleIcon strokeWidth={2} className="size-4" />
        ),
        info: (
          <InfoIcon strokeWidth={2} className="size-4" />
        ),
        warning: (
          <WarningIcon strokeWidth={2} className="size-4" />
        ),
        error: (
          <XCircleIcon strokeWidth={2} className="size-4" />
        ),
        loading: (
          <SpinnerIcon strokeWidth={2} className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
    />
  )
}

export { Toaster }
