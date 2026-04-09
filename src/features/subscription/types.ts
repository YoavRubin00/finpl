export type SubscriptionTier = "basic" | "pro";

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "expired";

export interface Subscription {
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  payPlusCustomerId: string | null;
}
