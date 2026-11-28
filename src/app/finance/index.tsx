
import { FlashList } from "@shopify/flash-list";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useFocusEffect, router } from "expo-router";

import ArrowDownLeft from "lucide-react-native/icons/arrow-down-left";
import ArrowUpRight from "lucide-react-native/icons/arrow-up-right";
import Tags from "lucide-react-native/icons/tags";
import TrendingDown from "lucide-react-native/icons/trending-down";
import TrendingUp from "lucide-react-native/icons/trending-up";
import Wallet from "lucide-react-native/icons/wallet";

import { getTransactions } from "../../services/finance.service";
import { getFinanceSummary } from "../../repositories/finance.repository";
import { formatDateTimeShort } from "../../utils/format";

import {
  AddButton,
  Empty,
  Page,
  money,
} from "../../components/ui";

const PAGE_SIZE = 40;

const UI = {
  background: "#F1F3F6",
  surface: "#FFFFFF",
  inset: "#E9EDF2",
  text: "#202938",
  muted: "#8993A2",
  border: "#E1E6ED",
  primary: "#2855D9",
  green: "#15966A",
  greenLight: "#E8F5EF",
  red: "#D94A4A",
  redLight: "#FCEDED",
  blueLight: "#EAF0FF",
};

const SectionTitle = memo(function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
});

const SummaryCard = memo(function SummaryCard({
  title,
  amount,
  type,
}: {
  title: string;
  amount: number;
  type: "income" | "expense";
}) {
  const isIncome = type === "income";
  const color = isIncome ? UI.green : UI.red;
  const background = isIncome ? UI.greenLight : UI.redLight;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTopRow}>
        <View style={[styles.summaryIconBox, { backgroundColor: background }]}>
          {isIncome ? (
            <ArrowDownLeft size={16} color={color} />
          ) : (
            <ArrowUpRight size={16} color={color} />
          )}
        </View>

        <Text style={styles.summaryLabel}>{title}</Text>
      </View>

      <View style={styles.summaryInset}>
        <Text
          style={[styles.summaryAmount, { color }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {money(amount)}
        </Text>
      </View>
    </View>
  );
});

