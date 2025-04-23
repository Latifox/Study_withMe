import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Étend les assertions expect avec les matchers de testing-library
expect.extend(matchers);

// Nettoie automatiquement après chaque test
afterEach(() => {
  cleanup();
}); 