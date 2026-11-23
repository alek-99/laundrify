
import { router } from "expo-router";
import {
  ArrowDownUp,
  ArrowLeft,
  Banknote,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Download,
  FileBarChart,
  Info,
  Package,
  Settings,
  Shirt,
  ShoppingBag,
  Users,
  Wallet,
  Workflow,
} from "lucide-react-native";
import type { ComponentType } from "react";
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

const C = {
  background: "#F1F3F7",
  white: "#FFFFFF",
  primary: "#3157D5",
  primaryDark: "#2445B5",
  primaryLight: "#EAF0FF",
  text: "#202938",
  secondary: "#667085",
  muted: "#98A2B3",
  border: "#D7DDE8",
  borderDark: "#BCC6D6",
  green: "#16845F",
  greenLight: "#EAF5EF",
  orange: "#C78319",
  orangeLight: "#FFF4DF",
  inset: "#E5E9F0",
};

type GuideIcon = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

type GuideStepProps = {
  number: string;
  title: string;
  description: string;
  bullets?: string[];
  icon: GuideIcon;
  actionLabel?: string;
  onAction?: () => void;
};

function GuideStep({
  number,
  title,
  description,
  bullets = [],
  icon: Icon,
  actionLabel,
  onAction,
}: GuideStepProps) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepTop}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>{number}</Text>
        </View>

        <View style={styles.stepIcon}>
          <Icon size={19} color={C.primary} strokeWidth={2} />
        </View>
      </View>

      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDescription}>{description}</Text>

      {bullets.length > 0 && (
        <View style={styles.bulletList}>
          {bullets.map((item, index) => (
            <View key={`${number}-${index}`} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.actionButtonText}>
            {actionLabel}
          </Text>
          <Text style={styles.actionArrow}>→</Text>
        </Pressable>
      )}
    </View>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
    </View>
  );
}

function Note({
  title,
  description,
  tone = "blue",
}: {
  title: string;
  description: string;
  tone?: "blue" | "green" | "orange";
}) {
  const palette =
    tone === "green"
      ? { background: C.greenLight, color: C.green }
      : tone === "orange"
        ? { background: C.orangeLight, color: C.orange }
        : { background: C.primaryLight, color: C.primary };

  return (
    <View
      style={[
        styles.note,
        { borderLeftColor: palette.color },
      ]}
    >
      <View
        style={[
          styles.noteIcon,
          { backgroundColor: palette.background },
        ]}
      >
        <Info size={17} color={palette.color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.noteTitle, { color: palette.color }]}>
          {title}
        </Text>

        <Text style={styles.noteDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

function InfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: GuideIcon;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardIcon}>
        <Icon size={19} color={C.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.infoCardTitle}>{title}</Text>
        <Text style={styles.infoCardText}>{description}</Text>
      </View>
    </View>
  );
}

