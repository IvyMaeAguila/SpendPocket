import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { CategoryIcon } from '@/components/category-icon';
import { useTapSound } from '@/components/tap-sound';
import type { Category } from '@/db/expenses';

const referenceTints: Record<string, { top: string; bottom: string; ink: string; glow: string }> = {
  '#f97316': { top: '#fff3e6', bottom: '#fbd7b5', ink: '#b4540f', glow: 'rgba(180, 84, 15, 0.22)' },
  '#3b82f6': { top: '#eaf4fb', bottom: '#c4ddef', ink: '#2c6a96', glow: 'rgba(44, 106, 150, 0.24)' },
  '#8b5cf6': { top: '#f3effd', bottom: '#d8cef3', ink: '#5a49a8', glow: 'rgba(90, 73, 168, 0.24)' },
  '#ec4899': { top: '#fdecf3', bottom: '#f6c6d8', ink: '#a83a66', glow: 'rgba(168, 58, 102, 0.22)' },
};

type CategoryDesign = Pick<Category, 'id' | 'icon' | 'color'>;

function tileColors(category: CategoryDesign) {
  const reference = referenceTints[category.color.toLowerCase()];
  if (reference) return reference;
  const tint = category.id === 'health' && category.color.toLowerCase() === '#ef4444'
    ? '#35a675'
    : category.color;
  const hex = /^#[\da-f]{6}$/i.test(tint) ? tint : '#64748b';
  const rgb = [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16));
  const blend = (base: number, weight: number) =>
    'rgb(' + rgb.map(channel => Math.round(base + (channel - base) * weight)).join(', ') + ')';

  return {
    top: blend(255, 0.09),
    bottom: blend(255, 0.28),
    ink: blend(0, 0.65),
    glow: 'rgba(' + rgb.join(', ') + ', 0.29)',
  };
}

export function CategoryBadge({ category, size, selected }: {
  category: CategoryDesign; size: number; selected?: boolean;
}) {
  const colors = tileColors(category);
  const radius = size * 0.35;
  return <View style={{ borderRadius: radius, boxShadow: '0px ' + size / 6 + 'px ' + size / 3.6 + 'px ' + colors.glow }}>
    <LinearGradient colors={[colors.top, colors.bottom]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? '#17654e' : 'transparent',
        borderTopColor: selected ? '#17654e' : '#fffffff0',
      }}>
      <CategoryIcon name={category.icon} color={colors.ink} size={Math.round(size * 22 / 54)} />
    </LinearGradient>
  </View>;
}

export function CategoryTile({ category, width, selected, onPress }: {
  category: Category; width: number; selected?: boolean; onPress: () => void;
}) {
  const { tap } = useTapSound();
  return <Pressable accessibilityRole="button" accessibilityLabel={category.name}
    accessibilityState={selected === undefined ? undefined : { selected }}
    className="items-center gap-2 pt-1 active:opacity-70" style={{ width }}
    onPress={() => { tap(); onPress(); }}>
    <CategoryBadge category={category} size={Math.min(width, 54)} selected={selected} />
    <Text numberOfLines={1} style={width < 55 ? { fontSize: 10 } : undefined} className={selected
      ? 'font-bold text-xs text-ink dark:text-white'
      : 'font-semibold text-xs text-ink dark:text-slate-100'}>{category.name}</Text>
  </Pressable>;
}
