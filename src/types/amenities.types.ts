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

export interface AmenityBooking {
  id: string;
  amenity_id: string;
  residential_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string | null;
  created_at: string;
}
