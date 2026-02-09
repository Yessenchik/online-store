// Admin analytics page
let salesChart = null;
let statusChart = null;
let topProductsChart = null;
let categoryChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const user = await api.getMe(authToken).catch(() => null);
  if (!user || !user.success || user.data.role !== 'admin') {
    window.location.href = '/dashboard.html';
    return;
  }

  initFilters();
  await loadAdminAnalytics();
  await loadAdminOrders();
  await loadAdminProducts();

  document.getElementById('admin-orders')?.addEventListener('click', handleOrderAction);
  document.getElementById('admin-products')?.addEventListener('click', handleProductAction);
  document.getElementById('admin-product-form')?.addEventListener('submit', handleCreateProduct);

  document.getElementById('logout-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
});

function initFilters() {
  document.getElementById('admin-interval')?.addEventListener('change', () => loadAdminAnalytics());
  document.getElementById('admin-metric')?.addEventListener('change', () => loadAdminAnalytics());
}

function getFilterParams() {
  const interval = document.getElementById('admin-interval')?.value || 'day';
  return { interval };
}

async function loadAdminAnalytics() {
  const params = getFilterParams();
  const metric = document.getElementById('admin-metric')?.value || 'revenue';

  try {
    const [summaryResult, seriesResult, statusResult, productStatsResult] = await Promise.all([
      api.getSalesAnalytics(authToken, params),
      api.getSalesTimeSeries(authToken, params),
      api.getOrderStatusStats(authToken),
      api.getProductStats(authToken),
    ]);

    updateSummary(summaryResult.data.summary || {});
    renderSalesChart(seriesResult.data || [], metric);
    renderStatusChart(statusResult.data || []);
    renderTopProductsChart((summaryResult.data.topProducts || []).slice(0, 10));
    renderCategoryChart(productStatsResult.data || []);
  } catch (error) {
    console.error('Error loading admin analytics:', error);
    showAlert('Error loading analytics', 'error');
  }
}

function updateSummary(summary) {
  const totalOrders = summary.totalOrders ?? 0;
  const totalRevenue = summary.totalRevenue ?? 0;
  const avgOrder = summary.averageOrderValue ?? 0;

  const totalOrdersEl = document.getElementById('summary-total-orders');
  const totalRevenueEl = document.getElementById('summary-total-revenue');
  const avgOrderEl = document.getElementById('summary-avg-order');

  if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
  if (totalRevenueEl) totalRevenueEl.textContent = formatPrice(totalRevenue);
  if (avgOrderEl) avgOrderEl.textContent = formatPrice(avgOrder);
}

function renderSalesChart(series, metric) {
  const labels = series.map((point) => point.period);
  const values = series.map((point) => {
    if (metric === 'orders') {
      return point.totalOrders;
    }
    const revenue = typeof point.totalRevenue === 'number' ? point.totalRevenue : Number(point.totalRevenue || 0);
    return Number(revenue.toFixed(2));
  });
  const label = metric === 'orders' ? 'Orders' : 'Revenue';
  const isOrders = metric === 'orders';

  const ctx = document.getElementById('chart-sales-timeseries');
  if (!ctx) return;

  if (salesChart) salesChart.destroy();
  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            precision: isOrders ? 0 : 2,
            callback: (value) => {
              const numeric = typeof value === 'number' ? value : Number(value);
              return isOrders ? Math.round(numeric) : `$${numeric.toFixed(2)}`;
            },
          },
        },
      },
    },
  });
}

function renderStatusChart(stats) {
  const labels = stats.map((item) => item._id || 'unknown');
  const values = stats.map((item) => item.count);

  const ctx = document.getElementById('chart-order-status');
  if (!ctx) return;

  if (statusChart) statusChart.destroy();
  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          label: 'Orders',
          data: values,
          backgroundColor: ['#198754', '#0dcaf0', '#ffc107', '#dc3545', '#6c757d'],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  });
}

