import { FlatList, Modal, Pressable, Text, View, type TextStyle } from 'react-native';
import X from 'lucide-react-native/icons/x';
import Svg, { Line, Path } from 'react-native-svg';
import { Action } from '@/components/spend-ui';
import { useTapSound } from '@/components/tap-sound';
import { money, type Entry } from '@/db/reporting';
import { receiptPeriodLabel, receiptSummary, type ReceiptPeriod } from '@/utils/receipt-details';

export type ReceiptSnapshot = { period: ReceiptPeriod; entries: Entry[]; currency: string };

const paper = '#fffdf7';
const edge = 'M0 0H360V2' + 'l-6 6 -6 -6'.repeat(30) + 'Z';

function DashedDivider() {
  return <Svg width="100%" height={3}>
    <Line x1={0} x2="100%" y1={1.5} y2={1.5} stroke="#a1ad9c" strokeWidth={1} strokeDasharray={[5, 4]} />
  </Svg>;
}

const amountStyle: TextStyle = { fontVariant: ['tabular-nums'] };

export function ExpenseReceiptPreview({ receipt, downloading, error, close, download }: {
  receipt: ReceiptSnapshot; downloading: boolean; error: string; close: () => void; download: () => void;
}) {
  const { tap } = useTapSound();
  const { period, entries, currency } = receipt;
  const { total, categories } = receiptSummary(entries);

  return <Modal visible transparent animationType="fade" onRequestClose={close}>
    <View className="flex-1 items-center justify-center bg-black/55 px-6 py-8">
      <View accessibilityViewIsModal className="max-h-full w-full max-w-md gap-3">
        <View className="shrink overflow-hidden rounded-t"
          style={{ boxShadow: '0px 14px 30px rgba(0, 0, 0, 0.24)' }}>
          <View className="items-center px-14 pb-3 pt-5" style={{ backgroundColor: paper }}>
            <Text className="font-bold text-xl text-ink">Spend Pocket</Text>
            <Text accessibilityRole="header" className="mt-1 font-semibold text-sm text-ink">Expense receipt</Text>
            <Text className="mt-1 text-center font-sans text-xs text-muted">{receiptPeriodLabel(period)} · {currency}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close receipt"
              className="absolute right-2 top-2 h-11 w-11 items-center justify-center rounded-full active:bg-mint-100"
              onPress={() => { tap(); close(); }}>
              <X size={18} color="#456459" />
            </Pressable>
          </View>
          <FlatList style={{ flexGrow: 0, flexShrink: 1, backgroundColor: paper }} data={entries} keyExtractor={entry => entry.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
            ListHeaderComponent={<>
              <DashedDivider />
              <View className="flex-row items-center gap-3 py-3">
                <View className="flex-1 gap-1">
                  <Text className="font-bold text-sm text-ink">Total expenses</Text>
                  <Text className="font-sans text-xs text-muted">{entries.length} {entries.length === 1 ? 'expense' : 'expenses'}</Text>
                </View>
                <Text style={amountStyle} className="font-bold text-2xl text-ink">{money(total, currency)}</Text>
              </View>
              <DashedDivider />
              <Text className="mb-1 mt-3 font-bold text-sm text-ink">Category breakdown</Text>
              {categories.map(category => <View key={category.id} className="min-h-8 flex-row items-center gap-3 py-1">
                <Text className="flex-1 font-sans text-sm text-ink">{category.name}</Text>
                <Text style={amountStyle} className="font-semibold text-sm text-ink">{money(category.amount, currency)}</Text>
              </View>)}
              <View className="mb-3 mt-2"><DashedDivider /></View>
              <Text className="mb-1 font-bold text-sm text-ink">Itemized expenses</Text>
            </>}
            ListEmptyComponent={<Text className="py-2 font-sans text-xs text-muted">No expenses in this period.</Text>}
            renderItem={({ item }) => <View className="min-h-11 flex-row items-start gap-3 py-1.5">
              <View className="flex-1 gap-0.5">
                <Text className="font-semibold text-sm text-ink">{item.note || item.name}</Text>
                <Text className="font-sans text-xs text-muted">{item.note ? item.name + ' · ' : ''}{item.day}</Text>
              </View>
              <Text style={amountStyle} className="font-semibold text-sm text-ink">{money(item.amount, currency)}</Text>
            </View>}
            ListFooterComponent={<View className="mt-2"><DashedDivider /></View>}
          />
          <Svg width="100%" height={8} viewBox="0 0 360 8" preserveAspectRatio="none"
            style={{ backgroundColor: 'transparent' }}>
            <Path d={edge} fill={paper} />
          </Svg>
        </View>
        <View className="gap-2">
          {error ? <Text accessibilityLiveRegion="polite" className="rounded-lg bg-paper p-2 font-sans text-sm text-red-700">{error}</Text> : null}
          <Action label={downloading ? 'Preparing PDF…' : 'Download PDF'} disabled={downloading} onPress={download} />
        </View>
      </View>
    </View>
  </Modal>;
}
