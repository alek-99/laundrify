
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { router, useLocalSearchParams } from "expo-router";

import {
  createService,
  getServiceById,
  updateService,
  type ServiceInput,
  type ServiceCategory,
  type PackageType,
} from "../../repositories/service.repository";

import type { ServiceUnit } from "../../types/database";

import ArrowLeft from "lucide-react-native/icons/arrow-left";
import Check from "lucide-react-native/icons/check";
import Shirt from "lucide-react-native/icons/shirt";

const C = {
  bg: "#F5F7FB",
  white: "#FFFFFF",
  primary: "#3157D5",
  light: "#EDF2FF",
  black: "#202938",
  text: "#475467",
  muted: "#98A2B3",
  border: "#E2E8F0",
  green: "#12A36D",
  red: "#E5484D",
};


const categories: {
  value: ServiceCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "kiloan",
    label: "Kiloan",
    description: "Cuci pakaian berdasarkan berat",
  },
  {
    value: "satuan",
    label: "Satuan",
    description: "Cuci barang berdasarkan jumlah",
  },
  {
    value: "karpet",
    label: "Karpet",
    description: "Cuci karpet berdasarkan luas",
  },
];

const packages: {
  value: Exclude<PackageType, null>;
  label: string;
}[] = [
  { value: "CKS", label: "Cuci Kering Setrika" },
  { value: "CKL", label: "Cuci Kering Lipat" },
  { value: "ST", label: "Setrika Only" },
];

const speeds = [
  { label: "5 Jam", hours: 5 },
  { label: "1 Hari", hours: 24 },
  { label: "2 Hari", hours: 48 },
  { label: "3 Hari", hours: 72 },
];

// ======================================================
// COMPONENT
// ======================================================

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          multiline && styles.textarea,
        ]}
      />
    </View>
  );
}

function Option({
  selected,
  label,
  onPress,
  description,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  description?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.option,
        selected && styles.optionSelected,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.optionText,
            selected && { color: C.primary },
          ]}
        >
          {label}
        </Text>

        {description ? (
          <Text style={styles.optionDescription}>
            {description}
          </Text>
        ) : null}
      </View>

      {selected && <Check size={17} color={C.primary} />}
    </Pressable>
  );
}

