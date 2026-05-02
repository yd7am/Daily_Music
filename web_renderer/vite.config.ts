import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    fs: {
      allow: [projectRoot, repoRoot],
    },
  },
});
