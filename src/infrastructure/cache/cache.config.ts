import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    
    // Cluster configuration
    cluster: {
      enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
      nodes: process.env.REDIS_CLUSTER_NODES 
        ? process.env.REDIS_CLUSTER_NODES.split(',').map(node => {
            const [host, port] = node.split(':');
            return { host, port: parseInt(port, 10) };
          })
        : [{ host: 'localhost', port: 6379 }],
    },
    
    // Connection settings
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 10000,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
  },

  // Circuit breaker configuration
  circuitBreaker: {
    failureThreshold: parseInt(process.env.CACHE_CB_FAILURE_THRESHOLD, 10) || 5,
    recoveryTimeout: parseInt(process.env.CACHE_CB_RECOVERY_TIMEOUT, 10) || 60000, // 1 minute
    monitoringPeriod: parseInt(process.env.CACHE_CB_MONITORING_PERIOD, 10) || 300000, // 5 minutes
    halfOpenMaxCalls: parseInt(process.env.CACHE_CB_HALF_OPEN_MAX_CALLS, 10) || 3,
  },

  // Cache key configuration
  keyPrefix: process.env.CACHE_KEY_PREFIX || 'chat',
  keyVersion: process.env.CACHE_KEY_VERSION || 'v1',
  keySeparator: process.env.CACHE_KEY_SEPARATOR || ':',
  maxKeyLength: parseInt(process.env.CACHE_MAX_KEY_LENGTH, 10) || 250,

  // Default TTL values (in seconds)
  defaultTtl: {
    profile: parseInt(process.env.CACHE_PROFILE_TTL, 10) || 24 * 60 * 60, // 24 hours
    presence: parseInt(process.env.CACHE_PRESENCE_TTL, 10) || 30, // 30 seconds
    typing: parseInt(process.env.CACHE_TYPING_TTL, 10) || 5, // 5 seconds
    session: parseInt(process.env.CACHE_SESSION_TTL, 10) || 60 * 60, // 1 hour
    rateLimit: parseInt(process.env.CACHE_RATE_LIMIT_TTL, 10) || 60, // 1 minute
    staleMarker: parseInt(process.env.CACHE_STALE_MARKER_TTL, 10) || 5 * 60, // 5 minutes
  },

  // Performance settings
  performance: {
    maxLatencyMs: parseInt(process.env.CACHE_MAX_LATENCY_MS, 10) || 100,
    batchSize: parseInt(process.env.CACHE_BATCH_SIZE, 10) || 100,
    warmupEnabled: process.env.CACHE_WARMUP_ENABLED === 'true',
    metricsEnabled: process.env.CACHE_METRICS_ENABLED !== 'false',
  },

  // Distributed lock settings
  lock: {
    defaultTtl: parseInt(process.env.CACHE_LOCK_DEFAULT_TTL, 10) || 30, // 30 seconds
    retryDelay: parseInt(process.env.CACHE_LOCK_RETRY_DELAY, 10) || 100, // 100ms
    maxRetries: parseInt(process.env.CACHE_LOCK_MAX_RETRIES, 10) || 3,
  },

  // Health check settings
  health: {
    enabled: process.env.CACHE_HEALTH_ENABLED !== 'false',
    checkInterval: parseInt(process.env.CACHE_HEALTH_CHECK_INTERVAL, 10) || 30000, // 30 seconds
    thresholds: {
      maxWriteLatency: parseInt(process.env.CACHE_HEALTH_MAX_WRITE_LATENCY, 10) || 100, // 100ms
      maxReadLatency: parseInt(process.env.CACHE_HEALTH_MAX_READ_LATENCY, 10) || 50, // 50ms
      maxDeleteLatency: parseInt(process.env.CACHE_HEALTH_MAX_DELETE_LATENCY, 10) || 50, // 50ms
    },
  },

  // Monitoring and metrics
  monitoring: {
    metricsHistorySize: parseInt(process.env.CACHE_METRICS_HISTORY_SIZE, 10) || 10000,
    metricsRetentionMs: parseInt(process.env.CACHE_METRICS_RETENTION_MS, 10) || 60 * 60 * 1000, // 1 hour
    prometheusEnabled: process.env.CACHE_PROMETHEUS_ENABLED === 'true',
    logMetricsInterval: parseInt(process.env.CACHE_LOG_METRICS_INTERVAL, 10) || 5 * 60 * 1000, // 5 minutes
  },
}));