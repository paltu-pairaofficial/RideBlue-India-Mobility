# RideBlue — Complete UI/UX Specification

**Version:** 1.0  
**Date:** 9 October 2026  
**Project:** RideBlue Cab Booking and Ride Management Platform  
**Status:** UI/UX planning completed; implementation awaits explicit approval

---

## 1. Project Overview

RideBlue is a modern cab-booking web application connecting Riders, Drivers, and Administrators through one responsive platform.

### Project objectives

- Let Riders book rides, choose vehicles, view fares, track drivers, and manage journeys.
- Let Drivers register, submit verification documents, accept rides after approval, manage trips, and view earnings.
- Let Admins manage bookings, driver approvals, customer accounts, vehicle categories, fare settings, support, promotions, and reports.
- Provide a consistent, accessible experience across desktop, tablet, and mobile.
- Support a frontend demo before backend services are connected, clearly distinguishing simulated features from real functionality.

### Technology direction

- **Frontend:** React, Vite, TypeScript, Tailwind CSS v4.
- **Maps:** React Leaflet and OpenStreetMap.
- **Routing:** A suitable routing provider, such as OSRM for a prototype, subject to its usage limits and terms.
- **Backend:** To be selected/implemented separately; Supabase is one possible option.
- **Future integrations:** Authentication, role authorization, persistent bookings, fare calculation, driver matching, real-time GPS, online payments, email, push notifications, and support-ticket storage.

---

## 2. Brand Identity and Design System

### Brand

- **Name:** RideBlue
- **Logo concept:** A stylized road/route icon paired with the RideBlue wordmark.
- **Style:** Modern, clean, professional, trustworthy, and easy to use.
- **Motion:** Purposeful transitions and subtle hover effects; respect reduced-motion preferences.

### Colour palette

| Purpose | Colour |
|---|---|
| Primary blue | `#0878F9` |
| Navy | `#102A43` |
| Soft blue background | `#EAF4FF` |
| Main background | `#FFFFFF` |
| CTA accent yellow | `#FFE43B` |
| Success green | `#16865C` |

Check all colour combinations for accessible contrast before implementation. Use the yellow accent sparingly.

### Typography

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

### Design rules

- Consistent spacing, border radius, shadows, icons, and component states.
- Clear focus indicators and keyboard-accessible controls.
- Helpful field validation and error placement.
- Responsive layouts without horizontal overflow.
- Avoid fabricated customer testimonials or claims about real operating statistics.

---

## 3. Page Inventory

The specification contains **50 planned page types**, organized into six groups. Related views may share components or be presented as subviews, but all required user journeys must remain accessible.

### A. Public website — 9 pages

1. Home
2. Services
3. How It Works
4. About Us
5. Contact
6. Frequently Asked Questions (FAQ)
7. Help Centre
8. Privacy Policy
9. Terms & Conditions

### B. Authentication — 4 pages

10. Sign In
11. Create Account
12. Forgot Password
13. Reset Password

### C. Rider — 15 pages

14. Book a Ride
15. Vehicle Selection
16. Review & Confirm Booking
17. Booking Confirmation
18. Live Journey Tracking
19. Rider Dashboard Overview
20. Upcoming Rides
21. Active Rides
22. Ride History
23. Cancelled Rides
24. Saved Places
25. Favourite Drivers
26. Rider Profile
27. Payment Methods & History
28. Rider Notifications

Rider support and reviews are accessible through ride details and the shared Help & Support area.

### D. Driver — 10 pages

29. Driver Registration
30. Driver Profile
31. Vehicle Details & Documents
32. Verification Status
33. Driver Dashboard Overview
34. Availability & Incoming Ride Requests
35. Active Trip & Status Updates
36. Completed Trips
37. Earnings & Ratings
38. Driver Notifications

### E. Admin — 9 pages

39. Admin Dashboard Overview
40. Booking Management
41. Driver & Vehicle Approvals
42. Rider & Account Management
43. Vehicle Categories & Fare Configuration
44. Promotions Management
45. Support Ticket Management
46. Reports
47. Admin Settings

### F. Shared authenticated pages — 3 pages

