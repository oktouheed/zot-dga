// Test setup file
require('dotenv').config({ path: '.env.test' });

// Mock console.log for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
