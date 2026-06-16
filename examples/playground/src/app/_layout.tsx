import { Stack } from 'rehynav';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Playground' }} />
      <Stack.Screen name="detail/[id]" options={{ title: 'Detail' }} />
      <Stack.Screen name="probes" options={{ title: 'Probes' }} />
    </Stack>
  );
}
