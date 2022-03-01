const controller = require('./bxs/controller.js')
let {app, express, mailController, User} = controller

const bxsRoutes = require('./bxs/routes/bxsRoutes')
app.use('/bxs', bxsRoutes)



app.get('/', (req, res, next) => {
  let contentpartial = ''
  let data = {'title': 'Home'}
  res.render('maintemplate', {contentpartial: '', data: app.data, user: app.get('controller').userdata})
})
