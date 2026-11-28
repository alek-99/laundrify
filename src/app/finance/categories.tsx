
import { FlashList } from "@shopify/flash-list";
import React, { memo, useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import ArrowDownCircle from "lucide-react-native/icons/circle-arrow-down";
import ArrowUpCircle from "lucide-react-native/icons/circle-arrow-up";
import Check from "lucide-react-native/icons/check";
import CirclePlus from "lucide-react-native/icons/circle-plus";
import Power from "lucide-react-native/icons/power";
import Tag from "lucide-react-native/icons/tag";

import {
  createCashCategory,
  getCashCategories,
  setCashCategoryActive,
} from "../../repositories/cash-category.repository";

import type {
  CashCategory,
  CashDirection,
} from "../../types/database";

import {
  Button,
  Card,
  Field,
  Page,
} from "../../components/ui";

const COLORS = {
  background: "#F1F3F6",
  surface: "#FFFFFF",
  inset: "#E9EDF2",
  border: "#E1E6ED",
  text: "#202938",
  muted: "#8993A2",
  primary: "#2855D9",
  green: "#15966A",
  red: "#D94A4A",
  greenLight: "#E8F5EF",
  redLight: "#FCECEC",
};

const CategoryCard = memo(function CategoryCard({
  category,
  onToggle,
}: {
  category: CashCategory;
  onToggle: (category: CashCategory) => void;
}) {
  const isIncome = category.type === "income";

  return (
    <View style={styles.catCard}>
      <View
        style={[
          styles.catIcon,
          { backgroundColor: isIncome ? COLORS.greenLight : COLORS.redLight },
        ]}
      >
        {isIncome ? (
          <ArrowUpCircle size={21} color={COLORS.green} />
        ) : (
          <ArrowDownCircle size={21} color={COLORS.red} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.catName}>{category.name}</Text>
        <Text style={styles.catType}>
          {isIncome ? "Pemasukan" : "Pengeluaran"}
        </Text>

        <View style={styles.catStatusRow}>
          <View
            style={[
              styles.catDot,
              { backgroundColor: category.is_active ? COLORS.green : COLORS.red },
            ]}
          />
          <Text
            style={[
              styles.catStatusText,
              { color: category.is_active ? COLORS.green : COLORS.red },
            ]}
          >
            {category.is_active ? "Aktif" : "Nonaktif"}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => onToggle(category)}
        style={({ pressed }) => [
          styles.toggleBtn,
          category.is_active ? styles.toggleBtnDisable : styles.toggleBtnEnable,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Power
          size={13}
          color={category.is_active ? COLORS.red : COLORS.green}
        />
        <Text
          style={[
            styles.toggleBtnText,
            { color: category.is_active ? COLORS.red : COLORS.green },
          ]}
        >
          {category.is_active ? "Nonaktifkan" : "Aktifkan"}
        </Text>
      </Pressable>
    </View>
  );
});

export default function Categories() {
  const [rows, setRows] = useState<CashCategory[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CashDirection>("expense");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCashCategories(undefined, false);
      setRows(data);
    } catch (e: any) {
      Alert.alert("Gagal memuat kategori", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const add = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Validasi", "Nama kategori wajib diisi");
      return;
    }

    try {
      setSaving(true);

      await createCashCategory({
        name: name.trim(),
        type,
        description: description.trim(),
      });

      setName("");
      setDescription("");

      Alert.alert("Berhasil", "Kategori berhasil ditambahkan");
      load();
    } catch (e: any) {
      Alert.alert("Gagal menambah kategori", e.message);
    } finally {
      setSaving(false);
    }
  }, [name, type, description, load]);

  const toggleCategory = useCallback(
    (category: CashCategory) => {
      Alert.alert(
        category.is_active
          ? "Nonaktifkan kategori?"
          : "Aktifkan kategori?",
        `Apakah Anda yakin ingin ${
          category.is_active ? "menonaktifkan" : "mengaktifkan"
        } kategori "${category.name}"?`,
        [
          {
            text: "Batal",
            style: "cancel",
          },
          {
            text: "Lanjutkan",
            onPress: async () => {
              try {
                await setCashCategoryActive(
                  category.id,
                  !category.is_active,
                );
                load();
              } catch (e: any) {
                Alert.alert("Gagal", e.message);
              }
            },
          },
        ],
      );
    },
    [load],
  );

  const incomeCount = useMemo(
    () => rows.filter((item) => item.type === "income").length,
    [rows],
  );
  const expenseCount = useMemo(
    () => rows.filter((item) => item.type === "expense").length,
    [rows],
  );
  const activeCount = useMemo(
    () => rows.filter((item) => item.is_active).length,
    [rows],
  );

  const keyExtractor = useCallback((item: CashCategory) => String(item.id), []);
  const renderCategory = useCallback(
    ({ item }: { item: CashCategory }) => (
      <CategoryCard category={item} onToggle={toggleCategory} />
    ),
    [toggleCategory],
  );

  const listHeader = (
    <>
      {/* RINGKASAN */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Tag size={15} color={COLORS.primary} />
            <Text style={styles.summaryLabel}>TOTAL KATEGORI</Text>
          </View>
          <Text style={styles.summaryValue}>{rows.length}</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Check size={15} color={COLORS.green} />
            <Text style={styles.summaryLabel}>KATEGORI AKTIF</Text>
          </View>
          <Text style={[styles.summaryValue, { color: COLORS.green }]}>
            {activeCount}
          </Text>
        </View>
      </View>

      {/* FORM TAMBAH */}
      <Card>
        <View style={styles.formHeaderRow}>
          <View style={styles.formHeaderIcon}>
            <CirclePlus size={19} color={COLORS.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.formTitle}>Tambah Kategori</Text>
            <Text style={styles.formSubtitle}>Buat kategori kas baru</Text>
          </View>
        </View>

        <Text style={styles.typeLabel}>Jenis kategori</Text>

        <View style={styles.typeRow}>
          <Pressable
            onPress={() => setType("income")}
            style={[
              styles.typeBtn,
              type === "income" && styles.typeBtnIncomeActive,
            ]}
          >
            <ArrowUpCircle
              size={17}
              color={type === "income" ? COLORS.green : COLORS.muted}
            />
            <Text
              style={[
                styles.typeBtnText,
                { color: type === "income" ? COLORS.green : COLORS.muted },
              ]}
            >
              Pemasukan
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setType("expense")}
            style={[
              styles.typeBtn,
              type === "expense" && styles.typeBtnExpenseActive,
            ]}
          >
            <ArrowDownCircle
              size={17}
              color={type === "expense" ? COLORS.red : COLORS.muted}
            />
            <Text
              style={[
                styles.typeBtnText,
                { color: type === "expense" ? COLORS.red : COLORS.muted },
              ]}
            >
              Pengeluaran
            </Text>
          </Pressable>
        </View>

        <Field
          label="Nama kategori"
          value={name}
          onChangeText={setName}
          placeholder="Contoh: Transportasi"
        />

        <Field
          label="Deskripsi"
          value={description}
          onChangeText={setDescription}
          placeholder="Keterangan (opsional)"
        />

        <View style={{ marginTop: 5 }}>
          <Button
            title={saving ? "Menyimpan..." : "Tambah Kategori"}
            onPress={add}
            disabled={saving}
          />
        </View>
      </Card>

      {/* DAFTAR KATEGORI */}
      <View style={styles.listHeader}>
        <View>
          <Text style={styles.listTitle}>Daftar Kategori</Text>
          <Text style={styles.listSubtitle}>
            {rows.length} kategori terdaftar
          </Text>
        </View>

        <View style={styles.countChip}>
          <Text style={styles.countChipText}>
            {incomeCount} pemasukan · {expenseCount} pengeluaran
          </Text>
        </View>
      </View>
    </>
  );

  return (
    <Page
      title="Kategori Kas"
      subtitle="Kelola kelompok pemasukan dan pengeluaran"
      scroll={false}
    >
      <FlashList
        data={rows}
        renderItem={renderCategory}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <Text style={styles.loadingText}>Memuat kategori...</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Tag size={30} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>Belum Ada Kategori</Text>
              <Text style={styles.emptyText}>
                Tambahkan kategori untuk mengelompokkan transaksi kas.
              </Text>
            </View>
          )
        }
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    borderRadius: 5,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
  },
  summaryValue: {
    fontSize: 25,
    fontWeight: "900",
    color: COLORS.text,
  },
  formHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 16,
  },
  formHeaderIcon: {
    width: 34,
    height: 34,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.text,
  },
  formSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 9,
  },
  typeRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 10,
    backgroundColor: COLORS.inset,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  typeBtnIncomeActive: {
    backgroundColor: COLORS.greenLight,
    borderColor: COLORS.green,
  },
  typeBtnExpenseActive: {
    backgroundColor: COLORS.redLight,
    borderColor: COLORS.red,
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
  },
  listSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 3,
  },
  countChip: {
    backgroundColor: COLORS.inset,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 3,
  },
  countChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.text,
  },
  loadingBox: {
    padding: 25,
    alignItems: "center",
    backgroundColor: COLORS.inset,
    borderRadius: 4,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyBox: {
    padding: 30,
    alignItems: "center",
    backgroundColor: COLORS.inset,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 5,
    textAlign: "center",
  },
  catCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 14,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  catIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  catName: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.text,
  },
  catType: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 4,
  },
  catStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  catStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 3,
  },
  toggleBtnDisable: {
    backgroundColor: COLORS.redLight,
    borderColor: "#F2D1D1",
  },
  toggleBtnEnable: {
    backgroundColor: COLORS.greenLight,
    borderColor: "#CDE9DA",
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: "800",
  },
});
