const server = require('../../bxs/controller.js')
const ln = require('../../lntools')

let {app, express, mailer, controller} = server



const router = express.Router()

router.get('/deposit', (req, res) => {
  app.data.title = 'Deposit Sats'
  res.render('maintemplate', {contentpartial: 'deposit.ejs', data: app.data, user: controller.userdata})
})


router.post('/deposit', (req, res) => {

  ln.createInvoice(req.body.amount, controller.userdata._id)
    .then ((invoiceData) => {
      app.data.title = 'Pay Invoice'
      app.data.payment_request = invoiceData.payment_request
      app.data.invoice_hash = invoiceData.r_hash
      app.data.amount = req.body.amount
      res.render('maintemplate', {contentpartial: 'invoice.ejs', data: app.data, user: controller.userdata})
    })
    .catch((err) => {
      req.session.error = err
      console.log(err);
      req.session.save((err) => { if (err) { this.logError(err) } else { return res.redirect('/h/deposit') }})
    })

})

router.get('/depositcomplete', (req, res) => {
  req.session.alert = `Your deposit of ${req.query.a}<i class="fak fa-satoshisymbol-outline"></i> was completed`
  req.session.alertType = 'notify'
  req.session.save((err) => { if (err) { this.logError(err) } else { return res.redirect('/') }})
})

router.get('/checkInvoice', (req, res) => {

  ln.checkHuddleInvoice(req.query.invoice_hash)
    .then((result) => {
      res.send(result)
    })

})


router.get('/withdraw', (req, res) => {
  app.data.title = 'Withdraw Sats'
  res.render('maintemplate', {contentpartial: 'withdraw.ejs', data: app.data, user: controller.userdata})

})

router.post('/withdraw', (req, res) => {

  ln.payLNInvoiceFromUser(req.body.request_hash, controller.userdata._id)
    .then((result) => {
      req.session.alert = `Your withdrawal of ${result.amount}<i class="fak fa-satoshisymbol-outline"></i>  is complete`
      req.session.alertType = 'notify'
      req.session.save((err) => { if (err) { this.logEntry("ERR: " + err) } else { return res.redirect('/') }})
    })
    .catch((err) => {
      req.session.alert = 'Your withdrawal could not be completed.  Error: ' + err
      req.session.alertType = 'error'
      req.session.save((err) => { if (err) { this.logEntry("ERR: " + err) } else { return res.redirect('/') }})
    })




})

module.exports = router
