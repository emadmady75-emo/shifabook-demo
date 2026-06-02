# ShifaBook (شفاء بوك) — Arabic-First Clinic Booking System MVP

An Arabic-first Clinic Booking System MVP built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**. Focused on maximum simplicity, speed, and conversion. Patients can book an appointment in under 30 seconds with an experience resembling airline seat selection.

---

## Core Product Vision

* **Ultra-Fast Booking**: Zero account creation, zero medical history forms, zero logins. Just select, enter name & mobile number, and book.
* **Seat-Selection Feel**: A highly interactive visual time-slot grid (Available, Booked, Expired).
* **Doctor Empowerment**: A premium dashboard featuring today's statistics, occupancy rates, and a dynamic schedule generator.
* **Rescheduling Built-In**: Intelligent localStorage-based rescheduling that prevents duplicate bookings and automatically moves the patient's slot.

---

## Technical Stack & Layout

* **Framework**: [Next.js](https://nextjs.org/) (App Router, TypeScript)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **Default Language**: Arabic (RTL support out-of-the-box), with optional English translation toggle.
* **State Management**: Highly optimized React State, syncing to LocalStorage for persistent booking retrieval and rescheduling triggers.

---

## Project Structure

```text
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root Layout configuring Tajawal Arabic Font, dir="rtl", and metadata
│   │   ├── page.tsx                # Patient Booking and Landing Workspace (Hero, Day Carousel, Visual Grid)
│   │   ├── globals.css             # Tailwind Directives & custom scrollbars/micro-animations
│   │   └── doctor/
│   │       └── page.tsx            # Doctor Dashboard Workspace (Stats, Live Bookings, Schedule Builder)
│   └── components/
│       ├── Navbar.tsx              # Premium Header with clinic branding & language switchers
│       ├── Footer.tsx              # Clean footer with professional trust signals
│       ├── booking/
│       │   ├── HeroSection.tsx     # Calm healthcare branding & dynamic CTAs
│       │   ├── DaySelector.tsx     # Swiper/carousel of booking dates
│       │   ├── BookingGrid.tsx     # Visual interactive airline-seat-style appointment selector
│       │   ├── BookingModal.tsx    # Simple modal collecting name & mobile phone numbers
│       │   └── RescheduleAlert.tsx # Dynamic notification indicating a user has an active booking to relocate
│       └── doctor/
│           ├── StatsDashboard.tsx  # Dashboard widgets (Occupancy %, counts)
│           ├── ScheduleBuilder.tsx # Weekly Schedule Builder form with automatic slot calculator
│           └── AppointmentsList.tsx# Table of all bookings with cancel/complete interactions
├── PRD.md                          # Full Product Architecture, Flows, Diagrams, Data Models
├── README.md                       # Setup & Operations Guide
├── tailwind.config.ts              # Design tokens (calm teal, emerald green, warm light backgrounds)
├── package.json
└── tsconfig.json
```

---

## Getting Started

### 1. Installation
Clone/copy the workspace and install the dependencies:
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the patient-facing portal and [http://localhost:3000/doctor](http://localhost:3000/doctor) for the doctor management dashboard.

### 3. Build Verification
Verify Typescript compilation and build production-ready optimized static files:
```bash
npm run build
```
