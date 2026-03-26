# ZuGo2 - Complete Firestore Database Schema

## Executive Summary

This document provides a comprehensive database architecture analysis for the ZuGo2 City Transport Management System. It is derived from a full codebase scan of screens, components, services, and Firebase usage.

---

## 1. Entity Overview

| Entity | Collection | Firebase Integrated | Notes |
|--------|------------|---------------------|-------|
| Users | `users` | ✅ Yes | All user types (passenger, driver, transporter) |
| Transporters | `transporters` | ✅ Yes | Company profiles |
| Drivers | `drivers` | ✅ Yes | Linked to users, transporters |
| Buses | `buses` | ✅ Yes | Fleet management |
| Routes | `routes` | ✅ Yes | Transport routes |
| Trips | `trips` | ✅ Yes | Scheduled trips |
| Bookings | `bookings` | ✅ Yes | Passenger reservations |
| Stops | `stops` | ✅ Yes | Route/trip stops |
| Notifications | `notifications` | ✅ Yes | Multi-target |
| Alerts | `alerts` | ✅ Yes | Transporter dashboard |
| Maintenance | `maintenance` | ✅ Yes | Bus maintenance records |
| Delays | `delays` | ✅ Yes | Driver-reported delays |
| Emergencies | `emergencies` | ✅ Yes | Driver emergency reports |
| Vehicle Checks | `vehicle_checks` | ✅ Yes | Pre-trip inspections |
| Vehicle Issues | `vehicle_issues` | ✅ Yes | Defects reported |
| Driver Earnings | `driver_earnings` | ✅ Yes | Per-trip earnings |
| Announcements | `announcements` | ✅ Yes | Transporter → Drivers |
| Messages | `messages` | ✅ Yes | Driver–Dispatcher |
| Cities | `cities` | ✅ Yes | With fallback to hardcoded |
| Search History | `search_history` | ✅ Yes | Passenger search logs |
| Settings | `settings` | ✅ Yes | Transporter preferences |
| Driver Credentials | `driver_credentials` | ✅ Yes | Credential reference |
| Temp Selections | `temp_selections` | ✅ Yes | Role selection during auth |
| Payments | — | ❌ No | Mock only; no Firestore |

---

## 2. Entity Definitions & Field Specifications

### 2.1 `users` (Unified User Accounts)

**Purpose:** Central auth profile for passengers, drivers, and transporters. Links Firebase Auth UID to app roles.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| uid | string | ✅ | Firebase Auth UID |
| fullName | string | ✅ | Display name |
| email | string | ✅ | Email (unique) |
| phone | string | ❌ | Phone number |
| userType | string | ✅ | `'passenger' \| 'driver' \| 'transporter'` |
| transporterId | string | ❌ | For drivers: owning transporter |
| status | string | ❌ | `'active' \| 'inactive'` |
| createdAt | Timestamp | ✅ | |
| updatedAt | Timestamp | ❌ | |
| photoURL | string | ❌ | Profile picture (passenger) |
| fcmToken | string | ❌ | Push token (if used) |

**Relationships:** One-to-one with `drivers` (when userType=driver), referenced by `transporters` (when userType=transporter).

---

### 2.2 `transporters`

**Purpose:** Transport company/operator profile. Document ID = user.uid of transporter.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| transporterId | string | ✅ | Same as doc ID |
| companyName | string | ❌ | |
| registration | string | ❌ | Business registration |
| email | string | ❌ | |
| phone | string | ❌ | |
| address | string | ❌ | |
| taxNumber | string | ❌ | |
| established | string | ❌ | Year/date |
| totalBuses | number | ❌ | |
| totalDrivers | number | ❌ | |
| driversCount | number | ❌ | Incremented when adding drivers |
| createdAt | Timestamp | ❌ | |
| updatedAt | Timestamp | ❌ | |

**Relationships:** One-to-many with `buses`, `drivers`, `routes`, `trips`.

---

### 2.3 `drivers`