export default function ServiceForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();

  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const isEdit = Boolean(id);

  // FORM STATE

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [category, setCategory] =
    useState<ServiceCategory>("kiloan");

  const [packageType, setPackageType] =
    useState<PackageType | null>("CKS");

  const [unit, setUnit] = useState<ServiceUnit>("kg");

  const [price, setPrice] = useState("");
  const [hours, setHours] = useState("72");
  const [sortOrder, setSortOrder] = useState("0");

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // ====================================================
  // LOAD EXISTING SERVICE
  // ====================================================

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const service = await getServiceById(Number(id));

        if (!service) {
          Alert.alert("Tidak ditemukan", "Data layanan tidak tersedia.");
          router.back();
          return;
        }

        if (!mounted) return;

        setName(service.name);
        setDescription(service.description ?? "");
        setCategory(service.category);
        setPackageType(service.package_type);
        setUnit(service.unit);
        setPrice(String(service.price));
        setHours(String(service.estimated_hours));
        setSortOrder(String(service.sort_order));
      } catch (error: any) {
        Alert.alert("Gagal", error.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [id]);

  // ====================================================
  // CATEGORY CHANGE
  // ====================================================

  const changeCategory = (value: ServiceCategory) => {
    setCategory(value);

    if (value === "kiloan") {
      setPackageType("CKS");
      setUnit("kg");
      setHours("72");
    } else if (value === "karpet") {
      setPackageType(null);
      setUnit("m2");
      setHours("72");
    } else {
      setPackageType(null);
      setUnit("pcs");
      setHours("72");
    }
  };

  // ====================================================
  // UNIT OPTIONS
  // ====================================================

  const availableUnits: ServiceUnit[] =
    category === "kiloan"
      ? ["kg"]
      : category === "karpet"
        ? ["m2"]
        : ["pcs", "kg", "mtr"];

  // ====================================================
  // VALIDATION
  // ====================================================

  const validate = () => {
    if (!name.trim()) {
      Alert.alert("Validasi", "Nama layanan wajib diisi.");
      return false;
    }

    if (
      price.trim() === "" ||
      !Number.isSafeInteger(Number(price)) ||
      Number(price) < 0
    ) {
      Alert.alert("Validasi", "Harga layanan tidak valid.");
      return false;
    }

    if (
      hours.trim() === "" ||
      !Number.isSafeInteger(Number(hours)) ||
      Number(hours) < 1
    ) {
      Alert.alert("Validasi", "Estimasi waktu tidak valid.");
      return false;
    }

    if (
      !Number.isSafeInteger(Number(sortOrder)) ||
      Number(sortOrder) < 0
    ) {
      Alert.alert("Validasi", "Urutan layanan tidak valid.");
      return false;
    }

    if (category === "kiloan" && !packageType) {
      Alert.alert("Validasi", "Pilih tipe layanan kiloan.");
      return false;
    }

    return true;
  };

  // ====================================================
  // SAVE
  // ====================================================

  const save = async () => {
    if (!validate()) return;

    const input: ServiceInput = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      package_type: category === "kiloan" ? packageType : null,
      unit,
      price: Number(price),
      estimated_hours: Number(hours),
      sort_order: Number(sortOrder),
      is_active: true,
    };

    setSaving(true);

    try {
      if (isEdit) {
        // Pertahankan status aktif/nonaktif dari data lama.
        const existing = await getServiceById(Number(id));

        if (!existing) {
          throw new Error("Layanan tidak ditemukan.");
        }

        input.is_active = existing.is_active === 1;

        await updateService(Number(id), input);
      } else {
        await createService(input);
      }

      Alert.alert(
        "Berhasil",
        isEdit
          ? "Layanan berhasil diperbarui."
          : "Layanan berhasil ditambahkan.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Gagal menyimpan",
        error?.message ?? "Terjadi kesalahan."
      );
    } finally {
      setSaving(false);
    }
  };

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Memuat data layanan...</Text>
      </View>
    );
  }

  // ====================================================
  // MAIN RENDER
  // ====================================================

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft color={C.black} size={19} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isEdit ? "Edit Layanan" : "Tambah Layanan"}
          </Text>
          <Text style={styles.headerSubtitle}>
            Kelola informasi dan tarif layanan
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 16, 35) },
        ]}
      >
        <View
          style={[
            styles.formLayout,
            landscape && styles.landscapeLayout,
          ]}
        >
          {/* LEFT COLUMN */}

          <View style={styles.column}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Shirt size={17} color={C.primary} />
                <Text style={styles.sectionTitle}>
                  Informasi Layanan
                </Text>
              </View>

              <Input
                label="Nama layanan *"
                value={name}
                onChangeText={setName}
                placeholder="Contoh: Cuci Kering Setrika"
              />

              <Input
                label="Deskripsi"
                value={description}
                onChangeText={setDescription}
                placeholder="Keterangan layanan (opsional)"
                multiline
              />

              <Text style={styles.label}>Kategori layanan *</Text>

              <View style={styles.options}>
                {categories.map((item) => (
                  <Option
                    key={item.value}
                    label={item.label}
                    description={item.description}
                    selected={category === item.value}
                    onPress={() => changeCategory(item.value)}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* RIGHT COLUMN */}

          <View style={styles.column}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Pengaturan Harga
              </Text>

              {category === "kiloan" && (
                <>
                  <Text style={styles.label}>Tipe layanan *</Text>

                  <View style={styles.options}>
                    {packages.map((item) => (
                      <Option
                        key={item.value}
                        label={item.value}
                        description={item.label}
                        selected={packageType === item.value}
                        onPress={() => setPackageType(item.value)}
                      />
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.label, { marginTop: 15 }]}>
                Satuan layanan
              </Text>

              <View style={styles.unitRow}>
                {availableUnits.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setUnit(item)}
                    style={[
                      styles.unitButton,
                      unit === item && styles.unitSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitText,
                        unit === item && { color: C.white },
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Input
                label="Harga (Rupiah) *"
                value={price}
                onChangeText={(value) =>
                  setPrice(value.replace(/[^0-9]/g, ""))
                }
                placeholder="Contoh: 10000"
                keyboardType="numeric"
              />

              <Text style={styles.label}>
                Estimasi pengerjaan
              </Text>

              <View style={styles.speedRow}>
                {speeds.map((item) => (
                  <Pressable
                    key={item.hours}
                    onPress={() => setHours(String(item.hours))}
                    style={[
                      styles.speedButton,
                      Number(hours) === item.hours && styles.speedSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.speedText,
                        Number(hours) === item.hours && {
                          color: C.primary,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Input
                label="Estimasi manual (jam)"
                value={hours}
                onChangeText={(value) =>
                  setHours(value.replace(/[^0-9]/g, ""))
                }
                keyboardType="numeric"
                placeholder="72"
              />

              <Input
                label="Urutan tampilan"
                value={sortOrder}
                onChangeText={(value) =>
                  setSortOrder(value.replace(/[^0-9]/g, ""))
                }
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
        </View>

        {/* ACTION BUTTONS */}

        <View style={styles.footer}>
          <Pressable
            onPress={() => router.back()}
            disabled={saving}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Batal</Text>
          </Pressable>

          <Pressable
            onPress={save}
            disabled={saving}
            style={[
              styles.saveButton,
              saving && { opacity: 0.65 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Check size={17} color={C.white} />
            )}

            <Text style={styles.saveText}>
              {saving ? "Menyimpan..." : "Simpan Layanan"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loading: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: C.muted,
    fontSize: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 5,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: C.black,
    fontSize: 19,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: C.muted,
    fontSize: 10,
    marginTop: 3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 35,
  },
  formLayout: {
    gap: 13,
  },
  landscapeLayout: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  section: {
    backgroundColor: C.white,
    padding: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 17,
  },
  sectionTitle: {
    color: C.black,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 15,
  },
  field: {
    marginBottom: 15,
  },
  label: {
    color: C.text,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 8,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#FAFBFD",
    borderRadius: 4,
    paddingHorizontal: 12,
    color: C.black,
    fontSize: 12,
  },
  textarea: {
    height: 85,
    paddingTop: 12,
  },
  options: {
    gap: 7,
    marginBottom: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  optionSelected: {
    borderColor: C.primary,
    backgroundColor: C.light,
  },
  optionText: {
    color: C.text,
    fontSize: 11,
    fontWeight: "800",
  },
  optionDescription: {
    color: C.muted,
    fontSize: 9,
    marginTop: 3,
  },
  unitRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  unitButton: {
    minWidth: 52,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  unitSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  unitText: {
    color: C.text,
    fontSize: 11,
    fontWeight: "800",
  },
  speedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 15,
  },
  speedButton: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  speedSelected: {
    backgroundColor: C.light,
    borderColor: C.primary,
  },
  speedText: {
    fontSize: 10,
    color: C.text,
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 9,
    marginTop: 15,
  },
  cancelButton: {
    paddingHorizontal: 20,
    minHeight: 44,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: C.text,
    fontSize: 11,
    fontWeight: "800",
  },
  saveButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 4,
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveText: {
    color: C.white,
    fontSize: 11,
    fontWeight: "900",
  },
});
