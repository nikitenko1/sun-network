const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { NotificationModel } = require('../models/NotificationModel');
const { UserModel } = require('../models/UserModel');

// set unreadChat to false once the user clicks on chat header icon
router.post('/', auth, async (req, res) => {
  try {
    const { userId } = req;

    const user = await UserModel.findById(userId);
    if (user.unreadNotification) {
      user.unreadNotification = false;
      await user.save();
    }
    return res.status(200).send('Updated');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server Error');
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { userId } = req;

    const user = await NotificationModel.findOne({ user: userId })
      .populate('notifications.user')
      .populate('notifications.post');
    // populating to get the user details and the post details
    return res.json(user.notifications);
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server Error');
  }
});

module.exports = router;
