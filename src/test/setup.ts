import { afterEach } from 'vitest';

// ponytail: RTL only loads where a DOM exists; the 41 node-env test files skip it
if (typeof document !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  afterEach(cleanup);
}
