
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Banknote,
  Check,
  CreditCard,
  FileText,
  Wallet,
  ArrowLeftRight,
} from "lucide-react-native";

import { createPayment } from "../../services/payment.service";
import type { PaymentMethod } from "../../types/database";
import { Button, Card, Field, Page, money } from "../../components/ui";

const COLORS = {
  background: "#F3F5F8",
  white: "#FFFFFF",
  surface: "#F0F2F5",
  border: "#E1E5EB",
  text: "#202938",
  muted: "#8A94A3",
  primary: "#2855D9",
  primaryLight: "#EAF0FF",
  green: "#15966A",
  greenLight: "#E8F5EF",
  red: "#D94A4A",
};

const methods: {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: typeof Wallet;
}[] = [
  {
    value: "cash",
    label: "Tunai",
    description: "Pembayaran langsung",
    icon: Banknote,
  },
  {
    value: "qris",
    label: "QRIS",
    description: "Pembayaran melalui QR",
    icon: CreditCard,
  },
  {
    value: "transfer",
    label: "Transfer",
    description: "Transfer rekening bank",
    icon: ArrowLeftRight,
  },
  {
    value: "other",
    label: "Lainnya",
    description: "Metode pembayaran lain",
    icon: Wallet,
  },
];

export default function PaymentCreate() {
  const { orderId, remaining } = useLocalSearchParams<{
    orderId: string;
    remaining?: string;
  }>();

  const remainingAmount = Number(remaining);

  const hasRemaining =
    remaining !== undefined &&
    remaining !== "" &&
    Number.isFinite(remainingAmount) &&
    remainingAmount >= 0;

  const [amount, setAmount] = useState(
    remaining !== undefined ? remaining : "",
  );

  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const nominal = Number(amount);

  const validAmount =
    Number.isSafeInteger(nominal) &&
    nominal > 0 &&
    (!hasRemaining || nominal <= remainingAmount);

  const changeAmount = useMemo(() => {
    if (!validAmount || !hasRemaining) return 0;

    return remainingAmount - nominal;
  }, [validAmount, hasRemaining, remainingAmount, nominal]);

  const selectedMethod = methods.find(
    (item) => item.value === method,
  );

  const save = async () => {
    if (
      !orderId ||
      !Number.isSafeInteger(Number(orderId)) ||
      Number(orderId) <= 0
    ) {
      Alert.alert(
        "Order tidak valid",
        "ID pesanan tidak ditemukan.",
      );
      return;
    }

    if (!validAmount) {
      Alert.alert(
        "Nominal tidak valid",
        hasRemaining && remainingAmount >= 0
          ? `Masukkan nominal pembayaran antara Rp1 dan ${money(remainingAmount)}.`
          : "Masukkan nominal pembayaran berupa angka bulat yang valid.",
      );
      return;
    }

    setSaving(true);

    try {
      await createPayment({
        orderId: Number(orderId),
        amount: nominal,
        method,
        referenceNumber: reference.trim(),
        notes: notes.trim(),
      });

      Alert.alert(
        "Pembayaran berhasil",
        "Data pembayaran berhasil disimpan.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        "Pembayaran gagal",
        error?.message ||
          "Terjadi kesalahan saat menyimpan pembayaran.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      title="Pembayaran"
      subtitle={`Pencatatan pembayaran pesanan #${orderId}`}
    >
      {/* INFORMASI PESANAN */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Wallet size={22} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>NOMOR PESANAN</Text>
            <Text style={styles.heroOrder}>#{orderId}</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>
          Catat Pembayaran
        </Text>

        <Text style={styles.heroDescription}>
          Masukkan jumlah pembayaran dan pilih metode yang digunakan pelanggan.
        </Text>
      </View>

      {/* SISA TAGIHAN */}
      <View style={styles.billCard}>
        <View style={styles.billTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.billLabel}>
              Sisa Tagihan
            </Text>

            <Text style={styles.billAmount}>
              {hasRemaining
                ? money(remainingAmount)
                : "Tidak tersedia"}
            </Text>
          </View>

          <View style={styles.billIcon}>
            <FileText size={21} color={COLORS.primary} />
          </View>
        </View>

        <View style={styles.insetLine} />

        <Text style={styles.billDescription}>
          {hasRemaining
            ? "Nominal pembayaran tidak boleh melebihi sisa tagihan."
            : "Masukkan nominal pembayaran sesuai tagihan pesanan."}
        </Text>
      </View>

      {/* NOMINAL PEMBAYARAN */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Nominal Pembayaran
        </Text>

        <Text style={styles.sectionDescription}>
          Masukkan jumlah uang yang dibayarkan pelanggan.
        </Text>
      </View>

      <Card style={styles.formCard}>
        <Field
          label="Jumlah pembayaran (Rupiah) *"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="Contoh: 50000"
        />

        <Text style={styles.helperText}>
          Masukkan nominal tanpa tanda titik atau koma.
        </Text>

        {amount.length > 0 && !validAmount && (
          <Text style={styles.errorText}>
            {hasRemaining && nominal > remainingAmount
              ? "Nominal melebihi sisa tagihan."
              : "Masukkan nominal pembayaran yang valid."}
          </Text>
        )}

        {validAmount && (
          <View style={styles.validInfo}>
            <Check size={15} color={COLORS.green} />
            <Text style={styles.validText}>
              Nominal pembayaran valid
            </Text>
          </View>
        )}
      </Card>

      {/* METODE PEMBAYARAN */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Metode Pembayaran
        </Text>

        <Text style={styles.sectionDescription}>
          Pilih metode pembayaran pelanggan.
        </Text>
      </View>

      <View style={styles.methodContainer}>
        {methods.map((item) => {
          const selected = method === item.value;
          const Icon = item.icon;

          return (
            <Pressable
              key={item.value}
              onPress={() => setMethod(item.value)}
              style={({ pressed }) => [
                styles.methodCard,
                selected && styles.methodSelected,
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View
                style={[
                  styles.methodIcon,
                  selected && styles.methodIconSelected,
                ]}
              >
                <Icon
                  size={20}
                  color={
                    selected ? COLORS.primary : COLORS.muted
                  }
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.methodName}>
                  {item.label}
                </Text>

                <Text style={styles.methodDescription}>
                  {item.description}
                </Text>
              </View>

              <View
                style={[
                  styles.radio,
                  selected && styles.radioSelected,
                ]}
              >
                {selected && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* INFORMASI TAMBAHAN */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Informasi Tambahan
        </Text>

        <Text style={styles.sectionDescription}>
          Referensi dan catatan pembayaran.
        </Text>
      </View>

      <Card style={styles.formCard}>
        <Field
          label="Nomor referensi"
          value={reference}
          onChangeText={setReference}
          placeholder="Nomor transaksi (opsional)"
        />

        <Text style={styles.helperText}>
          Isi jika pembayaran menggunakan QRIS atau transfer.
        </Text>

        <View style={{ height: 16 }} />

        <Field
          label="Catatan pembayaran"
          value={notes}
          onChangeText={setNotes}
          placeholder="Tambahkan catatan..."
          multiline
        />
      </Card>

      {/* RINGKASAN */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Ringkasan Pembayaran
        </Text>

        <Text style={styles.sectionDescription}>
          Periksa detail transaksi sebelum menyimpan.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Nomor pesanan
          </Text>

          <Text style={styles.summaryValue}>
            #{orderId}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Metode pembayaran
          </Text>

          <Text style={styles.summaryValue}>
            {selectedMethod?.label}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Nominal pembayaran
          </Text>

          <Text style={styles.summaryValue}>
            {money(validAmount ? nominal : 0)}
          </Text>
        </View>

        {hasRemaining && (
          <>
            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Sisa setelah pembayaran
              </Text>

              <Text style={styles.remainingValue}>
                {validAmount
                  ? money(changeAmount)
                  : money(remainingAmount)}
              </Text>
            </View>
          </>
        )}

        <View style={styles.divider} />

        <Text style={styles.totalLabel}>
          TOTAL DIBAYARKAN
        </Text>

        <Text style={styles.totalAmount}>
          {money(validAmount ? nominal : 0)}
        </Text>
      </View>

      {/* TOMBOL AKSI */}
      <View style={styles.actions}>
        <Button
          title={
            saving
              ? "Menyimpan pembayaran..."
              : "Simpan Pembayaran"
          }
          onPress={save}
          loading={saving}
        />

        <Pressable
          onPress={() => router.back()}
          disabled={saving}
          style={({ pressed }) => [
            styles.cancelButton,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={styles.cancelText}>
            Batalkan
          </Text>
        </Pressable>
      </View>

      {/* <Text style={styles.footer}>
        LAUNDRIFY · PAYMENT MANAGEMENT
      </Text> */}
    </Page>
  );
}

const styles = {
  hero: {
    backgroundColor: "#172554",
    padding: 19,
    borderRadius: 4,
    marginBottom: 14,
  },

  heroTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginBottom: 20,
  },

  heroIcon: {
    width: 42,
    height: 42,
    backgroundColor: "#294477",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 4,
  },

  heroLabel: {
    fontSize: 9,
    color: "#AFC0DF",
    fontWeight: "800" as const,
    letterSpacing: 1,
  },

  heroOrder: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "900" as const,
    marginTop: 4,
  },

  heroTitle: {
    fontSize: 21,
    color: "#FFFFFF",
    fontWeight: "900" as const,
  },

  heroDescription: {
    fontSize: 11,
    lineHeight: 18,
    color: "#B9C8E4",
    marginTop: 6,
  },

  billCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 4,
    marginBottom: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#AAB3C0",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },

  billTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },

  billLabel: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: COLORS.muted,
  },

  billAmount: {
    fontSize: 24,
    fontWeight: "900" as const,
    color: COLORS.text,
    marginTop: 7,
  },

  billIcon: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 4,
  },

  insetLine: {
    height: 1,
    backgroundColor: "#DDE2E9",
    marginVertical: 13,
  },

  billDescription: {
    fontSize: 10,
    color: COLORS.muted,
    lineHeight: 16,
  },

  section: {
    marginBottom: 11,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: COLORS.text,
  },

  sectionDescription: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 4,
  },

  formCard: {
    padding: 15,
    marginBottom: 22,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    shadowColor: "#AAB3C0",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },

  helperText: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: -5,
  },

  errorText: {
    color: COLORS.red,
    fontSize: 10,
    marginTop: 8,
    fontWeight: "700" as const,
  },

  validInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 10,
  },

  validText: {
    fontSize: 10,
    color: COLORS.green,
    fontWeight: "700" as const,
  },

  methodContainer: {
    gap: 9,
    marginBottom: 22,
  },

  methodCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 13,
    shadowColor: "#AAB3C0",
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 1,
  },

  methodSelected: {
    backgroundColor: "#F4F6FF",
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },

  methodIcon: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 4,
  },

  methodIconSelected: {
    backgroundColor: COLORS.primaryLight,
  },

  methodName: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: COLORS.text,
  },

  methodDescription: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 4,
  },

  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#CDD3DD",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  radioSelected: {
    borderColor: COLORS.primary,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },

  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#AAB3C0",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },

  summaryRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 14,
    gap: 8,
  },

  summaryLabel: {
    fontSize: 10,
    color: COLORS.muted,
    flex: 1,
  },

  summaryValue: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: "800" as const,
    textAlign: "right" as const,
  },

  remainingValue: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "900" as const,
  },

  divider: {
    borderTopWidth: 1,
    borderColor: "#D7DDE5",
    marginVertical: 12,
  },

  totalLabel: {
    fontSize: 9,
    fontWeight: "900" as const,
    letterSpacing: 1,
    color: COLORS.muted,
  },

  totalAmount: {
    fontSize: 25,
    fontWeight: "900" as const,
    color: COLORS.text,
    marginTop: 6,
  },

  actions: {
    gap: 8,
    marginTop: 2,
  },

  cancelButton: {
    alignItems: "center" as const,
    paddingVertical: 13,
  },

  cancelText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "800" as const,
  },

  footer: {
    fontSize: 8,
    textAlign: "center" as const,
    color: "#A0A5B1",
    fontWeight: "800" as const,
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 12,
  },
};
