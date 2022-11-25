const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { UserModel } = require('../models/UserModel');
const { PostModel } = require('../models/PostModel');
const { FollowerModel } = require('../models/FollowerModel');
const { ProfileModel } = require('../models/ProfileModel');
const bcrypt = require('bcryptjs');
const {
  newFollowerNotification,
  removeFollowerNotification,
} = require('../utilsServer/notificationActions');

// GET PROFILE INFO
router.get('/:username', auth, async (req, res) => {
  try {
    const { username } = req.params;

    const user = await UserModel.findOne({ username: username.toLowerCase() });

    if (!user) {
      return res.status(404).send('No User Found');
    }

    const profile = await ProfileModel.findOne({ user: user._id }).populate(
      'user'
    );

    const profileFollowStats = await FollowerModel.findOne({ user: user._id });

    return res.json({
      profile,

      followersLength:
        profileFollowStats.followers.length > 0
          ? profileFollowStats.followers.length
          : 0,

      followingLength:
        profileFollowStats.following.length > 0
          ? profileFollowStats.following.length
          : 0,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server Error');
  }
});

// GET POSTS OF USER
router.get(`/posts/:username`, auth, async (req, res) => {
  try {
    const { username } = req.params;

    const user = await UserModel.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(404).send('No User Found');
    }

    const posts = await PostModel.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate('user')
      .populate('comments.user');

    return res.json(posts);
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server Error');
  }
});

// GET FOLLOWERS OF USER
router.get('/followers/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await FollowerModel.findOne({ user: userId }).populate(
      'followers.user'
    );

    return res.json(user.followers);
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server Error');
  }
});

// GET FOLLOWING OF USER
router.get('/following/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await FollowerModel.findOne({ user: userId }).populate(
      'following.user'
    );

    return res.json(user.following);
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server Error');
  }
});

// FOLLOW A USER
router.post('/follow/:userToFollowId', auth, async (req, res) => {
  try {
    const { userToFollowId } = req.params;
    const { userId } = req; // from authMiddleware

    const user = await FollowerModel.findOne({ user: userId });
    const userToFollow = await FollowerModel.findOne({ user: userToFollowId });

    if (!user || !userToFollow) {
      return res.status(404).send('User not found');
    }

    const isFollowing =
      user.following.length > 0 &&
      user.following.filter(
        (following) => following.user.toString() === userToFollowId
      ).length > 0; // toString is done bc in model, data type of user is ObjectId
    // here we're checking if the logged in user is already following the user in the req.params
    if (isFollowing) {
      return res.status(401).send('User Already Followed');
    }
    // adds usertoFollow's ID to the following model of the logged in user
    await user.following.unshift({ user: userToFollowId });
    await user.save();
    // adds user's (logged in user) id to the follower model of the userToFollow
    await userToFollow.followers.unshift({ user: userId });
    await userToFollow.save();

    await newFollowerNotification(userId, userToFollowId);
    return res.status(200).send('Updated');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server Error');
  }
});

// UNFOLLOW A USER
router.put('/unfollow/:userToUnfollowId', auth, async (req, res) => {
  try {
    const { userId } = req;
    const { userToUnfollowId } = req.params;

    const user = await FollowerModel.findOne({
      user: userId,
    });

    const userToUnfollow = await FollowerModel.findOne({
      user: userToUnfollowId,
    });

    if (!user || !userToUnfollow) {
      return res.status(404).send('User not found');
    }

    const isFollowing =
      user.following.length > 0 &&
      user.following.filter(
        (following) => following.user.toString() === userToUnfollowId
      ).length === 0; // toString is done bc in model, data type of user is ObjectId
    // here we're checking if the logged in user is already following the user in the req.params
    if (isFollowing) {
      return res.status(401).send('User Not Followed before');
    }

    const removeFollowing = await user.following
      .map((following) => following.user.toString())
      .indexOf(userToUnfollowId);

    await user.following.splice(removeFollowing, 1);
    await user.save();

    const removeFollower = await userToUnfollow.followers
      .map((follower) => follower.user.toString())
      .indexOf(userId);

    await userToUnfollow.followers.splice(removeFollower, 1);
    await userToUnfollow.save();

    await removeFollowerNotification(userId, userToUnfollowId);

    return res.status(200).send('Updated');
  } catch (error) {
    console.error(error);
    res.status(500).send('server error');
  }
});

// UPDATE PROFILE
router.post('/update', auth, async (req, res) => {
  try {
    const { userId } = req;

    const { bio, facebook, youtube, twitter, instagram, profilePicUrl } =
      req.body;

    let profileFields = {};
    // here we're referencing the id of the new user to the 'user' property of
    // the ProfileModel (which is of the type user ID)
    profileFields.user = userId;

    profileFields.bio = bio;

    profileFields.social = {};

    if (facebook) profileFields.social.facebook = facebook;

    if (youtube) profileFields.social.youtube = youtube;

    if (instagram) profileFields.social.instagram = instagram;

    if (twitter) profileFields.social.twitter = twitter;

    await ProfileModel.findOneAndUpdate(
      { user: userId },
      { $set: profileFields },
      { new: true }
    ); // we're finding the ProfileModel from userId and then $set is used to assign the new value
    //new means findOneAndUpdate returns us an object with updated values of that ProfileModel.

    if (profilePicUrl) {
      const user = await UserModel.findById(userId);
      user.profilePicUrl = profilePicUrl;
      await user.save();
    }

    return res.status(200).send('Success');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server Error');
  }
});

// UPDATE PASSWORD
router.post('/settings/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (newPassword.length < 6) {
      return res.status(400).send('Password must be atleast 6 characters');
    }
    // in UserModel, select property is set to false. SO password is not returned
    // by default when we select a user from the model. To get the password, we need to chain
    // select and '+password'

    const user = await UserModel.findById(req.userId).select('+password');

    const isPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isPassword) {
      return res.status(401).send('Invalid Password');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).send('Updated successfully');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server Error');
  }
});

// UPDATE MESSAGE POPUP SETTINGS
router.post('/settings/messagePopup', auth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);

    if (user.newMessagePopup) {
      // if it's true, we're setting it to false
      user.newMessagePopup = false;
    } else {
      // otherwise we're setting it to true
      user.newMessagePopup = true;
    }
    await user.save();
    return res.status(200).send('updated');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Server Error');
  }
});

module.exports = router;
