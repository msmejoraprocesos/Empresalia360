import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Radius, Shadow, ShadowStrong, Spacing } from '@/constants/theme';
import type { IconName } from '@/data/types';

// ─────────────────────────────────────────────────────────────
// Texto
// ─────────────────────────────────────────────────────────────
type TextProps = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };

export function Title({ children, style }: TextProps) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}
export function H2({ children, style }: TextProps) {
  return <Text style={[styles.h2, style]}>{children}</Text>;
}
export function Body({ children, style, numberOfLines }: TextProps) {
  return (
    <Text style={[styles.body, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}
export function Muted({ children, style, numberOfLines }: TextProps) {
  return (
    <Text style={[styles.muted, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────
// Encabezado con franja de color
// ─────────────────────────────────────────────────────────────
export function Header({
  title,
  subtitle,
  back = true,
  color = Brand.chile,
  right,
  children,
  extraBottom = 0,
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  color?: string;
  right?: ReactNode;
  children?: ReactNode;
  extraBottom?: number;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dark = color === Brand.ink;
  return (
    <View style={[styles.header, { backgroundColor: color, paddingTop: insets.top + 12, paddingBottom: 18 + extraBottom }]}>
      <View style={styles.headerRow}>
        {back ? (
          <RoundIconButton
            icon="chevron-back"
            label="Volver"
            bg={dark ? '#27324C' : 'rgba(0,0,0,0.16)'}
            color={Brand.white}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        ) : (
          <View style={{ width: 44 }} />
        )}
        <View style={{ flex: 1, alignItems: 'center' }}>
          {title ? <Text style={styles.headerTitle}>{title}</Text> : null}
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
        {right ?? <View style={{ width: 44 }} />}
      </View>
      {children}
    </View>
  );
}

export function RoundIconButton({
  icon,
  label,
  onPress,
  bg = Brand.white,
  color = Brand.ink,
  size = 44,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  bg?: string;
  color?: string;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        pressed && { opacity: 0.7 },
      ]}>
      <Ionicons name={icon} size={size * 0.45} color={color} />
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Botones
// ─────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'dark' | 'outline' | 'mango' | 'success' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
  small,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border, borderWidth: v.border ? 2 : 0 },
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
        style,
      ]}>
      {icon ? <Ionicons name={icon} size={small ? 16 : 19} color={v.fg} /> : null}
      <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: v.fg }]}>{label}</Text>
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: Brand.chile, fg: Brand.white },
  dark: { bg: Brand.ink, fg: Brand.white },
  outline: { bg: 'transparent', fg: Brand.ink, border: Brand.ink },
  mango: { bg: Brand.mango, fg: Brand.ink },
  success: { bg: Brand.nopal, fg: Brand.white },
  ghost: { bg: Brand.white, fg: Brand.ink, border: Brand.line },
};

/** Barra fija al pie con el botón principal de la pantalla. */
export function BottomBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>{children}</View>;
}

// ─────────────────────────────────────────────────────────────
// Contenedores
// ─────────────────────────────────────────────────────────────
export function Card({ children, style, strong }: { children: ReactNode; style?: StyleProp<ViewStyle>; strong?: boolean }) {
  return <View style={[styles.card, strong ? ShadowStrong : Shadow, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={10}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function IconCircle({
  icon,
  color,
  ink = Brand.white,
  size = 56,
  square,
  outline,
}: {
  icon: IconName;
  color: string;
  ink?: string;
  size?: number;
  square?: boolean;
  outline?: boolean;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: square ? size * 0.3 : size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: outline ? 2 : 0,
        borderColor: Brand.line,
      }}>
      <Ionicons name={icon} size={size * 0.46} color={ink} />
    </View>
  );
}

export function Chip({ label, color = Brand.line, ink = Brand.ink, icon }: { label: string; color?: string; ink?: string; icon?: IconName }) {
  return (
    <View style={[styles.chip, { backgroundColor: color }]}>
      {icon ? <Ionicons name={icon} size={13} color={ink} /> : null}
      <Text style={[styles.chipText, { color: ink }]}>{label}</Text>
    </View>
  );
}

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={rating >= n ? 'star' : rating >= n - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color="#C98A0B"
        />
      ))}
    </View>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} accessibilityRole="button" accessibilityLabel={`${n} estrellas`} hitSlop={6}>
          <Ionicons name={value >= n ? 'star' : 'star-outline'} size={36} color="#C98A0B" />
        </Pressable>
      ))}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  dark,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  dark?: boolean;
}) {
  return (
    <View style={[styles.segmented, dark && { backgroundColor: 'rgba(0,0,0,0.18)' }]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && styles.segmentOn]}>
            <Text style={[styles.segmentText, on ? { color: dark ? Brand.chileDark : Brand.ink, fontWeight: '700' } : dark && { color: Brand.white }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function OptionPill({ label, selected, onPress, sub }: { label: string; selected: boolean; onPress: () => void; sub?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.pill, selected && styles.pillOn]}>
      <Text style={[styles.pillText, selected && { color: Brand.chileDark, fontWeight: '700' }]}>{label}</Text>
      {sub ? <Text style={[styles.pillSub, selected && { color: Brand.chileDark }]}>{sub}</Text> : null}
    </Pressable>
  );
}

export function ToggleRow({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  value,
  onChange,
  last,
}: {
  icon: IconName;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: () => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, !last && styles.rowDivider]}>
      <IconCircle icon={icon} color={iconBg} ink={iconColor} size={40} square />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={title}
        trackColor={{ true: Brand.nopal, false: '#C5CEDC' }}
        thumbColor={Brand.white}
      />
    </View>
  );
}

