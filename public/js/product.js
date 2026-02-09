// Product details page
let currentProduct = null;

document.addEventListener('DOMContentLoaded', () => {
  const productId = new URLSearchParams(window.location.search).get('id');
  if (!productId) {
    renderProductError('Missing product ID');
    return;
  }

  loadProduct(productId);
  loadReviews(productId);
  setupReviewForm(productId);
});

async function loadProduct(productId) {
  const container = document.getElementById('product-details');
  container.innerHTML =
    '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';

  try {
    const result = await api.getProduct(productId);
    if (!result.success || !result.data) {
      renderProductError(result.message || 'Product not found');
      return;
    }

    currentProduct = result.data;
    const effectivePrice = currentProduct.discountPrice || currentProduct.price;
    const hasDiscount = currentProduct.discountPrice && currentProduct.discountPrice < currentProduct.price;
    const discount = hasDiscount
      ? Math.round(((currentProduct.price - currentProduct.discountPrice) / currentProduct.price) * 100)
      : 0;

    container.innerHTML = `
        <div class="row g-5">
            <div class="col-md-6 mb-4 mb-md-0">
                <div class="card border-0 shadow-sm overflow-hidden">
                    <div class="position-relative">
                         ${hasDiscount ? `<span class="position-absolute top-0 start-0 m-3 badge bg-danger rounded-pill">-${discount}% OFF</span>` : ''}
                         ${getProductImage(currentProduct, 'img-fluid w-100 object-fit-cover', 'min-height: 400px;')}
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="h-100 d-flex flex-column justify-content-center">
                    <div class="mb-2">
                        <span class="badge bg-light text-dark border">${currentProduct.category.replace('-', ' ').toUpperCase()}</span>
                    </div>
                    <h1 class="display-5 fw-bold mb-3">${currentProduct.name}</h1>
                    
                    <div class="d-flex align-items-center gap-3 mb-4">
                        <div class="d-flex text-warning">
                            ${getStars(currentProduct.rating?.average || 0)}
                        </div>
                        <span class="text-muted small">(${currentProduct.rating?.count || 0} reviews)</span>
                    </div>
                    
                    <div class="mb-4">
                        <p class="lead text-muted">${currentProduct.description}</p>
                    </div>
                    
                    <div class="mb-5">
                        <div class="d-flex align-items-end gap-3">
                            <h2 class="mb-0 text-primary fw-bold">${formatPrice(effectivePrice)}</h2>
                            ${hasDiscount ? `<span class="text-muted text-decoration-line-through fs-5">${formatPrice(currentProduct.price)}</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="d-grid gap-3 d-md-flex">
                        <button class="btn btn-primary btn-lg px-5 rounded-pill" onclick="addToCart('${currentProduct._id}')">
                            <i class="ri-shopping-cart-2-line me-2"></i> Add to Cart
                        </button>
                    </div>
                    
                    <div class="mt-5 pt-4 border-top">
                        <div class="d-flex gap-4 text-muted small">
                            <div class="d-flex align-items-center gap-2">
                                <i class="ri-truck-line ri-lg"></i> Free Shipping
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <i class="ri-shield-check-line ri-lg"></i> 1 Year Warranty
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
  } catch (error) {
    console.error('Error loading product:', error);
    renderProductError('Error loading product details');
  }
}

function renderProductError(message) {
  const container = document.getElementById('product-details');
  if (container) {
    container.innerHTML = `<div class="alert alert-danger" role="alert"><i class="ri-error-warning-line me-2"></i> ${message}</div>`;
  }
}

function getReviewFormValues() {
  return {
    rating: Number(document.getElementById('review-rating')?.value),
    title: document.getElementById('review-title')?.value.trim(),
    comment: document.getElementById('review-comment')?.value.trim(),
  };
}

