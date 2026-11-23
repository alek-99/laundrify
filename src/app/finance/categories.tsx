
import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  CirclePlus,
  Power,
  Tag,
} from "lucide-react-native";

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
  C,
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

  const add = async () => {
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
  };

  const toggleCategory = (category: CashCategory) => {
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
  };

  const incomeCount = rows.filter(
    (item) => item.type === "income",
  ).length;

  const expenseCount = rows.filter(
    (item) => item.type === "expense",
  ).length;

  const activeCount = rows.filter(
    (item) => item.is_active,
  ).length;

  return (
    <Page
      title="Kategori Kas"
      subtitle="Kelola kelompok pemasukan dan pengeluaran"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* RINGKASAN */}
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 14,
              borderRadius: 5,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                marginBottom: 10,
              }}
            >
              <Tag size={15} color={COLORS.primary} />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: COLORS.muted,
                }}
              >
                TOTAL KATEGORI
              </Text>
            </View>

            <Text
              style={{
                fontSize: 25,
                fontWeight: "900",
                color: COLORS.text,
              }}
            >
              {rows.length}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 14,
              borderRadius: 5,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                marginBottom: 10,
              }}
            >
              <Check size={15} color={COLORS.green} />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: COLORS.muted,
                }}
              >
                KATEGORI AKTIF
              </Text>
            </View>

            <Text
              style={{
                fontSize: 25,
                fontWeight: "900",
                color: COLORS.green,
              }}
            >
              {activeCount}
            </Text>
          </View>
        </View>

        {/* FORM TAMBAH */}
        <Card>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 9,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                backgroundColor: "#EAF0FF",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 4,
              }}
            >
              <CirclePlus size={19} color={COLORS.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "900",
                  color: COLORS.text,
                }}
              >
                Tambah Kategori
              </Text>

              <Text
                style={{
                  fontSize: 10,
                  color: COLORS.muted,
                  marginTop: 2,
                }}
              >
                Buat kategori kas baru
              </Text>
            </View>
          </View>

          {/* PILIH JENIS */}
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: COLORS.text,
              marginBottom: 9,
            }}
          >
            Jenis kategori
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: 9,
              marginBottom: 16,
            }}
          >
            <Pressable
              onPress={() => setType("income")}
              style={{
                flex: 1,
                paddingVertical: 13,
                paddingHorizontal: 10,
                backgroundColor:
                  type === "income"
                    ? COLORS.greenLight
                    : COLORS.inset,
                borderWidth: 1,
                borderColor:
                  type === "income"
                    ? COLORS.green
                    : COLORS.border,
                borderRadius: 4,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              <ArrowUpCircle
                size={17}
                color={
                  type === "income"
                    ? COLORS.green
                    : COLORS.muted
                }
              />

              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color:
                    type === "income"
                      ? COLORS.green
                      : COLORS.muted,
                }}
              >
                Pemasukan
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setType("expense")}
              style={{
                flex: 1,
                paddingVertical: 13,
                paddingHorizontal: 10,
                backgroundColor:
                  type === "expense"
                    ? COLORS.redLight
                    : COLORS.inset,
                borderWidth: 1,
                borderColor:
                  type === "expense"
                    ? COLORS.red
                    : COLORS.border,
                borderRadius: 4,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              <ArrowDownCircle
                size={17}
                color={
                  type === "expense"
                    ? COLORS.red
                    : COLORS.muted
                }
              />

              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color:
                    type === "expense"
                      ? COLORS.red
                      : COLORS.muted,
                }}
              >
                Pengeluaran
              </Text>
            </Pressable>
          </View>

          {/* INPUT */}
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 22,
            marginBottom: 12,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "900",
                color: COLORS.text,
              }}
            >
              Daftar Kategori
            </Text>

            <Text
              style={{
                fontSize: 10,
                color: COLORS.muted,
                marginTop: 3,
              }}
            >
              {rows.length} kategori terdaftar
            </Text>
          </View>

          <View
            style={{
              backgroundColor: COLORS.inset,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 3,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "800",
                color: COLORS.text,
              }}
            >
              {incomeCount} pemasukan · {expenseCount} pengeluaran
            </Text>
          </View>
        </View>

        {loading ? (
          <View
            style={{
              padding: 25,
              alignItems: "center",
              backgroundColor: COLORS.inset,
              borderRadius: 4,
            }}
          >
            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              Memuat kategori...
            </Text>
          </View>
        ) : rows.length === 0 ? (
          <View
            style={{
              padding: 30,
              alignItems: "center",
              backgroundColor: COLORS.inset,
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 4,
            }}
          >
            <Tag size={30} color={COLORS.muted} />

            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: COLORS.text,
                marginTop: 12,
              }}
            >
              Belum Ada Kategori
            </Text>

            <Text
              style={{
                fontSize: 11,
                color: COLORS.muted,
                marginTop: 5,
                textAlign: "center",
              }}
            >
              Tambahkan kategori untuk mengelompokkan transaksi kas.
            </Text>
          </View>
        ) : (
          rows.map((category) => {
            const isIncome = category.type === "income";

            return (
              <View
                key={category.id}
                style={{
                  backgroundColor: COLORS.surface,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 4,
                  padding: 14,
                  marginBottom: 9,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {/* ICON */}
                <View
                  style={{
                    width: 42,
                    height: 42,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isIncome
                      ? COLORS.greenLight
                      : COLORS.redLight,
                    borderRadius: 4,
                  }}
                >
                  {isIncome ? (
                    <ArrowUpCircle
                      size={21}
                      color={COLORS.green}
                    />
                  ) : (
                    <ArrowDownCircle
                      size={21}
                      color={COLORS.red}
                    />
                  )}
                </View>

                {/* INFORMASI */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "900",
                      color: COLORS.text,
                    }}
                  >
                    {category.name}
                  </Text>

                  <Text
                    style={{
                      fontSize: 10,
                      color: COLORS.muted,
                      marginTop: 4,
                    }}
                  >
                    {isIncome ? "Pemasukan" : "Pengeluaran"}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      marginTop: 7,
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: category.is_active
                          ? COLORS.green
                          : COLORS.red,
                      }}
                    />

                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: category.is_active
                          ? COLORS.green
                          : COLORS.red,
                      }}
                    >
                      {category.is_active ? "Aktif" : "Nonaktif"}
                    </Text>
                  </View>
                </View>

                {/* TOGGLE STATUS */}
                <Pressable
                  onPress={() => toggleCategory(category)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingVertical: 9,
                    paddingHorizontal: 10,
                    backgroundColor: category.is_active
                      ? COLORS.redLight
                      : COLORS.greenLight,
                    borderWidth: 1,
                    borderColor: category.is_active
                      ? "#F2D1D1"
                      : "#CDE9DA",
                    borderRadius: 3,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Power
                    size={13}
                    color={
                      category.is_active
                        ? COLORS.red
                        : COLORS.green
                    }
                  />

                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "800",
                      color: category.is_active
                        ? COLORS.red
                        : COLORS.green,
                    }}
                  >
                    {category.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </Page>
  );
}
