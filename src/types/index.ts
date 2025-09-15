// src/types/index.ts

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'trainer' | 'client' | 'admin';
  avatar_url?: string;
  bio?: string;
  specialties?: string[];
  hourly_rate?: number;
  experience?: string;
  qualifications?: string;
  location?: string;
  identity_verified?: boolean;
  created_at: string;
}

export interface Lesson {
  id: string;
  trainer_id: string;
  title: string;
  description: string;
  category: 'yoga' | 'pilates' | 'stretch' | 'strength' | 'dance' | 'boxing' | 'hiit' | 'other';
  duration: number; // minutes
  max_participants: number;
  price: number;
  date: string;
  time: string;
  location: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  created_at: string;
  start_at?: string | null;
  trainer?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

export interface IdentityVerification {
  id: string;
  trainer_id: string;
  document_type: string;
  document_image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  trainer?: User;
  reviewer?: User;
}

export interface Booking {
  id: string;
  lesson_id: string;
  client_id: string;
  trainer_id?: string;
  status: 'reserved' | 'pending' | 'confirmed' | 'cancelled' | 'canceled' | 'completed'; // 英米どちらも許容
  payment_status: 'pending' | 'paid' | 'refunded';
  created_at: string;
  cancelled_by_role?: 'trainer' | 'client' | null;
  cancelled_by_user_id?: string | null;
  cancelled_at?: string | null;
  no_show?: boolean | null;
  lesson?: Lesson;
  client?: User;
}

export interface Payment {
  id: string;
  lesson_id: string;
  trainee_id: string;
  amount: number;
  stripe_fee: number | null;
  net_amount: number | null;
  paid_at: string | null;
  status: 'pending' | 'paid' | 'refunded' | 'cancelled' | 'failed';
  payment_intent_id?: string | null;
  charge_id?: string | null;
  stripe_session_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Refund {
  id: string;
  lesson_id: string;
  trainee_id: string;
  payment_id: string;
  refund_amount: number;
  refund_reason: string;
  refund_status: 'pending' | 'approved' | 'refunded' | 'rejected';
  refund_date?: string;
  stripe_refund_id?: string;
  created_at: string;
  updated_at: string;
  lesson?: Lesson;
  trainee?: User;
  payment?: Payment;
}

export interface Review {
  id: string;
  trainer_id: string;
  client_id: string;
  lesson_id?: string;
  rating: number; // 1-5
  comment: string;
  created_at: string;
  client?: { name: string };
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export interface Payment {
  id: string;

  lesson_id: string;
  trainee_id: string;
  booking_id?: string | null;

  amount: number;
  amount_total?: number | null;
  currency?: string | null;

  // Stripe識別子（存在しない/未保存の場合もあるため optional + nullable）
  stripe_session_id?: string | null;
  payment_intent_id?: string | null;
  charge_id?: string | null;
  balance_tx_id?: string | null;

  // 手数料・実入金・支払日時は Webhook 後に確定し得るため nullable
  stripe_fee: number | null;
  net_amount: number | null;
  paid_at: string | null;

  status: 'pending' | 'paid' | 'refunded' | 'cancelled' | 'failed';

  created_at: string;
  updated_at?: string | null;
}

export interface Refund {
  id: string;
  lesson_id: string;
  trainee_id: string;
  payment_id: string;
  refund_amount: number;
  refund_reason: string;
  refund_status: 'pending' | 'approved' | 'refunded' | 'rejected';
  refund_date?: string;
  stripe_refund_id?: string;
  created_at: string;
  updated_at: string;
  lesson?: Lesson;
  trainee?: User;
  payment?: Payment;
}

export interface PayoutRequest {
  id: string;
  trainer_id: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  payout_amount: number;
  transfer_fee: number;
  net_payout: number;
  payout_eligible_date: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  request_date: string;
  approval_date?: string;
  payout_date?: string;
  created_at: string;
  updated_at: string;
  trainer?: User;
}