function renderTopProductsChart(products) {
  const labels = products.map((item) => item.productName || 'Product');
  const values = products.map((item) => {
    const revenue = typeof item.totalRevenue === 'number' ? item.totalRevenue : Number(item.totalRevenue || 0);
    return Number(revenue.toFixed(2));
  });

  const ctx = document.getElementById('chart-top-products');
  if (!ctx) return;

  if (topProductsChart) topProductsChart.destroy();
  topProductsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: values,
          backgroundColor: '#6610f2',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          ticks: {
            callback: (value) => `$${value}`,
          },
        },
      },
    },
  });
}

function renderCategoryChart(stats) {
  const labels = stats.map((item) => item._id || 'Other');
  const values = stats.map((item) => item.totalSold || 0);

  const ctx = document.getElementById('chart-category-sold');
  if (!ctx) return;

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [
        {
          label: 'Units Sold',
          data: values,
          backgroundColor: ['#fd7e14', '#20c997', '#d63384', '#6f42c1', '#adb5bd'],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  });
}

async function loadAdminOrders() {
  const container = document.getElementById('admin-orders');
  if (!container) return;

  container.innerHTML =
    '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';

  try {
    const result = await api.getAllOrders({ limit: 50 }, authToken);
    const orders = result.data || [];

    if (!orders.length) {
      setListMessage(container, 'No orders yet');
      return;
    }

    // Generate table structure
    let tableHtml = `
      <table class="table table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th>Order #</th>
            <th>User</th>
            <th>Date</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    tableHtml += orders
      .map(
        (order) => `
        <tr class="admin-row" data-order-id="${order._id}">
            <td class="fw-bold text-primary">#${order.order_number || order.orderNumber || order._id.slice(-6)}</td>
            <td>
                <div>${order.user?.name || 'Unknown User'}</div>
                <small class="text-muted">${order.user?.email || ''}</small>
            </td>
            <td>${formatDate(order.createdAt)}</td>
            <td class="fw-bold">${formatPrice(order.pricing?.total || 0)}</td>
            <td>
                 <select class="form-select form-select-sm" data-role="status" style="width: 140px;">
                    ${renderStatusOptions(order.order_status)}
                </select>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary" data-action="update-order">Update</button>
            </td>
        </tr>
    `
      )
      .join('');

    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
  } catch (error) {
    console.error('Error loading orders:', error);
    setListMessage(container, 'Error loading orders', true);
  }
}

function renderStatusOptions(current) {
  const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  return statuses
    .map(
      (status) => `
        <option value="${status}" ${status === current ? 'selected' : ''}>${status.charAt(0).toUpperCase() + status.slice(1)}</option>
    `
    )
    .join('');
}

async function handleOrderAction(event) {
  const action = event.target?.dataset?.action;
  if (action !== 'update-order') return;

  const row = event.target.closest('tr');
  const orderId = row?.dataset?.orderId;
  const statusSelect = row?.querySelector('[data-role="status"]');
  const status = statusSelect?.value;

  if (!orderId || !status) return;

  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '...';

  try {
    await api.updateOrderStatus(orderId, { orderStatus: status }, authToken);
    showAlert('Order status updated', 'success');
  } catch (error) {
    console.error('Error updating order:', error);
    showAlert(error.message || 'Error updating order', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function loadAdminProducts() {
  const container = document.getElementById('admin-products');
  if (!container) return;

  container.innerHTML =
    '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';

  try {
    const result = await api.getProducts({ limit: 50, includeInactive: 'true' }, authToken);
    const products = result.data || [];

    if (!products.length) {
      setListMessage(container, 'No products found');
      return;
    }

    container.innerHTML = products
      .map(
        (product) => `
            <div class="card mb-3 admin-product-card" data-product-id="${product._id}">
                <div class="card-header bg-white d-flex justify-content-between align-items-center py-2">
                    <span class="badge bg-light text-dark border">${product.category}</span>
                    <button class="btn btn-sm btn-outline-danger" data-action="delete-product">Delete</button>
                </div>
                <div class="card-body">
                    <div class="row g-3">
                         <div class="col-md-2 text-center">
                            ${product.images?.[0] ? `<img src="${product.images[0]}" class="img-fluid rounded" alt="${escapeHtml(product.name)}" style="max-height: 100px;">` : '<div class="text-muted p-3 bg-light rounded">No image</div>'}
                            <div class="mt-2 text-muted small">${product._id}</div>
                         </div>
                         <div class="col-md-10">
                            <div class="row g-2">
                                <div class="col-md-6">
                                    <label class="form-label small text-muted">Name</label>
                                    <input class="form-control form-control-sm" data-role="name" value="${escapeHtml(product.name)}" />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small text-muted">Price</label>
                                    <input class="form-control form-control-sm" data-role="price" type="number" step="0.01" value="${product.price}" />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small text-muted">Stock</label>
                                    <input class="form-control form-control-sm" data-role="stock" type="number" value="${product.stock ?? 0}" />
                                </div>
                                <div class="col-md-12">
                                     <label class="form-label small text-muted">Description</label>
                                     <textarea class="form-control form-control-sm" data-role="description" rows="2">${escapeHtml(product.description || '')}</textarea>
                                </div>
                                <div class="col-md-12 d-flex justify-content-between align-items-center gap-2 mt-2">
                                    <div class="form-check d-flex align-items-center me-3">
                                        <input class="form-check-input" type="checkbox" data-role="active" ${product.is_active !== false ? 'checked' : ''}>
                                        <label class="form-check-label ms-2 small">Active</label>
                                    </div>
                                    <div class="d-flex gap-2">
                                       <button class="btn btn-link btn-sm text-decoration-none" type="button" data-bs-toggle="collapse" data-bs-target="#more-details-${product._id}">
                                            More Details
                                        </button>
                                       <button class="btn btn-sm btn-primary" data-action="update-product">Save Changes</button>
                                    </div>
                                </div>
                                
                                <div class="collapse col-12" id="more-details-${product._id}">
                                    <div class="row g-2 mt-2 pt-2 border-top">
                                        <div class="col-md-3">
                                            <input class="form-control form-control-sm" data-role="brand" placeholder="Brand" value="${escapeHtml(product.brand || '')}" />
                                        </div>
                                         <div class="col-md-3">
                                            <input class="form-control form-control-sm" data-role="category" placeholder="Category" value="${escapeHtml(product.category || '')}" />
                                        </div>
                                         <div class="col-md-6">
                                            <input class="form-control form-control-sm" data-role="images" placeholder="Images csv" value="${escapeHtml((product.images || []).join(','))}" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        `
      )
      .join('');
  } catch (error) {
    console.error('Error loading products:', error);
    setListMessage(container, 'Error loading products', true);
  }
}

async function handleProductAction(event) {
  const action = event.target?.dataset?.action;
  if (!action) return;

  const row = event.target.closest('.admin-product-card');
  const productId = row?.dataset?.productId;

  if (!productId) return;

  const btn = event.target;

  if (action === 'delete-product') {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await api.deleteProduct(productId, authToken);
      showAlert('Product deleted', 'success');
      await loadAdminProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      showAlert(error.message || 'Error deleting product', 'error');
    }
    return;
  }

  if (action !== 'update-product') return;

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Saving...';

  const name = row.querySelector('[data-role="name"]')?.value.trim();
  const price = Number(row.querySelector('[data-role="price"]')?.value);
  const stock = Number(row.querySelector('[data-role="stock"]')?.value);
  const description = row.querySelector('[data-role="description"]')?.value.trim();
  const isActive = row.querySelector('[data-role="active"]')?.checked ?? true;

  // Expanded fields (if toggled)
  const brand = row.querySelector('[data-role="brand"]')?.value.trim();
  const category = row.querySelector('[data-role="category"]')?.value.trim();
  const imagesRaw = row.querySelector('[data-role="images"]')?.value;

  if (!name || Number.isNaN(price) || price < 0 || Number.isNaN(stock) || stock < 0 || !description) {
    showAlert('Please fill required fields (Name, Price, Stock, Description)', 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
    return;
  }

  const payloadResult = buildProductPayload({
    name,
    price,
    category,
    stock,
    brand,
    description,
    imagesRaw,
    isActive,
    // Add default values for missing fields to avoid breaking changes if API requires them
    material: '',
    color: '',
    tagsRaw: '',
    modelsRaw: '',
  });

  if (!payloadResult.ok) {
    showAlert(payloadResult.error, 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
    return;
  }

  try {
    await api.updateProduct(productId, payloadResult.payload, authToken);
    showAlert('Product updated', 'success');
  } catch (error) {
    console.error('Error updating product:', error);
    showAlert(error.message || 'Error updating product', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function handleCreateProduct(event) {
  event.preventDefault();

  const name = document.getElementById('admin-product-name')?.value.trim();
  const price = Number(document.getElementById('admin-product-price')?.value);
  const category = document.getElementById('admin-product-category')?.value;
  const stock = Number(document.getElementById('admin-product-stock')?.value);
  const brand = document.getElementById('admin-product-brand')?.value.trim();
  const material = document.getElementById('admin-product-material')?.value.trim();
  const color = document.getElementById('admin-product-color')?.value.trim();
  const description = document.getElementById('admin-product-description')?.value.trim();
  const tagsRaw = document.getElementById('admin-product-tags')?.value;
  const imagesRaw = document.getElementById('admin-product-images')?.value;
  const modelsRaw = document.getElementById('admin-product-models')?.value;
  const isActive = document.getElementById('admin-product-active')?.checked ?? true;

  if (!name || Number.isNaN(price) || price < 0 || !category || Number.isNaN(stock) || stock < 0 || !description) {
    showAlert('Fill all required product fields', 'error');
    return;
  }

  const payloadResult = buildProductPayload({
    name,
    price,
    category,
    stock,
    brand,
    material,
    color,
    description,
    tagsRaw,
    imagesRaw,
    modelsRaw,
    isActive,
  });

  if (!payloadResult.ok) {
    showAlert(payloadResult.error, 'error');
    return;
  }

  try {
    await api.createProduct(payloadResult.payload, authToken);
    showAlert('Product created successfully', 'success');
    event.target.reset();
    await loadAdminProducts();
  } catch (error) {
    console.error('Error creating product:', error);
    showAlert(error.message || 'Error creating product', 'error');
  }
}

function buildProductPayload(values) {
  const modelsResult = parseCompatibleModels(values.modelsRaw);
  if (!modelsResult.ok) {
    return { ok: false, error: modelsResult.error };
  }

  return {
    ok: true,
    payload: {
      name: values.name,
      price: values.price,
      category: values.category,
      stock: values.stock,
      brand: values.brand || undefined,
      material: values.material || undefined,
      color: values.color || undefined,
      description: values.description,
      tags: parseCsv(values.tagsRaw),
      images: parseCsv(values.imagesRaw),
      compatible_models: modelsResult.value,
      is_active: values.is_active ?? values.isActive, // handle both keys if inconsistent
    },
  };
}

function parseCsv(value) {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function parseCompatibleModels(value) {
  if (!value?.trim()) {
    return { ok: true, value: [] };
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return { ok: false, error: 'Compatible models must be valid JSON array' };
    }
    return { ok: true, value: parsed };
  } catch (error) {
    return { ok: false, error: 'Compatible models must be valid JSON array' };
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setListMessage(container, message, isError = false) {
  container.innerHTML = `<div class="text-center py-4 ${isError ? 'text-danger' : 'text-muted'}">${message}</div>`;
}
