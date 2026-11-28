
import { FlashList } from "@shopify/flash-list";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import Award from "lucide-react-native/icons/award";
import CheckCircle2 from "lucide-react-native/icons/circle-check";
import CircleAlert from "lucide-react-native/icons/circle-exclamation-point";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import Search from "lucide-react-native/icons/search";
import Users from "lucide-react-native/icons/users";
import Wallet from "lucide-react-native/icons/wallet";
import XCircle from "lucide-react-native/icons/circle-x";

import { Page, money } from "../../../components/ui";
import {
  MemberService,
  type SubscriptionListRow,
  type SubscriptionStats,
} from "../../../services/member.service";
import { formatDateMedium } from "../../../utils/format";

type FilterStatus = "all" | "active" | "used_up" | "cancelled";

const PAGE_SIZE = 30;

const C = {
  primary: "#3159C9",
  primaryLight: "#E7EDFF",
  background: "#EEF1F5",
  white: "#FFFFFF",
  text: "#263244",
  muted: "#8490A3",
  border: "#D8DEE8",
  green: "#15803D",
  greenLight: "#DCFCE7",
  amber: "#B45309",
  amberLight: "#FEF3C7",
  red: "#D34B55",
  redLight: "#FEE2E2",
};

const statusInfo = (status: string) => {
  switch (status) {
    case "active":
      return {
        label: "Aktif",
        color: C.green,
        background: C.greenLight,
      };
    case "used_up":
      return {
        label: "Kuota Habis",
        color: C.amber,
        background: C.amberLight,
      };
    default:
      return {
        label: "Dibatalkan",
        color: C.red,
        background: C.redLight,
      };
  }
};

