
import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";

import { useFocusEffect, router } from "expo-router";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Tags,
  Wallet,
  TrendingUp,
  TrendingDown,
} from "lucide-react-native";

import { getTransactions } from "../../services/finance.service";
import { getCashCategories } from "../../repositories/cash-category.repository";

import type { CashCategory } from "../../types/database";

import {
  AddButton,
  Card,
  C,
  Empty,
  Page,
  money,
} from "../../components/ui";

// ==========================================
// FLAT DESIGN COLORS
// ==========================================

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

// ==========================================
// SECTION TITLE
// ==========================================

function SectionTitle({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 14,
        fontWeight: "900",
        color: UI.text,
        letterSpacing: 0.2,
      }}
    >
      {title}
    </Text>
  );
}

// ==========================================
// SUMMARY CARD
// ==========================================

function SummaryCard({
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
    <View
      style={{
        flex: 1,
        backgroundColor: UI.surface,
        borderWidth: 1,
        borderColor: UI.border,
        borderRadius: 5,
        padding: 13,
        shadowColor: "#172033",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.035,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
        }}
      >
        <View
          style={{
            width: 27,
            height: 27,
            backgroundColor: background,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 4,
          }}
        >
          {isIncome ? (
            <ArrowDownLeft size={16} color={color} />
          ) : (
            <ArrowUpRight size={16} color={color} />
          )}
        </View>

        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: UI.muted,
          }}
        >
          {title}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: UI.inset,
          borderWidth: 1,
          borderColor: UI.border,
          paddingHorizontal: 9,
          paddingVertical: 10,
          marginTop: 13,
          borderRadius: 4,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "900",
            color,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {money(amount)}
        </Text>
      </View>
    </View>
  );
}

// ==========================================
// TRANSACTION ITEM
// ==========================================

function TransactionItem({ transaction }: { transaction: any }) {
  const isIncome = transaction.direction === "income";
  const color = isIncome ? UI.green : UI.red;
  const background = isIncome ? UI.greenLight : UI.redLight;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: UI.surface,
        padding: 13,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: UI.border,
        marginBottom: 9,
      }}
    >
      {/* ICON */}

      <View
        style={{
          width: 39,
          height: 39,
          backgroundColor: background,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
          marginRight: 11,
        }}
      >
        {isIncome ? (
          <ArrowDownLeft size={20} color={color} strokeWidth={2.5} />
        ) : (
          <ArrowUpRight size={20} color={color} strokeWidth={2.5} />
        )}
      </View>

      {/* INFORMATION */}

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "800",
            color: UI.text,
          }}
          numberOfLines={1}
        >
          {transaction.category_name || "Transaksi"}
        </Text>

        <Text
          style={{
            fontSize: 10,
            color: UI.muted,
            marginTop: 5,
          }}
          numberOfLines={2}
        >
          {transaction.description || "Tidak ada keterangan"}
        </Text>

        {transaction.transaction_date ? (
          <Text
            style={{
              fontSize: 9,
              color: UI.muted,
              marginTop: 4,
            }}
          >
            {transaction.transaction_date}
          </Text>
        ) : null}
      </View>

      {/* AMOUNT */}

      <View
        style={{
          backgroundColor: background,
          paddingHorizontal: 9,
          paddingVertical: 8,
          borderRadius: 4,
          marginLeft: 7,
          maxWidth: "43%",
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "900",
            color,
            textAlign: "right",
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {isIncome ? "+" : "-"}{money(transaction.amount)}
        </Text>
      </View>
    </View>
  );
}

// ==========================================
// FINANCE PAGE
// ==========================================

