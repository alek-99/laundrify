import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Award, Check, Plus, Printer, Send, Shirt } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import OrderItemCard from "@/components/order/OrderItemCard";
import { CustomerPicker, type CustomerMode } from "../../components/CustomerPicker";
import { Button, Field, Page, money } from "../../components/ui";
import { getCustomerById } from "../../repositories/customer.repository";
import { getServices } from "../../repositories/service.repository";
import { InvoiceService } from "../../services/invoice.service";
import { MemberService } from "../../services/member.service";
import { createOrder, getOrderById, updateOrder } from "../../services/order.service";
import { PrintService } from "../../services/print.service";
import type {
  Customer,
  MemberPackage,
  MemberSubscriptionWithBalance,
  PaymentMethod,
  Service,
} from "../../types/database";
import {
  MAX_CUSTOMER_NAME_LENGTH,
  isValidPhone,
  normalizeName,
  normalizePhone,
} from "../../utils/phone";

type MemberUsageChoice = "member" | "service";

interface FormOrderItem {
  tempId: string;
  item_type: "service" | "package";
  service_id?: number | null;
  package_id?: number | null;
  name: string;
  category?: string;
  package_type?: string | null;
  unit: string;
  price: number;
  quantity: number;
  use_subscription_id?: number | null;
  notes?: string;
}

const UI = {
  white: "#FFFFFF",
  background: "#EEF1F5",
  text: "#263244",
  muted: "#8490A3",
  border: "#D8DEE8",
  primary: "#3159C9",
  primaryLight: "#E7EDFF",
  green: "#15803D",
  greenLight: "#DCFCE7",
  amber: "#B45309",
  amberLight: "#FEF3C7",
  red: "#D34B55",
  redLight: "#FEE2E2",
};

