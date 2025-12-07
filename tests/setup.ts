/**
 * Jest test setup file
 * Runs before all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Suppress console output in tests unless debugging
if (process.env.DEBUG !== 'true') {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
}
