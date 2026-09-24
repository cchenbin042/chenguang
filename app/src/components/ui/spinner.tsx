import { cn } from "cn"
import { SpinnerIcon } from "@phosphor-icons/react";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <SpinnerIcon strokeWidth={2} data-slot="spinner" role="status" aria-label="加载中" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