**Purpose:** Driver profile and operational state. Document ID = Firebase Auth UID.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| uid | string | ✅ | Same as doc ID |
| fullName | string | ✅ | |
| contactNumber | string | ✅ | |
| email | string | ✅ | |
| cnic | string | ❌ | National ID |
| licenseNumber | string | ❌ | |
| licenseType | string | ❌ | |
| licenseExpiry | string | ❌ | |
| address | string | ❌ | |
| emergencyContact | string | ❌ | |
| joiningDate | string | ❌ | |
| salary | number | ❌ | |
| employmentType | string | ❌ | |
| vehicleAssigned | string | ❌ | Bus number |
| busAssignedId | string | ❌ | Bus document ID |
| busNumber | string | ❌ | For display |
| status | string | ✅ | `'active' \| 'inactive' \| 'on-duty' \| 'online' \| 'offline'` |
| transporterId | string | ✅ | |
| role | string | ❌ | `'driver'` |
| rating | number | ❌ | 0–5 |
| totalRides | number | ❌ | |
| totalEarnings | number | ❌ | |
| totalRatings | number | ❌ | For avg calculation |
| onlineHours | number | ❌ | |
| currentTripId | string | ❌ | Active trip |
| fcmToken | string | ❌ | Push notifications |
| createdAt | Timestamp | ✅ | |
| updatedAt | Timestamp | ❌ | |

**Relationships:** Many-to-one with `transporters`; one-to-one with `users`; optional one-to-one with `buses` (assigned vehicle).

---

### 2.4 `buses`

**Purpose:** Fleet vehicles owned by transporters.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| busNumber | string | ✅ | e.g. "B-001" |
| registrationNumber | string | ✅ | |
| make | string | ❌ | |
| model | string | ❌ | |
| year | number | ❌ | |
| capacity | number | ❌ | |
| fuelType | string | ❌ | `'diesel' \| 'petrol' \| 'cng' \| 'electric'` |
| color | string | ❌ | |
| status | string | ✅ | `'active' \| 'maintenance' \| 'inactive'` |
| driverId | string | ❌ | Assigned driver UID |
| driverName | string | ❌ | |
| insuranceNumber | string | ❌ | |
| insuranceExpiry | string | ❌ | |
| fitnessExpiry | string | ❌ | |
| images | map | ❌ | frontView, backView, interior, documents URLs |
| transporterId | string | ✅ | |
| currentTripId | string | ❌ | Active trip |
| createdAt | Timestamp | ✅ | |
| updatedAt | Timestamp | ❌ | |

**Relationships:** Many-to-one with `transporters`; optional one-to-one with `drivers`.

---

### 2.5 `routes`

**Purpose:** Route definitions (from → to). Used to create trips.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | ✅ | e.g. "RT-001" |
| name | string | ✅ | Route name |
| from | string | ❌ | Origin city/location |
| to | string | ❌ | Destination |
| fromCode | string | ❌ | **Suggested** – City code for search |
| toCode | string | ❌ | **Suggested** – City code for search |
| distance | string | ❌ | e.g. "45 km" |
| duration | string | ❌ | e.g. "1h 30m" |
| stops | number | ❌ | Number of stops |
| fare | number | ❌ | Base fare (PKR) |
| popular | boolean | ❌ | For HomeScreen quick bookings |
| bookingCount | number | ❌ | For popularity ranking |
| transporterId | string | ✅ | |
| createdAt | Timestamp | ✅ | |
| updatedAt | Timestamp | ❌ | |

**Relationships:** Many-to-one with `transporters`; one-to-many with `trips`; one-to-many with `stops` (via routeId).

---

### 2.6 `trips`