48. Notifications Centre
49. Help & Support / Ticket List
50. Support Ticket Details

Modal dialogs, dropdowns, confirmation prompts, loading states, and mobile navigation states are additional UI states, not separate page types.

---

## 4. Homepage Specification

### Navigation bar

Include:
- RideBlue logo.
- Home.
- Services.
- How It Works.
- About.
- Contact.
- Sign In.
- Primary “Book a Ride” action.

### Hero section

Use a split layout:
- **Left:** Main headline, supporting copy, compact booking form.
- **Right:** Large cab photograph with a Kolkata skyline and Howrah Bridge visual reference.

### Homepage sections, in order

1. Navigation bar.
2. Split hero with quick booking.
3. Popular routes with clearly labelled example fares.
4. Vehicle categories.
5. How RideBlue works.
6. Why Choose RideBlue.
7. Testimonials using genuine customer feedback only. If none is available, omit the section or replace it with factual service benefits.
8. App promotion only if a real mobile app exists; otherwise use a website-focused promotional section.
9. Final booking CTA.
10. Footer with navigation, support, legal links, and verified contact information.

### Quick booking fields

- Pickup location.
- Destination.
- Date.
- Time.
- Passenger count.
- Search/continue action.

The quick form should lead into the dedicated booking flow.

---

## 5. Booking Flow

### Journey

1. Enter pickup and destination.
2. Choose date, time, and passenger count.
3. Preview the route and select a vehicle.
4. Review the fare breakdown.
5. Choose a payment method.
6. Review cancellation terms.
7. Confirm the booking.
8. View booking confirmation.
9. Track the assigned driver.
10. Complete the ride.
11. Rate and review the driver.

### Location search and map

- Address autocomplete for pickup and destination.
- Interactive map with draggable or tappable pins.
- Current-location option.
- Clear handling for denied location permission.
- Loading, no-results, slow-response, and map-service failure states.
- Ability to adjust locations before confirming.
- Route preview and distance estimate when routing is available.

### Vehicle categories

| Category | Intended use |
|---|---|
| Economy | Everyday, budget-conscious rides |
| Sedan | Comfortable standard rides |
| SUV | More space and luggage |
| XL | Larger groups, subject to actual vehicle capacity |
| Airport Transfer | Trips to or from an airport |

Vehicle cards should display:
- Vehicle photograph.
- Category name.
- Passenger capacity.
- Luggage guidance.
- Estimated fare.
- Selection state.

Categories, capacity, luggage limits, and actual availability must come from authoritative vehicle data when the backend is connected.

### Desktop and mobile layouts

- **Desktop:** Vehicle list on the left; map and fare summary on the right.
- **Mobile:** Stacked vehicle cards, map, and fare summary.

### Fare breakdown

Show applicable components clearly:
- Base fare.
- Distance charge.
- Time charge, when applicable.
- Taxes.
- Applicable fees.
- Toll or parking charges, where applicable.
- Surge or other variable charges, where applicable.
- Estimated or confirmed total.

Avoid double-counting fees. Explain any conditions under which an estimate can change. Label sample prices as demo estimates until the backend pricing engine is connected.

### Payment options

Online payment and cash must be equally prominent.

- **Online payment:** Show provider and transaction status when integrated.
- **Cash:** Provide a clear alternative.
- **Failed payment:** Explain the failure and offer a safe retry or alternative.
- Never show a transaction as paid until confirmed by the backend/payment provider.

### Cancellation and refunds

- Display the applicable cancellation policy before confirmation.
- Explain the free-cancellation window if one applies.
- Show any potential cancellation fee.
- Refund statuses: Requested, Processing, Completed, Failed.
- Include timestamps and estimated refund timing when supplied by the backend.
- Distinguish online refunds from cash-related reimbursements.

---

## 6. Live Journey Tracking

Live tracking is a core feature.

### Required UI

- Interactive map.
- Driver's current location marker.
- Pickup and destination markers.
- Route line.
- Estimated arrival time (ETA).
- Remaining distance.
- Driver name and profile photo when available.
- Vehicle model and registration number.
- Driver contact option.
- Trip-sharing option.
- Emergency-action entry point.
- Journey status timeline.
- Recenter map control.
- Last location update and reconnecting status.

