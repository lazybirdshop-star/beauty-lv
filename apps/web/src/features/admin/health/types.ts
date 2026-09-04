export interface PlatformHealth {
  database: 'ok';
  /* Два поля ниже приходят не от всякого API: веб и API выкатываются
     раздельно, и до выката сервера отклик и время проверки не показываются. */
  databaseLatencyMs?: number;
  checkedAt?: string;
  mail: { configured: boolean };
  push: {
    configured: boolean;
    admins: number;
    adminsReachable: number;
    subscriptions: number;
  };
  queue: { pendingRequests: number };
  jobs: { pending: number; running: number; failed: number };
  activity: { bookingsLast24h: number };
}
