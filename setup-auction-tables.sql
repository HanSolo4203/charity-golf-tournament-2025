-- Setup script for auction bidding tables
-- Run this in your Supabase SQL Editor

-- Create paintings table for auction items
CREATE TABLE IF NOT EXISTS paintings (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  year VARCHAR(10),
  medium VARCHAR(255),
  dimensions VARCHAR(100),
  description TEXT,
  image_url TEXT,
  starting_bid DECIMAL(10,2) NOT NULL,
  estimated_value VARCHAR(100),
  condition VARCHAR(100),
  provenance TEXT,
  auction_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bids table for auction bidding
CREATE TABLE IF NOT EXISTS bids (
  id SERIAL PRIMARY KEY,
  bidder_name VARCHAR(255) NOT NULL,
  bidder_email VARCHAR(255),
  bidder_phone VARCHAR(50),
  bid_amount DECIMAL(10,2) NOT NULL,
  painting_id INTEGER REFERENCES paintings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample painting data
INSERT INTO paintings (title, artist, year, medium, dimensions, description, image_url, starting_bid, estimated_value, condition, provenance, auction_end) VALUES
('Sunset Over the Golf Course', 'Maria Rodriguez', '2024', 'Oil on Canvas', '24" x 36"', 'A breathtaking oil painting capturing the golden hour light dancing across the rolling greens of a championship golf course. The artist masterfully blends warm oranges and purples in the sky with the vibrant emerald tones of the fairways, creating a serene yet dynamic composition that evokes the peaceful beauty of the sport.', 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=800&h=600&fit=crop&crop=center', 1500.00, 'R3,500 - R4,500', 'Excellent', 'Direct from artist''s studio', '2025-09-08T18:00:00Z');

-- Insert sample bids data
INSERT INTO bids (bidder_name, bidder_email, bidder_phone, bid_amount, painting_id) VALUES
('Sarah M.', 'sarah@example.com', '+27 82 123 4567', 2500.00, 1),
('John D.', 'john@example.com', '+27 82 234 5678', 2200.00, 1),
('Emma L.', 'emma@example.com', '+27 82 345 6789', 2000.00, 1),
('Mike R.', 'mike@example.com', '+27 82 456 7890', 1800.00, 1);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bids_painting_id ON bids(painting_id);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(bid_amount DESC);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paintings_auction_end ON paintings(auction_end);

-- Enable Row Level Security for new tables
ALTER TABLE paintings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for paintings
CREATE POLICY "Paintings are viewable by everyone" ON paintings
  FOR SELECT USING (true);

CREATE POLICY "Paintings can be inserted by authenticated users" ON paintings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Paintings can be updated by authenticated users" ON paintings
  FOR UPDATE USING (true);

CREATE POLICY "Paintings can be deleted by authenticated users" ON paintings
  FOR DELETE USING (true);

-- Create RLS policies for bids
CREATE POLICY "Bids are viewable by everyone" ON bids
  FOR SELECT USING (true);

CREATE POLICY "Bids can be inserted by everyone" ON bids
  FOR INSERT WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for paintings updated_at
CREATE TRIGGER update_paintings_updated_at BEFORE UPDATE ON paintings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
