-- Supabase Database Schema for Golf Event Manager
-- Run this in your Supabase SQL Editor

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  time TIME NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  participants VARCHAR(255),
  event_type VARCHAR(100),
  icon VARCHAR(50),
  color VARCHAR(50),
  additional_info TEXT,
  contact_person VARCHAR(255),
  contact_phone VARCHAR(50),
  special_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create raffle_items table
CREATE TABLE IF NOT EXISTS raffle_items (
  id SERIAL PRIMARY KEY,
  prize VARCHAR(255) NOT NULL,
  sponsor VARCHAR(255) NOT NULL,
  value VARCHAR(100),
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_users table (optional for future authentication)
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization_settings table
CREATE TABLE IF NOT EXISTS organization_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample events data
INSERT INTO events (time, title, description, location, participants, event_type, icon, color, additional_info, contact_person, contact_phone, special_notes) VALUES
('06:00:00', 'Breakfast', 'Start your day with a hearty breakfast', 'Main Clubhouse', 'All Players', 'Dining', 'Coffee', 'amber', 'Full English breakfast buffet including continental options. Vegetarian and gluten-free alternatives available. Coffee, tea, and fresh juices served. Please arrive 15 minutes early to ensure smooth service.', 'Sarah Johnson', '+27 82 123 4567', 'Dietary requirements must be communicated 24 hours in advance.'),
('06:45:00', 'Transfer to Golf Course', 'Golfers depart for the course', 'Hotel Lobby', 'Tournament Players', 'Transportation', 'MapPin', 'blue', 'Shuttle buses will depart from the hotel lobby every 15 minutes. Golf clubs and equipment will be transported separately. Please ensure your golf bag is clearly labeled with your name. Journey time approximately 20 minutes.', 'Mike Thompson', '+27 82 234 5678', 'Last shuttle departs at 07:00 sharp. Late arrivals will need to arrange alternative transport.'),
('07:00:00', 'Tee-Off (Sharp Start)', '18-hole tournament begins - be ready!', 'Golf Course - First Tee', 'Tournament Players', 'Competition', 'Trophy', 'emerald', 'Shotgun start format with groups of 4 players. Each group will be assigned a starting hole. Tournament rules briefing at 06:45. Handicap certificates required. GPS devices and rangefinders permitted.', 'David Wilson', '+27 82 345 6789', 'Players must be at their assigned tee 10 minutes before start time. Dress code: Collared shirts and golf shoes required.'),
('08:00:00', 'Kids Treasure Hunt', 'Special activity for the young ones', 'Clubhouse Gardens', 'Children & Families', 'Activity', 'Users', 'violet', 'Exciting treasure hunt with golf-themed clues and prizes. Children will be divided into age groups: 5-8 years and 9-12 years. Parental supervision required. Prizes include golf lessons and junior equipment.', 'Lisa Chen', '+27 82 456 7890', 'Registration required by 07:30. Children should wear comfortable clothing and closed shoes. Snacks and refreshments provided.'),
('13:30:00', 'Lunch Time', 'Lunch available (own account) - mini-competitions during lunch', 'Restaurant Terrace', 'All Attendees', 'Dining', 'Coffee', 'amber', 'A la carte menu available with golf-themed specials. Mini putting competition on the terrace. Longest drive challenge using foam balls. Prizes for competition winners. Cash and card payments accepted.', 'Chef Marco', '+27 82 567 8901', 'Reservations recommended for groups larger than 6. Special dietary requirements can be accommodated with advance notice.'),
('15:30:00', 'Prize Giving Ceremony', 'Awards presentation and celebration', 'Main Function Room', 'All Attendees', 'Ceremony', 'Trophy', 'yellow', 'Presentation of tournament trophies and prizes. Special recognition for charity fundraising achievements. Guest speaker: Professional golfer and charity ambassador. Light refreshments and networking opportunity.', 'Emma Rodriguez', '+27 82 678 9012', 'Formal dress code recommended. Photography and video recording permitted. Live streaming available for remote attendees.'),
('16:00:00', 'End of Golf Tournament', 'Thank you for participating in our Charity Golf Day!', 'Main Function Room', 'All Attendees', 'Ceremony', 'Trophy', 'emerald', 'Final thank you and closing remarks. Collection of feedback forms. Information about next year''s event. Charity donation collection and final fundraising total announcement.', 'Event Coordinator', '+27 82 789 0123', 'Please complete feedback forms before leaving. Shuttle service back to hotel available until 17:00.');

-- Insert sample raffle items data
INSERT INTO raffle_items (prize, sponsor, value, description, logo_url) VALUES
('Golf Equipment Set', 'Pro Golf Shop', '$500', 'Complete set of premium golf clubs', 'https://via.placeholder.com/120x60/2563eb/ffffff?text=PRO+GOLF'),
('Weekend Golf Package', 'Mountain View Resort', '$800', '2 nights accommodation + golf for 2', 'https://via.placeholder.com/120x60/059669/ffffff?text=MOUNTAIN+VIEW'),
('Golf Lesson Package', 'Elite Golf Academy', '$300', '5 private lessons with PGA professional', 'https://via.placeholder.com/120x60/7c3aed/ffffff?text=ELITE+ACADEMY');

-- Insert organization settings
INSERT INTO organization_settings (setting_key, setting_value) VALUES
('organization_logo_url', 'https://via.placeholder.com/240x80/0f172a/ffffff?text=YOUR+LOGO'),
('organization_name', 'The Charity Golf Tournament 2025');

-- Insert admin user with password "9953"
INSERT INTO admin_users (username, password_hash, email) VALUES
('admin', '9953', 'admin@golf-tournament.com');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_time ON events(time);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_raffle_items_sponsor ON raffle_items(sponsor);

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access
CREATE POLICY "Events are viewable by everyone" ON events
  FOR SELECT USING (true);

CREATE POLICY "Raffle items are viewable by everyone" ON raffle_items
  FOR SELECT USING (true);

-- Create RLS policies for authenticated users (you can modify these based on your needs)
CREATE POLICY "Users can insert events" ON events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update events" ON events
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete events" ON events
  FOR DELETE USING (true);

CREATE POLICY "Users can insert raffle items" ON raffle_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update raffle items" ON raffle_items
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete raffle items" ON raffle_items
  FOR DELETE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_raffle_items_updated_at BEFORE UPDATE ON raffle_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_settings_updated_at BEFORE UPDATE ON organization_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
