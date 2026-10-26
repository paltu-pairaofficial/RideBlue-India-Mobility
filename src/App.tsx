import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { RideProvider } from './context/RideContext';
import { AppLayout } from './components/layout/AppLayout';

// Public Pages (9)
import { Home } from './pages/public/Home';
import { Services } from './pages/public/Services';
import { HowItWorks } from './pages/public/HowItWorks';
import { AboutUs } from './pages/public/AboutUs';
import { Contact } from './pages/public/Contact';
import { FAQ } from './pages/public/FAQ';
import { HelpCentre } from './pages/public/HelpCentre';
import { PrivacyPolicy } from './pages/public/PrivacyPolicy';
import { TermsConditions } from './pages/public/TermsConditions';
import { NotFound } from './pages/public/NotFound';

// Auth Pages (4)
import { SignIn } from './pages/auth/SignIn';
import { CreateAccount } from './pages/auth/CreateAccount';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { RiderSignIn } from './pages/auth/RiderSignIn';
import { RiderSignUp } from './pages/auth/RiderSignUp';
import { DriverSignIn } from './pages/auth/DriverSignIn';
import { DriverSignUp } from './pages/auth/DriverSignUp';
import { AdminSignIn } from './pages/auth/AdminSignIn';

// Rider Pages (15)
import { BookARide } from './pages/rider/BookARide';
import { BookingConfirmation } from './pages/rider/BookingConfirmation';
import { LiveJourneyTracking } from './pages/rider/LiveJourneyTracking';
import { RiderDashboard } from './pages/rider/RiderDashboard';
import { UpcomingRides } from './pages/rider/UpcomingRides';
import { ActiveRides } from './pages/rider/ActiveRides';
import { RideHistory } from './pages/rider/RideHistory';
import { CancelledRides } from './pages/rider/CancelledRides';
import { SavedPlaces } from './pages/rider/SavedPlaces';
import { FavouriteDrivers } from './pages/rider/FavouriteDrivers';
import { RiderProfile } from './pages/rider/RiderProfile';
import { PaymentMethods } from './pages/rider/PaymentMethods';
import { RiderNotifications } from './pages/rider/RiderNotifications';

// Driver Pages (10)
import { DriverRegistration } from './pages/driver/DriverRegistration';
import { DriverDashboard } from './pages/driver/DriverDashboard';
import { AvailabilityRequests } from './pages/driver/AvailabilityRequests';
import { ActiveTrip } from './pages/driver/ActiveTrip';
import { CompletedTrips } from './pages/driver/CompletedTrips';
import { EarningsRatings } from './pages/driver/EarningsRatings';
import { VehicleDocuments } from './pages/driver/VehicleDocuments';
import { VerificationStatus } from './pages/driver/VerificationStatus';
import { DriverProfile } from './pages/driver/DriverProfile';
import { DriverNotifications } from './pages/driver/DriverNotifications';

// Admin Pages (9)
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { BookingManagement } from './pages/admin/BookingManagement';
import { DriverApprovals } from './pages/admin/DriverApprovals';
import { RiderManagement } from './pages/admin/RiderManagement';
import { FaresConfiguration } from './pages/admin/FaresConfiguration';
import { PromotionsManagement } from './pages/admin/PromotionsManagement';
import { SupportManagement } from './pages/admin/SupportManagement';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminSettings } from './pages/admin/AdminSettings';

// Shared Pages (3)
import { NotificationsCentre } from './pages/shared/NotificationsCentre';
import { SupportTicketList } from './pages/shared/SupportTicketList';
import { SupportTicketDetails } from './pages/shared/SupportTicketDetails';

import { ProtectedRoute } from './components/auth/ProtectedRoute';

