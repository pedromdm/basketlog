import { Tabs } from 'expo-router';

// Games is the only section for now and it draws its own top bar (see TopBar), so the header and the bottom
// tab bar of the project template are off.
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
      <Tabs.Screen name="index" options={{ title: 'Games' }} />
    </Tabs>
  );
}
