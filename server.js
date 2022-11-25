require('dotenv').config({ path: './.env.local' });
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const next = require('next');
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const connectDb = require('./lib/connectDb');
connectDb();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const {
  addUser,
  removeUser,
  findConnectedUser,
} = require('./utilsServer/roomActions');
const {
  loadMessages,
  sendMsg,
  setMsgToUnread,
  deleteMsg,
} = require('./utilsServer/messageActions');
const { likeOrUnlikePost } = require('./utilsServer/likeOrUnlikePost');

io.on('connection', (socket) => {
  // socket.on(eventName, listener)
  socket.on('join', async ({ userId }) => {
    const users = await addUser(userId, socket.id);
    // console.log(users);
    setInterval(() => {
      socket.emit('connectedUsers', {
        users: users.filter((user) => user.userId !== userId),
      });
    }, 10000);
  });
  // socket.on(eventName, listener)
  socket.on('likePost', async ({ postId, userId, like }) => {
    const { success, name, profilePicUrl, username, postByUserId } =
      await likeOrUnlikePost(postId, userId, like);

    if (success) {
      socket.emit('postLiked');

      if (postByUserId !== userId) {
        // postByUserId: post.user.toString(),
        const receiverSocket = findConnectedUser(postByUserId);
        if (receiverSocket && like) {
          // WHEN YOU WANT TO SEND DATA TO ONE PARTICULAR CLIENT
          io.to(receiverSocket.socketId).emit('newNotificationReceived', {
            name,
            profilePicUrl,
            username,
            postId,
          });
        }
      }
    }
  });
  // socket.on(eventName, listener)
  socket.on('deleteMsg', async ({ userId, messagesWith, messageId }) => {
    const { success } = await deleteMsg(userId, messagesWith, messageId);
    // basic emit
    if (success) socket.emit('msgDeleted');
  });

  // socket.on(eventName, listener)
  socket.on('sendNewMsg', async ({ userId, msgSendToUserId, msg }) => {
    const { newMsg, error } = await sendMsg(userId, msgSendToUserId, msg);

    const receiverSocket = findConnectedUser(msgSendToUserId);

    if (receiverSocket) {
      // WHEN YOU WANT TO SEND MESSAGE TO A PARTICULAR SOCKET
      io.to(receiverSocket.socketId).emit('newMsgReceived', { newMsg });
    }
    //
    else {
      await setMsgToUnread(msgSendToUserId);
    }
    // basic emit
    !error && socket.emit('msgSent', { newMsg });
  });

  // socket.on(eventName, listener)
  socket.on(
    'sendMsgFromNotification',
    async ({ userId, msgSendToUserId, msg }) => {
      const { newMsg, error } = await sendMsg(userId, msgSendToUserId, msg);

      const receiverSocket = findConnectedUser(msgSendToUserId);

      if (receiverSocket) {
        // WHEN YOU WANT TO SEND MESSAGE TO A PARTICULAR SOCKET
        io.to(receiverSocket.socketId).emit('newMsgReceived', { newMsg });
      }
      //
      else {
        await setMsgToUnread(msgSendToUserId);
      }
      // basic emit
      !error && socket.emit('msgSentFromNotification');
    }
  );

  // socket.on(eventName, listener)
  socket.on('loadMessages', async ({ userId, messagesWith }) => {
    const { chat, error } = await loadMessages(userId, messagesWith);
    // basic emit
    !error
      ? socket.emit('messagesLoaded', { chat })
      : socket.emit('noChatFound');
  });

  // socket.on(eventName, listener)
  socket.on('disconnect', () => removeUser(socket.id));
});

nextApp.prepare().then(() => {
  app.use('/api/signup', require('./api/signup'));
  app.use('/api/auth', require('./api/auth'));
  app.use('/api/posts', require('./api/posts'));
  app.use('/api/search', require('./api/search'));
  app.use('/api/profile', require('./api/profile'));
  app.use('/api/notifications', require('./api/notifications'));
  app.use('/api/chats', require('./api/chats'));
  // app.use('/api/reset', require('./api/reset'));

  app.all('*', (req, res) => handle(req, res));

  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log('Express server running');
  });
});
