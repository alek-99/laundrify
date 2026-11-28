import Award from "lucide-react-native/icons/award";
import Check from "lucide-react-native/icons/check";
import Clock from "lucide-react-native/icons/clock";
import FileText from "lucide-react-native/icons/file-text";
import Minus from "lucide-react-native/icons/minus";
import Plus from "lucide-react-native/icons/plus";
import Printer from "lucide-react-native/icons/printer";
import Send from "lucide-react-native/icons/send";
import Tag from "lucide-react-native/icons/tag";
import Trash2 from "lucide-react-native/icons/trash";
import User from "lucide-react-native/icons/user";

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABELS,
} from "../../constants/order.presentation";

import {
  Button,
  Card,
  Page,
  money,
} from "../../components/ui";

import { InvoiceService } from "../../services/invoice.service";

import {
  deleteOrder,
  getOrderById,
  updateOrderStatus,
} from "../../services/order.service";

import { PrintService } from "../../services/print.service";
import { WhatsAppService } from "../../services/whatsapp.service";

import type { OrderStatus } from "../../types/database";

// =====================================================
// CONFIGURATION
// =====================================================

const UI = {
  background: "#F1F3F6",
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
};

type ThermalPaperWidth = 58 | 88;

// Pastikan path ini sesuai lokasi OrderDetail.tsx.
const PREMIUM_LOGO_ASSET = require("@/assets/images/premiumlogo.png");

const NEXT_STATUS: Record<string, OrderStatus | null> = {
  received: "processing",
  processing: "ready",
  ready: "completed",
  completed: null,
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  received: "Mulai Dikerjakan (Diproses) →",
  processing: "Cucian Selesai (Siap Diambil) →",
  ready: "Serahkan ke Pelanggan (Selesai) ✓",
};

// =====================================================
// REUSABLE LABEL COMPONENTS
// =====================================================

interface SheetLabelItemProps {
  slotNumber: number;
  totalSlots: number;
  logoText: string;
  logoSubtext?: string;
  logoUri?: string | null;
  customerName: string;
  orderId: string;
  keterangan: string;
  phone: string;
  paymentStatusLabel: string;
  isPaid: boolean;
  paperWidth: ThermalPaperWidth;
}

interface LabelBrandProps {
  logoUri?: string | null;
  logoText: string;
  logoSubtext?: string;
  paperWidth: ThermalPaperWidth;
}

/**
 * Logo outlet.
 *
 * Prioritas:
 * 1. Logo outlet dari database.
 * 2. Logo lokal premiumlogo.png.
 *
 * Jika gambar URL gagal dimuat, otomatis fallback.
 */
function LabelBrand({
  logoUri,
  logoText,
  logoSubtext,
  paperWidth,
}: LabelBrandProps) {
  const [failedLogoUri, setFailedLogoUri] = useState<string | null>(null);

  const remoteLogo = logoUri?.trim();
  const imageError = Boolean(remoteLogo) && failedLogoUri === remoteLogo;

  const imageSource =
    remoteLogo && !imageError
      ? { uri: remoteLogo }
      : PREMIUM_LOGO_ASSET;

  return (
    <View style={s.labelBrand}>
      <Image
        source={imageSource}
        style={[
          s.labelLogo,
          paperWidth === 58
            ? s.labelLogo58
            : s.labelLogo88,
        ]}
        resizeMode="contain"
        onError={() => {
          if (remoteLogo) {
            setFailedLogoUri(remoteLogo);
          }
        }}
      />

      <View style={s.labelBrandText}>
        <Text
          style={s.labelBrandName}
          numberOfLines={1}
        >
          {logoText}
        </Text>

        {paperWidth === 88 && !!logoSubtext && (
          <Text
            style={s.labelBrandSub}
            numberOfLines={1}
          >
            {logoSubtext}
          </Text>
        )}
      </View>
    </View>
  );
}

// =====================================================
// LABEL INFORMATION
// =====================================================

interface LabelInfoProps {
  label: string;
  value: string;
  paperWidth: ThermalPaperWidth;
  bold?: boolean;
  multiline?: boolean;
}

function LabelInfo({
  label,
  value,
  paperWidth,
  bold = false,
  multiline = false,
}: LabelInfoProps) {
  return (
    <View style={s.labelInfoRow}>
      <Text
        style={[
          s.labelInfoTitle,
          paperWidth === 58 && s.labelInfoTitle58,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          s.labelInfoValue,
          paperWidth === 58 && s.labelInfoValue58,
          bold && s.labelInfoBold,
        ]}
        numberOfLines={multiline ? 2 : 1}
      >
        {value || "-"}
      </Text>
    </View>
  );
}

// =====================================================
// THERMAL LABEL
// =====================================================

