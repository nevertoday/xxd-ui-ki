import { defineConfig } from "vitest/config";
// 测试文件按顺序跑：好几个测试都会构建（buildAll 会重建 dist），并行会互相删掉对方的文件
export default defineConfig({ test: { environment: "happy-dom", setupFiles: ["./test/setup.mjs"], fileParallelism: false } });
