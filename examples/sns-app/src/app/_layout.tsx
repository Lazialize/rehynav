import { Redirect, Stack, useSegments } from 'rehynav';
import { useAuth } from '../auth';

/**
 * Root navigator. A standalone stack holds the auth screens and the modal-style
 * `new-post` route above the `(tabs)` group. Unauthenticated users are
 * redirected to the login flow.
 */
export default function RootLayout() {
  const { isAuthenticated } = useAuth();
  const segments = useSegments();
  const onAuthPage = segments[0] === 'login' || segments[0] === 'signup';

  return (
    <>
      {!isAuthenticated && !onAuthPage ? <Redirect href="/login" /> : null}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="new-post" options={{ headerShown: true, title: 'New Post' }} />
      </Stack>
    </>
  );
}
