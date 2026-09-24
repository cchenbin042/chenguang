import { type ReactNode, useId } from "react"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import { Input } from "@/components/ui/input"

type DataToolbarProps = {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  children?: ReactNode
}

export function DataToolbar({ searchValue, onSearchChange, searchPlaceholder = "搜索", children }: DataToolbarProps) {
  const searchId = useId()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1 sm:max-w-xs">
        <label className="sr-only" htmlFor={searchId}>{searchPlaceholder}</label>
        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
        <Input id={searchId} type="search" value={searchValue} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} className="pl-8" />
      </div>
      {children}
    </div>
  )
}
