// app/orders/index.tsx
import { FlashList } from "@shopify/flash-list";
import { router, useFocusEffect } from "expo-router";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import ShoppingBag from "lucide-react-native/icons/shopping-bag";
import Wallet from "lucide-react-native/icons/wallet";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  ORDER_FILTER_OPTIONS,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABELS,
} from "../../constants/order.presentation";
import { AddButton, C, Empty, Page, SearchBox, money } from "../../components/ui";
import { getOrders } from "../../services/order.service";
import type { OrderStatus } from "../../types/database";
import { formatDateShort } from "../../utils/format";

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

export const StatusFilterBar = memo(function StatusFilterBar({
  selected,
  onSelect,
}: StatusFilterBarProps) {
  return (
    <View style={styles.filterContainer}>
      <Text style={styles.filterHeading}>FILTER STATUS</Text>
      <View style={styles.filterRow}>
        {ORDER_FILTER_OPTIONS.map((opt) => {
          const active = selected === opt.value;
          return (
            <Pressable
              key={opt.label}
              onPress={() => onSelect(opt.value)}
              style={[
                styles.filterChip,
                active && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

interface OrderListItemProps {
  order: any;
  isLast: boolean;
  onPress: () => void;
}

export const OrderListItem = memo(function OrderListItem({
  order,
  isLast,
  onPress,
}: OrderListItemProps) {
  const badge = ORDER_STATUS_BADGE[order.status] || {
    bg: "#E5E7EB",
    text: "#4B5563",
  };
  const remaining = Number(order.remaining) || 0;
  const isPaid = order.payment_status === "paid" || remaining <= 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.itemCard,
        pressed && styles.itemCardPressed,
        isLast && styles.itemCardLast,
      ]}
    >
      <View style={styles.itemTopRow}>
        <View style={styles.itemIcon}>
          <ShoppingBag size={19} color={UI.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.itemHeaderLine}>
            <Text style={styles.orderNumber}>{order.order_number}</Text>
            <Text style={styles.orderDate}>
              {formatDateShort(order.order_date)}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.customerName}>
            {order.customer_name}
          </Text>
        </View>

        <ChevronRight size={18} color={UI.muted} />
      </View>

      <View style={styles.itemMetaRow}>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusBadgeText, { color: badge.text }]}>
            {ORDER_STATUS_LABELS[order.status] || order.status}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.totalText}>{money(order.total)}</Text>
          {order.member_discount > 0 && (
            <Text style={styles.memberDiscountText}>
              Potongan Member {money(order.member_discount)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.paymentFooter}>
        <View style={styles.paymentLabelRow}>
          <Wallet size={13} color={UI.muted} />
          <Text style={styles.paymentLabel}>Status Bayar:</Text>
        </View>
        <Text style={[styles.paymentValue, { color: isPaid ? UI.green : UI.red }]}>
          {isPaid ? "LUNAS ✓" : `Sisa ${money(remaining)}`}
        </Text>
      </View>
    </Pressable>
  );
});

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

  useEffect(() => {
    queryRef.current = q;
    statusRef.current = status;
  }, [q, status]);

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
    fetchOrders(queryRef.current, status);
  }, [status, fetchOrders]);

  // Debounce saat mengetik kata kunci pencarian
  useEffect(() => {
    if (!hasLoadedOnce.current) return;
    const timer = setTimeout(() => {
      fetchOrders(q, statusRef.current);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, fetchOrders]);

  const handleOpenCreate = useCallback(() => router.push("/orders/create"), []);
  const keyExtractor = useCallback((item: any) => String(item.id), []);
  const renderOrderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <OrderListItem
        order={item}
        isLast={index === rows.length - 1}
        onPress={() => router.push(`/orders/${item.id}`)}
      />
    ),
    [rows.length],
  );

  return (
    <Page
      title="Riwayat Pesanan"
      subtitle="Kelola pesanan, cetak struk, label & WhatsApp"
      scroll={false}
      right={<AddButton title="Buat order" onPress={handleOpenCreate} />}
    >
      <View style={styles.searchCard}>
        <SearchBox
          value={q}
          onChangeText={setQ}
          placeholder="Cari nomor order atau pelanggan..."
        />
      </View>

      <StatusFilterBar selected={status} onSelect={setStatus} />

      <View style={styles.listHeaderRow}>
        <Text style={styles.listTitle}>Daftar Pesanan</Text>
        <Text style={styles.listCount}>
          {refreshing ? "Memperbarui..." : `${rows.length} Pesanan`}
        </Text>
      </View>

      {initialLoading ? (
        <View style={styles.spinnerBox}>
          <ActivityIndicator size="large" color={UI.primary} />
          <Text style={styles.spinnerText}>Memuat pesanan...</Text>
        </View>
      ) : rows.length === 0 ? (
        <Empty
          title="Belum ada pesanan"
          desc="Buat pesanan pertama dari pelanggan kamu."
        />
      ) : (
        <View style={styles.listCard}>
          <FlashList
            data={rows}
            renderItem={renderOrderItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => fetchOrders(queryRef.current, statusRef.current)}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    marginTop: 14,
    marginBottom: 16,
  },
  filterHeading: {
    fontSize: 11,
    fontWeight: "900",
    color: UI.dark,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
  },
  filterChipActive: {
    backgroundColor: UI.primary,
    borderColor: UI.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "900",
    color: UI.muted,
  },
  filterChipTextActive: {
    color: UI.white,
  },
  searchCard: {
    backgroundColor: UI.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 2,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: UI.dark,
  },
  listCount: {
    fontSize: 11,
    color: UI.muted,
    fontWeight: "700",
  },
  spinnerBox: {
    padding: 35,
    alignItems: "center",
  },
  spinnerText: {
    fontSize: 11,
    color: UI.muted,
    marginTop: 10,
  },
  listCard: {
    flex: 1,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: UI.white,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  itemCardLast: {
    borderBottomWidth: 0,
  },
  itemCardPressed: {
    backgroundColor: "#E5EAF1",
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: UI.background,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center",
  },
  itemHeaderLine: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: "900",
    color: UI.dark,
  },
  orderDate: {
    fontSize: 10,
    color: UI.muted,
  },
  customerName: {
    fontSize: 12,
    color: UI.dark,
    fontWeight: "700",
    marginTop: 2,
  },
  itemMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  totalText: {
    fontSize: 14,
    fontWeight: "900",
    color: UI.primary,
  },
  memberDiscountText: {
    fontSize: 9,
    color: UI.green,
    fontWeight: "700",
  },
  paymentFooter: {
    backgroundColor: UI.background,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 10,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  paymentLabel: {
    fontSize: 10,
    color: UI.muted,
    fontWeight: "700",
  },
  paymentValue: {
    fontSize: 11,
    fontWeight: "900",
  },
});