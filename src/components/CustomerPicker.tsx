import { router, useFocusEffect } from "expo-router";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  PencilLine,
  UsersRound,
  X,
} from "lucide-react-native";
import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  searchCustomers,
  type CustomerPage,
} from "../repositories/customer.repository";
import type { Customer } from "../types/database";
import {
  MAX_CUSTOMER_NAME_LENGTH,
  sanitizePhoneInput,
} from "../utils/phone";
import { Button, Field, SearchBox } from "./ui";

export type CustomerMode = "registered" | "manual";

const PAGE_SIZE = 5;
const SEARCH_DEBOUNCE_MS = 300;

const N = {
  white: "#FFFFFF",
  background: "#EEF1F5",
  text: "#263244",
  muted: "#8490A3",
  border: "#D8DEE8",
  primary: "#3159C9",
  primaryLight: "#E7EDFF",
  red: "#D34B55",
};

// ==========================================
// HOOK: DEBOUNCE
// ==========================================

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ==========================================
// BARIS PELANGGAN (memo: tidak render ulang
// kecuali data / status pilihannya berubah)
// ==========================================

const CustomerRow = memo(function CustomerRow({
  customer,
  selected,
  onPress,
}: {
  customer: Customer;
  selected: boolean;
  onPress: (customer: Customer) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(customer)}
      style={[s.row, selected && s.rowActive]}
    >
      <View style={[s.avatar, selected && { backgroundColor: N.primary }]}>
        <Text style={[s.avatarText, selected && { color: N.white }]}>
          {customer.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={s.name} numberOfLines={1}>
          {customer.name}
        </Text>
        <Text style={s.phone} numberOfLines={1}>
          {customer.phone || "Tanpa nomor telepon"}
        </Text>
      </View>

      <View style={[s.checkBox, selected && s.checkBoxActive]}>
        {selected && <Check color={N.white} size={15} strokeWidth={3} />}
      </View>
    </Pressable>
  );
});

// ==========================================
// KOMPONEN UTAMA
// ==========================================

interface CustomerPickerProps {
  mode: CustomerMode;
  onModeChange: (mode: CustomerMode) => void;

  selected: Customer | null;
  onSelect: (customer: Customer | null) => void;

  name: string;
  phone: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;

  /** Tampilkan pesan error validasi (setelah user menekan simpan). */
  showErrors?: boolean;
  nameError?: string | null;
  phoneError?: string | null;
}

