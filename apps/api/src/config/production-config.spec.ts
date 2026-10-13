import {
  findProductionConfigProblems,
  parseTrustProxy,
  swaggerEnabled,
} from './production-config.js';

const GOOD_ENV = {
  NODE_ENV: 'production',
  JWT_SECRET: 'x'.repeat(48),
  WEB_URL: 'https://book.example.com',
  SMTP_HOST: 'smtp.example.com',
};

describe('findProductionConfigProblems', () => {
  it('accepts a complete production configuration', () => {
    expect(findProductionConfigProblems(GOOD_ENV)).toEqual([]);
  });

  it('checks nothing outside production, so local dev keeps working with defaults', () => {
    expect(findProductionConfigProblems({})).toEqual([]);
    expect(
      findProductionConfigProblems({
        NODE_ENV: 'development',
        JWT_SECRET: 'a',
      }),
    ).toEqual([]);
  });

  it('rejects a missing, short or placeholder JWT secret', () => {
    for (const secret of [
      undefined,
      '',
      'short',
      'change-me-to-a-long-random-string'.padEnd(40, '!'),
    ]) {
      const problems = findProductionConfigProblems({
        ...GOOD_ENV,
        JWT_SECRET: secret,
      });
      expect(problems.join('\n')).toContain('JWT_SECRET');
    }
  });

  it('rejects a WEB_URL that is missing or points at localhost, since emails would link there', () => {
    for (const url of [
      undefined,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]) {
      const problems = findProductionConfigProblems({
        ...GOOD_ENV,
        WEB_URL: url,
      });
      expect(problems.join('\n')).toContain('WEB_URL');
    }
  });

  it('rejects a missing or local SMTP host, since emails would silently go nowhere', () => {
    for (const host of [undefined, 'localhost', '127.0.0.1']) {
      const problems = findProductionConfigProblems({
        ...GOOD_ENV,
        SMTP_HOST: host,
      });
      expect(problems.join('\n')).toContain('SMTP_HOST');
    }
  });

  it('reports every problem at once instead of one per restart', () => {
    const problems = findProductionConfigProblems({ NODE_ENV: 'production' });
    expect(problems).toHaveLength(3);
  });
});

describe('swaggerEnabled', () => {
  it('is on in development and off in production', () => {
    expect(swaggerEnabled({})).toBe(true);
    expect(swaggerEnabled({ NODE_ENV: 'production' })).toBe(false);
  });

  it('can be switched on in production on purpose', () => {
    expect(
      swaggerEnabled({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }),
    ).toBe(true);
  });
});

describe('parseTrustProxy', () => {
  it('trusts nothing by default, so a client cannot fake its IP', () => {
    expect(parseTrustProxy(undefined)).toBeUndefined();
    expect(parseTrustProxy('')).toBeUndefined();
  });

  it('reads a number as the count of proxies in front of the API', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy('2')).toBe(2);
  });

  it('passes other values through for Express to interpret', () => {
    expect(parseTrustProxy('loopback')).toBe('loopback');
  });
});
