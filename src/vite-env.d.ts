/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly GEMINI_API_KEY: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_NANO_BANANA_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    google: typeof google;
  }
}

export {};
