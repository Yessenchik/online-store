const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const mongoose = require('mongoose');
const {
  sendError,
  sendSuccess,
  getPagination,
  buildPaginationMeta,
  handleValidationError,
} = require('./responseUtils');

//create order item with product snapshot
const createOrderItem = (product, quantity) => ({
  product: product._id,
  product_snapshot: {
    name: product.name,
    price: product.price,
    image: product.images?.[0] || '',
  },
  quantity,
  price: product.price,
  subtotal: product.price * quantity,
});

//update product stock
const updateProductStock = async (productId, quantity, decrease = true, session = null) => {
  const multiplier = decrease ? -1 : 1;
  await Product.findByIdAndUpdate(
    productId,
    {
      $inc: {
        stock: quantity * multiplier,
        sold_count: quantity * multiplier,
      },
    },
    { session }
  );
};

//check if user can access order
const canAccessOrder = (order, userId, userRole) => {
  return order.user._id.toString() === userId.toString() || userRole === 'admin';
};

// desc - create new order
// route - post /api/orders
// access - private
exports.createOrder = async (req, res) => {
  let session = null;
  let useTransaction = false;

  try {
    // Transactions require a replica set, skip in test/standalone environments
    if (process.env.NODE_ENV !== 'test') {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    }
  } catch {
    // Fallback to non-transactional mode
    session = null;
    useTransaction = false;
  }

  try {
    const { items, shippingAddress, paymentMethod, pricing } = req.body;

    //validate and prepare order items with product snapshots
    const orderItems = [];
    for (const item of items) {
      const query = Product.findById(item.product);
      const product = session ? await query.session(session) : await query;

      if (!product) {
        if (useTransaction) await session.abortTransaction();
        return sendError(res, 404, `Product ${item.product} not found`);
      }

      if (product.stock < item.quantity) {
        if (useTransaction) await session.abortTransaction();
        return sendError(res, 400, `Insufficient stock for ${product.name}`);
      }

      orderItems.push(createOrderItem(product, item.quantity));
      await updateProductStock(product._id, item.quantity, true, session);
    }

    // Server-side pricing calculation
    const calculatedSubtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const shipping = Math.max(Number(pricing?.shipping) || 0, 0);
    const discount = Math.max(Number(pricing?.discount) || 0, 0);
    const calculatedTotal = Math.max(calculatedSubtotal + shipping - discount, 0);

    const sanitizedPricing = {
      subtotal: calculatedSubtotal,
      shipping,
      discount,
      total: calculatedTotal,
    };

    //create order
    const orderDoc = {
      user: req.user._id,
      items: orderItems,
      shipping_address: shippingAddress,
      payment_method: paymentMethod,
      pricing: sanitizedPricing,
    };

    let order;
    if (session) {
      const result = await Order.create([orderDoc], { session });
      order = result[0];
    } else {
      order = await Order.create(orderDoc);
    }

    //populate order details
    const populateQuery = Order.findById(order._id)
      .populate('user', 'name email')
      .populate('items.product', 'name images');
    const populatedOrder = session ? await populateQuery.session(session) : await populateQuery;

    if (useTransaction) await session.commitTransaction();

    return sendSuccess(res, {
      data: populatedOrder,
      message: 'Order created successfully',
      status: 201,
    });
  } catch (error) {
    if (useTransaction) await session.abortTransaction();
    return handleValidationError(res, error, 'Error creating order');
  } finally {
    if (session) session.endSession();
  }
};

//desc - get user's orders
//route - get /api/orders
//access - private
exports.getMyOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { user: req.user._id };
    if (status) {
      query.order_status = status;
    }

    const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit);

    const orders = await Order.find(query)
      .populate('items.product', 'name images')
      .sort('-createdAt')
      .limit(limitNum)
      .skip(skip);

    const total = await Order.countDocuments(query);

    return sendSuccess(res, {
      data: orders,
      extra: buildPaginationMeta(orders, total, pageNum, limitNum),
    });
  } catch (error) {
    return sendError(res, 500, 'Error fetching orders', error);
  }
};

//desc - get single order
//route - get /api/orders/:id
//access - private
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images specifications');

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    //check if the user owns the order or is admin
    if (!canAccessOrder(order, req.user._id, req.user.role)) {
      return sendError(res, 403, 'Not authorized to view this order');
    }

    return sendSuccess(res, { data: order });
  } catch (error) {
    return sendError(res, 500, 'Error fetching order', error);
  }
};

//desc - get all orders (admin)
//route - get /api/orders/all
//access - private/admin
exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.order_status = status;
    }

    const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit);

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name')
      .sort('-createdAt')
      .limit(limitNum)
      .skip(skip);

    const total = await Order.countDocuments(query);

    return sendSuccess(res, {
      data: orders,
      extra: buildPaginationMeta(orders, total, pageNum, limitNum),
    });
  } catch (error) {
    return sendError(res, 500, 'Error fetching orders', error);
  }
};

//desc - update order status
//route - patch /api/orders/:id/status
//access - private/admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, trackingNumber, note } = req.body;

    const updateData = {};
    if (orderStatus) {
      updateData.order_status = orderStatus;
    }

    if (trackingNumber) {
      updateData.tracking_number = trackingNumber;
    }

    if (orderStatus === 'delivered') {
      updateData.delivered_at = new Date();
    }

    if (orderStatus === 'cancelled') {
      updateData.cancelled_at = new Date();
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: updateData,
      },
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    return sendSuccess(res, { data: order, message: 'Order status updated successfully' });
  } catch (error) {
    return handleValidationError(res, error, 'Error updating order status');
  }
};

//desc - cancel order
//route - delete /api/orders/:id
//access - private
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    //check authorization
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendError(res, 403, 'Not authorized to cancel this order');
    }

    //can only cancel pending or processing orders
    if (!['pending', 'processing'].includes(order.order_status)) {
      return sendError(res, 400, 'Cannot cancel order in current status');
    }

    //restore product stock
    for (const item of order.items) {
      await updateProductStock(item.product, item.quantity, false);
    }

    //update order status
    order.order_status = 'cancelled';
    order.cancelled_at = new Date();
    await order.save();

    return sendSuccess(res, { data: order, message: 'Order cancelled successfully' });
  } catch (error) {
    return sendError(res, 500, 'Error cancelling order', error);
  }
};
