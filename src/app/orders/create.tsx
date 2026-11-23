import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Award,
  Check,
  ChevronDown,
  FileText,
  Minus,
  Plus,
  Printer,
  Send,
  Shirt,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  CustomerPicker,
  type CustomerMode,
} from "../../components/CustomerPicker";
import { Button, Field, Page, money } from "../../components/ui";
import { getCustomerById } from "../../repositories/customer.repository";
import { getServices } from "../../repositories/service.repository";
import { InvoiceService } from "../../services/invoice.service";
import { MemberService } from "../../services/member.service";
import {
  createOrder,
  getOrderById,
  updateOrder,
} from "../../services/order.service";
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

const N = {
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

export default function CreateOrder() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  // Data master
  const [services, setServices] = useState<Service[]>([]);
  const [memberPackages, setMemberPackages] = useState<MemberPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sumber data pelanggan
  const [customerMode, setCustomerMode] = useState<CustomerMode>("registered");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const originalCustomerId = useRef<number | null>(null);

  // Langganan aktif milik pelanggan terpilih
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    MemberSubscriptionWithBalance[]
  >([]);

  // Item dalam order
  const [orderItems, setOrderItems] = useState<FormOrderItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");

  // Pembayaran awal
  const [paymentType, setPaymentType] = useState<"paid" | "partial" | "unpaid">(
    "paid",
  );
  const [paidInput, setPaidInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  // Modal tambah item
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [packageModalVisible, setPackageModalVisible] = useState(false);
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<
    "kiloan" | "satuan" | "karpet" | "all"
  >("kiloan");

  // Dialog sukses simpan
  const [savedOrder, setSavedOrder] = useState<any>(null);
  const [createdSubscriptionId, setCreatedSubscriptionId] = useState<number | null>(
    null,
  );
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // Muat data layanan & paket member
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadMasterData = async () => {
        try {
          setLoading(true);
          const [svcList, pkgList] = await Promise.all([
            getServices(true),
            MemberService.getMemberPackages(),
          ]);
          if (active) {
            setServices(svcList);
            setMemberPackages(pkgList);
          }
        } catch (error: any) {
          Alert.alert("Gagal memuat data", error?.message || "Terjadi kesalahan.");
        } finally {
          if (active) setLoading(false);
        }
      };
      loadMasterData();
      return () => {
        active = false;
      };
    }, []),
  );

  // Muat langganan aktif saat pelanggan berubah
  useEffect(() => {
    let active = true;
    const loadSubscriptions = async () => {
      if (customerMode === "registered" && selectedCustomer?.id) {
        try {
          const subs = await MemberService.getCustomerActiveSubscriptions(
            selectedCustomer.id,
          );
          if (active) setActiveSubscriptions(subs);
        } catch (e) {
          console.warn("Gagal memuat langganan customer:", e);
        }
      } else {
        if (active) setActiveSubscriptions([]);
      }
    };
    loadSubscriptions();
    return () => {
      active = false;
    };
  }, [customerMode, selectedCustomer]);

  // Mode Edit
  useEffect(() => {
    let active = true;
    if (!id) return;

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

        // Muat item pesanan
        const mappedItems: FormOrderItem[] = order.items.map((it, idx) => ({
          tempId: `edit_${idx}_${it.id}`,
          item_type: it.item_type || "service",
          service_id: it.service_id,
          package_id: it.package_id,
          name: it.service_name,
          unit: it.unit,
          price: it.price,
          quantity: it.quantity,
          use_subscription_id: it.paid_by_subscription_id,
          notes: it.notes ?? undefined,
        }));

        setOrderItems(mappedItems);
        setDiscount(String(order.discount || 0));
        setNotes(order.notes || "");
      } catch (error: any) {
        Alert.alert(
          "Gagal memuat pesanan",
          error?.message || "Pesanan tidak dapat dimuat.",
        );
      }
    };

    loadOrder();
    return () => {
      active = false;
    };
  }, [id]);

  // HITUNG-HITUNGAN
  const calculations = useMemo(() => {
    let subtotal = 0;
    let memberDiscount = 0;

    // Perhitungan penggunaan kuota per subscription
    const quotaUsed: Record<number, number> = {};

    for (const item of orderItems) {
      const lineSubtotal = Math.round(item.quantity * item.price);
      subtotal += lineSubtotal;

      if (item.use_subscription_id) {
        const sub = activeSubscriptions.find(
          (s) => s.id === item.use_subscription_id,
        );
        if (sub) {
          const used = quotaUsed[sub.id] || 0;
          const available = Math.max(0, sub.remaining_kg - used);
          const coveredKg = Math.min(item.quantity, available);
          const coveredDiscount = Math.round(coveredKg * item.price);
          memberDiscount += coveredDiscount;
          quotaUsed[sub.id] = used + coveredKg;
        }
      }
    }

    const manualDiscount = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal - memberDiscount - manualDiscount);

    return {
      subtotal,
      memberDiscount,
      manualDiscount,
      total,
    };
  }, [orderItems, activeSubscriptions, discount]);

  // Sinkronkan nominal bayar saat paymentType / total berubah
  useEffect(() => {
    if (paymentType === "paid") {
      setPaidInput(String(calculations.total));
    } else if (paymentType === "unpaid") {
      setPaidInput("0");
    }
  }, [paymentType, calculations.total]);

  // Tambah Layanan
  const handleAddService = (svc: Service) => {
    // Cek apakah ada langganan aktif yang cocok dengan package_type layanan kiloan
    let matchingSubId: number | null = null;
    if (svc.category === "kiloan" && svc.package_type) {
      const matchingSub = activeSubscriptions.find(
        (s) => s.package_type === svc.package_type && s.remaining_kg > 0,
      );
      if (matchingSub) {
        matchingSubId = matchingSub.id;
      }
    }

    const newItem: FormOrderItem = {
      tempId: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      item_type: "service",
      service_id: svc.id,
      name: svc.name,
      category: svc.category,
      package_type: svc.package_type,
      unit: svc.unit,
      price: svc.price,
      quantity: svc.unit === "kg" ? 1 : 1,
      use_subscription_id: matchingSubId,
    };

    setOrderItems((prev) => [...prev, newItem]);
    setServiceModalVisible(false);
  };

  // Tambah Paket Member
  const handleAddPackage = (pkg: MemberPackage) => {
    const newItem: FormOrderItem = {
      tempId: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      item_type: "package",
      package_id: pkg.id,
      name: `[Paket Member] ${pkg.name}`,
      unit: "paket",
      price: pkg.price,
      quantity: 1,
    };

    setOrderItems((prev) => [...prev, newItem]);
    setPackageModalVisible(false);
  };

  // Hapus item
  const handleRemoveItem = (tempId: string) => {
    setOrderItems((prev) => prev.filter((it) => it.tempId !== tempId));
  };

  // Ubah kuantitas item
  const handleQuantityChange = (tempId: string, delta: number) => {
    setOrderItems((prev) =>
      prev.map((it) => {
        if (it.tempId === tempId) {
          const newQty = Math.max(
            0.1,
            Math.round((it.quantity + delta) * 10) / 10,
          );
          return { ...it, quantity: newQty };
        }
        return it;
      }),
    );
  };

  // Toggle pemakaian kuota pada item
  const handleToggleQuota = (tempId: string, subId: number) => {
    setOrderItems((prev) =>
      prev.map((it) => {
        if (it.tempId === tempId) {
          const current = it.use_subscription_id;
          return {
            ...it,
            use_subscription_id: current === subId ? null : subId,
          };
        }
        return it;
      }),
    );
  };

  // Validasi pelanggan
  const trimmedName = normalizeName(manualName);
  const trimmedPhone = normalizePhone(manualPhone);

  const nameError =
    customerMode === "manual" && !trimmedName
      ? "Nama pelanggan wajib diisi."
      : null;

  const phoneError =
    customerMode === "manual" && trimmedPhone && !isValidPhone(trimmedPhone)
      ? "Nomor WhatsApp tidak valid (8–15 digit)."
      : null;

  const customerValid =
    customerMode === "registered"
      ? !!selectedCustomer
      : !nameError &&
        !phoneError &&
        trimmedName.length <= MAX_CUSTOMER_NAME_LENGTH;

  // SIMPAN ORDER
  const handleSave = async () => {
    if (!customerValid) {
      setShowErrors(true);
      Alert.alert(
        "Data belum valid",
        customerMode === "manual"
          ? "Isi nama pelanggan (dan nomor WhatsApp yang valid bila diisi)."
          : "Pilih salah satu pelanggan terdaftar.",
      );
      return;
    }

    if (orderItems.length === 0) {
      Alert.alert(
        "Item order kosong",
        "Tambahkan minimal satu layanan atau paket member ke dalam order.",
      );
      return;
    }

    const parsedPaid = Number(paidInput) || 0;
    if (parsedPaid < 0 || parsedPaid > calculations.total) {
      Alert.alert(
        "Pembayaran tidak valid",
        "Nominal pembayaran tidak boleh negatif atau melebihi total pesanan.",
      );
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

      const itemsInput = orderItems.map((it) => ({
        item_type: it.item_type,
        service_id: it.service_id ?? null,
        package_id: it.package_id ?? null,
        quantity: it.quantity,
        use_subscription_id: it.use_subscription_id ?? null,
        notes: it.notes ?? null,
      }));

      const initialPayment =
        parsedPaid > 0
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
          {
            text: "OK",
            onPress: () => router.replace("/orders"),
          },
        ]);
        return;
      }

      // Buat order baru dengan atomic transaction
      const created = await createOrder({
        ...customerInput,
        items: itemsInput,
        discount: calculations.manualDiscount,
        notes: notes.trim(),
        initial_payment: initialPayment,
      });

      // Ambil detail lengkap order untuk aksi struk & invoice WA
      const fullOrder = await getOrderById(created.id);
      setSavedOrder(fullOrder);
      setCreatedSubscriptionId(created.created_subscription_id ?? null);
      setSuccessModalVisible(true);
    } catch (err: any) {
      Alert.alert(
        "Gagal menyimpan order",
        err?.message || "Terjadi kesalahan saat memproses pesanan.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Page title="Pesanan" subtitle="Menyiapkan formulir...">
        <View style={s.card}>
          <Text style={s.loadingTitle}>MEMUAT DATA...</Text>
          <Text style={s.muted}>Mengambil data layanan dan price list.</Text>
        </View>
      </Page>
    );
  }

  return (
    <Page
      title={editing ? "Edit Pesanan" : "Buat Pesanan"}
      subtitle="Alur order, paket member & pembayaran Laundrify v2"
    >
      {/* 1. PELANGGAN */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>1. PELANGGAN</Text>
        <Text style={s.sectionSubtitle}>
          Pilih pelanggan atau masukkan pelanggan baru (otomatis tersimpan ke
          buku pelanggan).
        </Text>
      </View>

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

      {/* BANNER PAKET LANGGANAN AKTIF JIKA ADA */}
      {activeSubscriptions.length > 0 && (
        <View style={s.subBanner}>
          <View style={s.subBannerHeader}>
            <Award size={18} color={N.green} />
            <Text style={s.subBannerTitle}>
              LANGGANAN MEMBER AKTIF TERSEDIA
            </Text>
          </View>
          <Text style={s.subBannerDesc}>
            Pelanggan memiliki kuota aktif. Kuota akan otomatis memotong item
            layanan kiloan yang cocok:
          </Text>
          {activeSubscriptions.map((sub) => (
            <View key={sub.id} style={s.subBadge}>
              <Text style={s.subBadgeTitle}>
                {sub.package_name || sub.package_type} (#{sub.member_no})
              </Text>
              <Text style={s.subBadgeQuota}>
                Sisa Kuota: {sub.remaining_kg} KG / {sub.quota_kg} KG
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 2. ITEM PESANAN */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>2. ITEM LAYANAN & PAKET</Text>
        <Text style={s.sectionSubtitle}>
          Bisa memasukkan lebih dari satu layanan atau membeli paket member baru.
        </Text>
      </View>

      {orderItems.length === 0 ? (
        <View style={s.emptyItemCard}>
          <Shirt size={28} color={N.muted} />
          <Text style={s.emptyItemTitle}>Belum ada layanan dipilih</Text>
          <Text style={s.emptyItemSubtitle}>
            Tekan tombol di bawah untuk menambah layanan kiloan/satuan atau paket
            member.
          </Text>
        </View>
      ) : (
        <View style={s.itemList}>
          {orderItems.map((item, idx) => {
            const isPackage = item.item_type === "package";
            const matchingSub = activeSubscriptions.find(
              (s) =>
                item.category === "kiloan" &&
                item.package_type &&
                s.package_type === item.package_type &&
                s.remaining_kg > 0,
            );

            const isUsingQuota = !!item.use_subscription_id;

            return (
              <View key={item.tempId} style={s.itemCard}>
                <View style={s.itemTopRow}>
                  <View style={{ flex: 1 }}>
                    <View style={s.itemBadgeRow}>
                      <Text
                        style={[
                          s.itemTypeBadge,
                          isPackage
                            ? { backgroundColor: N.amberLight, color: N.amber }
                            : { backgroundColor: N.primaryLight, color: N.primary },
                        ]}
                      >
                        {isPackage ? "PAKET MEMBER" : item.unit.toUpperCase()}
                      </Text>
                      {isUsingQuota && (
                        <Text style={s.quotaBadge}>POTONG KUOTA MEMBER</Text>
                      )}
                    </View>
                    <Text style={s.itemName}>{item.name}</Text>
                    <Text style={s.itemPricePerUnit}>
                      {money(item.price)} / {item.unit}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handleRemoveItem(item.tempId)}
                    style={s.deleteBtn}
                  >
                    <Trash2 size={16} color={N.red} />
                  </Pressable>
                </View>

                {/* Kontrol kuantitas jika bukan paket member */}
                {!isPackage && (
                  <View style={s.quantityRow}>
                    <Text style={s.quantityLabel}>Jumlah ({item.unit}):</Text>

                    <View style={s.stepper}>
                      <Pressable
                        onPress={() => handleQuantityChange(item.tempId, -1)}
                        style={s.stepperBtn}
                      >
                        <Minus size={14} color={N.text} />
                      </Pressable>

                      <TextInput
                        value={String(item.quantity)}
                        onChangeText={(txt) => {
                          const val = Number(txt) || 0;
                          setOrderItems((prev) =>
                            prev.map((it) =>
                              it.tempId === item.tempId
                                ? { ...it, quantity: val }
                                : it,
                            ),
                          );
                        }}
                        keyboardType="decimal-pad"
                        style={s.stepperInput}
                      />

                      <Pressable
                        onPress={() => handleQuantityChange(item.tempId, 1)}
                        style={s.stepperBtn}
                      >
                        <Plus size={14} color={N.text} />
                      </Pressable>
                    </View>

                    <Text style={s.lineSubtotal}>
                      {money(Math.round(item.quantity * item.price))}
                    </Text>
                  </View>
                )}

                {/* Opsi kuota member kiloan */}
                {matchingSub && (
                  <Pressable
                    onPress={() =>
                      handleToggleQuota(item.tempId, matchingSub.id)
                    }
                    style={[
                      s.quotaToggle,
                      isUsingQuota && s.quotaToggleActive,
                    ]}
                  >
                    <View
                      style={[
                        s.quotaCheckbox,
                        isUsingQuota && s.quotaCheckboxActive,
                      ]}
                    >
                      {isUsingQuota && <Check size={12} color={N.white} />}
                    </View>
                    <Text style={s.quotaToggleText}>
                      Gunakan kuota langganan {matchingSub.package_type} (Sisa:{" "}
                      {matchingSub.remaining_kg} kg)
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Tombol Aksi Tambah Item */}
      <View style={s.addItemButtonRow}>
        <Pressable
          onPress={() => setServiceModalVisible(true)}
          style={[s.addItemBtn, { backgroundColor: N.primary }]}
        >
          <Plus size={16} color={N.white} />
          <Text style={s.addItemBtnText}>+ Layanan</Text>
        </Pressable>

        <Pressable
          onPress={() => setPackageModalVisible(true)}
          style={[s.addItemBtn, { backgroundColor: N.amber }]}
        >
          <Award size={16} color={N.white} />
          <Text style={s.addItemBtnText}>+ Paket Member</Text>
        </Pressable>
      </View>

      {/* 3. DISKON & CATATAN */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>3. DISKON & CATATAN</Text>
      </View>

      <View style={s.card}>
        <Field
          label="Diskon Manual (Rupiah)"
          value={discount}
          onChangeText={setDiscount}
          keyboardType="numeric"
          placeholder="0"
        />

        <Field
          label="Catatan Pesanan"
          value={notes}
          onChangeText={setNotes}
          placeholder="Contoh: Pisahkan pakaian putih, wangi lavender..."
          multiline
        />
      </View>

      {/* 4. RINGKASAN HARGA */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>4. RINGKASAN PEMBAYARAN</Text>
      </View>

      <View style={s.summaryCard}>
        <View style={s.summaryRow}>
          <Text style={s.summaryLabel}>Subtotal Item:</Text>
          <Text style={s.summaryValue}>{money(calculations.subtotal)}</Text>
        </View>

        {calculations.memberDiscount > 0 && (
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: N.green }]}>
              Diskon Kuota Member:
            </Text>
            <Text style={[s.summaryValue, { color: N.green }]}>
              - {money(calculations.memberDiscount)}
            </Text>
          </View>
        )}

        {calculations.manualDiscount > 0 && (
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: N.red }]}>Diskon Manual:</Text>
            <Text style={[s.summaryValue, { color: N.red }]}>
              - {money(calculations.manualDiscount)}
            </Text>
          </View>
        )}

        <View style={s.summaryDivider} />

        <View style={s.summaryRow}>
          <Text style={s.totalLabel}>TOTAL TAGIHAN:</Text>
          <Text style={s.totalValue}>{money(calculations.total)}</Text>
        </View>
      </View>

      {/* 5. PEMBAYARAN AWAL */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>5. PEMBAYARAN SAAT INI</Text>
        <Text style={s.sectionSubtitle}>
          Pilih status pelunasan dan metode pembayaran.
        </Text>
      </View>

      <View style={s.card}>
        <View style={s.segmentedRow}>
          <Pressable
            onPress={() => setPaymentType("paid")}
            style={[
              s.segmentBtn,
              paymentType === "paid" && s.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                s.segmentText,
                paymentType === "paid" && s.segmentTextActive,
              ]}
            >
              LUNAS
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setPaymentType("partial")}
            style={[
              s.segmentBtn,
              paymentType === "partial" && s.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                s.segmentText,
                paymentType === "partial" && s.segmentTextActive,
              ]}
            >
              SEBAGIAN (DP)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setPaymentType("unpaid")}
            style={[
              s.segmentBtn,
              paymentType === "unpaid" && s.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                s.segmentText,
                paymentType === "unpaid" && s.segmentTextActive,
              ]}
            >
              BELUM BAYAR
            </Text>
          </Pressable>
        </View>

        {paymentType !== "unpaid" && (
          <View style={{ marginTop: 12 }}>
            <Field
              label="Nominal Dibayar (Rp)"
              value={paidInput}
              onChangeText={setPaidInput}
              keyboardType="numeric"
              placeholder="0"
            />

            <Text style={s.fieldLabel}>Metode Pembayaran:</Text>
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
          </View>
        )}
      </View>

      {/* TOMBOL SIMPAN */}
      <View style={{ marginTop: 16 }}>
        <Button
          title={
            saving
              ? "Menyimpan Transaksi..."
              : editing
                ? "Simpan Perubahan"
                : "SELESAIKAN ORDER"
          }
          onPress={handleSave}
          loading={saving}
          disabled={saving}
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

            {/* Filter Kategori */}
            <View style={s.catFilterRow}>
              {(["kiloan", "satuan", "karpet", "all"] as const).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setServiceCategoryFilter(cat)}
                  style={[
                    s.catFilterBtn,
                    serviceCategoryFilter === cat && s.catFilterBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      s.catFilterText,
                      serviceCategoryFilter === cat && s.catFilterTextActive,
                    ]}
                  >
                    {cat.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {services
                .filter(
                  (s) =>
                    serviceCategoryFilter === "all" ||
                    s.category === serviceCategoryFilter,
                )
                .map((svc) => (
                  <Pressable
                    key={svc.id}
                    onPress={() => handleAddService(svc)}
                    style={s.modalItem}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.modalItemName}>{svc.name}</Text>
                      <Text style={s.modalItemDetail}>
                        {svc.category.toUpperCase()}{" "}
                        {svc.package_type ? `(${svc.package_type})` : ""} · Per{" "}
                        {svc.unit}
                      </Text>
                    </View>
                    <Text style={s.modalItemPrice}>{money(svc.price)}</Text>
                  </Pressable>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL PILIH PAKET MEMBER */}
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
            <Text style={s.modalSubtitle}>
              Paket member akan dibuat dan kuota aktif saat order disimpan.
            </Text>

            <ScrollView style={{ maxHeight: 420 }}>
              {memberPackages.map((pkg) => (
                <Pressable
                  key={pkg.id}
                  onPress={() => handleAddPackage(pkg)}
                  style={s.modalItem}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalItemName}>{pkg.name}</Text>
                    <Text style={s.modalItemDetail}>
                      Kuota: {pkg.quota_kg} KG ({pkg.package_type}) · Bebas Antar
                      Jemput
                    </Text>
                  </View>
                  <Text style={s.modalItemPrice}>{money(pkg.price)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL SUKSES ORDER (INVOICE WA, CETAK STRUK, CETAK KARTU MEMBER) */}
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
            <View style={s.successIconCircle}>
              <Check size={32} color={N.white} strokeWidth={3} />
            </View>

            <Text style={s.successTitle}>ORDER BERHASIL DISIMPAN!</Text>
            <Text style={s.successSubtitle}>
              Nomor Pesanan: {savedOrder?.order_number}
              {"\n"}Total: {money(savedOrder?.total || 0)}
            </Text>

            <View style={s.successActionGroup}>
              {/* KIRIM WA */}
              <Pressable
                onPress={async () => {
                  if (savedOrder) {
                    try {
                      await InvoiceService.send(savedOrder);
                    } catch (e: any) {
                      Alert.alert(
                        "Gagal kirim WhatsApp",
                        e?.message || "Periksa nomor pelanggan.",
                      );
                    }
                  }
                }}
                style={[s.successBtn, { backgroundColor: "#25D366" }]}
              >
                <Send size={18} color={N.white} />
                <Text style={s.successBtnText}>KIRIM INVOICE WA</Text>
              </Pressable>

              {/* CETAK STRUK */}
              <Pressable
                onPress={async () => {
                  if (savedOrder) {
                    try {
                      await PrintService.printReceipt(savedOrder);
                    } catch (e: any) {
                      Alert.alert(
                        "Gagal cetak",
                        e?.message || "Printer tidak siap.",
                      );
                    }
                  }
                }}
                style={[s.successBtn, { backgroundColor: N.primary }]}
              >
                <Printer size={18} color={N.white} />
                <Text style={s.successBtnText}>CETAK STRUK</Text>
              </Pressable>

              {/* CETAK KARTU MEMBER JIKA BELI PAKET */}
              {createdSubscriptionId ? (
                <Pressable
                  onPress={async () => {
                    try {
                      await PrintService.printMemberCard(createdSubscriptionId);
                    } catch (e: any) {
                      Alert.alert(
                        "Gagal cetak kartu member",
                        e?.message || "Printer tidak siap.",
                      );
                    }
                  }}
                  style={[s.successBtn, { backgroundColor: N.amber }]}
                >
                  <Award size={18} color={N.white} />
                  <Text style={s.successBtnText}>CETAK KARTU MEMBER</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => {
                  setSuccessModalVisible(false);
                  router.replace("/orders");
                }}
                style={[s.successBtn, { backgroundColor: N.background }]}
              >
                <Text style={[s.successBtnText, { color: N.text }]}>
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
  sectionHeader: {
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: N.text,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: N.muted,
    marginTop: 2,
    lineHeight: 14,
  },
  card: {
    backgroundColor: N.white,
    borderWidth: 1,
    borderColor: N.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  loadingTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: N.text,
    marginBottom: 4,
  },
  muted: {
    fontSize: 11,
    color: N.muted,
  },

  // Langganan Aktif Banner
  subBanner: {
    backgroundColor: N.greenLight,
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  subBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  subBannerTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: N.green,
  },
  subBannerDesc: {
    fontSize: 10,
    color: "#166534",
    marginBottom: 8,
    lineHeight: 14,
  },
  subBadge: {
    backgroundColor: N.white,
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  subBadgeTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: N.text,
  },
  subBadgeQuota: {
    fontSize: 10,
    fontWeight: "900",
    color: N.green,
    marginTop: 2,
  },

  // Items
  emptyItemCard: {
    backgroundColor: N.white,
    borderWidth: 1,
    borderColor: N.border,
    borderRadius: 8,
    padding: 24,
    alignItems: "center",
    marginBottom: 12,
  },
  emptyItemTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: N.text,
    marginTop: 8,
  },
  emptyItemSubtitle: {
    fontSize: 10,
    color: N.muted,
    textAlign: "center",
    marginTop: 4,
  },
  itemList: {
    gap: 10,
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: N.white,
    borderWidth: 1,
    borderColor: N.border,
    borderRadius: 8,
    padding: 12,
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  itemBadgeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  itemTypeBadge: {
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  quotaBadge: {
    fontSize: 9,
    fontWeight: "900",
    backgroundColor: N.greenLight,
    color: N.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "800",
    color: N.text,
  },
  itemPricePerUnit: {
    fontSize: 10,
    color: N.muted,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: N.border,
  },
  quantityLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: N.text,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: N.border,
    borderRadius: 6,
    backgroundColor: N.background,
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepperInput: {
    width: 44,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
    color: N.text,
    padding: 0,
  },
  lineSubtotal: {
    fontSize: 13,
    fontWeight: "900",
    color: N.text,
  },

  quotaToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    padding: 8,
    backgroundColor: N.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: N.border,
  },
  quotaToggleActive: {
    backgroundColor: N.greenLight,
    borderColor: "#86EFAC",
  },
  quotaCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: N.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  quotaCheckboxActive: {
    backgroundColor: N.green,
    borderColor: N.green,
  },
  quotaToggleText: {
    fontSize: 10,
    fontWeight: "700",
    color: N.text,
    flex: 1,
  },

  addItemButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  addItemBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addItemBtnText: {
    color: N.white,
    fontSize: 12,
    fontWeight: "900",
  },

  // Ringkasan
  summaryCard: {
    backgroundColor: N.white,
    borderWidth: 1,
    borderColor: N.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 11,
    color: N.muted,
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: "800",
    color: N.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: N.border,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: N.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "900",
    color: N.primary,
  },

  // Pembayaran
  segmentedRow: {
    flexDirection: "row",
    backgroundColor: N.background,
    borderRadius: 6,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 4,
  },
  segmentBtnActive: {
    backgroundColor: N.primary,
  },
  segmentText: {
    fontSize: 10,
    fontWeight: "900",
    color: N.muted,
  },
  segmentTextActive: {
    color: N.white,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: N.text,
    marginBottom: 6,
  },
  methodRow: {
    flexDirection: "row",
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: N.border,
    backgroundColor: N.background,
    alignItems: "center",
  },
  methodBtnActive: {
    backgroundColor: N.primaryLight,
    borderColor: N.primary,
  },
  methodText: {
    fontSize: 11,
    fontWeight: "800",
    color: N.muted,
  },
  methodTextActive: {
    color: N.primary,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: N.white,
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
  modalTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: N.text,
  },
  modalSubtitle: {
    fontSize: 11,
    color: N.muted,
    marginBottom: 12,
  },
  modalClose: {
    fontSize: 12,
    fontWeight: "800",
    color: N.primary,
  },
  catFilterRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  catFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: N.background,
    borderWidth: 1,
    borderColor: N.border,
  },
  catFilterBtnActive: {
    backgroundColor: N.primary,
    borderColor: N.primary,
  },
  catFilterText: {
    fontSize: 9,
    fontWeight: "900",
    color: N.muted,
  },
  catFilterTextActive: {
    color: N.white,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: N.border,
  },
  modalItemName: {
    fontSize: 12,
    fontWeight: "800",
    color: N.text,
  },
  modalItemDetail: {
    fontSize: 10,
    color: N.muted,
    marginTop: 2,
  },
  modalItemPrice: {
    fontSize: 12,
    fontWeight: "900",
    color: N.primary,
  },

  // Sukses Modal
  successBox: {
    backgroundColor: N.white,
    borderRadius: 14,
    padding: 22,
    marginHorizontal: 20,
    marginVertical: "auto",
    alignItems: "center",
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: N.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: N.text,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 12,
    color: N.muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 18,
  },
  successActionGroup: {
    width: "100%",
    gap: 10,
  },
  successBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 8,
  },
  successBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: N.white,
  },
});
