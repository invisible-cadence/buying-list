import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// One build produces both halves of the app: the front end's files, and the
// Worker that serves them and answers API calls.
export default defineConfig({
  plugins: [react(), cloudflare()],
});
