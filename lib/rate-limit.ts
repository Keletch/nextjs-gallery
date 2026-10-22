import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Initialise a single Redis client for the whole app.
// Credentials are read from environment variables.
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Reutilizar una instancia por configuración en lugar de crear una por request.
const limiters = new Map<string, Ratelimit>();

/**
 * Checks whether the given IP address is allowed to perform an action based on a rate limit.
 * @param ip - The client IP address (or any unique identifier).
 * @param limit - Maximum number of allowed actions within the window.
 * @param windowMs - Time window in milliseconds.
 * @returns `true` if the request is within the limit, `false` otherwise.
 */
export async function checkRateLimit(
    ip: string,
    limit: number,
    windowMs: number,
): Promise<boolean> {
    const windowSec = Math.ceil(windowMs / 1000);
    const key = `${limit}:${windowSec}`;
    let ratelimit = limiters.get(key);
    if (!ratelimit) {
        ratelimit = new Ratelimit({
            redis,
            // Ventana deslizante: cuenta los últimos N segundos reales (la fija permitía el doble
            // de solicitudes si caían justo en el cambio de ventana)
            limiter: Ratelimit.slidingWindow(limit, `${windowSec}s`),
            // Si Redis tarda, dejar pasar en vez de bloquear la subida
            timeout: 1500,
        });
        limiters.set(key, ratelimit);
    }

    // Si Redis no está disponible, dejar pasar: el límite es una protección contra abuso y no debe
    // tumbar las subidas (si Redis falla, sin esto todas las subidas respondían 500)
    try {
        const { success } = await ratelimit.limit(ip);
        return success;
    } catch (err) {
        console.error('[rate-limit] Redis no disponible, se permite la solicitud:', err instanceof Error ? err.message : err);
        return true;
    }
}
