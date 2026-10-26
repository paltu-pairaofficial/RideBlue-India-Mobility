# RIDEBLUE — COMPLETE CAB BOOKING PLATFORM UI/UX
## Master Design Brief for Google Stitch AI

**Project type:** Responsive cab-booking and ride-hailing website  
**Primary service focus:** West Bengal, India  
**Purpose of this document:** Design brief for Stitch AI; this is not application source code.

---

## How Stitch should use this brief

Treat this document as the primary design brief for the RideBlue project. If a separate RideBlue UI/UX specification is supplied, use both documents together: preserve the established decisions in the specification and use this document to organize the complete design generation workflow.

Create the entire product UI/UX, not only the homepage. Work in manageable groups of related screens if necessary. Maintain the same visual system throughout the project, and track which screens are complete and which remain.

Do not stop after generating the first screen. If the tool has a limit on how many screens it can create at once, finish one group and continue with the next group in the same project.

## 1. Main objective

Act as a senior UI/UX designer and product design architect. Design a coherent, polished, accessible, responsive cab-booking platform for RideBlue.

The result should include:
- All page types listed in this brief.
- Connected user journeys for important tasks.
- Reusable UI components and component states.
- Desktop and mobile layouts for important screens, with tablet variants where appropriate.
- Prototype interactions and linked screens where supported.
- A clear list of completed screens and remaining work.

Do not assume a visual prototype automatically implements real backend behaviour.

## 2. Approved brand design system

Use these exact brand colours consistently:

| Token | Hex | Intended use |
|---|---|---|
| Bright Blue | `#0798F2` | Brand accents, links, active navigation, interactive elements |
| Warm Cream | `#FFF8E7` | Warm page backgrounds and selected content areas |
| Yellow | `#FFE600` | Primary calls to action; use dark text for readability |
| Black | `#111111` | Main text, strong headings, dark sections |
| White | `#FFFFFF` | Cards, forms, and clean surfaces |
| Pale Blue | `#E5F4FF` | Secondary backgrounds, subtle panels, selected states |

### Visual style
- Clean, premium, modern, trustworthy, and user-friendly.
- Bold, readable typography and clear content hierarchy.
- Generous whitespace and balanced layouts.
- Rounded cards, refined borders, and restrained shadows.
- Professional icons and high-quality imagery.
- Yellow primary action buttons with dark text.
- Blue for brand elements, navigation accents, links, and interactive states.
- Accessible contrast and clearly visible keyboard focus.
- Avoid clutter, excessive gradients, gratuitous decoration, and inconsistent styles.
- Check actual text/background combinations for WCAG contrast; do not assume every palette pairing is accessible.

### Interaction and motion
- Buttons: subtle colour transition, small 1–2 px lift and soft shadow on hover.
- Cards: restrained lift or blue border/accent on hover.
- Forms: clear focus ring, validation states, and helpful inline errors.
- Navigation: clear active state and subtle hover treatment.
- Use approximately 200–300 ms for ordinary transitions when suitable.
- Provide pressed feedback for touch devices.
- Respect reduced-motion preferences. Avoid motion that interferes with task completion.

## 3. Homepage — approved direction

### Core decisions
- **Service focus:** West Bengal, India. Use relevant locations as illustrative examples unless route coverage is confirmed.
- **Hero layout:** split hero.
- **Left column:** headline, supporting copy, and booking form.
- **Right column:** premium, realistic 3D-rendered car.
- **Booking form:** inside the hero.
- **Hero height:** balanced and compact, not an oversized full-screen hero.
- **Palette:** use the approved tokens above.

### Homepage sections, in order
1. **Navigation bar:** RideBlue logo; Home, Services, How It Works, About, Contact; Sign In; yellow Book a Ride action. Aim for roughly 72–80 px desktop height. Use compact navigation on mobile.
2. **Split hero and booking form:** headline and short copy on the left; pickup and destination fields; yellow Find a Ride button; 3D car on the right. Stack content on mobile. Keep the form compact and easy to understand.
3. **Popular routes:** route cards with origin and destination; show fares only when supported by reliable estimates. Clearly label illustrative examples and sample fares.
4. **Vehicle categories:** Economy, Sedan, SUV, XL, and Airport Transfer. Include suitable vehicle imagery, passenger capacity, short descriptions, and fare estimates only when supported. Airport Transfer is a service type, not a vehicle size.
5. **How RideBlue works:** three steps—enter route, choose a ride, meet the driver.
6. **Why RideBlue:** emphasize clear fare breakdowns, convenient booking, useful trip information, and support. Do not make unverified safety or verification claims.
7. **Reviews or useful alternative:** use genuine reviews only when available; otherwise replace this section with a helpful feature explanation.
8. **Final call to action:** concise invitation and yellow Book a Ride button.
9. **Footer:** logo, navigation, rider/driver links, support, genuine contact information, Privacy Policy, and Terms.

