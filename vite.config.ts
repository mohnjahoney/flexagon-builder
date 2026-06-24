import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Relative asset URLs work both at a custom domain and under /flexagon-builder/.
  base: "./",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
});
