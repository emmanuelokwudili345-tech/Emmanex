export interface DeliveryDetails {
  recipientName: string;
  recipientEmail: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  deliveryMethod: "standard";
  paymentMethod: "demo";
}

export interface OrderItemSummary {
  productName: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export type CustomerOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface CustomerOrder {
  id: string;
  status: CustomerOrderStatus;
  isDemo: boolean;
  subtotal: string;
  shippingFee: string;
  total: string;
  createdAt: string;
  recipientName: string;
  recipientEmail: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
  deliveryMethod: string;
  paymentMethod: string;
  paymentStatus: string;
  items: OrderItemSummary[];
}

export type OrderConfirmation = CustomerOrder;

export interface OrderDependencies {
  findCustomer(neonAuthUserId: string): Promise<{ id: string } | undefined>;
  listCustomerOrders(userId: string): Promise<CustomerOrder[]>;
  findCustomerOrder(userId: string, orderId: string): Promise<CustomerOrder | undefined>;
  createDemoOrder(input: {
    userId: string;
    delivery: DeliveryDetails;
  }): Promise<OrderConfirmation>;
}
