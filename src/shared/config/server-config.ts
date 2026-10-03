export const DEFAULT_PORT = 3000;

/** The hosted front end and local development. Never a wildcard. */
export const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://brunooborges.github.io',
];

export interface ServerConfig {
  port: number;
  allowedOrigins: string[];
  /** Proxies in front of the API (the host's load balancer is one), so the visitor's real address is used. */
  trustProxy: number;
}

function toPort(value: string | undefined): number {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT;
}

function toCount(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : fallback;
}

function toOrigins(value: string | undefined): string[] {
  if (!value) {
    return DEFAULT_ORIGINS;
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // A wildcard would undo the whole restriction, so it is refused rather than obeyed.
  return origins.length === 0 || origins.includes('*')
    ? DEFAULT_ORIGINS
    : origins;
}

/** What the server reads from the environment (besides the database and the token secret). */
export function readServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  return {
    port: toPort(env.PORT),
    allowedOrigins: toOrigins(env.ALLOWED_ORIGINS),
    trustProxy: toCount(env.TRUST_PROXY, 1),
  };
}
