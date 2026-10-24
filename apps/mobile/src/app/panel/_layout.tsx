import { Tabs } from 'expo-router';

import { makeTabBar } from '@/components/tab-bar';

const TabBar = makeTabBar([
  { name: 'index', label: 'Inicio', icon: 'home-outline', iconActive: 'home' },
  { name: 'pedidos', label: 'Solicitudes', icon: 'mail-outline', iconActive: 'mail' },
  { name: 'comunidad', label: 'Comunidad', icon: 'megaphone', iconActive: 'megaphone', center: true },
  { name: 'resenas', label: 'Reseñas', icon: 'star-outline', iconActive: 'star' },
  { name: 'mas', label: 'Más', icon: 'menu-outline', iconActive: 'menu' },
]);

export default function ProfesionalLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={TabBar}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="pedidos" />
      <Tabs.Screen name="comunidad" />
      <Tabs.Screen name="resenas" />
      <Tabs.Screen name="mas" />
      <Tabs.Screen name="cobrar" />
    </Tabs>
  );
}
