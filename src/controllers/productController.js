const Product = require('../models/Product');
const {
  sendError,
  sendSuccess,
  getPagination,
  buildPaginationMeta,
  handleValidationError,
} = require('./responseUtils');

//desc - get all products with filtering, sorting, pagination
//route - get /api/products
//access - public
exports.getProducts = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, sort = '-createdAt', page = 1, limit = 12 } = req.query;

    // Validate sort field
    const allowedSortFields = ['createdAt', 'price', 'name', 'rating.average', 'sold_count'];
    const sortField = sort.replace(/^-/, '');
    const sanitizedSort = allowedSortFields.includes(sortField) ? sort : '-createdAt';

    // build query
    const query = {};
    const includeInactive = req.user?.role === 'admin' && String(req.query.includeInactive).toLowerCase() === 'true';

    if (!includeInactive) {
      query.is_active = true;
    }

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.$text = { $search: search };
    }

    //execute a query with pagination
    const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit);
    const products = await Product.find(query).sort(sanitizedSort).limit(limitNum).skip(skip);

    const total = await Product.countDocuments(query);

    return sendSuccess(res, {
      data: products,
      extra: buildPaginationMeta(products, total, pageNum, limitNum),
    });
  } catch (error) {
    return sendError(res, 500, 'Error fetching products', error);
  }
};

//desc - get a single product by id
//route - get /api/products/:id
//access - public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    return sendSuccess(res, { data: product });
  } catch (error) {
    return sendError(res, 500, 'Error fetching product', error);
  }
};

//desc - create new product
//route - post /api/products
//access - private/admin
exports.createProduct = async (req, res) => {
  try {
    // Whitelist allowed fields for security
    const allowedFields = [
      'name',
      'description',
      'material',
      'color',
      'compatible_models',
      'category',
      'price',
      'stock',
      'images',
      'brand',
      'tags',
      'is_active',
    ];
    const sanitizedBody = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        sanitizedBody[field] = req.body[field];
      }
    }

    const product = await Product.create(sanitizedBody);

    return sendSuccess(res, {
      data: product,
      message: 'Product created successfully',
      status: 201,
    });
  } catch (error) {
    return handleValidationError(res, error, 'Error creating product');
  }
};

//desc - update product with advanced operators
//route - put /api/products/:id
//access - private/admin
exports.updateProduct = async (req, res) => {
  try {
    // Whitelist allowed update fields
    const allowedUpdates = [
      'name',
      'description',
      'material',
      'color',
      'compatible_models',
      'category',
      'price',
      'stock',
      'images',
      'brand',
      'tags',
      'is_active',
    ];
    const sanitizedUpdate = {};
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        sanitizedUpdate[field] = req.body[field];
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: sanitizedUpdate },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    return sendSuccess(res, { data: product, message: 'Product updated successfully' });
  } catch (error) {
    return handleValidationError(res, error, 'Error updating product');
  }
};

//desc - update product stock (increment/decrement)
//route - patch /api/products/:id/stock
//access - private/admin
exports.updateStock = async (req, res) => {
  try {
    const { quantity } = req.body;

    if (!quantity || quantity === 0) {
      return sendError(res, 400, 'Quantity is required and cannot be zero');
    }

    //use $inc to increment or decrement stock
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { stock: quantity } },
      { new: true, runValidators: true }
    );

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    return sendSuccess(res, { data: product, message: 'Stock updated successfully' });
  } catch (error) {
    return sendError(res, 400, 'Error updating stock', error);
  }
};

//desc - add tag to product
//route - patch /api/products/:id/tags
//access - private/admin
exports.addTag = async (req, res) => {
  try {
    const { tag } = req.body;

    if (!tag) {
      return sendError(res, 400, 'Tag is required');
    }

    //use $push to add a tag
    const product = await Product.findByIdAndUpdate(req.params.id, { $push: { tags: tag } }, { new: true });

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    return sendSuccess(res, { data: product, message: 'Tag added successfully' });
  } catch (error) {
    return sendError(res, 400, 'Error adding tag', error);
  }
};

//desc - remove tag from product
//route - delete /api/products/:id/tags/:tag
//access - private/admin
exports.removeTag = async (req, res) => {
  try {
    const { tag } = req.params;

    //use $pull to remove tag
    const product = await Product.findByIdAndUpdate(req.params.id, { $pull: { tags: tag } }, { new: true });

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    return sendSuccess(res, { data: product, message: 'Tag removed successfully' });
  } catch (error) {
    return sendError(res, 400, 'Error removing tag', error);
  }
};

//desc - delete product
//route - delete /api/products/:id
//access - private/admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    return sendSuccess(res, { message: 'Product deleted successfully' });
  } catch (error) {
    return sendError(res, 500, 'Error deleting product', error);
  }
};
