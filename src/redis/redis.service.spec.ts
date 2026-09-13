import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { Readable } from 'stream';

describe('RedisService', () => {
  let service: RedisService;
  let mockConfigService: Partial<ConfigService>;
  let mockRedisClient: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'REDIS_HOST') return 'localhost';
        if (key === 'REDIS_PORT') return 6379;
        return defaultValue;
      }),
    };

    service = new RedisService(mockConfigService as ConfigService);

    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn(),
      scanStream: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
    };

    (service as any).client = mockRedisClient;
  });

  describe('invalidatePattern', () => {
    it('should use scanStream instead of keys and delete matched keys in batches', async () => {
      const matchedBatches = [
        ['key1', 'key2'],
        ['key3'],
      ];

      const stream = Readable.from(matchedBatches);
      mockRedisClient.scanStream.mockReturnValue(stream);

      await service.invalidatePattern('questions:list:*');

      expect(mockRedisClient.keys).not.toHaveBeenCalled();
      expect(mockRedisClient.scanStream).toHaveBeenCalledWith({
        match: 'questions:list:*',
        count: 100,
      });

      expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });

    it('should not call del if scanStream yields no keys', async () => {
      const stream = Readable.from([]);
      mockRedisClient.scanStream.mockReturnValue(stream);

      await service.invalidatePattern('questions:list:*');

      expect(mockRedisClient.keys).not.toHaveBeenCalled();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if present', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({ foo: 'bar' }));

      const fetchFn = jest.fn();
      const result = await service.getOrSet('test-key', fetchFn, 300);

      expect(result).toEqual({ foo: 'bar' });
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and cache value if missing in cache', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const fetchFn = jest.fn().mockResolvedValue({ hello: 'world' });

      const result = await service.getOrSet('test-key', fetchFn, 300);

      expect(result).toEqual({ hello: 'world' });
      expect(fetchFn).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ hello: 'world' }),
        'EX',
        300,
      );
    });
  });
});