**Purpose:** Scheduled trips (recurring or one-time). Passenger search and booking reference.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| routeId | string | ✅ | |
| routeCode | string | ❌ | |
| routeName | string | ❌ | |
| from | string | ❌ | |
| to | string | ❌ | |
| fromCode | string | ❌ | **Suggested** – For SearchResults query |
| toCode | string | ❌ | **Suggested** – For SearchResults query |
| date | string | ❌ | **Suggested** – YYYY-MM-DD for search |
| busId | string | ✅ | |
| busNumber | string | ❌ | |
| driverId | string | ✅ | |
| driverName | string | ❌ | |
| departureTime | string | ✅ | e.g. "08:00" |
| arrivalTime | string | ❌ | |
| days | string[] | ❌ | ['Mon','Tue',...] for weekly |
| startDate | string | ❌ | YYYY-MM-DD |
| endDate | string | ❌ | YYYY-MM-DD |
| repeatType | string | ❌ | `'daily' \| 'weekdays' \| 'weekends' \| 'weekly' \| 'one-time'` |
| fare | number | ✅ | PKR |
| totalSeats | number | ✅ | |
| availableSeats | number | ✅ | |
| bookedSeats | number | ❌ | |
| boardedSeats | number | ❌ | |
| status | string | ✅ | `'upcoming' \| 'ready' \| 'in-progress' \| 'completed' \| 'cancelled'` |
| distance | number | ❌ | |
| duration | string | ❌ | |
| transporterId | string | ✅ | |
| estimatedRevenue | number | ❌ | |
| earnings | number | ❌ | Set on completion |
| revenue | number | ❌ | |
| actualStartTime | Timestamp | ❌ | |
| actualEndTime | Timestamp | ❌ | |
| currentStop | string | ❌ | |
| nextStop | string | ❌ | |
| nextStopETA | string | ❌ | |
| currentTripId | string | ❌ | Driver's current trip |
| createdAt | Timestamp | ✅ | |
| updatedAt | Timestamp | ❌ | |

**Relationships:** Many-to-one with `routes`, `buses`, `drivers`, `transporters`; one-to-many with `bookings`; one-to-many with `stops` (tripId).

---

### 2.7 `bookings`

**Purpose:** Passenger reservations for trips.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | ✅ | Doc ID |
| userId | string | ✅ | Passenger UID |
| tripId | string | ✅ | |
| busId | string | ❌ | |
| seatIds | string[] | ✅ | e.g. ["seat-1","seat-2"] |
| seatNumber | string | ❌ | Primary seat for display |
| from | string | ❌ | |
| to | string | ❌ | |
| fromCode | string | ❌ | |
| toCode | string | ❌ | |
| travelDate | Timestamp | ❌ | |
| fare | number | ✅ | |
| serviceFee | number | ❌ | |
| total | number | ✅ | |
| ticketNumber | string | ✅ | e.g. "TKT-123456" |
| status | string | ✅ | `'confirmed' \| 'boarding' \| 'completed' \| 'cancelled'` |
| boardingStatus | string | ❌ | `'pending' \| 'boarded' \| 'missed'` |
| passengerName | string | ❌ | |
| busNumber | string | ❌ | |
| qrCode | string | ❌ | Booking ID for scan |
| bookingDate | Timestamp | ✅ | |
| rating | number | ❌ | Post-trip rating |
| routeId | string | ❌ | |

**Relationships:** Many-to-one with `users` (passenger), `trips`.

---

### 2.8 `stops`

**Purpose:** Stops along a route or for a specific trip. Used by RouteScreen (driver) and TrackScreen (passenger).

**Note:** Two query patterns exist – `routeId` (TrackScreen) and `tripId` (RouteScreen). Recommend standardizing on `routeId` with optional `tripId` for trip-specific stop state.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| routeId | string | ✅ | Route reference |
| tripId | string | ❌ | Trip reference (RouteScreen) |
| number | number | ❌ | Stop order |
| sequence | number | ❌ | Alternative ordering |
| name | string | ✅ | Stop name |
| scheduledTime | string | ❌ | |
| actualTime | string | ❌ | |
| time | string | ❌ | TrackScreen |
| status | string | ❌ | `'UPCOMING' \| 'CURRENT' \| 'COMPLETED'` |
| passengerCount | number | ❌ | |
| location | GeoPoint | ❌ | lat, lng |
| passed | boolean | ❌ | |
| isCurrent | boolean | ❌ | |
| isDestination | boolean | ❌ | |
| isBoardingStop | boolean | ❌ | |
| passengersToBoard | number | ❌ | |
| delay | string | ❌ | |

**Relationships:** Many-to-one with `routes` and optionally `trips`.

---

### 2.9 `notifications`

