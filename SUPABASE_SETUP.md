# 🚀 Supabase Setup Guide for Golf Event Manager

## 📋 Prerequisites
- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Your golf event manager application running locally

## 🔧 Step 1: Create a New Supabase Project

1. **Sign in to Supabase** and click "New Project"
2. **Choose your organization** (or create one)
3. **Enter project details**:
   - Name: `golf-event-manager` (or your preferred name)
   - Database Password: Create a strong password
   - Region: Choose closest to your users
4. **Click "Create new project"** and wait for setup to complete

## 🗄️ Step 2: Set Up Database Schema

1. **Go to SQL Editor** in your Supabase dashboard
2. **Copy and paste** the contents of `supabase-schema.sql`
3. **Click "Run"** to execute the schema
4. **Verify tables are created** in the Table Editor

## 🔑 Step 3: Get Your API Keys

1. **Go to Settings > API** in your Supabase dashboard
2. **Copy these values**:
   - Project URL (looks like: `https://abcdefghijklmnop.supabase.co`)
   - Anon public key (starts with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## 🌍 Step 4: Configure Environment Variables

1. **Create a `.env.local` file** in your project root:
   ```bash
   # Copy env.example to .env.local
   cp env.example .env.local
   ```

2. **Edit `.env.local`** and add your actual values:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## 🗂️ Step 5: Set Up Storage Bucket

1. **Go to Storage** in your Supabase dashboard
2. **Click "New Bucket"**
3. **Create bucket**:
   - Name: `sponsor-logos`
   - Public bucket: ✅ (checked)
   - File size limit: 5MB
   - Allowed MIME types: `image/*`
4. **Click "Create bucket"**

## 🔒 Step 6: Configure Storage Policies

1. **Go to Storage > Policies** for the `sponsor-logos` bucket
2. **Add these policies**:

```sql
-- Allow public read access to logos
CREATE POLICY "Logos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'sponsor-logos');

-- Allow authenticated users to upload logos
CREATE POLICY "Users can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'sponsor-logos');

-- Allow users to update their own logos
CREATE POLICY "Users can update logos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'sponsor-logos');

-- Allow users to delete logos
CREATE POLICY "Users can delete logos" ON storage.objects
  FOR DELETE USING (bucket_id = 'sponsor-logos');
```

## 🧪 Step 7: Test Your Integration

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Check the browser console** for any Supabase connection errors
3. **Try creating/editing events** in admin mode
4. **Test logo uploads** for raffle items

## 📱 Step 8: Update Your Component

The Supabase integration is already set up in your `GolfEventManager.jsx`. The component will now:

- ✅ **Load events** from Supabase on component mount
- ✅ **Save new events** to the database
- ✅ **Update existing events** in real-time
- ✅ **Delete events** with confirmation
- ✅ **Manage raffle items** with logo uploads
- ✅ **Handle image storage** for sponsor logos

## 🔍 Troubleshooting

### Common Issues:

1. **"Missing Supabase environment variables"**
   - Check your `.env.local` file exists
   - Verify variable names are correct
   - Restart your dev server

2. **"Failed to fetch" errors**
   - Check your Supabase URL is correct
   - Verify your anon key is valid
   - Check browser console for CORS issues

3. **"Permission denied" errors**
   - Verify RLS policies are set correctly
   - Check storage bucket permissions
   - Ensure tables exist in your database

4. **Logo uploads not working**
   - Check storage bucket exists
   - Verify storage policies are set
   - Check file size limits

## 🚀 Next Steps

After successful setup, you can:

1. **Deploy to production** with your Supabase project
2. **Add authentication** for admin users
3. **Set up real-time subscriptions** for live updates
4. **Add analytics** and monitoring
5. **Scale your application** as needed

## 📞 Support

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Community**: [github.com/supabase/supabase/discussions](https://github.com/supabase/supabase/discussions)
- **Discord**: [discord.supabase.com](https://discord.supabase.com)

---

**🎯 Your golf event manager is now powered by Supabase!** 

The application will automatically sync with your database, providing real-time updates and persistent storage for all your tournament events and raffle prizes.