export default function Finance() {
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<CashCategory[]>([]);

  const [loading, setLoading] = useState(true);

  // ========================================
  // LOAD DATA
  // ========================================

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [transactions, categories] = await Promise.all([
        getTransactions({ limit: 100 }),
        getCashCategories(undefined, true),
      ]);

      setRows(transactions);
      setCats(categories);
    } catch (e: any) {
      Alert.alert(
        "Gagal memuat keuangan",
        e?.message || "Terjadi kesalahan."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // ========================================
  // CALCULATE FINANCE
  // ========================================

  const income = rows
    .filter((r) => r.direction === "income")
    .reduce((a, r) => a + Number(r.amount || 0), 0);

  const expense = rows
    .filter((r) => r.direction === "expense")
    .reduce((a, r) => a + Number(r.amount || 0), 0);

  const balance = income - expense;

  // ========================================
  // MAIN UI
  // ========================================

  return (
    <Page
      title="Keuangan"
      subtitle="Catat arus kas bisnis laundry"
      right={
        <AddButton
          title="Tambah"
          onPress={() => router.push("/finance/form")}
        />
      }
    >
      {/* ================================== */}
      {/* FINANCE SUMMARY */}
      {/* ================================== */}

      <View style={{ marginBottom: 16 }}>
        <SectionTitle title="Ringkasan keuangan" />

        <View
          style={{
            flexDirection: "row",
            gap: 9,
            marginTop: 12,
          }}
        >
          <SummaryCard
            title="Pemasukan"
            amount={income}
            type="income"
          />

          <SummaryCard
            title="Pengeluaran"
            amount={expense}
            type="expense"
          />
        </View>
      </View>

      {/* ================================== */}
      {/* NET BALANCE */}
      {/* ================================== */}

      <View
        style={{
          backgroundColor: UI.surface,
          borderWidth: 1,
          borderColor: UI.border,
          borderRadius: 5,
          padding: 15,
          marginBottom: 20,
          shadowColor: "#172033",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.035,
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: UI.muted,
              }}
            >
              ARUS KAS BERSIH
            </Text>

            <Text
              style={{
                fontSize: 10,
                color: UI.muted,
                marginTop: 4,
              }}
            >
              Berdasarkan 100 transaksi terakhir
            </Text>
          </View>

          <View
            style={{
              width: 35,
              height: 35,
              backgroundColor: UI.blueLight,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 4,
            }}
          >
            <Wallet size={19} color={UI.primary} />
          </View>
        </View>

        {/* INSET BALANCE */}

        <View
          style={{
            backgroundColor: UI.inset,
            borderWidth: 1,
            borderColor: UI.border,
            borderRadius: 4,
            padding: 14,
            marginTop: 14,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "900",
              color: balance >= 0 ? UI.green : UI.red,
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {money(balance)}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              marginTop: 7,
            }}
          >
            {balance >= 0 ? (
              <TrendingUp size={13} color={UI.green} />
            ) : (
              <TrendingDown size={13} color={UI.red} />
            )}

            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: balance >= 0 ? UI.green : UI.red,
              }}
            >
              {balance >= 0 ? "Surplus" : "Defisit"} keuangan
            </Text>
          </View>
        </View>
      </View>

      {/* ================================== */}
      {/* TRANSACTION HEADER */}
      {/* ================================== */}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View>
          <SectionTitle title="Transaksi terbaru" />

          <Text
            style={{
              fontSize: 10,
              color: UI.muted,
              marginTop: 4,
            }}
          >
            {rows.length} transaksi dimuat
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/finance/categories")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: UI.blueLight,
            borderWidth: 1,
            borderColor: "#D9E3FF",
            paddingHorizontal: 11,
            paddingVertical: 9,
            borderRadius: 4,
          }}
        >
          <Tags size={14} color={UI.primary} />

          <Text
            style={{
              fontSize: 10,
              color: UI.primary,
              fontWeight: "800",
            }}
          >
            Kategori
          </Text>
        </Pressable>
      </View>

      {/* ================================== */}
      {/* TRANSACTION LIST */}
      {/* ================================== */}

      {loading ? (
        <View
          style={{
            backgroundColor: UI.inset,
            borderWidth: 1,
            borderColor: UI.border,
            padding: 22,
            alignItems: "center",
            borderRadius: 5,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: UI.muted,
            }}
          >
            Memuat transaksi...
          </Text>
        </View>
      ) : rows.length === 0 ? (
        <Empty title="Belum ada transaksi" />
      ) : (
        rows.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
          />
        ))
      )}

      {/* ================================== */}
      {/* FOOTER */}
      {/* ================================== */}

      {!loading && rows.length > 0 && (
        <View
          style={{
            backgroundColor: UI.inset,
            borderWidth: 1,
            borderColor: UI.border,
            padding: 12,
            borderRadius: 4,
            marginTop: 5,
            marginBottom: 15,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: UI.muted,
              textAlign: "center",
            }}
          >
            Menampilkan maksimal 100 transaksi terbaru.
          </Text>
        </View>
      )}
    </Page>
  );
}
