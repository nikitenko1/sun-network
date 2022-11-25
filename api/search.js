const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { UserModel } = require('../models/UserModel');

router.get('/:searchText', auth, async (req, res) => {
  try {
    const { searchText } = req.params;
    const { userId } = req;
    if (searchText.length === 0) return;

    const results = await UserModel.find({
      name: { $regex: searchText, $options: 'i' }, // options: i means that it will be case insensitive
      // checking if any of the result is the same as logged in user
      $nor: [{ _id: userId }],
    });

    return res.status(200).json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Server error`);
  }
});

module.exports = router;
