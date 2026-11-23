
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import {
  Database,
  FileSpreadsheet,
  Info,
  Store,
  Phone,
  CalendarDays,
  Download,
  CheckCircle2,
  Table2,
  MapPin,
} from "lucide-react-native";

import {
  getAllSettings,
  setSetting,
  getLaundryAddress,
  setLaundryAddress,
} from "../../repositories/settings.repository";

import { getDatabaseInfo } from "../../repositories/meta.repository";

import {
  exportExcel,
  ExportPeriod,
  getExportRange,
} from "../../database/export-excel";

import { Button, C, Page } from "../../components/ui";

// ==========================================
// CONSTANTS
// ==========================================

const today = () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
};

const periodOptions: {
  label: string;
  value: ExportPeriod;
}[] = [
  { label: "Mingguan", value: "week" },
  { label: "Bulanan", value: "month" },
  { label: "Tahunan", value: "year" },
];

// ==========================================
// COLORS
// ==========================================

const UI = {
  background: "#F5F7FB",
  white: "#FFFFFF",
  primary: "#3157D5",
  primaryLight: "#EDF2FF",
  text: "#202938",
  secondary: "#667085",
  muted: "#98A2B3",
  border: "#E2E8F0",
  soft: "#F8FAFC",
  red: "#E5484D",
  green: "#12A36D",
};

