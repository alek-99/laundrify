
import React, { useCallback, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import ArrowDownRight from "lucide-react-native/icons/arrow-down-right";
import ArrowUpRight from "lucide-react-native/icons/arrow-up-right";
import ChartNoAxesCombined from "lucide-react-native/icons/chart-no-axes-combined";
import ReceiptText from "lucide-react-native/icons/receipt-text";
import TrendingDown from "lucide-react-native/icons/trending-down";
import TrendingUp from "lucide-react-native/icons/trending-up";
import Wallet from "lucide-react-native/icons/wallet";

import {
  getMonthlyFinance,
  getFinanceSummary,
  getFinanceByCategory,
} from "../../repositories/finance.repository";
import { getLocalYearRangeUtc } from "../../utils/format";

import { Page, money } from "../../components/ui";

const COLORS = {
  background: "#F3F5F8",
  white: "#FFFFFF",
  surface: "#EEF1F5",
  border: "#E1E5EB",
  text: "#202938",
  muted: "#8993A2",
  primary: "#2855D9",
  primaryLight: "#EAF0FF",
  green: "#15966A",
  greenLight: "#E8F5EF",
  red: "#D94A4A",
  redLight: "#FCECEC",
};

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export default function Reports() {
  const year = new Date().getFullYear();

  const [monthly, setMonthly] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const { start, end } = getLocalYearRangeUtc(year);

      const [m, s, c] = await Promise.all([
        getMonthlyFinance(year),
        getFinanceSummary(start, end),
        getFinanceByCategory(start, end),
      ]);

      setMonthly(m);
      setSummary(s);
      setCategories(c);
    } catch (e: any) {
      Alert.alert(
        "Gagal memuat laporan",
        e?.message || "Terjadi kesalahan saat mengambil data laporan.",
      );
    }
  }, [year]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const max = Math.max(
    1,
    ...monthly.map((m) =>
      Math.max(m.income || 0, m.expense || 0),
    ),
  );

  const income = summary?.income || 0;
  const expense = summary?.expense || 0;
  const netCashFlow = summary?.netCashFlow || 0;
  const totalTransactions = summary?.totalTransactions || 0;

  return (
    <Page
      title="Laporan Keuangan"
      subtitle={`Ringkasan keuangan tahun ${year}`}
    >
      {/* RINGKASAN PEMASUKAN DAN PENGELUARAN */}
      <View style={styles.overviewContainer}>
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={[styles.iconBox, styles.incomeIcon]}>
              <TrendingUp size={19} color={COLORS.green} />
            </View>

            <ArrowUpRight size={17} color={COLORS.green} />
          </View>

          <Text style={styles.overviewLabel}>
            Total Pemasukan
          </Text>

          <Text style={[styles.overviewAmount, { color: COLORS.green }]}>
            {money(income)}
          </Text>
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={[styles.iconBox, styles.expenseIcon]}>
              <TrendingDown size={19} color={COLORS.red} />
            </View>

            <ArrowDownRight size={17} color={COLORS.red} />
          </View>

          <Text style={styles.overviewLabel}>
            Total Pengeluaran
          </Text>

          <Text style={[styles.overviewAmount, { color: COLORS.red }]}>
            {money(expense)}
          </Text>
        </View>
      </View>

      {/* ARUS KAS BERSIH */}
      <View style={styles.cashFlowCard}>
        <View style={styles.cashFlowHeader}>
          <View style={styles.cashFlowIcon}>
            <Wallet size={20} color={COLORS.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cashFlowLabel}>
              Arus Kas Bersih
            </Text>

            <Text style={styles.cashFlowDescription}>
              Selisih pemasukan dan pengeluaran
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.cashFlowAmount,
            {
              color:
                netCashFlow >= 0 ? COLORS.primary : COLORS.red,
            },
          ]}
        >
          {money(netCashFlow)}
        </Text>

        <View style={styles.cashFlowDivider} />

        <View style={styles.transactionInfo}>
          <ReceiptText size={15} color={COLORS.muted} />

          <Text style={styles.transactionText}>
            {totalTransactions} transaksi tercatat
          </Text>
        </View>
      </View>

      {/* REKAP BULANAN */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <ChartNoAxesCombined size={18} color={COLORS.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>
            Rekap Bulanan
          </Text>

          <Text style={styles.sectionSubtitle}>
            Grafik pemasukan setiap bulan
          </Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={styles.legendGreen} />
            <Text style={styles.legendText}>Pemasukan</Text>
          </View>
        </View>

        {monthNames.map((name, i) => {
          const m = monthly.find(
            (x) => Number(x.month) === i + 1,
          );

          const value = m?.income || 0;
          const percentage = Math.min(
            100,
            (value / max) * 100,
          );

          return (
            <View key={name} style={styles.monthRow}>
              <Text style={styles.monthName}>
                {name}
              </Text>

              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${percentage}%` },
                  ]}
                />
              </View>

              <Text style={styles.monthAmount}>
                {value > 0 ? money(value) : "-"}
              </Text>
            </View>
          );
        })}
      </View>

      {/* BERDASARKAN KATEGORI */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Wallet size={18} color={COLORS.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>
            Berdasarkan Kategori
          </Text>

          <Text style={styles.sectionSubtitle}>
            Rincian transaksi setiap kategori
          </Text>
        </View>
      </View>

      <View style={styles.categoryCard}>
        {categories.length > 0 ? (
          categories.map((item: any, index: number) => {
            const isIncome = item.direction === "income";

            return (
              <View
                key={`${item.id}-${index}`}
                style={[
                  styles.categoryRow,
                  index === categories.length - 1 &&
                    styles.categoryLastRow,
                ]}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    {
                      backgroundColor: isIncome
                        ? COLORS.greenLight
                        : COLORS.redLight,
                    },
                  ]}
                >
                  {isIncome ? (
                    <ArrowUpRight
                      size={17}
                      color={COLORS.green}
                    />
                  ) : (
                    <ArrowDownRight
                      size={17}
                      color={COLORS.red}
                    />
                  )}
                </View>

                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>
                    {item.name}
                  </Text>

                  <Text style={styles.categoryType}>
                    {isIncome ? "Pemasukan" : "Pengeluaran"}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.categoryAmount,
                    {
                      color: isIncome
                        ? COLORS.green
                        : COLORS.red,
                    },
                  ]}
                >
                  {money(item.total)}
                </Text>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Wallet size={25} color={COLORS.muted} />

            <Text style={styles.emptyTitle}>
              Belum ada data kategori
            </Text>

            <Text style={styles.emptyDescription}>
              Transaksi kategori akan muncul di sini.
            </Text>
          </View>
        )}
      </View>

      {/* FOOTER */}
      <Text style={styles.footer}>
        LAUNDRIFY · FINANCIAL REPORT
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  overviewContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 13,
  },

  overviewCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 13,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#AAB3C0",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 2,
  },

  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  iconBox: {
    width: 35,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },

  incomeIcon: {
    backgroundColor: COLORS.greenLight,
  },

  expenseIcon: {
    backgroundColor: COLORS.redLight,
  },

  overviewLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "700",
  },

  overviewAmount: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 7,
  },

  cashFlowCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 23,
    shadowColor: "#AAB3C0",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },

  cashFlowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  cashFlowIcon: {
    width: 39,
    height: 39,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },

  cashFlowLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.text,
  },

  cashFlowDescription: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 3,
  },

  cashFlowAmount: {
    fontSize: 25,
    fontWeight: "900",
    marginTop: 17,
  },

  cashFlowDivider: {
    height: 1,
    backgroundColor: "#D9DEE6",
    marginVertical: 14,
  },

  transactionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  transactionText: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "600",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 11,
    marginTop: 3,
  },

  sectionIcon: {
    width: 35,
    height: 35,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.text,
  },

  sectionSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 3,
  },

  chartCard: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 23,
    shadowColor: "#AAB3C0",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 2,
  },

  chartLegend: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 19,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  legendGreen: {
    width: 9,
    height: 9,
    backgroundColor: COLORS.green,
    borderRadius: 2,
  },

  legendText: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "700",
  },

  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 15,
  },

  monthName: {
    width: 29,
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.text,
  },

  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#E9EDF2",
    borderRadius: 2,
    overflow: "hidden",
  },

  barFill: {
    height: 8,
    backgroundColor: COLORS.green,
    borderRadius: 2,
  },

  monthAmount: {
    width: 83,
    fontSize: 9,
    color: COLORS.muted,
    textAlign: "right",
    fontWeight: "700",
  },

  categoryCard: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 15,
    shadowColor: "#AAB3C0",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 2,
  },

  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  categoryLastRow: {
    borderBottomWidth: 0,
  },

  categoryIcon: {
    width: 35,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },

  categoryInfo: {
    flex: 1,
  },

  categoryName: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  categoryType: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 4,
  },

  categoryAmount: {
    fontSize: 11,
    fontWeight: "900",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },

  emptyTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 10,
  },

  emptyDescription: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 5,
  },

  footer: {
    fontSize: 8,
    textAlign: "center",
    color: "#A0A5B1",
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 10,
    marginBottom: 12,
  },
});
