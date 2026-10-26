import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import aitDevtools from "@apps-in-toss/devtools/unplugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [aitDevtools.vite(), react()],
  server: {
    // 개발 중에는 /api 요청을 지원금 서버(npm run server)로 넘긴다.
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
})
