const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const sendgrid = require('@sendgrid/mail')

const MongoStore = require('connect-mongo')
const User = require('./models/user.js')
const app = express()

const dburi = process.env.MONGODB_URI
const rootDir = '/home/keith/huddle.place'

sendgrid.setApiKey(process.env.SENDGRID_API_KEY)
const mailFrom = process.env.SENDGRID_FROM_ADDRESS

mongoose.connect(dburi, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((response) => { })
  .catch((err) => { this.logError(err);})

app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(session({
  secret: process.env.CRYPTSECRET,
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: dburi,
    mongoOptions: { useNewUrlParser: true, useUnifiedTopology: true },
    ttl: 14 * 24 * 60 * 60,
    autoRemove: 'native'
  })
}))



class SiteController {

  constructor() {
    this.userdata = {isLoggedIn: false}
  }

  loadUserFromSession(userid) {
    return new Promise((resolve, reject) => {
      if (userid) {

        this.getUserById(userid)
          .then((foundUser) => {
            if(foundUser) {
              this.userdata = foundUser
              this.userdata['isLoggedIn'] = true
              resolve(true)
            } else {
              let logStr = 'User ID not valid: ' + userid
              this.logWarning(logStr)
              reject(logStr)
            }
          })
          .catch((err) => {
            let logStr = `getUserById failed with userid = ${userid}`
            this.logError(logStr + `| ${err}`)
            reject(logStr)
          })


      } else {
        resolve(false)
      }

    })

  }

  getUserByUsername(username) {

    return new Promise((resolve, reject) => {
      User.findOne({'username': username})
        .then ((foundUser) => {
          if (foundUser) {
            this.getUserById(foundUser._id)
              .then((foundUser) => {
                resolve(foundUser)
              })
              .catch((err) => {
                let logStr = `getUserById failed with userid = ${userid}`
                this.logError(logStr + `| ${err}`)
                reject(logStr)
              })

          } else {
            resolve(false)
          }
        })
        .catch((err) => {
          let logStr = `Couldn't find username ${username}`
          this.logWarning(logStr + `| ${err}`)
          reject(logStr)
        })
    })
  }

  getUserByEmail(email) {

    return new Promise((resolve, reject) => {
      User.findOne({'email': email})
        .then ((foundUser) => {
          if (foundUser) {
            this.getUserById(foundUser._id)
              .then((foundUser) => {
                resolve(foundUser)
              })
              .catch((err) => {
                let logStr = `getUserById failed with id = ${foundUser._id}`
                this.logError(logStr + `| ${err}`)
                reject(logStr)
              })
          } else {
            resolve(false)
          }
        })
        .catch((err) => {
          let logStr = `User.findOne failed with email = ${userid}`
          this.logWarning(logStr + `| ${err}`)
          reject(logStr)
        })
    })
  }

  getUserById(id = 0) {

    return new Promise((resolve, reject) => {

      if (id == 0 || id == '') { resolve(false) }

      User.findById(id)
        .then ((foundUser) => {
          if(foundUser) {
            resolve(foundUser)
          } else {
            let logStr = `User.findById failed with id = ${id}`
            this.logWarning(logStr)
            resolve(false)
          }
        })
        .catch((err) => {
          let logStr = `User.findById failed with id = ${id}`
          this.logError(logStr + `| ${err}`)
          reject(logStr)
        })
      })
  }

  findUserByUsernameOrEmail(identifier) {
    return new Promise((resolve, reject) => {
      this.getUserByUsername(identifier)
        .then ((foundUser) => {
          if(foundUser) {
            resolve(foundUser)
          } else {
            this.getUserByEmail(identifier)
              .then ((foundUser) => {
                if(foundUser) {
                  resolve(foundUser)
                } else {
                  resolve(false)
                }
              })
          }
        })
        .catch((err) => {
          let logStr = `findUserByUsernameOrEmail failed with identifier = ${identifier}`
          this.logError(logStr + `| ${err}`)
          reject(logStr)
        })
    })
  }

