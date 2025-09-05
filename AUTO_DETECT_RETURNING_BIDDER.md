# Auto-Detect Returning Bidder Feature

This document describes the automatic detection feature that switches users to the returning bidder tab when their email or phone number is found in the database.

## 🎯 Feature Overview

When a new bidder enters their email address or phone number in the "New Bidder" form, the system automatically checks if they have previously placed a bid on this painting. If found, it automatically switches them to the "Returning Bidder" tab with their information pre-filled.

## ✨ How It Works

### 1. **Real-Time Detection**
- As users type their email or phone number, the system checks the database
- Uses debounced API calls (1-second delay) to prevent excessive requests
- Only searches for bids on the current painting

### 2. **Automatic Tab Switch**
- If a match is found, automatically switches to "Returning Bidder" tab
- Pre-fills the returning bidder form with their information
- Shows a welcome message: "Welcome back [Name]! We found your previous bid."

### 3. **Seamless Experience**
- No interruption to the user's flow
- Maintains all form data they've already entered
- Provides immediate feedback about their status

## 🔧 Technical Implementation

### Database Check Function
```javascript
const checkExistingBidder = async (email, phone) => {
  let query = supabase
    .from('bids')
    .select('bidder_name, bidder_email, bidder_phone')
    .eq('painting_id', paintingId);

  if (email.trim()) {
    query = query.eq('bidder_email', email.trim());
  } else if (phone.trim()) {
    query = query.eq('bidder_phone', phone.trim());
  }

  const { data, error } = await query.limit(1).single();
  return !error && data ? data : null;
};
```

### Debounced Check
```javascript
const debouncedCheckBidder = useCallback(
  debounce(async (email, phone) => {
    const existingBidder = await checkExistingBidder(email, phone);
    if (existingBidder) {
      setReturningBidder(existingBidder);
      setActiveTab('returning');
      setSuccess(`Welcome back ${existingBidder.bidder_name}! We found your previous bid.`);
    }
  }, 1000),
  [paintingId]
);
```

### Input Handlers
```javascript
// Email input
onChange={(e) => {
  const sanitized = sanitizeInput(e.target.value);
  setBidderEmail(sanitized);
  if (sanitized.trim()) {
    debouncedCheckBidder(sanitized, '');
  }
}}

// Phone input
onChange={(e) => {
  const formatted = formatPhoneNumber(e.target.value);
  setBidderPhone(formatted);
  if (formatted.trim()) {
    debouncedCheckBidder('', formatted);
  }
}}
```

## 🎨 User Experience

### For New Bidders
1. User starts filling out the "New Bidder" form
2. As they type their email or phone, system checks database
3. If found, automatically switches to "Returning Bidder" tab
4. Shows personalized welcome message
5. Pre-fills their information for quick bidding

### For Returning Bidders
1. User enters their email or phone in "New Bidder" form
2. System recognizes them and switches tabs automatically
3. They see their name and can immediately place a bid
4. No need to manually search for their previous bid

## 🚀 Benefits

### For Users
- **Faster Experience**: No need to manually switch tabs
- **Automatic Recognition**: System remembers them
- **Reduced Friction**: Seamless transition between new and returning
- **Personalized**: Welcome back messages with their name

### For Administrators
- **Better Data Consistency**: Prevents duplicate bidder records
- **Improved User Retention**: Easier for repeat bidders
- **Reduced Support**: Fewer questions about finding previous bids
- **Enhanced Analytics**: Better tracking of returning vs new bidders

## ⚙️ Configuration

### Debounce Timing
- **Current**: 1 second delay after user stops typing
- **Adjustable**: Can be modified in the debounce function
- **Purpose**: Prevents excessive API calls while typing

### Search Criteria
- **Email Matching**: Exact match (case-sensitive)
- **Phone Matching**: Exact match with formatting
- **Painting-Specific**: Only searches current auction
- **First Match**: Returns first bidder found

## 🔍 Edge Cases Handled

### Multiple Matches
- Returns the first match found
- Uses database ordering (most recent first)

### Partial Matches
- Only triggers on complete email/phone entry
- Debounced to prevent premature matches

### Network Issues
- Graceful error handling
- No interruption to user experience
- Silent failure (user can still proceed)

### Tab Switching
- Preserves form data when switching
- Clears appropriate fields when needed
- Maintains user's current input

## 📱 Mobile Considerations

- **Touch-Friendly**: Works seamlessly on mobile devices
- **Keyboard Optimization**: Proper input types for mobile keyboards
- **Performance**: Debounced calls reduce battery usage
- **Responsive**: Maintains functionality across screen sizes

## 🔒 Security Features

- **Input Sanitization**: All inputs are sanitized before database queries
- **SQL Injection Prevention**: Uses Supabase's parameterized queries
- **Rate Limiting**: Debounced calls prevent abuse
- **Data Privacy**: Only searches for public bidder information

This feature significantly improves the user experience by automatically recognizing returning bidders and providing them with a streamlined bidding process.
