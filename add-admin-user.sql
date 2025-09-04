-- Add Admin User Script
-- Run this in your Supabase SQL Editor to add the admin user

-- First, make sure the admin_users table exists
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the admin user with password "9953"
INSERT INTO admin_users (username, password_hash, email) 
VALUES ('admin', '9953', 'admin@golf-tournament.com')
ON CONFLICT (username) 
DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  email = EXCLUDED.email,
  updated_at = NOW();

-- Verify the user was added
SELECT * FROM admin_users WHERE username = 'admin';

-- Enable RLS on admin_users table if not already enabled
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access (you can modify this based on your needs)
CREATE POLICY "Admin users can be viewed by everyone" ON admin_users
  FOR SELECT USING (true);
