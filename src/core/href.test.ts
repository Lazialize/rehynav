import { resolveHref, stripBasePath, withBasePath } from './href.js';

describe('resolveHref', () => {
  it('returns string hrefs unchanged', () => {
    expect(resolveHref('/posts/1')).toBe('/posts/1');
  });

  it('substitutes dynamic params in object hrefs', () => {
    expect(resolveHref({ pathname: '/posts/[id]', params: { id: 42 } })).toBe('/posts/42');
  });

  it('joins deep dynamic params with slashes', () => {
    expect(resolveHref({ pathname: '/files/[...path]', params: { path: ['a', 'b'] } })).toBe(
      '/files/a/b',
    );
  });

  it('appends leftover params as a query string', () => {
    expect(resolveHref({ pathname: '/posts/[id]', params: { id: 1, ref: 'home' } })).toBe(
      '/posts/1?ref=home',
    );
  });

  it('drops null/undefined params', () => {
    expect(resolveHref({ pathname: '/x', params: { a: undefined, b: null } })).toBe('/x');
  });
});

describe('withBasePath / stripBasePath', () => {
  it('is a no-op without a base path', () => {
    expect(withBasePath('/a', '')).toBe('/a');
    expect(stripBasePath('/a', '')).toBe('/a');
  });

  it('prefixes and strips the base path', () => {
    expect(withBasePath('/a?x=1', '/app')).toBe('/app/a?x=1');
    expect(stripBasePath('/app/a', '/app')).toBe('/a');
  });

  it('maps the bare base path to root', () => {
    expect(stripBasePath('/app', '/app')).toBe('/');
  });

  it('leaves unrelated paths untouched when stripping', () => {
    expect(stripBasePath('/other', '/app')).toBe('/other');
  });
});
