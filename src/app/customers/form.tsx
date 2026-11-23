
import React, { useEffect, useState } from "react";
import {
  Alert,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";

import {
  createCustomer,
  updateCustomer,
  getCustomerById,
} from "../../repositories/customer.repository";

import { Field, Page, C } from "../../components/ui";

import {
  User,
  MapPin,
  FileText,
  Save,
  X,
  UserPlus,
  Phone,
} from "lucide-react-native";

export default function CustomerForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const editing = !!id;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!id) return;

    getCustomerById(Number(id))
      .then((customer) => {
        if (customer) {
          setName(customer.name);
          setPhone(customer.phone || "");
          setAddress(customer.address || "");
          setNotes(customer.notes || "");
        } else {
          Alert.alert(
            "Tidak ditemukan",
            "Data pelanggan tidak ditemukan.",
            [{ text: "Kembali", onPress: () => router.back() }]
          );
        }
      })
      .catch((error) => Alert.alert("Error", error.message))
      .finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Validasi", "Nama pelanggan wajib diisi");
      return;
    }

    if (saving) return;

    setSaving(true);

    try {
      const data = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
      };

      if (id) {
        await updateCustomer(Number(id), data);
      } else {
        await createCustomer(data);
      }

      Alert.alert(
        "Berhasil",
        editing
          ? "Data pelanggan berhasil diperbarui."
          : "Pelanggan berhasil ditambahkan.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert("Gagal menyimpan", error.message);
    } finally {
      setSaving(false);
    }
  };

  const sectionTitle = (title: string, icon: React.ReactNode) => (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <Page
        title={editing ? "Edit Pelanggan" : "Tambah Pelanggan"}
        subtitle="Memuat informasi pelanggan"
      >
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Memuat data pelanggan...</Text>
        </View>
      </Page>
    );
  }

  return (
    <Page
      title={editing ? "Edit Pelanggan" : "Tambah Pelanggan"}
      subtitle={
        editing
          ? "Perbarui informasi pelanggan"
          : "Tambahkan pelanggan baru"
      }
    >
      {/* FORM INTRO */}
      <View style={styles.intro}>
        <View style={styles.introIcon}>
          {editing ? (
            <User size={23} color={C.primary} />
          ) : (
            <UserPlus size={23} color={C.primary} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.introTitle}>
            {editing ? "Edit Data Pelanggan" : "Pelanggan Baru"}
          </Text>
          <Text style={styles.introSubtitle}>
            {editing
              ? "Pastikan data yang diperbarui sudah benar."
              : "Lengkapi informasi pelanggan di bawah ini."}
          </Text>
        </View>
      </View>

      {/* PERSONAL INFORMATION */}
      <View style={styles.section}>
        {sectionTitle(
          "Informasi Pribadi",
          <User size={17} color={C.primary} />
        )}

        <View style={styles.formCard}>
          <Field
            label="Nama pelanggan *"
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Andi Pratama"
          />

          <View style={styles.fieldSpacing}>
            <Field
              label="Nomor telepon"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="08xxxxxxxxxx"
            />
          </View>
        </View>
      </View>

      {/* ADDRESS */}
      <View style={styles.section}>
        {sectionTitle(
          "Alamat Pelanggan",
          <MapPin size={17} color={C.primary} />
        )}

        <View style={styles.formCard}>
          <Field
            label="Alamat lengkap"
            value={address}
            onChangeText={setAddress}
            placeholder="Masukkan alamat lengkap pelanggan"
            multiline
          />
        </View>
      </View>

      {/* NOTES */}
      <View style={styles.section}>
        {sectionTitle(
          "Catatan Tambahan",
          <FileText size={17} color={C.primary} />
        )}

        <View style={styles.formCard}>
          <Field
            label="Catatan"
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Masukkan catatan khusus pelanggan..."
          />

          <Text style={styles.helper}>
            Opsional. Informasi tambahan mengenai pelanggan.
          </Text>
        </View>
      </View>

      {/* ACTIONS */}
      <Pressable
        onPress={save}
        disabled={saving}
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: saving
              ? "#64748B"
              : pressed
                ? "#183B9B"
                : C.primary,
            opacity: saving ? 0.8 : 1,
          },
        ]}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Save size={17} color="#FFFFFF" />
        )}

        <Text style={styles.saveText}>
          {saving
            ? "Menyimpan..."
            : editing
              ? "Simpan Perubahan"
              : "Simpan Pelanggan"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.back()}
        disabled={saving}
        style={({ pressed }) => [
          styles.cancelButton,
          { backgroundColor: pressed ? "#F1F5F9" : "#FFFFFF" },
        ]}
      >
        <X size={17} color={C.text} />
        <Text style={styles.cancelText}>Batal</Text>
      </Pressable>

      <Text style={styles.footer}>
        Pastikan informasi pelanggan sudah benar sebelum disimpan.
      </Text>
    </Page>
  );
}

const styles = {
  loading: {
    padding: 40,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  loadingText: {
    color: C.muted,
    fontSize: 12,
    marginTop: 12,
  },
  intro: {
    backgroundColor: "#EFF4FF",
    borderWidth: 1,
    borderColor: "#DCE6FA",
    padding: 15,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginBottom: 24,
    borderRadius: 4,
  },
  introIcon: {
    width: 43,
    height: 43,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE6FA",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 4,
  },
  introTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "900" as const,
  },
  introSubtitle: {
    color: C.muted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 11,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "900" as const,
  },
  formCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    borderRadius: 4,
  },
  fieldSpacing: {
    marginTop: 12,
  },
  helper: {
    color: C.muted,
    fontSize: 10,
    marginTop: 9,
    lineHeight: 15,
  },
  saveButton: {
    paddingVertical: 15,
    borderRadius: 4,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 9,
    marginBottom: 10,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900" as const,
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 14,
    borderRadius: 4,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 9,
  },
  cancelText: {
    color: C.text,
    fontSize: 13,
    fontWeight: "800" as const,
  },
  footer: {
    color: C.muted,
    fontSize: 10,
    textAlign: "center" as const,
    marginTop: 18,
    marginBottom: 10,
  },
};
