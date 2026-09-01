/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APPLE_SIGN_IN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