export function ListRow({
  icon,
  iconColor = Brand.ink,
  iconBg = Brand.line,
  title,
  subtitle,
  right,
  onPress,
  last,
}: {
  icon?: IconName;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.listRow, !last && styles.rowDivider, pressed && onPress && { opacity: 0.6 }]}>
      {icon ? <IconCircle icon={icon} color={iconBg} ink={iconColor} size={40} square /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={Brand.inkMuted} /> : null)}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={Brand.inkMuted} {...props} style={[styles.input, props.multiline && { height: 96, textAlignVertical: 'top', paddingTop: 12 }, props.style]} />
    </View>
  );
}

export function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(value - 1)} accessibilityLabel="Quitar uno" style={styles.stepperBtn}>
        <Ionicons name="remove" size={20} color={Brand.white} />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable onPress={() => onChange(value + 1)} accessibilityLabel="Agregar uno" style={styles.stepperBtn}>
        <Ionicons name="add" size={20} color={Brand.white} />
      </Pressable>
    </View>
  );
}

export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View style={{ alignItems: 'center', padding: Spacing.five, gap: 8 }}>
      <IconCircle icon={icon} color={Brand.line} ink={Brand.inkSoft} size={64} />
      <Text style={styles.h2}>{title}</Text>
      <Muted style={{ textAlign: 'center' }}>{text}</Muted>
    </View>
  );
}

export function PhotoPlaceholder({ color, height = 82, label, radius = 0 }: { color: string; height?: number; label?: string; radius?: number }) {
  return (
    <View style={{ height, backgroundColor: color, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="image-outline" size={22} color="rgba(18,26,43,0.35)" />
      {label ? <Text style={{ fontSize: 10, color: 'rgba(18,26,43,0.45)', marginTop: 2 }}>{label}</Text> : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: Brand.ink, letterSpacing: -0.4 },
  h2: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  body: { fontSize: 15, color: Brand.ink, lineHeight: 21 },
  muted: { fontSize: 13, color: Brand.inkSoft, lineHeight: 18 },
  header: {
    paddingHorizontal: Spacing.three,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: Brand.white, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, textAlign: 'center', marginTop: 2 },
  button: {
    minHeight: 54,
    borderRadius: Radius.pill,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSmall: { minHeight: 42, paddingHorizontal: 16 },
  buttonText: { fontSize: 16, fontWeight: '800' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: 12,
    backgroundColor: Brand.white,
    borderTopWidth: 1,
    borderTopColor: Brand.line,
    gap: 10,
  },
  card: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: Spacing.three },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: Spacing.four, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  sectionAction: { fontSize: 13, fontWeight: '700', color: Brand.chileDark },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  chipText: { fontSize: 12, fontWeight: '700' },
  segmented: { flexDirection: 'row', backgroundColor: Brand.line, borderRadius: Radius.pill, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segmentOn: { backgroundColor: Brand.white },
  segmentText: { fontSize: 14, fontWeight: '500', color: Brand.inkSoft },
  pill: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillOn: { borderWidth: 2, borderColor: Brand.chile, backgroundColor: Brand.chileSoft },
  pillText: { fontSize: 14, fontWeight: '600', color: Brand.ink },
  pillSub: { fontSize: 11, color: Brand.inkSoft, marginTop: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, minHeight: 56 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Brand.line },
  rowTitle: { fontSize: 15, fontWeight: '700', color: Brand.ink },
  rowSub: { fontSize: 12, color: Brand.inkSoft, marginTop: 2 },
  fieldLabel: { fontSize: 13, color: Brand.inkSoft, fontWeight: '600' },
  input: {
    minHeight: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: Brand.white,
    paddingHorizontal: 14,
    fontSize: 16,
    color: Brand.ink,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Brand.chile, borderRadius: 14, paddingHorizontal: 2 },
  stepperBtn: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 18, textAlign: 'center', color: Brand.white, fontWeight: '800', fontSize: 16 },
});
