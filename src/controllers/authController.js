const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError, sendSuccess, handleValidationError } = require('./responseUtils');

//generate jwt token
const generateToken = (id) => {
  if (!process.env.JWT_TOKEN) {
    throw new Error('JWT_TOKEN environment variable is not set. Cannot generate token.');
  }

  return jwt.sign({ id }, process.env.JWT_TOKEN, {
    expiresIn: '7d',
  });
};

//create auth response with user and token
const createAuthResponse = (user, token) => ({
  user: user.toPublicJSON(),
  token,
});

//desc - register new user
//route - post /api/auth/register
//access - public
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    //check if a user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 400, 'User with this email already exists');
    }

    //create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'user',
    });

    //generate token
    const token = generateToken(user._id);

    return sendSuccess(res, {
      data: createAuthResponse(user, token),
      message: 'User registered successfully',
      status: 201,
    });
  } catch (error) {
    return handleValidationError(res, error, error.message || 'Registration failed');
  }
};

//desc - login user
//route - post /api/auth/login
//access - public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    //find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return sendError(res, 401, 'Invalid credentials');
    }

    //check if the user is active
    if (!user.is_active) {
      return sendError(res, 401, 'Account is deactivated. Please contact support.');
    }

    //check password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return sendError(res, 401, 'Invalid credentials');
    }

    //update last login
    user.last_login = new Date();
    await user.save();

    //generate token
    const token = generateToken(user._id);

    return sendSuccess(res, {
      data: createAuthResponse(user, token),
      message: 'Login successful',
    });
  } catch (error) {
    return sendError(res, 500, 'Login failed', error);
  }
};

//desc - get current user
//route - get /api/auth/me
//access - private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('cart.product');

    return sendSuccess(res, { data: user });
  } catch (error) {
    return sendError(res, 500, 'Error fetching user data', error);
  }
};
