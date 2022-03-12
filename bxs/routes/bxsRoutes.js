const server = require('../controller.js')

let {app, express, mailer, controller} = server

const router = express.Router()


router.get('/forgotpass', (req, res) => {
  app.data.title = 'Forgot Password'
  res.render('maintemplate', {contentpartial: 'builtin/forgotpass', data: app.data, user: controller.userdata})

})

router.post('/forgotpass', (req, res) => {

  controller.findUserByUsernameOrEmail(req.body.identifier)
    .then ((foundUser) => {
      if(foundUser) {

        let newpass = (Math.random() + 1).toString(36).substring(2)
        controller.updatePasswordByUsername(foundUser.username, newpass)
          .then ((result) => {
              mailer.sendEmail(foundUser.email, 'So You Forgot Your Password', `Hi, ${foundUser.username}, I understand you've forgotten your password.  No worries, happens to the best of us.  Here's your new password: ${newpass}.  You'll be prompted to change it upon logging in.`)
          })
          .catch((err) => {
            controller.logEntry(err);
          })

      }
  })

  req.session.save((err) => { if (err) { this.logEntry("ERR: " + err) } else { return res.redirect('/bxs/forgotconfirm') }})
})

router.get('/forgotconfirm', (req, res) => {
  app.data.title = 'Forgot Password'
  res.render('maintemplate', {contentpartial: 'builtin/forgotconfirm', data: app.data, user: controller.userdata})
})


router.get('/login', (req, res) => {
  if (req.session.userid) {
    res.redirect('/')
  } else {
    app.data.title = 'Login'
    res.render('maintemplate', {contentpartial: 'builtin/login.ejs', data: app.data, user: controller.userdata})
  }
})

router.post('/login', (req, res) => {

  if (controller.userdata.isLoggedIn) {
    res.redirect('/')
  } else {

    controller.checkLogin(req.body.username, req.body.password)
      .then((foundId) => {
        if(foundId) {
          req.session.userid = foundId
          res.redirect('/')
        } else {
          req.session.loginusername = req.body.username
          req.session.error = 'Username or password is incorrect'
          req.session.save((err) => { if (err) { this.logEntry("ERR: " + err) } else { return res.redirect('/bxs/login') }})
        }
      })

  }

})

router.get('/logout', (req, res) => {
  delete(req.session.userid)
  req.session.save((err) => { if (err) { this.logEntry("ERR: " + err) } else { return res.redirect('/') }})
})







router.get('/signup', (req, res) => {
  app.data.title = 'Signup'
  res.render('maintemplate', {contentpartial: 'builtin/signup.ejs', data: app.data, user: controller.userdata})
})

router.post('/signup', (req, res) => {

  controller.createNewUser(req.body)
    .then((token) => {
      mailer.sendEmail(req.body.email, 'Email Verification', `Hi ${req.body.username}, please go to this URL to verify your email address: http://localhost:8080/bxs/confirmemail/?tkn=${token}`)
      req.session.alert = 'You have been sent an email, please click the link in the email to verify your account'
      req.session.alertType = 'notify'
      req.session.submittedInputs = req.body
      req.session.save((err) => { if (err) { this.logEntry("ERR: " + err) } else { return res.redirect('/') }})
    })
    .catch((err) => {
      if(err == 'duplicateEmail') {
        req.session.error = 'That email address is already registered'
      } else if(err == 'duplicateUsername') {
        req.session.error = 'That username is already registered'
      } else if(err == 'invalidEmail') {
        req.session.error = 'That is an invalid email address'
      } else if(err == 'passwordTooShort') {
        req.session.error = 'Your password is too short'
      } else {
        req.session.error = 'Could not save user'
      }

      req.session.submittedInputs = req.body
      req.session.save((err) => { if (err) { this.logEntry("ERR: " + err) } else { return res.redirect('/bxs/signup') }})

    })
})

router.get('/confirmemail', (req, res) => {
  controller.verifyUserByToken(req.query.tkn)
    .then ((result) => {
      req.session.alert = 'You have been verified, please login'
      req.session.alertType = 'notify'
      req.session.save((err) => { if (err) { this.logEntry("ERR: " + err) } else { return res.redirect('/bxs/login') }})
    })
    .catch((err) => {
      req.session.alert = 'Could not find that token'
      req.session.alertType = 'error'
      controller.logEntry(err);
      req.session.save((err) => { if (err) { this.logEntry("ERR: " + err) } else { return res.redirect('/') }})
    })


})






router.get('/preferences', (req, res) => {
  app.data.title = 'User Preferences'
  res.render('maintemplate', {contentpartial: 'builtin/preferences.ejs', data: app.data, user: controller.userdata})
})

router.get('/changepass', (req, res) => {
  app.data.title = 'Change Password'
  res.render('maintemplate', {contentpartial: 'builtin/changepass.ejs', data: app.data, user: controller.userdata})
})

router.post('/changepass', (req, res) => {
  controller.checkLogin(controller.userdata.username, req.body.oldpassword)
    .then ((loginSuccess) => {

      //  If the password is incorrect, throw back to the password change endpoint
      if(!loginSuccess) {
        req.session.error = 'Current password is incorrect'
        req.session.save((err) => { if (err) { this.logEntry("ERR: " + err) } else { return res.redirect('/bxs/changepass') }})

      // Otherwise, update the password
      } else {

        controller.updatePasswordByUsername(controller.userdata.username, req.body.password)
          .then((changeSuccess) => {

            if(changeSuccess === true) {
              req.session.alert = 'Your password has been updated'
              req.session.alertType = 'notify'
              req.session.save((err) => { if (err) { this.logEntry("ERR: " + err) } else { return res.redirect('/') }})

            } else {

              req.session.alert = `Your password could not be updated`
              req.session.alertType = 'error'
              res.redirect('/bxs/changepass')
            }


          })
      }
    })
    .catch((err) => {
      if(err == 'passwordTooShort') {
        req.session.error = 'Password too short'
      } else {
        req.session.error = 'Unknown error'
      }
      req.session.save((err) => { if (err) { this.logEntry("ERR: " + err) } else { return res.redirect('/bxs/changepass') }})
    })

})







router.get('/sessiontest', (req, res) => {
  controller.logEntry(controller)
  if (!(req.session.viewCount)) {
    controller.logEntry('initializing viewcount')
    req.session.viewCount = 0
  }
  req.session.viewCount = req.session.viewCount + 1
  res.send('a' + req.session.viewCount + '<p>' + (controller.userdata ? controller.userdata._id : ''))

})

module.exports = router
