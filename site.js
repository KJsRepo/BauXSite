const server = require('./bxs/controller.js')
let {app, express, mailer, controller} = server

const bxsRoutes = require('./bxs/routes/bxsRoutes')
app.use('/bxs', bxsRoutes)

const lnRoutes = require('./bxs/routes/lnRoutes')
app.use('/ln', lnRoutes)

const chatRoutes = require('./bxs/routes/chatRoutes')
app.use('/c', chatRoutes)

app.get('/', (req, res, next) => {
  let contentpartial = ''
  let data = {'title': 'Home'}
  res.render('maintemplate', {contentpartial: '', data: app.data, user: req.session.userdata})
  console.log(req.session.userdata);
})



app.set('view engine', 'ejs')
app.set('views', './bxs/views')
app.listen(8080)
  .on('error', (err) => {
    console.log(`Caught an error:${err}`)
  })