### Layout

- **Desktop:** Large map with a journey-information side panel.
- **Mobile:** Map-first layout with a draggable bottom information sheet.

### Map-follow behaviour

- Follow the driver's location automatically during normal tracking.
- Manual map movement temporarily pauses auto-follow.
- Recenter resumes following the latest driver position.
- If updates stop, display the last known location and timestamp rather than implying the driver is moving live.

### Integration requirements

Actual live tracking requires:
- Driver-device location access and appropriate permission handling.
- Authenticated backend location updates.
- Real-time transport, such as Supabase Realtime or another suitable service.
- A mapping/routing provider for route and ETA calculations.

Until integrated, tracking must be clearly labelled as simulated/demo tracking.

---

## 7. Authentication and Role Access

### Confirmed decisions

- **Method:** Email and password.
- **Recovery:** Forgot Password and Reset Password screens.
- **Role access:** One shared, branded Sign In page.
- **Destination:** The authenticated user's authorized role determines the destination dashboard.

### Screens

- Sign In.
- Create Account.
- Forgot Password.
- Reset Password.

### Security requirements

- Do not let users gain a role by selecting it in the frontend.
- Verify roles and permissions on the backend.
- Protect authenticated routes and handle unauthorized access.
- Handle invalid credentials, expired sessions, recovery errors, and loading states.
- Never store passwords in source code or expose secrets in the client bundle.

Real authentication, password recovery, sessions, and role authorization require backend integration.

---

## 8. Rider Dashboard

**Layout:** Shared top navigation with Rider-specific menu items.

### Features

- Dashboard overview.
- Book a Ride.
- Upcoming rides.
- Active rides.
- Ride history.
- Cancelled rides.
- Saved places.
- Favourite drivers.
- Rider profile.
- Payment methods and history.
- Notifications.
- Ratings and reviews.
- Help and support.

### Rider experience requirements

- Show relevant route, fare, date, time, and status on each booking.
- Allow cancellation only when the booking state and policy permit it.
- Offer reviews only for eligible completed rides.
- Validate profile and payment forms.
- Provide useful empty states instead of blank pages.

---

## 9. Driver Dashboard and Onboarding

**Layout:** Shared top navigation with Driver-specific menu items.

### Driver onboarding

1. Create an account.
2. Enter personal information.
3. Provide vehicle details.
4. Submit the required licence, registration, and other documents.
5. Await Admin review.
6. Receive approval, rejection, or correction instructions.

### Verification statuses

- Pending.
- Approved.
- Rejected.
- Correction Required.

### Driver features

- Online/offline availability.
- Incoming ride requests.
- Accept/reject actions.
- Active trip details.
- Trip-status updates.
- Completed trips.
- Earnings summaries.
- Ratings and feedback.
- Driver profile and vehicle documents.
- Notifications.
- Help and support.

### Confirmed approval rule

Drivers must receive Admin approval before accepting rides. Pending or rejected drivers cannot accept rides. Backend authorization must enforce eligibility.

---

## 10. Admin Dashboard

**Layout:** Top-navigation dashboard, not sidebar navigation.

### Top navigation sections

- Overview.
- Bookings.
- Drivers.
- Riders.
- Vehicles.
- Fares.
- Reports.
- Settings.

Promotions and support management must also be accessible from the Admin navigation or an appropriately organized menu.

### Admin functions

| Area | Required functionality |
|---|---|
| Overview | Booking activity, active rides, pending approvals, revenue summaries |
| Booking management | Search, filter, inspect, and manage bookings |
| Driver/vehicle approvals | Review applications, documents, and approval states |
| Rider/account management | Inspect and manage accounts according to permissions |
| Vehicle categories | Configure category settings |
| Fare configuration | Manage pricing parameters and applicable fees |
| Promotions | Configure offers and eligibility rules |
| Support tickets | Review, update, and resolve requests |
| Reports | Display operational and financial reports |
| Settings | Platform administration and preferences |

### Responsive behaviour

- Desktop: horizontal top navigation.
- Tablet: compact navigation.
- Mobile: collapsible menu.

