const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// Helper to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 1. User Registration
exports.register = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    // Input Validations
    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide name, email, and password.'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format. Please provide a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if email already exists
    const emailCheckResult = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (emailCheckResult.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'A user with this email address already exists.'
      });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Save user to database
    const insertResult = await db.query(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES ($1, $2, $3, 'user') 
       RETURNING id, name, email, role, created_at;`,
      [name.trim(), email.toLowerCase().trim(), passwordHash]
    );

    const newUser = insertResult.rows[0];

    // Log action to Audit Logs
    await db.query(
      `INSERT INTO audit_logs (user_id, action, details) 
       VALUES ($1, 'USER_REGISTER', $2);`,
      [newUser.id, `User registered account under email ${newUser.email}`]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Account created successfully.',
      data: {
        user: newUser
      }
    });

  } catch (error) {
    next(error);
  }
};

// 2. User Login
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Input Validations
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both email and password.'
      });
    }

    // Find user by email
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials. Please verify your email and password.'
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials. Please verify your email and password.'
      });
    }

    // Generate JSON Web Token (JWT)
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'super_secret_key_change_me_in_production_987654321',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Log action to Audit Logs
    await db.query(
      `INSERT INTO audit_logs (user_id, action, details) 
       VALUES ($1, 'USER_LOGIN', $2);`,
      [user.id, `User logged into system`]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Logged in successfully.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// 3. Fetch current logged-in user profile
exports.getMe = async (req, res, next) => {
  try {
    const userResult = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found.'
      });
    }

    const user = userResult.rows[0];

    return res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });

  } catch (error) {
    next(error);
  }
};
