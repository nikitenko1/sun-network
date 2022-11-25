const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PostModel } = require('../models/PostModel');
const { UserModel } = require('../models/UserModel');
const { FollowerModel } = require('../models/FollowerModel');
const {
  newLikeNotification,
  removeLikeNotification,
  newCommentNotification,
  removeCommentNotification,
} = require('../utilsServer/notificationActions');
const uuid = require('uuid').v4;

// CREATE A POST
router.post('/', auth, async (req, res) => {
  const { text, location, picUrl } = req.body;

  if (text.length < 1)
    return res.status(401).send('Text must be at least 1 character');

  try {
    const newPost = {
      user: req.userId,
      text,
    };
    if (location) newPost.location = location;
    if (picUrl) newPost.picUrl = picUrl;

    const post = await new PostModel(newPost).save();

    const postCreated = await PostModel.findById(post._id).populate('user');

    return res.json(postCreated);
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Server error`);
  }
});

// GET ALL POSTS
router.get('/', auth, async (req, res) => {
  const { pageNumber } = req.query; // from params in axios call in fetchDataOnScroll in index.js

  try {
    const number = Number(pageNumber); // to convert pageNumber to number from string
    const size = 4; // custom number of posts to be sent on each page
    const { userId } = req;

    const loggedUser = await FollowerModel.findOne({ user: userId }).select(
      '-followers' //-followers as we only need the following from the followerModel
    );

    let posts = [];

    if (number === 1) {
      if (loggedUser.following.length > 0) {
        posts = await PostModel.find({
          user: {
            $in: [
              userId,
              ...loggedUser.following.map((following) => following.user),
            ],
          },
        })
          .limit(size) // limit is used to limit the posts fetched to size(i.e. we defined as 4 above)
          .sort({ createdAt: -1 }) //-1 is for descending order, i.e. newest first
          .populate('user')
          .populate('comments.user');
        // $in operator is a MongoDB operator, and it needs an array to compare the values,
        // and $in needs atleast two values to work this means find all posts in postModel
        // with user = userId  since map returns an array, we spread the values using the spread operator
        // we can say .populate('user') and that'll fill the user field in the response with all the details
        // of Jane from UserModel
        // without populate, we'd get user: <<userIdFromUserModel>>. With populate, we get the whole user
      }
      // If user is not following anyone
      else {
        posts = await PostModel.find({ user: userId })
          .limit(size)
          .sort({ createdAt: -1 })
          .populate('user')
          .populate('comments.user');
      }
    }
    // to skip over the posts that were sent earlier
    else {
      // say pageNum is 3. so, we'll have to skip 4 * (3-1) or 4*2 posts,
      // bc 8 posts have already been fetched for 1st and 2nd pages in total
      const skips = size * (number - 1);

      if (loggedUser.following.length > 0) {
        posts = await PostModel.find({
          user: {
            $in: [
              userId,
              ...loggedUser.following.map((following) => following.user),
            ],
          },
        })
          .skip(skips)
          .limit(size)
          .sort({ createdAt: -1 })
          .populate('user')
          .populate('comments.user');
      }
      // If user is not following anyone
      else {
        posts = await PostModel.find({ user: userId })
          .skip(skips)
          .limit(size)
          .sort({ createdAt: -1 })
          .populate('user')
          .populate('comments.user');
      }
    }

    return res.json(posts);
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Server error`);
  }
});

// GET POST BY ID
router.get('/:postId', auth, async (req, res) => {
  try {
    const post = await PostModel.findById(req.params.postId)
      .populate('user')
      .populate('comments.user');

    if (!post) {
      return res.status(404).send('Post not found');
    }

    return res.json(post);
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Server error`);
  }
});

// DELETE POST
router.delete('/:postId', auth, async (req, res) => {
  try {
    const { userId } = req;

    const { postId } = req.params;
    const post = await PostModel.findById(postId);

    if (!post) {
      return res.status(404).send('post not found');
    }

    const user = await UserModel.findById(userId);
    // if some user other than logged in user tries to delete a post
    if (post.user.toString() !== userId) {
      if (user.role === 'root') {
        await post.remove();
        return res.status(200).send('Post deleted Successfully');
      } else {
        return res.status(401).send('Unauthorized');
      }
    }

    await post.remove();
    return res.status(200).send('Post deleted Successfully');
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Server error`);
  }
});