### Homepage layout targets
These are initial design targets; adjust for usability at actual breakpoints:
- Main content max-width: approximately 1,200–1,280 px.
- Desktop side padding: 48–64 px; mobile side padding: 20–24 px.
- Section spacing: 80–104 px desktop; 48–64 px mobile.
- Card gaps: 20–24 px desktop; 12–16 px mobile.
- Card corner radius: approximately 16–24 px.
- Hero columns: approximately 50/50 or 55% text/form and 45% visual.
- Mobile hero: vertically stacked with no horizontal overflow.

### Homepage copy and data
Keep the headline short and confident, the supporting copy concise, and the form prominent. West Bengal route examples such as Kolkata–Durgapur or Kolkata–Siliguri may be used only as illustrative placeholders. Do not imply that a route is operational or that a displayed fare is live unless confirmed.

## 4. Complete page inventory

Design every applicable page below. Use reusable templates where appropriate, but ensure every named page type and important state is covered.

### A. Public website
1. Home
2. Services
3. How It Works
4. About
5. Contact
6. FAQ
7. Help Centre
8. Privacy Policy
9. Terms

### B. Authentication
10. Sign In
11. Create Account
12. Forgot Password
13. Reset Password

Use a consistent branded authentication layout. Role access must be authorized by the backend; do not imply that a frontend-only role selector secures access.

### C. Rider experience
14. Book a Ride
15. Vehicle Selection
16. Review & Confirm
17. Booking Confirmation
18. Live Journey Tracking
19. Dashboard Overview
20. Upcoming Rides
21. Active Rides
22. Ride History
23. Cancelled Rides
24. Saved Places
25. Favourite Drivers
26. Profile
27. Payment Methods & History
28. Rider Notifications

### D. Driver experience
29. Driver Registration
30. Driver Profile
31. Vehicle Details & Documents
32. Verification Status
33. Dashboard Overview
34. Availability & Incoming Ride Requests
35. Active Trip & Status Updates
36. Completed Trips
37. Earnings & Ratings
38. Driver Notifications

Driver onboarding must clearly show that admin approval is required before the driver can accept rides.

### E. Admin experience
39. Admin Overview
40. Booking Management
41. Driver & Vehicle Approvals
42. Rider & Account Management
43. Vehicle Categories & Fare Configuration
44. Promotions Management
45. Support Ticket Management
46. Reports
47. Admin Settings

Use top navigation for Admin, consistent with the Rider and Driver experiences. Make administrative actions and permissions clear.

### F. Shared pages
48. Notifications Centre
49. Help & Support / Ticket List
50. Support Ticket Details

Avoid redundant duplicate pages where a common template with role-specific content makes more sense, but ensure all required user tasks are represented.

## 5. Complete rider booking journey

Design linked screens and prototype interactions for this journey where supported:

1. Enter pickup and destination.
2. Choose pickup time if applicable.
3. View vehicle categories and availability states.
4. Compare estimated fares and passenger capacity.
5. Review an itemized fare breakdown.
6. Review cancellation terms and any applicable fee before confirmation.
7. Choose cash or online payment; make both options equally visible.
8. Review and confirm the booking.
9. View booking confirmation.
10. Track the trip.
11. View the completed ride and submit a 1–5 star rating with optional text.

### Fare display
Show distinct line items as applicable: base fare, distance, time, service fees/tax, tolls, and surge. Avoid double-counting. Label estimates clearly. Do not invent real pricing or guarantee a fare without a configured fare service.

### Cancellation and refunds
Explain the applicable free-cancellation window and any fee before confirmation. Show refund statuses such as Requested, Processing, Completed, and Failed. Distinguish cash reimbursements from electronic payment refunds.

### Payment
Provide clear cash and online payment options. Treat successful payment as a prototype state unless a real payment integration exists. Do not display real card details.

## 6. Live tracking and map experience

