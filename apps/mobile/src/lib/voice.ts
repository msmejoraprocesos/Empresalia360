import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/** Lee en voz alta (español de México). Si ya está hablando, primero se calla. */
export function speak(text: string) {
  Speech.stop();
  Speech.speak(text, { language: 'es-MX', rate: Platform.OS === 'web' ? 0.95 : 0.9 });
}

export function stopSpeaking() {
  Speech.stop();
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

function makeRecognition(): Recognition | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Buscar hablando: en el navegador usa el reconocimiento de voz del teléfono. */
export function useVoiceSearch(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string>();
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  useEffect(() => {
    cb.current = onText;
  }, [onText]);
  const supported = Platform.OS === 'web' && typeof window !== 'undefined' && Boolean((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition);

  const start = useCallback(() => {
    const r = makeRecognition();
    if (!r) {
      setError('Tu teléfono no permite buscar con la voz aquí. Escribe o toca un dibujo.');
      return;
    }
    setError(undefined);
    r.lang = 'es-MX';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript;
      if (t) cb.current(t);
    };
    r.onerror = (e) => setError(e.error === 'not-allowed' ? 'Permite el micrófono para buscar con tu voz.' : 'No te escuché bien. Intenta de nuevo.');
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }, []);

  const stop = useCallback(() => {
    rec.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, error, start, stop };
}