async function loadReviews(productId) {
  const list = document.getElementById('reviews-list');
  const summary = document.getElementById('review-summary');

  try {
    const result = await api.getProductReviews(productId);
    const reviews = result.data || [];

    if (!reviews.length) {
      list.innerHTML = `<div class="text-center py-5 text-muted bg-light rounded"><p class="mb-0">No reviews yet. Be the first to review!</p></div>`;
      if (summary) summary.innerHTML = '';
      return;
    }

    // Calculate average
    const avg = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    if (summary) {
      summary.innerHTML = `
            <div class="d-flex align-items-center justify-content-between">
                <div>
                    <h5 class="mb-0 fw-bold">Average Rating</h5>
                    <div class="text-warning my-1 h4">
                        ${getStars(avg)}
                    </div>
                </div>
                <div class="text-end">
                    <div class="display-6 fw-bold text-primary">${avg.toFixed(1)}</div>
                    <div class="text-muted small">out of 5</div>
                </div>
            </div>
        `;
    }

    list.innerHTML = reviews
      .map(
        (review) => `
            <div class="card border-0 bg-light">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="bg-white rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold border" style="width: 48px; height: 48px;">
                                ${review.user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                                <h6 class="mb-0 fw-bold">${review.user?.name || 'Anonymous User'}</h6>
                                <small class="text-muted">${formatDate(review.createdAt)}</small>
                            </div>
                        </div>
                        <div class="text-warning">
                            ${getStars(review.rating)}
                        </div>
                    </div>
                    <h5 class="card-title fw-bold h6">${review.title || 'Review'}</h5>
                    <p class="card-text text-muted">${review.comment}</p>
                </div>
            </div>
        `
      )
      .join('');
  } catch (error) {
    console.error('Error loading reviews:', error);
    list.innerHTML = '<div class="alert alert-danger">Error loading reviews</div>';
  }
}

function setupReviewForm(productId) {
  const form = document.getElementById('review-form');
  const formWrapper = document.getElementById('review-form-wrapper');
  const message = document.getElementById('review-form-message');

  if (!form || !formWrapper || !message) return;

  if (!isAuthenticated()) {
    formWrapper.style.display = 'none';
    message.innerHTML =
      '<div class="alert alert-info"><a href="/login.html" class="alert-link">Login</a> to leave a review.</div>';
    return;
  }

  // Check eligibility logic (assuming api.js handles this)
  checkReviewEligibility(productId).then((canReview) => {
    if (!canReview.allowed) {
      formWrapper.style.display = 'none';
      if (canReview.reason) {
        message.innerHTML = `<div class="alert alert-secondary text-muted"><i class="ri-information-line me-2"></i> ${canReview.reason}</div>`;
      }
      return;
    }

    formWrapper.style.display = 'block';
    message.textContent = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { rating, title, comment } = getReviewFormValues();

    if (!rating || !title || !comment) {
      showAlert('Please fill all review fields', 'error');
      return;
    }

    try {
      await api.createReview(
        {
          product: productId,
          rating,
          title,
          comment,
        },
        authToken
      );

      showAlert('Review submitted successfully', 'success');
      form.reset();
      await loadReviews(productId);
      setupReviewForm(productId); // Re-check eligibility (might hide form now)
    } catch (error) {
      console.error('Error creating review:', error);
      showAlert(error.message || 'Error submitting review', 'error');
    }
  });
}

// Reuse the logic for checking eligibility
async function checkReviewEligibility(productId) {
  try {
    const me = await api.getMe(authToken);
    if (!me.success || !me.data) return { allowed: false, reason: 'Please login to review.' };

    const ordersResult = await api.getMyOrders({}, authToken);
    const orders = ordersResult.data || [];

    // Check if user has purchased this product and order is delivered
    const hasPurchasedAndDelivered = orders.some((order) => {
      if (order.order_status !== 'delivered') return false;
      return order.items.some((item) => {
        // item.product could be an object or ID string depending on population
        const itemProductId = item.product?._id || item.product;
        return itemProductId === productId;
      });
    });

    if (!hasPurchasedAndDelivered) {
      return { allowed: false, reason: 'Only verified purchasers with delivered orders can leave a review.' };
    }

    // Check if already reviewed
    const reviewsResult = await api.getProductReviews(productId);
    const reviews = reviewsResult.data || [];
    const alreadyReviewed = reviews.some((review) => review.user?._id === me.data._id);

    if (alreadyReviewed) {
      return { allowed: false, reason: 'You have already reviewed this product.' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    // Fail safe to allowed=false but maybe don't show specific error to avoid confusion
    return { allowed: false, reason: '' };
  }
}

// Helper to handle image fallback or object
function getProductImage(product, classes = '', style = '') {
  // This function presumably exists in utils.js but we can inline a safe version or rely on utils
  // Using the global one from utils.js is better
  if (window.getProductImage) {
    // We need to inject our classes/style into the result of utils.getProductImage
    // OR modify utils.getProductImage.
    // For now, let's assume utils.js handles it or returns an <img src="..."> string.
    // Let's manually construct it here for cleaner Bootstrap control if utils isn't flexible enough.

    const imagePath = product.image || '/images/placeholder.jpg';
    return `<img src="${imagePath}" alt="${product.name}" class="${classes}" style="${style}" onerror="this.src='/images/placeholder.jpg'">`;
  }
  return ''; // Fallback
}
