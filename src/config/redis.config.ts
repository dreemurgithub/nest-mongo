import { CacheModuleOptions } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import 'dotenv/config';

export const redisConfig: CacheModuleOptions = {
  store: redisStore as any,
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  ttl: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes default
  max: parseInt(process.env.CACHE_MAX_ITEMS || '100'),
  
  // Connection options
  connectTimeout: 10000,
  lazyConnect: true,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  
  // Optional: Enable keyspace events for expiration
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'nest:',
};

export const redisConnectionConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  connectTimeout: 10000,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};