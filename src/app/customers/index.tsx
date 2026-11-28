
import { FlashList } from "@shopify/flash-list";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, router } from "expo-router";

import Award from "lucide-react-native/icons/award";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import MapPin from "lucide-react-native/icons/map-pin";
import Phone from "lucide-react-native/icons/phone";
import UserRound from "lucide-react-native/icons/user-round";
import Users from "lucide-react-native/icons/users";

import {
  getCustomers,
  deleteCustomer,
  countCustomers,
} from "../../repositories/customer.repository";

import type { Customer } from "../../types/database";

import {
  AddButton,
  Empty,
  Page,
  SearchBox,
} from "../../components/ui";

const COLORS = {
  white: "#FFFFFF",
  background: "#F3F5F8",
  surface: "#EEF1F5",
  border: "#E1E5EB",
  text: "#202938",
  muted: "#8993A2",
  primary: "#2855D9",
  primaryLight: "#EAF0FF",
  green: "#15966A",
  greenLight: "#E8F5EF",
  red: "#D94A4A",
};

const CustomerCard = memo(function CustomerCard({
  customer,
  onPress,
  onLongPress,
}: {
  customer: Customer;
  onPress: (id: number) => void;
  onLongPress: (id: number, name: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(customer.id)}
      onLongPress={() => onLongPress(customer.id, customer.name)}
      style={({ pressed }) => [
        styles.customerCard,
        pressed && styles.customerCardPressed,
      ]}
    >
      {/* INFORMASI UTAMA */}
      <View style={styles.customerHeader}>
        <View style={styles.customerIcon}>
          <UserRound size={21} color={COLORS.primary} />
        </View>

        <View style={styles.customerInfo}>
          <Text numberOfLines={1} style={styles.customerName}>
            {customer.name}
          </Text>

          <Text style={styles.customerId}>
            Pelanggan #{customer.id}
          </Text>
        </View>

        <View style={styles.orderBadge}>
          <Text style={styles.orderValue}>
            {customer.total_orders}
          </Text>

          <Text style={styles.orderLabel}>
            Order
          </Text>
        </View>

        <ChevronRight size={17} color={COLORS.muted} />
      </View>

      {(customer.phone || customer.address) && (
        <View style={styles.customerDivider} />
      )}

      {(customer.phone || customer.address) && (
        <View style={styles.contactContainer}>
          {customer.phone ? (
            <View style={styles.contactRow}>
              <View style={styles.contactIcon}>
                <Phone size={13} color={COLORS.muted} />
              </View>

              <Text style={styles.contactText}>
                {customer.phone}
              </Text>
            </View>
          ) : null}

          {customer.address ? (
            <View style={styles.contactRow}>
              <View style={styles.contactIcon}>
                <MapPin size={13} color={COLORS.muted} />
              </View>

              <Text numberOfLines={2} style={styles.contactText}>
                {customer.address}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
});

export default function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);

  const qRef = useRef(q);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    qRef.current = q;
  }, [q]);

  // MEMUAT DATA PELANGGAN
  const load = useCallback(async (searchValue = qRef.current) => {
    const requestId = ++requestIdRef.current;
    setBusy(true);

    try {
      const [data, n] = await Promise.all([
        getCustomers({
          search: searchValue,
          limit: 100,
        }),
        countCustomers(),
      ]);

      if (requestId !== requestIdRef.current) return;

      setRows(data);
      setTotal(n);
      hasLoadedRef.current = true;
    } catch (e: any) {
      if (requestId === requestIdRef.current) {
        Alert.alert(
          "Gagal memuat",
          e?.message || "Tidak dapat mengambil data pelanggan.",
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setBusy(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(qRef.current);
    }, [load]),
  );

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const timer = setTimeout(() => {
      load(q);
    }, 300);
    return () => clearTimeout(timer);
  }, [q, load]);

  // HAPUS PELANGGAN
  const remove = useCallback(
    (id: number, name: string) => {
      Alert.alert(
        "Hapus pelanggan?",
        `Data ${name} akan disembunyikan dari daftar.`,
        [
          {
            text: "Batal",
            style: "cancel",
          },
          {
            text: "Hapus",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteCustomer(id);
                await load(qRef.current);
              } catch (e: any) {
                Alert.alert(
                  "Gagal",
                  e?.message || "Tidak dapat menghapus pelanggan.",
                );
              }
            },
          },
        ],
      );
    },
    [load],
  );

  // NAVIGASI
  const openMember = useCallback(() => {
    router.push("/customers/member");
  }, []);

  const handleOpenCustomer = useCallback((id: number) => {
    router.push(`/customers/${id}`);
  }, []);

  const keyExtractor = useCallback((item: Customer) => String(item.id), []);
  const renderCustomer = useCallback(
    ({ item }: { item: Customer }) => (
      <CustomerCard
        customer={item}
        onPress={handleOpenCustomer}
        onLongPress={remove}
      />
    ),
    [handleOpenCustomer, remove],
  );

  return (
    <Page
      title="Pelanggan"
      subtitle="Kelola data pelanggan laundry"
      scroll={false}
      right={
        <View style={styles.headerActions}>
          {/* TOMBOL MEMBER */}
          <Pressable
            onPress={openMember}
            style={({ pressed }) => [
              styles.memberButton,
              pressed && styles.pressed,
            ]}
          >
            <Award size={15} color={COLORS.primary} />

            <Text style={styles.memberButtonText}>
              Member
            </Text>
          </Pressable>

          {/* TOMBOL TAMBAH */}
          <AddButton
            title="Tambah"
            onPress={() => router.push("/customers/form")}
          />
        </View>
      }
    >
      {/* TOTAL PELANGGAN */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryLabel}>
            TOTAL PELANGGAN
          </Text>

          <Text style={styles.summaryValue}>
            {total}
          </Text>

          <Text style={styles.summaryDescription}>
            Pelanggan terdaftar
          </Text>
        </View>

        <View style={styles.summaryIcon}>
          <Users size={23} color={COLORS.primary} />
        </View>
      </View>

      {/* PENCARIAN */}
      <View style={styles.searchContainer}>
        <SearchBox
          value={q}
          onChangeText={setQ}
          placeholder="Cari nama atau nomor telepon..."
        />
      </View>

      {/* HEADER DAFTAR */}
      <View style={styles.listHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            Daftar Pelanggan
          </Text>

          <Text style={styles.sectionSubtitle}>
            Informasi seluruh pelanggan laundry
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {rows.length} Data
          </Text>
        </View>
      </View>

      {/* DAFTAR PELANGGAN */}
      <FlashList
        data={rows}
        renderItem={renderCustomer}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        refreshing={busy}
        onRefresh={() => load(qRef.current)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Empty
            title={
              q
                ? "Pelanggan tidak ditemukan"
                : "Pelanggan belum tersedia"
            }
            desc={
              q
                ? "Coba gunakan kata kunci pencarian lain."
                : "Tambahkan pelanggan pertama untuk mulai membuat pesanan."
            }
          />
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Tekan lama pelanggan untuk menghapus data.
            </Text>
          </View>
        }
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },

  // HEADER ACTIONS
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  memberButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 9,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: "#D5E1FF",
    borderRadius: 4,
  },

  memberButtonText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
  },

  // SUMMARY
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    borderRadius: 4,
    marginBottom: 17,
    shadowColor: "#AAB3C0",
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  summaryInfo: {
    flex: 1,
  },

  summaryLabel: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: "900",
    letterSpacing: 1,
  },

  summaryValue: {
    fontSize: 28,
    color: COLORS.text,
    fontWeight: "900",
    marginTop: 5,
  },

  summaryDescription: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 3,
  },

  summaryIcon: {
    width: 43,
    height: 43,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },

  // SEARCH
  searchContainer: {
    marginBottom: 20,
  },

  // LIST HEADER
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.text,
  },

  sectionSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 4,
  },

  countBadge: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 3,
  },

  countText: {
    fontSize: 9,
    color: COLORS.text,
    fontWeight: "800",
  },

  // CUSTOMER LIST
  listContent: {
    paddingBottom: 24,
  },

  customerCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#AAB3C0",
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  customerCardPressed: {
    opacity: 0.75,
  },

  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  customerIcon: {
    width: 42,
    height: 42,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },

  customerInfo: {
    flex: 1,
  },

  customerName: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.text,
  },

  customerId: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 5,
  },

  orderBadge: {
    minWidth: 49,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 3,
  },

  orderValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "900",
  },

  orderLabel: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 2,
  },

  // CONTACT
  customerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },

  contactContainer: {
    gap: 9,
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  contactIcon: {
    width: 22,
    height: 22,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 3,
  },

  contactText: {
    flex: 1,
    fontSize: 10,
    color: COLORS.muted,
    lineHeight: 16,
  },

  // FOOTER
  footer: {
    marginTop: 18,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  footerText: {
    fontSize: 10,
    color: COLORS.muted,
    textAlign: "center",
  },
});
