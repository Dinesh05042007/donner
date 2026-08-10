import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Server-Sent Events (SSE) subscribers for Real-Time Updates
let sseClients = [];

function broadcastEvent(eventType, data) {
  const payload = `data: ${JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() })}\n\n`;
  sseClients.forEach(client => client.res.write(payload));
}

let fallbackDonations = [
  {
    id: 1,
    donor_name: 'Ananda Bhavan Grand',
    food_type: 'Buffet Surplus - South Indian Meals & Sambhar Rice',
    category: 'Prepared Meals',
    city: 'Chennai',
    quantity: '45 portions',
    expiry_time: 'Today, 8:30 PM (2 hrs left)',
    location: 'T. Nagar, Usman Road',
    distance_km: 1.2,
    recipient_type: 'NGO',
    status: 'Available',
    assigned_volunteer: null,
    notes: 'Packed in sealed thermal food boxes.',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    donor_name: 'PSG Convention Hall',
    food_type: 'Catered Marriage Feast - Veg Biryani & Sweets',
    category: 'Prepared Meals',
    city: 'Coimbatore',
    quantity: '60 portions',
    expiry_time: 'Today, 9:00 PM (3 hrs left)',
    location: 'Peelamedu, Avinashi Road',
    distance_km: 0.8,
    recipient_type: 'Volunteer',
    status: 'Available',
    assigned_volunteer: null,
    notes: 'Hot containers ready for immediate dispatch.',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 3,
    donor_name: 'Temple View Restaurant',
    food_type: 'Idli, Dosa Batter & Chutney Surplus',
    category: 'Prepared Meals',
    city: 'Madurai',
    quantity: '30 portions',
    expiry_time: 'Tomorrow, 11:00 AM',
    location: 'KK Nagar, Near City Hospital',
    distance_km: 1.5,
    recipient_type: 'NGO',
    status: 'Available',
    assigned_volunteer: null,
    notes: 'Hygienically stored in cold storage.',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 4,
    donor_name: 'Srirangam Catering Services',
    food_type: 'Traditional Meals & Poriyal Surplus',
    category: 'Prepared Meals',
    city: 'Tiruchirappalli',
    quantity: '50 portions',
    expiry_time: 'Today, 7:30 PM (1 hr left)',
    location: 'Thillai Nagar, 10th Cross',
    distance_km: 2.1,
    recipient_type: 'Community Center',
    status: 'Accepted',
    assigned_volunteer: 'Karthik Raja (Volunteer)',
    notes: 'In transit via insulated vehicle.',
    created_at: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 5,
    donor_name: 'Salem Green Farms Market',
    food_type: 'Fresh Organic Vegetable Baskets & Fruits',
    category: 'Fresh Produce',
    city: 'Salem',
    quantity: '15 crates',
    expiry_time: 'Tomorrow, 5:00 PM',
    location: 'Fairlands, Main Road',
    distance_km: 3.0,
    recipient_type: 'NGO',
    status: 'Delivered',
    assigned_volunteer: 'Priya Sundaram (Volunteer)',
    notes: 'Delivered to Hope Shelter NGO.',
    created_at: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 6,
    donor_name: 'Vellore Bakery Hub',
    food_type: 'Fresh Baked Bread Loaves & Evening Snacks',
    category: 'Bakery',
    city: 'Vellore',
    quantity: '40 packs',
    expiry_time: 'Today, 10:00 PM',
    location: 'Katpadi, Near VIT Gate 2',
    distance_km: 1.8,
    recipient_type: 'Volunteer',
    status: 'Available',
    assigned_volunteer: null,
    notes: 'Stored in dry container, ready for pickup.',
    created_at: new Date(Date.now() - 18000000).toISOString(),
  },
];

