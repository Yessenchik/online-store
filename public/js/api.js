//api configuration
const API_BASE_URL = 'http://localhost:3000/api';

//helper function to handle api responses
async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (error) {
    //if json parsing fails, throw network error
    throw new Error(`Network error: Unable to parse response`);
  }

  if (!response.ok) {
    //http error (4xx, 5xx)
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }

  if (!data.success) {
    //api returned success: false
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

//email validation helper
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function buildAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function buildJsonHeaders(token) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

//api helper functions
const api = {
  //auth
  register: async (data) => {
    //validate email format
    if (!isValidEmail(data.email)) {
      throw new Error('Please enter a valid email address');
    }

    //validate password length
    if (data.password.length < 4) {
      throw new Error('Password must be at least 4 characters long');
    }

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  login: async (data) => {
    //validate email format
    if (!isValidEmail(data.email)) {
      throw new Error('Please enter a valid email address');
    }

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getMe: async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: buildAuthHeaders(token),
      });
      return handleResponse(response);
    } catch (error) {
      //handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the server is running.');
      }
      throw error;
    }
  },

  //products
  getProducts: async (params = {}, token) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/products?${queryString}`, {
      headers: buildAuthHeaders(token),
    });
    return response.json();
  },

  getProduct: async (id) => {
    const response = await fetch(`${API_BASE_URL}/products/${id}`);
    return response.json();
  },

  updateProduct: async (id, data, token) => {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: buildJsonHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  createProduct: async (data, token) => {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: buildJsonHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteProduct: async (id, token) => {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: buildAuthHeaders(token),
    });
    return handleResponse(response);
  },

  //reviews
  getProductReviews: async (productId) => {
    const response = await fetch(`${API_BASE_URL}/reviews/products/${productId}`);
    return handleResponse(response);
  },

  createReview: async (data, token) => {
    const response = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers: buildJsonHeaders(token),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  //cart
  addToCart: async (productId, quantity, token) => {
    const response = await fetch(`${API_BASE_URL}/users/cart`, {
      method: 'POST',
      headers: buildJsonHeaders(token),
      body: JSON.stringify({ productId, quantity }),
    });
    return response.json();
  },

  removeFromCart: async (productId, token) => {
    const response = await fetch(`${API_BASE_URL}/users/cart/${productId}`, {
      method: 'DELETE',
      headers: buildAuthHeaders(token),
    });
    return response.json();
  },

  clearCart: async (token) => {
    const response = await fetch(`${API_BASE_URL}/users/cart`, {
      method: 'DELETE',
      headers: buildAuthHeaders(token),
    });
    return response.json();
  },

  //orders
  createOrder: async (data, token) => {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: buildJsonHeaders(token),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  getAllOrders: async (params, token) => {
    const queryString = new URLSearchParams(params || {}).toString();
    const response = await fetch(`${API_BASE_URL}/orders/all?${queryString}`, {
      headers: buildAuthHeaders(token),
    });
    return handleResponse(response);
  },

  updateOrderStatus: async (orderId, data, token) => {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: buildJsonHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getMyOrders: async (params, token) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/orders?${queryString}`, {
      headers: buildAuthHeaders(token),
    });
    return response.json();
  },

  getOrder: async (id, token) => {
    const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
      headers: buildAuthHeaders(token),
    });
    return response.json();
  },

  //analytics
  getTopRated: async () => {
    const response = await fetch(`${API_BASE_URL}/analytics/products/top-rated`);
    return response.json();
  },

  getSalesAnalytics: async (token, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/analytics/sales?${queryString}`, {
      headers: buildAuthHeaders(token),
    });
    return handleResponse(response);
  },

  getSalesTimeSeries: async (token, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/analytics/sales/timeseries?${queryString}`, {
      headers: buildAuthHeaders(token),
    });
    return handleResponse(response);
  },

  getProductStats: async (token) => {
    const response = await fetch(`${API_BASE_URL}/analytics/products/stats`, {
      headers: buildAuthHeaders(token),
    });
    return handleResponse(response);
  },

  getOrderStatusStats: async (token) => {
    const response = await fetch(`${API_BASE_URL}/analytics/orders/status`, {
      headers: buildAuthHeaders(token),
    });
    return handleResponse(response);
  },

  getUserOrderHistory: async (userId, token) => {
    const response = await fetch(`${API_BASE_URL}/analytics/users/${userId}/orders`, {
      headers: buildAuthHeaders(token),
    });
    return handleResponse(response);
  },

  addAddress: async (userId, data, token) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/addresses`, {
      method: 'POST',
      headers: buildJsonHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateAddress: async (userId, addressId, data, token) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/addresses/${addressId}`, {
      method: 'PATCH',
      headers: buildJsonHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  removeAddress: async (userId, addressId, token) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/addresses/${addressId}`, {
      method: 'DELETE',
      headers: buildAuthHeaders(token),
    });
    return handleResponse(response);
  },
};

//utility functions
function showAlert(message, type = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;

  document.body.insertBefore(alertDiv, document.body.firstChild);

  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}

function formatPrice(price) {
  return `$${price.toFixed(2)}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getCategoryIcon(category) {
  const icons = {
    'phone-case': 'PHONE',
    'laptop-case': 'LAPTOP',
    'tablet-case': 'TABLET',
    'watch-case': 'WATCH',
    accessory: 'ACCESSORY',
  };
  return icons[category] || 'ITEM';
}

//get product image - returns actual image or placeholder
function getProductImage(product) {
  //if product has images, use the first one
  if (product.images && product.images.length > 0) {
    const imageUrl = product.images[0];
    return `<img src="${imageUrl}" alt="${product.name}" onerror="this.onerror=null; this.src='https://via.placeholder.com/300x300?text=${encodeURIComponent(product.name)}'" />`;
  }
  //fallback to placeholder with category-specific color
  const colors = {
    'phone-case': 'FF6B6B',
    'laptop-case': '4ECDC4',
    'tablet-case': '45B7D1',
    'watch-case': 'FFA07A',
    accessory: '98D8C8',
  };
  const color = colors[product.category] || 'CCCCCC';
  return `<img src="https://via.placeholder.com/300x300/${color}/FFFFFF?text=${encodeURIComponent(product.name)}" alt="${product.name}" />`;
}

function getStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let stars = '*'.repeat(fullStars);
  if (hasHalfStar) stars += '*';
  return stars || '-----';
}
