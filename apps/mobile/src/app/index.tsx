import { Redirect } from 'expo-router';

import { useApp } from '@/store/app';

/** Punto de entrada: manda a cada quien a su inicio según el modo elegido. */
export default function Entry() {
  const { state } = useApp();
  if (state.role === 'vecino') return <Redirect href={state.worldChosen ? '/cliente' : '/mundo'} />;
  if (state.role === 'negocio') return <Redirect href="/panel" />;
  return <Redirect href="/bienvenida" />;
}
