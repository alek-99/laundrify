
import { router, useFocusEffect } from "expo-router";
import ArrowLeftRight from "lucide-react-native/icons/arrow-left-right";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Clock3 from "lucide-react-native/icons/clock-3";
import FileText from "lucide-react-native/icons/file-text";
import HelpCircle from "lucide-react-native/icons/circle-question-mark";
import Home from "lucide-react-native/icons/house";
import Plus from "lucide-react-native/icons/plus";
import ReceiptText from "lucide-react-native/icons/receipt-text";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import Settings from "lucide-react-native/icons/settings";
import Shirt from "lucide-react-native/icons/shirt";
import ShoppingBag from "lucide-react-native/icons/shopping-bag";
import TrendingUp from "lucide-react-native/icons/trending-up";
import Users from "lucide-react-native/icons/users";
import Wallet from "lucide-react-native/icons/wallet";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getDashboardData,
  type DashboardData,
} from "../repositories/dasbhoard.repository";
import { formatDateFull, formatMoney as money, formatNumber } from "../utils/format";

const COLORS = {
  background: "#F4F6FA",
  white: "#FFFFFF",
  surface: "#FFFFFF",
  primary: "#4169E1",
  primaryDark: "#3155C7",
  primaryLight: "#EDF2FF",
  text: "#202B3C",
  secondary: "#8993A4",
  border: "#E9EDF3",
  muted: "#F0F2F6",
  green: "#16A36A",
  greenLight: "#EAF8F0",
  orange: "#E58A35",
  orangeLight: "#FFF5E9",
  purple: "#8065CC",
  purpleLight: "#F2EEFF",
  red: "#D95757",
  redLight: "#FFF0F0",
  cyan: "#3998A7",
  cyanLight: "#EAF7F9",
};

const menus = [
  {
    title: "Pelanggan",
    description: "Data pelanggan",
    icon: Users,
    color: "#4169E1",
    background: "#EDF2FF",
  },
  {
    title: "Pesanan",
    description: "Kelola pesanan",
    icon: ShoppingBag,
    color: "#D99A24",
    background: "#FFF6E5",
  },
  {
    title: "Layanan",
    description: "Jenis layanan",
    icon: Shirt,
    color: "#8065CC",
    background: "#F2EEFF",
  },
  // {
  //   title: "Pembayaran",
  //   description: "Transaksi masuk",
  //   icon: Wallet,
  //   color: "#16A36A",
  //   background: "#EAF8F0",
  // },
  {
    title: "Keuangan",
    description: "Kas usaha",
    icon: ArrowLeftRight,
    color: "#E4775F",
    background: "#FFF0EC",
  },
  {
    title: "Laporan",
    description: "Rekap usaha",
    icon: FileText,
    color: "#3998A7",
    background: "#EAF7F9",
  },
  {
    title: "Panduan",
    description: "Cara penggunaan",
    icon: HelpCircle,
    color: "#4169E1",
    background: "#EDF2FF",
  },
];

const statusLabels: Record<string, string> = {
  received: "Diterima",
  processing: "Diproses",
  washing: "Dicuci",
  drying: "Dikeringkan",
  ironing: "Disetrika",
  ready: "Siap diambil",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const statusColors: Record<
  string,
  { color: string; background: string }
> = {
  received: { color: "#4169E1", background: "#EDF2FF" },
  processing: { color: "#E58A35", background: "#FFF5E9" },
  washing: { color: "#C18A25", background: "#FFF6E5" },
  drying: { color: "#8065CC", background: "#F2EEFF" },
  ironing: { color: "#8065CC", background: "#F2EEFF" },
  ready: { color: "#16A36A", background: "#EAF8F0" },
  completed: { color: "#16A36A", background: "#EAF8F0" },
  cancelled: { color: "#D95757", background: "#FFF0F0" },
};

// REUSABLE COMPONENTS
const SectionTitle = memo(function SectionTitle({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {action ? (
        <Pressable onPress={onPress} style={styles.seeAll}>
          <Text style={styles.seeAllText}>{action}</Text>
          <ChevronRight size={16} color={COLORS.primary} />
        </Pressable>
      ) : null}
    </View>
  );
});

const StatCard = memo(function StatCard({
  icon: Icon,
  value,
  label,
  color,
  background,
}: {
  icon: typeof ShoppingBag;
  value: number;
  label: string;
  color: string;
  background: string;
}) {
  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          { backgroundColor: background },
        ]}
      >
        <Icon size={19} color={color} strokeWidth={2} />
      </View>

      <Text style={styles.statValue}>
        {formatNumber(value)}
      </Text>

      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});

