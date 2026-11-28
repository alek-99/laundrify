
import Award from "lucide-react-native/icons/award";
import Minus from "lucide-react-native/icons/minus";
import Plus from "lucide-react-native/icons/plus";
import Trash2 from "lucide-react-native/icons/trash";
import { memo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { money } from "../ui";

export interface OrderItemCardData {
  tempId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  item_type: "service" | "package";
  category?: string;
  package_type?: string | null;
  use_subscription_id?: number | null;
}

interface Props {
  item: OrderItemCardData;
  quotaAvailable?: number;
  quotaEnabled?: boolean;
  onQuantityChange: (quantity: number) => void;
  onToggleQuota?: () => void;
  onRemove: () => void;
}

const C = {
  white: "#FFFFFF",
  text: "#263244",
  muted: "#8490A3",
  border: "#D8DEE8",
  primary: "#3159C9",
  primaryLight: "#E7EDFF",
  green: "#15803D",
  greenLight: "#DCFCE7",
  red: "#D34B55",
};

const OrderItemCard = memo(function OrderItemCard({
  item,
  quotaAvailable = 0,
  quotaEnabled = false,
  onQuantityChange,
  onToggleQuota,
  onRemove,
}: Props) {
  const isPackage = item.item_type === "package";
  const canUseQuota =
    !isPackage &&
    item.category === "kiloan" &&
    !!item.package_type &&
    quotaAvailable >= 5;

  const updateQuantity = (value: string) => {
    if (value === "") {
      onQuantityChange(0);
      return;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onQuantityChange(parsed);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <View style={styles.badges}>
            <Text
              style={[
                styles.badge,
                isPackage ? styles.packageBadge : styles.serviceBadge,
              ]}
            >
              {isPackage ? "PAKET MEMBER" : item.unit.toUpperCase()}
            </Text>

            {quotaEnabled && (
              <Text style={styles.quotaBadge}>KUOTA MEMBER</Text>
            )}
          </View>

          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.price}>
            {money(item.price)} / {item.unit}
          </Text>
        </View>

        <Pressable onPress={onRemove} style={styles.deleteButton}>
          <Trash2 size={17} color={C.red} />
        </Pressable>
      </View>

      {!isPackage && (
        <View style={styles.quantityRow}>
          <Text style={styles.quantityLabel}>Jumlah ({item.unit})</Text>

          <View style={styles.stepper}>
            <Pressable
              style={styles.stepperButton}
              onPress={() =>
                onQuantityChange(
                  Math.max(0.1, Math.round((item.quantity - 0.1) * 10) / 10),
                )
              }
            >
              <Minus size={14} color={C.text} />
            </Pressable>

            <TextInput
              value={String(item.quantity)}
              onChangeText={updateQuantity}
              onBlur={() => {
                if (item.quantity <= 0) onQuantityChange(0.1);
              }}
              keyboardType="decimal-pad"
              style={styles.quantityInput}
            />

            <Pressable
              style={styles.stepperButton}
              onPress={() =>
                onQuantityChange(
                  Math.round((item.quantity + 0.1) * 10) / 10,
                )
              }
            >
              <Plus size={14} color={C.text} />
            </Pressable>
          </View>
        </View>
      )}

      {canUseQuota && onToggleQuota && (
        <Pressable
          onPress={onToggleQuota}
          style={[
            styles.quotaButton,
            quotaEnabled && styles.quotaButtonActive,
          ]}
        >
          <Award
            size={17}
            color={quotaEnabled ? C.green : C.primary}
          />

          <View style={styles.quotaInfo}>
            <Text style={styles.quotaTitle}>
              {quotaEnabled
                ? "Menggunakan kuota member"
                : "Gunakan kuota member"}
            </Text>
            <Text style={styles.quotaDescription}>
              Sisa kuota tersedia: {quotaAvailable} KG
            </Text>
          </View>

          <View
            style={[
              styles.checkbox,
              quotaEnabled && styles.checkboxActive,
            ]}
          />
        </Pressable>
      )}

      {!isPackage && (
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>Subtotal item</Text>
          <Text style={styles.footerValue}>
            {money(Math.round(item.quantity * item.price))}
          </Text>
        </View>
      )}
    </View>
  );
});

export default OrderItemCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    padding: 14,
    marginBottom: 11,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  identity: {
    flex: 1,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    fontSize: 9,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
    overflow: "hidden",
  },
  packageBadge: {
    color: "#B45309",
    backgroundColor: "#FEF3C7",
  },
  serviceBadge: {
    color: C.primary,
    backgroundColor: C.primaryLight,
  },
  quotaBadge: {
    color: C.green,
    backgroundColor: C.greenLight,
    fontSize: 9,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
    overflow: "hidden",
  },
  name: {
    color: C.text,
    fontSize: 14,
    fontWeight: "800",
  },
  price: {
    color: C.muted,
    fontSize: 11,
    marginTop: 5,
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
  },
  quantityLabel: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 9,
    overflow: "hidden",
  },
  stepperButton: {
    width: 34,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F8FA",
  },
  quantityInput: {
    width: 55,
    height: 35,
    textAlign: "center",
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
    padding: 0,
  },
  quotaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 13,
  },
  quotaButtonActive: {
    backgroundColor: C.greenLight,
    borderColor: "#86EFAC",
  },
  quotaInfo: {
    flex: 1,
  },
  quotaTitle: {
    color: C.text,
    fontSize: 11,
    fontWeight: "800",
  },
  quotaDescription: {
    color: C.muted,
    fontSize: 10,
    marginTop: 3,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  checkboxActive: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 13,
    paddingTop: 11,
  },
  footerLabel: {
    color: C.muted,
    fontSize: 11,
  },
  footerValue: {
    color: C.text,
    fontSize: 12,
    fontWeight: "800",
  },
});
