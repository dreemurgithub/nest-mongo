import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as Redis from 'redis';
import { redisConnectionConfig } from '../config/redis.config';
import 'dotenv/config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private redisClient: Redis.RedisClientType;

  constructor() {
    this.redisClient = Redis.createClient(redisConnectionConfig);
    this.redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    this.redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });
    
    // Connect immediately on startup
    this.initializeConnection();
  }

  private async initializeConnection(): Promise<void> {
    try {
      if (!this.redisClient.isOpen) {
        await this.redisClient.connect();
      }
      await this.redisClient.ping();
      console.log('Redis connection initialized successfully');
      console.log(redisConnectionConfig);
    } catch (error) {
      console.error('Redis connection initialization failed:', error);
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  // Cache Manager methods (easier to use)
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const result = await this.redisClient.get(key);
      return result ? JSON.parse(result) : undefined;
    } catch (error) {
      console.error('Redis get error:', error);
      return undefined;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.redisClient.setEx(key, ttl, serializedValue);
      } else {
        await this.redisClient.set(key, serializedValue);
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<number> {
    return this.redisClient.hSet(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | undefined> {
    const result = await this.redisClient.hGet(key, field);
    return result ?? undefined;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redisClient.hGetAll(key);
  }

  async hdel(key: string, field: string): Promise<number> {
    return this.redisClient.hDel(key, field);
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.redisClient.lPush(key, values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.redisClient.rPush(key, values);
  }

  async lpop(key: string): Promise<string | undefined> {
    const result = await this.redisClient.lPop(key);
    return result ?? undefined;
  }

  async rpop(key: string): Promise<string | undefined> {
    const result = await this.redisClient.rPop(key);
    return result ?? undefined;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.redisClient.lRange(key, start, stop);
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.redisClient.sAdd(key, members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.redisClient.sMembers(key);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.redisClient.sRem(key, members);
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    return this.redisClient.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.redisClient.subscribe(channel, callback);
  }

  async unsubscribe(channel?: string): Promise<void> {
    await this.redisClient.unsubscribe(channel);
  }

  // Utility methods
  async exists(key: string): Promise<boolean> {
    return (await this.redisClient.exists(key)) === 1;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    return (await this.redisClient.expire(key, seconds)) === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.redisClient.ttl(key);
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    return this.redisClient.keys(pattern);
  }
}