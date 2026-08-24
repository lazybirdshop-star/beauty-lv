export interface PlatformHealth {
  database: 'ok';
  mail: { configured: boolean };
  push: {
    configured: boolean;
    admins: number;
    adminsReachable: number;
    subscriptions: number;
  };
  queue: { pendingRequests: number };
  activity: { bookingsLast24h: number };
}
