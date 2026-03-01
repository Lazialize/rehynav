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

  it('logs error for function nested inside object', () => {
    process.env.NODE_ENV = 'development';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateSerializable({ data: { onComplete: () => {} } }, 'push("test")');

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('params.data.onComplete'));
  });

  it('logs error for function nested inside array', () => {
    process.env.NODE_ENV = 'development';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateSerializable({ items: [1, () => {}, 'ok'] }, 'push("test")');

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('params.items[1]'));
  });

  it('logs error for deeply nested non-serializable value', () => {
    process.env.NODE_ENV = 'development';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateSerializable({ a: { b: { c: () => {} } } }, 'push("test")');

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('params.a.b.c'));
  });

  it('logs error for Symbol values', () => {
    process.env.NODE_ENV = 'development';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateSerializable({ id: Symbol('test') } as Record<string, unknown>, 'push("test")');

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('params.id'));
  });

  it('logs error for bigint values', () => {
    process.env.NODE_ENV = 'development';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateSerializable({ count: BigInt(42) } as Record<string, unknown>, 'push("test")');

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('params.count'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('bigint'));
  });

  it('logs error for nested bigint values', () => {
    process.env.NODE_ENV = 'development';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateSerializable({ data: { id: BigInt(1) } } as Record<string, unknown>, 'push("test")');

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('params.data.id'));
  });

  it('logs multiple errors for multiple non-serializable values', () => {
    process.env.NODE_ENV = 'development';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateSerializable({ fn: () => {}, nested: { fn2: () => {} } }, 'push("test")');

    expect(errorSpy).toHaveBeenCalledTimes(2);
  });

  it('does not log for deeply nested serializable values', () => {
    process.env.NODE_ENV = 'development';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateSerializable({ a: { b: { c: 'hello', d: [1, 2, { e: true }] } } }, 'push("test")');

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
