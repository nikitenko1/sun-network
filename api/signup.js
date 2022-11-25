const express = require('express');
const router = express.Router();
const { UserModel } = require('../models/UserModel');
const { ProfileModel } = require('../models/ProfileModel');
const { FollowerModel } = require('../models/FollowerModel');
const { NotificationModel } = require('../models/NotificationModel');
const ChatModel = require('../models/ChatModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validateEmail } = require('../middleware/vaild');
// default profile pic for the user
const userPng =
  'https://res.cloudinary.com/dvpy1nsjp/image/upload/v1635570881/sample.jpg';

const regexUserName = /^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}$/;

// CREATE A USER
router.post('/', async (req, res) => {
  const {
    name,
    email,
    username,
    password,
    bio,
    facebook,
    youtube,
    twitter,
    instagram,
  } = req.body.user;

  if (!validateEmail(email)) return res.status(401).send('Invalid Email');

  if (password.length < 6) {
    return res.status(401).send('Password must be at least 6 characters');
  }
  try {
    let user;
    user = await UserModel.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(401).send('User already registered');
    }
    user = new UserModel({
      name,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password,
      profilePicUrl: req.body.profilePicUrl || userPng,
    });

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    //---PROFILE MODEL---
    let profileFields = {};

    // here we're referencing the id of the new user to the 'user' property
    // of the ProfileModel (which is of the type user ID)
    profileFields.user = user._id; // ProfileSchema --> user: { type: Schema.Types.ObjectId, ref: 'User' },

    profileFields.bio = bio;

    profileFields.social = {};

    if (facebook) profileFields.social.facebook = facebook;
    if (youtube) profileFields.social.youtube = youtube;
    if (instagram) profileFields.social.instagram = instagram;
    if (twitter) profileFields.social.twitter = twitter;
    // initialising models...
    await new ProfileModel(profileFields).save();
    //---FOLLOWER MODEL---
    await new FollowerModel({
      user: user._id,
      followers: [],
      following: [],
    }).save();
    //---NOTIFICATION MODEL---
    await new NotificationModel({ user: user._id, notifications: [] }).save();
    await new ChatModel({ user: user._id, chats: [] }).save();

    // JWT
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

router.get('/:username', async (req, res) => {
  const { username } = req.params;
  try {
    if (username.length < 1) return res.status(401).send('Invalid');
    // regex test for username
    if (!regexUserName.test(username)) return res.status(401).send('Invalid');
    // on the backend all the usernames are converted to lower case before storing
    const user = await UserModel.findOne({ username: username.toLowerCase() });

    if (user) return res.status(401).send('Username already taken');

    return res.status(200).send('Available');
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Server error`);
  }
});

module.exports = router;