  getUsernameById(id = 0) {

    return new Promise((resolve, reject) => {

      if (id == 0 || id == '') { resolve(false) }

      User.findById(id)
        .then ((foundUser) => {
          if(foundUser) {
            resolve(foundUser.username)
          } else {
            let logStr = `User.findById failed with id = ${id}`
            this.logWarning(logStr)
            resolve(false)
          }
        })
        .catch((err) => {
          let logStr = `User.findById failed with id = ${id}`
          this.logError(logStr + `| ${err}`)
          reject(logStr)
        })
      })
  }

  checkLogin(username, password) {

    return new Promise((resolve, reject) => {
      User.findOne({'username': username})
        .then((foundUser) => {
          if(foundUser) {
            bcrypt.compare(password, foundUser.password, (err, success) => {
              if(success) {
                resolve(foundUser._id)
              } else {
                resolve(false)
              }
            })

          } else {
            resolve(false)
          }

        })
        .catch((err) => {
          let logStr = `User.findOne failed with username = ${username}`
          this.logError(logStr + `| ${err}`)
          reject(logStr)
          })

      })
  }


  updatePasswordByUsername(username, password) {

    return new Promise((resolve, reject) => {

      let passwordCheck = this.validatePassword(password)
      if (passwordCheck !== true) {
        reject(passwordCheck)
      } else {

        bcrypt.hash(password, 3, (err, encryptedPass) => {

          User.findOne({'username': username})
            .then((user, err) => {
              if(user) {
                user.forcePasswordReset = false
                user.password = encryptedPass
                user.save()
                resolve(true)
              } else {
                let logStr = `Tried to update password with bad username = ${username}`
                this.logWarning(logStr)
                reject(logStr)
              }
            })
            .catch((err) => {
              let logStr = `User.findOne failed with username = ${username}`
              this.logError(logStr + `| ${err}`)
              reject(logStr)
              })

        })
      }
    })
  }


  verifyUserByToken(token) {

    return new Promise((resolve, reject) => {
      User.findOne({'verificationToken': token})
        .then((foundUser) => {
          if(foundUser) {
            foundUser.verifiedDate = new Date()
            foundUser.verificationToken = null
            foundUser.save()
            return foundUser
          } else {
            let logStr = `Tried to verify with bad token = ${token}`
            this.logError(logStr)
            reject(logStr)
          }

        })
        .then((foundUser) => {
          if(foundUser) {
            this.updatePasswordByUsername(foundUser.username, foundUser.password)
              .then(() => {
                resolve()
              })
              .catch(() => {
                let logStr = `Failed to update password with bad username = ${foundUser.username}`
                this.logError(logStr + `| ${err}`)
                reject(logStr)
              })
          } else {
            reject(`Could not find user`)
          }

        })
      })
    }


    createNewUser(userdata) {

      return new Promise((resolve, reject) => {

        let error = false

        const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

        if(!emailRegexp.test(userdata.email)) {
          error = 'invalidEmail'
        }

        let passwordCheck = this.validatePassword(userdata.password)
        if (passwordCheck !== true) {
          error = passwordCheck
        }

        if (error !== false) {
          reject(error)
        } else {

          this.getUserByEmail(userdata.email)
            .then((foundUser) => {
              if(foundUser) {
                error = 'duplicateEmail'
                reject(error)
              } else {

                this.getUserByUsername(userdata.username)
                  .then((foundUser) => {
                    if (foundUser) {
                      error = 'duplicateUsername'
                      reject(error)
                    }

                    if(!error) {

                      delete(userdata._id)
                      let token = (Math.random() + 1).toString(36).substring(2)
                      var newUser = new User(userdata)
                      newUser.verificationToken = token

                      bcrypt.hash(newUser.password, 3, ((err, encryptedPass) => {
                        newUser.password = encryptedPass
                        newUser.save()
                          .then ((success) => {
                            resolve(token)
                          })
                          .catch ((err) => {
                            let logStr = `Could not save user = ${newUser.username} | ${err}`
                            this.logError(logStr + `| ${err}`)
                            reject(logStr)
                          })
                      }))

                    }

                  })
              }
            })
          }
      })
    }

