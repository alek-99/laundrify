import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Award,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Minus,
  Phone,
  Plus,
  Printer,
  Receipt,
  Send,
  Shirt,
  Tag,
  Trash2,
  User,
  Wallet,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button, Card, Page, money } from "../../components/ui";
import { InvoiceService } from "../../services/invoice.service";
import {
  deleteOrder,
  getOrderById,
  updateOrderStatus,
} from "../../services/order.service";
import { refundPayment } from "../../services/payment.service";
import { PrintService } from "../../services/print.service";
import { WhatsAppService } from "../../services/whatsapp.service";
import type { OrderStatus } from "../../types/database";

const UI = {
  background: "#F1F3F6",
  surface: "#FFFFFF",
  white: "#FFFFFF",
  inset: "#E9EDF2",
  text: "#202938",
  muted: "#8993A2",
  border: "#E1E6ED",
  primary: "#2855D9",
  primaryLight: "#EDF2FF",
  green: "#15803D",
  greenLight: "#DCFCE7",
  amber: "#B45309",
  amberLight: "#FEF3C7",
  red: "#DC2626",
  redLight: "#FEE2E2",
};

// ==========================================
// STATE MACHINE (LAUNDRIFY v2)
// ==========================================

const statusLabels: Record<string, string> = {
  received: "Diterima",
  processing: "Diproses",
  ready: "Siap Diambil",
  completed: "Selesai",
  washing: "Dicuci",
  drying: "Dikeringkan",
  ironing: "Disetrika",
  cancelled: "Dibatalkan",
};

const statusColors: Record<string, { bg: string; text: string }> = {
  received: { bg: "#DBEAFE", text: "#1D4ED8" },
  processing: { bg: "#FEF3C7", text: "#B45309" },
  ready: { bg: "#DCFCE7", text: "#15803D" },
  completed: { bg: "#D1FAE5", text: "#047857" },
  cancelled: { bg: "#FEE2E2", text: "#DC2626" },
};

// Urutan transisi valid
const nextStatusMap: Record<string, OrderStatus | null> = {
  received: "processing",
  processing: "ready",
  ready: "completed",
  completed: null,
};

