# Auction Bidding System Setup

This document explains how to set up the auction bidding system for your golf event manager.

## Features Implemented

✅ **Supabase client configuration** - Properly configured with environment variables  
✅ **Database table for storing bids** - Complete schema with all required columns  
✅ **Function to insert new bids** - `db.createBid()` with validation  
✅ **Function to fetch highest current bid** - `db.getHighestBid()` with error handling  
✅ **Real-time subscription** - Live updates when new bids are placed  
✅ **Error handling** - Comprehensive error handling for all database operations  
✅ **Loading states** - Visual feedback during bid submission  

## Database Schema

### Paintings Table
- `id` - Primary key
- `title` - Painting title
- `artist` - Artist name
- `year` - Creation year
- `medium` - Art medium (e.g., "Oil on Canvas")
- `dimensions` - Painting dimensions
- `description` - Detailed description
- `image_url` - URL to painting image
- `starting_bid` - Initial bid amount
- `estimated_value` - Estimated value range
- `condition` - Painting condition
- `provenance` - Origin/provenance info
- `auction_end` - When auction ends
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Bids Table
- `id` - Primary key
- `bidder_name` - Name of bidder (required)
- `bidder_email` - Email address (optional)
- `bidder_phone` - Phone number (optional)
- `bid_amount` - Bid amount (required)
- `painting_id` - Foreign key to paintings table
- `created_at` - When bid was placed

## Setup Instructions

### 1. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL script from `setup-auction-tables.sql`
4. This will create the tables, insert sample data, and set up proper permissions

### 2. Environment Configuration

Make sure your `.env` file contains the correct Supabase credentials:

```env
VITE_SUPABASE_URL=https://jgcthbwxoscwcakecupl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Real-time Features

The system automatically sets up real-time subscriptions to listen for new bids. When someone places a bid:

- The current bid amount updates immediately
- New bids appear in the bid history
- Success notifications are shown
- All connected users see updates in real-time

## API Functions

### Painting Functions
- `db.getPaintings()` - Get all paintings
- `db.getPainting(id)` - Get specific painting
- `db.getBids(paintingId)` - Get all bids for a painting
- `db.getHighestBid(paintingId)` - Get the highest bid
- `db.getBidHistory(paintingId, limit)` - Get recent bid history

### Bid Functions
- `db.createBid(bidData)` - Submit a new bid
  - Validates bid amount is higher than current bid
  - Requires bidder name
  - Optional email and phone
  - Returns the created bid

## Error Handling

The system includes comprehensive error handling:

- **Database connection errors** - Shows user-friendly messages
- **Validation errors** - Prevents invalid bids
- **Network errors** - Graceful fallback with retry options
- **Real-time connection issues** - Automatic reconnection

## Loading States

Visual feedback is provided during:

- **Initial data loading** - Spinner while fetching painting data
- **Bid submission** - Button shows loading state with spinner
- **Real-time updates** - Smooth transitions for new data

## Security

- **Row Level Security (RLS)** enabled on all tables
- **Public read access** for paintings and bids
- **Controlled write access** for bid submission
- **Input validation** on both client and server side

## Usage

1. Navigate to the auction bidding page
2. View painting details and current bid
3. Enter your bid amount (must be higher than current bid)
4. Fill in your name (required) and contact info (optional)
5. Click "Place Bid" to submit
6. Watch real-time updates as other users bid

## Customization

You can easily customize:

- **Painting data** - Add more paintings via the database
- **Bid increments** - Modify minimum bid requirements
- **Auction duration** - Update auction end times
- **Styling** - Modify the Tailwind CSS classes
- **Validation rules** - Adjust bid validation logic

## Troubleshooting

### Common Issues

1. **"Failed to load painting data"**
   - Check Supabase connection
   - Verify environment variables
   - Ensure tables exist in database

2. **"Failed to submit bid"**
   - Check internet connection
   - Verify bid amount is higher than current bid
   - Ensure all required fields are filled

3. **Real-time updates not working**
   - Check Supabase real-time is enabled
   - Verify RLS policies allow read access
   - Check browser console for errors

### Debug Mode

Enable debug logging by adding to your browser console:
```javascript
localStorage.setItem('debug', 'supabase:*')
```

This will show detailed Supabase connection and query logs.