function SheetLabelItem({
  slotNumber,
  totalSlots,
  logoText,
  logoSubtext = "LAUNDRY & DRY CLEAN",
  logoUri,
  customerName,
  orderId,
  keterangan,
  phone,
  paymentStatusLabel,
  isPaid,
  paperWidth,
}: SheetLabelItemProps) {
  const is58mm = paperWidth === 58;

  return (
    <View
      style={[
        s.labelContainer,
        is58mm
          ? s.labelContainer58
          : s.labelContainer88,
      ]}
    >
      {/* HEADER */}
      <View style={s.labelHeader}>
        <LabelBrand
          logoUri={logoUri}
          logoText={logoText}
          logoSubtext={logoSubtext}
          paperWidth={paperWidth}
        />

        <Text style={s.labelNumber}>
          {slotNumber}/{totalSlots}
        </Text>
      </View>

      <View style={s.labelDivider} />

      {/* CUSTOMER INFORMATION */}
      <View style={s.labelInfo}>
        <LabelInfo
          label="Nama"
          value={customerName}
          paperWidth={paperWidth}
          bold
        />

        <LabelInfo
          label="Order"
          value={orderId}
          paperWidth={paperWidth}
        />

        <LabelInfo
          label="Layanan"
          value={keterangan}
          paperWidth={paperWidth}
          multiline={!is58mm}
        />

        <LabelInfo
          label="Telepon"
          value={phone}
          paperWidth={paperWidth}
        />
      </View>

      <View style={s.labelDivider} />

      {/* PAYMENT STATUS */}
      <View style={s.labelPayment}>
        <Text style={s.labelPaymentTitle}>
          PEMBAYARAN
        </Text>

        <Text
          style={[
            s.labelPaymentStatus,
            {
              color: isPaid
                ? UI.green
                : UI.red,
            },
          ]}
          numberOfLines={2}
        >
          {paymentStatusLabel}
        </Text>
      </View>
    </View>
  );
}

// =====================================================
// PRINT LABEL MODAL
// =====================================================

interface PrintLabelModalProps {
  visible: boolean;
  labelsPerSheet: string;
  onChangeLabelsPerSheet: (val: string) => void;
  paperWidth: ThermalPaperWidth;
  onChangePaperWidth: (width: ThermalPaperWidth) => void;
  onClose: () => void;
  onConfirm: (
    countPerSheet: number,
    paperWidth: ThermalPaperWidth,
  ) => void;
  order: any;
  isPaid: boolean;
}

