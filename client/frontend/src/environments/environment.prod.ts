const runtimeApiUrl = (
  globalThis as unknown as { __APP_CONFIG__?: { apiUrl?: string } }
).__APP_CONFIG__?.apiUrl;

export const environment = {
  production: true,
  apiUrl: runtimeApiUrl ?? 'https://REPLACE-WITH-YOUR-BACKEND-URL',
  demo: true,
};
