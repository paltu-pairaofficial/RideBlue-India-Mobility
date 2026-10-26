import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

import {

  RideBooking,

  DriverProfile,

  RiderProfile,

  PromoCode,

  SupportTicket,

  RideStatus,

  DriverApprovalStatus,

  PaymentMethod,

  VehicleCategoryType,

  LocationPoint,

  RideStop,

} from '../types';





import { useAuth } from './AuthContext';

import { isSupabaseConfigured, supabase } from '../supabase/client';



export interface BookingDraft {

  pickup: LocationPoint;



  destination: LocationPoint;

  stops: RideStop[];

  scheduledDate?: string;

  scheduledTime?: string;

  passengerCount: number;

  vehicleCategory: VehicleCategoryType;

  paymentMethod: PaymentMethod;

  appliedPromo?: PromoCode | null;

}



export const DEFAULT_BOOKING_DRAFT: BookingDraft = {
  pickup: { address: '', landmark: '', lat: 0, lng: 0 },
  destination: { address: '', landmark: '', lat: 0, lng: 0 },
  stops: [],
  passengerCount: 1,
  vehicleCategory: 'sedan',
  paymentMethod: 'razorpay',
  appliedPromo: null,
};



interface CreateBookingParams {

  pickup: LocationPoint;

  destination: LocationPoint;

  stops?: RideStop[];

  vehicleCategory: VehicleCategoryType;

  scheduledDate?: string;

  scheduledTime?: string;

  passengerCount: number;

  paymentMethod: PaymentMethod;

  quoteToken: string;
  idempotencyKey: string;

}



interface RideContextType {
  bookings: RideBooking[];
  drivers: DriverProfile[];
  dataLoading: boolean;
  dataError: string | null;

  riderProfile: RiderProfile;

  promoCodes: PromoCode[];

  supportTickets: SupportTicket[];

  activeRiderBooking: RideBooking | null;

  activeDriverTrip: RideBooking | null;

  bookingDraft: BookingDraft;

  updateBookingDraft: (updates: Partial<BookingDraft>) => void;

  createBooking: (params: CreateBookingParams) => Promise<RideBooking>;

  acceptBooking: (bookingId: string, driverId: string) => Promise<boolean>;

  updateRideStatus: (bookingId: string, status: RideStatus) => Promise<void>;

  cancelBooking: (bookingId: string, reason: string, cancelledBy: 'rider' | 'driver' | 'admin') => Promise<void>;

  submitReview: (bookingId: string, rating: number, comment?: string) => Promise<void>;

  triggerEmergencySos: (bookingId: string) => Promise<void>;

  updateDriverApproval: (driverId: string, status: DriverApprovalStatus, reason?: string) => Promise<void>;

  toggleDriverOnline: (driverId: string) => Promise<void>;

  createSupportTicket: (

    subject: string,

    category: string,

    description: string,

    bookingRef?: string

  ) => Promise<SupportTicket>;

  addTicketMessage: (ticketId: string, message: string, senderRole?: 'rider' | 'driver' | 'admin') => Promise<void>;

  updateTicketStatus: (ticketId: string, status: 'open' | 'in_progress' | 'resolved' | 'closed') => Promise<void>;

  applyPromoCode: (code: string, amount: number) => { success: boolean; promo?: PromoCode; message: string };

  addSavedPlace: (label: string, address: string, lat: number, lng: number) => void;

  removeSavedPlace: (id: string) => void;

  toggleFavouriteDriver: (driverId: string) => void;

  updateRiderProfile: (updates: Partial<RiderProfile>) => void;

  updateDriverDocuments: (driverId: string, docs: Partial<DriverProfile['documents']>) => void;


  refreshData: () => Promise<void>;

}



const RideContext = createContext<RideContextType | undefined>(undefined);



