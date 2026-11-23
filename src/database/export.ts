import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as SQLite from "expo-sqlite";

export async function exportDatabase() {
  const db = await SQLite.openDatabaseAsync("laundrify.db");

  const databasePath = db.databasePath;

  const destination = FileSystem.cacheDirectory + "laundrify.db";

  await FileSystem.copyAsync({
    from: databasePath,
    to: destination,
  });

  await Sharing.shareAsync(destination, {
    mimeType: "application/octet-stream",
    dialogTitle: "Export Database Laundrify",
  });
}
