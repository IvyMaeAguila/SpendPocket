import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { CategoryBadge } from '@/components/category-tile';
import { Card, serif } from '@/components/spend-ui';
import { money, type Group } from '@/db/reporting';

const center = 160;
const ringRadius = 100;
const badgeRadius = 130;

const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 });

function point(distance: number, angle: number) {
  return {
    x: center + Math.sin(angle) * distance,
    y: center - Math.cos(angle) * distance,
  };
}

function labelColor(hex: string) {
  const [r, g, b] = [1, 3, 5].map(index => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#000' : '#fff';
}

function shareLabel(share: number) {
  return share < 0.001 ? '<0.1%' : percent.format(share);
}

function buildSlices(categories: Group[], total: number) {
  let start = 0;
  return categories.map(category => {
    const share = category.total / total;
    const angle = 2 * Math.PI * (start + share / 2);
    const slice = { ...category, share, start, label: point(ringRadius, angle), badge: point(badgeRadius, angle) };
    start += share;
    return slice;
  });
}

export function CategoryBreakdown({ categories, currency, selectedId, onSelect }: {
  categories: Group[]; currency: string; selectedId?: string; onSelect: (id?: string) => void;
}) {
  const total = categories.reduce((sum, category) => sum + category.total, 0);
  if (!total) return null;

  const slices = buildSlices(categories, total);
  const selected = slices.find(slice => slice.id === selectedId);
  const badges: typeof slices = [];
  for (const slice of slices) {
    if (slice.share >= 0.045 && badges.every(other =>
      Math.hypot(slice.badge.x - other.badge.x, slice.badge.y - other.badge.y) >= 44
    )) badges.push(slice);
  }

  return <Card>
    <Text accessibilityRole="header" className="text-lg font-bold text-ink dark:text-white">Expenses by category</Text>
    <View className="relative w-full max-w-[320px] self-center" style={{ aspectRatio: 1 }}>
      <Svg width="100%" height="100%" viewBox="0 0 320 320" accessibilityLabel="Monthly expenses by category donut chart">
        {slices.map(slice => {
          const start = point(ringRadius, 2 * Math.PI * slice.start);
          const end = point(ringRadius, 2 * Math.PI * (slice.start + slice.share));
          const props = {
            fill: 'none', stroke: slice.color, strokeWidth: 47,
            opacity: selected && selected.id !== slice.id ? 0.28 : 1,
          };
          const select = () => onSelect(selected?.id === slice.id ? undefined : slice.id);
          const d = 'M' + start.x + ',' + start.y + ' A100,100 0 ' + (slice.share > 0.5 ? 1 : 0) + ' 1 ' + end.x + ',' + end.y;
          if (Platform.OS === 'web') {
            return slices.length === 1
              ? <circle key={slice.id} cx={center} cy={center} r={ringRadius} {...props} onClick={select} style={{ cursor: 'pointer' }} />
              : <path key={slice.id} d={d} {...props} onClick={select} style={{ cursor: 'pointer' }} />;
          }
          return slices.length === 1
            ? <Circle key={slice.id} cx={center} cy={center} r={ringRadius} {...props} onPress={select} />
            : <Path key={slice.id} d={d} {...props} onPress={select} />;
        })}
        {slices.filter(slice => slice.share >= 0.06).map(slice =>
          <SvgText pointerEvents="none" opacity={selected && selected.id !== slice.id ? 0.4 : 1} key={slice.id} x={slice.label.x} y={slice.label.y + 5} textAnchor="middle"
            fill={labelColor(slice.color)} fontFamily="Roboto_700Bold" fontSize={15}>
            {shareLabel(slice.share)}
          </SvgText>)}
      </Svg>
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <Text className="font-sans text-xs text-muted dark:text-slate-300">{selected ? selected.name + ' · ' + shareLabel(selected.share) : 'Total expenses'}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: serif, maxWidth: '45%' }}
          className="mt-1 text-center text-2xl text-ink dark:text-white">{money(selected?.total ?? total, currency)}</Text>
      </View>
      {badges.map(slice => <View pointerEvents="none" key={slice.id}
        className="absolute"
        style={{ left: `${slice.badge.x / 3.2}%`, top: `${slice.badge.y / 3.2}%`, marginLeft: -16, marginTop: -16, opacity: selected && selected.id !== slice.id ? 0.4 : 1 }}>
        <CategoryBadge category={slice} size={32} />
      </View>)}
    </View>
    <View className="flex-row items-center gap-3 px-1 pb-1">
      <Text className="flex-1 font-semibold text-xs text-muted dark:text-slate-300">Category</Text>
      <Text className="w-14 text-right font-semibold text-xs text-muted dark:text-slate-300">Share</Text>
      <Text className="w-24 text-right font-semibold text-xs text-muted dark:text-slate-300">Amount</Text>
    </View>
    <View>
      {slices.map(slice => <Pressable key={slice.id} accessibilityRole="button" accessibilityState={{ selected: selected?.id === slice.id }}
        onPress={() => onSelect(selected?.id === slice.id ? undefined : slice.id)}
        style={{ backgroundColor: selected?.id === slice.id ? slice.color + '14' : undefined }}
        className="min-h-14 flex-row items-center gap-3 border-t border-[#dde7db] py-2 dark:border-slate-800">
        <CategoryBadge category={slice} size={32} />
        <Text className="flex-1 font-semibold text-sm text-ink dark:text-white">{slice.name}</Text>
        <Text className="w-14 text-right font-sans text-sm text-muted dark:text-slate-300">{shareLabel(slice.share)}</Text>
        <Text className="w-24 text-right font-bold text-sm text-ink dark:text-white">{money(slice.total, currency)}</Text>
      </Pressable>)}
    </View>
  </Card>;
}