function mapDbRideToBooking(row: any): RideBooking {

  return {

    id: row.id,

    bookingCode: row.booking_code,

    riderId: row.rider_id,

    riderName: row.rider?.full_name || row.rider_name || '',

    riderPhone: row.rider?.phone || row.rider_phone || '',

    riderAvatar: row.rider?.avatar_url,

    driverId: row.driver_id,

    driverName: row.driver?.profile?.full_name || row.driver_name,

    driverPhone: row.driver?.profile?.phone || row.driver_phone,

    driverRating: row.driver?.profile?.rating == null ? undefined : Number(row.driver.profile.rating),

    vehicleModel: row.driver?.vehicle_make_model || row.vehicle_model,

    vehiclePlate: row.driver?.vehicle_plate || row.vehicle_plate,

    driverLocation: row.driver_location

      ? { lat: Number(row.driver_location.lat), lng: Number(row.driver_location.lng) }

      : undefined,

    vehicleCategory: row.vehicle_category as VehicleCategoryType,

    pickup: {

      address: row.pickup_address,

      lat: Number(row.pickup_lat),

      lng: Number(row.pickup_lng),

    },

    destination: {

      address: row.destination_address,

      lat: Number(row.destination_lat),

      lng: Number(row.destination_lng),

    },

    stops: (row.ride_stops || []).map((s: any) => ({

      id: s.id,

      address: s.address,

      lat: Number(s.lat),

      lng: Number(s.lng),

      order: s.stop_order,

    })),

    scheduledDate: row.scheduled_for ? row.scheduled_for.split('T')[0] : undefined,

    scheduledTime: row.scheduled_for ? row.scheduled_for.split('T')[1]?.slice(0, 5) : undefined,

    passengerCount: Number(row.passenger_count),

    status: row.status,

    distanceKm: Number(row.distance_km),

    estimatedDurationMin: Number(row.estimated_duration_min),

    fareBreakdown: {

      baseFare: Number(row.base_fare),

      distanceCharge: Number(row.distance_fare),

      extraPassengerCharge: row.extra_passenger_charge == null ? undefined : Number(row.extra_passenger_charge),

      airportLevyAmount: row.airport_levy_amount == null ? 0 : Number(row.airport_levy_amount),

      timeCharge: Number(row.time_fare),

      tollCharges: row.toll_charges == null ? undefined : Number(row.toll_charges),

      taxes: Number(row.taxes),

      surgeMultiplier: row.surge_multiplier == null ? undefined : Number(row.surge_multiplier),

      discount: Number(row.discount),

      total: Number(row.total_fare),

      currency: 'INR',

    },

    paymentMethod: row.payment_method as PaymentMethod,

    paymentStatus: row.payment_status,

    cancellationReason: row.cancellation_reason,

    cancelledBy: row.cancelled_by,

    cancellationFee: row.cancellation_fee == null ? undefined : Number(row.cancellation_fee),

    refundStatus: row.refund_status,

    emergencySosActive: !!row.emergency_sos_active,

    emergencyAlertTime: row.emergency_sos_time,

    createdAt: row.created_at,

    acceptedAt: row.accepted_at,

    startedAt: row.started_at,

    completedAt: row.completed_at,

    cancelledAt: row.cancelled_at,

  };

}



