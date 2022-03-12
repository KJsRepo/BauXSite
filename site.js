const server = require('./bxs/controller.js')
let {app, express, mailer, controller} = server

const bxsRoutes = require('./bxs/routes/bxsRoutes')
app.use('/bxs', bxsRoutes)

const huddleRoutes = require('./bxs/routes/lnRoutes')
app.use('/ln', huddleRoutes)

app.get('/', (req, res, next) => {
  let contentpartial = ''
  let data = {'title': 'Home'}
  res.render('maintemplate', {contentpartial: '', data: app.data, user: controller.userdata})
})



app.set('view engine', 'ejs')
app.set('views', './bxs/views')
app.listen(8080)
  .on('error', (err) => {
    console.log(`Caught an error:${err}`)
  })