export function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <RideProvider>
            <AppLayout>
              <Routes>
                {/* Public Website (9 pages) */}
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<Services />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/help-centre" element={<HelpCentre />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsConditions />} />

                {/* Authentication (4 pages) */}
                <Route path="/auth/sign-in" element={<SignIn />} />
                <Route path="/auth/create-account" element={<CreateAccount />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/rider/sign-in" element={<RiderSignIn />} />
                <Route path="/rider/sign-up" element={<RiderSignUp />} />
                <Route path="/driver/sign-in" element={<DriverSignIn />} />
                <Route path="/driver/sign-up" element={<DriverSignUp />} />
                <Route path="/admin/sign-in" element={<AdminSignIn />} />

                {/* Rider Workflows (Protected for Riders & Admin) */}
                <Route path="/rider/dashboard" element={<ProtectedRoute allowedRoles={['rider', 'admin']}><RiderDashboard /></ProtectedRoute>} />
                <Route path="/rider/book" element={<BookARide />} />
                <Route path="/rider/vehicles" element={<BookARide />} />
                <Route path="/rider/review" element={<BookARide />} />
                <Route path="/rider/confirmation/:bookingId" element={<ProtectedRoute allowedRoles={['rider', 'admin']}><BookingConfirmation /></ProtectedRoute>} />
                <Route path="/rider/tracking/:bookingId" element={<ProtectedRoute allowedRoles={['rider', 'admin']}><LiveJourneyTracking /></ProtectedRoute>} />
                <Route path="/rider/tracking" element={<ProtectedRoute allowedRoles={['rider', 'admin']}><LiveJourneyTracking /></ProtectedRoute>} />
                <Route path="/rider/upcoming" element={<ProtectedRoute allowedRoles={['rider', 'admin']}><UpcomingRides /></ProtectedRoute>} />
                <Route path="/rider/active" element={<ProtectedRoute allowedRoles={['rider', 'admin']}><ActiveRides /></ProtectedRoute>} />
                <Route path="/rider/history" element={<ProtectedRoute allowedRoles={['rider', 'admin']}><RideHistory /></ProtectedRoute>} />
                <Route path="/rider/cancelled" element={<ProtectedRoute allowedRoles={['rider', 'admin']}><CancelledRides /></ProtectedRoute>} />
                <Route path="/rider/saved-places" element={<ProtectedRoute allowedRoles={['rider', 'admin']}><SavedPlaces /></ProtectedRoute>} />
                <Route path="/rider/favourite-drivers" element={<ProtectedRoute allowedRoles={['rider', 'admin']}><FavouriteDrivers /></ProtectedRoute>} />
                <Route path="/rider/profile" element={<ProtectedRoute allowedRoles={['rider', 'admin']}><RiderProfile /></ProtectedRoute>} />
                <Route path="/rider/payments" element={<ProtectedRoute allowedRoles={['rider', 'admin']}><PaymentMethods /></ProtectedRoute>} />
                <Route path="/rider/notifications" element={<ProtectedRoute allowedRoles={['rider', 'admin']}><RiderNotifications /></ProtectedRoute>} />

                {/* Driver Workflows (Protected for Drivers & Admin) */}
                <Route path="/driver/dashboard" element={<ProtectedRoute allowedRoles={['driver', 'admin']}><DriverDashboard /></ProtectedRoute>} />
                <Route path="/driver/register" element={<DriverRegistration />} />
                <Route path="/driver/requests" element={<ProtectedRoute allowedRoles={['driver', 'admin']}><AvailabilityRequests /></ProtectedRoute>} />
                <Route path="/driver/active-trip" element={<ProtectedRoute allowedRoles={['driver', 'admin']}><ActiveTrip /></ProtectedRoute>} />
                <Route path="/driver/completed-trips" element={<ProtectedRoute allowedRoles={['driver', 'admin']}><CompletedTrips /></ProtectedRoute>} />
                <Route path="/driver/earnings" element={<ProtectedRoute allowedRoles={['driver', 'admin']}><EarningsRatings /></ProtectedRoute>} />
                <Route path="/driver/documents" element={<ProtectedRoute allowedRoles={['driver', 'admin']}><VehicleDocuments /></ProtectedRoute>} />
                <Route path="/driver/verification" element={<ProtectedRoute allowedRoles={['driver', 'admin']}><VerificationStatus /></ProtectedRoute>} />
                <Route path="/driver/profile" element={<ProtectedRoute allowedRoles={['driver', 'admin']}><DriverProfile /></ProtectedRoute>} />
                <Route path="/driver/notifications" element={<ProtectedRoute allowedRoles={['driver', 'admin']}><DriverNotifications /></ProtectedRoute>} />

                {/* Admin Workflows (Strictly Protected for Admins Only) */}
                <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/bookings" element={<ProtectedRoute allowedRoles={['admin']}><BookingManagement /></ProtectedRoute>} />
                <Route path="/admin/driver-approvals" element={<ProtectedRoute allowedRoles={['admin']}><DriverApprovals /></ProtectedRoute>} />
                <Route path="/admin/riders" element={<ProtectedRoute allowedRoles={['admin']}><RiderManagement /></ProtectedRoute>} />
                <Route path="/admin/fares" element={<ProtectedRoute allowedRoles={['admin']}><FaresConfiguration /></ProtectedRoute>} />
                <Route path="/admin/promotions" element={<ProtectedRoute allowedRoles={['admin']}><PromotionsManagement /></ProtectedRoute>} />
                <Route path="/admin/tickets" element={<ProtectedRoute allowedRoles={['admin']}><SupportManagement /></ProtectedRoute>} />
                <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />

                {/* Shared Pages (Protected) */}
                <Route path="/notifications" element={<ProtectedRoute><NotificationsCentre /></ProtectedRoute>} />
                <Route path="/support" element={<ProtectedRoute><SupportTicketList /></ProtectedRoute>} />
                <Route path="/support/:ticketId" element={<ProtectedRoute><SupportTicketDetails /></ProtectedRoute>} />

                {/* Fallback 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </RideProvider>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
