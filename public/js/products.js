// Products page functionality
let currentPage = 1;
const currentFilters = {
  category: '',
  sort: '-createdAt',
  search: '',
};

document.addEventListener('DOMContentLoaded', () => {
  // Get URL params
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');
  if (categoryParam) {
    currentFilters.category = categoryParam;
    const categorySelect = document.getElementById('category');
    if (categorySelect) categorySelect.value = currentFilters.category;
  }

  const searchParam = urlParams.get('search');
  if (searchParam) {
    currentFilters.search = searchParam;
    const searchInput = document.getElementById('search');
    if (searchInput) searchInput.value = currentFilters.search;
  }

  // Setup event listeners
  document.getElementById('category')?.addEventListener('change', (e) => {
    applyFilterChange('category', e.target.value);
  });

  document.getElementById('sort')?.addEventListener('change', (e) => {
    applyFilterChange('sort', e.target.value);
  });

  let searchTimeout;
  document.getElementById('search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      applyFilterChange('search', e.target.value);
    }, 500);
  });

  loadProducts();
});

function applyFilterChange(key, value) {
  currentFilters[key] = value;
  currentPage = 1;
  loadProducts();
}

async function loadProducts() {
  const container = document.getElementById('products-container');
  showLoading(container);

  try {
    const params = buildProductParams();
    // Use api.getProducts(params) if your api.js supports object params,
    // otherwise manual query string construction might be needed if api.js is strict.
    // Assuming api.js handles object params correctly based on previous context.
    const result = await api.getProducts(params);

    if (result.success && result.data && result.data.length > 0) {
      container.innerHTML = result.data.map((product) => createProductCard(product)).join('');
      renderPagination(result.pages || 1, result.currentPage || 1);
    } else {
      setEmptyMessage(container, 'No products found matching your criteria.');
      const paginationContainer = document.getElementById('pagination');
      if (paginationContainer) paginationContainer.innerHTML = '';
    }
  } catch (error) {
    console.error('Error loading products:', error);
    setEmptyMessage(container, 'Error loading products. Please try again later.', true);
  }
}

function buildProductParams() {
  const params = {
    page: currentPage,
    limit: 12,
    ...currentFilters,
  };

  // Remove empty params
  Object.keys(params).forEach((key) => {
    if (params[key] === '' || params[key] === null || params[key] === undefined) {
      delete params[key];
    }
  });

  return params;
}

function renderPagination(totalPages, current) {
  const container = document.getElementById('pagination');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  // Previous button
  html += `
    <li class="page-item ${current <= 1 ? 'disabled' : ''}">
      <button class="page-link" onclick="changePage(${current - 1})" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
      </button>
    </li>
  `;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    // Show first, last, and pages around current
    if (i === 1 || i === totalPages || (i >= current - 1 && i <= current + 1)) {
      html += `
        <li class="page-item ${i === current ? 'active' : ''}">
          <button class="page-link" onclick="changePage(${i})">${i}</button>
        </li>
      `;
    } else if (i === current - 2 || i === current + 2) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  // Next button
  html += `
    <li class="page-item ${current >= totalPages ? 'disabled' : ''}">
      <button class="page-link" onclick="changePage(${current + 1})" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
      </button>
    </li>
  `;

  container.innerHTML = html;
}

// Make changePage available globally
window.changePage = function (page) {
  if (page < 1) return;
  currentPage = page;
  loadProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

updateCartCount();
