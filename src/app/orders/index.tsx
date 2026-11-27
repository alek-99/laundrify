// app/orders/index.tsx
import { router, useFocusEffect } from "expo-router";
import { ChevronRight, ShoppingBag, Wallet } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import {
  ORDER_FILTER_OPTIONS,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABELS,
} from "../../constants/order.presentation";
import { AddButton, C, Empty, Page, SearchBox, money } from "../../components/ui";
import { getOrders } from "../../services/order.service";
import type { OrderStatus } from "../../types/database";

const UI = {
  background: "#EEF1F5",
  white: "#FFFFFF",
  dark: "#1E293B",
  muted: "#8490A3",
  border: "#D8DEE8",
  primary: C.primary,
  green: "#15803D",
  red: "#DC2626",
};

interface StatusFilterBarProps {
  selected?: OrderStatus;
  onSelect: (value?: OrderStatus) => void;
}

export function StatusFilterBar({ selected, onSelect }: StatusFilterBarProps) {
  return (
    <View style={{ marginTop: 14, marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "900",
          color: UI.dark,
          marginBottom: 8,
          letterSpacing: 0.5,
        }}
      >
        FILTER STATUS
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ORDER_FILTER_OPTIONS.map((opt) => {
          const active = selected === opt.value;
          return (
            <Pressable
              key={opt.label}
              onPress={() => onSelect(opt.value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
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
                  color: active ? UI.white : UI.muted,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface OrderListItemProps {
  order: any;
  isLast: boolean;
  onPress: () => void;
}

export function OrderListItem({ order, isLast, onPress }: OrderListItemProps) {
  const badge = ORDER_STATUS_BADGE[order.status] || {
    bg: "#E5E7EB",
    text: "#4B5563",
  };
  const remaining = Number(order.remaining) || 0;
  const isPaid = order.payment_status === "paid" || remaining <= 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "#E5EAF1" : UI.white,
        padding: 15,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#E2E8F0",
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 6,
            backgroundColor: UI.background,
            borderWidth: 1,
            borderColor: UI.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShoppingBag size={19} color={UI.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, fontWeight: "900", color: UI.dark }}>
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
            style={{ fontSize: 12, color: UI.dark, fontWeight: "700", marginTop: 2 }}
          >
            {order.customer_name}
          </Text>
        </View>

        <ChevronRight size={18} color={UI.muted} />
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12,
        }}
      >
        <View
          style={{
            backgroundColor: badge.bg,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 4,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "900", color: badge.text }}>
            {ORDER_STATUS_LABELS[order.status] || order.status}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 14, fontWeight: "900", color: UI.primary }}>
            {money(order.total)}
          </Text>
          {order.member_discount > 0 && (
            <Text style={{ fontSize: 9, color: UI.green, fontWeight: "700" }}>
              Potongan Member {money(order.member_discount)}
            </Text>
          )}
        </View>
      </View>

      <View
        style={{
          backgroundColor: UI.background,
          paddingHorizontal: 10,
          paddingVertical: 7,
          marginTop: 10,
          borderRadius: 5,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Wallet size={13} color={UI.muted} />
          <Text style={{ fontSize: 10, color: UI.muted, fontWeight: "700" }}>
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
}

export default function Orders() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrderStatus | undefined>();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isMounted = useRef(true);
  const queryRef = useRef(q);
  const statusRef = useRef(status);
  const hasLoadedOnce = useRef(false);

  queryRef.current = q;
  statusRef.current = status;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchOrders = useCallback(
    async (searchValue: string, statusValue: OrderStatus | undefined) => {
      const showFullSpinner = !hasLoadedOnce.current;
      if (showFullSpinner) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const data = await getOrders({
          search: searchValue.trim(),
          status: statusValue,
          limit: 100,
        });
        if (!isMounted.current) return;
        setRows(Array.isArray(data) ? data : []);
        hasLoadedOnce.current = true;
      } catch (err: any) {
        if (!isMounted.current) return;
        Alert.alert("Gagal", err?.message || "Gagal memuat data pesanan.");
      } finally {
        if (!isMounted.current) return;
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // Muat ulang saat layar kembali fokus
  useFocusEffect(
    useCallback(() => {
      fetchOrders(queryRef.current, statusRef.current);
    }, [fetchOrders]),
  );

  // Muat ulang saat filter status berubah
  useEffect(() => {
    if (!hasLoadedOnce.current) return;
    fetchOrders(q, status);
  }, [status, fetchOrders]);

  // Debounce saat mengetik kata kunci pencarian
  useEffect(() => {
    if (!hasLoadedOnce.current) return;
    const timer = setTimeout(() => {
      fetchOrders(q, statusRef.current);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, fetchOrders]);

  return (
    <Page
      title="Riwayat Pesanan"
      subtitle="Kelola pesanan, cetak struk, label & WhatsApp"
      right={
        <AddButton title="Buat order" onPress={() => router.push("/orders/create")} />
      }
    >
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

      <StatusFilterBar selected={status} onSelect={setStatus} />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "900", color: UI.dark }}>
          Daftar Pesanan
        </Text>
        <Text style={{ fontSize: 11, color: UI.muted, fontWeight: "700" }}>
          {refreshing ? "Memperbarui..." : `${rows.length} Pesanan`}
        </Text>
      </View>

      {initialLoading ? (
        <View style={{ padding: 35, alignItems: "center" }}>
          <ActivityIndicator size="large" color={UI.primary} />
          <Text style={{ fontSize: 11, color: UI.muted, marginTop: 10 }}>
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
          {rows.map((order, idx) => (
            <OrderListItem
              key={order.id}
              order={order}
              isLast={idx === rows.length - 1}
              onPress={() => router.push(`/orders/${order.id}`)}
            />
          ))}
        </View>
      )}
    </Page>
  );
}