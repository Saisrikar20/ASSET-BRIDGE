export function localFetch(method: string, path: string, headers: Record<string, string>, body: unknown): Promise<{ status: number; body: any }>;
