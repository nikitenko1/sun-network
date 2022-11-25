const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FollowerSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },

  followers: [
    {
      user: { type: Schema.Types.ObjectId, ref: 'User' },
    },
  ],
  following: [
    {
      user: { type: Schema.Types.ObjectId, ref: 'User' },
    },
  ],
});

const FollowerModel = mongoose.model('Follower', FollowerSchema);
module.exports = { FollowerModel };