**Purpose:** In-app notifications for transporters, drivers, and passengers.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| transporterId | string | ❌ | Creator/owner |
| driverId | string | ❌ | Target driver |
| userId | string | ❌ | Target user (passenger) |
| target | string | ✅ | `'transporter' \| 'driver' \| 'passenger'` |
| type | string | ❌ | `'info' \| 'maintenance' \| 'emergency' \| 'trip' \| 'booking' \| ...` |
| title | string | ❌ | |
| message | string | ✅ | |
| read | boolean | ✅ | |
| readAt | Timestamp | ❌ | |
| actionable | boolean | ❌ | |
| actionType | string | ❌ | |
| actionId | string | ❌ | e.g. tripId for navigation |
| actionData | object | ❌ | |
| priority | string | ❌ | |
| createdAt | Timestamp | ✅ | |
| timestamp | Timestamp | ❌ | |
| expiresAt | Timestamp | ❌ | |

**Relationships:** Polymorphic – references transporter, driver, or passenger.

---

### 2.10 `alerts`

**Purpose:** Critical alerts for transporter dashboard (maintenance, emergencies).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| transporterId | string | ✅ | |
| message | string | ✅ | |
| type | string | ❌ | `'success' \| 'warning' \| 'error' \| 'info'` |
| tripId | string | ❌ | For passenger trip alerts |
| bookingId | string | ❌ | Alternative link |
| timestamp | Timestamp | ✅ | |
| acknowledged | boolean | ✅ | |
| severity | string | ❌ | |

**Relationships:** Many-to-one with `transporters`; optional link to trip/booking.

---

### 2.11 `maintenance`

**Purpose:** Bus maintenance records.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| busId | string | ✅ | |
| busNumber | string | ❌ | |
| date | Timestamp | ✅ | |
| type | string | ❌ | `'routine' \| 'repair' \| 'emergency'` |
| description | string | ❌ | |
| cost | number | ❌ | |
| mechanicName | string | ❌ | |
| nextDueDate | Timestamp | ❌ | |
| transporterId | string | ✅ | |
| createdAt | Timestamp | ❌ | |

**Relationships:** Many-to-one with `buses`, `transporters`.

---

### 2.12 `delays`

**Purpose:** Driver-reported delays (traffic, mechanical, etc.).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| driverId | string | ✅ | |
| tripId | string | ❌ | |
| reason | string | ✅ | e.g. "Traffic Congestion" |
| timestamp | Timestamp | ✅ | |
| status | string | ❌ | `'reported'` |

---

### 2.13 `emergencies`

**Purpose:** Driver emergency reports (RouteScreen).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| driverId | string | ✅ | |
| tripId | string | ❌ | |
| message | string | ❌ | |
| timestamp | Timestamp | ✅ | |
| location | GeoPoint | ❌ | **Suggested** – For SOS |

---

### 2.14 `vehicle_checks`

**Purpose:** Pre-trip vehicle inspection by driver.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| driverId | string | ✅ | |
| driverName | string | ❌ | |
| tripId | string | ❌ | |
| busId | string | ✅ | |
| busNumber | string | ❌ | |
| checkDate | Timestamp | ✅ | |
| checkType | string | ❌ | `'pre-trip' \| 'post-trip'` |
| items | map/array | ❌ | Checklist results |
| passed | boolean | ✅ | |
| issues | string | ❌ | |
| completedAt | Timestamp | ❌ | |

---

### 2.15 `vehicle_issues`

**Purpose:** Defects reported during vehicle check.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| busId | string | ✅ | |
| driverId | string | ✅ | |
| description | string | ✅ | |
| severity | string | ❌ | |
| timestamp | Timestamp | ✅ | |

---

### 2.16 `driver_earnings`

**Purpose:** Per-trip earnings for driver EarningsScreen.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| driverId | string | ✅ | |
| tripId | string | ❌ | |
| date | string | ✅ | YYYY-MM-DD |
| dayOfWeek | string | ❌ | |
| timestamp | Timestamp | ✅ | |
| total | number | ✅ | |
| baseFare | number | ❌ | |
| distanceFare | number | ❌ | |
| bonus | number | ❌ | |
| distance | number | ❌ | |
| duration | number | ❌ | |
| routeName | string | ❌ | |
| busNumber | string | ❌ | |
| passengerCount | number | ❌ | |
| status | string | ❌ | |

---

### 2.17 `announcements`

**Purpose:** Transporter → Driver broadcasts.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| transporterId | string | ✅ | |
| message | string | ✅ | |
| sentTo | number | ❌ | Driver count |
| createdAt | Timestamp | ✅ | |