// ==========================================
// SECTION HEADER
// ==========================================

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>{icon}</View>

      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>

        {description ? (
          <Text style={styles.sectionDescription}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ==========================================
// INPUT FIELD
// ==========================================

function SettingInput({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  keyboardType?: "default" | "phone-pad";
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View style={styles.inputWrapper}>
        <View style={styles.inputIcon}>{icon}</View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={UI.muted}
          keyboardType={keyboardType || "default"}
          autoCapitalize="none"
          style={styles.input}
        />
      </View>
    </View>
  );
}

// ==========================================
// ADDRESS INPUT
// ==========================================

function AddressInput({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>
        Alamat usaha
      </Text>

      <View style={styles.textAreaWrapper}>
        <View style={styles.textAreaIcon}>
          <MapPin size={17} color={UI.muted} />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Masukkan alamat lengkap laundry"
          placeholderTextColor={UI.muted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          autoCapitalize="sentences"
          style={styles.textArea}
        />
      </View>

      <Text style={styles.helperText}>
        Alamat ini akan digunakan pada informasi nota dan identitas usaha.
      </Text>
    </View>
  );
}

// ==========================================
// MAIN SCREEN
// ==========================================

export default function Settings() {
  const [info, setInfo] = useState<any>(null);

  // BUSINESS INFORMATION
  const [shop, setShop] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // EXPORT
  const [period, setPeriod] = useState<ExportPeriod>("month");
  const [selectedDate, setSelectedDate] = useState(today());

  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);

  // ==========================================
  // EXPORT RANGE
  // ==========================================

  const range = useMemo(() => {
    try {
      return getExportRange(period, selectedDate);
    } catch {
      return null;
    }
  }, [period, selectedDate]);

  // ==========================================
  // LOAD SETTINGS
  // ==========================================

  const load = useCallback(async () => {
    try {
      const [settings, databaseInfo, laundryAddress] =
        await Promise.all([
          getAllSettings(),
          getDatabaseInfo(),
          getLaundryAddress(),
        ]);

      setInfo(databaseInfo);

      setShop(
        settings.find(
          (item) => item.key === "business_name"
        )?.value || ""
      );

      setPhone(
        settings.find(
          (item) => item.key === "business_phone"
        )?.value || ""
      );

      setAddress(laundryAddress);
    } catch (error: any) {
      Alert.alert(
        "Gagal",
        error.message || "Tidak dapat memuat pengaturan."
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // ==========================================
  // SAVE SETTINGS
  // ==========================================

  const save = async () => {
    if (saving) return;

    try {
      setSaving(true);

      await setSetting("business_name", shop.trim());
      await setSetting("business_phone", phone.trim());
      await setLaundryAddress(address);

      Alert.alert(
        "Berhasil",
        "Informasi usaha berhasil disimpan."
      );

      await load();
    } catch (error: any) {
      Alert.alert(
        "Gagal",
        error.message || "Pengaturan gagal disimpan."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // EXPORT EXCEL
  // ==========================================

  const handleExport = async () => {
    if (exporting) return;

    try {
      if (!range) {
        Alert.alert(
          "Tanggal tidak valid",
          "Masukkan tanggal dengan format YYYY-MM-DD."
        );
        return;
      }

      setExporting(true);

      await exportExcel(period, selectedDate);
    } catch (error: any) {
      Alert.alert(
        "Export gagal",
        error.message || "Terjadi kesalahan saat membuat Excel."
      );
    } finally {
      setExporting(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <Page
      title="Pengaturan"
      subtitle="Kelola informasi dan data aplikasi Laundrify"
    >
      {/* ================================== */}
      {/* BUSINESS INFORMATION */}
      {/* ================================== */}

      <View style={styles.card}>
        <SectionHeader
          icon={<Store size={19} color={UI.primary} />}
          title="Informasi usaha"
          description="Identitas usaha laundry Anda"
        />

        <View style={styles.divider} />

        {/* BUSINESS NAME */}

        <SettingInput
          label="Nama usaha"
          value={shop}
          onChangeText={setShop}
          placeholder="Masukkan nama laundry"
          icon={<Store size={17} color={UI.muted} />}
        />

        {/* BUSINESS PHONE */}

        <SettingInput
          label="Nomor telepon"
          value={phone}
          onChangeText={setPhone}
          placeholder="Masukkan nomor kontak"
          icon={<Phone size={17} color={UI.muted} />}
          keyboardType="phone-pad"
        />

        {/* BUSINESS ADDRESS */}

        <AddressInput
          value={address}
          onChangeText={setAddress}
        />

        {/* SAVE BUTTON */}

        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && { opacity: 0.85 },
            saving && { opacity: 0.6 },
          ]}
        >
          <CheckCircle2 size={17} color={UI.white} />

          <Text style={styles.primaryButtonText}>
            {saving ? "Menyimpan..." : "Simpan pengaturan"}
          </Text>
        </Pressable>
      </View>

      {/* ================================== */}
      {/* EXPORT EXCEL */}
      {/* ================================== */}

      <View style={styles.card}>
        <SectionHeader
          icon={
            <FileSpreadsheet
              size={19}
              color={UI.primary}
            />
          }
          title="Export laporan Excel"
          description="Ekspor data aplikasi ke format .xlsx"
        />

        <View style={styles.divider} />

        <Text style={styles.inputLabel}>
          Periode laporan
        </Text>

        <View style={styles.periodContainer}>
          {periodOptions.map((option) => {
            const active = period === option.value;

            return (
              <Pressable
                key={option.value}
                onPress={() => setPeriod(option.value)}
                style={[
                  styles.periodButton,
                  active && styles.periodButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.periodText,
                    active && styles.periodTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* DATE INPUT */}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {period === "year"
              ? "Tanggal acuan (ambil tahunnya)"
              : "Tanggal acuan"}
          </Text>

          <View
            style={[
              styles.inputWrapper,
              {
                borderColor: range
                  ? UI.border
                  : UI.red,
              },
            ]}
          >
            <View style={styles.inputIcon}>
              <CalendarDays
                size={17}
                color={UI.muted}
              />
            </View>

            <TextInput
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={UI.muted}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          {!range ? (
            <Text style={styles.errorText}>
              Format tanggal tidak valid. Gunakan YYYY-MM-DD.
            </Text>
          ) : null}
        </View>

        {/* EXPORT RANGE */}

        <View style={styles.rangeBox}>
          <View style={styles.rangeHeader}>
            <CalendarDays
              size={15}
              color={UI.primary}
            />

            <Text style={styles.rangeTitle}>
              Rentang data export
            </Text>
          </View>

          <Text style={styles.rangeValue}>
            {range?.label || "Format tanggal belum valid"}
          </Text>
        </View>

        {/* EXPORT INFORMATION */}

        <View style={styles.infoBox}>
          <Info size={15} color={UI.secondary} />

          <Text style={styles.infoText}>
            Data transaksi mengikuti periode yang dipilih.
            Data master seperti pelanggan, layanan, dan kategori kas
            akan diekspor secara keseluruhan.
          </Text>
        </View>

        {/* EXPORT CONTENT */}

        <View style={styles.exportContent}>
          <View style={styles.exportContentHeader}>
            <Table2 size={15} color={UI.secondary} />

            <Text style={styles.exportContentTitle}>
              Isi laporan
            </Text>
          </View>

          <View style={styles.exportTags}>
            {[
              "Ringkasan",
              "Pelanggan",
              "Layanan",
              "Kategori kas",
              "Pesanan",
              "Detail pesanan",
              "Pembayaran",
              "Transaksi kas",
              "Riwayat status",
            ].map((item) => (
              <View
                key={item}
                style={styles.exportTag}
              >
                <Text style={styles.exportTagText}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* EXPORT BUTTON */}

        <Pressable
          onPress={handleExport}
          disabled={exporting || !range}
          style={({ pressed }) => [
            styles.primaryButton,
            (!range || exporting) && {
              opacity: 0.55,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Download size={17} color={UI.white} />

          <Text style={styles.primaryButtonText}>
            {exporting
              ? "Menyiapkan Excel..."
              : "Export ke Excel (.xlsx)"}
          </Text>
        </Pressable>
      </View>

      {/* ================================== */}
      {/* DATABASE INFORMATION */}
      {/* ================================== */}

      <View style={styles.card}>
        <SectionHeader
          icon={<Database size={19} color={UI.primary} />}
          title="Database lokal"
          description="Informasi penyimpanan aplikasi"
        />

        <View style={styles.divider} />

        <View style={styles.databaseItem}>
          <Text style={styles.databaseLabel}>
            Nama database
          </Text>

          <Text style={styles.databaseValue}>
            {info?.name || "laundrify.db"}
          </Text>
        </View>

        <View style={styles.databaseItem}>
          <Text style={styles.databaseLabel}>
            Versi database
          </Text>

          <Text style={styles.databaseValue}>
            {info?.version || "-"}
          </Text>
        </View>

        <View style={styles.databaseItem}>
          <Text style={styles.databaseLabel}>
            Jumlah tabel
          </Text>

          <Text style={styles.databaseValue}>
            {info?.tables?.length ?? 0} tabel
          </Text>
        </View>

        <View style={styles.databaseStatus}>
          <View style={styles.statusDot} />

          <Text style={styles.databaseStatusText}>
            Database tersimpan secara lokal
          </Text>
        </View>
      </View>

      {/* ================================== */}
      {/* ABOUT */}
      {/* ================================== */}

      <View style={styles.aboutCard}>
        <View style={styles.aboutIcon}>
          <Info size={19} color={UI.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.aboutTitle}>
            Tentang Laundrify
          </Text>

          <Text style={styles.aboutDescription}>
            Aplikasi manajemen laundry offline untuk mengelola
            pelanggan, layanan, pesanan, pembayaran, dan keuangan usaha.
          </Text>

          <Text style={styles.versionText}>
            LAUNDRIFY · LOCAL APPLICATION
          </Text>
        </View>
      </View>
    </Page>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = {
  card: {
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 4,
    padding: 16,
    marginBottom: 14,
  },

  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 11,
  },

  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 4,
    backgroundColor: UI.primaryLight,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: UI.text,
  },

  sectionDescription: {
    fontSize: 11,
    color: UI.muted,
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: UI.border,
    marginVertical: 15,
  },

  inputGroup: {
    marginBottom: 14,
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: UI.text,
    marginBottom: 7,
  },

  inputWrapper: {
    minHeight: 46,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 4,
    backgroundColor: UI.soft,
    paddingHorizontal: 11,
  },

  inputIcon: {
    width: 25,
    alignItems: "flex-start" as const,
    justifyContent: "center" as const,
  },

  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 12,
    color: UI.text,
  },

  // ADDRESS INPUT

  textAreaWrapper: {
    minHeight: 105,
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 4,
    backgroundColor: UI.soft,
    paddingHorizontal: 11,
    paddingVertical: 11,
  },

  textAreaIcon: {
    width: 25,
    paddingTop: 3,
    alignItems: "flex-start" as const,
  },

  textArea: {
    flex: 1,
    minHeight: 80,
    paddingVertical: 0,
    fontSize: 12,
    color: UI.text,
  },

  helperText: {
    fontSize: 10,
    color: UI.muted,
    marginTop: 6,
    lineHeight: 15,
  },

  // PRIMARY BUTTON

  primaryButton: {
    minHeight: 45,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 9,
    backgroundColor: UI.primary,
    borderRadius: 4,
    paddingHorizontal: 14,
    marginTop: 3,
  },

  primaryButtonText: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: UI.white,
  },

  // EXPORT PERIOD

  periodContainer: {
    flexDirection: "row" as const,
    gap: 7,
    marginBottom: 17,
  },

  periodButton: {
    flex: 1,
    minHeight: 40,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: UI.soft,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 4,
    paddingHorizontal: 5,
  },

  periodButtonActive: {
    backgroundColor: UI.primaryLight,
    borderColor: UI.primary,
  },

  periodText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: UI.secondary,
  },

  periodTextActive: {
    color: UI.primary,
  },

  // RANGE

  rangeBox: {
    backgroundColor: UI.primaryLight,
    borderWidth: 1,
    borderColor: "#DCE5FF",
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },

  rangeHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
  },

  rangeTitle: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: UI.secondary,
  },

  rangeValue: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: UI.primary,
    marginTop: 7,
  },

  // INFO

  infoBox: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 8,
    backgroundColor: UI.soft,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 4,
    padding: 11,
    marginBottom: 13,
  },

  infoText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 16,
    color: UI.secondary,
  },

  // EXPORT CONTENT

  exportContent: {
    marginBottom: 15,
  },

  exportContentHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
    marginBottom: 9,
  },

  exportContentTitle: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: UI.text,
  },

  exportTags: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 6,
  },

  exportTag: {
    backgroundColor: UI.soft,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 3,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  exportTagText: {
    fontSize: 10,
    color: UI.secondary,
    fontWeight: "600" as const,
  },

  errorText: {
    fontSize: 10,
    color: UI.red,
    marginTop: 5,
  },

  // DATABASE

  databaseItem: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },

  databaseLabel: {
    fontSize: 11,
    color: UI.secondary,
  },

  databaseValue: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: UI.text,
  },

  databaseStatus: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
    backgroundColor: "#ECFDF3",
    padding: 10,
    marginTop: 12,
    borderRadius: 4,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: UI.green,
  },

  databaseStatusText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: UI.green,
  },

  // ABOUT

  aboutCard: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 12,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 4,
    padding: 15,
    marginBottom: 15,
  },

  aboutIcon: {
    width: 36,
    height: 36,
    backgroundColor: UI.primaryLight,
    borderRadius: 4,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  aboutTitle: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: UI.text,
  },

  aboutDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: UI.secondary,
    marginTop: 5,
  },

  versionText: {
    fontSize: 9,
    fontWeight: "800" as const,
    letterSpacing: 0.8,
    color: UI.muted,
    marginTop: 12,
  },
};
