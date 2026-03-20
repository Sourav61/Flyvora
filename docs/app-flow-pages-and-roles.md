🗺️ Site Map (Top-Level Pages)

/ → Home (Flight Search)

/flights → Search Results

/flights/:id → Flight Details + Seat Selection

/booking → Booking Summary

/payment → Payment Page

/confirmation → Booking Confirmation

/login → Login / Signup

/admin → Admin Dashboard

/admin/flights → Manage Flights

/admin/bookings → View Bookings

📌 Purpose of Each Page

Home (/)
→ Start here. Search flights instantly (no login)

Search Results (/flights)
→ Show filtered flights with pricing + details

Flight Details (/flights/:id)
→ Seat selection + live availability

Booking (/booking)
→ Review selected seat + flight

Payment (/payment)
→ Complete transaction

Confirmation (/confirmation)
→ Show success + ticket details

Login (/login)
→ Authenticate only when needed

Admin Pages

Admin Dashboard (/admin)
→ Overview (stats, quick actions)

Manage Flights (/admin/flights)
→ Add/edit flights + seats

Bookings (/admin/bookings)
→ Track bookings + revenue

👥 User Roles & Access
🧑‍💻 Guest User (Not Logged In)

Can:

Search flights

View seat map

Explore UI

Cannot:

Reserve seats

Make payment

👤 Authenticated User

Can:

Reserve seat

Complete booking

View confirmation

🛠️ Admin

Access via: Top-right menu → “Admin”

Can:

Add/edit flights

Manage seat inventory

View bookings

Track revenue

🔄 Primary User Journeys
✈️ 1. Flight Booking Flow (Core)

Search flight (Home)

Select seat (Flight page)

Login → Pay → Confirm

💳 2. Payment Failure Flow

Attempt payment

Payment fails

Seat auto-released + retry option

🔐 3. Auth Gate Flow (Critical UX)

User clicks “Continue to Booking”

If not logged in → show login modal

After login → resume booking

🛠️ 4. Admin Flow

Open Admin Dashboard

Add/manage flights

Monitor bookings

🎯 Key Flow Rules (Don’t Break These)

No login required at entry

Login only at booking step

Seat lock only after auth

Always show system status:

seat held

time remaining

next action