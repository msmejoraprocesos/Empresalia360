import { Tabs } from 'expo-router';

import { OpeningAdHost } from '@/components/opening-ad';
import { makeTabBar } from '@/components/tab-bar';

const TabBar = makeTabBar([
  { name: 'index', label: 'Inicio', icon: 'home-outline', iconActive: 'home' },
  { name: 'explorar', label: 'Buscar', icon: 'search-outline', iconActive: 'search' },
  { name: 'comunidad', label: 'Comunidad', icon: 'people', iconActive: 'people', center: true },
  { name: 'pedidos', label: 'Mis citas', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'perfil', label: 'Perfil', icon: 'person-outline', iconActive: 'person' },
]);

export default function ClienteLayout() {
  return (
    <>
      <Tabs screenOptions={{ headerShown: false }} tabBar={TabBar}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="explorar" />
        <Tabs.Screen name="comunidad" />
        <Tabs.Screen name="pedidos" />
        <Tabs.Screen name="perfil" />
      </Tabs>
      <OpeningAdHost />
    </>
  );
}
