import { setupServer } from "msw/node"
import { handlers } from "./handlers"

/** 测试用 MSW 服务端，生命周期在 src/test/setup.ts 中统一管理 */
export const server = setupServer(...handlers)

export { http, HttpResponse } from "msw"
