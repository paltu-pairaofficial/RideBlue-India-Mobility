export type UserRole = 'rider' | 'driver' | 'admin';

export type DriverApprovalStatus = 'pending' | 'approved' | 'rejected' | 'correction_required';

export type RideStatus =
  | 'requested'
  | 'accepted'
  | 'driver_arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'razorpay' | 'upi';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type RefundStatus = 'none' | 'requested' | 'processing' | 'completed' | 'failed';

export type VehicleCategoryType = 'economy' | 'sedan' | 'suv' | 'xl' | 'airport_transfer';

export interface LocationPoint {
  address: string;
  lat: number;
  lng: number;
  landmark?: string;
}

export interface RideStop {
  id: string;
  address: string;
  lat: number;
  lng: number;
  order: number;
}

export interface FareBreakdown {
  baseFare: number;
  distanceCharge: number;
  timeCharge: number;
  extraPassengerCharge?: number;
  airportLevyAmount?: number;
  tollCharges?: number;
  taxes: number;
  surgeMultiplier?: number;
  discount: number;
  total: number;
  currency: string;
}

export interface RideReview {
  id: string;
  rideId: string;
  riderId: string;
  driverId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
}

export interface RideBooking {
  id: string;
  bookingCode: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  riderAvatar?: string;

  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  driverAvatar?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  driverLocation?: { lat: number; lng: number };

  vehicleCategory: VehicleCategoryType;
  pickup: LocationPoint;
  destination: LocationPoint;
  stops?: RideStop[];

  scheduledDate?: string;
  scheduledTime?: string;
  passengerCount: number;

  status: RideStatus;
  distanceKm: number;
  estimatedDurationMin: number;
  fareBreakdown: FareBreakdown;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;

  cancellationReason?: string;
  cancelledBy?: 'rider' | 'driver' | 'admin';
  cancellationFee?: number;
  refundStatus?: RefundStatus;

  reviewSubmitted?: boolean;
  review?: RideReview;

  emergencySosActive?: boolean;
  emergencyAlertTime?: string;

  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface DriverProfile {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  vehicleCategory: VehicleCategoryType;
  vehicleModel: string;
  vehicleNumber: string;
  year?: number;
  rating: number;
  ratingCount: number;
  totalTrips: number;
  acceptanceRate?: number; // 0-100%, unavailable until measured
  isOnline: boolean;
  approvalStatus: DriverApprovalStatus;
  rejectionReason?: string;
  currentLocation?: { lat: number; lng: number };
  earningsToday?: number;
  earningsWeek?: number;
  documents: {
    licenseNumber: string;
    licenseExpiry: string;
    rcNumber: string;
    insuranceValidUntil: string;
    pucNumber: string;
    licenseVerified: boolean;
    rcVerified: boolean;
  };
  joinedDate: string;
}

export interface RiderProfile {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  rating: number;
  totalRides: number;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  savedPlaces: Array<{
    id: string;
    label: string; // Home, Work, Airport, Gym
    address: string;
    lat: number;
    lng: number;
  }>;
  favouriteDrivers: string[]; // driver IDs
  joinedDate: string;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string;
  avatar: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  maxCap: number;
  minRideAmount: number;
  validUntil: string;
  active: boolean;
  usageCount: number;
  description: string;
}

export interface SupportTicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole | 'support_agent';
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  category: string;
  subject: string;
  description: string;
  bookingRef?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  messages: SupportTicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  targetRole: UserRole | 'all';
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface VehicleCategoryConfig {
  id: VehicleCategoryType;
  name: string;
  tagline: string;
  luggage: string;
  description: string;
  suitableFor: string;
  availableInWB: boolean;
}
