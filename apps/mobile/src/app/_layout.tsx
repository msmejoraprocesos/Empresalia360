import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Brand } from '@/constants/theme';
import { loadCatalog } from '@/data/remote';
import '@/lib/supabase';
import { AppProvider } from '@/store/app';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Carga negocios, catálogo y reseñas de Supabase antes de mostrar la app
    loadCatalog().finally(() => {
      setReady(true);
      SplashScreen.hideAsync();
    });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: Brand.chile, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <BrandLogo variant="claro" width={260} />
        <ActivityIndicator color={Brand.white} />
      </View>
    );
  }

  return (
    <AppProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Brand.tortilla } }} />
    </AppProvider>
  );
}

/** Si una pantalla falla, se muestra el error (para corregirlo) en lugar de cerrar la app. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: Brand.tortilla, padding: 24, paddingTop: 80, gap: 14 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: Brand.ink }}>Algo salió mal</Text>
      <Text style={{ color: Brand.inkSoft }}>Toma una captura de esta pantalla y mándala para corregirlo.</Text>
      <ScrollView style={{ flex: 1, backgroundColor: Brand.white, borderRadius: 12, padding: 12 }}>
        <Text selectable style={{ fontFamily: 'monospace', fontSize: 12, color: Brand.ink }}>
          {error.name}: {error.message}
          {'\n\n'}
          {String(error.stack ?? '').split('\n').slice(0, 12).join('\n')}
        </Text>
      </ScrollView>
      <Pressable onPress={retry} style={{ backgroundColor: Brand.chile, borderRadius: 16, padding: 16, alignItems: 'center' }}>
        <Text style={{ color: Brand.white, fontWeight: '800', fontSize: 16 }}>Reintentar</Text>
      </Pressable>
    </View>
  );
}
