const server = require('../controller.js')

let {app, express, mailer, controller} = server

const router = express.Router()


router.get('/chat', (req, res) => {

  controller.assignUserChatToken(req.session.userdata.username)
    .then((result) => {
      app.data.title = 'Chat'
      app.data.chatToken = result
      app.data.huddleId = 1000
      res.render('maintemplate', {contentpartial: 'chat', data: app.data, user: req.session.userdata})
    })
    .catch((err) => {
      req.session.error = 'Could not assign user chat token'
      req.session.save((err) => { if (err) { this.logEntry("ERR: " + err) } else { return res.redirect('/') }})
    })



})


module.exports = router
