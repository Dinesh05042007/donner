-- Food Donation Connect Database Schema - Tamil Nadu Edition
CREATE DATABASE IF NOT EXISTS food_donation_connect;
USE food_donation_connect;

DROP TABLE IF EXISTS donations;

CREATE TABLE IF NOT EXISTS donations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_name VARCHAR(100) NOT NULL,
  food_type VARCHAR(100) NOT NULL,
  category VARCHAR(50) DEFAULT 'Prepared Meals',
  city VARCHAR(50) NOT NULL DEFAULT 'Chennai',
  quantity VARCHAR(50) NOT NULL,
  expiry_time VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  distance_km DECIMAL(3,1) DEFAULT 1.5,
  recipient_type VARCHAR(50) NOT NULL DEFAULT 'NGO',
  status VARCHAR(30) NOT NULL DEFAULT 'Available',
  assigned_volunteer VARCHAR(100) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO donations (donor_name, food_type, category, city, quantity, expiry_time, location, distance_km, recipient_type, status, assigned_volunteer, notes)
VALUES
  ('Ananda Bhavan Grand', 'Buffet Surplus - South Indian Meals & Sambhar Rice', 'Prepared Meals', 'Chennai', '45 portions', 'Today, 8:30 PM (2 hrs left)', 'T. Nagar, Usman Road', 1.2, 'NGO', 'Available', NULL, 'Packed in sealed thermal food boxes.'),
  ('PSG Convention Hall', 'Catered Marriage Feast - Veg Biryani & Sweets', 'Prepared Meals', 'Coimbatore', '60 portions', 'Today, 9:00 PM (3 hrs left)', 'Peelamedu, Avinashi Road', 0.8, 'Volunteer', 'Available', NULL, 'Hot containers ready for immediate dispatch.'),
  ('Temple View Restaurant', 'Idli, Dosa Batter & Chutney Surplus', 'Prepared Meals', 'Madurai', '30 portions', 'Tomorrow, 11:00 AM', 'KK Nagar, Near City Hospital', 1.5, 'NGO', 'Available', NULL, 'Hygienically stored in cold storage.'),
  ('Srirangam Catering Services', 'Traditional Meals & Poriyal Surplus', 'Prepared Meals', 'Tiruchirappalli', '50 portions', 'Today, 7:30 PM (1 hr left)', 'Thillai Nagar, 10th Cross', 2.1, 'Community Center', 'Accepted', 'Karthik Raja (Volunteer)', 'In transit via insulated vehicle.'),
  ('Salem Green Farms Market', 'Fresh Organic Vegetable Baskets & Fruits', 'Fresh Produce', 'Salem', '15 crates', 'Tomorrow, 5:00 PM', 'Fairlands, Main Road', 3.0, 'NGO', 'Delivered', 'Priya Sundaram (Volunteer)', 'Delivered to Hope Shelter NGO.'),
  ('Vellore Bakery Hub', 'Fresh Baked Bread Loaves & Evening Snacks', 'Bakery', 'Vellore', '40 packs', 'Today, 10:00 PM', 'Katpadi, Near VIT Gate 2', 1.8, 'Volunteer', 'Available', NULL, 'Stored in dry container, ready for pickup.');
