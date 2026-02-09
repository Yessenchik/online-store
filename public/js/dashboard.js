// Dashboard page functionality
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const user = await loadUserInfo();
  loadOrders();

  if (user) {
    loadAnalytics(user);
    updateSidebarProfile(user);
  }

  // Section switching logic
  const navItems = document.querySelectorAll('.list-group-item');
  const sections = document.querySelectorAll('.dashboard-section');

  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = item.getAttribute('data-section');

      navItems.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');

      sections.forEach((s) => {
        s.classList.remove('active');
        if (s.id === targetSection) s.classList.add('active');
      });
    });
  });

  // Navigation from hash
  const hash = window.location.hash.substring(1);
  if (hash) {
    const targetNavItem = document.querySelector(`.list-group-item[data-section="${hash}"]`);
    if (targetNavItem) targetNavItem.click();
  }

  // Address modal controls
  document.getElementById('btn-add-address')?.addEventListener('click', () => {
    const formContainer = document.getElementById('address-form-container');
    formContainer.style.display = 'block';
    formContainer.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('form-title').textContent = 'Add New Address';
    resetAddressForm();
  });

  document.getElementById('address-close')?.addEventListener('click', () => {
    document.getElementById('address-form-container').style.display = 'none';
  });

  document.getElementById('address-form')?.addEventListener('submit', handleAddressSubmit);
  document.getElementById('address-cancel')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('address-form-container').style.display = 'none';
    resetAddressForm();
  });

  document.getElementById('address-list')?.addEventListener('click', handleAddressListClick);

  // Setup order filter
  document.getElementById('order-status-filter')?.addEventListener('change', (e) => {
    loadOrders(e.target.value);
  });

  // Setup logout
  document.getElementById('logout-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
});

function updateSidebarProfile(user) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  const initialsEl = document.getElementById('user-initials');
  const nameEl = document.getElementById('user-name-brief');
  const emailEl = document.getElementById('user-email-brief');

  if (initialsEl) initialsEl.textContent = initials;
  if (nameEl) nameEl.textContent = user.name;
  if (emailEl) emailEl.textContent = user.email;
}

async function loadUserInfo() {
  const container = document.getElementById('user-details');

  try {
    const result = await api.getMe(authToken);

    if (result.success) {
      const user = result.data;
      container.innerHTML = `
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="p-3 bg-light rounded h-100">
                            <small class="text-muted text-uppercase fw-bold d-block mb-1">Full Name</small>
                            <span class="fs-5 text-dark">${user.name}</span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 bg-light rounded h-100">
                            <small class="text-muted text-uppercase fw-bold d-block mb-1">Email Address</small>
                            <span class="fs-5 text-dark">${user.email}</span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 bg-light rounded h-100">
                            <small class="text-muted text-uppercase fw-bold d-block mb-1">Phone Number</small>
                            <span class="fs-5 text-dark">${user.phone || 'Not provided'}</span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 bg-light rounded h-100">
                            <small class="text-muted text-uppercase fw-bold d-block mb-1">Account Role</small>
                            <span class="fs-5 text-dark">${user.role}</span>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="p-3 bg-light rounded h-100">
                            <small class="text-muted text-uppercase fw-bold d-block mb-1">Member Since</small>
                            <span class="fs-5 text-dark">${formatDate(user.createdAt)}</span>
                        </div>
                    </div>
                </div>
            `;
      renderAddresses(user.addresses || []);
      return user;
    }
  } catch (error) {
    console.error('Error loading user info:', error);
    container.innerHTML = '<div class="alert alert-danger">Error loading user information</div>';
  }

  return null;
}

function renderAddresses(addresses) {
  const list = document.getElementById('address-list');
  if (!list) return;

  if (!addresses.length) {
    list.innerHTML =
      '<div class="text-center py-4 text-muted"><i class="ri-map-pin-line ri-2x mb-2 d-block"></i><p>No addresses yet. Add one to get started.</p></div>';
    return;
  }

  list.innerHTML =
    `<div class="row g-3">` +
    addresses
      .map(
        (address) => `
        <div class="col-md-6">
            <div class="card h-100 ${address.is_default ? 'border-primary' : 'border-light'} address-card shadow-sm" data-address-id="${address._id}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title fw-bold mb-0">${address.street}</h6>
                        ${address.is_default ? '<span class="badge bg-primary">Default</span>' : ''}
                    </div>
                    <p class="card-text text-muted small mb-3">
                        ${address.city}, ${address.country}<br>
                        ${address.phone ? `<span class="d-flex align-items-center gap-1 mt-1"><i class="ri-phone-line"></i> ${address.phone}</span>` : ''}
                    </p>
                    <div class="d-flex gap-2 mt-auto">
                        <button type="button" class="btn btn-sm btn-outline-primary" data-action="edit">Edit</button>
                        <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `
      )
      .join('') +
    `</div>`;
}