---

### 2.18 `messages`

**Purpose:** Driver–dispatcher communication.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| driverId | string | ✅ | |
| message | string | ✅ | |
| type | string | ❌ | `'driver-to-dispatcher'` |
| timestamp | Timestamp | ✅ | |
| read | boolean | ❌ | |

---

### 2.19 `cities`

**Purpose:** Cities for passenger search (from/to selection).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ✅ | |
| code | string | ✅ | e.g. "LHE", "KHI" |
| province | string | ❌ | |
| popular | boolean | ❌ | |
| lat | number | ❌ | |
| lng | number | ❌ | |

---

### 2.20 `search_history`

**Purpose:** Passenger search history (HomeScreen).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | ✅ | |
| fromCode | string | ❌ | |
| toCode | string | ❌ | |
| timestamp | Timestamp | ✅ | |

---

### 2.21 `settings`

**Purpose:** Transporter preferences (ReportsProfileScreen). Document ID = user.uid.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| (dynamic) | boolean | ❌ | Key-value settings |

---

### 2.22 `driver_credentials`

**Purpose:** Reference for driver auth (secondary Firebase app).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| driverId | string | ✅ | |
| transporterId | string | ✅ | |
| email | string | ✅ | |
| driverName | string | ❌ | |
| phone | string | ❌ | |
| createdAt | Timestamp | ❌ | |

---

### 2.23 `temp_selections`

**Purpose:** Temporary role selection during registration flow.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| (varies) | any | ❌ | Short-lived |

---

## 3. Entity-Relationship Diagram (Mermaid)

```mermaid
erDiagram
    users ||--o| drivers : "is"
    users ||--o| transporters : "is"
    transporters ||--o{ buses : "owns"
    transporters ||--o{ drivers : "employs"
    transporters ||--o{ routes : "operates"
    transporters ||--o{ trips : "runs"
    
    routes ||--o{ trips : "scheduled_as"
    routes ||--o{ stops : "has"
    buses ||--o{ trips : "assigned_to"
    drivers ||--o{ trips : "drives"
    trips ||--o{ bookings : "has"
    trips ||--o{ stops : "stops_at"
    
    users ||--o{ bookings : "makes"
    trips ||--o| bookings : "includes"
    
    buses ||--o{ maintenance : "has"
    buses ||--o{ vehicle_checks : "inspected"
    buses ||--o{ vehicle_issues : "reports"
    
    drivers ||--o{ driver_earnings : "earns"
    drivers ||--o{ delays : "reports"
    drivers ||--o{ emergencies : "reports"
    drivers ||--o{ vehicle_checks : "performs"
    drivers ||--o{ messages : "sends"
    
    transporters ||--o{ notifications : "receives"
    drivers ||--o{ notifications : "receives"
    users ||--o{ notifications : "receives"
    
    transporters ||--o{ alerts : "receives"
    transporters ||--o{ announcements : "sends"
    
    users {
        string uid PK
        string fullName
        string email
        string userType
        string transporterId FK
    }
    
    transporters {
        string transporterId PK
        string companyName
        string email
        string phone
    }
    
    drivers {
        string uid PK_FK
        string fullName
        string transporterId FK
        string status
        string busAssignedId FK
        number totalEarnings
    }
    
    buses {
        string id PK
        string busNumber
        string transporterId FK
        string driverId FK
        string status
    }
    
    routes {
        string id PK
        string code
        string name
        string from
        string to
        string transporterId FK
        number fare
    }
    
    trips {
        string id PK
        string routeId FK
        string busId FK
        string driverId FK
        string transporterId FK
        string status
        number availableSeats
        number fare
    }
    
    bookings {
        string id PK
        string userId FK
        string tripId FK
        array seatIds
        string status
        number total
    }
    
    stops {
        string id PK
        string routeId FK
        string tripId FK
        number sequence
        string name
    }
    
    notifications {
        string id PK
        string transporterId FK
        string driverId FK
        string target
        string message
        boolean read
    }
    
    alerts {
        string id PK
        string transporterId FK
        string message
        boolean acknowledged
    }
    
    maintenance {
        string id PK
        string busId FK
        string transporterId FK
        string type
        timestamp date
    }
    
    driver_earnings {
        string id PK
        string driverId FK
        string tripId FK
        number total
        string date
    }
    
    vehicle_checks {
        string id PK
        string driverId FK
        string busId FK
        string tripId FK
        boolean passed
    }
```

