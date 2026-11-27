# 📱 Selamat Datang di Proyek Expo

<p align="center">
  <img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9b?q=80&w=1200&auto=format&fit=crop" width="100%" alt="Ilustrasi pengembangan aplikasi mobile"/>
</p>

<p align="center">
  <strong>Aplikasi mobile berbasis React Native dan Expo</strong>
</p>

---

## Tentang Proyek

Proyek ini merupakan aplikasi mobile yang dikembangkan menggunakan **Expo** dengan framework **React Native**. Proyek dibuat menggunakan `create-expo-app` dan menggunakan Expo Router untuk sistem navigasi berbasis file.

## Teknologi yang Digunakan

<p align="center">
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo"/>
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
</p>

- **Expo** – Mempermudah pengembangan aplikasi mobile.
- **React Native** – Framework untuk membangun aplikasi Android dan iOS.
- **Expo Router** – Mengelola navigasi menggunakan sistem file-based routing.
- **TypeScript** – Membantu pengembangan dengan sistem tipe data.

## Struktur Pengembangan

Pengembangan aplikasi dilakukan melalui direktori `src/app`.

```text
src/
└── app/
    ├── _layout.tsx
    └── index.tsx
```

Struktur tersebut merupakan gambaran awal direktori aplikasi dan dapat berkembang sesuai kebutuhan.

## Menjalankan Aplikasi

### 1. Persiapan

Pastikan perangkat telah menginstal:

- Node.js
- npm
- Expo Go (opsional, untuk pengujian melalui perangkat)

### 2. Instalasi Dependensi

Jalankan perintah berikut pada terminal di direktori proyek:

```bash
npm install
```

### 3. Pengembangan Aplikasi

Mulai pengembangan dengan mengubah atau menambahkan file di dalam direktori `src/app`.

## Tampilan Pengembangan

<p align="center">
  <img src="https://images.unsplash.com/photo-1551650975-87deedd944c3?q=80&w=1000&auto=format&fit=crop" width="48%" alt="Ilustrasi desain aplikasi mobile"/>
  <img src="https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?q=80&w=1000&auto=format&fit=crop" width="48%" alt="Ilustrasi pengembangan mobile"/>
</p>

<sub>Gambar di atas merupakan ilustrasi dan bukan screenshot aplikasi yang sebenarnya.</sub>

## Reset Proyek

Jika ingin mengatur ulang proyek ke kondisi awal, jalankan:

```bash
npm run reset-project
```

Perintah tersebut akan memindahkan file starter ke direktori `example` dan membuat direktori `src/app` baru yang kosong untuk memulai pengembangan dari awal.

## Pengembangan Tambahan

### ESLint

Untuk memeriksa kualitas dan konsistensi kode:

```bash
npx expo lint
```

### Unit Testing

Untuk mempelajari pengujian unit pada aplikasi Expo, kunjungi:

[Jest Unit Testing – Expo Documentation](https://docs.expo.dev/develop/unit-testing/)

### TypeScript

Panduan penggunaan TypeScript pada Expo dapat dilihat melalui:

[TypeScript – Expo Documentation](https://docs.expo.dev/guides/typescript/)

## Dokumentasi

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Tutorial](https://docs.expo.dev/tutorial/introduction/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)

## Komunitas

- [GitHub Expo](https://github.com/expo/expo)
- [Discord Expo](https://chat.expo.dev)

---

## 🚀 Start Aplikasi

Untuk menjalankan aplikasi dalam mode pengembangan, gunakan perintah berikut:

```bash
npx expo start
```

Setelah dijalankan, pilih platform yang ingin digunakan untuk membuka aplikasi:

- Tekan `a` untuk membuka Android.
- Tekan `i` untuk membuka iOS Simulator.
- Scan QR Code menggunakan Expo Go.