function handleAddressListClick(event) {
  const action = event.target?.dataset?.action;
  if (!action) return;

  const card = event.target.closest('.address-card');
  if (!card) return;

  if (action === 'edit') {
    const addressId = card.dataset.addressId;

    // Extract data from DOM somewhat reliably
    const street = card.querySelector('.card-title')?.textContent || '';
    const items = card.querySelector('.card-text')?.innerHTML.split('<br>') || [];
    const cityCountry = items[0]?.trim() || '';
    // phone extract handling specifically for the icon span
    let phone = '';
    const phoneEl = card.querySelector('.ri-phone-line');
    if (phoneEl && phoneEl.parentElement) {
      phone = phoneEl.parentElement.textContent.trim();
    }

    const [city, country] = cityCountry.split(',').map((item) => item.trim());
    const isDefault = !!card.querySelector('.badge');

    const formContainer = document.getElementById('address-form-container');
    formContainer.style.display = 'block';
    formContainer.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('form-title').textContent = 'Edit Address';

    setAddressFormValues({
      id: addressId,
      street,
      city: city || '',
      country: country || '',
      phone: phone || '',
      isDefault,
      isEditing: true,
    });
    return;
  }

  if (action === 'delete') {
    handleDeleteAddress(card);
  }
}

async function handleDeleteAddress(card) {
  const addressId = card?.dataset?.addressId;
  if (!addressId) return;

  if (!confirm('Are you sure you want to delete this address?')) return;

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      showAlert('User not found', 'error');
      return;
    }

    await api.removeAddress(userId, addressId, authToken);
    showAlert('Address deleted successfully', 'success');
    resetAddressForm();
    await loadUserInfo();
  } catch (error) {
    console.error('Error deleting address:', error);
    showAlert(error.message || 'Error deleting address', 'error');
  }
}

function resetAddressForm() {
  const form = document.getElementById('address-form');
  if (!form) return;

  form.reset();
  setAddressFormValues({ isEditing: false });
}

async function handleAddressSubmit(e) {
  e.preventDefault();

  const addressId = document.getElementById('address-id')?.value;
  const street = document.getElementById('address-street')?.value.trim();
  const city = document.getElementById('address-city')?.value.trim();
  const country = document.getElementById('address-country')?.value.trim();
  const phone = document.getElementById('address-phone')?.value.trim();
  const isDefault = document.getElementById('address-default')?.checked || false;

  if (!street || !city || !country || !phone) {
    showAlert('Please fill in all fields', 'error');
    return;
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      showAlert('User not found', 'error');
      return;
    }

    const payload = {
      street,
      city,
      country,
      phone,
      is_default: isDefault,
    };

    if (addressId) {
      await api.updateAddress(userId, addressId, payload, authToken);
      showAlert('Address updated successfully', 'success');
    } else {
      await api.addAddress(userId, payload, authToken);
      showAlert('Address added successfully', 'success');
    }

    document.getElementById('address-form-container').style.display = 'none';
    resetAddressForm();
    await loadUserInfo();
  } catch (error) {
    console.error('Error saving address:', error);
    showAlert(error.message || 'Error saving address', 'error');
  }
}

async function loadOrders(status = '') {
  const container = document.getElementById('orders-container');
  container.innerHTML =
    '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';

  try {
    const params = status ? { status } : {};
    const result = await api.getMyOrders(params, authToken);

    if (result.success && result.data.length > 0) {
      const normalizedOrders = result.data.map(normalizeOrder);
      container.innerHTML = normalizedOrders.map((order) => createOrderCard(order)).join('');
    } else {
      setOrdersMessage(container, 'No orders found');
    }
  } catch (error) {
    console.error('Error loading orders:', error);
    setOrdersMessage(container, 'Error loading orders', true);
  }
}

function normalizeOrder(order) {
  const items = (order.items || []).map((item) => ({
    ...item,
    product_snapshot: item.product_snapshot,
  }));

  return {
    ...order,
    orderStatus: order.order_status,
    orderNumber: order.order_number,
    trackingNumber: order.tracking_number,
    items,
  };
}

