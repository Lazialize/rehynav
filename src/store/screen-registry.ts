export interface ScreenOptions {
  title?: string;
  transition?: 'push' | 'fade' | 'none';
  gestureEnabled?: boolean;
}

export interface ScreenRegistration {
  route: string;
  component: React.ComponentType<Record<string, unknown>>;
  options?: ScreenOptions;
}

export interface ScreenRegistry {
  screens: Map<string, ScreenRegistration>;
  register(registration: ScreenRegistration): void;
  unregister(route: string): void;
  get(route: string): ScreenRegistration | undefined;
}

export function createScreenRegistry(): ScreenRegistry {
  const screens = new Map<string, ScreenRegistration>();

  return {
    screens,

    register(registration: ScreenRegistration) {
      screens.set(registration.route, registration);
    },

    unregister(route: string) {
      screens.delete(route);
    },

    get(route: string) {
      return screens.get(route);
    },
  };
}