const nextStatusActionLabel: Record<string, string> = {
  received: "Mulai Dikerjakan (Diproses) ➔",
  processing: "Cucian Selesai (Siap Diambil) ➔",
  ready: "Serahkan ke Pelanggan (Selesai) ✓",
};

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal Cetak Label
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [labelCopies, setLabelCopies] = useState("3");

  // Modal WhatsApp
  const [waModalVisible, setWaModalVisible] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getOrderById(Number(id));
      setOrder(data);
    } catch (err: any) {
      Alert.alert("Gagal memuat pesanan", err?.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Aksi Cetak Struk
  const handlePrintReceipt = async () => {
    if (!order) return;
    try {
      await PrintService.printReceipt(order);
      await load();
      Alert.alert("Berhasil", "Struk berhasil dicetak & dicatat ke log.");
    } catch (err: any) {
      Alert.alert("Gagal mencetak struk", err?.message || "Printer tidak siap.");
    }
  };

  // Aksi Cetak Label
  const handlePrintLabel = async () => {
    if (!order) return;
    const copies = Math.max(1, Number(labelCopies) || 1);
    try {
      await PrintService.printLabel(order, copies);
      setLabelModalVisible(false);
      await load();
      Alert.alert(
        "Berhasil",
        `Label kemasan (${copies} lembar) berhasil dicetak & dicatat ke log.`,
      );
    } catch (err: any) {
      Alert.alert("Gagal mencetak label", err?.message || "Printer tidak siap.");
    }
  };

  // Aksi Cetak Kartu Member
  const handlePrintMemberCard = async (subscriptionId: number) => {
    try {
      await PrintService.printMemberCard(subscriptionId);
      await load();
      Alert.alert(
        "Berhasil",
        "Kartu langganan member (15 kotak) berhasil dicetak & dicatat ke log.",
      );
    } catch (err: any) {
      Alert.alert(
        "Gagal mencetak kartu member",
        err?.message || "Printer tidak siap.",
      );
    }
  };

  // Aksi Kirim WhatsApp Invoice
  const handleSendWAInvoice = async () => {
    if (!order) return;
    try {
      setWaModalVisible(false);
      await InvoiceService.send(order);
      await load();
    } catch (err: any) {
      Alert.alert(
        "Gagal kirim WhatsApp",
        err?.message || "Periksa nomor WhatsApp pelanggan.",
      );
    }
  };

  // Aksi Kirim WhatsApp Siap Diambil
  const handleSendWAReady = async () => {
    if (!order || !order.customer_phone) {
      Alert.alert("Nomor telepon pelanggan belum tersedia");
      return;
    }
    const message = `
Halo Kak *${order.customer_name}* 👋

Kabar gembira! Cucian Anda di Laundrify sudah *SELESAI* dan *SIAP DIAMBIL*. 🎉

📋 *Detail Pesanan:*
No. Order : *${order.order_number}*
Total     : ${money(order.total)}
Status    : *${order.payment_status === "paid" ? "LUNAS ✓" : `Sisa ${money(order.remaining)}`}*

Silakan bawa struk saat pengambilan pakaian. Terima kasih! 🙏
    `.trim();

    try {
      setWaModalVisible(false);
      await WhatsAppService.open(order.customer_phone, message, {
        orderId: order.id,
        customerId: order.customer_id,
        messageType: "info",
      });
      await load();
    } catch (err: any) {
      Alert.alert("Gagal kirim WhatsApp", err?.message || "Terjadi kesalahan.");
    }
  };

  // Ubah Status Sesuai State Machine
  const handleChangeStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    Alert.alert(
      "Ubah Status Pesanan?",
      `Status pesanan akan diubah menjadi "${statusLabels[newStatus] || newStatus}".`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Ubah",
          onPress: async () => {
            try {
              await updateOrderStatus(order.id, newStatus);
              await load();

              // Jika status berubah ke Siap Diambil, tawarkan kirim WA langsung
              if (newStatus === "ready" && order.customer_phone) {
                Alert.alert(
                  "Status Siap Diambil!",
                  "Cucian telah selesai. Kirim pemberitahuan WhatsApp ke pelanggan sekarang?",
                  [
                    { text: "Nanti Saja", style: "cancel" },
                    {
                      text: "Kirim WhatsApp",
                      onPress: () => handleSendWAReady(),
                    },
                  ],
                );
              }
            } catch (err: any) {
              Alert.alert(
                "Gagal mengubah status",
                err?.message || "Terjadi kesalahan.",
              );
            }
          },
        },
      ],
    );
  };

  // Hapus pesanan
  const handleDelete = () => {
    if (!order) return;
    Alert.alert("Hapus Pesanan?", `Hapus pesanan ${order.order_number}?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteOrder(order.id);
            router.replace("/orders");
          } catch (err: any) {
            Alert.alert("Gagal menghapus", err?.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Page title="Detail Pesanan" subtitle="Memuat data...">
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" color={UI.primary} />
          <Text style={{ fontSize: 11, color: UI.muted, marginTop: 12 }}>
            Memuat rincian pesanan...
          </Text>
        </View>
      </Page>
    );
  }

  if (!order) {
    return (
      <Page title="Detail Pesanan" subtitle="Tidak ditemukan">
        <Card>
          <Text style={{ color: UI.muted, fontSize: 12, marginBottom: 15 }}>
            Data pesanan tidak tersedia atau sudah dihapus.
          </Text>
          <Button
            title="Kembali"
            secondary
            onPress={() => router.replace("/orders")}
          />
        </Card>
      </Page>
    );
  }

  const currentBadge = statusColors[order.status] || {
    bg: UI.inset,
    text: UI.text,
  };
  const isPaid = order.payment_status === "paid" || order.remaining <= 0;
  const nextStatus = nextStatusMap[order.status];

  // Ringkasan items untuk pratinjau label
  const itemsSummary = order.items
    ?.map((it: any) => `${it.service_name} (${it.quantity} ${it.unit})`)
    .join(", ");

  const orderDateShort = order.order_date
    ? new Date(order.order_date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      })
    : "-";

  return (
    <Page title="Detail Pesanan" subtitle={order.order_number}>
      {/* 1. KARTU IDENTITAS ORDER & PELANGGAN */}
      <View style={s.card}>
        <View style={s.orderTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.orderNumber}>{order.order_number}</Text>
            <Text style={s.orderDate}>{order.order_date}</Text>
          </View>

          <View style={[s.statusBadge, { backgroundColor: currentBadge.bg }]}>
            <Text style={[s.statusBadgeText, { color: currentBadge.text }]}>
              {statusLabels[order.status] || order.status}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.customerRow}>
          <View style={s.customerAvatar}>
            <User size={20} color={UI.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.customerName}>{order.customer_name}</Text>
            <Text style={s.customerPhone}>
              {order.customer_phone || "Tanpa nomor telepon"}
            </Text>
          </View>
        </View>

        {order.estimated_completion ? (
          <View style={s.estimateRow}>
            <Clock size={14} color={UI.muted} />
            <Text style={s.estimateText}>
              Estimasi Selesai: {order.estimated_completion}
            </Text>
          </View>
        ) : null}

        {order.completed_at ? (
          <View style={s.estimateRow}>
            <Check size={14} color={UI.green} />
            <Text style={[s.estimateText, { color: UI.green }]}>
              Selesai Pada: {order.completed_at}
            </Text>
          </View>
        ) : null}
      </View>

      {/* 2. TOMBOL AKSI UTAMA (CETAK STRUK, CETAK LABEL, WHATSAPP) */}
      <Text style={s.sectionHeader}>AKSI PESANAN</Text>

      <View style={s.actionGrid}>
        {/* CETAK STRUK */}
        <Pressable onPress={handlePrintReceipt} style={s.actionCard}>
          <View style={[s.actionIconBox, { backgroundColor: UI.primaryLight }]}>
            <Printer size={20} color={UI.primary} />
          </View>
          <Text style={s.actionTitle}>Cetak Struk</Text>
          <Text style={s.actionDesc}>Print struk thermal</Text>
        </Pressable>

        {/* CETAK LABEL */}
        <Pressable
          onPress={() => setLabelModalVisible(true)}
          style={s.actionCard}
        >
          <View style={[s.actionIconBox, { backgroundColor: UI.amberLight }]}>
            <Tag size={20} color={UI.amber} />
          </View>
          <Text style={s.actionTitle}>Cetak Label</Text>
          <Text style={s.actionDesc}>Print label packing</Text>
        </Pressable>

        {/* WHATSAPP */}
        <Pressable onPress={() => setWaModalVisible(true)} style={s.actionCard}>
          <View
            style={[s.actionIconBox, { backgroundColor: "#DCFCE7" }]}
          >
            <Send size={20} color="#15803D" />
          </View>
          <Text style={s.actionTitle}>Kirim WhatsApp</Text>
          <Text style={s.actionDesc}>Invoice & notifikasi</Text>
        </Pressable>
      </View>

      {/* KARTU MEMBER JIKA ORDER INI MEMBELI PAKET */}
      {order.created_subscription ? (
        <View style={s.memberCardBanner}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Award size={18} color={UI.amber} />
              <Text style={s.memberCardTitle}>LANGGANAN MEMBER DIBUAT</Text>
            </View>
            <Text style={s.memberCardDesc}>
              No. Member: {order.created_subscription.member_no} ·{" "}
              {order.created_subscription.package_name}
            </Text>
          </View>

          <Pressable
            onPress={() =>
              handlePrintMemberCard(order.created_subscription.id)
            }
            style={s.memberCardBtn}
          >
            <Printer size={14} color={UI.white} />
            <Text style={s.memberCardBtnText}>Cetak Kartu (15 Kotak)</Text>
          </Pressable>
        </View>
      ) : null}

      {/* 3. STATE MACHINE TRANSIZION */}
      <Text style={s.sectionHeader}>STATUS PESANAN</Text>
      <View style={s.card}>
        {nextStatus ? (
          <Pressable
            onPress={() => handleChangeStatus(nextStatus)}
            style={s.nextStatusBtn}
          >
            <Text style={s.nextStatusBtnText}>
              {nextStatusActionLabel[order.status]}
            </Text>
          </Pressable>
        ) : (
          <View style={s.completedBox}>
            <Check size={20} color={UI.green} />
            <Text style={s.completedText}>
              Pesanan ini sudah selesai sepenuhnya.
            </Text>
          </View>
        )}

        <Text style={s.statusSelectorLabel}>Pilih Status Lainnya:</Text>
        <View style={s.statusChipsRow}>
          {(["received", "processing", "ready", "completed"] as OrderStatus[]).map(
            (st) => {
              const active = order.status === st;
              return (
                <Pressable
                  key={st}
                  onPress={() => handleChangeStatus(st)}
                  disabled={active}
                  style={[s.statusChip, active && s.statusChipActive]}
                >
                  <Text
                    style={[
                      s.statusChipText,
                      active && s.statusChipTextActive,
                    ]}
                  >
                    {statusLabels[st]}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>
      </View>

      {/* 4. RINCIAN LAYANAN & PEMBAYARAN */}
      <Text style={s.sectionHeader}>RINCIAN ITEM & PEMBAYARAN</Text>
      <View style={s.card}>
        {order.items?.map((it: any) => (
          <View key={it.id} style={s.orderItemRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.itemRowName}>{it.service_name}</Text>
              <Text style={s.itemRowDetail}>
                {it.quantity} {it.unit} × {money(it.price)}
              </Text>
              {it.paid_by_subscription_id ? (
                <Text style={s.itemQuotaLabel}>
                  ✓ Ditanggung Kuota Langganan Member
                </Text>
              ) : null}
            </View>
            <Text style={s.itemRowSubtotal}>{money(it.subtotal)}</Text>
          </View>
        ))}

        <View style={s.divider} />

        <View style={s.feeRow}>
          <Text style={s.feeLabel}>Subtotal Item:</Text>
          <Text style={s.feeValue}>{money(order.subtotal)}</Text>
        </View>

        {order.member_discount > 0 && (
          <View style={s.feeRow}>
            <Text style={[s.feeLabel, { color: UI.green }]}>
              Potongan Kuota Member:
            </Text>
            <Text style={[s.feeValue, { color: UI.green }]}>
              - {money(order.member_discount)}
            </Text>
          </View>
        )}

        {order.discount > 0 && (
          <View style={s.feeRow}>
            <Text style={[s.feeLabel, { color: UI.red }]}>Diskon Manual:</Text>
            <Text style={[s.feeValue, { color: UI.red }]}>
              - {money(order.discount)}
            </Text>
          </View>
        )}

        <View style={[s.divider, { marginVertical: 8 }]} />

        <View style={s.feeRow}>
          <Text style={s.feeTotalLabel}>TOTAL AKHIR:</Text>
          <Text style={s.feeTotalValue}>{money(order.total)}</Text>
        </View>

        <View style={s.feeRow}>
          <Text style={s.feeLabel}>Sudah Dibayar:</Text>
          <Text style={[s.feeValue, { color: UI.green }]}>
            {money(order.paid)}
          </Text>
        </View>

        <View style={s.feeRow}>
          <Text style={s.feeLabel}>Sisa Tagihan:</Text>
          <Text
            style={[
              s.feeValue,
              { color: isPaid ? UI.green : UI.red, fontWeight: "900" },
            ]}
          >
            {isPaid ? "LUNAS ✓" : money(order.remaining)}
          </Text>
        </View>

        {!isPaid && (
          <View style={{ marginTop: 12 }}>
            <Button
              title="+ Catat Pembayaran Tagihan"
              onPress={() =>
                router.push({
                  pathname: "/payments/create",
                  params: {
                    orderId: String(order.id),
                    remaining: String(order.remaining),
                  },
                })
              }
            />
          </View>
        )}
      </View>

      {/* 5. TIMELINE RIWAYAT STATUS */}
      {order.status_history?.length > 0 && (
        <>
          <Text style={s.sectionHeader}>RIWAYAT STATUS (AUDIT LOG)</Text>
          <View style={s.card}>
            {order.status_history.map((hist: any, index: number) => (
              <View key={hist.id} style={s.historyRow}>
                <View style={s.historyDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.historyStatus}>
                    {statusLabels[hist.new_status] || hist.new_status}
                  </Text>
                  <Text style={s.historyDate}>{hist.created_at}</Text>
                  {hist.notes ? (
                    <Text style={s.historyNotes}>{hist.notes}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* 6. RIWAYAT CETAK & WHATSAPP LOGS */}
      {(order.print_logs?.length > 0 || order.whatsapp_logs?.length > 0) && (
        <>
          <Text style={s.sectionHeader}>LOG CETAK & WHATSAPP</Text>
          <View style={s.card}>
            {order.print_logs?.map((pl: any) => (
              <View key={`pl_${pl.id}`} style={s.logRow}>
                <Printer size={14} color={UI.primary} />
                <Text style={s.logText}>
                  Cetak {pl.print_type.toUpperCase()} ({pl.copies} rangkap) ·{" "}
                  {pl.printed_at}
                </Text>
              </View>
            ))}
            {order.whatsapp_logs?.map((wl: any) => (
              <View key={`wl_${wl.id}`} style={s.logRow}>
                <Send size={14} color={UI.green} />
                <Text style={s.logText}>
                  WhatsApp {wl.message_type.toUpperCase()} ke {wl.phone} ·{" "}
                  {wl.created_at}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* 7. HAPUS PESANAN */}
      <View style={{ marginTop: 14 }}>
        <Pressable onPress={handleDelete} style={s.deleteOrderBtn}>
          <Trash2 size={16} color={UI.red} />
          <Text style={s.deleteOrderText}>Hapus Pesanan</Text>
        </Pressable>
      </View>

      {/* ======================================================= */}
      {/* MODAL CETAK LABEL DENGAN PRATINJAU                     */}
      {/* ======================================================= */}
      <Modal
        visible={labelModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLabelModalVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Cetak Label Packing Cucian</Text>
              <Pressable onPress={() => setLabelModalVisible(false)}>
                <Text style={s.modalClose}>Batal</Text>
              </Pressable>
            </View>

            <Text style={s.modalSubtitle}>
              Pilih jumlah rangkap label untuk ditempel pada kantong cucian.
            </Text>

            {/* Stepper Jumlah Lembar */}
            <View style={s.copiesSelectorRow}>
              <Text style={s.copiesLabel}>Jumlah Lembar:</Text>
              <View style={s.stepper}>
                <Pressable
                  onPress={() =>
                    setLabelCopies(String(Math.max(1, Number(labelCopies) - 1)))
                  }
                  style={s.stepperBtn}
                >
                  <Minus size={16} color={UI.text} />
                </Pressable>

                <TextInput
                  value={labelCopies}
                  onChangeText={setLabelCopies}
                  keyboardType="numeric"
                  style={s.stepperInput}
                />

                <Pressable
                  onPress={() =>
                    setLabelCopies(String(Math.max(1, Number(labelCopies) + 1)))
                  }
                  style={s.stepperBtn}
                >
                  <Plus size={16} color={UI.text} />
                </Pressable>
              </View>
            </View>

            {/* PRATINJAU LABEL */}
            <Text style={s.previewTitle}>PRATINJAU LABEL (CONTOH 1):</Text>
            <View style={s.labelPreviewCard}>
              <View style={s.labelPreviewHeader}>
                <Text style={s.labelPreviewBrand}>LAUNDRIFY</Text>
                <Text style={s.labelPreviewBadge}>
                  BAGIAN 1/{labelCopies || 1}
                </Text>
              </View>

              <Text style={s.labelPreviewCustomer}>
                {order.customer_name}
              </Text>

              <View style={s.labelPreviewMetaRow}>
                <Text style={s.labelPreviewMeta}>
                  Order: {order.order_number}
                </Text>
                <Text style={s.labelPreviewMeta}>Tgl: {orderDateShort}</Text>
              </View>

              <Text style={s.labelPreviewDetail} numberOfLines={2}>
                Ket: {itemsSummary}
              </Text>

              <View style={s.labelPreviewFooter}>
                <Text style={s.labelPreviewPhone}>
                  Telp: {order.customer_phone || "-"}
                </Text>
                <Text style={s.labelPreviewStatus}>
                  {isPaid ? "LUNAS ✓" : "BELUM LUNAS"}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 18 }}>
              <Button
                title={`PRINT ${labelCopies || 1} LEMBAR LABEL`}
                onPress={handlePrintLabel}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================= */}
      {/* MODAL PILIHAN WHATSAPP                                  */}
      {/* ======================================================= */}
      <Modal
        visible={waModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setWaModalVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Kirim WhatsApp</Text>
              <Pressable onPress={() => setWaModalVisible(false)}>
                <Text style={s.modalClose}>Batal</Text>
              </Pressable>
            </View>

           <Text style={s.modalSubtitle}>
  Pilih pesan yang ingin dikirimkan ke nomor{" "}
  <Text style={{ fontWeight: "700", color: UI.text }}>
    {order.customer_phone || "-"}
  </Text>
  :
</Text>

            <View style={{ gap: 10, marginTop: 10 }}>
              <Pressable
                onPress={handleSendWAInvoice}
                style={s.waOptionBtn}
              >
                <FileText size={20} color={UI.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={s.waOptionTitle}>Kirim Invoice Lengkap</Text>
                  <Text style={s.waOptionDesc}>
                    Rincian layanan, subtotal, diskon, dan status pembayaran
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={handleSendWAReady}
                style={s.waOptionBtn}
              >
                <Check size={20} color={UI.green} />
                <View style={{ flex: 1 }}>
                  <Text style={s.waOptionTitle}>
                    Pemberitahuan Cucian Siap Diambil
                  </Text>
                  <Text style={s.waOptionDesc}>
                    Mengabarkan pakaian sudah selesai dicuci dan siap diambil
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

const s = StyleSheet.create({
  sectionHeader: {
    fontSize: 11,
    fontWeight: "900",
    color: UI.muted,
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 8,
  },
  card: {
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  orderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderNumber: {
    fontSize: 17,
    fontWeight: "900",
    color: UI.text,
  },
  orderDate: {
    fontSize: 11,
    color: UI.muted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  divider: {
    height: 1,
    backgroundColor: UI.border,
    marginVertical: 12,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: UI.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  customerName: {
    fontSize: 14,
    fontWeight: "800",
    color: UI.text,
  },
  customerPhone: {
    fontSize: 11,
    color: UI.muted,
    marginTop: 2,
  },
  estimateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  estimateText: {
    fontSize: 11,
    color: UI.muted,
  },

  // Action Grid
  actionGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: UI.text,
    textAlign: "center",
  },
  actionDesc: {
    fontSize: 9,
    color: UI.muted,
    marginTop: 2,
    textAlign: "center",
  },

  // Member card banner
  memberCardBanner: {
    backgroundColor: UI.amberLight,
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  memberCardTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: UI.amber,
  },
  memberCardDesc: {
    fontSize: 10,
    color: "#78350F",
    marginTop: 2,
  },
  memberCardBtn: {
    backgroundColor: UI.amber,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberCardBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: UI.white,
  },

  // State Machine
  nextStatusBtn: {
    backgroundColor: UI.primary,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 12,
  },
  nextStatusBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: UI.white,
  },
  completedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: UI.greenLight,
    borderRadius: 6,
    marginBottom: 12,
  },
  completedText: {
    fontSize: 11,
    fontWeight: "800",
    color: UI.green,
  },
  statusSelectorLabel: {
    fontSize: 10,
    color: UI.muted,
    fontWeight: "700",
    marginBottom: 6,
  },
  statusChipsRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.background,
  },
  statusChipActive: {
    backgroundColor: UI.primary,
    borderColor: UI.primary,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: UI.muted,
  },
  statusChipTextActive: {
    color: UI.white,
  },

  // Order Items
  orderItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  itemRowName: {
    fontSize: 12,
    fontWeight: "800",
    color: UI.text,
  },
  itemRowDetail: {
    fontSize: 10,
    color: UI.muted,
    marginTop: 2,
  },
  itemQuotaLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: UI.green,
    marginTop: 2,
  },
  itemRowSubtotal: {
    fontSize: 12,
    fontWeight: "800",
    color: UI.text,
  },

  // Fees
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  feeLabel: {
    fontSize: 11,
    color: UI.muted,
  },
  feeValue: {
    fontSize: 11,
    fontWeight: "800",
    color: UI.text,
  },
  feeTotalLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: UI.text,
  },
  feeTotalValue: {
    fontSize: 15,
    fontWeight: "900",
    color: UI.primary,
  },

  // History timeline
  historyRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: UI.primary,
    marginTop: 5,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: "800",
    color: UI.text,
  },
  historyDate: {
    fontSize: 10,
    color: UI.muted,
    marginTop: 2,
  },
  historyNotes: {
    fontSize: 10,
    color: UI.text,
    fontStyle: "italic",
    marginTop: 2,
  },

  // Logs
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  logText: {
    fontSize: 10,
    color: UI.muted,
  },

  deleteOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: UI.red,
  },
  deleteOrderText: {
    color: UI.red,
    fontSize: 11,
    fontWeight: "800",
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: UI.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: UI.text,
  },
  modalSubtitle: {
    fontSize: 11,
    color: UI.muted,
    marginBottom: 12,
  },
  modalClose: {
    fontSize: 12,
    fontWeight: "800",
    color: UI.primary,
  },

  // Stepper
  copiesSelectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    padding: 10,
    backgroundColor: UI.background,
    borderRadius: 6,
  },
  copiesLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: UI.text,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 6,
    backgroundColor: UI.white,
  },
  stepperBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepperInput: {
    width: 44,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    color: UI.text,
    padding: 0,
  },

  // Preview Label
  previewTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: UI.muted,
    marginBottom: 6,
  },
  labelPreviewCard: {
    borderWidth: 1.5,
    borderColor: "#0F172A",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#F8FAFC",
  },
  labelPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#0F172A",
    paddingBottom: 4,
    marginBottom: 6,
  },
  labelPreviewBrand: {
    fontSize: 10,
    fontWeight: "900",
    color: "#0F172A",
  },
  labelPreviewBadge: {
    backgroundColor: "#0F172A",
    color: UI.white,
    fontSize: 9,
    fontWeight: "bold",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 2,
  },
  labelPreviewCustomer: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 4,
  },
  labelPreviewMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    paddingBottom: 4,
    marginBottom: 4,
  },
  labelPreviewMeta: {
    fontSize: 9,
    color: "#475569",
  },
  labelPreviewDetail: {
    fontSize: 9,
    color: "#1E293B",
    lineHeight: 13,
  },
  labelPreviewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#0F172A",
    paddingTop: 4,
  },
  labelPreviewPhone: {
    fontSize: 8,
    color: "#64748b",
  },
  labelPreviewStatus: {
    fontSize: 8,
    fontWeight: "900",
    color: "#0F172A",
  },

  // WA Options
  waOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.background,
  },
  waOptionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: UI.text,
  },
  waOptionDesc: {
    fontSize: 10,
    color: UI.muted,
    marginTop: 2,
  },
});