export function PrintLabelModal({
  visible,
  labelsPerSheet,
  onChangeLabelsPerSheet,
  paperWidth,
  onChangePaperWidth,
  onClose,
  onConfirm,
  order,
  isPaid,
}: PrintLabelModalProps) {
  const count = Math.min(
    3,
    Math.max(2, Number(labelsPerSheet) || 3),
  );

  const slots = Array.from(
    { length: count },
    (_, i) => i + 1,
  );

  const logoText =
    order?.outlet_name ||
    order?.store_name ||
    "PREMIUM LAUNDRI";

  const logoSubtext =
    order?.outlet_tagline ||
    "LAUNDRY & DRY CLEAN";

  const logoUri =
    order?.outlet_logo?.trim() ||
    order?.logo_url?.trim() ||
    null;

  const customerName =
    order?.customer_name || "-";

  const orderId =
    order?.order_number ||
    String(order?.id || "-");

  const keterangan =
    order?.items
      ?.map(
        (it: any) =>
          `${it.service_name} (${it.quantity} ${it.unit})`,
      )
      .join(", ") ||
    order?.notes ||
    "-";

  const phone =
    order?.customer_phone || "-";

  const paymentStatusLabel = isPaid
    ? "LUNAS ✓"
    : `BELUM LUNAS (${money(order?.remaining || 0)})`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.modalBackdrop}>
        <View style={s.modalSheet}>
          {/* HEADER */}
          <View style={s.modalHeader}>
            <View>
              <Text style={s.modalTitle}>
                Cetak Label
              </Text>

              <Text style={s.modalSubtitle}>
                Atur ukuran dan jumlah label.
              </Text>
            </View>

            <Pressable onPress={onClose}>
              <Text style={s.modalClose}>
                Batal
              </Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* PAPER WIDTH */}
            <Text style={s.controlLabel}>
              UKURAN KERTAS
            </Text>

            <View style={s.presetRow}>
              {([58, 88] as ThermalPaperWidth[]).map(
                (width) => {
                  const active = paperWidth === width;

                  return (
                    <Pressable
                      key={width}
                      onPress={() =>
                        onChangePaperWidth(width)
                      }
                      style={[
                        s.presetBtn,
                        active && s.presetBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          s.presetBtnText,
                          active && s.presetBtnTextActive,
                        ]}
                      >
                        {width} mm
                      </Text>

                      <Text
                        style={[
                          s.presetSubText,
                          active && s.presetSubTextActive,
                        ]}
                      >
                        {width === 58
                          ? "Thermal kecil"
                          : "Thermal lebar"}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>

            {/* LABEL COUNT */}
            <Text style={s.controlLabel}>
              JUMLAH LABEL PER KERTAS
            </Text>

            <View style={s.presetRow}>
              {[2, 3].map((preset) => {
                const active = count === preset;

                return (
                  <Pressable
                    key={preset}
                    onPress={() =>
                      onChangeLabelsPerSheet(
                        String(preset),
                      )
                    }
                    style={[
                      s.presetBtn,
                      active && s.presetBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        s.presetBtnText,
                        active && s.presetBtnTextActive,
                      ]}
                    >
                      {preset} Label
                    </Text>

                    <Text
                      style={[
                        s.presetSubText,
                        active && s.presetSubTextActive,
                      ]}
                    >
                      {preset === 3
                        ? "Hemat kertas"
                        : "Lebih lega"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* MANUAL STEPPER */}
            <View style={s.copiesRow}>
              <View>
                <Text style={s.copiesLabel}>
                  Jumlah label
                </Text>

                <Text style={s.copiesHint}>
                  Pilih 2 atau 3 label
                </Text>
              </View>

              <View style={s.stepper}>
                <Pressable
                  onPress={() =>
                    onChangeLabelsPerSheet(
                      String(Math.max(2, count - 1)),
                    )
                  }
                  style={s.stepperBtn}
                >
                  <Minus
                    size={16}
                    color={UI.text}
                  />
                </Pressable>

                <TextInput
                  value={String(count)}
                  onChangeText={(value) => {
                    const num = Number(
                      value.replace(/[^0-9]/g, ""),
                    );

                    if (!num) {
                      onChangeLabelsPerSheet("2");
                    } else {
                      onChangeLabelsPerSheet(
                        String(
                          Math.min(
                            3,
                            Math.max(2, num),
                          ),
                        ),
                      );
                    }
                  }}
                  keyboardType="numeric"
                  style={s.stepperInput}
                />

                <Pressable
                  onPress={() =>
                    onChangeLabelsPerSheet(
                      String(Math.min(3, count + 1)),
                    )
                  }
                  style={s.stepperBtn}
                >
                  <Plus
                    size={16}
                    color={UI.text}
                  />
                </Pressable>
              </View>
            </View>

            {/* PREVIEW */}
            <View style={s.previewHeader}>
              <Text style={s.controlLabel}>
                PRATINJAU LABEL
              </Text>

              <Text style={s.previewMeta}>
                {paperWidth} MM · {count} LABEL
              </Text>
            </View>

            <View style={s.paperPreviewCenter}>
              <View
                style={[
                  s.paperSheetPreview,
                  paperWidth === 58
                    ? s.paperWidth58
                    : s.paperWidth88,
                ]}
              >
                <View style={s.paperTopBar}>
                  <Text style={s.paperTopTitle}>
                    THERMAL {paperWidth} MM
                  </Text>

                  <Text style={s.paperTopBadge}>
                    {count} LABEL
                  </Text>
                </View>

                <View style={s.sheetStack}>
                  {slots.map((slotNumber, index) => (
                    <View key={slotNumber}>
                      <SheetLabelItem
                        slotNumber={slotNumber}
                        totalSlots={count}
                        logoText={logoText}
                        logoSubtext={logoSubtext}
                        logoUri={logoUri}
                        customerName={customerName}
                        orderId={orderId}
                        keterangan={keterangan}
                        phone={phone}
                        paymentStatusLabel={
                          paymentStatusLabel
                        }
                        isPaid={isPaid}
                        paperWidth={paperWidth}
                      />

                      {index < slots.length - 1 && (
                        <View style={s.cutLineRow}>
                          <View style={s.cutDash} />

                          <Text style={s.cutText}>
                            POTONG
                          </Text>

                          <View style={s.cutDash} />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* PRINT BUTTON */}
          <View style={s.modalFooter}>
            <Button
              title={`Cetak ${paperWidth} MM · ${count} Label`}
              onPress={() =>
                onConfirm(count, paperWidth)
              }
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// =====================================================
// ORDER DETAIL PAGE
// =====================================================

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [labelModalVisible, setLabelModalVisible] =
    useState(false);

  const [labelsPerSheet, setLabelsPerSheet] =
    useState("3");

  const [paperWidth, setPaperWidth] =
    useState<ThermalPaperWidth>(58);

  const [waModalVisible, setWaModalVisible] =
    useState(false);

  // ===================================================
  // LOAD ORDER
  // ===================================================

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const data = await getOrderById(
        Number(id),
      );

      setOrder(data);

      const widthMeta: {
        id?: number;
        paper_width?: unknown;
        printer_paper_width?: unknown;
        thermal_width?: unknown;
      } | null = data;

      const detectedWidth = Number(
        widthMeta?.paper_width ||
          widthMeta?.printer_paper_width ||
          widthMeta?.thermal_width ||
          0,
      );

      if (
        detectedWidth === 58 ||
        detectedWidth === 88
      ) {
        setPaperWidth(detectedWidth);
      }
    } catch (err: any) {
      Alert.alert(
        "Gagal memuat pesanan",
        err?.message || "Terjadi kesalahan.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // ===================================================
  // PRINT RECEIPT
  // ===================================================

  const handlePrintReceipt = async () => {
    if (!order) return;

    try {
      await PrintService.printReceipt(order);

      await load();

      Alert.alert(
        "Berhasil",
        "Struk berhasil dicetak.",
      );
    } catch (err: any) {
      Alert.alert(
        "Gagal mencetak struk",
        err?.message || "Printer tidak siap.",
      );
    }
  };

  // ===================================================
  // PRINT LABEL
  // ===================================================

  const handlePrintLabel = async (
    countPerSheet?: number,
    selectedPaperWidth?: ThermalPaperWidth,
  ) => {
    if (!order) return;

    const perSheet = Math.min(
      3,
      Math.max(
        2,
        Number(countPerSheet ?? labelsPerSheet) || 3,
      ),
    );

    const widthMm: ThermalPaperWidth =
      selectedPaperWidth ?? paperWidth;

    try {
      await (PrintService.printLabel as any)(
        order,
        perSheet,
        {
          labelsPerSheet: perSheet,
          paperWidth: widthMm,
          paperWidthMm: widthMm,
          autoPaperSize: true,
          showLogo: true,
          layout: "thermal-sheet",
        },
      );

      setLabelModalVisible(false);

      await load();

      Alert.alert(
        "Berhasil",
        `1 kertas (${widthMm}mm) berisi ${perSheet} label berhasil dicetak.`,
      );
    } catch (err: any) {
      Alert.alert(
        "Gagal mencetak label",
        err?.message || "Printer tidak siap.",
      );
    }
  };

  // ===================================================
  // PRINT MEMBER CARD
  // ===================================================

  const handlePrintMemberCard = async (
    subscriptionId: number,
  ) => {
    try {
      await PrintService.printMemberCard(
        subscriptionId,
      );

      await load();

      Alert.alert(
        "Berhasil",
        "Kartu langganan member berhasil dicetak.",
      );
    } catch (err: any) {
      Alert.alert(
        "Gagal mencetak kartu",
        err?.message || "Printer tidak siap.",
      );
    }
  };

  // ===================================================
  // SEND WHATSAPP INVOICE
  // ===================================================

  const handleSendWAInvoice = async () => {
    if (!order) return;

    try {
      setWaModalVisible(false);

      await InvoiceService.send(order);

      await load();
    } catch (err: any) {
      Alert.alert(
        "Gagal kirim WA",
        err?.message || "Periksa nomor WhatsApp.",
      );
    }
  };

  // ===================================================
  // SEND WHATSAPP READY
  // ===================================================

  const handleSendWAReady = async () => {
    if (!order?.customer_phone) {
      Alert.alert(
        "Nomor telepon pelanggan belum tersedia",
      );

      return;
    }

    const message = `
Halo Kak *${order.customer_name}* 👋

Cucian Anda di Laundrify sudah *SELESAI* dan *SIAP DIAMBIL*. 🎉

No. Order : *${order.order_number}*
Total     : ${money(order.total)}
Status    : *${
      order.payment_status === "paid"
        ? "LUNAS ✓"
        : `Sisa ${money(order.remaining)}`
    }*

Terima kasih! 🙏
    `.trim();

    try {
      setWaModalVisible(false);

      await WhatsAppService.open(
        order.customer_phone,
        message,
        {
          orderId: order.id,
          customerId: order.customer_id,
          messageType: "info",
        },
      );

      await load();
    } catch (err: any) {
      Alert.alert(
        "Gagal kirim WA",
        err?.message || "Terjadi kesalahan.",
      );
    }
  };

  // ===================================================
  // CHANGE ORDER STATUS
  // ===================================================

  const handleChangeStatus = async (
    newStatus: OrderStatus,
  ) => {
    if (!order) return;

    Alert.alert(
      "Ubah Status Pesanan?",
      `Status diubah menjadi "${
        ORDER_STATUS_LABELS[newStatus] ||
        newStatus
      }".`,
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Ya, Ubah",
          onPress: async () => {
            try {
              await updateOrderStatus(
                order.id,
                newStatus,
              );

              await load();

              if (
                newStatus === "ready" &&
                order.customer_phone
              ) {
                Alert.alert(
                  "Status Siap Diambil!",
                  "Kirim pemberitahuan WhatsApp ke pelanggan sekarang?",
                  [
                    {
                      text: "Nanti Saja",
                      style: "cancel",
                    },
                    {
                      text: "Kirim WhatsApp",
                      onPress: () =>
                        handleSendWAReady(),
                    },
                  ],
                );
              }
            } catch (err: any) {
              Alert.alert(
                "Gagal ubah status",
                err?.message || "Terjadi kesalahan.",
              );
            }
          },
        },
      ],
    );
  };

  // ===================================================
  // DELETE ORDER
  // ===================================================

  const handleDelete = () => {
    if (!order) return;

    Alert.alert(
      "Hapus Pesanan?",
      `Hapus pesanan ${order.order_number}?`,
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
              await deleteOrder(order.id);

              router.replace("/orders");
            } catch (err: any) {
              Alert.alert(
                "Gagal menghapus",
                err?.message || "Terjadi kesalahan.",
              );
            }
          },
        },
      ],
    );
  };

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <Page
        title="Detail Pesanan"
        subtitle="Memuat data..."
      >
        <View style={s.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={UI.primary}
          />
        </View>
      </Page>
    );
  }

  // ===================================================
  // EMPTY ORDER
  // ===================================================

  if (!order) {
    return (
      <Page
        title="Detail Pesanan"
        subtitle="Tidak ditemukan"
      >
        <Card>
          <Text style={s.emptyText}>
            Data pesanan tidak tersedia.
          </Text>

          <Button
            title="Kembali"
            secondary
            onPress={() =>
              router.replace("/orders")
            }
          />
        </Card>
      </Page>
    );
  }

  // ===================================================
  // ORDER DATA
  // ===================================================

  const badge =
    ORDER_STATUS_BADGE[order.status] || {
      bg: UI.inset,
      text: UI.text,
    };

  const isPaid =
    order.payment_status === "paid" ||
    Number(order.remaining) <= 0;

  const nextStatus =
    NEXT_STATUS[order.status];

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <Page
      title="Detail Pesanan"
      subtitle={order.order_number}
    >
      {/* ============================================= */}
      {/* ORDER IDENTITY */}
      {/* ============================================= */}

      <View style={s.card}>
        <View style={s.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.orderNumber}>
              {order.order_number}
            </Text>

            <Text style={s.muted}>
              {order.order_date}
            </Text>
          </View>

          <View
            style={[
              s.statusBadge,
              {
                backgroundColor: badge.bg,
              },
            ]}
          >
            <Text
              style={[
                s.statusBadgeText,
                {
                  color: badge.text,
                },
              ]}
            >
              {ORDER_STATUS_LABELS[order.status] ||
                order.status}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.customerRow}>
          <View style={s.avatar}>
            <User
              size={20}
              color={UI.primary}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.customerName}>
              {order.customer_name}
            </Text>

            <Text style={s.muted}>
              {order.customer_phone ||
                "Tanpa nomor telepon"}
            </Text>
          </View>
        </View>

        {order.estimated_completion && (
          <View style={s.metaRow}>
            <Clock
              size={14}
              color={UI.muted}
            />

            <Text style={s.muted}>
              Estimasi Selesai:{" "}
              {order.estimated_completion}
            </Text>
          </View>
        )}

        {order.completed_at && (
          <View style={s.metaRow}>
            <Check
              size={14}
              color={UI.green}
            />

            <Text
              style={[
                s.muted,
                { color: UI.green },
              ]}
            >
              Selesai Pada: {order.completed_at}
            </Text>
          </View>
        )}
      </View>

      {/* ============================================= */}
      {/* MAIN ACTIONS */}
      {/* ============================================= */}

      <Text style={s.sectionHeader}>
        AKSI PESANAN
      </Text>

      <View style={s.actionGrid}>
        <Pressable
          onPress={handlePrintReceipt}
          style={s.actionCard}
        >
          <View
            style={[
              s.actionIcon,
              {
                backgroundColor: UI.primaryLight,
              },
            ]}
          >
            <Printer
              size={20}
              color={UI.primary}
            />
          </View>

          <Text style={s.actionTitle}>
            Cetak Struk
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            setLabelModalVisible(true)
          }
          style={s.actionCard}
        >
          <View
            style={[
              s.actionIcon,
              {
                backgroundColor: UI.amberLight,
              },
            ]}
          >
            <Tag
              size={20}
              color={UI.amber}
            />
          </View>

          <Text style={s.actionTitle}>
            Cetak Label
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            setWaModalVisible(true)
          }
          style={s.actionCard}
        >
          <View
            style={[
              s.actionIcon,
              {
                backgroundColor: UI.greenLight,
              },
            ]}
          >
            <Send
              size={20}
              color={UI.green}
            />
          </View>

          <Text style={s.actionTitle}>
            Kirim WA
          </Text>
        </Pressable>
      </View>

      {/* ============================================= */}
      {/* MEMBER SUBSCRIPTION */}
      {/* ============================================= */}

      {order.created_subscription && (
        <View style={s.memberBanner}>
          <View style={{ flex: 1 }}>
            <View style={s.memberBannerHeading}>
              <Award
                size={18}
                color={UI.amber}
              />

              <Text style={s.memberBannerTitle}>
                LANGGANAN MEMBER DIBUAT
              </Text>
            </View>

            <Text style={s.memberBannerDesc}>
              {order.created_subscription.member_no}
              {" · "}
              {order.created_subscription.package_name}
            </Text>
          </View>

          <Pressable
            onPress={() =>
              handlePrintMemberCard(
                order.created_subscription.id,
              )
            }
            style={s.memberBannerBtn}
          >
            <Printer
              size={14}
              color={UI.white}
            />

            <Text style={s.memberBannerBtnText}>
              Cetak Kartu
            </Text>
          </Pressable>
        </View>
      )}

      {/* ============================================= */}
      {/* ORDER STATUS */}
      {/* ============================================= */}

      <Text style={s.sectionHeader}>
        STATUS PESANAN
      </Text>

      <View style={s.card}>
        {nextStatus ? (
          <Pressable
            onPress={() =>
              handleChangeStatus(nextStatus)
            }
            style={s.nextStatusBtn}
          >
            <Text style={s.nextStatusText}>
              {NEXT_STATUS_LABEL[order.status]}
            </Text>
          </Pressable>
        ) : (
          <View style={s.doneBox}>
            <Check
              size={18}
              color={UI.green}
            />

            <Text style={s.doneText}>
              Pesanan ini sudah selesai sepenuhnya.
            </Text>
          </View>
        )}

        <View style={s.chipsRow}>
          {(
            [
              "received",
              "processing",
              "ready",
              "completed",
            ] as OrderStatus[]
          ).map((status) => {
            const active =
              order.status === status;

            return (
              <Pressable
                key={status}
                onPress={() =>
                  handleChangeStatus(status)
                }
                disabled={active}
                style={[
                  s.chip,
                  active && s.chipActive,
                ]}
              >
                <Text
                  style={[
                    s.chipText,
                    active && {
                      color: UI.white,
                    },
                  ]}
                >
                  {ORDER_STATUS_LABELS[status]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ============================================= */}
      {/* ITEMS AND PAYMENT */}
      {/* ============================================= */}

      <Text style={s.sectionHeader}>
        RINCIAN ITEM & PEMBAYARAN
      </Text>

      <View style={s.card}>
        {order.items?.map((item: any) => (
          <View
            key={item.id}
            style={s.itemRow}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.itemName}>
                {item.service_name}
              </Text>

              <Text style={s.muted}>
                {item.quantity} {item.unit} ×{" "}
                {money(item.price)}
              </Text>

              {item.paid_by_subscription_id && (
                <Text style={s.quotaTag}>
                  ✓ Potong Kuota Paket Member
                </Text>
              )}
            </View>

            <Text style={s.itemSubtotal}>
              {money(item.subtotal)}
            </Text>
          </View>
        ))}

        <View style={s.divider} />

        <View style={s.feeRow}>
          <Text style={s.muted}>
            Subtotal:
          </Text>

          <Text style={s.feeVal}>
            {money(order.subtotal)}
          </Text>
        </View>

        {order.member_discount > 0 && (
          <View style={s.feeRow}>
            <Text
              style={[
                s.muted,
                { color: UI.green },
              ]}
            >
              Potongan Member:
            </Text>

            <Text
              style={[
                s.feeVal,
                { color: UI.green },
              ]}
            >
              - {money(order.member_discount)}
            </Text>
          </View>
        )}

        {order.discount > 0 && (
          <View style={s.feeRow}>
            <Text
              style={[
                s.muted,
                { color: UI.red },
              ]}
            >
              Diskon Manual:
            </Text>

            <Text
              style={[
                s.feeVal,
                { color: UI.red },
              ]}
            >
              - {money(order.discount)}
            </Text>
          </View>
        )}

        <View style={s.feeRow}>
          <Text style={s.totalLabel}>
            TOTAL AKHIR:
          </Text>

          <Text style={s.totalVal}>
            {money(order.total)}
          </Text>
        </View>

        <View style={s.feeRow}>
          <Text style={s.muted}>
            Sudah Dibayar:
          </Text>

          <Text
            style={[
              s.feeVal,
              { color: UI.green },
            ]}
          >
            {money(order.paid)}
          </Text>
        </View>

        <View style={s.feeRow}>
          <Text style={s.muted}>
            Sisa Tagihan:
          </Text>

          <Text
            style={[
              s.feeVal,
              {
                color: isPaid
                  ? UI.green
                  : UI.red,
                fontWeight: "900",
              },
            ]}
          >
            {isPaid
              ? "LUNAS ✓"
              : money(order.remaining)}
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
                    remaining: String(
                      order.remaining,
                    ),
                  },
                })
              }
            />
          </View>
        )}
      </View>

      {/* ============================================= */}
      {/* DELETE ORDER */}
      {/* ============================================= */}

      <Pressable
        onPress={handleDelete}
        style={s.deleteBtn}
      >
        <Trash2
          size={16}
          color={UI.red}
        />

        <Text style={s.deleteText}>
          Hapus Pesanan
        </Text>
      </Pressable>

      {/* ============================================= */}
      {/* PRINT LABEL MODAL */}
      {/* ============================================= */}

      <PrintLabelModal
        visible={labelModalVisible}
        labelsPerSheet={labelsPerSheet}
        onChangeLabelsPerSheet={
          setLabelsPerSheet
        }
        paperWidth={paperWidth}
        onChangePaperWidth={setPaperWidth}
        onClose={() =>
          setLabelModalVisible(false)
        }
        onConfirm={handlePrintLabel}
        order={order}
        isPaid={isPaid}
      />

      {/* ============================================= */}
      {/* WHATSAPP MODAL */}
      {/* ============================================= */}

      <Modal
        visible={waModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setWaModalVisible(false)
        }
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>
                  Kirim WhatsApp
                </Text>

                <Text style={s.modalSubtitle}>
                  Pilih pesan yang ingin dikirim.
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setWaModalVisible(false)
                }
              >
                <Text style={s.modalClose}>
                  Batal
                </Text>
              </Pressable>
            </View>

            <View style={s.waOptions}>
              <Pressable
                onPress={handleSendWAInvoice}
                style={s.waBtn}
              >
                <View
                  style={[
                    s.waIcon,
                    {
                      backgroundColor: UI.primaryLight,
                    },
                  ]}
                >
                  <FileText
                    size={20}
                    color={UI.primary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.waTitle}>
                    Kirim Invoice Lengkap
                  </Text>

                  <Text style={s.muted}>
                    Rincian layanan & status pembayaran
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={handleSendWAReady}
                style={s.waBtn}
              >
                <View
                  style={[
                    s.waIcon,
                    {
                      backgroundColor: UI.greenLight,
                    },
                  ]}
                >
                  <Check
                    size={20}
                    color={UI.green}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.waTitle}>
                    Cucian Siap Diambil
                  </Text>

                  <Text style={s.muted}>
                    Notifikasi pengambilan pakaian
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