Tables must either scroll accessibly or convert to readable cards on smaller screens. Demo metrics must be labelled and must not imply real platform performance.

---

## 11. Notifications

### Confirmed design

- Notification bell in the top navigation.
- Dropdown with recent alerts.
- Unread-count indicator.
- Dedicated Notifications Centre.
- Read/unread status.
- Mark-all-as-read action.
- Role-specific notification content.

### Notification examples

- **Rider:** Booking confirmation, driver assigned, driver arrival, ride changes, cancellations, refund updates.
- **Driver:** New ride requests, booking changes, approval status, earnings updates.
- **Admin:** Pending approvals, booking issues, support requests, system alerts.

Email and push notifications will be added through backend integrations later.

---

## 12. Ratings and Reviews

### Confirmed design

- Riders can submit a 1–5 star rating after an eligible completed ride.
- Written feedback is optional.
- Drivers can view average ratings and feedback.
- Admins can review reported or inappropriate feedback.
- Backend validation must confirm ride eligibility and prevent duplicate submissions.

Do not fabricate customer ratings or testimonials.

---

## 13. Help and Support

### Support form

- Subject.
- Category.
- Description.
- Optional booking reference.
- Attachment support.

### Ticket statuses

- Open.
- In Progress.
- Resolved.
- Closed.

### Role-specific support

- **Riders:** Booking issues, cancellations, refunds, payments, lost items.
- **Drivers:** Verification, earnings, vehicle documents, ride disputes.
- **Admins:** Ticket management, status updates, issue resolution.

The frontend must include a support form, ticket list, ticket details, status indicators, and an Admin management view. Persistent storage and file uploads require backend integration.

---

## 14. Shared UI Component System

Use reusable components throughout the website.

### Navigation
- Public navbar.
- Authenticated top navbar.
- Mobile menu.
- Footer.
- Breadcrumbs.
- Account menu.

### Forms and actions
- Primary and secondary buttons.
- Icon buttons.
- Text and password inputs.
- Date/time selectors.
- Selects, checkboxes, and radio controls.
- Validation messages.
- Dropdowns and confirmation dialogs.

### Booking and maps
- Location autocomplete.
- Map picker.
- Route map.
- Vehicle cards.
- Fare summary.
- Payment selector.
- Driver tracking panel.
- Recenter control.

### Data and feedback
- Status badges.
- Alerts and toast messages.
- Tables and mobile data cards.
- Search, filtering, sorting, and pagination.
- Loading indicators.
- Empty, success, and error states.

### Shared features
- Notification dropdown.
- Star-rating component.
- Review cards.
- Support forms.
- Ticket cards.
- Status timelines.
- Attachment displays.

Maintain consistent colours, spacing, typography, focus states, and interaction patterns.

---

## 15. Responsive and Accessibility Requirements

Support:
- Desktop.
- Tablet.
- Mobile.

Requirements:
- No unintended horizontal overflow.
- Readable forms and text.
- Touch-friendly controls.
- Adaptable navigation.
- Responsive vehicle cards and dashboards.
- Accessible map controls.
- Keyboard navigation.
- Visible focus states.
- Meaningful input labels and error messages.
- Adequate colour contrast.
- Respect for reduced-motion settings.

---

## 16. Frontend Demo vs. Backend Functionality

| Feature | Frontend demo | Backend/service required |
|---|---|---|
| Authentication | Form validation and demo navigation | Real login and server-side authorization |
| Driver approval | Sample application states | Persistent documents and authoritative approval |
| Booking | Interactive simulated flow | Persistent bookings and driver matching |
| Fare | Sample breakdown | Authoritative pricing engine |
| Maps | Map rendering and route preview | Routing and ETA service |
| Tracking | Clearly labelled simulation | Live GPS and real-time updates |
| Payments | Payment-option selection | Payment gateway and verified transactions |
| Notifications | Sample alerts and read/unread interactions | Persistent, real-time delivery |
| Reviews | Demo rating flow | Persistent reviews and duplicate prevention |
| Support | Demo ticket workflow | Persistent tickets and file uploads |
| Reports | Sample records and charts | Actual analytics and aggregation |