const MenuCard = memo(function MenuCard({
  menu,
  onPress,
}: {
  menu: (typeof menus)[number];
  onPress: () => void;
}) {
  const Icon = menu.icon;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.menuTop}>
        <View
          style={[
            styles.menuIcon,
            { backgroundColor: menu.background },
          ]}
        >
          <Icon
            size={22}
            color={menu.color}
            strokeWidth={2}
          />
        </View>

        <ChevronRight
          size={17}
          color={COLORS.secondary}
        />
      </View>

      <View>
        <Text style={styles.menuTitle}>{menu.title}</Text>
        <Text style={styles.menuDescription}>
          {menu.description}
        </Text>
      </View>
    </Pressable>
  );
});

// DASHBOARD
export default function Index() {
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFetchingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const todayLabel = useMemo(
    () => formatDateFull(new Date()).toUpperCase(),
    [],
  );

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const data = await getDashboardData();
        setDashboard(data);
        hasLoadedRef.current = true;
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Gagal memuat dashboard.";

        if (!silent) {
          Alert.alert("Gagal memuat data", message);
        }
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // Refresh saat fokus layar atau kembali dari background (tanpa polling 5 detik)
  useFocusEffect(
    useCallback(() => {
      loadDashboard(hasLoadedRef.current);

      const subscription = AppState.addEventListener(
        "change",
        (state) => {
          if (state === "active") {
            loadDashboard(true);
          }
        },
      );

      return () => {
        subscription.remove();
      };
    }, [loadDashboard]),
  );

  // NAVIGATION
  const openMenu = useCallback((name: string) => {
    const routes: Record<string, string> = {
      Pelanggan: "/customers",
      Pesanan: "/orders",
      Layanan: "/services",
      // Pembayaran: "/payments/create",
      Keuangan: "/finance",
      Laporan: "/reports",
      Pengaturan: "/settings",
      Panduan: "/guide",
      "Semua Pesanan": "/orders",
      "Tambah Pesanan": "/orders/create",
    };

    router.push((routes[name] || "/orders") as never);
  }, []);

  const recentOrders = dashboard?.recentOrders ?? [];

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        {...({ backgroundColor: COLORS.background } as object)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 18) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <Image
                source={require("@/assets/images/logo.png")}
                style={styles.brandLogo}
                resizeMode="contain"
              />

              <Text style={styles.brand}>
                laundrify
                <Text style={{ color: COLORS.primary }}>.</Text>
              </Text>
            </View>

            <Text style={styles.headerSubtitle}>
              LAUNDRY MANAGEMENT SYSTEM
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.pressed,
            ]}
            onPress={() => loadDashboard(true)}
            accessibilityLabel="Perbarui data dashboard"
          >
            {refreshing ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <RefreshCw
                size={19}
                color={COLORS.primary}
                strokeWidth={2}
              />
            )}
          </Pressable>
        </View>

        {/* GREETING */}

        <View style={styles.greeting}>
          <View style={styles.dateBadge}>
            <View style={styles.dateDot} />
            <Text style={styles.greetingDate}>
              {todayLabel}
            </Text>
          </View>

          <Text style={styles.greetingTitle}>
            Halo, Bos Laundry!
          </Text>

          <Text style={styles.greetingDescription}>
            Kelola bisnis dan pantau seluruh aktivitas laundry
            dengan lebih mudah.
          </Text>
        </View>

        {/* REVENUE */}

        <View style={styles.revenueCard}>
          <View style={styles.revenueTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.revenueLabelRow}>
                <TrendingUp
                  size={15}
                  color="#DCE6FF"
                />
                <Text style={styles.revenueLabel}>
                  PEMASUKAN HARI INI
                </Text>
              </View>

              {loading && !dashboard ? (
                <ActivityIndicator
                  color="#FFFFFF"
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 18,
                  }}
                />
              ) : (
                <Text
                  style={styles.revenueAmount}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {money(dashboard?.todayIncome ?? 0)}
                </Text>
              )}
            </View>

            <View style={styles.revenueIcon}>
              <TrendingUp
                size={25}
                color="#FFFFFF"
                strokeWidth={2}
              />
            </View>
          </View>

          <View style={styles.revenueDivider} />

          <View style={styles.revenueBottom}>
            <View>
              <Text style={styles.revenueSmallLabel}>
                Total transaksi masuk
              </Text>

              <Text style={styles.revenueSmallValue}>
                {dashboard?.todayPayments ?? 0} transaksi
              </Text>
            </View>

            <View style={styles.todayBadge}>
              <View style={styles.todayDot} />
              <Text style={styles.todayText}>
                LIVE TODAY
              </Text>
            </View>
          </View>
        </View>

        {/* STATISTICS */}

        <SectionTitle title="Ringkasan bisnis" />

        <View style={styles.statsContainer}>
          <StatCard
            icon={ShoppingBag}
            value={dashboard?.totalOrders ?? 0}
            label="Total pesanan"
            color={COLORS.primary}
            background={COLORS.primaryLight}
          />

          <StatCard
            icon={Clock3}
            value={dashboard?.activeOrders ?? 0}
            label="Dalam proses"
            color={COLORS.green}
            background={COLORS.greenLight}
          />

          <StatCard
            icon={ReceiptText}
            value={dashboard?.unpaidOrders ?? 0}
            label="Belum lunas"
            color={COLORS.orange}
            background={COLORS.orangeLight}
          />
        </View>

        {/* CUSTOMER */}

        <Pressable
          style={({ pressed }) => [
            styles.customerSummary,
            pressed && styles.pressed,
          ]}
          onPress={() => openMenu("Pelanggan")}
        >
          <View style={styles.customerIcon}>
            <Users
              size={22}
              color={COLORS.primary}
              strokeWidth={2}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.customerLabel}>
              PELANGGAN TERDAFTAR
            </Text>

            <Text style={styles.customerValue}>
              {(dashboard?.totalCustomers ?? 0).toLocaleString(
                "id-ID",
              )}{" "}
              pelanggan
            </Text>
          </View>

          <ChevronRight
            size={19}
            color={COLORS.secondary}
          />
        </Pressable>

        {/* MENUS */}

        <SectionTitle title="Menu utama" />

        <View style={styles.menuGrid}>
          {menus.map((menu) => (
            <MenuCard
              key={menu.title}
              menu={menu}
              onPress={() => openMenu(menu.title)}
            />
          ))}
        </View>

        {/* RECENT ORDERS */}

        <SectionTitle
          title="Pesanan terbaru"
          action="Lihat semua"
          onPress={() => openMenu("Semua Pesanan")}
        />

        <View style={styles.activityContainer}>
          {loading && !dashboard ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.emptyText}>
                Memuat pesanan...
              </Text>
            </View>
          ) : recentOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <ShoppingBag
                  size={25}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                Belum ada pesanan
              </Text>

              <Text style={styles.emptyText}>
                Pesanan yang dibuat akan tampil di sini.
              </Text>
            </View>
          ) : (
            recentOrders.map((item, index) => {
              const badge =
                statusColors[item.status] ??
                statusColors.received;

              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.activityItem,
                    index === recentOrders.length - 1 &&
                      styles.lastActivity,
                    pressed && styles.pressed,
                  ]}
                  onPress={() =>
                    router.push(`/orders/${item.id}` as never)
                  }
                >
                  <View style={styles.activityIcon}>
                    <ShoppingBag
                      size={19}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={styles.activityInfo}>
                    <Text
                      style={styles.activityName}
                      numberOfLines={1}
                    >
                      {item.customer_name}
                    </Text>

                    <Text
                      style={styles.activityDetail}
                      numberOfLines={1}
                    >
                      {item.order_number} ·{" "}
                      {item.services || "Layanan laundry"}
                    </Text>

                    <Text style={styles.activityAmount}>
                      {money(item.total)}
                    </Text>
                  </View>

                  <View style={styles.activityRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: badge.background,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: badge.color },
                        ]}
                      >
                        {statusLabels[item.status] ??
                          item.status}
                      </Text>
                    </View>

                    <Text style={styles.remainingText}>
                      {item.remaining > 0
                        ? `Sisa ${money(item.remaining)}`
                        : "LUNAS"}
                    </Text>
                  </View>

                  <ChevronRight
                    size={16}
                    color={COLORS.secondary}
                  />
                </Pressable>
              );
            })
          )}
        </View>

        {/* SETTINGS */}

        <Pressable
          style={({ pressed }) => [
            styles.settingsCard,
            pressed && styles.pressed,
          ]}
          onPress={() => openMenu("Pengaturan")}
        >
          <View style={styles.settingsIcon}>
            <Settings
              size={21}
              color={COLORS.primary}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.settingsTitle}>
              Pengaturan aplikasi
            </Text>

            <Text style={styles.settingsDescription}>
              Atur informasi dan preferensi laundry
            </Text>
          </View>

          <ChevronRight
            size={19}
            color={COLORS.secondary}
          />
        </Pressable>

        {/* <View style={styles.footer}>
          <Text style={styles.footerText}>
            LAUNDRIFY MANAGEMENT SYSTEM
          </Text>
        </View> */}
      </ScrollView>

      {/* BOTTOM NAVIGATION */}

      <View
        style={[
          styles.bottomNav,
          {
            height: 71 + Math.max(insets.bottom, 5),
            paddingBottom: Math.max(insets.bottom, 5),
          },
        ]}
      >
        <Pressable style={styles.navItem}>
          <Home
            size={21}
            color={COLORS.primary}
            strokeWidth={2.3}
          />
          <Text style={styles.navActive}>Beranda</Text>
          <View style={styles.navIndicator} />
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => openMenu("Pesanan")}
        >
          <ShoppingBag
            size={21}
            color={COLORS.secondary}
          />
          <Text style={styles.navText}>Pesanan</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
          onPress={() => openMenu("Tambah Pesanan")}
        >
          <Plus
            size={27}
            color="#FFFFFF"
            strokeWidth={2.5}
          />
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => openMenu("Keuangan")}
        >
          <Wallet
            size={21}
            color={COLORS.secondary}
          />
          <Text style={styles.navText}>Keuangan</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => openMenu("Pengaturan")}
        >
          <Settings
            size={21}
            color={COLORS.secondary}
          />
          <Text style={styles.navText}>Pengaturan</Text>
        </Pressable>
      </View>
    </View>
  );
}


