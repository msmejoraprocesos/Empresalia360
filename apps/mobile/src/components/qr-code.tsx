import createQr from 'qrcode-generator';
import { useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/** Código QR dibujado con SVG (sin dependencias nativas). */
export function QrCode({ value, size = 220, color = Brand.ink }: { value: string; size?: number; color?: string }) {
  const { count, cells } = useMemo(() => {
    const qr = createQr(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const dark: { r: number; c: number }[] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) dark.push({ r, c });
    return { count: n, cells: dark };
  }, [value]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`} accessibilityLabel="Código QR">
      <Rect x={0} y={0} width={count} height={count} fill={Brand.white} />
      {cells.map(({ r, c }) => (
        <Rect key={`${r}-${c}`} x={c} y={r} width={1.02} height={1.02} fill={color} />
      ))}
    </Svg>
  );
}
