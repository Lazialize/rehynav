import { describe, expect, it } from 'vitest';
import { overlay, screen, stack, tab } from './route-helpers.js';

const DummyComponent: React.FC = () => null;

describe('tab', () => {
  it('creates a tab definition', () => {
    const def = tab('home', DummyComponent);
    expect(def._tag).toBe('tab');
    expect(def.name).toBe('home');
    expect(def.component).toBe(DummyComponent);
    expect(def.children).toEqual([]);
  });

  it('creates a tab with children', () => {
    const child = stack('detail/:id', DummyComponent);
    const def = tab('home', DummyComponent, [child]);
    expect(def.children).toHaveLength(1);
    expect(def.children[0].path).toBe('detail/:id');
  });
});

describe('stack', () => {
  it('creates a stack definition', () => {
    const def = stack('detail/:id', DummyComponent);
    expect(def._tag).toBe('stack');
    expect(def.path).toBe('detail/:id');
  });

  it('accepts options', () => {
    const def = stack('detail/:id', DummyComponent, { transition: 'fade' });
    expect(def.options?.transition).toBe('fade');
  });
});

describe('screen', () => {
  it('creates a screen definition', () => {
    const def = screen('login', DummyComponent);
    expect(def._tag).toBe('screen');
    expect(def.name).toBe('login');
    expect(def.component).toBe(DummyComponent);
    expect(def.children).toEqual([]);
  });

  it('creates a screen with children', () => {
    const child = stack('signup', DummyComponent);
    const def = screen('login', DummyComponent, [child]);
    expect(def.children).toHaveLength(1);
    expect(def.children[0].path).toBe('signup');
  });
});

describe('overlay', () => {
  it('creates an overlay definition', () => {
    const def = overlay('login', DummyComponent);
    expect(def._tag).toBe('overlay');
    expect(def.name).toBe('login');
  });

  it('accepts options', () => {
    const def = overlay('share', DummyComponent, { transition: 'fade' });
    expect(def.options?.transition).toBe('fade');
  });
});
