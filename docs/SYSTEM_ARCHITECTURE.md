# ZuGo2 System Architecture Diagram

## High-Level Architecture

```mermaid
flowchart TB
    subgraph Client["📱 Mobile App (React Native)"]
        direction TB
        subgraph PassengerApp["Passenger Module"]
            P_Home[Home / Search]
            P_Book[Booking Flow]
            P_Track[Live Tracking]
            P_Profile[Profile]
        end
        subgraph DriverApp["Driver Module"]
            D_Dashboard[Dashboard]
            D_Boarding[Boarding]
            D_Route[Route Management]
            D_Earnings[Earnings]
        end
        subgraph TransporterApp["Transporter Module"]
            T_Dashboard[Dashboard]
            T_Fleet[Fleet]
            T_Operations[Operations]
            T_Drivers[Drivers]
        end
    end

    subgraph Firebase["☁️ Firebase Backend"]
        Auth[Firebase Authentication]
        
        subgraph Firestore["Firestore Database"]
            C1[(users)]
            C2[(transporters)]
            C3[(drivers)]
            C4[(buses)]
            C5[(routes)]
            C6[(trips)]
            C7[(bookings)]
            C8[(stops)]
            C9[(notifications)]
            C10[(alerts)]
            C11[(driver_earnings)]
            C12[(delays / emergencies)]
            C13[(vehicle_checks)]
            C14[(maintenance)]
            C15[(cities)]
        end
        
        FCM[Firebase Cloud Messaging]
        Functions[Cloud Functions]
    end

    Client --> Auth
    Client --> Firestore
    Client --> FCM
    
    Functions --> Firestore
    Functions --> FCM
    
    Auth -.->|userType| C1
    Firestore --> C1
```

---

## Data Flow: User Types & Firebase Services

```mermaid
flowchart LR
    subgraph Users["User Types"]
        Passenger[👤 Passenger]
        Driver[🚌 Driver]
        Transporter[🏢 Transporter]
    end

    subgraph Auth["Firebase Auth"]
        SignIn[Sign In / Register]
        UID[UID + userType]
    end

    subgraph Data["Firestore Collections"]
        direction TB
        users[(users)]
        transporters[(transporters)]
        drivers[(drivers)]
        buses[(buses)]
        routes[(routes)]
        trips[(trips)]
        bookings[(bookings)]
    end

    Passenger --> SignIn
    Driver --> SignIn
    Transporter --> SignIn
    
    SignIn --> UID
    UID --> users
    
    Passenger --> bookings
    Passenger --> trips
    Passenger --> routes
    Passenger --> cities[(cities)]
    
    Driver --> drivers
    Driver --> trips
    Driver --> vehicle_checks[(vehicle_checks)]
    Driver --> driver_earnings[(driver_earnings)]
    
    Transporter --> transporters
    Transporter --> buses
    Transporter --> drivers
    Transporter --> routes
    Transporter --> trips
```

---

## Notification System Architecture

```mermaid
flowchart TB
    subgraph Mobile["Mobile App"]
        P[Passenger]
        D[Driver]
        T[Transporter]
    end

    subgraph FCMFlow["Push Notification Flow"]
        direction TB
        ReqPerm[Request Permission]
        GetToken[Get FCM Token]
        SaveToken[Save to Firestore]
        ReceiveMsg[Receive FCM Message]
    end

    subgraph FirestoreNotify["Firestore"]
        notif_col[(notifications)]
        drivers_col[(drivers)]
        announcements[(announcements)]
    end

    subgraph CF["Cloud Function"]
        OnAnnounce[onCreate: announcements]
        FetchTokens[Fetch driver fcmTokens]
        SendFCM[admin.messaging().sendMulticast]
    end

    D --> ReqPerm --> GetToken --> SaveToken
    SaveToken -->|fcmToken| drivers_col
    
    T -->|Create announcement| announcements
    announcements --> OnAnnounce
    OnAnnounce --> FetchTokens
    FetchTokens --> drivers_col
    FetchTokens --> SendFCM
    SendFCM -->|Push| D
    
    T -->|Create notification| notif_col
    D -->|Query notifications| notif_col
    P -->|Query notifications| notif_col
    
    ReceiveMsg --> D
```

---

## End-to-End Data Flow: Booking Journey

