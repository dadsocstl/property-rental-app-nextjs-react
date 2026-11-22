# PropertyRental

## Description

PropertyRental is a real estate application designed to streamline the process of renting, buying, and managing properties. It offers features such as property listings, user profiles, and communication tools to connect renters and landlords. The platform is built to make property discovery easy through advanced search filters, bookmarking, and property sharing. PropertyRental integrates essential tools like messaging and property management for users to interact seamlessly within a single environment.

## Features

### Featured Property Listings

- Implemented **Featured Properties** section that highlights selected properties for users to easily discover premium listings.
- Integrated **Pagination** for navigating large sets of property data, improving performance and usability.
- Enhanced **Image Gallery** with lightbox functionality using `react-photoswipe-gallery`, allowing users to view high-quality property images.

### Property Search and Filtering

- Added a **Property Search Form** enabling users to filter properties by location and type.
- Introduced dynamic **Search Results Page** to display filtered properties based on user input.
- Enhanced the homepage **Hero** section to include search capabilities directly, offering a smooth entry point for users to find relevant properties.

### Property Bookmarking, Sharing, and Contacting

- Added **Bookmark** functionality to let users save their favorite properties.
- Enabled **Social Sharing** via `ShareButtons` for platforms like Facebook, Twitter, and WhatsApp.
- Integrated a **Contact Form** on property pages, allowing users to communicate directly with property managers.
- Implemented **Property Maps** using Mapbox and Google Geocoding for displaying property locations.

### Messaging System

- Developed a **Messaging System** that includes inbox functionality, allowing users to send and receive messages related to property inquiries.
- Created actions for **adding**, **deleting**, and **marking messages as read**.
- Added **Unread Message Count** on the navbar for real-time notifications.

### Property Management

- Added **Property Management Tools** for users to add, update, and delete their property listings.
- Created a **Profile Page** where users can view and manage their listed properties.
- Integrated **Edit and Delete** functionality with forms for editing property details and deleting listings, with real-time feedback using `react-toastify`.

### User Authentication and Profiles

- Implemented browser-session sign-in backed by the in-browser SQLite `users` and `session` tables.
- Created user-specific routes like `/profile` and `/properties/add` that require a signed-in session.

### Responsive UI and Loading Indicators

- Designed a responsive **Navbar** with login and menu options, providing an optimized experience across devices.
- Added loading spinners and a custom 404 page for enhanced user experience during data fetches and routing errors.

#### Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Database**: In-browser SQLite (`sql.js`, WebAssembly), persisted to IndexedDB. No database server or connection string is required.
- **Payments**: Stripe Embedded Checkout (card and ACH) and Plaid Auth for bank-account payments, handled by Next.js route handlers
- **Map Services**: Mapbox and Google Geocoding for location display
- **State Management**: React Context API (Global Context)
- **Other Libraries**: React Icons, React Toastify, Photoswipe for image galleries

## Installation

### Prerequisites

- **Node.js** (v14 or above)
- **Stripe** account (test keys are fine) for rent payments
- **Plaid** account (Sandbox is fine) for bank-account payments, optional
- **Mapbox** and **Google Geocoding** keys for maps, optional

### Environment Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/elvan/property-rental-app-nextjs-react.git
   cd property-rental-app-nextjs-react
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables. Create a `.env.local` file in the root of your project with the following values:

   ```env
   STRIPE_SECRET_KEY=<your-stripe-secret-key>
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
   PLAID_CLIENT_ID=<your-plaid-client-id>
   PLAID_SECRET=<your-plaid-secret>
   PLAID_ENV=sandbox
   NEXT_PUBLIC_MAPBOX_TOKEN=<your-mapbox-token>
   NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY=<your-google-geocoding-api-key>
   ```

   There is no database variable. Data lives in a SQLite database that runs in the browser and is saved to IndexedDB, so it is per-browser and is rebuilt from `properties.json` on first load.

4. Run the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view the app in your browser.

## Usage

### Property Search

1. Use the **Property Search Form** on the homepage or the properties page to filter properties by location and type.
2. Browse the search results or navigate the featured properties section for recommended listings.

### Bookmarking Properties

1. To save a property, click the **Bookmark** button on the property details page.
2. View your bookmarked properties under the **Saved Properties** section.

### Messaging

1. Users can contact property managers directly by filling out the **Contact Form** on a property's details page.
2. View incoming messages in the **Messages** section, where you can read, delete, or mark messages as read.

### Managing Properties

1. Sign in to access your **Profile**.
2. Add new properties, or edit and delete existing listings from your **Profile Page**.
3. Use the **Property Management Tools** to modify property details, images, and availability.
