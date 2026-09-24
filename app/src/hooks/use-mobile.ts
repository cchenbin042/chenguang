import * as React from "react"

// 管理后台以桌面为主：1024px 及以上固定侧栏，以下改用 Sheet 抽屉
const MOBILE_BREAKPOINT = 1024
const mobileQuery = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(mobileQuery)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

function getSnapshot() {
  return window.matchMedia(mobileQuery).matches
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
