import { Redirect } from 'expo-router';

import { useApp } from '@/store/app';

/** Punto de entrada: manda a cada quien a su inicio según el modo elegido. */
export default function Entry() {
  const { state } = useApp();
  if (state.role === 'vecino') return <Redirect href="/cliente" />;
  if (state.role === 'negocio') return <Redirect href="/panel" />;
  if (state.role === 'repartidor') return <Redirect href="/repartidor" />;
  return <Redirect href="/bienvenida" />;
}