const MemberCard = memo(function MemberCard({ member }: { member: SubscriptionListRow }) {
  const status = statusInfo(member.status);
  const used = Math.max(0, member.used_kg);
  const remaining = Math.max(0, member.remaining_kg);
  const progress =
    member.quota_kg > 0
      ? Math.min(100, (used / member.quota_kg) * 100)
      : 0;

  return (
    <View style={[styles.memberCard, { marginBottom: 12 }]}>
      <View style={styles.memberTop}>
        <View style={styles.memberIcon}>
          <Award size={21} color={C.primary} />
        </View>

        <View style={styles.memberIdentity}>
          <Text style={styles.customerName}>
            {member.customer_name}
          </Text>
          <Text style={styles.memberNumber}>
            {member.member_no}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: status.background },
          ]}
        >
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.packageBox}>
        <Text style={styles.packageName}>
          {member.package_name}
        </Text>
        <Text style={styles.packageType}>
          Paket {member.package_type}
        </Text>
      </View>

      <View style={styles.quotaNumbers}>
        <QuotaValue label="Total Kuota" value={`${member.quota_kg} KG`} />
        <QuotaValue label="Terpakai" value={`${used} KG`} />
        <QuotaValue
          label="Sisa Kuota"
          value={`${remaining} KG`}
          highlight
        />
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress}%` },
          ]}
        />
      </View>

      <View style={styles.progressCaption}>
        <Text style={styles.progressText}>
          {Math.round(progress)}% digunakan
        </Text>
        <Text style={styles.progressText}>
          Dibeli: {formatDateMedium(member.start_date)}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.priceLabel}>Harga pembelian</Text>
        <Text style={styles.priceValue}>
          {money(member.price_paid)}
        </Text>
      </View>
    </View>
  );
});

export default function MemberListScreen() {
  const [members, setMembers] = useState<SubscriptionListRow[]>([]);
  const [statistics, setStatistics] = useState<SubscriptionStats>({
    total: 0,
    active: 0,
    usedUp: 0,
    remainingKg: 0,
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const filtersRef = useRef({ search, filter, count: 0 });
  const hasLoadedOnceRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    filtersRef.current = { search, filter, count: members.length };
  }, [search, filter, members.length]);

  const loadMembers = useCallback(
    async (
      mode: "initial" | "refresh" | "more" = "initial",
      searchValue = filtersRef.current.search,
      filterValue = filtersRef.current.filter,
    ) => {
      const requestId = ++requestIdRef.current;
      const offset = mode === "more" ? filtersRef.current.count : 0;

      try {
        if (mode === "refresh") setRefreshing(true);
        else if (mode === "more") setLoadingMore(true);
        else setLoading(true);

        setError("");

        if (mode === "more") {
          const pageRes = await MemberService.getAllSubscriptions({
            search: searchValue,
            status: filterValue,
            limit: PAGE_SIZE,
            offset,
          });
          if (requestId !== requestIdRef.current) return;
          setMembers((prev) => [...prev, ...pageRes.rows]);
          setHasMore(pageRes.hasMore);
        } else {
          const [pageRes, statsRes] = await Promise.all([
            MemberService.getAllSubscriptions({
              search: searchValue,
              status: filterValue,
              limit: PAGE_SIZE,
              offset: 0,
            }),
            MemberService.getSubscriptionStatistics(),
          ]);
          if (requestId !== requestIdRef.current) return;
          setMembers(pageRes.rows);
          setHasMore(pageRes.hasMore);
          setStatistics(statsRes);
        }

        hasLoadedOnceRef.current = true;
      } catch (err: any) {
        if (requestId === requestIdRef.current) {
          setError(err?.message || "Gagal mengambil data membership.");
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      loadMembers(hasLoadedOnceRef.current ? "refresh" : "initial");
    }, [loadMembers]),
  );

  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    const timer = setTimeout(() => {
      loadMembers("refresh", search, filtersRef.current.filter);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadMembers]);

  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    loadMembers("refresh", filtersRef.current.search, filter);
  }, [filter, loadMembers]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    loadMembers("more");
  }, [hasMore, loadingMore, loading, loadMembers]);

  const keyExtractor = useCallback((item: SubscriptionListRow) => String(item.id), []);
  const renderMember = useCallback(
    ({ item }: { item: SubscriptionListRow }) => <MemberCard member={item} />,
    [],
  );

  const listHeader = useMemo(
    () => (
      <>
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Users size={19} color={C.primary} />}
            label="Total Kartu"
            value={String(statistics.total)}
            background={C.primaryLight}
          />
          <StatCard
            icon={<CheckCircle2 size={19} color={C.green} />}
            label="Member Aktif"
            value={String(statistics.active)}
            background={C.greenLight}
          />
          <StatCard
            icon={<CircleAlert size={19} color={C.amber} />}
            label="Kuota Habis"
            value={String(statistics.usedUp)}
            background={C.amberLight}
          />
          <StatCard
            icon={<Wallet size={19} color={C.primary} />}
            label="Sisa Kuota"
            value={`${statistics.remainingKg} KG`}
            background={C.primaryLight}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(
            [
              ["all", "Semua"],
              ["active", "Aktif"],
              ["used_up", "Kuota Habis"],
              ["cancelled", "Dibatalkan"],
            ] as [FilterStatus, string][]
          ).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setFilter(value)}
              style={[
                styles.filterButton,
                filter === value && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === value && styles.filterTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listTitle}>Daftar Member</Text>
            <Text style={styles.listSubtitle}>
              {members.length} kartu ditampilkan{hasMore ? "+" : ""}
            </Text>
          </View>

          <Pressable
            onPress={() => loadMembers("refresh")}
            style={styles.refreshButton}
            disabled={refreshing}
          >
            <RefreshCw size={17} color={C.primary} />
          </Pressable>
        </View>
      </>
    ),
    [statistics, filter, members.length, hasMore, refreshing, loadMembers],
  );

  return (
    <Page
      title="Membership"
      subtitle="Kelola kartu member dan pemakaian kuota pelanggan."
      scroll={false}
    >
      <View style={[styles.searchBox, { marginBottom: 12 }]}>
        <Search size={19} color={C.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Cari nama, nomor kartu, atau paket..."
          placeholderTextColor={C.muted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <XCircle size={18} color={C.muted} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.stateText}>Memuat data member...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyCard}>
          <CircleAlert size={28} color={C.red} />
          <Text style={styles.emptyTitle}>Gagal memuat member</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable
            onPress={() => loadMembers("initial")}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={members}
          renderItem={renderMember}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeader}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => loadMembers("refresh")}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Award size={30} color={C.muted} />
              <Text style={styles.emptyTitle}>Member tidak ditemukan</Text>
              <Text style={styles.emptyText}>
                Belum ada data yang sesuai dengan pencarian atau filter.
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 14, alignItems: "center" }}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : undefined
          }
        />
      )}
    </Page>
  );
}

function StatCard({
  icon,
  label,
  value,
  background,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  background: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: background }]}>
        {icon}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuotaValue({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.quotaValue}>
      <Text style={styles.quotaLabel}>{label}</Text>
      <Text
        style={[
          styles.quotaNumber,
          highlight && { color: C.green },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 13,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    color: C.text,
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    color: C.muted,
    fontSize: 12,
    marginTop: 3,
  },
  searchBox: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 13,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 13,
    paddingVertical: 11,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 14,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterButtonActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.muted,
  },
  filterTextActive: {
    color: C.white,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  listTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "800",
  },
  listSubtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 3,
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  memberList: {
    gap: 12,
    paddingBottom: 24,
  },
  memberCard: {
    backgroundColor: C.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  memberTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  memberIdentity: {
    flex: 1,
  },
  customerName: {
    color: C.text,
    fontSize: 14,
    fontWeight: "800",
  },
  memberNumber: {
    color: C.muted,
    fontSize: 11,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  packageBox: {
    backgroundColor: "#F7F8FA",
    borderRadius: 9,
    padding: 11,
    marginTop: 14,
  },
  packageName: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
  },
  packageType: {
    color: C.muted,
    fontSize: 11,
    marginTop: 4,
  },
  quotaNumbers: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 15,
  },
  quotaValue: {
    flex: 1,
  },
  quotaLabel: {
    color: C.muted,
    fontSize: 10,
  },
  quotaNumber: {
    color: C.text,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 5,
  },
  progressTrack: {
    height: 7,
    backgroundColor: "#E9EDF3",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 14,
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.primary,
    borderRadius: 10,
  },
  progressCaption: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7,
  },
  progressText: {
    color: C.muted,
    fontSize: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 13,
    paddingTop: 12,
  },
  priceLabel: {
    color: C.muted,
    fontSize: 11,
  },
  priceValue: {
    color: C.text,
    fontSize: 12,
    fontWeight: "800",
  },
  centerState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  stateText: {
    color: C.muted,
    fontSize: 12,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 25,
    gap: 9,
  },
  emptyTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "800",
  },
  emptyText: {
    color: C.muted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 7,
    backgroundColor: C.primary,
    borderRadius: 9,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    color: C.white,
    fontSize: 12,
    fontWeight: "700",
  },
});
