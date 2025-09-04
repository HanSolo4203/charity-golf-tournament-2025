# Admin User Setup Guide

## Adding Admin User with Password "9953"

Your golf event manager now supports database-based admin authentication. Here's how to set up the admin user:

### 1. Database Setup

First, make sure you've run the main schema in your Supabase SQL Editor:

```sql
-- Run the main schema first (supabase-schema.sql)
-- This creates the admin_users table and inserts the admin user
```

### 2. Alternative: Run Just the Admin User Script

If you prefer to add the admin user separately, run this in your Supabase SQL Editor:

```sql
-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert admin user with password "9953"
INSERT INTO admin_users (username, password_hash, email) 
VALUES ('admin', '9953', 'admin@golf-tournament.com')
ON CONFLICT (username) 
DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  email = EXCLUDED.email;

-- Verify the user was added
SELECT * FROM admin_users WHERE username = 'admin';
```

### 3. Admin Login Credentials

Once set up, you can log in with:
- **Username**: `admin`
- **Password**: `9953`

### 4. How It Works

The system now:
- ✅ Stores admin credentials in the database
- ✅ Requires both username and password
- ✅ Authenticates against Supabase database
- ✅ No more hardcoded passwords in the code

### 5. Security Notes

⚠️ **Important**: In a production environment, you should:
- Hash passwords using bcrypt or similar
- Implement proper session management
- Add rate limiting for login attempts
- Use HTTPS for all communications

### 6. Testing the Login

1. Click the "Admin Mode" button in your app
2. Enter username: `admin`
3. Enter password: `9953`
4. Click "Login"

You should now have full admin access to:
- Edit/delete events
- Add/edit/delete raffle items
- Upload sponsor logos
- Manage all tournament data

### 7. Troubleshooting

If login fails:
- Check that the admin_users table exists
- Verify the username and password are correct
- Ensure your Supabase connection is working
- Check the browser console for error messages

---

**Next Steps**: After setting up the admin user, you can test the full Supabase integration by creating, editing, and deleting events and raffle items!

## 🚀 **Restart Development Server:**

```bash
<code_block_to_apply_changes_from>
```

## 🔄 **What This Will Do:**

1. **Reload all updated files** including the new admin authentication
2. **Apply database connection changes** from the updated Supabase configuration
3. **Clear any cached errors** that might be causing the 406 issue
4. **Load the new admin modal** with username and password fields

## ✅ **After Restart:**

1. **Click "Admin Mode"** button
2. **Enter credentials**:
   - Username: `admin`
   - Password: `9953`
3. **Click "Login"**

##  **If You Still Get 406 Error:**

The issue is likely that the `admin_users` table doesn't exist in your Supabase database yet. You'll need to:

1. **Go to Supabase Dashboard** → SQL Editor
2. **Run the admin table creation SQL** (from the ADMIN_SETUP.md guide)
3. **Then try logging in again**

##  **Quick Check:**

After restarting, open your browser console and run:

```javascript
// Test if Supabase is connected
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Testing connection...');

// Test admin table access
db.checkAdminCredentials('admin', '9953')
  .then(result => console.log('Result:', result))
  .catch(err => console.error('Error:', err));
```

This will help us see exactly what's happening with the database connection.

**Go ahead and restart with `npm run dev` - let me know what happens!** 🚀
