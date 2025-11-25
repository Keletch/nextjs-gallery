import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Initialise a single Redis client for the whole app.
// Credentials are read from environment variables.
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

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
    const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(limit, `${windowSec}s`),
    });

    const { success } = await ratelimit.limit(ip);
    return success;
}