export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const { currentUser } = useAuth();



  const [bookings, setBookings] = useState<RideBooking[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);




  const [riderProfile, setRiderProfile] = useState<RiderProfile>({

    id: '',

    userId: currentUser?.id || '',

    name: currentUser?.name || 'Rider',

    phone: currentUser?.phone || '',

    email: currentUser?.email || '',

    avatar: currentUser?.avatar || '',

    rating: 0,

    totalRides: 0,

    emergencyContact: {

      name: '',

      phone: '',

      relationship: '',

    },

    savedPlaces: [],

    favouriteDrivers: [],

    joinedDate: '',

  });



  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);

  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);



  const [bookingDraft, setBookingDraft] = useState<BookingDraft>(DEFAULT_BOOKING_DRAFT);



  // Operational records are sourced from Supabase only. Booking drafts remain in memory.
  // Sequence guard prevents an older account's slow query from overwriting a newer session.
  const refreshSequence = useRef(0);

  const refreshData = useCallback(async () => {
    const sequence = ++refreshSequence.current;

    if (!isSupabaseConfigured || !supabase || !currentUser) {
      setDataLoading(false);
      setDataError(!isSupabaseConfigured ? 'Supabase is not configured. Operational data is unavailable.' : null);
      setBookings([]);
      setDrivers([]);
      setSupportTickets([]);
      setPromoCodes([]);
      setRiderProfile({ id: '', userId: '', name: '', phone: '', email: '', avatar: '', rating: 0, totalRides: 0, emergencyContact: { name: '', phone: '', relationship: '' }, savedPlaces: [], favouriteDrivers: [], joinedDate: '' });
      return;
    }



    setDataLoading(true);
    setDataError(null);
    setBookings([]);
    setDrivers([]);
    setSupportTickets([]);
    setPromoCodes([]);
    setRiderProfile({ id: '', userId: currentUser.id, name: '', phone: '', email: '', avatar: '', rating: 0, totalRides: 0, emergencyContact: { name: '', phone: '', relationship: '' }, savedPlaces: [], favouriteDrivers: [], joinedDate: '' });
    try {
      // Load the signed-in user's profile from Supabase.
      const { data: dbProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, phone, avatar_url, role, rating, total_trips, created_at')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      if (sequence !== refreshSequence.current) return;

      if (profileError) {
        setDataError(`Profile data could not be loaded: ${profileError.message}`);
        console.error('Failed to load rider profile:', profileError.message);
      } else if (dbProfile) {
        setRiderProfile((previous) => ({
          ...previous,
          id: dbProfile.id,
          userId: dbProfile.user_id,
          name: dbProfile.full_name || currentUser.name || 'Rider',
          phone: dbProfile.phone || '',
          email: dbProfile.email || currentUser.email || '',
          avatar: dbProfile.avatar_url || '',
          rating: Number(dbProfile.rating || 0),
          totalRides: Number(dbProfile.total_trips || 0),
          joinedDate: dbProfile.created_at?.split('T')[0] || previous.joinedDate,
        }));
      }

      // 1. Load only role-appropriate driver data. License/document fields are admin/owner-only.
      const role = String(dbProfile?.role || '').toLowerCase();
      const adminDriverColumns = `id, profile_id, vehicle_category, vehicle_make_model, vehicle_plate, vehicle_year,
        license_number, license_expiry, rc_number, insurance_expiry, puc_number, approval_status, rejection_reason,
        is_online, acceptance_rate, created_at,
        profile:profiles!drivers_profile_id_fkey(id, user_id, full_name, email, phone, avatar_url, rating, total_trips)`;
      let driverQuery: any;
      if (role === 'rider' || role === 'customer') {
        driverQuery = supabase.from('public_driver_directory').select('*');
      } else {
        driverQuery = supabase.from('drivers').select(adminDriverColumns);
        if (role === 'driver' && dbProfile?.id) driverQuery = driverQuery.eq('profile_id', dbProfile.id);
      }
      const { data: dbDrivers, error: driversError } = await driverQuery;
      if (sequence !== refreshSequence.current) return;

      if (driversError) {
        setDataError((previous) => previous || `Driver data could not be loaded: ${driversError.message}`);
        console.error('Failed to load drivers:', driversError.message);

      } else {

        console.log('Drivers loaded from Supabase:', dbDrivers?.length ?? 0);

      }



      if (dbDrivers) {
        // Calculate driver ratings from actual passenger reviews.
        const { data: driverReviews, error: driverReviewsError } = await supabase
          .from('reviews')
          .select('driver_id, rating');

        if (sequence !== refreshSequence.current) return;

        if (driverReviewsError) {
          throw new Error(
            `Driver ratings could not be loaded: ${driverReviewsError.message}`
          );
        }

        const ratingStats = new Map<
          string,
          { total: number; count: number }
        >();

        for (const review of driverReviews || []) {
          const value = Number(review.rating);

          if (
            !review.driver_id ||
            !Number.isInteger(value) ||
            value < 1 ||
            value > 5
          ) {
            continue;
          }

          const stats = ratingStats.get(review.driver_id) || {
            total: 0,
            count: 0,
          };

          stats.total += value;
          stats.count += 1;
          ratingStats.set(review.driver_id, stats);
        }

        const mappedDrivers: DriverProfile[] = dbDrivers.map((d: any) => {
          const stats = ratingStats.get(d.id);
          const ratingCount = stats?.count ?? 0;

          return {
            id: d.id,
            userId: d.profile?.user_id || d.profile_id,
            name: d.profile?.full_name || '',
            phone: d.profile?.phone || '',
            email: d.profile?.email || '',
            avatar: d.profile?.avatar_url || '',
            vehicleCategory: d.vehicle_category || 'sedan',
            vehicleModel: d.vehicle_make_model || '',
            vehicleNumber: d.vehicle_plate || '',
            year: d.vehicle_year == null ? undefined : Number(d.vehicle_year),

            // Never use the stored profile rating as a substitute for reviews.
            rating:
              ratingCount > 0
                ? Number((stats!.total / ratingCount).toFixed(2))
                : 0,
            ratingCount,

            totalTrips: Number(d.profile?.total_trips || 0),
            acceptanceRate:
              d.acceptance_rate == null
                ? undefined
                : Number(d.acceptance_rate),
            isOnline: !!d.is_online,
            approvalStatus: d.approval_status || 'pending',
            rejectionReason: d.rejection_reason,

            documents: {
              licenseNumber: d.license_number || '',
              licenseExpiry: d.license_expiry || '',
              rcNumber: d.rc_number || '',
              insuranceValidUntil: d.insurance_expiry || '',
              pucNumber: d.puc_number || '',
              licenseVerified: d.approval_status === 'approved',
              rcVerified: d.approval_status === 'approved',
            },

            joinedDate:
              d.created_at?.split('T')[0] ||
              new Date().toISOString().split('T')[0],
          };
        });

        setDrivers(mappedDrivers);
      }




      // 2. Load Rides from public.rides

      const { data: dbRides, error: ridesError } = await supabase

        .from('rides')

        .select(`

          *,

          rider:profiles!rides_rider_id_fkey(id, full_name, phone, avatar_url),

          driver:drivers!rides_driver_id_fkey(

            id, vehicle_make_model, vehicle_plate,

            profile:profiles!drivers_profile_id_fkey(id, full_name, phone, rating)

          ),

          ride_stops(*)

        `)

        .order('created_at', { ascending: false });
      if (sequence !== refreshSequence.current) return;

      if (ridesError) {
        setDataError((previous) => previous || `Booking data could not be loaded: ${ridesError.message}`);
      }
      if (!ridesError && dbRides) {

        const { data: dbReviews, error: reviewsError } = await supabase
          .from('reviews')
          .select('id, ride_id, rider_id, driver_id, rating, comment, created_at');
        if (sequence !== refreshSequence.current) return;

        if (reviewsError) {
          console.error('Failed to load journey reviews:', reviewsError.message);
        }
        const reviewsByRide = new Map<string, any>(
          (dbReviews || []).map((review: any) => [review.ride_id, review])
        );

        const mappedRides = dbRides
          .filter((ride: any) => {
            const role = String(dbProfile?.role || '').toLowerCase();
            if (['rider', 'customer'].includes(role)) {
              return ride.rider_id === dbProfile?.id;
            }
            return true;
          })
          .map((ride: any) => {
            // RLS intentionally hides private driver table rows from riders. Enrich their assigned trip
            // from the safe public directory view, which omits driver contact and document fields.
            const publicDriver = (role === 'rider' || role === 'customer') && ride.driver_id
              ? (dbDrivers || []).find((driver: any) => driver.id === ride.driver_id)
              : null;
            const safeRide = publicDriver ? { ...ride, driver: publicDriver } : ride;
            const booking = mapDbRideToBooking(safeRide);
            const review = reviewsByRide.get(ride.id);
            return review ? {
              ...booking,
              reviewSubmitted: true,
              review: {
                id: review.id,
                rideId: review.ride_id,
                riderId: review.rider_id,
                driverId: review.driver_id,
                rating: Number(review.rating),
                comment: review.comment || undefined,
                createdAt: review.created_at,
              },
            } : booking;
          });

       
        console.log("Total rides loaded:", mappedRides.length);
        console.log(
          "Requested rides:",
          mappedRides
            .filter((r: any) => r.status === "requested")
            .map((r: any) => ({
              id: r.id,
              bookingCode: r.bookingCode,
              status: r.status,
              vehicleCategory: r.vehicleCategory
            }))
        );

        setBookings(mappedRides);


      }



      // 3. Load Support Tickets

      const { data: dbTickets, error: ticketsError } = await supabase

        .from('support_tickets')

        .select(`
          *,
          user:profiles!support_tickets_user_id_fkey(full_name, role),
          support_messages(*, sender:profiles!support_messages_sender_id_fkey(full_name, role))
        `)

        .order('created_at', { ascending: false });
      if (sequence !== refreshSequence.current) return;

      if (ticketsError) setDataError((previous) => previous || `Support data could not be loaded: ${ticketsError.message}`);
      const { data: dbPromos, error: promoError } = await supabase.from('promo_codes').select('*');
      if (sequence !== refreshSequence.current) return;
      if (promoError) setDataError((previous) => previous || `Promotion data could not be loaded: ${promoError.message}`);
      if (dbPromos) {
        setPromoCodes(dbPromos.map((promo: any) => ({
          id: promo.id,
          code: promo.code,
          discountType: promo.discount_type,
          discountValue: Number(promo.discount_value),
          maxCap: Number(promo.max_cap),
          minRideAmount: Number(promo.min_ride_amount ?? 0),
          validUntil: promo.valid_until,
          active: Boolean(promo.is_active) && new Date(promo.valid_until).getTime() > Date.now(),
          usageCount: Number(promo.times_used ?? 0),
          description: '',
        })));
      }

      if (dbTickets) {

        const mappedTickets: SupportTicket[] = dbTickets.map((t: any) => ({

          id: t.id,

          ticketNumber: t.ticket_number,

          userId: t.user_id,

          userName: t.user?.full_name || '',

          userRole: t.user?.role || 'rider',

          category: t.category,

          subject: t.subject,

          description: t.description,

          bookingRef: t.booking_ref,

          status: t.status,

          priority: t.priority,

          messages: (t.support_messages || []).map((m: any) => ({

            id: m.id,

            senderId: m.sender_id,

            senderName: m.sender?.full_name || '',

            senderRole: m.sender?.role || 'rider',

            message: m.message,

            createdAt: m.created_at,

          })),

          createdAt: t.created_at,

          updatedAt: t.updated_at,

        }));

        setSupportTickets(mappedTickets);

      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown database error.';
      setDataError((previous) => previous || `Operational data could not be loaded: ${message}`);
      console.error('Error refreshing database data:', err);
    } finally {
      if (sequence === refreshSequence.current) setDataLoading(false);
    }

  }, [currentUser]);



  useEffect(() => {
    void refreshData();
    return () => { refreshSequence.current += 1; };
  }, [refreshData]);



  // Set up Supabase Realtime subscription for live rides updates

  useEffect(() => {

    if (!isSupabaseConfigured || !supabase || !currentUser) return;



    const channel = supabase

      .channel('public:rides')

      .on(

        'postgres_changes',

        { event: '*', schema: 'public', table: 'rides' },

        () => {

          void refreshData();

        }

      )

      .subscribe();



    return () => {

      if (supabase) void supabase.removeChannel(channel);

    };

  }, [currentUser, refreshData]);



  const updateBookingDraft = (updates: Partial<BookingDraft>) => {

    setBookingDraft((prev) => ({ ...prev, ...updates }));

  };



  // Compute active bookings

  const activeRiderBooking =

    bookings.find(

      (b) =>

        ['requested', 'accepted', 'driver_arriving', 'in_progress'].includes(b.status)

    ) || null;



  const activeDriverTrip =

    bookings.find(

      (b) =>

        ['accepted', 'driver_arriving', 'in_progress'].includes(b.status)

    ) || null;



  // Trusted server-side fare quote and atomic booking creation. The browser sends
  // only a signed quote token; it never submits an authoritative fare or distance.
  const createBooking = async (params: CreateBookingParams): Promise<RideBooking> => {
    if (!isSupabaseConfigured || !supabase || !currentUser) {
      throw new Error('Supabase authentication is required to create a booking.');
    }
    if (!params.quoteToken || !params.idempotencyKey) throw new Error('Request a current fare quote before booking.');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) throw new Error('Your session expired. Sign in again before booking.');
    const scheduledFor = params.scheduledDate && params.scheduledTime
      ? new Date(`${params.scheduledDate}T${params.scheduledTime}`).toISOString()
      : null;
    const apiBase = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
    const response = await fetch(`${apiBase}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ quoteToken: params.quoteToken, idempotencyKey: params.idempotencyKey, paymentMethod: params.paymentMethod, scheduledFor }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Booking could not be created.');
    const { data: savedRide, error: readError } = await supabase
      .from('rides').select('*, ride_stops(*)').eq('id', result.id).single();
    if (readError || !savedRide) throw new Error('The booking was created, but could not be reloaded. Check Ride History before retrying.');
    const mapped = mapDbRideToBooking({
      ...savedRide,
      rider: { full_name: riderProfile.name, phone: riderProfile.phone, avatar_url: riderProfile.avatar },
      ride_stops: (savedRide.ride_stops || []).sort((a: any, b: any) => a.stop_order - b.stop_order),
    });
    await refreshData();
    return mapped;
  };

  const acceptBooking = async (bookingId: string, driverId: string): Promise<boolean> => {

    if (!isSupabaseConfigured || !supabase || !currentUser) {
      throw new Error('Supabase authentication is required to accept a ride.');
    }

    // Driver identity and eligibility are derived inside the atomic database RPC.
    // Never trust a driver ID supplied by the browser.
    void driverId;
    const { data, error } = await supabase.rpc('accept_ride_request', { p_ride_id: bookingId });
    if (error || !data?.id) {
      if (error) console.error('Failed to accept booking in database:', error.message);
      return false;
    }



    await refreshData();

    return true;

  };



  const updateRideStatus = async (bookingId: string, newStatus: RideStatus) => {

    const updates: any = { status: newStatus };

    if (newStatus === 'in_progress') updates.started_at = new Date().toISOString();

    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();



    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is required to update a ride.');
    const { error } = await supabase.from('rides').update(updates).eq('id', bookingId);
    if (error) throw new Error(`Ride status update failed: ${error.message}`);
    await refreshData();
  };



  const cancelBooking = async (

    bookingId: string,

    reason: string,

    cancelledBy: 'rider' | 'driver' | 'admin'

  ) => {

    const dbUpdates = {
      status: 'cancelled',

      cancellation_reason: reason,

      cancelled_by: cancelledBy,


      cancelled_at: new Date().toISOString(),

    };



    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is required to cancel a ride.');
    const { error } = await supabase.from('rides').update(dbUpdates).eq('id', bookingId);
    if (error) throw new Error(`Cancellation failed: ${error.message}`);
    await refreshData();

  };



  const submitReview = async (bookingId: string, rating: number, comment?: string) => {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error('Choose a rating from 1 to 5 stars.');
    }
    if (!isSupabaseConfigured || !supabase || !currentUser) {
      throw new Error('Please sign in to submit a rating.');
    }

    const booking = bookings.find((item) => item.id === bookingId);
    if (!booking || booking.status !== 'completed' || !booking.driverId) {
      throw new Error('You can rate the driver only after a completed journey.');
    }
    if (booking.reviewSubmitted || booking.review) {
      throw new Error('You have already rated this journey.');
    }


    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error('Could not verify your rider profile. Please try again.');
    }
    if (!['rider', 'customer'].includes(String(profile.role).toLowerCase())) {
      throw new Error('Only the passenger can rate the driver.');
    }

    // Verify completion and rider ownership against the database, not just UI state.
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('id, rider_id, driver_id, status')
      .eq('id', bookingId)
      .maybeSingle();

    if (rideError || !ride) throw new Error('Could not verify this journey.');
    if (ride.rider_id !== profile.id || ride.driver_id !== booking.driverId || ride.status !== 'completed') {
      throw new Error('Only the passenger of a completed journey can rate its assigned driver.');
    }

    const { data: existingReview, error: existingError } = await supabase
      .from('reviews')
      .select('id')
      .eq('ride_id', bookingId)
      .maybeSingle();

    if (existingError) throw new Error('Could not check whether this journey was already rated.');
    if (existingReview) throw new Error('You have already rated this journey.');

    const { data: savedReview, error: insertError } = await supabase
      .from('reviews')
      .insert({
        ride_id: bookingId,
        rider_id: profile.id,
        driver_id: booking.driverId,
        rating,
        comment: comment?.trim() || null,
      })
      .select('id, ride_id, rider_id, driver_id, rating, comment, created_at')
      .single();

    if (insertError || !savedReview) {
      if (insertError?.code === '23505') throw new Error('You have already rated this journey.');
      throw new Error(insertError?.message || 'Your rating could not be saved. Please try again.');
    }

    setBookings((previous) => previous.map((item) =>
      item.id === bookingId
        ? {
          ...item,
          reviewSubmitted: true,
          review: {
            id: savedReview.id,
            rideId: savedReview.ride_id,
            riderId: savedReview.rider_id,
            driverId: savedReview.driver_id,
            rating: Number(savedReview.rating),
            comment: savedReview.comment || undefined,
            createdAt: savedReview.created_at,
          },
        }
        : item
    ));

    await refreshData();
  };


  const triggerEmergencySos = async (_bookingId: string) => {
    throw new Error('Emergency dispatch is not configured. No alert or location was sent. If you are in immediate danger in India, call 112 directly.');
  };


  const updateDriverApproval = async (driverId: string, status: DriverApprovalStatus, reason?: string) => {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is required to review driver applications.');
    const { data, error } = await supabase.from('drivers').update({
      approval_status: status, rejection_reason: reason || null, is_online: false, updated_at: new Date().toISOString(),
    }).eq('id', driverId).select('id');
    if (error || !data?.length) throw new Error(error?.message || 'Driver application was not updated.');
    await refreshData();
  };

  const toggleDriverOnline = async (driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);

    if (!driver) {
      alert('Driver record not found. Please refresh the page.');
      return;
    }

    if (driver.approvalStatus !== 'approved') {
      alert('Your driver account must be approved before going online.');
      return;
    }

    const newOnlineState = !driver.isOnline;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('drivers')
        .update({
          is_online: newOnlineState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', driverId)
        .select('id, is_online');

      if (error) {
        console.error('Driver availability update failed:', error);
        alert(`Could not update availability: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        alert('No driver record was updated. Check the driver ID and Supabase permissions.');
        return;
      }

      await refreshData();
    } else {
      throw new Error('Supabase is required to change driver availability.');
    }
  };





  const createSupportTicket = async (
    subject: string,
    category: string,
    description: string,
    bookingRef?: string
  ): Promise<SupportTicket> => {
    if (!isSupabaseConfigured || !supabase || !currentUser) {
      throw new Error('Sign in with a configured Supabase account to create a support ticket.');
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('id, full_name, role').eq('user_id', currentUser.id).maybeSingle();
    if (profileError || !profile) throw new Error('Your account profile could not be verified.');
    const ticketNumber = `TKT-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
    const { data: insertedTicket, error } = await supabase.from('support_tickets').insert({
      ticket_number: ticketNumber, user_id: profile.id, category, subject, description,
      booking_ref: bookingRef || null, status: 'open', priority: 'medium',
    }).select('*, support_messages(*, sender:profiles!support_messages_sender_id_fkey(full_name, role))').single();
    if (error || !insertedTicket) throw new Error(error?.message || 'Support ticket could not be saved.');
    await refreshData();
    return {
      id: insertedTicket.id, ticketNumber: insertedTicket.ticket_number, userId: insertedTicket.user_id,
      userName: profile.full_name || '', userRole: profile.role, category: insertedTicket.category,
      subject: insertedTicket.subject, description: insertedTicket.description, bookingRef: insertedTicket.booking_ref || undefined,
      status: insertedTicket.status, priority: insertedTicket.priority,
      messages: (insertedTicket.support_messages || []).map((m: any) => ({
        id: m.id, senderId: m.sender_id, senderName: m.sender?.full_name || '', senderRole: m.sender?.role || profile.role,
        message: m.message, createdAt: m.created_at,
      })), createdAt: insertedTicket.created_at, updatedAt: insertedTicket.updated_at,
    };
  };

  const addTicketMessage = async (ticketId: string, message: string, _senderRole: 'rider' | 'driver' | 'admin' = 'rider') => {
    if (!isSupabaseConfigured || !supabase || !currentUser) throw new Error('Supabase authentication is required.');
    const { data: profile, error: profileError } = await supabase.from('profiles').select('id').eq('user_id', currentUser.id).maybeSingle();
    if (profileError || !profile) throw new Error('Your account profile could not be verified.');
    const { error } = await supabase.from('support_messages').insert({ ticket_id: ticketId, sender_id: profile.id, message: message.trim() });
    if (error) throw new Error(`Message could not be saved: ${error.message}`);
    await refreshData();
  };

  const updateTicketStatus = async (ticketId: string, status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is required to update a support ticket.');
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
    if (error) throw new Error(`Ticket status could not be saved: ${error.message}`);
    await refreshData();
  };

  const applyPromoCode = (

    code: string,

    amount: number

  ): { success: boolean; promo?: PromoCode; message: string } => {

    const promo = promoCodes.find(

      (p) => p.code.toUpperCase() === code.trim().toUpperCase() && p.active

    );

    if (!promo) {

      return { success: false, message: 'Invalid or expired promotional coupon code.' };

    }

    if (amount < promo.minRideAmount) {

      return {

        success: false,

        message: `This promo requires a minimum fare of ₹${promo.minRideAmount}.`,

      };

    }

    return { success: true, promo, message: `Discount coupon activated: ${promo.description}` };

  };



  const addSavedPlace = (_label: string, _address: string, _lat: number, _lng: number) => {
    throw new Error('Saved places are unavailable until Supabase persistence and real address geocoding are configured.');
  };

  const removeSavedPlace = (_id: string) => {
    throw new Error('Saved-place deletion is unavailable until Supabase persistence is configured.');
  };

  const toggleFavouriteDriver = (_driverId: string) => {
    throw new Error('Favourite drivers are unavailable until account-scoped Supabase persistence is configured.');
  };

  const updateRiderProfile = (_updates: Partial<RiderProfile>) => {
    throw new Error('Profile changes are unavailable until the complete profile and emergency-contact persistence flow is configured. No local-only changes were applied.');
  };

  const updateDriverDocuments = (_driverId: string, _docs: Partial<DriverProfile['documents']>) => {
    throw new Error('Driver document updates require the authenticated onboarding API and private document storage. No local-only changes were applied.');
  };



  return (

    <RideContext.Provider

      value={{

        bookings,
        drivers,
        dataLoading,
        dataError,

        riderProfile,

        promoCodes,

        supportTickets,

        activeRiderBooking,

        activeDriverTrip,

        bookingDraft,

        updateBookingDraft,


        createBooking,

        acceptBooking,

        updateRideStatus,

        cancelBooking,

        submitReview,

        triggerEmergencySos,

        updateDriverApproval,

        toggleDriverOnline,

        createSupportTicket,

        addTicketMessage,

        updateTicketStatus,

        applyPromoCode,

        addSavedPlace,

        removeSavedPlace,

        toggleFavouriteDriver,

        updateRiderProfile,

        updateDriverDocuments,

        refreshData,

      }}

    >

      {children}

    </RideContext.Provider>

  );

};



export const useRide = () => {

  const context = useContext(RideContext);

  if (!context) {

    throw new Error('useRide must be used within a RideProvider');

  }

  return context;

};
