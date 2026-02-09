// Cart page functionality
let cart = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadCart();
});

async function loadCart() {
  const container = document.getElementById('cart-content');
  const emptyState = document.getElementById('empty-cart');
  const loadingState = document.getElementById('loading-state');

  // Show loading, hide others
  if (loadingState) loadingState.style.display = 'block';
  if (container) container.style.display = 'none';
  if (emptyState) emptyState.style.display = 'none';

  try {
    const result = await api.getMe(authToken);

    if (result.success && result.data.cart && result.data.cart.length > 0) {
      cart = result.data.cart;
      renderCart();
      toggleCartView(true);
    } else {
      toggleCartView(false);
    }
  } catch (error) {
    console.error('Error loading cart:', error);
    if (container) container.innerHTML = '<div class="alert alert-danger">Error loading cart</div>';
    if (loadingState) loadingState.style.display = 'none';
  }
}

function toggleCartView(hasItems) {
  const container = document.getElementById('cart-content');
  const emptyState = document.getElementById('empty-cart');
  const loadingState = document.getElementById('loading-state');

  if (loadingState) loadingState.style.display = 'none';

  if (container) container.style.display = hasItems ? 'flex' : 'none'; // flex because row is flex
  if (emptyState) emptyState.style.display = hasItems ? 'none' : 'block';
}

function renderCartItem(item) {
  const product = item.product;
  const effectivePrice = product.price; // or discountPrice if available
  const subtotal = effectivePrice * item.quantity;

  // Use a global or passed in getProductImage or fallback
  const imgHtml = getProductImage
    ? getProductImage(product, 'img-fluid rounded', 'width: 80px; height: 80px; object-fit: cover;')
    : '';

  return `
    <div class="cart-item border-bottom p-3">
        <div class="row align-items-center g-3">
            <div class="col-3 col-md-2">
                ${imgHtml}
            </div>
            <div class="col-9 col-md-10">
                <div class="row align-items-center">
                    <div class="col-md-5 mb-2 mb-md-0">
                        <h6 class="mb-1 fw-bold text-dark"><a href="/product.html?id=${product._id}" class="text-decoration-none text-dark">${product.name}</a></h6>
                        <small class="text-muted d-block">${product.category?.replace('-', ' ') || 'Product'}</small>
                    </div>
                    <div class="col-md-3 mb-3 mb-md-0">
                        <div class="input-group input-group-sm" style="width: 100px;">
                            <button class="btn btn-outline-secondary" type="button" onclick="updateQuantity('${product._id}', ${item.quantity - 1})">-</button>
                            <input type="text" class="form-control text-center px-0" value="${item.quantity}" readonly>
                            <button class="btn btn-outline-secondary" type="button" onclick="updateQuantity('${product._id}', ${item.quantity + 1})">+</button>
                        </div>
                    </div>
                    <div class="col-md-3 mb-2 mb-md-0 text-md-end">
                        <div class="fw-bold">${formatPrice(subtotal)}</div>
                        <small class="text-muted">${formatPrice(effectivePrice)} each</small>
                    </div>
                    <div class="col-md-1 text-md-end">
                        <button class="btn btn-link text-danger p-0" onclick="removeFromCart('${product._id}')" title="Remove">
                            <i class="ri-delete-bin-line ri-lg"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;
}

function renderCart() {
  const itemsContainer = document.getElementById('cart-items');
  const subtotalEl = document.getElementById('cart-subtotal');
  const totalEl = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkout-btn');

  if (itemsContainer) {
    itemsContainer.innerHTML = cart.map((item) => renderCartItem(item)).join('');
  }

  const subtotal = calculateSubtotal(cart);
  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;

  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (totalEl) totalEl.textContent = formatPrice(total);

  if (checkoutBtn) {
    checkoutBtn.onclick = checkout;
  }
}

function calculateSubtotal(items) {
  return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

function calculateShipping(subtotal) {
  return subtotal > 100 ? 0 : 5; //free shipping over $100
}

async function updateQuantity(productId, newQuantity) {
  if (newQuantity < 1) {
    if (confirm('Remove this item from cart?')) {
      await removeFromCart(productId);
    }
    return;
  }

  try {
    // Optimistic update could happen here, but for simplicity reloading cart
    // Using updateCart endpoint if available would be better, but currently we rely on addToCart/removeFromCart logic
    // Actually the previous implementation did remove then add, which is inefficient but works with the API provided.
    // If the API supports updateCartItem(productId, quantity), use that.
    // Assuming the previous logic was the way to go:

    // BUT wait, addToCart adds to existing quantity usually.
    // If I want to SET quantity, I might need a specific endpoint or logic.
    // The previous code: remove then add "newQuantity".

    await api.removeFromCart(productId, authToken);
    await api.addToCart(productId, newQuantity, authToken);

    await loadCart();
    updateCartCount();
  } catch (error) {
    console.error('Error updating quantity:', error);
    showAlert('Error updating cart', 'error');
  }
}

async function removeFromCart(productId) {
  try {
    const result = await api.removeFromCart(productId, authToken);

    if (result.success) {
      // showAlert('Item removed from cart', 'success'); // Optional, maybe too noisy
      await loadCart();
      updateCartCount();
    } else {
      showAlert(result.message || 'Error removing item', 'error');
    }
  } catch (error) {
    console.error('Error removing from cart:', error);
    showAlert('Error removing item', 'error');
  }
}

async function checkout() {
  if (cart.length === 0) {
    showAlert('Your cart is empty', 'error');
    return;
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  const originalText = checkoutBtn.innerHTML;
  checkoutBtn.disabled = true;
  checkoutBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...';

  try {
    const userResult = await api.getMe(authToken);
    const user = userResult.data;

    const shippingAddress = user.addresses?.find((addr) => addr.is_default) || user.addresses?.[0];

    if (!shippingAddress) {
      showAlert('Please add a shipping address in your dashboard first', 'warning');
      setTimeout(() => {
        window.location.href = '/dashboard.html#addresses';
      }, 1500);
      return;
    }

    if (!shippingAddress.phone) {
      showAlert('Your shipping address is missing a phone number. Please update it.', 'warning');
      setTimeout(() => {
        window.location.href = '/dashboard.html#addresses';
      }, 1500);
      return;
    }

    const subtotal = calculateSubtotal(cart);
    const shipping = calculateShipping(subtotal);
    const total = subtotal + shipping;

    const orderData = {
      items: cart.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
      })),
      shippingAddress: {
        name: user.name,
        street: shippingAddress.street,
        city: shippingAddress.city,
        country: shippingAddress.country,
        phone: shippingAddress.phone,
      },
      paymentMethod: 'credit-card', // Hardcoded for now based on UI removal
      pricing: {
        subtotal,
        shipping,
        discount: 0,
        total,
      },
    };

    const result = await api.createOrder(orderData, authToken);

    if (result.success) {
      showAlert('Order placed successfully!', 'success');
      await api.clearCart(authToken);
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1500);
    } else {
      showAlert(result.message || 'Error creating order', 'error');
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = originalText;
    }
  } catch (error) {
    console.error('Error during checkout:', error);
    showAlert('Error processing checkout', 'error');
    checkoutBtn.disabled = false;
    checkoutBtn.innerHTML = originalText;
  }
}