export default function GuideScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        {...({ backgroundColor: C.background } as object)}
      />

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          accessibilityLabel="Kembali"
        >
          <ArrowLeft size={19} color={C.text} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerEyebrow}>
            PUSAT BANTUAN
          </Text>
          <Text style={styles.headerTitle}>
            Panduan Penggunaan
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <BookOpen size={20} color={C.primary} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Workflow size={23} color="#FFFFFF" />
            </View>
            <Text style={styles.heroLabel}>USER GUIDE / 2026</Text>
          </View>

          <Text style={styles.heroTitle}>
            Mulai kelola laundry dengan Laundrify
          </Text>

          <Text style={styles.heroDescription}>
            Ikuti panduan penggunaan aplikasi untuk mengelola
            pelanggan, layanan, pesanan, pembayaran, hingga
            laporan keuangan.
          </Text>

          <View style={styles.heroMeta}>
            <CheckCircle2 size={15} color="#FFFFFF" />
            <Text style={styles.heroMetaText}>
              Panduan alur kerja aplikasi
            </Text>
          </View>
        </View>

        {/* ALUR UTAMA */}
        <SectionHeading
          eyebrow="01 / ALUR UTAMA"
          title="Urutan penggunaan aplikasi"
          description="Mulai dari pengaturan awal, kemudian lanjutkan dengan pencatatan transaksi laundry."
        />

        <GuideStep
          number="01"
          title="Lengkapi informasi usaha"
          description="Buka menu Pengaturan untuk mengisi identitas usaha laundry."
          icon={Settings}
          bullets={[
            "Masukkan nama usaha laundry.",
            "Masukkan nomor telepon usaha.",
            "Lengkapi informasi yang tersedia.",
            "Tekan Simpan untuk menyimpan pengaturan.",
          ]}
          actionLabel="Buka Pengaturan"
          onAction={() => router.push("/settings")}
        />

        <GuideStep
          number="02"
          title="Kelola layanan laundry"
          description="Tambahkan jenis layanan yang tersedia sebelum membuat pesanan."
          icon={Shirt}
          bullets={[
            "Buka menu Layanan.",
            "Tekan tombol Tambah untuk membuat layanan baru.",
            "Masukkan nama layanan.",
            "Tentukan satuan layanan seperti kg atau pcs.",
            "Masukkan harga layanan.",
            "Lengkapi estimasi waktu pengerjaan jika tersedia.",
            "Simpan layanan agar dapat digunakan pada pesanan.",
          ]}
          actionLabel="Kelola Layanan"
          onAction={() => router.push("/services")}
        />

        <GuideStep
          number="03"
          title="Daftarkan pelanggan"
          description="Data pelanggan digunakan untuk menghubungkan identitas pelanggan dengan transaksi laundry."
          icon={Users}
          bullets={[
            "Buka menu Pelanggan.",
            "Tekan tombol Tambah Pelanggan.",
            "Masukkan nama pelanggan.",
            "Masukkan nomor telepon pelanggan.",
            "Lengkapi alamat atau informasi tambahan jika diperlukan.",
            "Simpan data pelanggan.",
            "Gunakan fitur pencarian untuk menemukan pelanggan.",
          ]}
          actionLabel="Kelola Pelanggan"
          onAction={() => router.push("/customers")}
        />

        <GuideStep
          number="04"
          title="Buat pesanan laundry"
          description="Pesanan merupakan transaksi utama yang menghubungkan pelanggan dengan layanan laundry."
          icon={ShoppingBag}
          bullets={[
            "Buka menu Pesanan.",
            "Tekan tombol Buat Pesanan.",
            "Pilih pelanggan yang melakukan transaksi.",
            "Pilih layanan laundry yang dipesan.",
            "Masukkan jumlah atau berat cucian.",
            "Periksa harga dan subtotal pesanan.",
            "Masukkan diskon apabila tersedia.",
            "Lengkapi estimasi waktu selesai dan catatan.",
            "Simpan pesanan.",
            "Periksa nomor pesanan yang dibuat sistem.",
          ]}
          actionLabel="Buat Pesanan"
          onAction={() => router.push("/orders/create")}
        />

        <GuideStep
          number="05"
          title="Pantau proses pengerjaan"
          description="Setiap pesanan dapat dipantau melalui halaman daftar pesanan dan detail pesanan."
          icon={ClipboardList}
          bullets={[
            "Buka menu Pesanan.",
            "Pilih pesanan yang ingin diperiksa.",
            "Periksa informasi pelanggan dan detail layanan.",
            "Perbarui status sesuai proses pengerjaan.",
            "Periksa estimasi selesai dan catatan pesanan.",
            "Ubah status menjadi selesai setelah pesanan dituntaskan.",
          ]}
          actionLabel="Lihat Daftar Pesanan"
          onAction={() => router.push("/orders")}
        />

        <GuideStep
          number="06"
          title="Catat pembayaran pelanggan"
          description="Pembayaran digunakan untuk mencatat uang yang diterima dari pelanggan atas suatu pesanan."
          icon={Banknote}
          bullets={[
            "Buka daftar pesanan.",
            "Pilih pesanan yang akan dibayar.",
            "Masuk ke bagian pembayaran pada detail pesanan.",
            "Masukkan nominal pembayaran.",
            "Pilih metode pembayaran yang tersedia.",
            "Tambahkan catatan atau referensi transaksi jika diperlukan.",
            "Simpan pembayaran.",
            "Periksa total pembayaran dan sisa tagihan.",
            "Untuk pembayaran bertahap, catat pembayaran berikutnya sesuai nominal yang diterima.",
          ]}
        />

        <GuideStep
          number="07"
          title="Kelola pemasukan dan pengeluaran"
          description="Menu Keuangan digunakan untuk mencatat transaksi kas usaha di luar pencatatan pembayaran pesanan."
          icon={Wallet}
          bullets={[
            "Buka menu Keuangan.",
            "Pilih jenis transaksi pemasukan atau pengeluaran.",
            "Pilih kategori transaksi.",
            "Masukkan tanggal transaksi.",
            "Masukkan nominal transaksi.",
            "Tambahkan keterangan jika diperlukan.",
            "Simpan transaksi.",
            "Periksa kembali daftar transaksi.",
          ]}
          actionLabel="Buka Keuangan"
          onAction={() => router.push("/finance")}
        />

        <GuideStep
          number="08"
          title="Lihat laporan usaha"
          description="Gunakan menu Laporan untuk memantau perkembangan transaksi dan kondisi keuangan usaha."
          icon={FileBarChart}
          bullets={[
            "Buka menu Laporan.",
            "Pilih periode laporan yang ingin diperiksa.",
            "Periksa total pemasukan.",
            "Periksa total pengeluaran.",
            "Periksa selisih pemasukan dan pengeluaran.",
            "Lihat rincian transaksi berdasarkan periode.",
            "Gunakan laporan sebagai bahan evaluasi usaha.",
          ]}
          actionLabel="Lihat Laporan"
          onAction={() => router.push("/reports")}
        />

        <GuideStep
          number="09"
          title="Ekspor data ke Excel"
          description="Fitur ekspor digunakan untuk membuat arsip data transaksi dan laporan dalam format Excel."
          icon={Download}
          bullets={[
            "Buka menu Pengaturan.",
            "Cari bagian Export Data.",
            "Pilih periode Mingguan, Bulanan, atau Tahunan.",
            "Masukkan tanggal acuan sesuai kebutuhan.",
            "Periksa rentang tanggal ekspor.",
            "Tekan tombol Export Excel.",
            "Pilih aplikasi untuk menyimpan atau membagikan file.",
            "Simpan file pada lokasi yang aman.",
          ]}
          actionLabel="Buka Pengaturan"
          onAction={() => router.push("/settings")}
        />

        {/* INFORMASI */}
        <SectionHeading
          eyebrow="02 / INFORMASI PENTING"
          title="Tips penggunaan aplikasi"
          description="Perhatikan beberapa hal berikut agar pencatatan transaksi tetap teratur."
        />

        <Note
          title="Siapkan data sebelum transaksi"
          description="Pastikan layanan dan pelanggan sudah terdaftar sebelum membuat pesanan baru."
        />

        <Note
          title="Catat pembayaran sesuai uang diterima"
          description="Masukkan nominal yang benar-benar diterima dari pelanggan. Jangan memasukkan seluruh tagihan jika pelanggan baru membayar sebagian."
          tone="green"
        />

        <Note
          title="Hindari transaksi ganda"
          description="Pembayaran pesanan sudah dicatat melalui menu pembayaran. Jangan mencatat nominal pembayaran yang sama kembali sebagai pemasukan manual."
          tone="orange"
        />

        <Note
          title="Periksa kembali pesanan"
          description="Pastikan nama pelanggan, layanan, jumlah cucian, harga, dan diskon sudah benar sebelum menyimpan pesanan."
        />

        {/* DATABASE */}
        <SectionHeading
          eyebrow="03 / SISTEM"
          title="Informasi aplikasi"
          description="Informasi mengenai penyimpanan dan ringkasan data."
        />

        <InfoCard
          icon={Package}
          title="Penyimpanan data"
          description="Aplikasi menggunakan database lokal pada perangkat. Data tersimpan pada perangkat tempat aplikasi digunakan. Lakukan ekspor Excel secara berkala sebagai arsip dan cadangan data."
        />

        <InfoCard
          icon={ArrowDownUp}
          title="Dashboard dan ringkasan data"
          description="Dashboard menampilkan ringkasan aktivitas usaha berdasarkan data yang tersimpan. Gunakan dashboard untuk memantau pesanan, pelanggan, dan kondisi keuangan."
        />

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>LAUNDRIFY</Text>
          <Text style={styles.footerText}>
            LAUNDRY MANAGEMENT SYSTEM
          </Text>
          <Text style={styles.footerCaption}>
            Panduan penggunaan aplikasi
          </Text>
          <View style={styles.footerLine} />
          <Text style={styles.footerVersion}>
            USER GUIDE • VERSION 1.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 15,
    backgroundColor: C.background,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  backButton: {
    width: 40,
    height: 40,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.borderDark,
    alignItems: "center",
    justifyContent: "center",
  },

  headerEyebrow: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  headerTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },

  headerIcon: {
    width: 40,
    height: 40,
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: "#C9D5F7",
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 35,
  },

  hero: {
    backgroundColor: C.primary,
    borderWidth: 1,
    borderColor: C.primaryDark,
    padding: 19,
    marginBottom: 28,
    elevation: 0,
    shadowColor: "transparent",
  },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  heroIcon: {
    width: 43,
    height: 43,
    backgroundColor: "#2649B9",
    borderWidth: 1,
    borderColor: "#6C85DE",
    alignItems: "center",
    justifyContent: "center",
  },

  heroLabel: {
    color: "#DCE5FF",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  heroTitle: {
    color: C.white,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  heroDescription: {
    color: "#E4EAFF",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 9,
  },

  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#7189DF",
  },

  heroMetaText: {
    color: "#E4EAFF",
    fontSize: 9,
    fontWeight: "700",
  },

  sectionHeading: {
    marginBottom: 14,
    marginTop: 5,
    paddingLeft: 11,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
  },

  eyebrow: {
    color: C.primary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 6,
  },

  sectionTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "900",
  },

  sectionDescription: {
    color: C.secondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  stepCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.borderDark,
    padding: 15,
    marginBottom: 12,

    // Flat inset appearance
    borderBottomWidth: 3,
    borderBottomColor: C.inset,
    borderRightWidth: 2,
    borderRightColor: C.inset,

    elevation: 0,
    shadowColor: "transparent",
  },

  stepTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  stepNumber: {
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: "#CAD5F5",
    minWidth: 36,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },

  stepNumberText: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "900",
  },

  stepIcon: {
    width: 36,
    height: 36,
    backgroundColor: "#F1F4F9",
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },

  stepTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "900",
  },

  stepDescription: {
    color: C.secondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },

  bulletList: {
    gap: 9,
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EDF0F5",
  },

  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },

  bulletDot: {
    width: 6,
    height: 6,
    backgroundColor: C.primary,
    marginTop: 5,
  },

  bulletText: {
    flex: 1,
    color: C.text,
    fontSize: 10,
    lineHeight: 16,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: "#CAD5F5",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },

  actionButtonText: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "800",
  },

  actionArrow: {
    color: C.primary,
    fontSize: 17,
    fontWeight: "900",
  },

  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    padding: 13,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 3,
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.inset,
  },

  noteIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  noteTitle: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
  },

  noteDescription: {
    color: C.secondary,
    fontSize: 10,
    lineHeight: 16,
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    padding: 14,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.borderDark,
    borderBottomWidth: 3,
    borderBottomColor: C.inset,
    marginTop: 10,
  },

  infoCardIcon: {
    width: 35,
    height: 35,
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: "#CAD5F5",
    alignItems: "center",
    justifyContent: "center",
  },

  infoCardTitle: {
    color: C.text,
    fontSize: 11,
    fontWeight: "900",
  },

  infoCardText: {
    color: C.secondary,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 5,
  },

  footer: {
    alignItems: "center",
    marginTop: 30,
    paddingTop: 19,
    borderTopWidth: 1,
    borderTopColor: C.borderDark,
  },

  footerBrand: {
    color: C.primary,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
  },

  footerText: {
    color: C.muted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginTop: 5,
  },

  footerCaption: {
    color: C.secondary,
    fontSize: 9,
    marginTop: 8,
  },

  footerLine: {
    width: 35,
    height: 3,
    backgroundColor: C.primary,
    marginTop: 15,
  },

  footerVersion: {
    color: C.muted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 10,
  },

  pressed: {
    opacity: 0.65,
  },
});
