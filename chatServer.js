const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io")
const io = new Server(server, {
  cors: {
    origin: "http://10.10.20.51:8080",
  }});


let {controller} = server


const dburi = process.env.MONGODB_URI

const mongoose = require('mongoose')
const User = require('./bxs/models/user')
const ChatMessage = require('./bxs/models/chatMessage')
mongoose.connect(dburi, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((response) => { })
  .catch((err) => { this.logError(err);})

// app.get('/', (req, res) => {
//   res.sendFile(__dirname + '/index.html');
// });



function getHuddleChatHistory(huddleId) {

  return new Promise ((resolve, reject) => {
    ChatMessage.find({'id': {$eq: huddleId}})
      .then((result) => {
        resolve(result)
      })
      .catch((err) => {
        controller.logError('Could not get huddle history: ' + err)
        reject(err)

      })
    })
}

io.on('connection', (socket) => {

  socket.on('reg', (msg) => {
    User.findOne({chatToken: msg.chatToken})
      .then((foundUser) => {
        socket.userdata = foundUser
        socket.huddleId = msg.huddleId
        console.log(socket.userdata.username + ' connected');

        getHuddleChatHistory(socket.huddleId)
          .then((messages) => {
            messages.forEach((msg, i) => {
              let tmpMsg = {u: msg.fromUsername, dt: msg.sentDate, text: msg.msgText}
              socket.emit('cm', JSON.stringify(tmpMsg))
            });

          })

      })
      .catch((err) => {
        console.log('ERROR! ' + err);
      })


  })

  socket.on('cm', (msg) => {

    if(socket.userdata !== undefined) {
      let newMsg = new ChatMessage({sentDate: new Date(), fromUsername: socket.userdata.username, huddleId: socket.huddleId, msgText: msg.text})

      newMsg.save()

      for (let [id, existingSocket] of io.of("/").sockets) {

        msg.u = socket.userdata.username
        msg.sentDate = new Date()

        if (existingSocket.huddleId == socket.huddleId) {
          existingSocket.emit('cm', JSON.stringify(msg))
        }
      }
    }

  })


  socket.on('disconnect', () => {
    console.log('user disconnected');
  })
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
