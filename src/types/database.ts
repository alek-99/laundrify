export type OrderStatus =
  | "received"
  | "processing"
  | "ready"
  | "completed"
  | "washing"
  | "drying"
  | "ironing"
  | "cancelled";

export type PaymentStatus = "unpaid" | "partial" | "paid";

export type PaymentMethod = "cash" | "qris" | "transfer" | "other";

export type CashDirection = "income" | "expense";

export type ServiceUnit = "kg" | "pcs" | "mtr" | "m2";
export type ServiceCategory = "kiloan" | "satuan" | "karpet";
export type PackageType = "CKS" | "CKL" | "ST";
export type ItemType = "service" | "package";

export type MemberSubscriptionStatus = "active" | "used_up" | "cancelled";
export type PrintType = "receipt" | "label" | "member_card";
export type WhatsAppMessageType = "invoice" | "info";

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  total_orders: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Service {
  id: number;
  name: string;
  category: ServiceCategory;
  package_type: PackageType | null;
  description: string | null;
  unit: ServiceUnit;
  price: number;
  estimated_hours: number;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface MemberPackage {
  id: number;
  code: string;
  name: string;
  package_type: PackageType;
  quota_kg: number;
  price: number;
  free_pickup_delivery: number;
  is_active: number;
  created_at: string;
}

export interface MemberSubscription {
  id: number;
  member_no: string;
  customer_id: number;
  package_id: number | null;
  package_name: string;
  package_type: PackageType;
  quota_kg: number;
  price_paid: number;
  start_date: string;
  expired_at: string | null;
  purchase_order_id: number | null;
  status: MemberSubscriptionStatus;
  card_printed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberSubscriptionWithBalance extends MemberSubscription {
  used_kg: number;
  remaining_kg: number;
}

export interface MemberUsage {
  id: number;
  subscription_id: number;
  order_id: number;
  order_item_id: number | null;
  kg_used: number;
  used_at: string;
  is_void: number;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  order_date: string;
  estimated_completion: string | null;
  completed_at: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  member_discount: number;
  discount: number;
  total: number;
  paid_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OrderItem {
  id: number;
  order_id: number;
  item_type: ItemType;
  service_id: number | null;
  package_id: number | null;
  service_name: string;
  unit: string;
  quantity: number;
  price: number;
  subtotal: number;
  paid_by_subscription_id: number | null;
  notes: string | null;
  created_at?: string;
}

export interface OrderStatusHistory {
  id: number;
  order_id: number;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  created_at: string;
}

export interface CashCategory {
  id: number;
  name: string;
  type: CashDirection;
  description: string | null;
  is_active: number;
}

export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  method: PaymentMethod;
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  is_void: number;
  created_at?: string;
}

export interface CashTransaction {
  id: number;
  category_id: number;
  payment_id: number | null;
  direction: CashDirection;
  amount: number;
  description: string;
  transaction_date: string;
  created_at?: string;
  is_void?: number;
}

export interface PrintLog {
  id: number;
  print_type: PrintType;
  order_id: number | null;
  subscription_id: number | null;
  copies: number;
  printed_at: string;
}

export interface WhatsAppLog {
  id: number;
  order_id: number | null;
  customer_id: number | null;
  phone: string;
  message_type: WhatsAppMessageType;
  message: string;
  created_at: string;
}

export interface OrderInputItem {
  item_type?: ItemType;
  service_id?: number | null;
  package_id?: number | null;
  quantity: number;
  notes?: string | null;
  use_subscription_id?: number | null;
}

export interface CreateOrderInput {
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  items: OrderInputItem[];
  discount?: number;
  estimated_completion?: string | null;
  notes?: string | null;
  initial_payment?: {
    amount: number;
    method: PaymentMethod;
    reference_number?: string;
    notes?: string;
  };
}

export interface UpdateOrderInput {
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  items?: OrderInputItem[];
  discount?: number;
  estimated_completion?: string | null;
  notes?: string | null;
}

export interface OrderWithDetails extends Order {
  customer?: Customer | null;
  items: OrderItem[];
  payments: Payment[];
  paid: number;
  remaining: number;
  status_history?: OrderStatusHistory[];
}
