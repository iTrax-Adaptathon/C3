import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Redis } from "ioredis";

export type ReleaseLockFn = () => Promise<void>;

@Injectable()
export class LockService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LockService.name);
  private redisClient: Redis | null = null;
  private inMemoryLocks = new Map<string, Promise<void>>();
  private lockResolvers = new Map<string, () => void>();

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    try {
      const client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
        enableOfflineQueue: false
      });

      client
        .connect()
        .then(() => {
          this.redisClient = client;
          this.logger.log(`Connected to Redis distributed lock provider at ${redisUrl}`);
        })
        .catch(() => {
          this.logger.warn(
            `Redis not available at ${redisUrl}. Falling back to internal async mutex lock.`
          );
          this.redisClient = null;
        });

      client.on("error", () => {
        // Suppress continuous unhandled reconnection errors when Redis is not running
        this.redisClient = null;
      });
    } catch {
      this.redisClient = null;
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {
        // ignore
      }
    }
  }

  /**
   * Acquires a lock on an array of resources (e.g. gates, crews) to serialize concurrent
   * allocation and commit operations.
   */
  public async acquireLock(resources: string[], ttlMs = 10000): Promise<ReleaseLockFn> {
    const sorted = [...new Set(resources)].sort();
    const lockToken = `lock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (this.redisClient && this.redisClient.status === "ready") {
      // Redlock style multi-resource acquisition
      const acquiredKeys: string[] = [];
      try {
        for (const resource of sorted) {
          const key = `c3:lock:${resource}`;
          const result = await this.redisClient.set(key, lockToken, "PX", ttlMs, "NX");
          if (result !== "OK") {
            throw new Error(`Failed to acquire Redis lock for resource: ${resource}`);
          }
          acquiredKeys.push(key);
        }

        return async () => {
          if (!this.redisClient) return;
          for (const key of acquiredKeys) {
            try {
              // Release lock only if token matches
              const script = `
                if redis.call("get", KEYS[1]) == ARGV[1] then
                  return redis.call("del", KEYS[1])
                else
                  return 0
                end
              `;
              await this.redisClient.eval(script, 1, key, lockToken);
            } catch {
              // ignore release error
            }
          }
        };
      } catch (err) {
        // Cleanup partially acquired keys
        for (const key of acquiredKeys) {
          try {
            await this.redisClient.del(key);
          } catch {
            // ignore
          }
        }
        throw err;
      }
    }

    // In-memory mutex serialization for local standalone dev/tests
    const releaseFns: (() => void)[] = [];
    for (const resource of sorted) {
      while (this.inMemoryLocks.has(resource)) {
        await this.inMemoryLocks.get(resource);
      }

      let resolveNext: () => void = () => {};
      const promise = new Promise<void>((resolve) => {
        resolveNext = resolve;
      });
      this.inMemoryLocks.set(resource, promise);
      this.lockResolvers.set(resource, resolveNext);

      releaseFns.push(() => {
        const resolve = this.lockResolvers.get(resource);
        this.inMemoryLocks.delete(resource);
        this.lockResolvers.delete(resource);
        if (resolve) resolve();
      });
    }

    return async () => {
      for (const fn of releaseFns) {
        fn();
      }
    };
  }

  /**
   * Helper to run an action within a scoped resource lock.
   */
  public async withLock<T>(
    resources: string[],
    action: () => Promise<T>,
    ttlMs = 10000
  ): Promise<T> {
    const release = await this.acquireLock(resources, ttlMs);
    try {
      return await action();
    } finally {
      await release();
    }
  }
}
