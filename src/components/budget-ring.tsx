import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { CategoryBadge } from '@/components/category-tile';
import type { Budget } from '@/db/reporting';

const circumference = 2 * Math.PI * 21;

export function BudgetRing({ budget }: { budget: Budget }) {
  const ratio = budget.limit_amount ? budget.spent / budget.limit_amount : 0;
  const color = ratio >= 1 ? '#db5257' : ratio >= 0.7 ? '#d6992b' : '#39946c';
  const status = ratio > 1 ? 'Over' : Math.round(ratio * 100) + '%';

  return <View className="w-20 items-center gap-1" accessible accessibilityLabel={budget.name + ' budget: ' + status}>
    <View className="h-14 w-14 items-center justify-center">
      <Svg width={56} height={56} viewBox="0 0 56 56" style={{ position: 'absolute' }}>
        <Circle cx={28} cy={28} r={21} stroke="#dbe8e0" strokeWidth={5} fill="none" />
        {ratio > 0 ? <Circle cx={28} cy={28} r={21} stroke={color} strokeWidth={5} fill="none" strokeLinecap="round"
          transform="rotate(-90 28 28)" strokeDasharray={ratio >= 1 ? undefined : [circumference * ratio, circumference]} /> : null}
      </Svg>
      <CategoryBadge category={budget} size={30} />
    </View>
    <Text className="font-bold text-sm text-ink dark:text-white">{status}</Text>
    <Text numberOfLines={1} className="max-w-full font-sans text-xs text-muted dark:text-slate-300">{budget.name}</Text>
  </View>;
}