// =====================================================
// STYLES
// =====================================================

const s = StyleSheet.create({
  // GENERAL
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },

  emptyText: {
    color: UI.muted,
    fontSize: 12,
    marginBottom: 15,
  },

  sectionHeader: {
    fontSize: 11,
    fontWeight: "900",
    color: UI.muted,
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },

  divider: {
    height: 1,
    backgroundColor: UI.border,
    marginVertical: 12,
  },

  muted: {
    fontSize: 11,
    color: UI.muted,
  },

  // ORDER HEADER
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  orderNumber: {
    fontSize: 17,
    fontWeight: "900",
    color: UI.text,
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

  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
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

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },

  // ACTIONS
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

  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  actionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: UI.text,
  },

  // MEMBER
  memberBanner: {
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

  memberBannerHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  memberBannerTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: UI.amber,
  },

  memberBannerDesc: {
    fontSize: 10,
    color: "#78350F",
    marginTop: 2,
  },

  memberBannerBtn: {
    backgroundColor: UI.amber,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  memberBannerBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: UI.white,
  },

  // STATUS
  nextStatusBtn: {
    backgroundColor: UI.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },

  nextStatusText: {
    fontSize: 12,
    fontWeight: "900",
    color: UI.white,
  },

  doneBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: UI.greenLight,
    borderRadius: 6,
    marginBottom: 10,
  },

  doneText: {
    fontSize: 11,
    fontWeight: "800",
    color: UI.green,
  },

  chipsRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.background,
  },

  chipActive: {
    backgroundColor: UI.primary,
    borderColor: UI.primary,
  },

  chipText: {
    fontSize: 10,
    fontWeight: "800",
    color: UI.muted,
  },

  // ITEMS AND PAYMENT
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  itemName: {
    fontSize: 12,
    fontWeight: "800",
    color: UI.text,
  },

  quotaTag: {
    fontSize: 9,
    fontWeight: "800",
    color: UI.green,
    marginTop: 2,
  },

  itemSubtotal: {
    fontSize: 12,
    fontWeight: "800",
    color: UI.text,
  },

  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  feeVal: {
    fontSize: 11,
    fontWeight: "800",
    color: UI.text,
  },

  totalLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: UI.text,
  },

  totalVal: {
    fontSize: 15,
    fontWeight: "900",
    color: UI.primary,
  },

  // DELETE
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: UI.red,
    marginTop: 8,
  },

  deleteText: {
    color: UI.red,
    fontSize: 11,
    fontWeight: "800",
  },

  // MODAL
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
    maxHeight: "92%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: UI.text,
  },

  modalSubtitle: {
    fontSize: 11,
    color: UI.muted,
    marginTop: 3,
  },

  modalClose: {
    fontSize: 12,
    fontWeight: "800",
    color: UI.primary,
  },

  // LABEL CONTROLS
  controlLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: UI.muted,
    marginBottom: 8,
    letterSpacing: 0.4,
  },

  presetRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },

  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.background,
    alignItems: "center",
  },

  presetBtnActive: {
    backgroundColor: UI.primary,
    borderColor: UI.primary,
  },

  presetBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: UI.text,
  },

  presetBtnTextActive: {
    color: UI.white,
  },

  presetSubText: {
    fontSize: 9,
    fontWeight: "700",
    color: UI.muted,
    marginTop: 3,
  },

  presetSubTextActive: {
    color: "#DBEAFE",
  },

  // STEPPER
  copiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    padding: 10,
    backgroundColor: UI.background,
    borderRadius: 6,
  },

  copiesLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: UI.text,
  },

  copiesHint: {
    fontSize: 9,
    color: UI.muted,
    marginTop: 2,
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
    width: 36,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    color: UI.text,
    padding: 0,
  },

  // PREVIEW
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  previewMeta: {
    fontSize: 9,
    fontWeight: "800",
    color: UI.primary,
  },

  paperPreviewCenter: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 2,
  },

  paperSheetPreview: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 5,
    padding: 7,
    backgroundColor: "#E2E8F0",
  },

  paperWidth58: {
    width: "72%",
  },

  paperWidth88: {
    width: "100%",
  },

  paperTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },

  paperTopTitle: {
    fontSize: 9,
    fontWeight: "900",
    color: "#334155",
  },

  paperTopBadge: {
    backgroundColor: "#0F172A",
    color: UI.white,
    fontSize: 8,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    overflow: "hidden",
  },

  sheetStack: {
    gap: 3,
  },

  cutLineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 5,
  },

  cutDash: {
    flex: 1,
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderColor: "#64748B",
  },

  cutText: {
    fontSize: 7,
    fontWeight: "800",
    color: "#475569",
  },

  // REUSABLE LABEL
  labelContainer: {
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 3,
  },

  labelContainer58: {
    padding: 6,
    gap: 4,
  },

  labelContainer88: {
    padding: 9,
    gap: 5,
  },

  labelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 5,
  },

  // BRAND
  labelBrand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  labelBrandText: {
    flex: 1,
  },

  labelLogo: {
    resizeMode: "contain",
  },

  labelLogo58: {
    width: 25,
    height: 25,
  },

  labelLogo88: {
    width: 34,
    height: 34,
  },

  labelBrandName: {
    fontSize: 10,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: 0.2,
  },

  labelBrandSub: {
    fontSize: 7,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },

  labelNumber: {
    fontSize: 8,
    fontWeight: "800",
    color: "#334155",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 5,
    paddingVertical: 3,
    overflow: "hidden",
  },

  labelDivider: {
    height: 1,
    backgroundColor: "#CBD5E1",
    marginVertical: 2,
  },

  // LABEL INFORMATION
  labelInfo: {
    gap: 3,
  },

  labelInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  labelInfoTitle: {
    width: 48,
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
  },

  labelInfoTitle58: {
    width: 39,
    fontSize: 8,
  },

  labelInfoValue: {
    flex: 1,
    fontSize: 9,
    fontWeight: "600",
    color: "#111827",
  },

  labelInfoValue58: {
    fontSize: 8,
  },

  labelInfoBold: {
    fontWeight: "900",
  },

  // PAYMENT
  labelPayment: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4,
  },

  labelPaymentTitle: {
    fontSize: 8,
    fontWeight: "800",
    color: "#64748B",
  },

  labelPaymentStatus: {
    flex: 1,
    fontSize: 8,
    fontWeight: "900",
    textAlign: "right",
  },

  // WHATSAPP
  waOptions: {
    gap: 10,
  },

  waBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.background,
  },

  waIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  waTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: UI.text,
  },

  // MODAL FOOTER
  modalFooter: {
    marginTop: 12,
    paddingTop: 8,
  },
});