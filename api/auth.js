const express = require('express');
const router = express.Router();
const { UserModel } = require('../models/UserModel');
const { FollowerModel } = require('../models/FollowerModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validateEmail } = require('../middleware/vaild');
const auth = require('../middleware/auth');

// LOGIN A USER
router.post('/', async (req, res) => {
  const { email, password } = req.body.user;

  if (!validateEmail(email)) return res.status(401).send('Invalid Email');

  if (password.length < 6) {
    return res.status(401).send('Password must be at least 6 characters');
  }

  try {
    // In UserModel, in password, we set select to false.
    // The password field will not be included when we search for a user.
    const user = await UserModel.findOne({ email: email.toLowerCase() }).select(
      '+password'
    );

    if (!user) {
      return res.status(401).send('Invalid Credentials');
    }
    // if user exists with the given email, then compare passwords
    const isPassword = await bcrypt.compare(password, user.password);
    if (!isPassword) {
      return res.status(401).send('Invalid Credentials');
    }
    // if isPassword is true i.e. passwords match, then we'll send back the jwt token
    const payload = { userId: user._id };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '2d' },
      (err, token) => {
        if (err) throw err;
        res.status(200).json(token);
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Server error`);
  }
});

// GET USER BY ID
router.get('/', auth, async (req, res) => {
  const { userId } = req;

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    const userFollowStats = await FollowerModel.findOne({ user: userId });

    return res.status(200).json({ user, userFollowStats });
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Server error`);
  }
});

module.exports = router;
