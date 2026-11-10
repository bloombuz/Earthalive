export type UserRole = 'admin' | 'staff';
export type UserStatus = 'active' | 'disabled';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
  // Optional historical legacy fields
  teamId?: string;
  teamName?: string;
}

export type AccommodationId = 'firefly' | 'sunbird' | 'woodpecker' | 'bunkbeds';

export interface AccommodationInfo {
  id: AccommodationId;
  name: string;
  type: 'treehouse' | 'bunkbeds';
  maxCapacity: number;
  basePrice: number;
  description: string;
  image: string;
  badge: string;
  wing: string;
}

export interface ContainerInfo {
  id: string; // 'c1', 'c2', 'c3', 'c4'
  name: string; // 'Container 1', ...
  totalBeds: number; // 6
  bedNumbers: number[]; // [1, 2, 3, 4, 5, 6]
}

export type BookingStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'deleted';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export interface FoodSelection {
  vegCount: number;
  nonVegCount: number;
  noFoodCount: number;
  mealCount: number;
  vegPrice: number;
  nonVegPrice: number;
  totalFoodCharge: number;
}

export interface Booking {
  id: string;
  bookingNumber: string; // e.g. "EA-1042"
  guestName: string;
  guestPhone: string;
  guestCount: number;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  nights: number;
  accommodationId: AccommodationId;
  accommodationName: string;
  containerIds?: string[];
  bedNumbers?: number[];
  isHolidayPricing: boolean;
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  accommodationSubtotal: number;
  discountAmount: number;
  discountedAccommodationSubtotal: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  foodAvailed: boolean;
  foodDetails: FoodSelection;
  grandTotal: number;
  advancePaid: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  bookingSourceMemberId: string;
  bookingSourceMemberName: string;
  // Historical legacy fields preserved for existing bookings
  bookingTeamId?: string;
  bookingTeamName?: string;
  notes?: string;
  preferences?: string[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
}

export interface PaymentRecord {
  id: string;
  bookingId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Other';
  collectedByMemberId: string;
  collectedByMemberName: string;
  transactionRef?: string;
  notes?: string;
  recordedBy: string;
  recordedByName: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  bookingId: string;
  action: string;
  changedBy: string;
  changedByName: string;
  timestamp: string;
  details: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

export interface MaintenanceBlock {
  id: string;
  accommodationId: AccommodationId;
  containerId?: string;
  bedNumbers?: number[];
  startDate: string;
  endDate: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export const ACCOMMODATIONS: AccommodationInfo[] = [
  {
    id: 'firefly',
    name: 'Firefly Treehouse',
    type: 'treehouse',
    maxCapacity: 6,
    basePrice: 6000,
    description: 'Elevated timber sanctuary suspended in the rain tree canopy with private sunset deck.',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
    badge: 'Canopy Villa',
    wing: 'East Canopy Wing',
  },
  {
    id: 'sunbird',
    name: 'Sunbird Treehouse',
    type: 'treehouse',
    maxCapacity: 6,
    basePrice: 6000,
    description: 'Perched overlooking flowering jacarandas with panoramic dawn views and outdoor lounge.',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    badge: 'Signature Suite',
    wing: 'Sun Valley Wing',
  },
  {
    id: 'woodpecker',
    name: 'Woodpecker Treehouse',
    type: 'treehouse',
    maxCapacity: 6,
    basePrice: 6000,
    description: 'Surrounded by ancient bamboo groves and teak trees with tranquil forest stream views.',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    badge: 'Forest Hideaway',
    wing: 'Streamline Wing',
  },
  {
    id: 'bunkbeds',
    name: 'Bunkbeds Eco-Containers',
    type: 'bunkbeds',
    maxCapacity: 24,
    basePrice: 1250,
    description: '4 climate-controlled modern eco-containers featuring 24 handcrafted teak bunkbeds.',
    image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80',
    badge: '4 Containers · 24 Beds',
    wing: 'Bamboo Meadow Pods',
  },
];

export const CONTAINERS: ContainerInfo[] = [
  { id: 'c1', name: 'Container 1', totalBeds: 6, bedNumbers: [1, 2, 3, 4, 5, 6] },
  { id: 'c2', name: 'Container 2', totalBeds: 6, bedNumbers: [7, 8, 9, 10, 11, 12] },
  { id: 'c3', name: 'Container 3', totalBeds: 6, bedNumbers: [13, 14, 15, 16, 17, 18] },
  { id: 'c4', name: 'Container 4', totalBeds: 6, bedNumbers: [19, 20, 21, 22, 23, 24] },
];