export function CustomerPicker({
  mode,
  onModeChange,
  selected,
  onSelect,
  name,
  phone,
  onNameChange,
  onPhoneChange,
  showErrors = false,
  nameError,
  phoneError,
}: CustomerPickerProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<CustomerPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const requestId = useRef(0);

  // Hanya data 1 halaman (5 pelanggan) yang diambil dari SQLite.
  // requestId mencegah respons lama menimpa respons yang lebih baru.
  const load = useCallback(async () => {
    if (mode !== "registered") return;

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const result = await searchCustomers({
        search: debouncedQuery,
        page,
        pageSize: PAGE_SIZE,
      });

      if (id !== requestId.current) return;

      setData(result);
      if (result.page !== page) setPage(result.page);
    } catch (e: any) {
      if (id === requestId.current) {
        setError(e?.message || "Gagal memuat pelanggan.");
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [mode, debouncedQuery, page]);

  // Jalan saat layar fokus (mis. kembali dari "Tambah pelanggan")
  // dan setiap kata kunci / halaman berubah.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setPage(0);
  }, []);

  const handlePrev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);

  const handleNext = useCallback(
    () => setPage((p) => p + 1),
    [],
  );

  const handleUseAsManual = useCallback(() => {
    onNameChange(query.trim().slice(0, MAX_CUSTOMER_NAME_LENGTH));
    onModeChange("manual");
  }, [query, onNameChange, onModeChange]);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? 0;
  const from = total === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const to = Math.min(total, (currentPage + 1) * PAGE_SIZE);
  const searching = debouncedQuery.trim().length > 0;

  return (
    <View>
      {/* PILIHAN SUMBER DATA */}
      <View style={s.segment}>
        <Pressable
          onPress={() => onModeChange("registered")}
          style={[s.segmentItem, mode === "registered" && s.segmentActive]}
        >
          <UsersRound
            size={16}
            color={mode === "registered" ? N.white : N.muted}
          />
          <Text
            style={[
              s.segmentText,
              mode === "registered" && s.segmentTextActive,
            ]}
          >
            DARI PELANGGAN
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onModeChange("manual")}
          style={[s.segmentItem, mode === "manual" && s.segmentActive]}
        >
          <PencilLine
            size={16}
            color={mode === "manual" ? N.white : N.muted}
          />
          <Text
            style={[s.segmentText, mode === "manual" && s.segmentTextActive]}
          >
            ISI MANUAL
          </Text>
        </Pressable>
      </View>

      {mode === "manual" ? (
        /* ===== FORM MANUAL ===== */
        <View style={s.card}>
          <Field
            label="Nama customer"
            value={name}
            onChangeText={onNameChange}
            placeholder="Contoh: Budi Santoso"
            autoCapitalize="words"
            maxLength={MAX_CUSTOMER_NAME_LENGTH}
          />
          {showErrors && nameError ? (
            <Text style={s.error}>{nameError}</Text>
          ) : null}

          <Field
            label="Nomor WhatsApp"
            value={phone}
            onChangeText={(value) => onPhoneChange(sanitizePhoneInput(value))}
            placeholder="Contoh: 081234567890"
            keyboardType="phone-pad"
            maxLength={20}
          />
          {showErrors && phoneError ? (
            <Text style={s.error}>{phoneError}</Text>
          ) : (
            <Text style={s.helper}>
              Opsional. Dipakai untuk kirim notifikasi status lewat WhatsApp.
              Data ini hanya tersimpan di pesanan, tidak masuk daftar
              pelanggan.
            </Text>
          )}
        </View>
      ) : (
        /* ===== PILIH DARI PELANGGAN ===== */
        <View style={s.card}>
          {selected && (
            <View style={s.selectedBanner}>
              <Check size={16} color={N.primary} strokeWidth={3} />
              <View style={{ flex: 1 }}>
                <Text style={s.selectedName} numberOfLines={1}>
                  {selected.name}
                </Text>
                <Text style={s.selectedPhone} numberOfLines={1}>
                  {selected.phone || "Tanpa nomor telepon"}
                </Text>
              </View>
              <Pressable
                onPress={() => onSelect(null)}
                hitSlop={10}
                accessibilityLabel="Batalkan pilihan pelanggan"
              >
                <X size={18} color={N.primary} />
              </Pressable>
            </View>
          )}

          <SearchBox
            value={query}
            onChangeText={handleSearch}
            placeholder="Cari nama atau nomor telepon..."
          />

          {error ? (
            <View style={s.stateBox}>
              <Text style={s.stateTitle}>Gagal memuat pelanggan</Text>
              <Text style={s.muted}>{error}</Text>
              <View style={{ marginTop: 10 }}>
                <Button title="Coba lagi" secondary onPress={load} />
              </View>
            </View>
          ) : !data ? (
            <View style={s.stateBox}>
              <ActivityIndicator color={N.primary} />
            </View>
          ) : total === 0 ? (
            <View style={s.stateBox}>
              <Text style={s.stateTitle}>
                {searching
                  ? "Pelanggan tidak ditemukan"
                  : "Belum ada pelanggan"}
              </Text>
              <Text style={s.muted}>
                {searching
                  ? "Coba kata kunci lain, atau isi data pelanggan secara manual."
                  : "Tambahkan pelanggan, atau isi data langsung lewat mode Isi Manual."}
              </Text>
              <View style={{ marginTop: 10 }}>
                {searching ? (
                  <Button
                    title="Isi manual dengan nama ini"
                    secondary
                    onPress={handleUseAsManual}
                  />
                ) : (
                  <Button
                    title="Tambah pelanggan"
                    onPress={() => router.push("/customers/form")}
                  />
                )}
              </View>
            </View>
          ) : (
            <>
              <View style={[s.list, loading && { opacity: 0.6 }]}>
                {rows.map((customer) => (
                  <CustomerRow
                    key={customer.id}
                    customer={customer}
                    selected={selected?.id === customer.id}
                    onPress={onSelect}
                  />
                ))}
              </View>

              {/* PAGINATION */}
              <View style={s.pager}>
                <Pressable
                  onPress={handlePrev}
                  disabled={currentPage <= 0 || loading}
                  style={[
                    s.pagerButton,
                    (currentPage <= 0 || loading) && s.pagerDisabled,
                  ]}
                  accessibilityLabel="Halaman sebelumnya"
                >
                  <ChevronLeft size={18} color={N.text} />
                </Pressable>

                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={s.pagerTitle}>
                    {currentPage + 1} / {totalPages}
                  </Text>
                  <Text style={s.pagerInfo}>
                    {from}–{to} dari {total} pelanggan
                  </Text>
                </View>

                <Pressable
                  onPress={handleNext}
                  disabled={currentPage >= totalPages - 1 || loading}
                  style={[
                    s.pagerButton,
                    (currentPage >= totalPages - 1 || loading) &&
                      s.pagerDisabled,
                  ]}
                  accessibilityLabel="Halaman berikutnya"
                >
                  <ChevronRight size={18} color={N.text} />
                </Pressable>
              </View>
            </>
          )}

          {showErrors && !selected ? (
            <Text style={[s.error, { marginTop: 10 }]}>
              Pilih salah satu pelanggan atau gunakan mode Isi Manual.
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  segment: {
    flexDirection: "row",
    backgroundColor: N.background,
    borderWidth: 1,
    borderColor: N.border,
    borderRadius: 6,
    padding: 3,
    gap: 3,
    marginBottom: 12,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 4,
  },
  segmentActive: {
    backgroundColor: N.primary,
  },
  segmentText: {
    color: N.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  segmentTextActive: {
    color: N.white,
  },

  card: {
    backgroundColor: N.white,
    borderWidth: 1,
    borderColor: N.border,
    borderRadius: 5,
    padding: 15,
    marginBottom: 21,
  },

  list: {
    gap: 9,
  },
  row: {
    backgroundColor: N.white,
    borderWidth: 1,
    borderColor: N.border,
    borderRadius: 5,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  rowActive: {
    backgroundColor: N.primaryLight,
    borderColor: N.primary,
    borderWidth: 1.5,
  },
  avatar: {
    width: 42,
    height: 42,
    backgroundColor: "#E9EDF4",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: N.text,
    fontSize: 16,
    fontWeight: "900",
  },
  name: {
    color: N.text,
    fontSize: 12,
    fontWeight: "800",
  },
  phone: {
    color: N.muted,
    fontSize: 10,
    marginTop: 4,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: N.border,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxActive: {
    backgroundColor: N.primary,
    borderColor: N.primary,
  },

  selectedBanner: {
    backgroundColor: N.primaryLight,
    borderRadius: 5,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 14,
  },
  selectedName: {
    color: N.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  selectedPhone: {
    color: N.primary,
    fontSize: 10,
    marginTop: 2,
    opacity: 0.8,
  },

  pager: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: N.border,
  },
  pagerButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: N.border,
    borderRadius: 5,
    backgroundColor: N.white,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerDisabled: {
    opacity: 0.35,
  },
  pagerTitle: {
    color: N.text,
    fontSize: 12,
    fontWeight: "900",
  },
  pagerInfo: {
    color: N.muted,
    fontSize: 10,
    marginTop: 3,
  },

  stateBox: {
    backgroundColor: "#FFF8F0",
    borderRadius: 5,
    padding: 15,
    alignItems: "stretch",
  },
  stateTitle: {
    color: N.text,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
  },
  muted: {
    color: N.muted,
    fontSize: 11,
    lineHeight: 18,
  },
  helper: {
    color: N.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: -4,
  },
  error: {
    color: N.red,
    fontSize: 11,
    fontWeight: "700",
    marginTop: -8,
    marginBottom: 12,
  },
});
