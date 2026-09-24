// Amenity types
export type UnitType = 'apartment' | 'house' | 'townhouse' | 'studio';

export type BookingLimitPeriod = 'day' | 'week' | 'month';

export interface Amenity {
  id: string;
  residential_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  location: string | null;
  capacity: number | null;
  requires_booking: boolean;
  terms: string | null;
  opening_time: string | null;
  closing_time: string | null;
  available_days: string[];
  requires_payment: boolean;
  price: number | null;
  payment_methods: string[];
  booking_duration_minutes: number | null;
  requires_cleaning: boolean;
  cleanup_minutes: number | null;
  created_at: string;
}

export interface InsertAmenity {
  residential_id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  location?: string | null;
  capacity?: number | null;
  requires_booking?: boolean;
  terms?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  available_days?: string[];
  requires_payment?: boolean;
  price?: number | null;
  payment_methods?: string[];
  booking_duration_minutes?: number | null;
  requires_cleaning?: boolean;
  cleanup_minutes?: number | null;
}

export interface UpdateAmenity {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  location?: string | null;
  capacity?: number | null;
  requires_booking?: boolean;
  terms?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  available_days?: string[];
  requires_payment?: boolean;
  price?: number | null;
  payment_methods?: string[];
  booking_duration_minutes?: number | null;
  requires_cleaning?: boolean;
  cleanup_minutes?: number | null;
}

// Reusable "featured services" catalog tag (WiFi, sillas, toallas...).
// `residential_id: null` is a global, platform-managed entry every
// residential sees (seeded WiFi, Alberca, Gimnasio...); a non-null value is
// that one residential's own extra, scoped like addons/charges.
export interface Service {
  id: string;
  residential_id: string | null;
  name: string;
  icon: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InsertService {
  // Omit (or pass null) to create a global entry — platform admin only,
  // enforced by RLS. Residential-scoped managers always pass their own id.
  residential_id?: string | null;
  name: string;
  icon?: string | null;
  is_active?: boolean;
}

export interface UpdateService {
  name?: string;
  icon?: string | null;
  is_active?: boolean;
}

export interface AmenityServiceLink {
  amenity_id: string;
  service_id: string;
  is_featured: boolean;
}

// A service attached to an amenity, joined with its catalog row.
export type AmenityServiceWithService = AmenityServiceLink & {
  services: Service;
};

// A single service selection made in the amenity form, before it's
// persisted as an amenity_services row.
export interface AmenityServiceSelection {
  serviceId: string;
  isFeatured: boolean;
}

export interface AmenityImage {
  id: string;
  amenity_id: string;
  residential_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface AmenityBookingLimit {
  id: string;
  amenity_id: string;
  max_count: number;
  period: BookingLimitPeriod;
  created_at: string;
}

// A booking-limit rule as edited in the form, before it has an id.
export interface AmenityBookingLimitRule {
  maxCount: number;
  period: BookingLimitPeriod;
}

// Amenity joined with everything the edit form needs to pre-fill: its
// images, its selected services (with the catalog row), and its booking
// limit rules.
export type AmenityWithDetails = Amenity & {
  amenity_images: AmenityImage[];
  amenity_services: AmenityServiceWithService[];
  amenity_booking_limits: AmenityBookingLimit[];
};

export type AmenityBookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface AmenityBooking {
  id: string;
  amenity_id: string;
  residential_id: string;
  user_id: string;
  unit_id: string | null;
  start_time: string;
  end_time: string;
  status: AmenityBookingStatus;
  notes: string | null;
  created_at: string;
}

export interface CreateAmenityBookingDto {
  amenity_id: string;
  residential_id: string;
  user_id: string;
  unit_id: string;
  start_time: string;
  end_time: string;
  status?: AmenityBookingStatus;
  notes?: string | null;
}

export interface UpdateAmenityBookingDto {
  start_time?: string;
  end_time?: string;
  status?: AmenityBookingStatus;
  notes?: string | null;
}

// Booking joined with the booking user's email, the assigned unit's name,
// and the amenity's name, same join-on-select shape as VisitorWithInviter.
export type AmenityBookingWithUser = AmenityBooking & {
  profiles: { email: string | null } | null;
  units: { name: string } | null;
  amenities: { name: string } | null;
};
