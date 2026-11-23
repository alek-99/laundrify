
import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";

import { useFocusEffect, router } from "expo-router";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Tags,
  Wallet,
  FileText,
} from "lucide-react-native";

import { createTransaction } from "../../services/finance.service";
import { getCashCategories } from "../../repositories/cash-category.repository";

import type {
  CashCategory,
  CashDirection,
} from "../../types/database";

import {
  Button,
  C,
  Field,
  Page,
} from "../../components/ui";

// ==========================================
// FLAT DESIGN COLORS
// ==========================================

const UI = {
  background: "#F1F3F6",
  surface: "#FFFFFF",
  inset: "#E9EDF2",
  text: "#202938",
  muted: "#8993A2",
  border: "#E1E6ED",
  primary: "#2855D9",
  green: "#15966A",
  greenLight: "#E8F5EF",
  red: "#D94A4A",
  redLight: "#FCEDED",
  blueLight: "#EAF0FF",
};

// ==========================================
// SECTION TITLE
// ==========================================

function SectionTitle({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "900",
        color: UI.text,
        marginBottom: 11,
      }}
    >
      {title}
    </Text>
  );
}

// ==========================================
// FINANCE FORM
// ==========================================

export default function FinanceForm() {
  const [direction, setDirection] =
    useState<CashDirection>("expense");

  const [cats, setCats] = useState<CashCategory[]>([]);
  const [category, setCategory] = useState<number>();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);

  // ========================================
  // LOAD CATEGORIES
  // ========================================

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadCategories = async () => {
        try {
          const result = await getCashCategories(direction, true);

          if (active) {
            setCats(result);
            setCategory(result[0]?.id);
          }
        } catch (error: any) {
          if (active) {
            Alert.alert(
              "Gagal memuat kategori",
              error?.message || "Terjadi kesalahan."
            );
          }
        }
      };

      loadCategories();

      return () => {
        active = false;
      };
    }, [direction])
  );

  // ========================================
  // SAVE TRANSACTION
  // ========================================

  const save = async () => {
    if (saving) return;

    if (
      !category ||
      !Number.isSafeInteger(Number(amount)) ||
      Number(amount) <= 0 ||
      !description.trim()
    ) {
      Alert.alert(
        "Periksa data",
        "Kategori, nominal, dan keterangan wajib diisi."
      );
      return;
    }

    setSaving(true);

    try {
      await createTransaction({
        category_id: category,
        direction,
        amount: Number(amount),
        description: description.trim(),
      });

      Alert.alert(
        "Berhasil",
        "Transaksi berhasil disimpan.",
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
        error?.message || "Terjadi kesalahan."
      );
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // ACTIVE COLORS
  // ========================================

  const isIncome = direction === "income";

  const activeColor = isIncome ? UI.green : UI.red;

  const activeBackground = isIncome
    ? UI.greenLight
    : UI.redLight;

  // ========================================
  // MAIN UI
  // ========================================

  return (
    <Page
      title="Tambah transaksi"
      subtitle="Catat pemasukan atau pengeluaran"
    >
      {/* ================================== */}
      {/* TRANSACTION TYPE */}
      {/* ================================== */}

      <SectionTitle title="Jenis transaksi" />

      <View
        style={{
          flexDirection: "row",
          gap: 9,
          marginBottom: 22,
        }}
      >
        {(["income", "expense"] as CashDirection[]).map((d) => {
          const active = direction === d;
          const income = d === "income";

          const color = income ? UI.green : UI.red;

          const background = income
            ? UI.greenLight
            : UI.redLight;

          return (
            <Pressable
              key={d}
              onPress={() => setDirection(d)}
              style={{
                flex: 1,
                backgroundColor: active ? background : UI.surface,
                borderWidth: 1,
                borderColor: active ? color : UI.border,
                borderRadius: 5,
                padding: 13,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 35,
                  height: 35,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? "#FFFFFF" : UI.inset,
                  borderRadius: 4,
                  marginBottom: 8,
                }}
              >
                {income ? (
                  <ArrowDownLeft
                    size={19}
                    color={active ? color : UI.muted}
                  />
                ) : (
                  <ArrowUpRight
                    size={19}
                    color={active ? color : UI.muted}
                  />
                )}
              </View>

              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "900",
                  color: active ? color : UI.text,
                }}
              >
                {income ? "Pemasukan" : "Pengeluaran"}
              </Text>

              {active && (
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                  }}
                >
                  <Check size={13} color={color} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ================================== */}
      {/* CATEGORY */}
      {/* ================================== */}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 11,
        }}
      >
        <SectionTitle title="Pilih kategori" />

        <Pressable
          onPress={() => router.push("/finance/categories")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            marginBottom: 11,
          }}
        >
          <Tags size={14} color={UI.primary} />

          <Text
            style={{
              fontSize: 10,
              color: UI.primary,
              fontWeight: "800",
            }}
          >
            Kelola
          </Text>
        </Pressable>
      </View>

      {cats.length > 0 ? (
        <View
          style={{
            marginBottom: 19,
          }}
        >
          {cats.map((c) => {
            const active = category === c.id;

            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 13,
                  backgroundColor: active
                    ? UI.blueLight
                    : UI.surface,
                  borderWidth: 1,
                  borderColor: active
                    ? UI.primary
                    : UI.border,
                  borderRadius: 4,
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 33,
                    height: 33,
                    backgroundColor: active
                      ? "#FFFFFF"
                      : UI.inset,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 4,
                    marginRight: 11,
                  }}
                >
                  <Tags
                    size={16}
                    color={active ? UI.primary : UI.muted}
                  />
                </View>

                <Text
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontWeight: "800",
                    color: active ? UI.primary : UI.text,
                  }}
                >
                  {c.name}
                </Text>

                <View
                  style={{
                    width: 19,
                    height: 19,
                    borderWidth: 1.5,
                    borderColor: active
                      ? UI.primary
                      : UI.border,
                    backgroundColor: active
                      ? UI.primary
                      : "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 3,
                  }}
                >
                  {active && (
                    <Check size={13} color="#FFFFFF" />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View
          style={{
            backgroundColor: UI.inset,
            borderWidth: 1,
            borderColor: UI.border,
            padding: 16,
            borderRadius: 4,
            marginBottom: 19,
          }}
        >
          <View
            style={{
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Tags size={23} color={UI.muted} />
          </View>

          <Text
            style={{
              fontSize: 12,
              color: UI.text,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            Belum ada kategori
          </Text>

          <Text
            style={{
              fontSize: 10,
              color: UI.muted,
              textAlign: "center",
              marginTop: 5,
              marginBottom: 13,
            }}
          >
            Tambahkan kategori terlebih dahulu untuk mencatat transaksi.
          </Text>

          <Button
            title="Kelola kategori"
            secondary
            onPress={() => router.push("/finance/categories")}
          />
        </View>
      )}

      {/* ================================== */}
      {/* AMOUNT */}
      {/* ================================== */}

      <SectionTitle title="Nominal transaksi" />

      <View
        style={{
          backgroundColor: UI.surface,
          borderWidth: 1,
          borderColor: UI.border,
          padding: 13,
          borderRadius: 5,
          marginBottom: 17,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <Wallet size={16} color={UI.muted} />

          <Text
            style={{
              fontSize: 11,
              color: UI.muted,
              fontWeight: "700",
            }}
          >
            Nominal dalam Rupiah *
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: UI.inset,
            borderWidth: 1,
            borderColor: UI.border,
            borderRadius: 4,
            paddingHorizontal: 12,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "900",
              color: UI.muted,
              marginRight: 10,
            }}
          >
            Rp
          </Text>

          <View style={{ flex: 1 }}>
            <Field
              label=""
              value={amount}
              onChangeText={(value: string) =>
                setAmount(value.replace(/[^0-9]/g, ""))
              }
              keyboardType="numeric"
              placeholder="Contoh: 50000"
            />
          </View>
        </View>

        <Text
          style={{
            fontSize: 9,
            color: UI.muted,
            marginTop: 7,
          }}
        >
          Masukkan nominal tanpa titik atau koma.
        </Text>
      </View>

      {/* ================================== */}
      {/* DESCRIPTION */}
      {/* ================================== */}

      <SectionTitle title="Keterangan transaksi" />

      <View
        style={{
          backgroundColor: UI.surface,
          borderWidth: 1,
          borderColor: UI.border,
          borderRadius: 5,
          padding: 13,
          marginBottom: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <FileText size={16} color={UI.muted} />

          <Text
            style={{
              fontSize: 11,
              color: UI.muted,
              fontWeight: "700",
            }}
          >
            Deskripsi *
          </Text>
        </View>

        <View
          style={{
            backgroundColor: UI.inset,
            borderWidth: 1,
            borderColor: UI.border,
            borderRadius: 4,
            padding: 8,
          }}
        >
          <Field
            label=""
            value={description}
            onChangeText={setDescription}
            placeholder="Contoh: Pembelian deterjen"
            multiline
          />
        </View>
      </View>

      {/* ================================== */}
      {/* PREVIEW */}
      {/* ================================== */}

      <View
        style={{
          backgroundColor: activeBackground,
          borderWidth: 1,
          borderColor: `${activeColor}40`,
          borderRadius: 5,
          padding: 13,
          marginBottom: 18,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            color: activeColor,
            fontWeight: "800",
          }}
        >
          RINGKASAN TRANSAKSI
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 9,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: UI.text,
              fontWeight: "700",
            }}
          >
            {isIncome ? "Pemasukan" : "Pengeluaran"}
          </Text>

          <Text
            style={{
              fontSize: 16,
              fontWeight: "900",
              color: activeColor,
            }}
          >
            {isIncome ? "+" : "-"}Rp {amount
              ? Number(amount).toLocaleString("id-ID")
              : "0"}
          </Text>
        </View>
      </View>

      {/* ================================== */}
      {/* SAVE BUTTON */}
      {/* ================================== */}

      <Button
        title={saving ? "Menyimpan..." : "Simpan transaksi"}
        onPress={save}
        loading={saving}
      />

      <View style={{ height: 15 }} />
    </Page>
  );
}
