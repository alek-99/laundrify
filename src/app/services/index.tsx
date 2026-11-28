
import { router, useFocusEffect } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Clock3 from "lucide-react-native/icons/clock-3";
import Package from "lucide-react-native/icons/package";
import Pencil from "lucide-react-native/icons/pencil";
import Plus from "lucide-react-native/icons/plus";
import Power from "lucide-react-native/icons/power";
import Search from "lucide-react-native/icons/search";
import Shirt from "lucide-react-native/icons/shirt";
import Trash2 from "lucide-react-native/icons/trash";
import X from "lucide-react-native/icons/x";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  deleteService,
  getServicesPaginated,
  getServiceStatistics,
  setServiceActive,
  type ServiceStatistics,
} from "../../repositories/service.repository";

import { money } from "../../components/ui";
import type { Service } from "../../types/database";

// ======================================================
// THEME
// ======================================================

const C = {
  bg: "#F5F7FB",
  white: "#FFFFFF",
  primary: "#3157D5",
  light: "#EDF2FF",
  black: "#202938",
  text: "#475467",
  muted: "#98A2B3",
  border: "#E2E8F0",
  green: "#12A36D",
  greenLight: "#E8F8F0",
  red: "#E5484D",
  redLight: "#FFF0F0",
  orange: "#D99020",
  orangeLight: "#FFF6E5",
};

const PAGE_SIZE = 12;

type Category = "all" | "kiloan" | "satuan" | "karpet";
type Status = "all" | "active" | "inactive";

// ======================================================
// COMPONENT
// ======================================================

const CATEGORY_LABELS: Record<Service["category"], string> = {
  kiloan: "Kiloan",
  satuan: "Satuan",
  karpet: "Karpet",
};

const ServiceCard = memo(function ServiceCard({
  item,
  columns,
  onToggleStatus,
  onRemove,
}: {
  item: Service;
  columns: number;
  onToggleStatus: (item: Service) => void;
  onRemove: (item: Service) => void;
}) {
  const active = item.is_active === 1;
  const categoryName = CATEGORY_LABELS[item.category];

  return (
    <View
      style={[
        styles.card,
        columns > 1 && { flex: 1, marginHorizontal: 5 },
      ]}
    >
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/services/form",
            params: { id: String(item.id) },
          })
        }
        style={styles.cardTop}
      >
        <View style={styles.iconBox}>
          <Shirt size={21} color={C.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>

          <Text style={styles.meta}>
            {categoryName} • {item.unit}
          </Text>
        </View>

        <ChevronRight size={18} color={C.muted} />
      </Pressable>

      <View style={styles.divider} />

      <View style={styles.priceRow}>
        <View>
          <Text style={styles.label}>HARGA LAYANAN</Text>
          <Text style={styles.price}>{money(item.price)}</Text>
          <Text style={styles.meta}>
            per {item.unit}
          </Text>
        </View>

        <View
          style={[
            styles.badge,
            { backgroundColor: active ? C.greenLight : C.redLight },
          ]}
        >
          <View
            style={[
              styles.dot,
              { backgroundColor: active ? C.green : C.red },
            ]}
          />
          <Text
            style={[
              styles.badgeText,
              { color: active ? C.green : C.red },
            ]}
          >
            {active ? "AKTIF" : "NONAKTIF"}
          </Text>
        </View>
      </View>

      <View style={styles.extraInfo}>
        {item.package_type && (
          <View style={styles.infoChip}>
            <Package size={12} color={C.primary} />
            <Text style={styles.infoText}>{item.package_type}</Text>
          </View>
        )}

        <View style={styles.infoChip}>
          <Clock3 size={12} color={C.muted} />
          <Text style={styles.infoText}>
            {item.estimated_hours} jam
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/services/form",
              params: { id: String(item.id) },
            })
          }
          style={[styles.action, { backgroundColor: C.light }]}
        >
          <Pencil size={14} color={C.primary} />
          <Text style={{ color: C.primary }}>Edit</Text>
        </Pressable>

        <Pressable
          onPress={() => onToggleStatus(item)}
          style={[
            styles.action,
            { backgroundColor: active ? C.orangeLight : C.greenLight },
          ]}
        >
          <Power
            size={14}
            color={active ? C.orange : C.green}
          />
          <Text style={{ color: active ? C.orange : C.green }}>
            {active ? "Nonaktifkan" : "Aktifkan"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onRemove(item)}
          style={styles.deleteButton}
        >
          <Trash2 size={16} color={C.red} />
        </Pressable>
      </View>
    </View>
  );
});

