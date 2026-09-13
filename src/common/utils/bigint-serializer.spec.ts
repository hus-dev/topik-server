import './bigint-serializer';

describe('BigInt Serializer', () => {
  it('should serialize BigInt in an object to string', () => {
    const data = {
      id: '1',
      created_at: BigInt('1741852400000'),
      nested: {
        timestamp: BigInt('1234567890123456789'),
      },
    };

    const jsonString = JSON.stringify(data);
    const parsed = JSON.parse(jsonString);

    expect(parsed.created_at).toBe('1741852400000');
    expect(parsed.nested.timestamp).toBe('1234567890123456789');
  });

  it('should serialize BigInt in an array to string', () => {
    const list = [BigInt('100'), BigInt('200')];
    const jsonString = JSON.stringify(list);
    const parsed = JSON.parse(jsonString);

    expect(parsed).toEqual(['100', '200']);
  });
});
