/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_OAUTH_CLIENT_ID?: string
    readonly VITE_OAUTH_TENANT_ID?: string
    readonly VITE_OAUTH_REDIRECT_URI?: string
    readonly VITE_OAUTH_SCOPE?: string
    readonly VITE_API_URL?: string
    readonly VITE_BASE_PATH?: string
    readonly VITE_ENABLE_ENTRA_AUTH?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}
