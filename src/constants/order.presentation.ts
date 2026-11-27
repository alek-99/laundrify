// constants/order.presentation.ts
import type { OrderStatus } from "../types/database";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  received: "Diterima",
  processing: "Diproses",
  ready: "Siap Diambil",
  completed: "Selesai",
  washing: "Dicuci",
  drying: "Dikeringkan",
  ironing: "Disetrika",
  cancelled: "Dibatalkan",
};

export const ORDER_STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  received: { bg: "#DBEAFE", text: "#1D4ED8" },
  processing: { bg: "#FEF3C7", text: "#B45309" },
  ready: { bg: "#DCFCE7", text: "#15803D" },
  completed: { bg: "#D1FAE5", text: "#047857" },
  washing: { bg: "#E0F2FE", text: "#0369A1" },
  drying: { bg: "#FEF3C7", text: "#B45309" },
  ironing: { bg: "#F3E8FF", text: "#7E22CE" },
  cancelled: { bg: "#FEE2E2", text: "#DC2626" },
};

export const ORDER_FILTER_OPTIONS: { label: string; value?: OrderStatus }[] = [
  { label: "Semua", value: undefined },
  { label: "Diterima", value: "received" },
  { label: "Diproses", value: "processing" },
  { label: "Siap Diambil", value: "ready" },
  { label: "Selesai", value: "completed" },
];