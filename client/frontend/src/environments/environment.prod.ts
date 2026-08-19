const runtimeApiUrl = (
  globalThis as unknown as { __APP_CONFIG__?: { apiUrl?: string } }
).__APP_CONFIG__?.apiUrl;

export const environment = {
  production: true,
  apiUrl: runtimeApiUrl ?? 'http://192.168.137.238:5150/api',
  demo: true,
  relayUrl: 'http://192.168.137.238:5150/gameHub',
  relayWssUrl: 'http://192.168.137.238:5150/gameHub',
};