// FLAT DESIGN + SOFT INSET STYLES
const SHADOW = {
  shadowColor: "#253858",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.055,
  shadowRadius: 8,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
  },

  // HEADER

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 29,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },

  brand: {
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -1,
  },

  headerSubtitle: {
    fontSize: 9,
    color: COLORS.secondary,
    marginTop: 5,
    letterSpacing: 1.2,
    fontWeight: "700",
  },

  refreshButton: {
    width: 43,
    height: 43,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },

  // GREETING

  greeting: {
    marginBottom: 23,
  },

  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },

  dateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
  },

  greetingDate: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.3,
  },

  greetingTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 14,
    letterSpacing: -0.7,
  },

  greetingDescription: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 6,
    lineHeight: 19,
  },

  // REVENUE

  revenueCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 19,
    marginBottom: 29,
  },

  revenueTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  revenueLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  revenueLabel: {
    fontSize: 9,
    color: "#DCE6FF",
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  revenueAmount: {
    fontSize: 27,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 16,
    letterSpacing: -0.6,
  },

  revenueIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  revenueDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 17,
  },

  revenueBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  revenueSmallLabel: {
    fontSize: 10,
    color: "#DCE6FF",
  },

  revenueSmallValue: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
    marginTop: 5,
  },

  todayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 6,
  },

  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#76E2A7",
  },

  todayText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  // SECTION

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.2,
  },

  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 5,
  },

  seeAllText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // STATISTICS

  statsContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 17,
  },

  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },

  statIcon: {
    width: 33,
    height: 33,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  statValue: {
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },

  statLabel: {
    fontSize: 9,
    color: COLORS.secondary,
    marginTop: 5,
    fontWeight: "600",
  },

  // CUSTOMER

  customerSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 29,
    ...SHADOW,
  },

  customerIcon: {
    width: 43,
    height: 43,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  customerLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },

  customerValue: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 5,
  },

  // MENU

  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 11,
    marginBottom: 29,
  },

  menuCard: {
    width: "48.5%",
    minHeight: 123,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "space-between",
    ...SHADOW,
  },

  menuTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  menuIcon: {
    width: 41,
    height: 41,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  menuTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  menuDescription: {
    fontSize: 10,
    color: COLORS.secondary,
    marginTop: 4,
    fontWeight: "500",
  },

  // INTERACTION

  pressed: {
    opacity: 0.72,
  },

  // RECENT ORDERS

  activityContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 23,
    ...SHADOW,
  },

  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted,
    gap: 8,
  },

  lastActivity: {
    borderBottomWidth: 0,
  },

  activityIcon: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },

  activityInfo: {
    flex: 1,
    minWidth: 0,
  },

  activityName: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },

  activityDetail: {
    fontSize: 9,
    color: COLORS.secondary,
    marginTop: 4,
  },

  activityAmount: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
    marginTop: 5,
  },

  activityRight: {
    alignItems: "flex-end",
    gap: 6,
  },

  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 5,
    alignItems: "center",
    maxWidth: 100,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "700",
  },

  remainingText: {
    fontSize: 8,
    color: COLORS.secondary,
    fontWeight: "600",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 10,
  },

  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  emptyText: {
    fontSize: 10,
    color: COLORS.secondary,
    textAlign: "center",
  },

  // SETTINGS

  settingsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    ...SHADOW,
  },

  settingsIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  settingsTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  settingsDescription: {
    fontSize: 9,
    color: COLORS.secondary,
    marginTop: 4,
  },

  // FOOTER

  footer: {
    alignItems: "center",
    marginTop: 23,
  },

  footerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#A7AFBD",
    letterSpacing: 1,
  },

  // BOTTOM NAVIGATION

  bottomNav: {
    height: 76,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingBottom: 5,
  },

  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: 5,
    height: 60,
  },

  navActive: {
    fontSize: 9,
    color: COLORS.primary,
    fontWeight: "800",
  },

  navText: {
    fontSize: 9,
    color: COLORS.secondary,
    fontWeight: "600",
  },

  navIndicator: {
    width: 17,
    height: 3,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 1,
  },

  addButton: {
    width: 49,
    height: 49,
    backgroundColor: COLORS.primary,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -21,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 5,
  },

  addButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
