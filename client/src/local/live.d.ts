export const LIVE_EVENT: string;
export function attachLive(): void;
export function push(userId: string, type: string, data: unknown): void;
