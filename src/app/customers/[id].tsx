
import React, { useCallback, useState } from "react";
import { Alert, Pressable, Text, View, ActivityIndicator } from "react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  router,
} from "expo-router";

import {
  Pencil,
  Trash2,
  Phone,
  MapPin,
  ClipboardList,
  Users,
  CalendarDays,
  FileText,
  ArrowLeft,
} from "lucide-react-native";

import {
  deleteCustomer,
  getCustomerById,
} from "../../repositories/customer.repository";

import type { Customer } from "../../types/database";

import { C, Page } from "../../components/ui";

export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getCustomerById(Number(id));
      setItem(data);
    } catch (e: any) {
      Alert.alert("Gagal memuat data", e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const remove = () => {
    if (deleting) return;

    Alert.alert(
      "Hapus pelanggan?",
      `Hapus ${item?.name} dari daftar pelanggan?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);

            try {
              await deleteCustomer(Number(id));
              router.replace("/customers");
            } catch (e: any) {
              Alert.alert("Tidak dapat menghapus", e.message);
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date?: string | null) => {
    if (!date) return "-";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return date.slice(0, 10);

    return parsed.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const InfoRow = ({
    icon,
    label,
    value,
    last = false,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    last?: boolean;
  }) => (
    <View
      style={[
        styles.infoRow,
        !last && styles.infoDivider,
      ]}
    >
      <View style={styles.infoIcon}>{icon}</View>

      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <Page
        title="Detail Pelanggan"
        subtitle="Memuat informasi pelanggan"
      >
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>
            Memuat data pelanggan...
          </Text>
        </View>
      </Page>
    );
  }

  if (!item) {
    return (
      <Page
        title="Detail Pelanggan"
        subtitle="Informasi lengkap pelanggan"
      >
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Users size={30} color={C.muted} />
          </View>

          <Text style={styles.emptyTitle}>
            Pelanggan tidak ditemukan
          </Text>

          <Text style={styles.emptyDescription}>
            Data pelanggan mungkin sudah dihapus atau tidak tersedia.
          </Text>

          <Pressable
            onPress={() => router.replace("/customers")}
            style={styles.backButton}
          >
            <ArrowLeft size={16} color="#FFFFFF" />
            <Text style={styles.backButtonText}>
              Kembali ke Pelanggan
            </Text>
          </Pressable>
        </View>
      </Page>
    );
  }

  return (
    <Page
      title="Detail Pelanggan"
      subtitle="Informasi lengkap pelanggan"
    >
      {/* CUSTOMER PROFILE */}
      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
            <Users size={25} color={C.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>
              {item.name}
            </Text>

            <Text style={styles.profileId}>
              ID Pelanggan #{item.id}
            </Text>
          </View>
        </View>

        <View style={styles.profileDivider} />

        <View style={styles.joinedRow}>
          <CalendarDays size={15} color={C.primary} />

          <Text style={styles.joinedText}>
            Bergabung sejak {formatDate(item.created_at)}
          </Text>
        </View>
      </View>

      {/* ORDER SUMMARY */}
      <View style={styles.summaryCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>
            TOTAL PESANAN
          </Text>

          <Text style={styles.summaryValue}>
            {item.total_orders ?? 0}
          </Text>

          <Text style={styles.summaryDescription}>
            Pesanan tercatat
          </Text>
        </View>

        <View style={styles.summaryIcon}>
          <ClipboardList size={24} color={C.primary} />
        </View>
      </View>

      {/* CONTACT INFORMATION */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Users size={17} color={C.primary} />
          <Text style={styles.sectionTitle}>
            Informasi Pelanggan
          </Text>
        </View>

        <View style={styles.infoCard}>
          <InfoRow
            icon={<Phone size={17} color={C.primary} />}
            label="NOMOR TELEPON"
            value={item.phone || "Nomor telepon belum diisi"}
          />

          <InfoRow
            icon={<MapPin size={17} color={C.primary} />}
            label="ALAMAT"
            value={item.address || "Alamat belum diisi"}
            last
          />
        </View>
      </View>

      {/* NOTES */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <FileText size={17} color={C.primary} />
          <Text style={styles.sectionTitle}>
            Catatan Pelanggan
          </Text>
        </View>

        <View style={styles.notesCard}>
          <Text
            style={[
              styles.notesText,
              !item.notes && { color: C.muted },
            ]}
          >
            {item.notes || "Belum ada catatan untuk pelanggan ini."}
          </Text>
        </View>
      </View>

      {/* ACTIONS */}
      <View style={styles.actions}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/customers/form",
              params: { id: String(item.id) },
            })
          }
          style={({ pressed }) => [
            styles.editButton,
            {
              backgroundColor: pressed ? "#183B9B" : C.primary,
            },
          ]}
        >
          <Pencil size={17} color="#FFFFFF" />
          <Text style={styles.editButtonText}>
            Edit Pelanggan
          </Text>
        </Pressable>

        <Pressable
          onPress={remove}
          disabled={deleting}
          style={({ pressed }) => [
            styles.deleteButton,
            {
              backgroundColor: pressed ? "#FEF2F2" : "#FFFFFF",
              opacity: deleting ? 0.6 : 1,
            },
          ]}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <Trash2 size={17} color="#DC2626" />
          )}

          <Text style={styles.deleteButtonText}>
            {deleting ? "Menghapus..." : "Hapus Pelanggan"}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>
        Informasi pelanggan dikelola melalui sistem Laundrify.
      </Text>
    </Page>
  );
}

const styles = {
  loading: {
    padding: 40,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  loadingText: {
    color: C.muted,
    fontSize: 12,
    marginTop: 12,
  },
  empty: {
    padding: 28,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 4,
  },
  emptyTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "900" as const,
    marginTop: 14,
  },
  emptyDescription: {
    color: C.muted,
    fontSize: 11,
    textAlign: "center" as const,
    lineHeight: 17,
    marginTop: 6,
  },
  backButton: {
    marginTop: 18,
    backgroundColor: C.primary,
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 4,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800" as const,
  },
  profileCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    borderRadius: 4,
    marginBottom: 14,
  },
  profileTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 13,
  },
  avatar: {
    width: 52,
    height: 52,
    backgroundColor: "#E8EEFF",
    borderWidth: 1,
    borderColor: "#D7E1FA",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 4,
  },
  profileName: {
    color: C.text,
    fontSize: 17,
    fontWeight: "900" as const,
  },
  profileId: {
    color: C.muted,
    fontSize: 11,
    marginTop: 5,
  },
  profileDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 14,
  },
  joinedRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  joinedText: {
    color: C.muted,
    fontSize: 11,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    borderRadius: 4,
    marginBottom: 23,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  summaryLabel: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
  },
  summaryValue: {
    color: C.text,
    fontSize: 28,
    fontWeight: "900" as const,
    marginTop: 4,
  },
  summaryDescription: {
    color: C.muted,
    fontSize: 10,
    marginTop: 2,
  },
  summaryIcon: {
    width: 45,
    height: 45,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#E0E7FF",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 4,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 11,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "900" as const,
  },
  infoCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    paddingHorizontal: 14,
  },
  infoRow: {
    paddingVertical: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  infoDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  infoIcon: {
    width: 36,
    height: 36,
    backgroundColor: "#E8EEFF",
    borderWidth: 1,
    borderColor: "#DCE5FA",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 4,
  },
  infoLabel: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "800" as const,
    letterSpacing: 0.4,
  },
  infoValue: {
    color: C.text,
    fontSize: 12,
    fontWeight: "600" as const,
    marginTop: 5,
    lineHeight: 18,
  },
  notesCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    padding: 15,
  },
  notesText: {
    color: C.text,
    fontSize: 12,
    lineHeight: 20,
  },
  actions: {
    gap: 10,
  },
  editButton: {
    paddingVertical: 15,
    borderRadius: 4,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 9,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900" as const,
  },
  deleteButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 14,
    borderRadius: 4,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 9,
  },
  deleteButtonText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800" as const,
  },
  footer: {
    color: C.muted,
    fontSize: 10,
    textAlign: "center" as const,
    marginTop: 18,
    marginBottom: 10,
  },
};
