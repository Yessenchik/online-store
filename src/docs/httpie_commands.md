# HTTPie API Collection

This document contains a list of common API commands using [HTTPie](https://httpie.io/).

## Environment Setup

Set your base URL as a variable for easier use:

```bash
export BASE_URL=http://localhost:3000
```

## Authentication

### Register a new user

```bash
http POST $BASE_URL/api/auth/register \
    name="Aibek" \
    email="aibek@example.com" \
    password="password123" \
    phone="+77071234567"
```

### Login

```bash
# Save the token to a variable after login
export TOKEN=$(http POST $BASE_URL/api/auth/login email="aibek@example.com" password="password123" | jq -r '.data.token')
echo $TOKEN
```

### Get Current User Profile

```bash
http GET $BASE_URL/api/auth/me "Authorization: Bearer $TOKEN"
```

## Products

### List All Products

```bash
http GET $BASE_URL/api/products
```

### Get Single Product

```bash
http GET $BASE_URL/api/products/<product_id>
```

### Create Product (Admin Only)

```bash
http POST $BASE_URL/api/products \
    "Authorization: Bearer $TOKEN" \
    name="Leather Case" \
    description="Fine grain leather" \
    price=29.99 \
    category="Cases" \
    stock=100
```

## Orders

### Create Order

```bash
http POST $BASE_URL/api/orders \
    "Authorization: Bearer $TOKEN" \
    shipping_address:='{"street": "Abay 1", "city": "Almaty", "country": "Kazakhstan", "postal_code": "050001"}' \
    payment_method="card"
```

### View My Orders

```bash
http GET $BASE_URL/api/orders "Authorization: Bearer $TOKEN"
```

## Analytics

### Top Rated Products

```bash
http GET $BASE_URL/api/analytics/products/top-rated
```

### Sales Stats (Admin Only)

```bash
http GET $BASE_URL/api/analytics/sales "Authorization: Bearer $TOKEN"
```

## System

### Health Check

```bash
http GET $BASE_URL/health
```