// LIKE A POST by ID
router.post('/like/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req; // from authMiddleware

    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).send('No Post found');
    }

    const isLiked =
      // filter returns a new array with all the elements that pass the test
      post.likes.filter((like) => like.user.toString() === userId).length > 0;

    if (isLiked) {
      return res.status(401).send('Post already liked');
    }
    // add new items to the beginning of the original array and returns the new length
    // we used an object inside of unshift bc in PostModel we have defined an object inside of likesArray
    await post.likes.unshift({ user: userId });
    await post.save();
    // check if post that's being liked was made by logged in user
    // otherwise SEND NOTIFICATION
    if (post.user.toString() !== userId) {
      await newLikeNotification(userId, postId, post.user.toString());
    }

    return res.status(200).send('Post liked');
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Server error`);
  }
});

// UNLIKE A POST
router.put('/unlike/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req;

    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).send('No Post found');
    }

    const isLiked =
      post.likes.filter((like) => like.user.toString() === userId).length === 0;

    if (isLiked) {
      return res.status(401).send('Post not liked before');
    }

    const index = post.likes
      .map((like) => like.user.toString())
      .indexOf(userId);

    await post.likes.splice(index, 1); // delete that element

    await post.save();
    // check if post that's being disliked was made by logged in user and it's being disliked
    // by logged in user
    // otherwise SEND NOTIFICATION
    if (post.user.toString() !== userId) {
      await removeLikeNotification(userId, postId, post.user.toString());
    }

    return res.status(200).send('Post Unliked');
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Server error`);
  }
});

// GET ALL LIKES OF A POST
router.get('/like/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    // populate will replace the userID with the user Object(which has all the user details)
    const post = await PostModel.findById(postId).populate('likes.user');
    if (!post) {
      return res.status(404).send('No Post found');
    }

    return res.status(200).json(post.likes);
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Server error`);
  }
});

// CREATE A COMMENT
router.post('/comment/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;

    const { userId } = req;
    const { text } = req.body;

    if (text.length < 1)
      return res.status(401).send('Comment should be at least 1 character');

    const post = await PostModel.findById(postId);

    if (!post) return res.status(404).send('Post not found');

    const newComment = {
      _id: uuid(),
      text,
      user: userId,
      date: Date.now(),
    };

    await post.comments.unshift(newComment);
    await post.save();

    if (post.user.toString() !== userId) {
      await newCommentNotification(
        postId,
        newComment._id,
        userId,
        post.user.toString(),
        text
      );
    }

    return res.status(200).json(newComment._id);
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Server error`);
  }
});

// DELETE A COMMENT
router.delete('/:postId/:commentId', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { userId } = req;

    const post = await PostModel.findById(postId);
    if (!post) return res.status(404).send('Post not found');

    const comment = post.comments.find((comment) => comment._id === commentId);
    if (!comment) {
      return res.status(404).send('No Comment found');
    }

    const user = await UserModel.findById(userId);

    const deleteComment = async () => {
      const indexOf = post.comments
        .map((comment) => comment._id)
        .indexOf(commentId);

      await post.comments.splice(indexOf, 1);

      await post.save();

      if (post.user.toString() !== userId) {
        await removeCommentNotification(
          postId,
          commentId,
          userId,
          post.user.toString()
        );
      }
      return res.status(200).send('Deleted Successfully');
    };
    // if comment is made by someone other than the logged in user,
    // i.e. this user doesn't have permission to delete this comment
    if (comment.user.toString() !== userId) {
      if (user.role === 'root') {
        await deleteComment();
      } else {
        return res.status(401).send('Unauthorized');
      }
    }
    await deleteComment();
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Server error`);
  }
});

module.exports = router;
