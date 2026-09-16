# MOA consumer UI/UX redesign

## Pre-change audit (2026-09-16)

Inspected the deployed Railway app at 390 × 844 and the existing React Native / Expo source before editing. The monorepo has a mobile app, Nest API, domain contracts, and admin. Preserve that structure and API contracts.

### Inventory / navigation

34 existing routes: home, search, create, trades, my, place, request, request-form, trip-form, flight-proof, trip-route, offers, profile, offer-form, bundle, payment, transaction, chat, receipt, receive, payouts, wallet, wallet-topup, wallet-withdraw, identity, payment-methods, notifications, favorites, trips, reviews, settings, addresses, help, guide.

Five bottom tabs use hash navigation on web. Registered sessions enter their requested route; fresh sessions see a guide, then login. Purchase path: place → request → traveler comparison → payment → transaction → receipt confirmation. Traveler path: trip → flight proof → identity → same-place requests → acceptance → purchase proof → return / domestic handoff → payout. Both roles share one account; changing roles belongs in settings.

### Findings

- Page, Sheet, Txt, Button, Field, Card, Section, Notice already centralize primitives. Lucide icons and SVG route components exist; no need for another UI library.
- Similar white cards, small descriptive text, pale blue boxes, and weak hierarchy dominate onboarding, home, wallet and MY. Place, person, money, and state do not have distinct presentations.
- Home has accurate licensed regional photos but lacks a useful featured destination. List-sized photos understate the place-first product.
- `+` navigates to another page before the real form; returning from a form has an unnecessary intermediate stop.
- Login repeats the guide with a large intro and lists unavailable social providers as disabled actions.
- Loading is a single spinner; most button feedback only changes opacity.
- Trip has duplicate implementations. The active one is an older form; the other has validated per-user draft persistence and region/island selection. Consolidate, do not discard those capabilities.
- Trip text timelines contain invented departure/arrival hours. Route animation and itinerary are buried. No-key map iframes can falsely appear loaded while blank or blocked.
- Payment puts the total before its product. MY hides wallet access for buyers. Transaction pages repeat generic cards instead of emphasizing the current stage.

## Implementation order

1. Foundation: semantic tokens, readable type, accessible buttons, notices, skeletons, reduced-motion-aware transitions, bottom-sheet creation.
2. Home / login / first-entry guide: photo-led useful destination hero; compact request entry; traveler itinerary ticket with reward-led summary; three concise visual guide pages.
3. Traveler / signature route: comparison, trust, 1.5-second curved plane route, staggered selectable stops, readable registered itinerary. Never invent visit times.
4. Request / trip / flight proof: progressive forms, reusable country/area/place and date selection, validated draft preservation.
5. Trade / payment / wallet / MY: product-first payment, current-stage trade hero, clear available/held balances, one consistent account hierarchy.
6. Verification: typecheck, lint, domain/API tests, bundle smoke flows, real Chrome viewport/layout checks, production build.

## Guardrails

- Buyer-specified reward remains unchanged. No new requester service fee, real card charge, Apple payment integration, or real GPS shipment claim is introduced for visual purposes.
- Demo balances, travel counts, route-time estimates and mock identity/payment remain labeled. Registered dates do not imply actual tracking.
- Preserve role, auth, navigation, request draft, recipient, meetup coordinates, trip capacity, verification and settlement contracts.
- Retain photo attribution and provide a branded fallback on image failure.
- Without a configured map provider, show explicit unavailability and a working external-map action; never substitute a decorative map and call it a real map.
- All state indicators include text/icons. Touch controls target 44px; reduced motion disables decorative travel/transition animation.
- Viewport QA is browser emulation, not a claim of physical iOS or Android testing.

## Validation

- `npm run typecheck`, `npm run lint`, and `npm run build`: passed (mobile web, domain, API and admin).
- `npm test`: 117 tests passed, including existing financial arithmetic, auth, privacy, concurrent matching/payment, draft ownership, and API state transitions. Added checks cover refreshed MY verification and asynchronous/late map failures. The form test loader now isolates the added visual route/photo boundary rather than trying to parse binary assets as TypeScript.
- `node scripts/ui-smoke.mjs`: first-entry guide → login → creation sheet → request → same-place bundle → traveler selection → payment → purchase proof → domestic delivery → confirmation → payout. No React runtime errors.
- `python3 scripts/browser-audit.py`: Chrome 360/390/548. Reload/back draft retention; meetup search/save/cancel; country/city/island selection; legacy draft migration; capacity; country-change cancellation; actual isolated API trip submission; date-sheet footer visibility.
- `python3 scripts/redesign-audit.py`: Chrome 360×780, 390×844, 430×932, 412×915 and 1440×960. Core screens, long Korean names, missing photo, empty state, initial API error/retry, loading skeleton, creation sheet navigation, returning/shipped/settled states. Also non-reduced 1.5-second plane motion and interactive stop detail. First traveler selection CTA is verified inside the iPhone 12 Pro viewport.
- Visual comparison prompted a second pass: condensed traveler cards so actions are visible, removed duplicated no-key route diagrams, tightened the trip header, fixed long flight destinations and aligned product thumbnails across matching/payment.

## External-service limits

This is still the existing demo app: social providers, live identity checks, real charges, airline validation, and map APIs require their own service setup. The redesign does not turn them into real integrations. Web map consumers now agree on `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY`, retaining the legacy alias. No credentials or provider settings are changed or uploaded. Missing/blocked maps give a clear fallback instead of an empty iframe; route timing is a registered plan, not GPS tracking.

## Deployment safety

Deploy the verified Git revision to the existing Railway service. Do not include local environment files or local state. Docker exclusions now explicitly cover nested `.env` and `.data` paths as well. Never reset the shared demo database during production smoke checks.
