// Utility functions

// Format price
function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

// Format date
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Get stars HTML
function getStars(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  let html = '';
  for (let i = 0; i < fullStars; i++) {
    html += '<i class="ri-star-fill"></i>';
  }
  if (halfStar) {
    html += '<i class="ri-star-half-fill"></i>';
  }
  for (let i = 0; i < emptyStars; i++) {
    html += '<i class="ri-star-line"></i>';
  }
  return html;
}

// Show alert message (Bootstrap toast or alert)
function showAlert(message, type = 'success') {
  // Check if we have a toast container, if not create it
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '1050';
    document.body.appendChild(toastContainer);
  }

  // Map type to Bootstrap colors
  const bgClass = type === 'error' ? 'text-bg-danger' : 'text-bg-success';
  const icon = type === 'error' ? 'ri-error-warning-line' : 'ri-check-line';

  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="${icon} fs-5"></i>
          <span>${message}</span>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  // Create temporary element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = toastHtml.trim();
  const toastEl = tempDiv.firstChild;

  toastContainer.appendChild(toastEl);

  // Initialize Bootstrap toast
  if (window.bootstrap && window.bootstrap.Toast) {
    const toast = new window.bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  } else {
    // Fallback if Bootstrap JS is not loaded or for some reason
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => toastEl.remove(), 1000);
    }, 3000);
  }
}

// Cart management
async function updateCartCount() {
  if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;

  try {
    const result = await api.getMe(authToken);
    if (result.success && result.data.cart) {
      const count = result.data.cart.reduce((sum, item) => sum + item.quantity, 0);
      const badge = document.getElementById('cart-count');
      if (badge) {
        badge.textContent = count;
      }
    }
  } catch (error) {
    console.error('Error updating cart count:', error);
  }
}

// Add product to cart with authentication check
async function addToCart(productId, quantity = 1) {
  if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
    showAlert('Please login to add items to cart', 'error');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1500);
    return;
  }

  try {
    const result = await api.addToCart(productId, quantity, authToken);

    if (result.success) {
      showAlert('Product added to cart!', 'success');
      updateCartCount();
    } else {
      showAlert(result.message || 'Error adding to cart', 'error');
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
    showAlert(error.message || 'Error adding to cart', 'error');
  }
}

// Get product image HTML
function getProductImage(product, classes = '', style = '') {
  const imagePath = product.images && product.images.length > 0 ? product.images[0] : '/images/placeholder.jpg';
  return `<img src="${imagePath}" alt="${product.name}" class="${classes}" style="${style}" onerror="this.src='https://via.placeholder.com/300?text=No+Image'">`;
}

// Product card creation (Bootstrap Column + Card)
function createProductCard(product) {
  const effectivePrice = product.discountPrice || product.price;
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const discount = hasDiscount ? Math.round(((product.price - product.discountPrice) / product.price) * 100) : 0;

  // Clean category name
  const categoryName = (product.category || 'Product').replace(/-/g, ' ');

  return `
    <div class="col-md-4 col-lg-3 mb-4">
        <div class="card h-100 border-0 shadow-sm product-card" onclick="viewProduct('${product._id}')" style="cursor: pointer; transition: transform 0.2s;">
            <div class="position-relative overflow-hidden">
                ${hasDiscount ? `<div class="badge bg-danger position-absolute top-0 start-0 m-3 z-1">-${discount}%</div>` : ''}
                ${getProductImage(product, 'card-img-top object-fit-cover', 'height: 250px;')}
            </div>
            
            <div class="card-body d-flex flex-column p-4">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <small class="text-uppercase text-muted fw-bold" style="font-size: 0.75rem;">${categoryName}</small>
                    <div class="text-warning small">
                        <i class="ri-star-fill"></i> ${product.rating?.average?.toFixed(1) || '0.0'}
                    </div>
                </div>
                
                <h5 class="card-title fw-bold mb-3 text-truncate" title="${product.name}">${product.name}</h5>
                
                <div class="mt-auto d-flex justify-content-between align-items-center">
                    <div>
                        ${
                          hasDiscount
                            ? `<div class="text-decoration-line-through text-muted small">${formatPrice(product.price)}</div>
                               <div class="fw-bold text-danger fs-5">${formatPrice(effectivePrice)}</div>`
                            : `<div class="fw-bold fs-5">${formatPrice(product.price)}</div>`
                        }
                    </div>
                    <button class="btn btn-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;" onclick="event.stopPropagation(); addToCart('${product._id}')" title="Add to Cart">
                        <i class="ri-shopping-cart-2-line"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
}

// Navigate to product detail page
function viewProduct(productId) {
  window.location.href = `/product.html?id=${productId}`;
}

// DOM helpers
function showElement(element) {
  if (!element) return;
  element.style.display = '';
  element.style.removeProperty('display');
}

function hideElement(element) {
  if (!element) return;
  element.style.display = 'none';
}

// Loading state helpers
function showLoading(container) {
  if (container) {
    container.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;
  }
}

function setEmptyMessage(container, message, isError = false) {
  if (container) {
    container.innerHTML = `
      <div class="text-center py-5 ${isError ? 'text-danger' : 'text-muted'}">
        <i class="${isError ? 'ri-error-warning-line' : 'ri-inbox-line'} ri-3x mb-3 d-block"></i>
        <p class="fs-5">${message}</p>
      </div>
    `;
  }
}
