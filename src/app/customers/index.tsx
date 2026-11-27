
import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import { useFocusEffect, router } from "expo-router";

import {
  Phone,
  MapPin,
  ChevronRight,
  Users,
  UserRound,
  Award,
} from "lucide-react-native";

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

export default function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);

  // MEMUAT DATA PELANGGAN
  const load = useCallback(async () => {
    setBusy(true);

    try {
      const [data, n] = await Promise.all([
        getCustomers({
          search: q,
          limit: 100,
        }),
        countCustomers(),
      ]);

      setRows(data);
      setTotal(n);
    } catch (e: any) {
      Alert.alert(
        "Gagal memuat",
        e?.message || "Tidak dapat mengambil data pelanggan."
      );
    } finally {
      setBusy(false);
    }
  }, [q]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // HAPUS PELANGGAN
  const remove = (id: number, name: string) => {
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
              await load();
            } catch (e: any) {
              Alert.alert(
                "Gagal",
                e?.message || "Tidak dapat menghapus pelanggan."
              );
            }
          },
        },
      ]
    );
  };

  // NAVIGASI MEMBER
  const openMember = () => {
    router.push("/customers/member");
  };

  return (
    <Page
      title="Pelanggan"
      subtitle="Kelola data pelanggan laundry"
      right={
        <View style={styles.headerActions}>
          {/* TOMBOL MEMBER */}
          <Pressable
            onPress={openMember}
            style={({ pressed }) => [
              styles.memberButton,
              {
                opacity: pressed ? 0.7 : 1,
                transform: [
                  {
                    scale: pressed ? 0.97 : 1,
                  },
                ],
              },
            ]}
          >
            <Award
              size={15}
              color={COLORS.primary}
            />

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
          <Users
            size={23}
            color={COLORS.primary}
          />
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
      {rows.length === 0 ? (
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
      ) : (
        <View style={styles.customerList}>
          {rows.map((c, index) => (
            <Pressable
              key={c.id}
              onPress={() =>
                router.push(`/customers/${c.id}`)
              }
              onLongPress={() =>
                remove(c.id, c.name)
              }
              style={({ pressed }) => [
                styles.customerCard,
                {
                  opacity: pressed ? 0.75 : 1,
                  marginBottom:
                    index === rows.length - 1 ? 0 : 10,
                },
              ]}
            >
              {/* INFORMASI UTAMA */}
              <View style={styles.customerHeader}>
                <View style={styles.customerIcon}>
                  <UserRound
                    size={21}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.customerInfo}>
                  <Text
                    numberOfLines={1}
                    style={styles.customerName}
                  >
                    {c.name}
                  </Text>

                  <Text style={styles.customerId}>
                    Pelanggan #{c.id}
                  </Text>
                </View>

                <View style={styles.orderBadge}>
                  <Text style={styles.orderValue}>
                    {c.total_orders}
                  </Text>

                  <Text style={styles.orderLabel}>
                    Order
                  </Text>
                </View>

                <ChevronRight
                  size={17}
                  color={COLORS.muted}
                />
              </View>

              {/* PEMBATAS */}
              {(c.phone || c.address) && (
                <View style={styles.customerDivider} />
              )}

              {/* INFORMASI KONTAK */}
              {(c.phone || c.address) && (
                <View style={styles.contactContainer}>
                  {c.phone ? (
                    <View style={styles.contactRow}>
                      <View style={styles.contactIcon}>
                        <Phone
                          size={13}
                          color={COLORS.muted}
                        />
                      </View>

                      <Text style={styles.contactText}>
                        {c.phone}
                      </Text>
                    </View>
                  ) : null}

                  {c.address ? (
                    <View style={styles.contactRow}>
                      <View style={styles.contactIcon}>
                        <MapPin
                          size={13}
                          color={COLORS.muted}
                        />
                      </View>

                      <Text
                        numberOfLines={2}
                        style={styles.contactText}
                      >
                        {c.address}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tekan lama pelanggan untuk menghapus data.
        </Text>
      </View>
    </Page>
  );
}

const styles = {
  // HEADER ACTIONS
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },

  memberButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
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
    fontWeight: "800" as const,
    color: COLORS.primary,
  },

  // SUMMARY
  summaryCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
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
    fontWeight: "900" as const,
    letterSpacing: 1,
  },

  summaryValue: {
    fontSize: 28,
    color: COLORS.text,
    fontWeight: "900" as const,
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
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 4,
  },

  // SEARCH
  searchContainer: {
    marginBottom: 20,
  },

  // LIST HEADER
  listHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900" as const,
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
    fontWeight: "800" as const,
  },

  // CUSTOMER LIST
  customerList: {
    gap: 0,
  },

  customerCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 14,
    shadowColor: "#AAB3C0",
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  customerHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },

  customerIcon: {
    width: 42,
    height: 42,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 4,
  },

  customerInfo: {
    flex: 1,
  },

  customerName: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: COLORS.text,
  },

  customerId: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 5,
  },

  orderBadge: {
    minWidth: 49,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 3,
  },

  orderValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "900" as const,
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
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },

  contactIcon: {
    width: 22,
    height: 22,
    backgroundColor: COLORS.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
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
    textAlign: "center" as const,
  },
};
