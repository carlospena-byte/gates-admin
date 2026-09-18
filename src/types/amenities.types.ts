// Amenity types
export type UnitType = 'apartment' | 'house' | 'townhouse' | 'studio';

export interface Amenity {
  id: string;
  residential_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  location: string | null;
  capacity: number | null;
  requires_booking: boolean;
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
}

export interface UpdateAmenity {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  location?: string | null;
  capacity?: number | null;
  requires_booking?: boolean;
}

export type AmenityBookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface AmenityBooking {
  id: string;
  amenity_id: string;
  residential_id: string;
  user_id: string;
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

// Booking joined with the booking user's email, same join-on-select shape
// as VisitorWithInviter.
export type AmenityBookingWithUser = AmenityBooking & {
  profiles: { email: string | null } | null;
};