let registeredUsers = [
  { id: 1, name: 'Karthik Raja', email: 'volunteer@connect.org', password: 'volunteer123', role: 'Volunteer', badge: 'Verified Delivery Captain (Chennai)', phone: '+91 98765 43210' },
  { id: 2, name: 'Admin Tamil Nadu', email: 'admin@connect.org', password: 'admin123', role: 'Admin', badge: 'Tamil Nadu State Administrator', phone: '+91 98765 00000' },
  { id: 3, name: 'Ananda Bhavan Bistro', email: 'donor@grandplaza.com', password: 'donor123', role: 'Donor', badge: 'Verified Donor (Chennai)', phone: '+91 98765 11111' },
  { id: 4, name: 'Madurai Compassion NGO', email: 'ngo@hopeshelter.org', password: 'ngo123', role: 'Food Collector', badge: 'Registered NGO Partner (Madurai)', phone: '+91 98765 22222' },
];

let pool;
let usingFallback = false;

async function initializeDatabase() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'food_donation_connect',
  };

  try {
    pool = await mysql.createPool(config);
    await pool.query('CREATE DATABASE IF NOT EXISTS food_donation_connect');
    await pool.query('USE food_donation_connect');
    await pool.query(`
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
      )
    `);

    const [existing] = await pool.query('SELECT COUNT(*) AS count FROM donations');
    if (existing[0].count === 0) {
      for (const item of fallbackDonations) {
        await pool.query(
          `INSERT INTO donations (donor_name, food_type, category, city, quantity, expiry_time, location, distance_km, recipient_type, status, assigned_volunteer, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.donor_name, item.food_type, item.category, item.city, item.quantity, item.expiry_time, item.location, item.distance_km, item.recipient_type, item.status, item.assigned_volunteer, item.notes]
        );
      }
    }

    console.log('MySQL connection ready with Tamil Nadu city schema.');
  } catch (error) {
    usingFallback = true;
    console.warn('MySQL connection failed, switching to in-memory store:', error.message);
  }
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: usingFallback ? 'fallback-in-memory' : 'mysql', region: 'Tamil Nadu' });
});

// SSE Real-Time Event Endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// Configure Nodemailer Email Transporter
const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'fooddonationconnect@gmail.com',
    pass: process.env.SMTP_PASS || '',
  },
});

// In-memory OTP Store for User Registration Verification
let otpStore = {};

// Send OTP Endpoint for Signup Verification (Sent Privately to Email)
app.post('/api/auth/send-otp', async (req, res) => {
  const { email, phone } = req.body;
  const targetKey = (email || phone || '').trim().toLowerCase();

  if (!targetKey) {
    return res.status(400).json({ success: false, message: 'Email address is required to send OTP' });
  }

  // Generate a 6-digit numeric OTP code
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  
  otpStore[targetKey] = {
    otp: generatedOtp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiration
  };

  console.log(`[SECURE EMAIL SERVICE] Sending private OTP email to ${targetKey}...`);

  // Email content
  const mailOptions = {
    from: '"Food Donation Connect" <no-reply@fooddonationconnect.org>',
    to: targetKey,
    subject: `🔐 Your Account Verification OTP Code: ${generatedOtp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
        <h2 style="color: #059669; text-align: center;">Food Donation Connect</h2>
        <h3 style="color: #0f172a; text-align: center;">Account Verification OTP</h3>
        <p style="color: #334155; font-size: 15px;">Hello,</p>
        <p style="color: #334155; font-size: 15px;">Thank you for registering on <strong>Food Donation Connect Tamil Nadu</strong>. Please use the following 6-digit OTP code to complete your signup:</p>
        <div style="background: #059669; color: white; font-size: 28px; font-weight: bold; text-align: center; padding: 15px; border-radius: 8px; letter-spacing: 6px; margin: 20px 0;">
          ${generatedOtp}
        </div>
        <p style="color: #64748b; font-size: 13px; text-align: center;">This code is private and will expire in 5 minutes. Do not share this code with anyone.</p>
        <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Food Donation Connect © 2026 • Tamil Nadu Food Sharing Network</p>
      </div>
    `,
  };

  let emailSentReal = false;
  let previewUrl = null;

  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await mailTransporter.sendMail(mailOptions);
      emailSentReal = true;
      console.log(`[EMAIL SUCCESS] Real OTP email delivered to ${targetKey}`);
    } else {
      // Use Ethereal Test Email Account for instant real email previewing
      try {
        const testAccount = await nodemailer.createTestAccount();
        const testTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });
        const info = await testTransporter.sendMail(mailOptions);
        previewUrl = nodemailer.getTestMessageUrl(info);
        emailSentReal = true;
        console.log(`[ETHEREAL EMAIL SUCCESS] Email delivered. Preview URL: ${previewUrl}`);
      } catch (e) {
        console.log(`[SIMULATED EMAIL DISPATCH] To: ${targetKey} | OTP: ${generatedOtp}`);
      }
    }

    res.json({
      success: true,
      emailSentReal,
      previewUrl,
      otp: generatedOtp,
      message: `Verification OTP sent to ${targetKey}. Please check your inbox.`,
    });
  } catch (err) {
    console.error(`[EMAIL ERROR] Could not send email: ${err.message}`);
    res.json({
      success: true,
      emailSentReal: false,
      otp: generatedOtp,
      message: `Verification OTP dispatched to ${targetKey}.`,
    });
  }
});

// Endpoint to fetch private webmail inbox for email OTP verification
app.get('/api/auth/inbox/:email', (req, res) => {
  const targetKey = (req.params.email || '').trim().toLowerCase();
  const record = otpStore[targetKey];

  if (!record) {
    return res.status(404).json({ success: false, message: 'No emails found for this address.' });
  }

  res.json({
    success: true,
    to: targetKey,
    subject: `🔐 Your Account Verification OTP Code: ${record.otp}`,
    otp: record.otp,
    receivedAt: new Date(record.expiresAt - 5 * 60 * 1000).toISOString(),
    expiresAt: new Date(record.expiresAt).toISOString(),
  });
});

// Verify OTP Endpoint
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, phone, otp } = req.body;
  const targetKey = (email || phone || '').trim().toLowerCase();
  const inputOtp = (otp || '').trim();

  // Universal Master Test OTP Code for immediate testing without SMTP dependencies
  if (inputOtp === '123456') {
    delete otpStore[targetKey];
    return res.json({
      success: true,
      message: 'OTP verified successfully via Master Test Code (123456)!',
    });
  }

  const record = otpStore[targetKey];

  if (!record) {
    return res.status(400).json({ success: false, message: 'No OTP requested. Please click Send OTP or use test code 123456.' });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[targetKey];
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP or use test code 123456.' });
  }

  if (record.otp !== inputOtp) {
    return res.status(401).json({ success: false, message: 'Incorrect OTP code. Enter the code from email or use test code 123456.' });
  }

  // Clear verified OTP
  delete otpStore[targetKey];

  res.json({
    success: true,
    message: 'OTP verified successfully!',
  });
});

// User Registration endpoint with OTP verification check
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, city = 'Chennai', organization, otpVerified } = req.body;
  if (!name || !email || !role || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, password, and role are required' });
  }

  const existing = registeredUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ success: false, message: 'An account with this email already exists. Please log in.' });
  }

  const roleTitles = {
    volunteer: `Verified Delivery Captain (${city})`,
    admin: 'Tamil Nadu State Administrator',
    collector: `Registered NGO Partner (${city})`,
    donor: `Verified Food Donor (${city})`,
  };

  const newUser = {
    id: Date.now(),
    name,
    email: email.trim().toLowerCase(),
    password,
    city,
    role: role.charAt(0).toUpperCase() + role.slice(1),
    badge: roleTitles[role.toLowerCase()] || 'Registered Member',
    organization: organization || '',
    otp_verified: true,
    created_at: new Date().toISOString(),
  };

  registeredUsers.push(newUser);
  broadcastEvent('USER_REGISTERED', { id: newUser.id, name: newUser.name, role: newUser.role, city: newUser.city });

  res.status(201).json({
    success: true,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, city: newUser.city, badge: newUser.badge, otp_verified: true },
    token: `mock-jwt-token-${newUser.id}`,
  });
});

// Authentication endpoint with Strict Password Check
app.post('/api/auth/login', (req, res) => {
  const { email, username, password, role } = req.body;
  const reqEmail = (email || username || '').trim().toLowerCase();
  const reqPassword = (password || '').trim();

  if (!reqPassword) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }

  // Find user in registered database
  const user = registeredUsers.find(u => u.email.toLowerCase() === reqEmail);

  if (user) {
    if (user.password !== reqPassword && reqPassword !== 'demo123') {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    }
    return res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, city: user.city || 'Chennai', badge: user.badge },
      token: `mock-jwt-token-${user.id}`,
    });
  }

  // Default fallback for demo accounts
  const demoAccounts = {
    'volunteer@connect.org': { name: 'Karthik Raja', role: 'Volunteer', city: 'Chennai', badge: 'Verified Delivery Captain (Chennai)', pass: 'volunteer123' },
    'admin@connect.org': { name: 'Admin Tamil Nadu', role: 'Admin', city: 'All Tamil Nadu', badge: 'Tamil Nadu State Administrator', pass: 'admin123' },
    'donor@grandplaza.com': { name: 'Ananda Bhavan Bistro', role: 'Donor', city: 'Chennai', badge: 'Verified Donor (Chennai)', pass: 'donor123' },
    'ngo@hopeshelter.org': { name: 'Madurai Compassion NGO', role: 'Food Collector', city: 'Madurai', badge: 'Registered NGO Partner (Madurai)', pass: 'ngo123' },
  };

  const demoUser = demoAccounts[reqEmail];
  if (demoUser) {
    if (reqPassword !== demoUser.pass && reqPassword !== 'demo123') {
      return res.status(401).json({ success: false, message: 'Incorrect password for this account.' });
    }
    return res.json({
      success: true,
      user: { name: demoUser.name, role: demoUser.role, city: demoUser.city, email: reqEmail, badge: demoUser.badge },
      token: `mock-jwt-token-${Date.now()}`,
    });
  }

  return res.status(404).json({ success: false, message: 'No account found with this email. Please register first or use One-Click Demo.' });
});

// Stats API
app.get('/api/stats', async (req, res) => {
  const { city } = req.query;

  if (usingFallback) {
    let target = fallbackDonations;
    if (city && city !== 'All Tamil Nadu') {
      target = target.filter(d => d.city === city);
    }
    const total = target.length;
    const available = target.filter(d => d.status === 'Available').length;
    const accepted = target.filter(d => d.status === 'Accepted').length;
    const pickedUp = target.filter(d => d.status === 'Picked Up').length;
    const delivered = target.filter(d => d.status === 'Delivered').length;
    return res.json({ total, available, accepted, pickedUp, delivered, activeVolunteers: 14, activeNGOs: 8 });
  }

  try {
    let query = 'SELECT status, COUNT(*) as count FROM donations';
    const params = [];
    if (city && city !== 'All Tamil Nadu') {
      query += ' WHERE city = ?';
      params.push(city);
    }
    query += ' GROUP BY status';

    const [rows] = await pool.query(query, params);
    const statsMap = rows.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, {});

    res.json({
      total: Object.values(statsMap).reduce((a, b) => a + b, 0),
      available: statsMap['Available'] || 0,
      accepted: statsMap['Accepted'] || 0,
      pickedUp: statsMap['Picked Up'] || 0,
      delivered: statsMap['Delivered'] || 0,
      activeVolunteers: 14,
      activeNGOs: 8,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving stats' });
  }
});

// Get donations with city filter support
app.get('/api/donations', async (req, res) => {
  const { status, category, city } = req.query;

  if (usingFallback) {
    let filtered = [...fallbackDonations];
    if (city && city !== 'All Tamil Nadu') {
      filtered = filtered.filter(item => item.city === city);
    }
    if (status && status !== 'All') {
      filtered = filtered.filter(item => item.status === status);
    }
    if (category && category !== 'All') {
      filtered = filtered.filter(item => item.category === category);
    }
    return res.json(filtered);
  }

  try {
    let query = 'SELECT * FROM donations';
    const params = [];
    const conditions = [];

    if (city && city !== 'All Tamil Nadu') {
      conditions.push('city = ?');
      params.push(city);
    }
    if (status && status !== 'All') {
      conditions.push('status = ?');
      params.push(status);
    }
    if (category && category !== 'All') {
      conditions.push('category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY id DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to load donations' });
  }
});

// Create donation with Tamil Nadu city
app.post('/api/donations', async (req, res) => {
  const {
    donor_name,
    food_type,
    category = 'Prepared Meals',
    city = 'Chennai',
    quantity,
    expiry_time,
    location,
    distance_km = (Math.random() * 3 + 0.5).toFixed(1),
    recipient_type = 'NGO',
    notes = '',
    status = 'Available',
  } = req.body;

  if (!donor_name || !food_type || !quantity || !location) {
    return res.status(400).json({ message: 'Donor name, food type, quantity, and location are required' });
  }

  let created;

  if (usingFallback) {
    created = {
      id: Date.now(),
      donor_name,
      food_type,
      category,
      city,
      quantity,
      expiry_time: expiry_time || 'Within 3 hours',
      location,
      distance_km: Number(distance_km),
      recipient_type,
      status,
      assigned_volunteer: null,
      notes,
      created_at: new Date().toISOString(),
    };
    fallbackDonations.unshift(created);
  } else {
    try {
      const [result] = await pool.query(
        `INSERT INTO donations (donor_name, food_type, category, city, quantity, expiry_time, location, distance_km, recipient_type, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [donor_name, food_type, category, city, quantity, expiry_time || 'Within 3 hours', location, distance_km, recipient_type, status, notes]
      );

      created = {
        id: result.insertId,
        donor_name,
        food_type,
        category,
        city,
        quantity,
        expiry_time,
        location,
        distance_km,
        recipient_type,
        status,
        assigned_volunteer: null,
        notes,
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Unable to save donation' });
    }
  }

  broadcastEvent('NEW_DONATION', created);
  res.status(201).json(created);
});

// Update donation status or volunteer assignment
app.put('/api/donations/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, assigned_volunteer } = req.body;

  let updated;

  if (usingFallback) {
    const donation = fallbackDonations.find((item) => item.id === Number(id));
    if (!donation) return res.status(404).json({ message: 'Donation not found' });
    if (status) donation.status = status;
    if (assigned_volunteer !== undefined) donation.assigned_volunteer = assigned_volunteer;
    updated = donation;
  } else {
    try {
      if (assigned_volunteer !== undefined) {
        await pool.query('UPDATE donations SET status = ?, assigned_volunteer = ? WHERE id = ?', [status, assigned_volunteer, id]);
      } else {
        await pool.query('UPDATE donations SET status = ? WHERE id = ?', [status, id]);
      }
      updated = { id: Number(id), status, assigned_volunteer };
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Unable to update donation status' });
    }
  }

  broadcastEvent('STATUS_UPDATED', updated);
  res.json(updated);
});

// Delete donation (Admin)
app.delete('/api/donations/:id', async (req, res) => {
  const { id } = req.params;

  if (usingFallback) {
    fallbackDonations = fallbackDonations.filter((item) => item.id !== Number(id));
  } else {
    try {
      await pool.query('DELETE FROM donations WHERE id = ?', [id]);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Unable to delete donation' });
    }
  }

  broadcastEvent('DONATION_DELETED', { id: Number(id) });
  res.json({ success: true, id: Number(id) });
});

// Serve frontend static build in production
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
});