const TransactionItem = memo(function TransactionItem({ transaction }: { transaction: any }) {
  const isIncome = transaction.direction === "income";
  const color = isIncome ? UI.green : UI.red;
  const background = isIncome ? UI.greenLight : UI.redLight;

  return (
    <View style={styles.txCard}>
      <View style={[styles.txIcon, { backgroundColor: background }]}>
        {isIncome ? (
          <ArrowDownLeft size={20} color={color} strokeWidth={2.5} />
        ) : (
          <ArrowUpRight size={20} color={color} strokeWidth={2.5} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.txCategory} numberOfLines={1}>
          {transaction.category_name || "Transaksi"}
        </Text>

        <Text style={styles.txDesc} numberOfLines={2}>
          {transaction.description || "Tidak ada keterangan"}
        </Text>

        {transaction.transaction_date ? (
          <Text style={styles.txDate}>
            {formatDateTimeShort(transaction.transaction_date)}
          </Text>
        ) : null}
      </View>

      <View style={[styles.txAmountBox, { backgroundColor: background }]}>
        <Text style={[styles.txAmount, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {isIncome ? "+" : "-"}{money(transaction.amount)}
        </Text>
      </View>
    </View>
  );
});

export default function Finance() {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    income: 0,
    expense: 0,
    netCashFlow: 0,
    totalTransactions: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const rowCountRef = useRef(0);

  useEffect(() => {
    rowCountRef.current = rows.length;
  }, [rows.length]);

  const load = useCallback(async (mode: "initial" | "refresh" | "more" = "initial") => {
    try {
      if (mode === "more") setLoadingMore(true);
      else if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      const offset = mode === "more" ? rowCountRef.current : 0;

      if (mode === "more") {
        const fetched = await getTransactions({ limit: PAGE_SIZE + 1, offset });
        const nextHasMore = fetched.length > PAGE_SIZE;
        setRows((prev) => [...prev, ...(nextHasMore ? fetched.slice(0, PAGE_SIZE) : fetched)]);
        setHasMore(nextHasMore);
      } else {
        const [fetched, summaryData] = await Promise.all([
          getTransactions({ limit: PAGE_SIZE + 1, offset: 0 }),
          getFinanceSummary(),
        ]);
        const nextHasMore = fetched.length > PAGE_SIZE;
        setRows(nextHasMore ? fetched.slice(0, PAGE_SIZE) : fetched);
        setHasMore(nextHasMore);
        setSummary(summaryData);
      }
    } catch (e: any) {
      Alert.alert(
        "Gagal memuat keuangan",
        e?.message || "Terjadi kesalahan.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(rowCountRef.current > 0 ? "refresh" : "initial");
    }, [load]),
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    load("more");
  }, [hasMore, loadingMore, loading, load]);

  const keyExtractor = useCallback((item: any) => String(item.id), []);
  const renderTx = useCallback(
    ({ item }: { item: any }) => <TransactionItem transaction={item} />,
    [],
  );

  const { income, expense, netCashFlow: balance, totalTransactions } = summary;

  const listHeader = useMemo(
    () => (
      <>
        <View style={{ marginBottom: 16 }}>
          <SectionTitle title="Ringkasan keuangan" />

          <View style={styles.summaryRow}>
            <SummaryCard title="Pemasukan" amount={income} type="income" />
            <SummaryCard title="Pengeluaran" amount={expense} type="expense" />
          </View>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceHeaderRow}>
            <View>
              <Text style={styles.balanceTitle}>ARUS KAS BERSIH</Text>
              <Text style={styles.balanceSubtitle}>
                Berdasarkan {totalTransactions} transaksi tercatat
              </Text>
            </View>

            <View style={styles.balanceWalletIcon}>
              <Wallet size={19} color={UI.primary} />
            </View>
          </View>

          <View style={styles.balanceInset}>
            <Text
              style={[styles.balanceAmount, { color: balance >= 0 ? UI.green : UI.red }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {money(balance)}
            </Text>

            <View style={styles.balanceStatusRow}>
              {balance >= 0 ? (
                <TrendingUp size={13} color={UI.green} />
              ) : (
                <TrendingDown size={13} color={UI.red} />
              )}

              <Text style={[styles.balanceStatusText, { color: balance >= 0 ? UI.green : UI.red }]}>
                {balance >= 0 ? "Surplus" : "Defisit"} keuangan
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.txHeaderRow}>
          <View>
            <SectionTitle title="Transaksi terbaru" />
            <Text style={styles.txCountSubtitle}>
              {rows.length} dari {totalTransactions} transaksi dimuat
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/finance/categories")}
            style={styles.categoryButton}
          >
            <Tags size={14} color={UI.primary} />
            <Text style={styles.categoryButtonText}>Kategori</Text>
          </Pressable>
        </View>
      </>
    ),
    [income, expense, balance, totalTransactions, rows.length],
  );

  return (
    <Page
      title="Keuangan"
      subtitle="Catat arus kas bisnis laundry"
      scroll={false}
      right={
        <AddButton
          title="Tambah"
          onPress={() => router.push("/finance/form")}
        />
      }
    >
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={UI.primary} />
          <Text style={styles.loadingText}>Memuat transaksi...</Text>
        </View>
      ) : (
        <FlashList
          data={rows}
          renderItem={renderTx}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeader}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => load("refresh")}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<Empty title="Belum ada transaksi" />}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 14, alignItems: "center" }}>
                <ActivityIndicator color={UI.primary} />
              </View>
            ) : undefined
          }
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: UI.text,
    letterSpacing: 0.2,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 5,
    padding: 13,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  summaryIconBox: {
    width: 27,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: UI.muted,
  },
  summaryInset: {
    backgroundColor: UI.inset,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 9,
    paddingVertical: 10,
    marginTop: 13,
    borderRadius: 4,
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: "900",
  },
  balanceCard: {
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 5,
    padding: 15,
    marginBottom: 20,
  },
  balanceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: UI.muted,
  },
  balanceSubtitle: {
    fontSize: 10,
    color: UI.muted,
    marginTop: 4,
  },
  balanceWalletIcon: {
    width: 35,
    height: 35,
    backgroundColor: UI.blueLight,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
  },
  balanceInset: {
    backgroundColor: UI.inset,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 4,
    padding: 14,
    marginTop: 14,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: "900",
  },
  balanceStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
  },
  balanceStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  txHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  txCountSubtitle: {
    fontSize: 10,
    color: UI.muted,
    marginTop: 4,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: UI.blueLight,
    borderWidth: 1,
    borderColor: "#D9E3FF",
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 4,
  },
  categoryButtonText: {
    fontSize: 10,
    color: UI.primary,
    fontWeight: "800",
  },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI.surface,
    padding: 13,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 9,
  },
  txIcon: {
    width: 39,
    height: 39,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    marginRight: 11,
  },
  txCategory: {
    fontSize: 12,
    fontWeight: "800",
    color: UI.text,
  },
  txDesc: {
    fontSize: 10,
    color: UI.muted,
    marginTop: 5,
  },
  txDate: {
    fontSize: 9,
    color: UI.muted,
    marginTop: 4,
  },
  txAmountBox: {
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 7,
    maxWidth: "43%",
  },
  txAmount: {
    fontSize: 11,
    fontWeight: "900",
    textAlign: "right",
  },
  loadingBox: {
    backgroundColor: UI.inset,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 22,
    alignItems: "center",
    borderRadius: 5,
    gap: 8,
  },
  loadingText: {
    fontSize: 11,
    color: UI.muted,
  },
});
