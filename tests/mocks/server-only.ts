// Test-only stand-in for the "server-only" package.
// Next.js strips real `server-only` imports via its bundler; under Vitest
// there's no bundler doing that, so we alias it to a no-op here.
export {};
