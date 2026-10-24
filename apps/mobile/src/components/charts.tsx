import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';

export type Column = { key: string; label: string; value: number; muted?: boolean };

/**
 * Columnas de una sola serie. Al tocar una columna se muestra su valor arriba.
 * Las etiquetas del eje se espacian para que no se encimen (cada `labelEvery`).
 */
export function ColumnChart({
  data,
  selected,
  onSelect,
  height = 140,
  color = Brand.chile,
  activeColor = Brand.chileDark,
  labelEvery = 1,
  describe,
}: {
  data: Column[];
  selected?: string;
  onSelect: (key: string) => void;
  height?: number;
  color?: string;
  activeColor?: string;
  labelEvery?: number;
  describe: (c: Column) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const sel = data.find((d) => d.key === selected);
  return (
    <View>
      <View style={styles.tooltipRow}>
        {sel ? (
          <Text style={styles.tooltip} accessibilityLiveRegion="polite">
            {describe(sel)}
          </Text>
        ) : (
          <Text style={styles.hint}>Toca una barra para ver el detalle</Text>
        )}
      </View>
      <View style={[styles.plot, { height }]}>
        {[0.5, 1].map((g) => (
          <View key={g} style={[styles.grid, { bottom: height * g }]} />
        ))}
        {data.map((d) => {
          const on = d.key === selected;
          const h = d.value === 0 ? 2 : Math.max(4, (d.value / max) * (height - 8));
          return (
            <Pressable
              key={d.key}
              onPress={() => onSelect(d.key)}
              accessibilityRole="button"
              accessibilityLabel={describe(d)}
              style={styles.hit}>
              <View
                style={[
                  styles.bar,
                  { height: h, backgroundColor: d.value === 0 ? Brand.line : on ? activeColor : color, opacity: d.muted ? 0.35 : 1 },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axis}>
        {data.map((d, i) => (
          <Text key={d.key} style={[styles.axisLabel, d.key === selected && { color: Brand.ink, fontWeight: '800' }]} numberOfLines={1}>
            {i % labelEvery === 0 || d.key === selected ? d.label : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Fila con barra horizontal: etiqueta a la izquierda, valor a la derecha. */
export function BarRow({
  label,
  value,
  max,
  right,
  color = Brand.chile,
  sub,
}: {
  label: string;
  value: number;
  max: number;
  right: string;
  color?: string;
  sub?: string;
}) {
  const pct = max > 0 ? Math.max(value > 0 ? 3 : 0, (value / max) * 100) : 0;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${right}${sub ? `, ${sub}` : ''}`}>
      <View style={styles.rowTop}>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.rowValue}>{right}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tooltipRow: { height: 26, justifyContent: 'center' },
  tooltip: { alignSelf: 'flex-start', backgroundColor: Brand.ink, color: Brand.white, fontWeight: '700', fontSize: 13, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  hint: { color: Brand.inkMuted, fontSize: 12 },
  plot: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 },
  grid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: Brand.line },
  hit: { flex: 1, height: '100%', justifyContent: 'flex-end', paddingHorizontal: 1 },
  bar: { borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 2 },
  axis: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Brand.inkMuted, paddingTop: 4 },
  axisLabel: { flex: 1, fontSize: 10, color: Brand.inkSoft, textAlign: 'center' },
  row: { gap: 6 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  rowLabel: { flex: 1, fontSize: 14, color: Brand.ink, fontWeight: '600' },
  rowValue: { fontSize: 14, color: Brand.ink, fontWeight: '800' },
  track: { height: 10, borderRadius: 5, backgroundColor: Brand.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  rowSub: { fontSize: 12, color: Brand.inkSoft },
});