```mermaid
sequenceDiagram
    participant P as Passenger App
    participant A as Firebase Auth
    participant F as Firestore
    participant D as Driver App
    participant T as Transporter App

    Note over P,T: 1. Search & Book
    P->>A: Sign In
    A-->>P: UID
    P->>F: Query cities, routes
    P->>F: Query trips (fromCode, toCode)
    P->>F: Create booking
    P->>F: Update trip (availableSeats -1)
    F-->>T: Listen trips (optional)

    Note over P,T: 2. Driver Duty
    D->>A: Sign In
    D->>F: Query trips (driverId)
    D->>F: Update trip status → in-progress
    D->>F: Update bus, driver status

    Note over P,T: 3. Boarding
    D->>F: Query bookings (tripId)
    D->>F: Update booking boardingStatus
    P->>F: Listen booking (TrackScreen)

    Note over P,T: 4. Complete
    D->>F: Update trip status → completed
    D->>F: Add driver_earnings
    D->>F: Update driver totalEarnings
    F-->>T: Dashboard reflects revenue
```

---

## Firestore Collections Map

```mermaid
flowchart TB
    subgraph Core["Core Entities"]
        users[(users)]
        transporters[(transporters)]
        drivers[(drivers)]
        buses[(buses)]
    end

    subgraph Operations["Operations"]
        routes[(routes)]
        trips[(trips)]
        stops[(stops)]
        bookings[(bookings)]
    end

    subgraph DriverOps["Driver Operations"]
        vehicle_checks[(vehicle_checks)]
        vehicle_issues[(vehicle_issues)]
        driver_earnings[(driver_earnings)]
        delays[(delays)]
        emergencies[(emergencies)]
    end

    subgraph Fleet["Fleet"]
        maintenance[(maintenance)]
    end

    subgraph Comms["Communications"]
        notifications[(notifications)]
        alerts[(alerts)]
        announcements[(announcements)]
        messages[(messages)]
    end

    subgraph Reference["Reference Data"]
        cities[(cities)]
        search_history[(search_history)]
        settings[(settings)]
        driver_credentials[(driver_credentials)]
        temp_selections[(temp_selections)]
    end

    transporters --> buses
    transporters --> drivers
    transporters --> routes
    transporters --> trips
    
    routes --> trips
    buses --> trips
    drivers --> trips
    
    trips --> bookings
    trips --> stops
    
    drivers --> vehicle_checks
    drivers --> driver_earnings
    drivers --> delays
    drivers --> emergencies
    
    buses --> maintenance
    buses --> vehicle_checks
```

---

## Cloud Functions (Current)

```mermaid
flowchart LR
    subgraph Trigger["Firestore Trigger"]
        A[announcements/{id}]
    end

    subgraph Function["sendAnnouncementNotification"]
        OnCreate[onCreate]
        Query[Query drivers where status=active]
        Tokens[Collect fcmTokens]
        Send[FCM sendMulticast]
    end

    subgraph Result["Result"]
        Push[Push to Driver Devices]
    end

    A -->|document created| OnCreate
    OnCreate --> Query
    Query --> Tokens
    Tokens --> Send
    Send --> Push
```

| Function | Trigger | Action |
|----------|---------|--------|
| `sendAnnouncementNotification` | `announcements` onCreate | Fetches active driver FCM tokens, sends multicast push notification |

---

## Component Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Mobile App** | React Native | Single codebase for Passenger, Driver, Transporter flows |
| **Firebase Auth** | Email/password, OTP | Identity; `userType` in `users` drives navigation |
| **Firestore** | NoSQL | Primary database; 23+ collections |
| **Cloud Messaging** | FCM | Push notifications (drivers store fcmToken) |
| **Cloud Functions** | Node.js | `sendAnnouncementNotification` on announcements |

---

## Data Flow Summary

| Flow | Source | Target | Data |
|------|--------|--------|------|
| **Passenger books** | Passenger App | Firestore | `bookings`, `trips` (seat count) |
| **Driver starts duty** | Driver App | Firestore | `trips`, `buses`, `drivers` status |
| **Driver boards** | Driver App | Firestore | `bookings` boardingStatus |
| **Transporter announces** | Transporter App | Firestore + FCM | `announcements`, `notifications` → FCM to drivers |
| **Delay/Emergency** | Driver App | Firestore | `delays`, `emergencies` |
| **Earnings** | Driver App (end duty) | Firestore | `driver_earnings`, `drivers`, `trips` |