function createOrderCard(order) {
  const status = order.orderStatus || 'pending';
  let badgeClass = 'bg-secondary';

  if (status === 'delivered') badgeClass = 'bg-success';
  else if (status === 'shipped') badgeClass = 'bg-info';
  else if (status === 'processing') badgeClass = 'bg-primary';
  else if (status === 'cancelled') badgeClass = 'bg-danger';

  return `
        <div class="card mb-3 border shadow-sm">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold me-2">#${order.orderNumber}</span>
                    <small class="text-muted"><i class="ri-calendar-line"></i> ${formatDate(order.createdAt)}</small>
                </div>
                <span class="badge ${badgeClass} rounded-pill">${status.toUpperCase()}</span>
            </div>
            
            <div class="card-body p-0">
                <ul class="list-group list-group-flush">
                ${order.items
                  .map(
                    (item) => `
                    <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                        <div class="d-flex align-items-center gap-3">
                             <div class="bg-light rounded d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                                <i class="ri-image-line text-muted"></i>
                             </div>
                             <div>
                                <span class="fw-medium d-block">${item.product_snapshot?.name || 'Product'}</span>
                                <span class="text-muted small">Qty: ${item.quantity}</span>
                             </div>
                        </div>
                        <span class="fw-bold">${formatPrice(item.subtotal)}</span>
                    </li>
                `
                  )
                  .join('')}
                </ul>
            </div>
            
            <div class="card-footer bg-light py-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="text-muted small">Total Amount:</span>
                        <span class="fw-bold fs-5 ms-2 text-primary">${formatPrice(order.pricing.total)}</span>
                    </div>
                    ${
                      status === 'pending' || status === 'processing'
                        ? `<button class="btn btn-sm btn-outline-danger" onclick="cancelOrder('${order._id}')">Cancel Order</button>`
                        : ''
                    }
                </div>
                ${
                  order.trackingNumber
                    ? `
                    <div class="mt-3 p-2 bg-white rounded border d-flex align-items-center gap-2 text-muted small">
                        <i class="ri-truck-line text-primary"></i> 
                        <span>Tracking:</span>
                        <span class="fw-bold text-dark font-monospace">${order.trackingNumber}</span>
                    </div>
                `
                    : ''
                }
            </div>
        </div>
    `;
}

async function cancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order?')) return;

  try {
    const response = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const result = await response.json();

    if (result.success) {
      showAlert('Order cancelled successfully', 'success');
      loadOrders();
    } else {
      showAlert(result.message || 'Error cancelling order', 'error');
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    showAlert('Error cancelling order', 'error');
  }
}

function buildBarChart(title, rows) {
  const safeRows = rows.filter((row) => row && row.label);
  const maxValue = Math.max(...safeRows.map((row) => row.value), 1);

  return `
        <div class="card h-100 border-0 shadow-sm mt-4">
            <div class="card-header bg-white border-bottom">
                <h6 class="mb-0 fw-bold">${title}</h6>
            </div>
            <div class="card-body">
            ${safeRows
              .map((row) => {
                const width = Math.round((row.value / maxValue) * 100);
                return `
                    <div class="mb-3">
                        <div class="d-flex justify-content-between small mb-1">
                            <span>${row.label}</span>
                            <span class="fw-bold">${row.displayValue ?? row.value}</span>
                        </div>
                        <div class="progress" style="height: 10px;">
                            <div class="progress-bar bg-primary" role="progressbar" style="width: ${width}%" aria-valuenow="${width}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                    </div>
                `;
              })
              .join('')}
            </div>
        </div>
    `;
}

async function loadAnalytics(user) {
  const container = document.getElementById('analytics-content');
  if (!container) return;

  container.innerHTML =
    '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';

  await loadUserAnalytics(user, container);
}

async function loadUserAnalytics(user, container) {
  try {
    const result = await api.getUserOrderHistory(user._id, authToken);
    const stats = result.data.statistics || {};
    const orders = result.data.orders || [];

    const statusCounts = orders.reduce((acc, order) => {
      const status = order.order_status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const statusRows = Object.entries(statusCounts).map(([label, value]) => ({
      label,
      value,
    }));

    container.innerHTML = `
            <div class="row g-3">
                <div class="col-md-4">
                    <div class="p-4 bg-light rounded text-center h-100">
                        <div class="small text-muted text-uppercase fw-bold mb-2">Total Orders</div>
                        <div class="display-6 fw-bold text-primary">${stats.totalOrders ?? 0}</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="p-4 bg-light rounded text-center h-100">
                        <div class="small text-muted text-uppercase fw-bold mb-2">Total Spent</div>
                        <div class="display-6 fw-bold text-primary">${stats.totalSpent ? formatPrice(stats.totalSpent) : '$0.00'}</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="p-4 bg-light rounded text-center h-100">
                        <div class="small text-muted text-uppercase fw-bold mb-2">Avg Order</div>
                        <div class="display-6 fw-bold text-primary">${stats.averageOrderValue ? formatPrice(stats.averageOrderValue) : '$0.00'}</div>
                    </div>
                </div>
            </div>
            ${statusRows.length > 0 ? buildBarChart('Orders by Status', statusRows) : ''}
        `;
  } catch (error) {
    console.error('Error loading analytics:', error);
    container.innerHTML = '<div class="alert alert-danger">Error loading analytics</div>';
  }
}

function setAddressFormValues(values) {
  document.getElementById('address-id').value = values.id || '';
  document.getElementById('address-street').value = values.street || '';
  document.getElementById('address-city').value = values.city || '';
  document.getElementById('address-country').value = values.country || '';
  document.getElementById('address-phone').value = values.phone || '';
  document.getElementById('address-default').checked = values.isDefault || false;
  document.getElementById('address-submit').textContent = values.isEditing ? 'Update Address' : 'Save Address';
}

function setOrdersMessage(container, message, isError = false) {
  container.innerHTML = isError
    ? `<div class="alert alert-danger">${message}</div>`
    : `<div class="text-center py-5 text-muted"><p>${message}</p></div>`;
}

async function getCurrentUserId() {
  const me = await api.getMe(authToken);
  return me.data?._id || null;
}
