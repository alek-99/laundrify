import { router, useFocusEffect } from "expo-router";
import {
  ChevronRight,
  Printer,
  Search,
  Send,
  ShoppingBag,
  Tag,
  Wallet,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";

import {
  AddButton,
  C,
  Empty,
  Page,
  SearchBox,
  money,
} from "../../components/ui";
import { getOrders } from "../../services/order.service";
import type { OrderStatus } from "../../types/database";

const UI = {
  background: "#EEF1F5",
  surface: "#EEF1F5",
  white: "#FFFFFF",
  dark: "#1E293B",
  muted: "#8490A3",
  border: "#D8DEE8",
  primary: C.primary,
  inset: "#D5DBE5",
  green: "#15803D",
  amber: "#B45309",
  red: "#DC2626",
};

// ==========================================
// STATUS PESANAN (LAUNDRIFY v2)
// ==========================================

const labels: Record<string, string> = {
  received: "Diterima",
  processing: "Diproses",
  ready: "Siap diambil",
  completed: "Selesai",
  washing: "Dicuci",
  drying: "Dikeringkan",
  ironing: "Disetrika",
  cancelled: "Dibatalkan",
};

const statusColors: Record<
  string,
  { background: string; text: string }
> = {
  received: {
    background: "#DBEAFE",
    text: "#1D4ED8",
  },
  processing: {
    background: "#FEF3C7",
    text: "#B45309",
  },
  ready: {
    background: "#DCFCE7",
    text: "#15803D",
  },
  completed: {
    background: "#D1FAE5",
    text: "#047857",
  },
  washing: {
    background: "#E0F2FE",
    text: "#0369A1",
  },
  drying: {
    background: "#FEF3C7",
    text: "#B45309",
  },
  ironing: {
    background: "#F3E8FF",
    text: "#7E22CE",
  },
  cancelled: {
    background: "#FEE2E2",
    text: "#DC2626",
  },
};

// ==========================================
// FILTER STATUS (STATE MACHINE v2)
// ==========================================

const statuses: [string, OrderStatus | undefined][] = [
  ["Semua", undefined],
  ["Diterima", "received"],
  ["Diproses", "processing"],
  ["Siap Diambil", "ready"],
  ["Selesai", "completed"],
];

export default function Orders() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrderStatus | undefined>();
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrders({
        search: q,
        status,
        limit: 100,
      });
      setRows(data);
    } catch (error: any) {
      Alert.alert("Gagal", error?.message || "Gagal memuat data pesanan.");
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const renderStatusFilters = () => (
    <View style={{ marginTop: 14, marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "900",
          color: UI.dark,
          marginBottom: 9,
          letterSpacing: 0.5,
        }}
      >
        FILTER STATUS
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {statuses.map(([label, value]) => {
          const active = status === value;

          return (
            <Pressable
              key={label}
              onPress={() => setStatus(value)}
              style={{
                paddingHorizontal: 13,
                paddingVertical: 9,
                borderRadius: 5,
                backgroundColor: active ? UI.primary : UI.white,
                borderWidth: 1,
                borderColor: active ? UI.primary : UI.border,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "900",
                  color: active ? "#FFFFFF" : UI.muted,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderOrder = (order: any, index: number) => {
    const currentStatus = order.status;
    const colors = statusColors[currentStatus] || {
      background: "#E5E7EB",
      text: "#4B5563",
    };

    const remaining = Number(order.remaining) || 0;
    const isPaid = order.payment_status === "paid" || remaining <= 0;

    return (
      <Pressable
        key={order.id}
        onPress={() => router.push(`/orders/${order.id}`)}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#E5EAF1" : UI.white,
          padding: 15,
          borderBottomWidth: index === rows.length - 1 ? 0 : 1,
          borderBottomColor: "#E2E8F0",
        })}
      >
        {/* HEADER ORDER */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 6,
              backgroundColor: UI.background,
              borderWidth: 1,
              borderColor: UI.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShoppingBag size={20} color={UI.primary} strokeWidth={2} />
          </View>

          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "900",
                  color: UI.dark,
                }}
              >
                {order.order_number}
              </Text>
              <Text style={{ fontSize: 10, color: UI.muted }}>
                {order.order_date
                  ? new Date(order.order_date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })
                  : ""}
              </Text>
            </View>

            <Text
              numberOfLines={1}
              style={{
                fontSize: 12,
                color: UI.dark,
                fontWeight: "700",
                marginTop: 3,
              }}
            >
              {order.customer_name}
            </Text>
          </View>

          <ChevronRight size={18} color={UI.muted} />
        </View>

        {/* STATUS AND TOTAL */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderRadius: 4,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.text,
              }}
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: "900",
                color: colors.text,
              }}
            >
              {labels[currentStatus] || order.status}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "900",
                color: UI.primary,
              }}
            >
              {money(order.total)}
            </Text>
            {order.member_discount > 0 && (
              <Text style={{ fontSize: 9, color: UI.green, fontWeight: "700" }}>
                Hemat {money(order.member_discount)} (Member)
              </Text>
            )}
          </View>
        </View>

        {/* PAYMENT STATUS BAR */}
        <View
          style={{
            backgroundColor: UI.background,
            paddingHorizontal: 10,
            paddingVertical: 8,
            marginTop: 10,
            borderRadius: 5,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Wallet size={13} color={UI.muted} />
            <Text
              style={{
                fontSize: 10,
                color: UI.muted,
                fontWeight: "700",
              }}
            >
              Status Bayar:
            </Text>
          </View>

          <Text
            style={{
              fontSize: 11,
              fontWeight: "900",
              color: isPaid ? UI.green : UI.red,
            }}
          >
            {isPaid ? "LUNAS ✓" : `Sisa ${money(remaining)}`}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Page
      title="Riwayat Pesanan"
      subtitle="Kelola pesanan, cetak struk, label & WhatsApp"
      right={
        <AddButton
          title="Buat order"
          onPress={() => router.push("/orders/create")}
        />
      }
    >
      {/* SEARCH */}
      <View
        style={{
          backgroundColor: UI.white,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: UI.border,
          padding: 2,
        }}
      >
        <SearchBox
          value={q}
          onChangeText={setQ}
          placeholder="Cari nomor order atau pelanggan..."
        />
      </View>

      {/* FILTER STATUS */}
      {renderStatusFilters()}

      {/* LIST HEADER */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "900",
            color: UI.dark,
          }}
        >
          Daftar Pesanan
        </Text>

        <Text
          style={{
            fontSize: 11,
            color: UI.muted,
            fontWeight: "700",
          }}
        >
          {rows.length} Pesanan
        </Text>
      </View>

      {/* ORDER LIST */}
      {loading ? (
        <View style={{ padding: 35, alignItems: "center" }}>
          <ActivityIndicator size="large" color={UI.primary} />
          <Text
            style={{
              fontSize: 11,
              color: UI.muted,
              marginTop: 10,
              fontWeight: "600",
            }}
          >
            Memuat pesanan...
          </Text>
        </View>
      ) : rows.length === 0 ? (
        <Empty
          title="Belum ada pesanan"
          desc="Buat pesanan pertama dari pelanggan kamu."
        />
      ) : (
        <View
          style={{
            backgroundColor: UI.white,
            borderWidth: 1,
            borderColor: UI.border,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {rows.map(renderOrder)}
        </View>
      )}
    </Page>
  );
}