---

## 4. Relationship Explanations

### 4.1 User Hierarchy

- **users** is the central auth table. Each user has exactly one `userType` (passenger, driver, transporter).
- **transporters** and **drivers** extend users: transporter doc ID = user.uid; driver doc ID = user.uid.
- **Passengers** use only the `users` collection (no separate `passengers` collection).

### 4.2 Fleet & Operations

- **transporters** own **buses** and employ **drivers**.
- **routes** define from→to; **trips** are scheduled instances of routes.
- **trips** reference one route, one bus, one driver.
- **stops** belong to routes; for trip-specific state, they can also reference `tripId`.

### 4.3 Booking Flow

- **bookings** connect passengers (userId) to trips (tripId).
- One trip has many bookings; one user has many bookings.
- Seat availability is tracked on the trip (`availableSeats`, `bookedSeats`).

### 4.4 Driver Operations

- **vehicle_checks** link driver, bus, and trip (pre-trip inspection).
- **delays** and **emergencies** are reported by drivers, often for a trip.
- **driver_earnings** are written when a trip is completed (DashboardScreen).

### 4.5 Notifications & Alerts

- **notifications** use `target` (transporter/driver/passenger) and optional `driverId`/`transporterId`/`userId`.
- **alerts** are transporter-focused (e.g. maintenance, emergencies).
- **announcements** go from transporter to all drivers.

---

## 5. Suggested Firestore Structure

### 5.1 Index Recommendations

Create composite indexes for:

1. **trips:** `(routeId, availableSeats)`, `(fromCode, toCode, availableSeats)`, `(driverId, status)`, `(transporterId, status)`, `(date, availableSeats)`
2. **bookings:** `(userId, bookingDate)`, `(tripId, status)`, `(userId, status)`
3. **notifications:** `(transporterId, target, createdAt)`, `(driverId, target, timestamp)`
4. **alerts:** `(transporterId, acknowledged, timestamp)`
5. **driver_earnings:** `(driverId, date)`, `(driverId, timestamp)`
6. **stops:** `(routeId, sequence)`, `(tripId, number)`
7. **maintenance:** `(busId, date)`, `(transporterId, date)`

### 5.2 Gaps to Address

| Gap | Current State | Recommendation |
|-----|---------------|----------------|
| **Trips date/search** | Trips use startDate/endDate; SearchResults expects `date` | Add `date` when expanding recurring trips, or use Cloud Functions to generate daily trip instances |
| **Routes fromCode/toCode** | Routes have from/to; search uses fromCode, toCode | Add fromCode, toCode to routes (map from cities) and copy to trips on creation |
| **Payments** | Mock only | Add `payments` subcollection under `bookings` or a top-level `payments` collection |
| **Emergency SOS** | SOS only shows Alert; no persistence | Write to `emergencies` with driverId, tripId, location, timestamp |
| **Emergency contacts** | Hardcoded in EmergencyScreen | Add `emergency_contacts` collection or store in transporter/driver profile |
| **Alerts for passengers** | TrackScreen uses tripId; loadAlerts receives bookingId | Clarify: use `bookingId` or `tripId` consistently for passenger alerts |
| **Stops creation** | Stops queried by routeId or tripId | Ensure stops are created when routes/trips are created; document creation flow |

### 5.3 Subcollections (Optional)

For scalability, consider:

- `bookings` as subcollection of `users/{userId}/bookings` for "my bookings"
- `notifications` as subcollection of `users/{userId}/notifications` for per-user notifications
- `payments` as subcollection of `bookings/{bookingId}/payments`

---

## 6. Summary

The ZuGo2 app already uses Firestore extensively across passengers, drivers, and transporters. The main missing pieces are:

1. **Payment persistence** – payments are mocked.
2. **SOS persistence** – driver SOS is not stored.
3. **Route/trip search alignment** – fromCode, toCode, and date handling for search.
4. **Stops provisioning** – ensure stops exist for routes/trips used by Route and Track screens.

This schema is intended as a reference for implementation, migration, and index setup.