export default function CreateOrder() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);

  // Master data
  const [services, setServices] = useState<Service[]>([]);
  const [memberPackages, setMemberPackages] = useState<MemberPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Pelanggan
  const [customerMode, setCustomerMode] = useState<CustomerMode>("registered");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  // Membership & pilihan penggunaan
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    MemberSubscriptionWithBalance[]
  >([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [memberChoice, setMemberChoice] = useState<MemberUsageChoice>("member");
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [memberKgInput, setMemberKgInput] = useState("5");

  // Layanan reguler & catatan
  const [orderItems, setOrderItems] = useState<FormOrderItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");

  // Pembayaran
  const [paymentType, setPaymentType] = useState<"paid" | "partial" | "unpaid">("paid");
  const [paidInput, setPaidInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  // Modal & sukses
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [packageModalVisible, setPackageModalVisible] = useState(false);
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<
    "kiloan" | "satuan" | "karpet" | "all"
  >("kiloan");
  const [savedOrder, setSavedOrder] = useState<any>(null);
  const [createdSubscriptionId, setCreatedSubscriptionId] = useState<number | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const originalCustomerId = useRef<number | null>(null);
  const [hasExistingQuotaUsage, setHasExistingQuotaUsage] = useState(false);

  // Muat layanan & paket member
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadMaster = async () => {
        try {
          setLoading(true);
          const [svcList, pkgList] = await Promise.all([
            getServices(true),
            MemberService.getMemberPackages(),
          ]);
          if (!active) return;
          setServices(svcList);
          setMemberPackages(pkgList);
        } catch (err: any) {
          Alert.alert("Gagal memuat data", err?.message || "Terjadi kesalahan.");
        } finally {
          if (active) setLoading(false);
        }
      };
      loadMaster();
      return () => {
        active = false;
      };
    }, []),
  );

  // Muat paket member aktif ketika pelanggan terdaftar dipilih
  useEffect(() => {
    let active = true;
    const loadSubs = async () => {
      if (customerMode !== "registered" || !selectedCustomer?.id) {
        setActiveSubscriptions([]);
        setSelectedSubId(null);
        setMemberChoice("service");
        return;
      }

      try {
        setLoadingSubscriptions(true);
        const subs = await MemberService.getCustomerActiveSubscriptions(
          selectedCustomer.id,
        );
        if (!active) return;

        setActiveSubscriptions(subs);
        if (subs.length > 0) {
          setSelectedSubId((prev) =>
            prev && subs.some((s) => s.id === prev) ? prev : subs[0].id,
          );
          if (!editing) {
            setMemberChoice("member");
          }
        } else {
          setSelectedSubId(null);
          setMemberChoice("service");
        }
      } catch {
        if (!active) return;
        setActiveSubscriptions([]);
        setSelectedSubId(null);
        setMemberChoice("service");
      } finally {
        if (active) setLoadingSubscriptions(false);
      }
    };
    loadSubs();
    return () => {
      active = false;
    };
  }, [customerMode, selectedCustomer?.id, editing]);

  // Mode edit order
  useEffect(() => {
    if (!id) return;
    let active = true;

    const loadOrder = async () => {
      try {
        const order = await getOrderById(Number(id));
        if (!active || !order) return;

        if (order.customer_id !== null) {
          originalCustomerId.current = order.customer_id;
          const customer =
            (await getCustomerById(order.customer_id)) ??
            ({
              id: order.customer_id,
              name: order.customer_name,
              phone: order.customer_phone,
              address: null,
              notes: null,
              total_orders: 0,
              created_at: "",
              updated_at: "",
              deleted_at: null,
            } as Customer);
          if (!active) return;
          setCustomerMode("registered");
          setSelectedCustomer(customer);
        } else {
          originalCustomerId.current = null;
          setCustomerMode("manual");
          setManualName(order.customer_name || "");
          setManualPhone(order.customer_phone || "");
        }

        const mapped: FormOrderItem[] = (order.items || []).map(
          (item: any, idx: number) => ({
            tempId: `edit_${idx}_${item.id}`,
            item_type: item.item_type || "service",
            service_id: item.service_id,
            package_id: item.package_id,
            name: item.service_name,
            unit: item.unit,
            price: item.price,
            quantity: item.quantity,
            use_subscription_id: item.paid_by_subscription_id,
            notes: item.notes ?? undefined,
          }),
        );

        if (mapped.some((m) => Boolean(m.use_subscription_id))) {
          setHasExistingQuotaUsage(true);
        }
        setOrderItems(mapped);
        setDiscount(String(order.discount || 0));
        setNotes(order.notes || "");
      } catch (err: any) {
        Alert.alert("Gagal memuat pesanan", err?.message || "Terjadi kesalahan.");
      }
    };
    loadOrder();
    return () => {
      active = false;
    };
  }, [id]);

  const hasActiveMemberPackage =
    !editing &&
    customerMode === "registered" &&
    Boolean(selectedCustomer) &&
    activeSubscriptions.length > 0;

  // Jika memilih layanan lain, pastikan kuota paket member tidak dipakai
  const handleSelectChoice = (choice: MemberUsageChoice) => {
    setMemberChoice(choice);
    if (choice === "service") {
      setOrderItems((prev) =>
        prev.map((item) => ({ ...item, use_subscription_id: null })),
      );
    }
  };

  const isUsingActiveMemberPackage =
    hasActiveMemberPackage && memberChoice === "member";

  const selectedSubscription = useMemo(
    () => activeSubscriptions.find((s) => s.id === selectedSubId) ?? null,
    [activeSubscriptions, selectedSubId],
  );

  const memberKg = Number(memberKgInput);
  const remainingAfterMemberUse = selectedSubscription
    ? Math.max(0, selectedSubscription.remaining_kg - (Number.isFinite(memberKg) ? memberKg : 0))
    : 0;

  const isMemberKgValid =
    Boolean(selectedSubscription) &&
    selectedSubscription?.status === "active" &&
    (selectedSubscription?.remaining_kg ?? 0) > 0 &&
    Number.isFinite(memberKg) &&
    memberKg > 0 &&
    memberKg <= (selectedSubscription?.remaining_kg ?? 0);

  // Perhitungan layanan reguler (ketika tidak memakai paket member)
  const calculations = useMemo(() => {
    let subtotal = 0;
    for (const item of orderItems) {
      subtotal += Math.round(item.quantity * item.price);
    }
    const manualDiscount = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal - manualDiscount);
    return { subtotal, manualDiscount, total };
  }, [orderItems, discount]);

  const hasPackagePurchase = orderItems.some((i) => i.item_type === "package");

  useEffect(() => {
    if (isUsingActiveMemberPackage) {
      setPaidInput("0");
      return;
    }
    if (paymentType === "paid") {
      setPaidInput(String(calculations.total));
    } else if (paymentType === "unpaid") {
      setPaidInput("0");
    }
  }, [paymentType, calculations.total, isUsingActiveMemberPackage]);

  const handleAddService = (service: Service) => {
    setOrderItems((prev) => [
      ...prev,
      {
        tempId: `svc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        item_type: "service",
        service_id: service.id,
        name: service.name,
        category: service.category,
        package_type: service.package_type,
        unit: service.unit,
        price: service.price,
        quantity: 1,
        use_subscription_id: null,
      },
    ]);
    setServiceModalVisible(false);
  };

  const handleAddPackage = (pkg: MemberPackage) => {
    setOrderItems((prev) => [
      ...prev,
      {
        tempId: `pkg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        item_type: "package",
        package_id: pkg.id,
        name: `[Paket Member] ${pkg.name}`,
        unit: "paket",
        price: pkg.price,
        quantity: 1,
        use_subscription_id: null,
      },
    ]);
    setPackageModalVisible(false);
  };

  const handleRemoveItem = (tempId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handleQuantityChange = (tempId: string, quantity: number) => {
    setOrderItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, quantity } : item)),
    );
  };

  // Validasi pelanggan
  const trimmedName = normalizeName(manualName);
  const trimmedPhone = normalizePhone(manualPhone);
  const nameError =
    customerMode === "manual" && !trimmedName ? "Nama pelanggan wajib diisi." : null;
  const phoneError =
    customerMode === "manual" && trimmedPhone && !isValidPhone(trimmedPhone)
      ? "Nomor WhatsApp tidak valid (8–15 digit)."
      : null;

  const customerValid =
    customerMode === "registered"
      ? Boolean(selectedCustomer)
      : !nameError && !phoneError && trimmedName.length <= MAX_CUSTOMER_NAME_LENGTH;

  const validateForm = (): string | null => {
    if (!customerValid) {
      setShowErrors(true);
      return customerMode === "manual"
        ? "Lengkapi data pelanggan terlebih dahulu."
        : "Pilih pelanggan terdaftar terlebih dahulu.";
    }

    if (editing && hasExistingQuotaUsage) {
      return "Pesanan yang sudah memakai kuota member tidak dapat diubah langsung.";
    }

    if (isUsingActiveMemberPackage) {
      if (loadingSubscriptions) return "Sedang memuat data paket member...";
      if (!selectedSubscription) return "Pilih paket member aktif terlebih dahulu.";
      if ((selectedSubscription.remaining_kg ?? 0) <= 0) {
        return "Sisa kuota paket member sudah habis.";
      }
      if (!Number.isFinite(memberKg) || memberKg <= 0) {
        return "Masukkan jumlah KG pemakaian paket member.";
      }
      if (memberKg > selectedSubscription.remaining_kg) {
        return `Jumlah KG (${memberKg}) melebihi sisa kuota (${selectedSubscription.remaining_kg} KG).`;
      }
      return null;
    }

    // Mode pilih layanan lain (paket member tidak digunakan)
    if (orderItems.length === 0) {
      return "Pilih minimal satu layanan terlebih dahulu.";
    }
    for (const item of orderItems) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        return `Jumlah ${item.name} harus lebih dari 0.`;
      }
    }
    if (calculations.manualDiscount > calculations.subtotal) {
      return "Diskon manual tidak boleh melebihi subtotal layanan.";
    }

    const parsedPaid = Number(paidInput) || 0;
    if (parsedPaid < 0 || parsedPaid > calculations.total) {
      return "Nominal pembayaran tidak valid.";
    }
    if (hasPackagePurchase && parsedPaid < calculations.total) {
      return "Pembelian paket member harus dibayar lunas.";
    }
    return null;
  };

  const handleSave = async () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      Alert.alert("Validasi Pesanan", errorMsg);
      return;
    }

    setSaving(true);
    try {
      const customerInput =
        customerMode === "registered"
          ? { customer_id: selectedCustomer!.id }
          : {
              customer_id: null,
              customer_name: trimmedName,
              customer_phone: trimmedPhone,
            };

      const itemsInput = isUsingActiveMemberPackage
        ? [
            {
              item_type: "service" as const,
              service_id: null,
              package_id: null,
              quantity: memberKg,
              use_subscription_id: selectedSubscription!.id,
              notes: `Potong kuota paket ${
                selectedSubscription!.package_name || selectedSubscription!.member_no
              }`,
            },
          ]
        : orderItems.map((item) => ({
            item_type: item.item_type,
            service_id: item.service_id ?? null,
            package_id: item.package_id ?? null,
            quantity: item.quantity,
            use_subscription_id: null,
            notes: item.notes ?? null,
          }));

      const parsedPaid = Number(paidInput) || 0;
      const initialPayment =
        !isUsingActiveMemberPackage && parsedPaid > 0
          ? {
              amount: parsedPaid,
              method: paymentMethod,
              notes: "Pembayaran saat order dibuat",
            }
          : undefined;

      if (editing) {
        await updateOrder(Number(id), {
          ...customerInput,
          items: itemsInput,
          discount: calculations.manualDiscount,
          notes: notes.trim(),
        });
        Alert.alert("Berhasil", "Perubahan pesanan berhasil disimpan.", [
          { text: "OK", onPress: () => router.replace("/orders") },
        ]);
        return;
      }

      const created = await createOrder({
        ...customerInput,
        items: itemsInput,
        discount: isUsingActiveMemberPackage ? 0 : calculations.manualDiscount,
        notes: notes.trim(),
        initial_payment: initialPayment,
      });

      const fullOrder = await getOrderById(created.id);
      setSavedOrder(fullOrder);
      setCreatedSubscriptionId(created.created_subscription_id ?? null);
      setSuccessModalVisible(true);
    } catch (err: any) {
      Alert.alert("Gagal menyimpan pesanan", err?.message || "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Page title="Pesanan" subtitle="Menyiapkan formulir...">
        <View style={s.card}>
          <Text style={s.sectionTitle}>MEMUAT DATA...</Text>
          <Text style={s.muted}>Mengambil daftar layanan dan paket member.</Text>
        </View>
      </Page>
    );
  }

  return (
    <Page
      title={editing ? "Edit Pesanan" : "Buat Pesanan"}
      subtitle="Pilih pelanggan, gunakan paket member atau pilih layanan"
    >
      {/* 1. PELANGGAN */}
      <Text style={s.sectionTitle}>1. PELANGGAN</Text>
      <CustomerPicker
        mode={customerMode}
        onModeChange={setCustomerMode}
        selected={selectedCustomer}
        onSelect={setSelectedCustomer}
        name={manualName}
        phone={manualPhone}
        onNameChange={setManualName}
        onPhoneChange={setManualPhone}
        showErrors={showErrors}
        nameError={nameError}
        phoneError={phoneError}
      />

      {/* PILIHAN KETIKA ADA PAKET MEMBER AKTIF */}
      {hasActiveMemberPackage && (
        <View style={s.memberChoiceBox}>
          <View style={s.rowGap}>
            <Award size={18} color={UI.green} />
            <Text style={s.memberChoiceTitle}>PAKET MEMBER AKTIF TERDETEKSI</Text>
          </View>
          <Text style={s.memberChoiceDesc}>
            Pilih apakah pesanan ini memakai paket member aktif atau pilih layanan lain.
          </Text>

          <View style={s.choiceRow}>
            <Pressable
              onPress={() => handleSelectChoice("member")}
              style={[
                s.choiceBtn,
                memberChoice === "member" && s.choiceBtnMemberActive,
              ]}
            >
              <Text
                style={[
                  s.choiceBtnText,
                  memberChoice === "member" && { color: UI.white },
                ]}
              >
                Gunakan Paket
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleSelectChoice("service")}
              style={[
                s.choiceBtn,
                memberChoice === "service" && s.choiceBtnServiceActive,
              ]}
            >
              <Text
                style={[
                  s.choiceBtnText,
                  memberChoice === "service" && { color: UI.white },
                ]}
              >
                Pilih Layanan Lain
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 2. INPUT KG PAKET MEMBER ATAU DAFTAR LAYANAN */}
      <Text style={s.sectionTitle}>
        {isUsingActiveMemberPackage ? "2. PEMAKAIAN KUOTA PAKET MEMBER" : "2. LAYANAN PESANAN"}
      </Text>

      {isUsingActiveMemberPackage ? (
        <View style={s.card}>
          {activeSubscriptions.length > 1 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={s.fieldLabel}>Pilih Paket Aktif:</Text>
              <View style={{ gap: 8 }}>
                {activeSubscriptions.map((sub) => {
                  const active = sub.id === selectedSubId;
                  return (
                    <Pressable
                      key={sub.id}
                      onPress={() => setSelectedSubId(sub.id)}
                      style={[s.subOption, active && s.subOptionActive]}
                    >
                      <Text style={s.subOptionTitle}>
                        {sub.package_name || sub.package_type} ({sub.member_no})
                      </Text>
                      <Text style={s.subOptionQuota}>
                        Sisa: {sub.remaining_kg} KG
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {selectedSubscription && (
            <View style={s.quotaSummaryBanner}>
              <Text style={s.quotaBannerLabel}>
                {selectedSubscription.package_name || selectedSubscription.package_type} ·{" "}
                {selectedSubscription.member_no}
              </Text>
              <Text style={s.quotaBannerValue}>
                Sisa Kuota Saat Ini: {selectedSubscription.remaining_kg} KG
              </Text>
            </View>
          )}

          <Field
            label="Berapa KG Customer Memakai Paket?"
            value={memberKgInput}
            onChangeText={(val) => {
              const cleaned = val.replace(",", ".");
              if (/^\d*\.?\d*$/.test(cleaned)) {
                setMemberKgInput(cleaned);
              }
            }}
            keyboardType="decimal-pad"
            placeholder="Contoh: 3.5"
          />

          <View
            style={[
              s.calcQuotaBox,
              {
                backgroundColor: isMemberKgValid ? UI.greenLight : UI.redLight,
              },
            ]}
          >
            <Text
              style={[
                s.calcQuotaText,
                { color: isMemberKgValid ? UI.green : UI.red },
              ]}
            >
              {isMemberKgValid
                ? `Kuota terpotong: ${memberKg} KG → Sisa kuota: ${remainingAfterMemberUse.toFixed(2)} KG`
                : "Pastikan jumlah KG lebih dari 0 dan tidak melebihi sisa kuota paket."}
            </Text>
          </View>
        </View>
      ) : (
        <>
          {orderItems.length === 0 ? (
            <View style={s.emptyCard}>
              <Shirt size={26} color={UI.muted} />
              <Text style={s.emptyTitle}>Belum ada layanan dipilih</Text>
              <Text style={s.muted}>
                {hasActiveMemberPackage
                  ? "Paket member tidak digunakan. Silakan pilih layanan lain di bawah."
                  : "Tambahkan layanan kiloan, satuan, karpet, atau paket member."}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginBottom: 12 }}>
              {orderItems.map((item) => (
                <OrderItemCard
                  key={item.tempId}
                  item={item}
                  quotaAvailable={0}
                  quotaEnabled={false}
                  onQuantityChange={(qty) => handleQuantityChange(item.tempId, qty)}
                  onToggleQuota={() => {}}
                  onRemove={() => handleRemoveItem(item.tempId)}
                />
              ))}
            </View>
          )}

          <View style={s.addRow}>
            <Pressable
              onPress={() => setServiceModalVisible(true)}
              style={[s.addBtn, { backgroundColor: UI.primary }]}
            >
              <Plus size={16} color={UI.white} />
              <Text style={s.addBtnText}>+ Layanan</Text>
            </Pressable>

            <Pressable
              onPress={() => setPackageModalVisible(true)}
              style={[s.addBtn, { backgroundColor: UI.amber }]}
            >
              <Award size={16} color={UI.white} />
              <Text style={s.addBtnText}>+ Paket Member</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* 3. CATATAN & DISKON */}
      <Text style={s.sectionTitle}>3. CATATAN & RINGKASAN</Text>
      <View style={s.card}>
        {!isUsingActiveMemberPackage && (
          <Field
            label="Diskon Manual (Rp)"
            value={discount}
            onChangeText={setDiscount}
            keyboardType="numeric"
            placeholder="0"
          />
        )}
        <Field
          label="Catatan Pesanan"
          value={notes}
          onChangeText={setNotes}
          placeholder="Catatan tambahan (opsional)..."
          multiline
        />

        <View style={s.divider} />

        {isUsingActiveMemberPackage ? (
          <>
            <View style={s.summaryRow}>
              <Text style={s.muted}>Pemakaian Kuota Paket:</Text>
              <Text style={[s.summaryValue, { color: UI.green }]}>
                {Number.isFinite(memberKg) ? memberKg : 0} KG
              </Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.muted}>Sisa Kuota Setelah Order:</Text>
              <Text style={s.summaryValue}>
                {remainingAfterMemberUse.toFixed(2)} KG
              </Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.totalLabel}>TOTAL TAGIHAN:</Text>
              <Text style={[s.totalValue, { color: UI.green }]}>Rp0 (Paket)</Text>
            </View>
          </>
        ) : (
          <>
            <View style={s.summaryRow}>
              <Text style={s.muted}>Subtotal:</Text>
              <Text style={s.summaryValue}>{money(calculations.subtotal)}</Text>
            </View>
            {calculations.manualDiscount > 0 && (
              <View style={s.summaryRow}>
                <Text style={[s.muted, { color: UI.red }]}>Diskon:</Text>
                <Text style={[s.summaryValue, { color: UI.red }]}>
                  - {money(calculations.manualDiscount)}
                </Text>
              </View>
            )}
            <View style={s.summaryRow}>
              <Text style={s.totalLabel}>TOTAL TAGIHAN:</Text>
              <Text style={s.totalValue}>{money(calculations.total)}</Text>
            </View>
          </>
        )}
      </View>

      {/* 4. PEMBAYARAN (HANYA JIKA TIDAK MEMAKAI PAKET MEMBER) */}
      {!isUsingActiveMemberPackage && (
        <>
          <Text style={s.sectionTitle}>4. PEMBAYARAN</Text>
          <View style={s.card}>
            {hasPackagePurchase ? (
              <View style={s.noticeAmber}>
                <Text style={s.noticeAmberText}>
                  Pembelian paket member wajib dibayar lunas agar langsung aktif.
                </Text>
              </View>
            ) : (
              <View style={s.segmentedRow}>
                {(
                  [
                    ["paid", "LUNAS"],
                    ["partial", "DP / SEBAGIAN"],
                    ["unpaid", "BELUM BAYAR"],
                  ] as const
                ).map(([key, label]) => (
                  <Pressable
                    key={key}
                    onPress={() => setPaymentType(key)}
                    style={[s.segmentBtn, paymentType === key && s.segmentBtnActive]}
                  >
                    <Text
                      style={[
                        s.segmentText,
                        paymentType === key && s.segmentTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {(hasPackagePurchase || paymentType !== "unpaid") && (
              <View style={{ marginTop: 12 }}>
                <Field
                  label="Nominal Dibayar (Rp)"
                  value={paidInput}
                  onChangeText={setPaidInput}
                  keyboardType="numeric"
                  placeholder="0"
                />
                {!hasPackagePurchase && (
                  <View style={s.methodRow}>
                    {(["cash", "transfer", "qris"] as PaymentMethod[]).map((m) => (
                      <Pressable
                        key={m}
                        onPress={() => setPaymentMethod(m)}
                        style={[
                          s.methodBtn,
                          paymentMethod === m && s.methodBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            s.methodText,
                            paymentMethod === m && s.methodTextActive,
                          ]}
                        >
                          {m.toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </>
      )}

      <View style={{ marginTop: 12 }}>
        <Button
          title={
            saving
              ? "Menyimpan..."
              : editing
                ? "Simpan Perubahan"
                : isUsingActiveMemberPackage
                  ? "SIMPAN & POTONG KUOTA PAKET"
                  : "SELESAIKAN ORDER"
          }
          onPress={handleSave}
          loading={saving}
          disabled={saving || loadingSubscriptions}
        />
      </View>

      {/* MODAL PILIH LAYANAN */}
      <Modal
        visible={serviceModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setServiceModalVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Pilih Layanan</Text>
              <Pressable onPress={() => setServiceModalVisible(false)}>
                <Text style={s.modalClose}>Tutup</Text>
              </Pressable>
            </View>

            <View style={s.filterRow}>
              {(["kiloan", "satuan", "karpet", "all"] as const).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setServiceCategoryFilter(cat)}
                  style={[
                    s.filterChip,
                    serviceCategoryFilter === cat && s.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      s.filterChipText,
                      serviceCategoryFilter === cat && { color: UI.white },
                    ]}
                  >
                    {cat.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {services
                .filter(
                  (svc) =>
                    serviceCategoryFilter === "all" ||
                    svc.category === serviceCategoryFilter,
                )
                .map((svc) => (
                  <Pressable
                    key={svc.id}
                    onPress={() => handleAddService(svc)}
                    style={s.modalItem}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.modalItemName}>{svc.name}</Text>
                      <Text style={s.muted}>
                        {svc.category.toUpperCase()} · Per {svc.unit}
                      </Text>
                    </View>
                    <Text style={s.modalItemPrice}>{money(svc.price)}</Text>
                  </Pressable>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL BELI PAKET MEMBER */}
      <Modal
        visible={packageModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPackageModalVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Beli Paket Member</Text>
              <Pressable onPress={() => setPackageModalVisible(false)}>
                <Text style={s.modalClose}>Tutup</Text>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {memberPackages.map((pkg) => (
                <Pressable
                  key={pkg.id}
                  onPress={() => handleAddPackage(pkg)}
                  style={s.modalItem}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalItemName}>{pkg.name}</Text>
                    <Text style={s.muted}>
                      Kuota {pkg.quota_kg} KG ({pkg.package_type})
                    </Text>
                  </View>
                  <Text style={s.modalItemPrice}>{money(pkg.price)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL SUKSES */}
      <Modal
        visible={successModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setSuccessModalVisible(false);
          router.replace("/orders");
        }}
      >
        <View style={s.modalBackdrop}>
          <View style={s.successBox}>
            <View style={s.successIcon}>
              <Check size={30} color={UI.white} strokeWidth={3} />
            </View>
            <Text style={s.successTitle}>PESANAN TERSIMPAN</Text>
            <Text style={s.successSub}>
              No. Order: {savedOrder?.order_number} · Total: {money(savedOrder?.total || 0)}
            </Text>

            <View style={{ width: "100%", gap: 10 }}>
              <Pressable
                onPress={async () => {
                  if (!savedOrder) return;
                  try {
                    await InvoiceService.send(savedOrder);
                  } catch (err: any) {
                    Alert.alert("Gagal kirim WA", err?.message || "Periksa nomor WA.");
                  }
                }}
                style={[s.successBtn, { backgroundColor: "#25D366" }]}
              >
                <Send size={16} color={UI.white} />
                <Text style={s.successBtnText}>KIRIM INVOICE WA</Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  if (!savedOrder) return;
                  try {
                    await PrintService.printReceipt(savedOrder);
                  } catch (err: any) {
                    Alert.alert("Gagal cetak", err?.message || "Printer tidak siap.");
                  }
                }}
                style={[s.successBtn, { backgroundColor: UI.primary }]}
              >
                <Printer size={16} color={UI.white} />
                <Text style={s.successBtnText}>CETAK STRUK</Text>
              </Pressable>

              {createdSubscriptionId && (
                <Pressable
                  onPress={async () => {
                    try {
                      await PrintService.printMemberCard(createdSubscriptionId);
                    } catch (err: any) {
                      Alert.alert("Gagal cetak kartu", err?.message || "Printer tidak siap.");
                    }
                  }}
                  style={[s.successBtn, { backgroundColor: UI.amber }]}
                >
                  <Award size={16} color={UI.white} />
                  <Text style={s.successBtnText}>CETAK KARTU MEMBER</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  setSuccessModalVisible(false);
                  router.replace("/orders");
                }}
                style={[s.successBtn, { backgroundColor: UI.background }]}
              >
                <Text style={[s.successBtnText, { color: UI.text }]}>
                  KE DAFTAR PESANAN
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

const s = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: UI.text,
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  muted: { fontSize: 11, color: UI.muted, marginTop: 2 },
  rowGap: { flexDirection: "row", alignItems: "center", gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: UI.text, marginBottom: 6 },
  divider: { height: 1, backgroundColor: UI.border, marginVertical: 10 },

  memberChoiceBox: {
    backgroundColor: UI.greenLight,
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  memberChoiceTitle: { fontSize: 11, fontWeight: "900", color: UI.green },
  memberChoiceDesc: { fontSize: 10, color: "#166534", marginTop: 4, lineHeight: 14 },
  choiceRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  choiceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
  },
  choiceBtnMemberActive: { backgroundColor: UI.green, borderColor: UI.green },
  choiceBtnServiceActive: { backgroundColor: UI.primary, borderColor: UI.primary },
  choiceBtnText: { fontSize: 11, fontWeight: "900", color: UI.text },

  subOption: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.background,
  },
  subOptionActive: { borderColor: UI.green, backgroundColor: UI.greenLight },
  subOptionTitle: { fontSize: 11, fontWeight: "800", color: UI.text },
  subOptionQuota: { fontSize: 10, fontWeight: "900", color: UI.green, marginTop: 2 },

  quotaSummaryBanner: {
    backgroundColor: UI.greenLight,
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  quotaBannerLabel: { fontSize: 10, fontWeight: "800", color: "#166534" },
  quotaBannerValue: { fontSize: 14, fontWeight: "900", color: UI.green, marginTop: 2 },

  calcQuotaBox: { padding: 10, borderRadius: 6, marginTop: 4 },
  calcQuotaText: { fontSize: 11, fontWeight: "800" },

  emptyCard: {
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 12, fontWeight: "800", color: UI.text, marginTop: 6 },
  addRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  addBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addBtnText: { color: UI.white, fontSize: 12, fontWeight: "900" },

  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  summaryValue: { fontSize: 11, fontWeight: "800", color: UI.text },
  totalLabel: { fontSize: 13, fontWeight: "900", color: UI.text },
  totalValue: { fontSize: 15, fontWeight: "900", color: UI.primary },

  noticeAmber: { backgroundColor: UI.amberLight, padding: 10, borderRadius: 6 },
  noticeAmberText: { fontSize: 11, fontWeight: "700", color: UI.amber },
  segmentedRow: {
    flexDirection: "row",
    backgroundColor: UI.background,
    borderRadius: 6,
    padding: 3,
    gap: 4,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 4 },
  segmentBtnActive: { backgroundColor: UI.primary },
  segmentText: { fontSize: 10, fontWeight: "900", color: UI.muted },
  segmentTextActive: { color: UI.white },
  methodRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  methodBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
  },
  methodBtnActive: { backgroundColor: UI.primaryLight, borderColor: UI.primary },
  methodText: { fontSize: 11, fontWeight: "800", color: UI.muted },
  methodTextActive: { color: UI.primary },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: UI.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 15, fontWeight: "900", color: UI.text },
  modalClose: { fontSize: 12, fontWeight: "800", color: UI.primary },
  filterRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: UI.background,
    borderWidth: 1,
    borderColor: UI.border,
  },
  filterChipActive: { backgroundColor: UI.primary, borderColor: UI.primary },
  filterChipText: { fontSize: 9, fontWeight: "900", color: UI.muted },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  modalItemName: { fontSize: 12, fontWeight: "800", color: UI.text },
  modalItemPrice: { fontSize: 12, fontWeight: "900", color: UI.primary },

  successBox: {
    backgroundColor: UI.white,
    borderRadius: 14,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: "auto",
    alignItems: "center",
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: UI.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successTitle: { fontSize: 15, fontWeight: "900", color: UI.text },
  successSub: { fontSize: 11, color: UI.muted, marginTop: 4, marginBottom: 16 },
  successBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  successBtnText: { fontSize: 11, fontWeight: "900", color: UI.white },
});