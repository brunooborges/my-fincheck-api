import { DEFAULT_ORIGINS, readServerConfig } from './server-config';

describe('readServerConfig', () => {
  it('uses safe defaults when nothing is set', () => {
    const config = readServerConfig({});

    expect(config.port).toBe(3000);
    expect(config.allowedOrigins).toEqual(DEFAULT_ORIGINS);
    expect(config.trustProxy).toBe(1);
  });

  it('only allows the hosted front end and local development by default, never every origin', () => {
    expect(DEFAULT_ORIGINS).toContain('https://brunooborges.github.io');
    expect(DEFAULT_ORIGINS).not.toContain('*');
  });

  it('reads the port, origins and proxy count from the environment', () => {
    const config = readServerConfig({
      PORT: '10000',
      ALLOWED_ORIGINS: 'https://a.example, https://b.example ,',
      TRUST_PROXY: '2',
    });

    expect(config.port).toBe(10000);
    expect(config.allowedOrigins).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
    expect(config.trustProxy).toBe(2);
  });

  it('falls back to the default port when PORT is not a number', () => {
    expect(readServerConfig({ PORT: 'abc' }).port).toBe(3000);
    expect(readServerConfig({ PORT: '0' }).port).toBe(3000);
  });

  it('falls back to one proxy hop when TRUST_PROXY is not a whole number', () => {
    expect(readServerConfig({ TRUST_PROXY: 'lots' }).trustProxy).toBe(1);
    expect(readServerConfig({ TRUST_PROXY: '-1' }).trustProxy).toBe(1);
    expect(readServerConfig({ TRUST_PROXY: '0' }).trustProxy).toBe(0);
  });

  it('refuses a wildcard origin, which would undo the restriction', () => {
    const config = readServerConfig({ ALLOWED_ORIGINS: '*' });

    expect(config.allowedOrigins).toEqual(DEFAULT_ORIGINS);
  });
});
