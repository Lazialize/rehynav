import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateSerializable, validateStackRoutes } from './validation.js';

describe('validateStackRoutes', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it('logs error for stack routes with unregistered tab prefix', () => {
    process.env.NODE_ENV = 'development';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateStackRoutes({ 'settings/detail': {}, 'home/detail': {} }, [
      'home',
      'search',
      'profile',
    ]);

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Stack route "settings/detail"'));
  });

  it('does not log for valid stack routes', () => {
    process.env.NODE_ENV = 'development';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateStackRoutes({ 'home/detail': {}, 'search/results': {} }, ['home', 'search', 'profile']);

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does nothing in production', () => {
    process.env.NODE_ENV = 'production';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateStackRoutes({ 'invalid/route': {} }, ['home']);

    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe('validateSerializable', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it('logs error for function values in params', () => {
    process.env.NODE_ENV = 'development';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateSerializable({ callback: () => {} }, 'push("test")');

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Non-serializable value'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('params.callback'));
  });

  it('does not log for serializable values', () => {
    process.env.NODE_ENV = 'development';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateSerializable({ str: 'hello', num: 42, bool: true, nil: null }, 'push("test")');

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does nothing in production', () => {
    process.env.NODE_ENV = 'production';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateSerializable({ callback: () => {} }, 'push("test")');

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
