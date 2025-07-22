import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import Redis from 'redis';
import { redisConnectionConfig } from '../config/redis.config';
import 'dotenv/config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private redisClient: Redis.RedisClientType;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.redisClient = Redis.createClient(redisConnectionConfig);
    this.redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    this.redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  // Cache Manager methods (easier to use)
  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    return this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    return this.cacheManager.del(key);
  }

  async reset(): Promise<void> {
    return this.cacheManager.reset();
  }

  // Direct Redis client methods (for advanced operations)
  async getClient(): Promise<Redis.RedisClientType> {
    if (!this.redisClient.isOpen) {
      await this.redisClient.connect();
    }
    return this.redisClient;
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<number> {
    const client = await this.getClient();
    return client.hSet(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | undefined> {
    const client = await this.getClient();
    return client.hGet(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const client = await this.getClient();
    return client.hGetAll(key);
  }

  async hdel(key: string, field: string): Promise<number> {
    const client = await this.getClient();
    return client.hDel(key, field);
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    const client = await this.getClient();
    return client.lPush(key, values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    const client = await this.getClient();
    return client.rPush(key, values);
  }

  async lpop(key: string): Promise<string | null> {
    const client = await this.getClient();
    return client.lPop(key);
  }

  async rpop(key: string): Promise<string | null> {
    const client = await this.getClient();
    return client.rPop(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = await this.getClient();
    return client.lRange(key, start, stop);
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    const client = await this.getClient();
    return client.sAdd(key, members);
  }

  async smembers(key: string): Promise<string[]> {
    const client = await this.getClient();
    return client.sMembers(key);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const client = await this.getClient();
    return client.sRem(key, members);
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    const client = await this.getClient();
    return client.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const client = await this.getClient();
    await client.subscribe(channel, callback);
  }

  async unsubscribe(channel?: string): Promise<void> {
    const client = await this.getClient();
    await client.unsubscribe(channel);
  }

  // Utility methods
  async exists(key: string): Promise<boolean> {
    const client = await this.getClient();
    return (await client.exists(key)) === 1;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const client = await this.getClient();
    return (await client.expire(key, seconds)) === 1;
  }

  async ttl(key: string): Promise<number> {
    const client = await this.getClient();
    return client.ttl(key);
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    const client = await this.getClient();
    return client.keys(pattern);
  }
}