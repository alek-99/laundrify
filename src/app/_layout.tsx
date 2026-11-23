
import { initializeDatabase } from "@/database/migrations";
import LoadingScreen from "@/components/LoadingScreen";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Menyiapkan aplikasi...");

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setProgress(15);
        setStatus("Menghubungkan database...");

        await new Promise((resolve) =>
          setTimeout(resolve, 400)
        );

        if (!mounted) return;

        setProgress(35);
        setStatus("Menyiapkan struktur database...");

        await initializeDatabase();

        if (!mounted) return;

        setProgress(85);
        setStatus("Memuat aplikasi...");

        await new Promise((resolve) =>
          setTimeout(resolve, 500)
        );

        if (!mounted) return;

        setProgress(100);
        setStatus("Aplikasi siap!");

        await new Promise((resolve) =>
          setTimeout(resolve, 500)
        );

        if (!mounted) return;

        setReady(true);
      } catch (err) {
        console.error("Database initialization error:", err);

        if (mounted) {
          setError("Gagal menginisialisasi database.");
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>
          Terjadi Kesalahan
        </Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorHint}>
          Silakan tutup dan buka kembali aplikasi.
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <LoadingScreen
        progress={progress}
        status={status}
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#F7F7F4",
        },
      }}
    />
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: "#F7F7F4",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#DC2626",
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: "#555555",
    textAlign: "center",
  },
  errorHint: {
    fontSize: 12,
    color: "#999999",
    marginTop: 12,
    textAlign: "center",
  },
});