export default function Services() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const columns = width >= 900 ? 3 : width >= 600 ? 2 : 1;

  const [rows, setRows] = useState<Service[]>([]);
  const [stats, setStats] = useState<ServiceStatistics>({
    total: 0,
    active: 0,
    inactive: 0,
    kiloan: 0,
    satuan: 0,
    karpet: 0,
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [status, setStatus] = useState<Status>("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filtersRef = useRef({ search, category, status, page });
  const hasLoadedOnceRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    filtersRef.current = { search, category, status, page };
  }, [search, category, status, page]);

  // ====================================================
  // LOAD SERVICES
  // ====================================================

  const load = useCallback(
    async (
      targetPage = 1,
      searchValue = filtersRef.current.search,
      categoryValue = filtersRef.current.category,
      statusValue = filtersRef.current.status,
    ) => {
      const requestId = ++requestIdRef.current;

      try {
        setLoading(true);

        const [result, statistics] = await Promise.all([
          getServicesPaginated({
            page: targetPage,
            limit: PAGE_SIZE,
            search: searchValue,
            category: categoryValue,
            status: statusValue,
          }),
          getServiceStatistics(),
        ]);

        if (requestId !== requestIdRef.current) return;

        setRows(result.data);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotal(result.total);
        setStats(statistics);
        hasLoadedOnceRef.current = true;
      } catch (error: any) {
        if (requestId === requestIdRef.current) {
          Alert.alert(
            "Gagal memuat layanan",
            error?.message ?? "Terjadi kesalahan.",
          );
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  // Hanya berjalan saat layar kembali fokus (tidak re-trigger per keystroke)
  useFocusEffect(
    useCallback(() => {
      load(filtersRef.current.page);
    }, [load]),
  );

  // Debounce pencarian setelah render awal
  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    const timer = setTimeout(() => {
      load(1, search, filtersRef.current.category, filtersRef.current.status);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, load]);

  // Reload langsung saat chip kategori/status berubah
  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    load(1, filtersRef.current.search, category, status);
  }, [category, status, load]);

  // ====================================================
  // REFRESH
  // ====================================================

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(1);
  }, [load]);

  // ====================================================
  // STATUS
  // ====================================================

  const toggleStatus = useCallback(
    (item: Service) => {
      const active = item.is_active === 1;

      Alert.alert(
        active ? "Nonaktifkan layanan?" : "Aktifkan layanan?",
        item.name,
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Lanjutkan",
            onPress: async () => {
              try {
                await setServiceActive(item.id, !active);
                await load(filtersRef.current.page);
              } catch (error: any) {
                Alert.alert("Gagal", error.message);
              }
            },
          },
        ],
      );
    },
    [load],
  );

  // ====================================================
  // DELETE
  // ====================================================

  const remove = useCallback(
    (item: Service) => {
      Alert.alert(
        "Hapus layanan",
        `Hapus "${item.name}" secara permanen?`,
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Hapus",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteService(item.id);
                const currentPage = filtersRef.current.page;
                const nextPage =
                  rows.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;

                await load(nextPage);

                Alert.alert("Berhasil", "Layanan berhasil dihapus.");
              } catch (error: any) {
                Alert.alert("Gagal menghapus", error.message);
              }
            },
          },
        ],
      );
    },
    [load, rows.length],
  );

  // ====================================================
  // CARD
  // ====================================================

  const renderItem = useCallback(
    ({ item }: { item: Service }) => (
      <ServiceCard
        item={item}
        columns={columns}
        onToggleStatus={toggleStatus}
        onRemove={remove}
      />
    ),
    [columns, toggleStatus, remove],
  );

  const keyExtractor = useCallback((item: Service) => String(item.id), []);

  // ====================================================
  // HEADER
  // ====================================================

  const Header = (
    <View>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <ArrowLeft size={19} color={C.black} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Layanan</Text>
          <Text style={styles.subtitle}>Manajemen harga laundry</Text>
        </View>

        <Pressable
          onPress={() => router.push("/services/form")}
          style={styles.addButton}
        >
          <Plus size={19} color={C.white} />
          {!landscape && (
            <Text style={styles.addText}>Tambah</Text>
          )}
        </Pressable>
      </View>

      {/* STATISTICS */}

      <View style={styles.stats}>
        {[
          { label: "Total", value: stats.total, color: C.primary },
          { label: "Aktif", value: stats.active, color: C.green },
          { label: "Nonaktif", value: stats.inactive, color: C.red },
        ].map((item) => (
          <View key={item.label} style={styles.statCard}>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={[styles.statValue, { color: item.color }]}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      {/* SEARCH */}

      <View style={styles.searchBox}>
        <Search size={18} color={C.muted} />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Cari nama, tipe paket..."
          placeholderTextColor={C.muted}
          style={styles.searchInput}
        />

        {!!search && (
          <Pressable onPress={() => setSearch("")}>
            <X size={17} color={C.muted} />
          </Pressable>
        )}
      </View>

      {/* CATEGORY FILTER */}

      <Text style={styles.filterTitle}>Kategori layanan</Text>

      <View style={styles.filterRow}>
        {[
          ["all", "Semua"],
          ["kiloan", "Kiloan"],
          ["satuan", "Satuan"],
          ["karpet", "Karpet"],
        ].map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setCategory(value as Category)}
            style={[
              styles.filterButton,
              category === value && styles.filterSelected,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                category === value && { color: C.white },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* STATUS FILTER */}

      <View style={styles.statusRow}>
        {[
          ["all", "Semua status"],
          ["active", "Aktif"],
          ["inactive", "Nonaktif"],
        ].map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setStatus(value as Status)}
            style={[
              styles.statusButton,
              status === value && styles.statusSelected,
            ]}
          >
            <Text
              style={[
                styles.statusFilterText,
                status === value && { color: C.primary },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>Daftar layanan</Text>
        <Text style={styles.resultText}>{total} layanan</Text>
      </View>
    </View>
  );

  // ====================================================
  // RENDER
  // ====================================================

  const listContentStyle = useMemo(
    () => [
      styles.content,
      { paddingTop: Math.max(insets.top, 16) },
      landscape && { paddingHorizontal: 24 },
    ],
    [insets.top, landscape],
  );

  return (
    <View style={styles.container}>
      <FlashList
        key={columns}
        data={rows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={columns}
        ListHeaderComponent={Header}
        contentContainerStyle={listContentStyle}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={refresh}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={C.primary} size="large" />
              <Text style={styles.emptyText}>Memuat layanan...</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Shirt size={32} color={C.muted} />
              <Text style={styles.emptyTitle}>
                Layanan tidak ditemukan
              </Text>
              <Text style={styles.emptyText}>
                Ubah pencarian atau filter untuk melihat data lainnya.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          !loading && total > 0 ? (
            <View style={styles.pagination}>
              <Text style={styles.paginationInfo}>
                Halaman {page} dari {totalPages}
              </Text>

              <View style={styles.paginationActions}>
                <Pressable
                  disabled={page <= 1}
                  onPress={() => load(page - 1)}
                  style={[
                    styles.pageButton,
                    page <= 1 && styles.disabled,
                  ]}
                >
                  <ChevronLeft size={18} color={C.black} />
                </Pressable>

                <Pressable
                  disabled={page >= totalPages}
                  onPress={() => load(page + 1)}
                  style={[
                    styles.pageButton,
                    page >= totalPages && styles.disabled,
                  ]}
                >
                  <ChevronRight size={18} color={C.black} />
                </Pressable>
              </View>
            </View>
          ) : undefined
        }
      />

      {loading && rows.length > 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={C.primary} />
        </View>
      )}
    </View>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 35,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 5,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: C.black,
  },
  subtitle: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
  },
  addButton: {
    backgroundColor: C.primary,
    borderRadius: 5,
    paddingHorizontal: 14,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  addText: {
    color: C.white,
    fontSize: 12,
    fontWeight: "800",
  },
  stats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    padding: 13,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 5,
  },
  statLabel: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "700",
  },
  statValue: {
    fontSize: 23,
    fontWeight: "900",
    marginTop: 5,
  },
  searchBox: {
    height: 45,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: C.black,
    paddingVertical: 0,
  },
  filterTitle: {
    color: C.black,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 17,
    marginBottom: 9,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 4,
  },
  filterSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.text,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10,
  },
  statusButton: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: "#EEF1F6",
  },
  statusSelected: {
    backgroundColor: C.light,
  },
  statusFilterText: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  listHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 23,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: C.black,
  },
  resultText: {
    fontSize: 10,
    color: C.muted,
  },
  columnWrapper: {
    gap: 10,
  },
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 5,
    padding: 13,
    marginBottom: 10,
    minWidth: 0,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    backgroundColor: C.light,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: C.black,
    fontSize: 12,
    fontWeight: "900",
  },
  meta: {
    color: C.muted,
    fontSize: 10,
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "800",
  },
  price: {
    color: C.black,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 4,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "900",
  },
  extraInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6FA",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 5,
  },
  infoText: {
    color: C.text,
    fontSize: 9,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 7,
    marginTop: 13,
  },
  action: {
    flex: 1,
    minWidth: 0,
    height: 36,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  deleteButton: {
    width: 38,
    height: 36,
    backgroundColor: C.redLight,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 45,
    paddingHorizontal: 20,
    backgroundColor: C.white,
    borderRadius: 5,
  },
  emptyTitle: {
    color: C.black,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 12,
  },
  emptyText: {
    color: C.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 7,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 17,
  },
  paginationInfo: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "700",
  },
  paginationActions: {
    flexDirection: "row",
    gap: 8,
  },
  pageButton: {
    width: 38,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.35,
  },
  loadingOverlay: {
    position: "absolute",
    right: 20,
    top: 20,
    backgroundColor: C.white,
    padding: 10,
    borderRadius: 5,
  },
});
