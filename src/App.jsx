import { useState, useEffect } from 'react';
import './styles.css';

const TAMIL_NADU_CITIES = [
  'All Tamil Nadu',
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Tiruchirappalli',
  'Salem',
  'Tirunelveli',
  'Erode',
  'Vellore',
  'Thanjavur',
  'Tiruppur',
];

const initialDonationForm = {
  donor_name: '',
  food_type: '',
  category: 'Prepared Meals',
  city: 'Chennai',
  quantity: '',
  expiry_time: '',
  location: '',
  recipient_type: 'NGO',
  notes: '',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [selectedCity, setSelectedCity] = useState('All Tamil Nadu');
  
  // Navigation Routing: 'home' | 'login-volunteer' | 'login-admin' | 'login-donor'
  const [currentPage, setCurrentPage] = useState('home');
  const [activeModal, setActiveModal] = useState(null); // 'postDonation' | 'map' | 'certificate' | 'otp'
  const [selectedCertDonation, setSelectedCertDonation] = useState(null);
  const [selectedMapDonation, setSelectedMapDonation] = useState(null);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    city: 'Chennai',
    organization: '',
    userRole: 'volunteer',
    vehicleType: 'Car',
  });

  // Signup OTP Verification State
  const [otpSent, setOtpSent] = useState(false);
  const [receivedOtp, setReceivedOtp] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');
  const [pendingTargetRole, setPendingTargetRole] = useState('volunteer');

  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({ total: 0, available: 0, accepted: 0, pickedUp: 0, delivered: 0, activeVolunteers: 14, activeNGOs: 8 });
  const [donationForm, setDonationForm] = useState(initialDonationForm);
  
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [maxDistance, setMaxDistance] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [toastMessage, setToastMessage] = useState('');

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 5500);
  };

  const loadDonations = async () => {
    try {
      const url = selectedCity === 'All Tamil Nadu' ? '/api/donations' : `/api/donations?city=${encodeURIComponent(selectedCity)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDonations(data);
      }
    } catch (err) {
      console.error('Error fetching donations:', err);
    }
  };

  const loadStats = async () => {
    try {
      const url = selectedCity === 'All Tamil Nadu' ? '/api/stats' : `/api/stats?city=${encodeURIComponent(selectedCity)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    loadDonations();
    loadStats();
  }, [selectedCity]);

  // Real-time Event Source (SSE Connection)
  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'NEW_DONATION') {
          setDonations(prev => [parsed.data, ...prev]);
          loadStats();
          showToast(`⚡ Tamil Nadu Real-Time Alert: New food donation posted in ${parsed.data.city}!`);
        } else if (parsed.type === 'STATUS_UPDATED') {
          setDonations(prev => prev.map(item => item.id === parsed.data.id ? { ...item, ...parsed.data } : item));
          loadStats();
          showToast(`⚡ Live Update: Donation status changed to "${parsed.data.status}".`);
        } else if (parsed.type === 'DONATION_DELETED') {
          setDonations(prev => prev.filter(item => item.id !== parsed.data.id));
          loadStats();
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const navigateToPage = (pageName) => {
    setCurrentPage(pageName);
    setAuthMode('login');
    setOtpSent(false);
    setUserOtpInput('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSubmit = async (e, targetRole) => {
    if (e) e.preventDefault();
    if (!authForm.email || !authForm.password) {
      showToast('❌ Please enter both Email and Password.');
      return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
          role: targetRole,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        if (data.user.city && data.user.city !== 'All Tamil Nadu') {
          setSelectedCity(data.user.city);
        }
        setCurrentPage('home');
        showToast(`🎉 Logged in successfully as ${data.user.role}: ${data.user.name} (${data.user.city || 'Tamil Nadu'})`);
      } else {
        showToast(`❌ ${data.message || 'Incorrect password or email.'}`);
      }
    } catch (err) {
      showToast('❌ Login failed. Incorrect credentials.');
    }
  };

  // STEP 1 FOR SIGNUP: Request OTP
  const handleRequestOtp = async (e, targetRole) => {
    if (e) e.preventDefault();
    if (!authForm.name || !authForm.email || !authForm.password) {
      showToast('❌ Please fill out Name, Email, and Password.');
      return;
    }

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authForm.email, phone: authForm.phone }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.otp) setReceivedOtp(data.otp);
        setOtpSent(true);
        setPendingTargetRole(targetRole);
        setActiveModal('otp');
        showToast(`📩 Verification OTP dispatched to ${authForm.email}! Check your inbox or click Auto-Fill.`);
      } else {
        showToast(`❌ ${data.message || 'Could not send OTP.'}`);
      }
    } catch (err) {
      showToast('❌ Failed to request OTP.');
    }
  };

  // STEP 2 FOR SIGNUP: Verify OTP and Register Account
  const handleVerifyOtpAndRegister = async (e) => {
    if (e) e.preventDefault();
    if (!userOtpInput) {
      showToast('❌ Please enter the 6-digit OTP code.');
      return;
    }

    try {
      // 1. Verify OTP
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authForm.email, otp: userOtpInput }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        showToast(`❌ ${verifyData.message || 'Invalid OTP code. Please try again.'}`);
        return;
      }

      // 2. Complete Registration
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
          city: authForm.city,
          role: pendingTargetRole,
          organization: authForm.organization,
          otpVerified: true,
        }),
      });
      const regData = await regRes.json();

      if (regRes.ok && regData.success) {
        setCurrentUser(regData.user);
        setSelectedCity(regData.user.city || 'Chennai');
        setActiveModal(null);
        setOtpSent(false);
        setUserOtpInput('');
        setCurrentPage('home');
        showToast(`✅ OTP Verified! Account created for ${regData.user.city}. Welcome, ${regData.user.name}!`);
      } else {
        showToast(`❌ ${regData.message || 'Registration failed.'}`);
      }
    } catch (err) {
      showToast('❌ Verification failed. Please try again.');
    }
  };

  const handleDemoLogin = (role) => {
    const mockProfiles = {
      volunteer: { name: 'Karthik Raja', role: 'Volunteer', city: 'Chennai', email: 'volunteer@connect.org', badge: 'Verified Delivery Captain (Chennai)' },
      admin: { name: 'Admin Tamil Nadu', role: 'Admin', city: 'All Tamil Nadu', email: 'admin@connect.org', badge: 'Tamil Nadu State Administrator' },
      collector: { name: 'Madurai Compassion NGO', role: 'Food Collector', city: 'Madurai', email: 'ngo@hopeshelter.org', badge: 'Registered NGO Partner (Madurai)' },
      donor: { name: 'Ananda Bhavan Bistro', role: 'Donor', city: 'Chennai', email: 'donor@grandplaza.com', badge: 'Verified Donor (Chennai)' },
    };
    const profile = mockProfiles[role];
    setCurrentUser(profile);
    setSelectedCity(profile.city === 'All Tamil Nadu' ? 'All Tamil Nadu' : profile.city);
    setCurrentPage('home');
    showToast(`Welcome! Logged in as ${profile.role}: ${profile.name} (${profile.city})`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('home');
    showToast('Logged out of Food Donation Connect Tamil Nadu.');
  };

  const handlePostDonationSubmit = async (e) => {
    e.preventDefault();
    if (!donationForm.donor_name || !donationForm.food_type || !donationForm.quantity || !donationForm.location) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donationForm),
      });

      if (res.ok) {
        setDonationForm(initialDonationForm);
        setActiveModal(null);
        showToast(`🚀 Surplus food donation broadcasted in real-time for ${donationForm.city}!`);
      }
    } catch (err) {
      showToast('Could not save donation.');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const volunteerName = currentUser?.role === 'Volunteer' ? currentUser.name : null;
      const res = await fetch(`/api/donations/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, assigned_volunteer: volunteerName }),
      });

      if (res.ok) {
        showToast(`Status updated to "${newStatus}".`);
      }
    } catch (err) {
      showToast('Status update failed.');
    }
  };

  const handleDeleteDonation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this donation entry?')) return;
    try {
      const res = await fetch(`/api/donations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Donation entry removed.');
      }
    } catch (err) {
      showToast('Could not delete entry.');
    }
  };

  const exportReportCSV = () => {
    const headers = ['ID,Donor,City,Food Type,Category,Quantity,Expiry,Location,Recipient,Status,Volunteer'];
    const rows = donations.map(d => 
      `"${d.id}","${d.donor_name}","${d.city || 'Chennai'}","${d.food_type}","${d.category || 'N/A'}","${d.quantity}","${d.expiry_time}","${d.location}","${d.recipient_type}","${d.status}","${d.assigned_volunteer || 'None'}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TN_Food_Donation_Report_${selectedCity.replace(' ', '_')}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report CSV exported successfully!');
  };

  const openCertModal = (donation) => {
    setSelectedCertDonation(donation);
    setActiveModal('certificate');
  };

  const openMapModal = (donation) => {
    setSelectedMapDonation(donation);
    setActiveModal('map');
  };

  const filteredDonations = donations.filter(item => {
    const matchesCity = selectedCity === 'All Tamil Nadu' || item.city === selectedCity;
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || (item.category || 'Prepared Meals') === categoryFilter;
    const matchesDistance = (item.distance_km || 1.5) <= maxDistance;
    const matchesSearch = searchQuery === '' || 
      item.food_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.donor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.city || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCity && matchesStatus && matchesCategory && matchesDistance && matchesSearch;
  });

  const co2Saved = (stats.delivered * 14.5 + 42).toFixed(1);
  const waterSaved = stats.delivered * 320 + 850;
  const totalMeals = stats.delivered * 35 + 140;

  return (
    <div className="app-shell">
      {/* Top Header */}
      <header className="topbar">
        <div className="topbar-content">
          <div className="brand" onClick={() => navigateToPage('home')}>
            <div className="brand-logo">🥗</div>
            <div>
              <p className="brand-title">Food Donation Connect</p>
              <p className="brand-subtitle">Tamil Nadu Real-Time Food Sharing Network</p>
            </div>
          </div>

          <div className="topbar-actions">
            {/* TAMIL NADU CITY SELECTOR DROPDOWN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(241, 245, 249, 0.9)', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.9rem' }}>📍 TN City:</span>
              <select
                className="form-select"
                style={{ border: 'none', background: 'transparent', padding: '0.1rem 0.3rem', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-hover)', cursor: 'pointer', outline: 'none' }}
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
              >
                {TAMIL_NADU_CITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Theme Switcher */}
            <button className="btn btn-secondary btn-sm" onClick={toggleTheme} title="Toggle Dark/Light Mode">
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>

            <div className="live-ticker">
              <span className="pulse-dot"></span>
              <span>⚡ {stats.available} Live in {selectedCity} • {stats.activeVolunteers} Volunteers</span>
            </div>

            <button className="btn btn-primary btn-sm" onClick={() => setActiveModal('postDonation')}>
              ➕ Post Food ({selectedCity === 'All Tamil Nadu' ? 'TN' : selectedCity})
            </button>

            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="user-role-badge">{currentUser.role}: {currentUser.name}</span>
                <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
              </div>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => navigateToPage('home')}>
                🏠 Portals Home
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main>
        {/* ROUTE 1: HOME PAGE */}
        {currentPage === 'home' && !currentUser && (
          <div style={{ padding: '1rem 0' }}>
            <div className="page-hero-title">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#dcfce7', color: '#15803d', padding: '0.4rem 1.1rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 800, marginBottom: '1.2rem' }}>
                🌾 Tamil Nadu Smart Redistribution Network • {selectedCity}
              </div>
              <h1 className="gradient-headline">
                Food Donation Connect
              </h1>
              <p className="hero-subtitle-text">
                Connecting surplus food from restaurants & events in <strong>{selectedCity}</strong> with local NGOs and volunteers
              </p>
            </div>

            {/* TAMIL NADU CITY FILTER BAR */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--slate)' }}>Filter by Tamil Nadu City:</span>
              {TAMIL_NADU_CITIES.map(c => (
                <button
                  key={c}
                  className={`filter-chip ${selectedCity === c ? 'active' : ''}`}
                  onClick={() => setSelectedCity(c)}
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                >
                  📍 {c}
                </button>
              ))}
            </div>

            {/* ENVIRONMENTAL CARBON & WATER SAVER WIDGET */}
            <div className="impact-widget-grid">
              <div className="impact-card">
                <div className="impact-card-icon">🌿</div>
                <div>
                  <div className="impact-card-val">{co2Saved} kg</div>
                  <div className="impact-card-lbl">CO₂ Prevented in {selectedCity}</div>
                </div>
              </div>
              <div className="impact-card">
                <div className="impact-card-icon">💧</div>
                <div>
                  <div className="impact-card-val">{waterSaved.toLocaleString()} L</div>
                  <div className="impact-card-lbl">Fresh Water Conserved</div>
                </div>
              </div>
              <div className="impact-card">
                <div className="impact-card-icon">🍱</div>
                <div>
                  <div className="impact-card-val">{totalMeals.toLocaleString()}</div>
                  <div className="impact-card-lbl">Meals Served across TN</div>
                </div>
              </div>
            </div>

            {/* THE THREE MAIN ROLE ENTRY CARDS */}
            <div className="role-grid">
              {/* Card 1: Volunteer Portal */}
              <article className="role-card role-card-volunteer">
                <div className="role-card-top">
                  <div className="role-icon-wrapper role-icon-volunteer">🚚</div>
                  <h3 className="role-title">Volunteer Portal</h3>
                  <p className="role-desc">
                    Dedicated login for volunteers in {selectedCity} to view nearby live pickup requests, navigate delivery routes, and confirm handovers.
                  </p>
                  <ul className="role-features">
                    <li>📍 Real-time GPS distance matching ({selectedCity})</li>
                    <li>📱 Mobile OTP signup verification</li>
                    <li>⏱️ Expiry countdown alerts</li>
                  </ul>
                </div>
                <button className="btn btn-volunteer" onClick={() => navigateToPage('login-volunteer')}>
                  Open Volunteer Portal ➔
                </button>
              </article>

              {/* Card 2: Admin Portal */}
              <article className="role-card role-card-admin">
                <div className="role-card-top">
                  <div className="role-icon-wrapper role-icon-admin">🛡️</div>
                  <h3 className="role-title">Admin Portal</h3>
                  <p className="role-desc">
                    System admin center for Tamil Nadu state real-time analytics, user role auditing, master status controls, and CSV report export.
                  </p>
                  <ul className="role-features">
                    <li>📊 Master TN analytics & impact counters</li>
                    <li>👥 User & NGO partner directory</li>
                    <li>📜 Instant CSV / PDF audit report</li>
                  </ul>
                </div>
                <button className="btn btn-admin" onClick={() => navigateToPage('login-admin')}>
                  Open Admin Portal ➔
                </button>
              </article>

              {/* Card 3: Combined Donor & Food Collector Portal */}
              <article className="role-card role-card-donor">
                <div className="role-card-top">
                  <div className="role-icon-wrapper role-icon-donor">🍱</div>
                  <h3 className="role-title">Donor Portal</h3>
                  <p className="role-desc">
                    For food donors in {selectedCity} (restaurants, hotels, marriage halls) to upload surplus food, and registered NGOs to claim allocations.
                  </p>
                  <ul className="role-features">
                    <li>🍱 Post surplus food in 60 seconds</li>
                    <li>📱 Secure OTP account verification</li>
                    <li>📜 Official Tax / CSR impact certificates</li>
                  </ul>
                </div>
                <button className="btn btn-donor" onClick={() => navigateToPage('login-donor')}>
                  Open Donor Portal ➔
                </button>
              </article>
            </div>

            {/* GAMIFIED COMMUNITY LEADERBOARD */}
            <section className="leaderboard-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>🏆 Tamil Nadu Food Rescuer Leaderboard</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Top volunteers & donors making an impact in {selectedCity}</p>
                </div>
                <span style={{ background: '#fef08a', color: '#854d0e', padding: '0.4rem 0.9rem', borderRadius: '9999px', fontWeight: 800, fontSize: '0.85rem' }}>
                  🌟 1,850 Total TN Karma Points
                </span>
              </div>

              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Rescuer Name</th>
                    <th>City & Role</th>
                    <th>Deliveries / Posts</th>
                    <th>Karma Points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="rank-badge rank-1">1</span></td>
                    <td>Karthik Raja</td>
                    <td>📍 Chennai • Delivery Captain</td>
                    <td>54 Pickups Delivered</td>
                    <td style={{ color: '#047857', fontWeight: 800 }}>🏆 540 Points</td>
                  </tr>
                  <tr>
                    <td><span className="rank-badge rank-2">2</span></td>
                    <td>PSG Convention Hall</td>
                    <td>📍 Coimbatore • Food Donor</td>
                    <td>42 Surplus Posts</td>
                    <td style={{ color: '#047857', fontWeight: 800 }}>⭐ 420 Points</td>
                  </tr>
                  <tr>
                    <td><span className="rank-badge rank-3">3</span></td>
                    <td>Madurai Compassion NGO</td>
                    <td>📍 Madurai • NGO Partner</td>
                    <td>38 Handovers Completed</td>
                    <td style={{ color: '#047857', fontWeight: 800 }}>✨ 380 Points</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>
        )}

        {/* ROUTE 2: DEDICATED VOLUNTEER LOGIN / REGISTRATION PAGE WITH OTP */}
        {currentPage === 'login-volunteer' && !currentUser && (
          <div style={{ maxWidth: '480px', margin: '2rem auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div className="role-icon-wrapper role-icon-volunteer" style={{ margin: '0 auto 1rem' }}>🚚</div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0369a1' }}>Volunteer Access Portal</h2>
              <p style={{ color: 'var(--slate)' }}>Log in or register with mobile OTP verification</p>
            </div>

            <div className="role-tabs">
              <button className={`role-tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => setAuthMode('login')}>
                🔑 Account Login
              </button>
              <button className={`role-tab ${authMode === 'register' ? 'active' : ''}`} onClick={() => setAuthMode('register')}>
                📱 Register with OTP
              </button>
            </div>

            <div className="demo-login-box">
              <div>
                <div className="demo-login-text">⚡ Instant Test Access</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>Log in immediately as Demo Volunteer (Chennai)</div>
              </div>
              <button className="btn btn-volunteer btn-sm" onClick={() => handleDemoLogin('volunteer')}>
                One-Click Demo
              </button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={(e) => handleLoginSubmit(e, 'volunteer')} style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
                <div className="form-group">
                  <label className="form-label">Volunteer Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="volunteer@connect.org"
                    value={authForm.email}
                    onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="••••••••"
                      value={authForm.password}
                      onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                      title="Toggle password visibility"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-volunteer" style={{ width: '100%', marginTop: '1rem' }}>
                  Log In to Volunteer Dashboard ➔
                </button>
              </form>
            ) : (
              <form onSubmit={(e) => handleRequestOtp(e, 'volunteer')} style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Karthik Raja"
                    required
                    value={authForm.name}
                    onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Select Your Tamil Nadu City *</label>
                  <select
                    className="form-select"
                    value={authForm.city}
                    onChange={e => setAuthForm({ ...authForm, city: e.target.value })}
                  >
                    {TAMIL_NADU_CITIES.filter(c => c !== 'All Tamil Nadu').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="karthik@example.com"
                    required
                    value={authForm.email}
                    onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Create Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="At least 6 characters"
                      required
                      value={authForm.password}
                      onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                      title="Toggle password visibility"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-volunteer" style={{ width: '100%', marginTop: '1rem' }}>
                  📱 Send 6-Digit Verification OTP ➔
                </button>
              </form>
            )}
          </div>
        )}

        {/* ROUTE 3: DEDICATED ADMIN LOGIN PAGE */}
        {currentPage === 'login-admin' && !currentUser && (
          <div style={{ maxWidth: '480px', margin: '2rem auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div className="role-icon-wrapper role-icon-admin" style={{ margin: '0 auto 1rem' }}>🛡️</div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#b45309' }}>Admin Security Portal</h2>
              <p style={{ color: 'var(--slate)' }}>Tamil Nadu State Administrator login & system audit access</p>
            </div>

            <div className="demo-login-box">
              <div>
                <div className="demo-login-text">⚡ Instant Test Access</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>Log in immediately as Demo Admin</div>
              </div>
              <button className="btn btn-admin btn-sm" onClick={() => handleDemoLogin('admin')}>
                One-Click Demo
              </button>
            </div>

            <form onSubmit={(e) => handleLoginSubmit(e, 'admin')} style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
              <div className="form-group">
                <label className="form-label">Administrator Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="admin@connect.org"
                  value={authForm.email}
                  onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Admin Security Key / Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={authForm.password}
                    onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                    title="Toggle password visibility"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-admin" style={{ width: '100%', marginTop: '1rem' }}>
                Log In to Admin Analytics Center ➔
              </button>
            </form>
          </div>
        )}

        {/* ROUTE 4: DEDICATED DONOR & NGO COLLECTOR LOGIN / REGISTER PAGE WITH OTP */}
        {currentPage === 'login-donor' && !currentUser && (
          <div style={{ maxWidth: '520px', margin: '2rem auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div className="role-icon-wrapper role-icon-donor" style={{ margin: '0 auto 1rem' }}>🍱</div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#7e22ce' }}>Donor & Collector Portal</h2>
              <p style={{ color: 'var(--slate)' }}>Access surplus food upload and NGO allocation tools for Tamil Nadu</p>
            </div>

            <div className="role-tabs">
              <button className={`role-tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => setAuthMode('login')}>
                🔑 Account Login
              </button>
              <button className={`role-tab ${authMode === 'register' ? 'active' : ''}`} onClick={() => setAuthMode('register')}>
                📱 Register with OTP
              </button>
            </div>

            <div className="demo-login-box">
              <div>
                <div className="demo-login-text">⚡ Instant Test Access</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>Log in immediately as Demo Donor or NGO</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-donor btn-sm" onClick={() => handleDemoLogin('donor')}>
                  Donor
                </button>
                <button className="btn btn-collector btn-sm" onClick={() => handleDemoLogin('collector')}>
                  NGO
                </button>
              </div>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={(e) => handleLoginSubmit(e, 'donor')} style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="donor@grandplaza.com or ngo@hopeshelter.org"
                    value={authForm.email}
                    onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="••••••••"
                      value={authForm.password}
                      onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                      title="Toggle password visibility"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-donor" style={{ width: '100%', marginTop: '1rem' }}>
                  Log In to Donor / Collector Portal ➔
                </button>
              </form>
            ) : (
              <form onSubmit={(e) => handleRequestOtp(e, authForm.userRole)} style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
                <div className="form-group">
                  <label className="form-label">Account Type</label>
                  <select
                    className="form-select"
                    value={authForm.userRole}
                    onChange={e => setAuthForm({ ...authForm, userRole: e.target.value })}
                  >
                    <option value="donor">Food Donor (Restaurant / Hotel / Marriage Hall)</option>
                    <option value="collector">Food Collector (Registered NGO / Shelter)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Organization / Business Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Ananda Bhavan Bistro or Madurai NGO"
                    required
                    value={authForm.name}
                    onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Select Your Tamil Nadu City *</label>
                  <select
                    className="form-select"
                    value={authForm.city}
                    onChange={e => setAuthForm({ ...authForm, city: e.target.value })}
                  >
                    {TAMIL_NADU_CITIES.filter(c => c !== 'All Tamil Nadu').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="contact@business.com"
                    required
                    value={authForm.email}
                    onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Create Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="At least 6 characters"
                      required
                      value={authForm.password}
                      onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                      title="Toggle password visibility"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-donor" style={{ width: '100%', marginTop: '1rem' }}>
                  📱 Send 6-Digit Verification OTP ➔
                </button>
              </form>
            )}
          </div>
        )}

        {/* LOGGED IN VIEW */}
        {currentUser && (
          <div>
            {/* VOLUNTEER DASHBOARD */}
            {currentUser.role === 'Volunteer' && (
              <div>
                <div className="dashboard-header">
                  <div className="dashboard-user-info">
                    <div className="user-avatar">🚚</div>
                    <div>
                      <h2 className="user-name">Welcome back, {currentUser.name}!</h2>
                      <span className="user-role-badge">Verified Volunteer Captain ({selectedCity})</span>
                      <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                        Real-time live pickup dispatch queue for {selectedCity}
                      </p>
                    </div>
                  </div>
                  <button className="btn btn-secondary" onClick={handleLogout}>Log Out</button>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#dcfce7', color: '#15803d' }}>📍</div>
                    <div>
                      <div className="stat-val">{donations.filter(d => d.status === 'Available').length}</div>
                      <div className="stat-lbl">Live Available in {selectedCity}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>🚚</div>
                    <div>
                      <div className="stat-val">{donations.filter(d => d.assigned_volunteer === currentUser.name && d.status !== 'Delivered').length}</div>
                      <div className="stat-lbl">My Active Pickups</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>✅</div>
                    <div>
                      <div className="stat-val">{donations.filter(d => d.status === 'Delivered').length}</div>
                      <div className="stat-lbl">Completed Handovers</div>
                    </div>
                  </div>
                </div>

                <div className="section-title-bar">
                  <h3>Live Real-Time Dispatch Stream ({selectedCity})</h3>
                  <div className="filter-bar">
                    <span>GPS Radius:</span>
                    {[2, 5, 10].map(dist => (
                      <button
                        key={dist}
                        className={`filter-chip ${maxDistance === dist ? 'active' : ''}`}
                        onClick={() => setMaxDistance(dist)}
                      >
                        Within {dist} km
                      </button>
                    ))}
                  </div>
                </div>

                <div className="donations-grid">
                  {filteredDonations.map(item => (
                    <div key={item.id} className="donation-card">
                      <div>
                        <div className="donation-card-header">
                          <h4 className="food-title">{item.food_type}</h4>
                          <span className={`status-badge status-${item.status.toLowerCase().replace(' ', '')}`}>
                            {item.status}
                          </span>
                        </div>

                        <div className="donation-meta">
                          <div className="meta-item">
                            <span>🏢 <strong>Donor:</strong> {item.donor_name}</span>
                            <span className="distance-badge">📍 {item.city || 'Chennai'} • {item.location}</span>
                          </div>
                          <div className="meta-item">
                            <span>📦 <strong>Quantity:</strong> {item.quantity}</span>
                          </div>
                          <div className="meta-item">
                            <span>⏳ <strong>Expiry Window:</strong> {item.expiry_time}</span>
                          </div>
                          {item.assigned_volunteer && (
                            <div className="meta-item" style={{ color: 'var(--primary-hover)', fontWeight: 600 }}>
                              <span>👤 Assigned Volunteer: {item.assigned_volunteer}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {item.status === 'Available' && (
                          <button className="btn btn-volunteer btn-sm" onClick={() => handleStatusUpdate(item.id, 'Accepted')}>
                            🚚 Accept Pickup Request
                          </button>
                        )}

                        {item.status === 'Accepted' && (
                          <button className="btn btn-accent btn-sm" onClick={() => handleStatusUpdate(item.id, 'Picked Up')}>
                            📦 Mark Picked Up & In Transit
                          </button>
                        )}

                        {item.status === 'Picked Up' && (
                          <button className="btn btn-primary btn-sm" style={{ background: '#16a34a' }} onClick={() => handleStatusUpdate(item.id, 'Delivered')}>
                            ✅ Confirm Delivery to Beneficiary
                          </button>
                        )}

                        <button className="btn btn-secondary btn-sm" onClick={() => openMapModal(item)}>
                          🗺️ Live Route GPS Map
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADMIN DASHBOARD */}
            {currentUser.role === 'Admin' && (
              <div>
                <div className="dashboard-header">
                  <div className="dashboard-user-info">
                    <div className="user-avatar">🛡️</div>
                    <div>
                      <h2 className="user-name">Tamil Nadu State Control & Analytics</h2>
                      <span className="user-role-badge">System Administrator ({selectedCity})</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={exportReportCSV}>
                      📜 Export TN Audit CSV
                    </button>
                    <button className="btn btn-secondary" onClick={handleLogout}>Log Out</button>
                  </div>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>🍱</div>
                    <div>
                      <div className="stat-val">{stats.total}</div>
                      <div className="stat-lbl">Total Donations ({selectedCity})</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>✅</div>
                    <div>
                      <div className="stat-val">{stats.delivered}</div>
                      <div className="stat-lbl">Delivered & Saved</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>🚚</div>
                    <div>
                      <div className="stat-val">{stats.accepted + stats.pickedUp}</div>
                      <div className="stat-lbl">In-Transit Pickups</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>🤝</div>
                    <div>
                      <div className="stat-val">{stats.activeVolunteers}</div>
                      <div className="stat-lbl">Active TN Volunteers</div>
                    </div>
                  </div>
                </div>

                <div className="section-title-bar">
                  <h3>Master Donation Audit Table ({selectedCity})</h3>
                  <div className="filter-bar">
                    <input
                      type="text"
                      placeholder="Search food, donor, city or location..."
                      className="form-input"
                      style={{ width: '240px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {['All', 'Available', 'Accepted', 'Picked Up', 'Delivered'].map(st => (
                      <button
                        key={st}
                        className={`filter-chip ${statusFilter === st ? 'active' : ''}`}
                        onClick={() => setStatusFilter(st)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead style={{ background: 'rgba(248, 250, 252, 0.5)', borderBottom: '1px solid var(--border)' }}>
                      <tr>
                        <th style={{ padding: '1rem' }}>ID</th>
                        <th style={{ padding: '1rem' }}>City & Location</th>
                        <th style={{ padding: '1rem' }}>Donor & Food</th>
                        <th style={{ padding: '1rem' }}>Expiry Time</th>
                        <th style={{ padding: '1rem' }}>Status</th>
                        <th style={{ padding: '1rem' }}>Assigned Volunteer</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDonations.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '1rem', fontWeight: 700 }}>#{item.id}</td>
                          <td style={{ padding: '1rem' }}>
                            <div><strong>📍 {item.city || 'Chennai'}</strong></div>
                            <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{item.location} ({item.distance_km || 1.2} km)</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div><strong>{item.food_type}</strong></div>
                            <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>By {item.donor_name} • {item.quantity}</div>
                          </td>
                          <td style={{ padding: '1rem', color: '#b45309', fontWeight: 600 }}>{item.expiry_time}</td>
                          <td style={{ padding: '1rem' }}>
                            <span className={`status-badge status-${item.status.toLowerCase().replace(' ', '')}`}>
                              {item.status}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>{item.assigned_volunteer || 'Unassigned'}</td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <select
                              className="form-select"
                              style={{ width: 'auto', display: 'inline-block', padding: '0.2rem 0.5rem', fontSize: '0.78rem', marginRight: '0.5rem' }}
                              value={item.status}
                              onChange={(e) => handleStatusUpdate(item.id, e.target.value)}
                            >
                              <option value="Available">Available</option>
                              <option value="Accepted">Accepted</option>
                              <option value="Picked Up">Picked Up</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                            <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteDonation(item.id)}>
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DONOR / FOOD COLLECTOR DASHBOARD */}
            {(currentUser.role === 'Donor' || currentUser.role === 'Food Collector') && (
              <div>
                <div className="dashboard-header">
                  <div className="dashboard-user-info">
                    <div className="user-avatar">🍱</div>
                    <div>
                      <h2 className="user-name">Welcome, {currentUser.name}!</h2>
                      <span className="user-role-badge">{currentUser.badge}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-primary" onClick={() => setActiveModal('postDonation')}>
                      🍱 Upload Surplus Food ({selectedCity})
                    </button>
                    <button className="btn btn-secondary" onClick={handleLogout}>Log Out</button>
                  </div>
                </div>

                <div className="section-title-bar">
                  <h3>Real-Time Surplus Food & Allocation Stream ({selectedCity})</h3>
                  <div className="filter-bar">
                    {['All', 'Prepared Meals', 'Fresh Produce', 'Bakery', 'Packaged Food'].map(cat => (
                      <button
                        key={cat}
                        className={`filter-chip ${categoryFilter === cat ? 'active' : ''}`}
                        onClick={() => setCategoryFilter(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="donations-grid">
                  {filteredDonations.map(item => (
                    <div key={item.id} className="donation-card">
                      <div>
                        <div className="donation-card-header">
                          <h4 className="food-title">{item.food_type}</h4>
                          <span className={`status-badge status-${item.status.toLowerCase().replace(' ', '')}`}>
                            {item.status}
                          </span>
                        </div>

                        <div className="donation-meta">
                          <div className="meta-item">
                            <span>🏢 <strong>Donor:</strong> {item.donor_name}</span>
                          </div>
                          <div className="meta-item">
                            <span>📍 <strong>Tamil Nadu City:</strong> {item.city || 'Chennai'} ({item.location})</span>
                          </div>
                          <div className="meta-item">
                            <span>📦 <strong>Servings:</strong> {item.quantity}</span>
                          </div>
                          <div className="meta-item">
                            <span>⏳ <strong>Expiry Time:</strong> {item.expiry_time}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {item.status === 'Available' ? (
                          <button className="btn btn-donor btn-sm" style={{ width: '100%' }} onClick={() => handleStatusUpdate(item.id, 'Accepted')}>
                            🎁 Claim Food Allocation (NGO)
                          </button>
                        ) : (
                          <div className="status-tracker">
                            <div className={`tracker-step ${item.status !== '' ? 'completed' : ''}`}>1</div>
                            <div className={`tracker-step ${['Accepted', 'Picked Up', 'Delivered'].includes(item.status) ? 'completed' : ''}`}>2</div>
                            <div className={`tracker-step ${['Picked Up', 'Delivered'].includes(item.status) ? 'completed' : ''}`}>3</div>
                            <div className={`tracker-step ${item.status === 'Delivered' ? 'completed' : ''}`}>4</div>
                          </div>
                        )}

                        <button className="btn btn-secondary btn-sm" onClick={() => openCertModal(item)}>
                          📜 Official Impact Certificate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: DONOR FOOD UPLOAD */}
      {activeModal === 'postDonation' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🍱 Upload Surplus Food Donation</h3>
              <button className="modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handlePostDonationSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Donor Name / Business *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Ananda Bhavan or PSG Hall"
                      required
                      value={donationForm.donor_name}
                      onChange={e => setDonationForm({ ...donationForm, donor_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Food Title / Description *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. South Indian Meals & Biryani"
                      required
                      value={donationForm.food_type}
                      onChange={e => setDonationForm({ ...donationForm, food_type: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tamil Nadu City *</label>
                    <select
                      className="form-select"
                      value={donationForm.city}
                      onChange={e => setDonationForm({ ...donationForm, city: e.target.value })}
                    >
                      {TAMIL_NADU_CITIES.filter(c => c !== 'All Tamil Nadu').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={donationForm.category}
                      onChange={e => setDonationForm({ ...donationForm, category: e.target.value })}
                    >
                      <option value="Prepared Meals">Prepared Meals</option>
                      <option value="Fresh Produce">Fresh Produce</option>
                      <option value="Bakery">Bakery & Bread</option>
                      <option value="Packaged Food">Packaged Food</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Quantity / Servings *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 50 meals / 15 kg"
                      required
                      value={donationForm.quantity}
                      onChange={e => setDonationForm({ ...donationForm, quantity: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expiry Window / Time</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Today, 9:00 PM (3 hrs left)"
                      value={donationForm.expiry_time}
                      onChange={e => setDonationForm({ ...donationForm, expiry_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Neighborhood / Street Address *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. T. Nagar, Usman Road / Peelamedu"
                    required
                    value={donationForm.location}
                    onChange={e => setDonationForm({ ...donationForm, location: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Special Notes / Instructions</label>
                  <textarea
                    className="form-textarea"
                    rows="2"
                    placeholder="e.g. Thermal containers ready. Contact front desk."
                    value={donationForm.notes}
                    onChange={e => setDonationForm({ ...donationForm, notes: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  🚀 Broadcast Food Donation Alert in {donationForm.city}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INTERACTIVE OTP VERIFICATION MODAL FOR NEW USERS */}
      {activeModal === 'otp' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📱 Account Verification OTP</h3>
              <button className="modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔐</div>
              <h4 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>Enter 6-Digit OTP Code</h4>
              <p style={{ color: 'var(--slate)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                We sent a 6-digit verification code to <strong>{authForm.email}</strong>.
              </p>

              {/* PRIVATE EMAIL OTP NOTICE */}
              <div style={{ background: '#ecfdf5', border: '1.5px dashed #10b981', color: '#047857', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', fontWeight: 600, marginBottom: '1.5rem', textAlign: 'center' }}>
                📩 <strong>OTP Sent Privately to Email Inbox</strong><br />
                A 6-digit OTP verification code has been dispatched to <strong>{authForm.email}</strong>. Please check your email inbox / spam folder.
              </div>

              <form onSubmit={handleVerifyOtpAndRegister}>
                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter 6-digit OTP code"
                    maxLength="6"
                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.35em', fontWeight: 800 }}
                    required
                    value={userOtpInput}
                    onChange={e => setUserOtpInput(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  ✅ Verify OTP & Activate Account ➔
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: INTERACTIVE GPS MAP DISPATCH */}
      {activeModal === 'map' && selectedMapDonation && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🗺️ Live Delivery Dispatch & GPS Map</h3>
              <button className="modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: 800 }}>{selectedMapDonation.food_type}</h4>
                <p style={{ color: 'var(--slate)', fontSize: '0.88rem' }}>
                  📍 <strong>City & Location:</strong> {selectedMapDonation.city || 'Chennai'} • {selectedMapDonation.location} • 🚚 <strong>Status:</strong> {selectedMapDonation.status}
                </p>
              </div>

              <div className="map-visualizer-box">
                <div className="map-grid-bg"></div>

                {/* Donor Node */}
                <div className="map-node" style={{ top: '25%', left: '15%' }}>
                  <div className="node-pin node-donor">🏬</div>
                  <div className="node-label">Donor: {selectedMapDonation.donor_name} ({selectedMapDonation.city})</div>
                </div>

                {/* Volunteer Node */}
                <div className="map-node" style={{ top: '45%', left: '50%' }}>
                  <div className="node-pin node-volunteer">🚚</div>
                  <div className="node-label">Volunteer: {selectedMapDonation.assigned_volunteer || 'Karthik (En Route)'}</div>
                </div>

                {/* NGO Destination Node */}
                <div className="map-node" style={{ top: '70%', left: '80%' }}>
                  <div className="node-pin node-ngo">🏢</div>
                  <div className="node-label">Destination: {selectedMapDonation.city} Compassion Shelter</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--muted)' }}>
                <span>GPS Accuracy: 99.4%</span>
                <span>Distance: {selectedMapDonation.distance_km || 1.5} km</span>
                <span>ETA: ~14 Minutes</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PRINTABLE OFFICIAL IMPACT CERTIFICATE */}
      {activeModal === 'certificate' && selectedCertDonation && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📜 Food Rescue Impact Certificate</h3>
              <button className="modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="certificate-modal-body">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏅</div>
                <h2 className="cert-title">Certificate of Recognition</h2>
                <p style={{ fontStyle: 'italic', color: '#78350f', margin: '0.75rem 0' }}>This official certificate is proudly presented to</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#92400e', textDecoration: 'underline', marginBottom: '1rem' }}>
                  {selectedCertDonation.donor_name} ({selectedCertDonation.city || 'Tamil Nadu'})
                </h3>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#451a03' }}>
                  For outstanding social responsibility in preventing food waste in <strong>{selectedCertDonation.city || 'Tamil Nadu'}</strong> and donating <strong>{selectedCertDonation.quantity}</strong> of <strong>{selectedCertDonation.food_type}</strong> to nourish those in need.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1.5px dashed #d97706', fontSize: '0.85rem' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>Date Logged</div>
                    <div>{new Date().toISOString().slice(0, 10)}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800 }}>Certified By</div>
                    <div>Food Donation Connect Tamil Nadu</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button className="btn btn-primary" onClick={() => window.print()}>
                  🖨️ Print / Save PDF Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Real-Time Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span>🔔</span>
          <div>{toastMessage}</div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>Food Donation Connect Tamil Nadu © 2026 • Real-Time Surplus Food Sharing & Distribution Network across Tamil Nadu Cities.</p>
      </footer>
    </div>
  );
}
