const donationFeed = document.getElementById('donationFeed');
const form = document.getElementById('donation-form');
const availableCount = document.getElementById('availableCount');
const acceptedCount = document.getElementById('acceptedCount');
const deliveredCount = document.getElementById('deliveredCount');

const initialDonations = [
  {
    donor: 'Mina R.',
    food: 'Vegetable curry',
    quantity: '15 portions',
    expiry: 'Today, 7:30 PM',
    location: 'River Side Lane',
    recipient: 'NGO',
    status: 'Available',
  },
  {
    donor: 'Ali K.',
    food: 'Sandwich trays',
    quantity: '40 pieces',
    expiry: 'Today, 8:00 PM',
    location: 'Mubarak Market',
    recipient: 'Volunteer',
    status: 'Accepted',
  },
  {
    donor: 'Sofia M.',
    food: 'Fruit baskets',
    quantity: '12 baskets',
    expiry: 'Tomorrow, 11:00 AM',
    location: 'North Hub',
    recipient: 'Community center',
    status: 'Delivered',
  },
];

function renderDonations() {
  if (!donationFeed) return;

  donationFeed.innerHTML = '';

  initialDonations.forEach((donation, index) => {
    const card = document.createElement('article');
    card.className = 'donation-card';
    card.innerHTML = `
      <div class="meta">
        <strong>${donation.food}</strong>
        <span class="badge ${getStatusClass(donation.status)}">${donation.status}</span>
      </div>
      <p><strong>Donor:</strong> ${donation.donor} • <strong>Qty:</strong> ${donation.quantity}</p>
      <p><strong>Expires:</strong> ${donation.expiry} • <strong>Location:</strong> ${donation.location}</p>
      <p><strong>Recipient:</strong> ${donation.recipient}</p>
      <div class="actions">
        <span>Ready for quick pickup</span>
        <div>
          ${renderActionButtons(index, donation.status)}
        </div>
      </div>
    `;
    donationFeed.appendChild(card);
  });

  updateStats();
}

function getStatusClass(status) {
  if (status === 'Accepted') return 'accepted';
  if (status === 'Picked Up') return 'picked';
  if (status === 'Delivered') return 'delivered';
  return '';
}

function renderActionButtons(index, status) {
  if (status === 'Delivered') {
    return '<button class="small-btn secondary" disabled>Delivered</button>';
  }

  if (status === 'Picked Up') {
    return '<button class="small-btn" data-action="deliver" data-index="' + index + '">Mark delivered</button>';
  }

  if (status === 'Accepted') {
    return '<button class="small-btn" data-action="pickup" data-index="' + index + '">Mark picked up</button>';
  }

  return '<button class="small-btn" data-action="accept" data-index="' + index + '">Accept pickup</button>';
}

function updateStats() {
  const available = initialDonations.filter((item) => item.status === 'Available').length;
  const accepted = initialDonations.filter((item) => item.status === 'Accepted' || item.status === 'Picked Up').length;
  const delivered = initialDonations.filter((item) => item.status === 'Delivered').length;

  availableCount.textContent = available;
  acceptedCount.textContent = accepted;
  deliveredCount.textContent = delivered;
}

function handleDonationSubmit(event) {
  event.preventDefault();

  const donation = {
    donor: document.getElementById('donorName').value.trim() || 'Anonymous donor',
    food: document.getElementById('foodType').value.trim(),
    quantity: document.getElementById('quantity').value.trim(),
    expiry: formatDate(document.getElementById('expiryTime').value),
    location: document.getElementById('location').value.trim(),
    recipient: document.getElementById('recipientType').value,
    status: 'Available',
  };

  initialDonations.unshift(donation);
  form.reset();
  renderDonations();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Soon';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function handleStatusChange(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const index = Number(button.getAttribute('data-index'));
  const action = button.getAttribute('data-action');

  if (action === 'accept') {
    initialDonations[index].status = 'Accepted';
  } else if (action === 'pickup') {
    initialDonations[index].status = 'Picked Up';
  } else if (action === 'deliver') {
    initialDonations[index].status = 'Delivered';
  }

  renderDonations();
}

form.addEventListener('submit', handleDonationSubmit);
donationFeed.addEventListener('click', handleStatusChange);
renderDonations();