    validatePassword(password) {
      if(password.length < 8) {
        return 'passwordTooShort'
      } else {
        return true
      }
    }


    logPageLoad() {

      if(this.requestPath == '/ln/checkInvoice/') return false;

      let fs = require('fs')

      let entryStr = `PAGE: ${new Date().toTimeString()} | ${this.requestMethod} ${this.requestPath} | ${Object.entries(this.requestInputs).map(x=>x.join(":"))} \n`
      fs.appendFile('./dev.log', entryStr, (err) => {
        if (err) {
          console.log(`Could not write log file! ${err}`);
        }
      })

    }

    logWarning(description) {

      let fs = require('fs')

      let entryStr = `WARN: ${new Date().toTimeString()} | ${description}\n`
      fs.appendFile('./dev.log', entryStr, (err) => {
        if (err) {
          console.log(`Could not write log file! ${err}`);
        }
      })

    }

    logError(description) {

      let fs = require('fs')

      let entryStr = `ERR: ${new Date().toTimeString()} | ${description}\n`
      fs.appendFile('./dev.log', entryStr, (err) => {
        if (err) {
          console.log(`Could not write log file! ${err}`);
        }
      })

    }

}








class MailController {

  constructor () {
    this.mailer = sendgrid
    this.emailTemplate = {
      to: '',
      from: mailFrom,
      subject: '',
      text: '',
      html: '',
    }
  }

  sendEmail (to, subject, body) {

    var email = this.emailTemplate

    email.to = to
    email.subject = subject
    email.text = body
    email.html = body

    this.mailer.send(email)
      .catch((err) => {
        this.logError(err)
      })
  }

}

var mailer = new MailController








var controller = new SiteController()

// Get user session for all requests
app.use((req, res, next) => {

  //  Is there a better way of doing this?
  if(req.path != '/css/style.css'
    && req.path != '/src/bxstb.js'
    && req.path != '/bxs/logout') {

    app.data = {
      'error': req.session.error,
      'alert': req.session.alert,
      'alertType': req.session.alertType,
      'submittedInputs': req.session.submittedInputs
    }

    delete req.session.error
    delete req.session.alert
    delete req.session.alertType
    delete req.session.submittedInputs

    controller.requestPath = req.path
    controller.requestInputs = req.body
    controller.requestMethod = req.method
    controller.logPageLoad()

    controller.loadUserFromSession(req.session.userid)
      .then ((loadUserSuccess) => {

        if(loadUserSuccess) {

          controller.userdata.isLoggedIn = true

          //  If the user's forcePasswordReset flag is set, redirect them to password change
          if(controller.userdata.forcePasswordReset) {
            if(req.path != '/bxs/changepass' &&
                req.path != '/bxs/logout' ) {
              req.session.alert = 'Please change your password'
              req.session.alertType = 'notify'
              req.session.save((err) => { if (err) { controller.logError(err) } else { return res.redirect('/bxs/changepass') }})
            } else {
              app.set('controller', controller)
              next()
            }

          //  If the user hasn't yet been verified, return them to the homepage and tell them to validate
          } else if(!controller.userdata.verifiedDate) {

            if(req.path != '/') {
              req.session.alert = 'Please click the link in your email to verify your address'
              req.session.alertType = 'error'
              req.session.save((err) => { if (err) { controller.logError(err) } else { return res.redirect('/') }})

            } else {
              req.session.alert = 'Please click the link in your email to verify your address'
              req.session.alertType = 'error'
              req.session.save((err) => { if (err) { controller.logError(err) } else { next() }})

            }

          } else {
            next()
          }

        } else {
          next()
        }

      })
      .catch ((err) => {
        req.session.save((saveerr) => { if (err) { controller.logError(err) } else { return res.redirect('/bxs/logout') }})
      })


  } else {
    next()
  }

})



let staticDir = rootDir + '/bxs/pub'
app.use(express.static(staticDir))


module.exports.app = app
module.exports.express = express
module.exports.mailer = mailer
module.exports.mongoose = mongoose
module.exports.controller = controller
