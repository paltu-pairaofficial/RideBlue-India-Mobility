# RideBlue UI/UX Planning

## 1. Approved brand palette
| Purpose | Colour | Hex |
|---|---|---|
| Bright blue — primary brand | Bright blue | `#0798F2` |
| Warm cream — main page background | Warm cream | `#FFF8E7` |
| CTA yellow — primary buttons | Yellow | `#FFE600` |
| Typography black | Near-black | `#111111` |
| White — cards and forms | White | `#FFFFFF` |
| Pale blue — subtle highlights | Pale blue | `#E5F4FF` |

Use yellow sparingly. Use `#111111` text on yellow CTA buttons. Validate contrast for each foreground/background combination; do not assume white text on bright blue is accessible for normal-size text.

## 2. Typography (exact requirement)
Use **Inter** throughout the application.

| Element | Desktop size | Mobile guidance | Weight |
|---|---:|---|---:|
| Hero heading | 44px | 32px | 700 |
| Page heading | 30px | Responsive | 700 |
| Card heading | 22px | Responsive | 600 |
| Body text | 17px | Responsive | 400 |
| Form labels | 15px | 15px | 500 |
| Buttons | 15px | 15px | 600 |
| Helper text | 14px | 14px | 400 |

## 3. Visual direction
- Warm cream is the main page canvas; bright blue is the primary brand colour, not a replacement for the cream canvas.
- White cards/forms sit on cream surfaces.
- Blue is used for brand marks, links, active states and selected accents.
- Yellow is reserved for primary actions.
- Use black text for headings and primary copy.
- Keep spacing, corner radii, shadows and form heights consistent.
- Motion should be purposeful and subtle; support `prefers-reduced-motion`.

## 4. Responsive rules
- Mobile-first layout; no horizontal overflow at 320px.
- Desktop hero: balanced two-column layout with booking form on the left and car visual on the right.
- Mobile hero: stack copy, form and visual; form actions must remain easy to reach.
- Desktop dashboards may use a sidebar; mobile uses a drawer or bottom navigation where suitable.
- Tables become cards or scrollable data regions on small screens.
- Minimum comfortable touch target around 44×44 CSS pixels.
- Keep labels visible; placeholders are not labels.
- Keyboard focus must be clearly visible.

## 5. Navigation model
Public navigation: Home, Services, How It Works, About, Contact, FAQ, Help Centre.
Shared top actions: Help & Support, Notifications, Book a Ride.
Role navigation:
- Rider: Overview, Book a Ride, Upcoming, Active, History, Saved Places, Payments, Profile, Support.
- Driver: Overview, Onboarding/Verification, Availability, Incoming/Assigned Trips, Active Trip, Completed Trips, Earnings, Profile, Support.
- Admin: Overview, Bookings, Driver Approvals, Riders, Fare Rules, Promotions, Support Queue, Reports, Settings.

## 6. Screen inventory
### Public
Home; Services; How It Works; About; Contact; FAQ; Help Centre; Privacy Policy; Terms.
### Account
Sign In; Create Account; Forgot Password; Reset Password.
### Rider
Book a Ride; Vehicle Selection; Review & Confirm; Booking Confirmation; Live Tracking; Dashboard; Upcoming Rides; Active Ride; Ride History; Cancelled Rides; Saved Places; Favourite Drivers; Profile; Payment Methods; Payment History; Notifications.
### Driver
Driver Registration; Driver Profile; Vehicle & Documents; Verification Status; Driver Dashboard; Availability; Incoming Requests; Active Trip; Completed Trips; Earnings & Ratings; Notifications.
### Admin
Admin Overview; Booking Management; Driver/Vehicle Approvals; Rider/Account Management; Fare Configuration; Promotions; Support Tickets; Reports; Settings.
### Shared
Notifications Centre; Support Ticket List; Support Ticket Details.

## 7. Page states
Design loading, empty, error, success, disabled and permission-denied states. For booking flow, show clear progress and a review step before submission. Show cancellation rules before confirmation. Never label sample fare as a guaranteed quote.

## 8. Prototype/content policy
Use clearly marked sample/demo content. Do not fabricate testimonials, completed bookings, live driver location, real-time availability or successful payments. Live Tracking remains a planned screen until maps and dispatch services are integrated.
