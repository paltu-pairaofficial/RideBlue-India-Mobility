-- ====================================================================
-- RIDEBLUE: Supabase PostgreSQL Relational Schema
-- Migration 01: Base Schema, Types, Tables, and Baseline Constraints
-- Execution Order: 1 of 3
-- Safety: Safe for existing databases (idempotent, uses IF NOT EXISTS)
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enumerated Types (Idempotent creation)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('rider', 'driver', 'admin');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_status') THEN
        CREATE TYPE driver_status AS ENUM ('pending', 'approved', 'rejected', 'correction_required');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ride_status') THEN
        CREATE TYPE ride_status AS ENUM ('requested', 'accepted', 'driver_arriving', 'in_progress', 'completed', 'cancelled');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_category') THEN
        CREATE TYPE vehicle_category AS ENUM ('economy', 'sedan', 'suv', 'xl', 'airport_transfer');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('cash', 'stripe', 'upi');
    END IF;
END $$;

-- Support Razorpay in payment_method enum safely if not already present
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'payment_method' AND e.enumlabel = 'razorpay'
    ) THEN
        ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'razorpay';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status') THEN
        CREATE TYPE refund_status AS ENUM ('none', 'requested', 'processing', 'completed', 'failed');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
        CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high');
    END IF;
END $$;

-- ====================================================================
-- 3. Application Profiles (Linked to auth.users in Supabase / Clerk IDs)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL, -- Maps to auth.users.id::text
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    role user_role DEFAULT 'rider'::user_role NOT NULL,
    avatar_url TEXT,
    rating NUMERIC(3, 2) DEFAULT NULL CHECK (rating IS NULL OR (rating >= 1.00 AND rating <= 5.00)),
    total_trips INTEGER DEFAULT 0 CHECK (total_trips >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ====================================================================
-- 4. Drivers Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    vehicle_category vehicle_category DEFAULT 'sedan'::vehicle_category NOT NULL,
    vehicle_make_model TEXT DEFAULT '',
    vehicle_plate TEXT DEFAULT '',
    vehicle_year INTEGER CHECK (vehicle_year IS NULL OR vehicle_year >= 2010),
    
    license_number TEXT DEFAULT '',
    license_expiry DATE,
    rc_number TEXT DEFAULT '',
    insurance_expiry DATE,
    puc_number TEXT,

    approval_status driver_status DEFAULT 'pending'::driver_status NOT NULL,
    rejection_reason TEXT,
    is_online BOOLEAN DEFAULT FALSE NOT NULL,
    current_lat NUMERIC(9, 6),
    current_lng NUMERIC(9, 6),
    acceptance_rate INTEGER DEFAULT NULL CHECK (acceptance_rate IS NULL OR (acceptance_rate >= 0 AND acceptance_rate <= 100)),
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drivers_profile_id ON public.drivers(profile_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(approval_status);
CREATE INDEX IF NOT EXISTS idx_drivers_online ON public.drivers(is_online);

-- ====================================================================
-- 5. Rides / Bookings Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code TEXT UNIQUE NOT NULL,
    rider_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    
    vehicle_category vehicle_category NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_lat NUMERIC(9, 6) NOT NULL,
    pickup_lng NUMERIC(9, 6) NOT NULL,
    
    destination_address TEXT NOT NULL,
    destination_lat NUMERIC(9, 6) NOT NULL,
    destination_lng NUMERIC(9, 6) NOT NULL,

    passenger_count INTEGER DEFAULT 1 CHECK (passenger_count >= 1 AND passenger_count <= 8),
    scheduled_for TIMESTAMPTZ,
    
    status ride_status DEFAULT 'requested'::ride_status NOT NULL,
    distance_km NUMERIC(6, 2) NOT NULL CHECK (distance_km >= 0),
    estimated_duration_min INTEGER NOT NULL CHECK (estimated_duration_min >= 0),
    
    base_fare NUMERIC(10, 2) NOT NULL,
    distance_fare NUMERIC(10, 2) NOT NULL,
    time_fare NUMERIC(10, 2) NOT NULL,
    toll_charges NUMERIC(10, 2) DEFAULT 0.00,
    taxes NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    total_fare NUMERIC(10, 2) NOT NULL CHECK (total_fare >= 0),

    payment_method payment_method DEFAULT 'cash'::payment_method NOT NULL,
    payment_status payment_status DEFAULT 'pending'::payment_status NOT NULL,
    
    cancellation_reason TEXT,
    cancelled_by TEXT,
    cancellation_fee NUMERIC(10, 2) DEFAULT 0.00,
    refund_status refund_status DEFAULT 'none'::refund_status NOT NULL,

    emergency_sos_active BOOLEAN DEFAULT FALSE NOT NULL,
    emergency_sos_time TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rides_rider_id ON public.rides(rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON public.rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON public.rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON public.rides(created_at DESC);

-- ====================================================================
-- 6. Intermediate Stops (Multi-Stop Rides)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.ride_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
    stop_order INTEGER NOT NULL CHECK (stop_order >= 1),
    address TEXT NOT NULL,
    lat NUMERIC(9, 6) NOT NULL,
    lng NUMERIC(9, 6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ride_stops_ride_id ON public.ride_stops(ride_id);

-- ====================================================================
-- 7. Payments Table (Razorpay / Stripe / Cash Audit)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID REFERENCES public.rides(id) ON DELETE RESTRICT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    currency TEXT DEFAULT 'INR' NOT NULL,
    provider TEXT NOT NULL, -- 'razorpay', 'stripe', 'cash', 'upi'
    provider_transaction_id TEXT,
    status payment_status NOT NULL,
    refund_amount NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_ride_id ON public.payments(ride_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order ON public.payments(provider, provider_transaction_id);

-- ====================================================================
-- 8. Reviews & Ratings Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID UNIQUE REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
    rider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_driver_id ON public.reviews(driver_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rider_id ON public.reviews(rider_id);

-- ====================================================================
-- 9. Promo Codes & Discounts Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
    max_cap NUMERIC(10, 2) NOT NULL CHECK (max_cap > 0),
    min_ride_amount NUMERIC(10, 2) DEFAULT 0.00 CHECK (min_ride_amount >= 0),
    valid_until TIMESTAMPTZ NOT NULL,
    usage_limit INTEGER DEFAULT 1000,
    times_used INTEGER DEFAULT 0 CHECK (times_used >= 0),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);

-- ====================================================================
-- 10. Support Tickets & Thread Messages
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    booking_ref TEXT,
    status ticket_status DEFAULT 'open'::ticket_status NOT NULL,
    priority ticket_priority DEFAULT 'medium'::ticket_priority NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);

-- ====================================================================
-- 11. Emergency SOS Events Audit Log
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.emergency_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
    triggered_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
    lat NUMERIC(9, 6) NOT NULL,
    lng NUMERIC(9, 6) NOT NULL,
    police_alerted BOOLEAN DEFAULT TRUE NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_emergency_events_ride_id ON public.emergency_events(ride_id);
