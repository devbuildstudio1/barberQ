import type { Database, Tables } from "./database";

export type Shop = Tables<"shops">;
export type Barber = Tables<"barbers">;
export type Service = Tables<"services">;
export type Queue = Tables<"queues">;
export type QueueEntry = Tables<"queue_entries">;
export type Review = Tables<"reviews">;
export type Notification = Tables<"notifications">;
export type User = Tables<"users">;

export type ShopStatus = Database["public"]["Enums"]["shop_status"];
export type QueueEntryStatus = Database["public"]["Enums"]["queue_entry_status"];
export type QueueStatus = Database["public"]["Enums"]["queue_status"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];
export type BarberAvailability = Database["public"]["Enums"]["barber_availability"];

/** Row returned by list_public_shops(). */
export type ShopListing = Database["public"]["Functions"]["list_public_shops"]["Returns"][number];

/** Listing enriched with a recommendation score. */
export interface RankedShop extends ShopListing {
  score: number;
}

/** get_queue_snapshot() payload. */
export interface QueueSnapshot {
  queue_id: string;
  shop_id: string;
  barber_id: string | null;
  queue_date: string;
  token_prefix: string;
  status: QueueStatus;
  shop_open: boolean;
  queue_paused: boolean;
  current_token: number | null;
  last_token_number: number;
  waiting_count: number;
  serving_token: number | null;
  estimated_wait_minutes: number;
  tokens: { token_number: number; status: QueueEntryStatus; estimated_duration_minutes: number }[];
  updated_at: string;
}

/** get_shop_live_status() payload. */
export interface ShopLiveStatus {
  shop_id: string;
  is_open: boolean;
  queue_paused: boolean;
  waiting_count: number;
  estimated_wait_minutes: number;
}

/** get_my_active_queue_entry() payload. */
export interface MyQueueEntry {
  entry: QueueEntry;
  queue: {
    id: string;
    token_prefix: string;
    status: QueueStatus;
    current_token: number | null;
    waiting_count: number;
    updated_at: string;
  };
  shop: {
    id: string;
    name: string;
    address: string;
    image: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    is_open: boolean;
    queue_paused: boolean;
  };
  service: { id: string; name: string; price: number; duration_minutes: number } | null;
  barber: { id: string; name: string; image: string | null } | null;
  people_ahead: number;
  estimated_wait_minutes: number;
}

/** get_shop_queue_board() payload. */
export interface QueueBoard {
  date: string;
  queues: {
    id: string;
    barber_id: string | null;
    barber_name: string | null;
    token_prefix: string;
    status: QueueStatus;
    current_token: number | null;
    waiting_count: number;
    last_token_number: number;
    estimated_wait_minutes: number;
    updated_at: string;
  }[];
  entries: QueueBoardEntry[];
  completed_today: number;
}

export interface QueueBoardEntry {
  id: string;
  queue_id: string;
  token_prefix: string;
  token_number: number;
  status: QueueEntryStatus;
  customer_name: string;
  customer_phone: string | null;
  service_name: string;
  service_price: number;
  estimated_duration_minutes: number;
  barber_id: string | null;
  joined_at: string;
  called_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface ReviewableVisit {
  queue_entry_id: string;
  shop_id: string;
  shop_name: string;
  barber_id: string | null;
  barber_name: string | null;
  service_name: string;
  completed_at: string;
}

export interface AdminStats {
  total_users: number;
  total_customers: number;
  total_shops: number;
  pending_shops: number;
  approved_shops: number;
  active_queues: number;
  completed_services: number;
  completed_today: number;
  total_barbers: number;
  total_reviews: number;
  waiting_now: number;
}

export interface DailyReportRow {
  date: string;
  joined: number;
  completed: number;
  cancelled: number;
  no_show: number;
  new_users: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}
