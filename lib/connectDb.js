const mongoose = require('mongoose');

const connectDB = () => {
  if (mongoose.connections[0].readyState) {
    console.log('Already connected.');
    return;
  }
  mongoose.connect(
    `${process.env.MONGO_URL}`,
    {
      autoIndex: true,
    },
    (err) => {
      if (err) throw err;
      console.log('Successfully connected to MongoDB Atlas');
    }
  );
};

module.exports = connectDB;