Design a dedicated tracking screen with:
- Map, route, pickup and destination markers.
- Vehicle/driver location marker and route context.
- ETA and remaining distance.
- Driver profile, vehicle details, and registration.
- Driver contact controls.
- Trip status timeline.
- Trip sharing and emergency-access entry points.
- Map recenter control.
- Mobile bottom sheet or stacked trip details.
- Desktop side panel and map.
- Loading, unavailable GPS, stale location, and reconnecting states.

Auto-follow the vehicle when appropriate. If the user manually moves the map, pause auto-follow until recenter is selected. Clearly communicate when location updates are unavailable. Label simulated tracking as demo/prototype tracking.

## 7. Role-based dashboards

All three roles use top navigation, while the navigation items and permissions remain role-specific.

### Rider
Bookings, upcoming and active rides, ride history, cancelled rides, saved places, favourite drivers, profile, payments, notifications, ratings, and support.

### Driver
Availability, incoming requests, active trip and status updates, completed trips, earnings, ratings, profile, vehicle details, documents, verification status, notifications, and support. Show pending/approved/rejected states clearly.

### Admin
Overview, booking management, drivers, riders, vehicles, fare configuration, promotions, support tickets, reports, and settings. Include useful filters, search, pagination, clear status badges, and confirmation for destructive actions.

## 8. Reusable design system

Create a consistent component library and variants for:
- Desktop and mobile navigation.
- Primary, secondary, tertiary, and destructive buttons.
- Inputs, dropdowns, autocomplete, date/time pickers, checkboxes, and radio controls.
- Vehicle cards and fare summaries.
- Status badges and timelines.
- Tables, filters, pagination, dashboard cards, and charts.
- Modals, confirmation dialogs, notifications, alerts, and toasts.
- Map controls, driver profile cards, and trip summaries.
- Empty states, loading skeletons, errors, success states, disabled states, and validation messages.

Where supported, show default, hover, focus, active, disabled, loading, success, and error variants. Keep labels, spacing, typography, borders, and interaction patterns consistent.

## 9. Responsive and accessibility requirements

Create desktop and mobile versions for all important screens, and tablet layouts where the design materially changes.

### Desktop
- Use space efficiently.
- Use split layouts for vehicle selection and tracking when appropriate.
- Keep dashboard tables and navigation readable.

### Mobile
- Stack content in a logical order.
- Use touch-friendly controls.
- Use compact navigation.
- Use bottom sheets or stacked panels for map/fare details when appropriate.
- Avoid horizontal overflow.
- Keep the primary action easy to find.
- Ensure forms remain comfortable to complete.

Maintain readable text, keyboard accessibility, clear focus states, meaningful labels, accessible contrast, and reduced-motion support.

## 10. Trust, accuracy, and prototype boundaries

- Do not invent customer testimonials, ratings, operational safety claims, driver-verification claims, insurance coverage, live fares, or real-time availability.
- Use clearly labelled sample data when real data is unavailable.
- Do not present demo payment, authentication, booking, GPS tracking, notifications, reviews, support, or reporting as a production implementation.
- Show role-specific permissions clearly.
- Keep cancellation policies and fare information understandable before confirmation.

## 11. Stitch generation workflow

Generate the entire design in logical groups, preserving the same visual system. Do not stop at the homepage.

Recommended groups:
1. Public website and homepage.
2. Authentication and rider booking journey.
3. Live tracking and rider dashboard.
4. Driver onboarding and driver dashboard.
5. Admin dashboard and management screens.
6. Shared support pages, responsive variants, and remaining states.
7. Reusable component library and interaction-state review.

If Stitch cannot generate all screens in one request, complete one group at a time in the same project. Continue with the remaining groups, referencing the existing screens and this brief. Do not redesign the brand system between groups.

Where supported:
- Create linked screens and clickable prototypes for the primary booking journey.
- Reuse components and variants.
- Organize screens by role and user flow.
- Include responsive variants.
- Keep a checklist of screens completed and screens still pending.

## 12. Final deliverables and completion checklist

The intended deliverable is a coherent, high-fidelity RideBlue design covering the full page inventory and principal user journeys—not merely a landing page or unrelated mockups.

At the end, summarize:
- Which screens were generated.
- Which responsive variants were generated.
- Which prototype flows are linked.
- Which reusable components were created.
- Which screens or states remain incomplete.
- Which interactions are visual prototypes only and still require real implementation.

Do not claim that the full inventory is complete unless every required page type has been generated or explicitly accounted for.