Never include real customer data, payment credentials, production secrets, or sensitive documents in demo data.

---

## 17. Interaction and Acceptance Checklist

### Navigation
- [ ] All public navigation links work.
- [ ] Authenticated menus show role-appropriate links.
- [ ] Mobile menu opens and closes correctly.
- [ ] Unknown routes display a helpful not-found page.

### Forms and accounts
- [ ] Required fields and invalid formats show clear errors.
- [ ] Password visibility toggle works.
- [ ] Loading and submission feedback are visible.
- [ ] Demo authentication is clearly labelled.

### Booking
- [ ] Pickup and destination can be entered and edited.
- [ ] Vehicle selection updates the summary.
- [ ] Fare breakdown is internally consistent.
- [ ] Cash and online payment are equally prominent.
- [ ] Confirmation and cancellation states are clear.

### Tracking
- [ ] Map controls and recenter action work where supported.
- [ ] Disconnected location updates are indicated.
- [ ] Demo GPS is not presented as real tracking.
- [ ] Emergency and contact actions are clearly defined.

### Dashboards
- [ ] Search and filters update demo data.
- [ ] Tables and cards display appropriate statuses.
- [ ] Unapproved drivers cannot accept rides in the demo flow.
- [ ] Admin controls provide confirmation and feedback.

### Shared features
- [ ] Notifications can be marked read.
- [ ] Mark-all-as-read works.
- [ ] Reviews are offered only for eligible demo rides.
- [ ] Support forms validate input.
- [ ] Loading, empty, error, and success states are present.

---

## 18. Development and Testing Requirements

Before delivering the frontend:
- [ ] Install dependencies successfully.
- [ ] Start the development server successfully.
- [ ] Build the production bundle successfully.
- [ ] Check navigation across all planned pages.
- [ ] Test form validation.
- [ ] Test the demo booking workflow.
- [ ] Test role-specific demo navigation.
- [ ] Check responsive layouts.
- [ ] Check loading, empty, error, and success states.
- [ ] Fix obvious broken links and missing components.
- [ ] Document backend-dependent features.
- [ ] Verify the final ZIP contains the actual runnable source.

---

## 19. Final Deliverable

The target deliverable is a complete, runnable RideBlue frontend ZIP containing:

- React + Vite + TypeScript source.
- Tailwind CSS v4 configuration.
- All agreed pages and dashboard layouts.
- Reusable components.
- Responsive UI.
- Demo data and frontend interactions.
- Project assets and configuration.
- README with installation and run instructions.
- Environment-variable example file without real secrets.
- Backend integration notes.
- Build verification.

The ZIP must be created only after implementation and testing. This specification is the planning document, not a claim that the website has already been built.

---

## 20. Finalized Decisions

- [x] RideBlue blue-and-white brand direction.
- [x] React + Vite + TypeScript + Tailwind CSS v4.
- [x] Email/password authentication with password recovery.
- [x] Shared branded sign-in with role-based destination.
- [x] Admin approval required for Drivers.
- [x] Top navigation across Rider, Driver, and Admin dashboards.
- [x] Notifications dropdown and dedicated Notifications Centre.
- [x] Ratings and reviews after eligible completed rides.
- [x] Unified Help and Support system.
- [x] Homepage quick booking followed by a dedicated booking flow.
- [x] Five vehicle categories.
- [x] Cash and online payment options.
- [x] Interactive journey tracking design.
- [x] Responsive desktop, tablet, and mobile layouts.
- [x] Complete runnable frontend ZIP as the future deliverable.

**Status:** UI/UX specification prepared for final review. Implementation begins only after explicit authorization.


---

## Homepage Layout & Section Design — Approved Direction

