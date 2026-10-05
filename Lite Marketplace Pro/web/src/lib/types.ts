// Shapes returned by the Java API (records in backend/src/main/java/com/litemarket/**/…Dtos.java).

export type Role = "SELLER" | "ADMIN";

export interface StoreView {
  id: number;
  name: string;
  slug: string;
  whatsapp: string;
  currency: string;
  about: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  onlinePayments: boolean;
  whatsappOrders: boolean;
  publicLink: string | null;
  shopUrl: string;
}

export interface PlanView {
  code: string;
  name: string;
  premium: boolean;
  expiresAt: string | null;
  daysLeft: number;
  productLimit: number | null;
  aiCreditsUsed: number;
  aiCreditsLimit: number;
}

export interface MeView {
  id: number;
  email: string;
  fullName: string | null;
  role: Role;
  store: StoreView | null;
  plan: PlanView | null;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  me: MeView;
}

export interface PlanOption {
  code: string;
  name: string;
  price: number;
  days: number;
  popular: boolean;
}

export interface ProviderOption {
  id: string;
  label: string;
}

export interface PublicConfig {
  brandName: string;
  supportEmail: string;
  currency: string;
  freeProductLimit: number;
  freeAiCredits: number;
  paidAiCredits: number;
  plans: PlanOption[];
  providers: ProviderOption[];
  demoPayments: boolean;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  inStock: boolean;
  stockQty: number | null;
  featured: boolean;
  available: boolean;
  createdAt: string;
}

export interface ProductInput {
  name: string;
  price: number;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  inStock: boolean;
  stockQty: number | null;
  featured: boolean;
}

export type OrderStatus = "NEW" | "PENDING_PAYMENT" | "PAID" | "DELIVERED" | "CANCELLED";
export type OrderChannel = "WHATSAPP" | "ONLINE" | "MANUAL";

export interface OrderItem {
  productId: number | null;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  number: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  address: string | null;
  note: string | null;
  channel: OrderChannel;
  status: OrderStatus;
  total: number;
  currency: string;
  paymentProvider: string | null;
  itemsSummary: string | null;
  items: OrderItem[];
  createdAt: string;
  paidAt: string | null;
}

export interface ManualOrderInput {
  customerName: string;
  customerPhone: string | null;
  itemsSummary: string | null;
  total: number;
  status: OrderStatus;
  address: string | null;
  note: string | null;
}

export interface DayPoint {
  date: string;
  total: number;
  orders: number;
}

export interface TopProduct {
  productId: number | null;
  name: string;
  quantity: number;
  revenue: number;
}

export interface Dashboard {
  currency: string;
  revenue: number;
  revenue30: number;
  paidOrders: number;
  newOrders: number;
  totalOrders: number;
  productCount: number;
  averageOrder: number;
  plan: PlanView;
  last7: DayPoint[];
  last30: DayPoint[];
  topProducts: TopProduct[];
  recentOrders: Order[];
  shopUrl: string;
}

export interface StoreInput {
  name: string;
  slug: string;
  whatsapp: string;
  currency: string;
  about: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  onlinePayments: boolean;
  whatsappOrders: boolean;
  publicLink: string | null;
}

export interface PublicProduct {
  id: number;
  name: string;
  price: number;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  available: boolean;
  featured: boolean;
  stockLeft: number | null;
}

export interface Shop {
  name: string;
  slug: string;
  about: string | null;
  whatsapp: string;
  currency: string;
  accentColor: string | null;
  logoUrl: string | null;
  whatsappOrders: boolean;
  onlinePayments: boolean;
  providers: ProviderOption[];
  categories: string[];
  products: PublicProduct[];
  assistant: boolean;
}

export interface CartLine {
  productId: number;
  quantity: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string | null;
  address: string;
  note: string | null;
}

export interface CheckoutInput {
  items: CartLine[];
  customer: CustomerInfo;
  provider?: string;
}

export interface WhatsAppOrder {
  orderNumber: string;
  total: number;
  currency: string;
  whatsappUrl: string;
}

export interface CheckoutStart {
  reference: string;
  checkoutUrl: string;
}

export interface PaymentStatus {
  reference: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  purpose: "SUBSCRIPTION" | "ORDER";
  provider: string;
  amount: number;
  currency: string;
  planCode: string | null;
  planName: string | null;
  planExpiresAt: string | null;
  orderNumber: string | null;
  storeName: string;
  storeSlug: string;
  whatsappUrl: string | null;
  message: string;
}

export interface PaymentView {
  reference: string;
  purpose: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  planCode: string | null;
  planName: string | null;
  note: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface Billing {
  currency: string;
  plans: PlanOption[];
  current: PlanView;
  providers: ProviderOption[];
  history: PaymentView[];
}

// ── AI ──────────────────────────────────────────────────────────────────────────

export type Engine = "claude" | "openai" | "offline" | "none" | "demo";

export interface AiUsage {
  used: number;
  limit: number;
  premium: boolean;
}

export interface ProductWriterResult {
  title: string;
  description: string;
  bullets: string[];
  caption: string;
  hashtags: string[];
  category: string | null;
  engine: Engine;
}

export interface ReplyDrafts {
  intent: string;
  drafts: { label: string; text: string }[];
  engine: Engine;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatReply {
  reply: string;
  suggestions: number[];
  engine: Engine;
}

export interface CoachInsight {
  title: string;
  detail: string;
  impact: "high" | "medium" | "low";
  kind: string;
}

export interface CoachReport {
  headline: string;
  summary: string;
  insights: CoachInsight[];
  actions: string[];
  stats: { label: string; value: string; trend: string | null }[];
  engine: Engine;
}

export interface BroadcastResult {
  message: string;
  short: string;
  engine: Engine;
}

// ── Admin ───────────────────────────────────────────────────────────────────────

export interface AdminOverview {
  users: number;
  stores: number;
  products: number;
  orders: number;
  payingStores: number;
  subscriptionRevenue: number;
  orderVolume: number;
  owedToSellers: number;
  currency: string;
  aiOnline: boolean;
  providers: ProviderOption[];
  demoPayments: boolean;
  commissionPercent: number;
  emailEnabled: boolean;
}

export interface SellerRow {
  storeId: number;
  userId: number;
  storeName: string;
  slug: string;
  email: string;
  whatsapp: string;
  plan: string;
  planName: string;
  planExpiresAt: string | null;
  premium: boolean;
  products: number;
  status: "ACTIVE" | "SUSPENDED";
  role: Role;
  createdAt: string;
  flutterwaveSubaccount: string | null;
  paystackSubaccount: string | null;
  stripeAccount: string | null;
  shopUrl: string;
}

export interface AdminPayment {
  reference: string;
  purpose: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  storeName: string;
  storeSlug: string;
  planName: string | null;
  payerEmail: string | null;
  settlement: string;
  platformFee: number | null;
  sellerAmount: number | null;
  createdAt: string;
  paidAt: string | null;
  note: string | null;
}

export interface PayoutRow {
  storeId: number;
  storeName: string;
  slug: string;
  whatsapp: string;
  email: string;
  owed: number;
  payments: number;
  currency: string;
}