### Homepage decisions
- **Service area:** West Bengal, India. Use relevant West Bengal locations and route examples, but do not imply confirmed operating coverage or show live fares until supported by the service configuration/backend.
- **Hero layout:** Split hero. Text and booking form on the left; a large 3D-rendered car visual on the right.
- **Booking form placement:** Inside the hero section.
- **Hero height:** Balanced and compact, not a full-screen oversized hero.
- **Hero visual:** Polished, realistic 3D car render against a clean pale-blue or warm-cream background.
- **Brand palette:** Bright blue `#0798F2`, warm cream `#FFF8E7`, yellow `#FFE600`, black `#111111`, white `#FFFFFF`, pale blue `#E5F4FF`.
- **Implementation status:** UI/UX planning only; do not start coding until explicitly requested.

### Homepage section order
1. **Navigation bar:** RideBlue logo; Home, Services, How It Works, About, Contact; Sign In; prominent yellow Book a Ride action. Target desktop height is approximately 72–80 px. On mobile, use a compact header, menu control, and clear booking action.
2. **Split hero and booking form:** Two-column desktop layout; stack vertically on mobile. Left column contains a concise headline, supporting copy, pickup and destination fields, and a yellow Find a Ride button. Right column contains the 3D car render and an optional small supporting information card. Keep the form short; date/time can be collected in the next booking step unless optional scheduling controls fit cleanly. Provide validation and helpful error messages. Do not claim availability or show a confirmed fare until supported by the booking/fare service.
3. **Popular routes:** Route cards with origin, destination, and estimated fare only when a reliable estimate is available. Possible West Bengal examples for visual planning include Kolkata–Durgapur and Kolkata–Siliguri; these are illustrative examples, not confirmed operating routes. Clearly label sample/indicative fares.
4. **Vehicle categories:** Economy, Sedan, SUV, XL, and Airport Transfer. Cards may include a photo, passenger capacity, short description, and starting/estimated fare when supported. Airport Transfer is a service category, not a vehicle size. Use a responsive grid.
5. **How RideBlue works:** Three steps—enter route, choose a ride, meet the driver—with concise copy and consistent illustrations/icons.
6. **Why RideBlue:** Highlight transparent fare breakdowns, convenient booking, clear trip information, and support. Only claim driver verification, safety checks, insurance, or other protections once confirmed and implemented.
7. **Customer reviews or useful alternative:** Publish genuine reviews only when available. Until then, use a useful feature explanation instead of fabricated testimonials or ratings.
8. **Final call to action:** Contrasting blue or dark section with a short invitation and yellow Book a Ride button.
9. **Footer:** Logo and short description; quick navigation; rider and driver links; help/support; genuine contact details; Privacy Policy and Terms.

### Layout, spacing, and responsive targets
These are initial targets to review at actual breakpoints:
- Main content max-width: approximately 1,200–1,280 px.
- Desktop side padding: 48–64 px; mobile side padding: 20–24 px.
- Section spacing: 80–104 px desktop; 48–64 px mobile.
- Card gaps: 20–24 px desktop; 12–16 px mobile.
- Card radius: approximately 16–24 px, adjusted for component size.
- Desktop hero: approximately equal columns, or 55% text/form and 45% visual.
- Mobile hero: stacked layout with readable text and no horizontal scrolling.
- Preserve contrast, keyboard focus, touch-friendly controls, and reduced-motion support.

### Hero booking interaction
- Pickup location: autocomplete and optional current-location action, with a manual-entry alternative.
- Destination: autocomplete and validation.
- Primary action: Find a Ride.
- On submission, validate inputs and proceed to vehicle selection.
- Date/time can be requested in the next step unless an optional control fits cleanly.
- Present cash and online payment options in the later booking flow, not in the compact homepage hero.
- Clearly distinguish demo/sample data from real availability, fares, tracking, and payment functionality.

### Homepage visual and interaction style
- Apply the approved bright-blue, warm-cream, yellow, black, white, and pale-blue palette consistently.
- Use yellow CTAs with dark text for readability.
- Use a high-quality 3D car visual with restrained scale/effects; the car should support, not compete with, the headline and booking form.
- Buttons: subtle colour transition, 1–2 px lift, and soft shadow on hover; visible focus and pressed states.
- Cards: subtle lift and blue border/accent on hover; support touch interactions and reduced motion.
- Ordinary UI transitions: approximately 200–300 ms.
- Avoid excessive animation, clutter, fabricated testimonials, unsupported safety claims, and unverified route/fare promises.
