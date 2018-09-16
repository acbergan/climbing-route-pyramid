/* app.js */

// require and instantiate express
var express = require('express');
var bodyParser = require('body-parser')
var app = express();

// For loading external data
const axios = require("axios");
const cheerio = require('cheerio');

// Logging / database
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI)
  .then(() =>  console.log('Database connection successful'))
  .catch((err) => console.error(err));
var FormSubmission = require('./models/FormSubmission.js');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// serve static files
app.use(express.static('public'))


// set the view engine to ejs
app.set('view engine', 'ejs')

// main page
app.get('/', (req, res) => {
  res.render('home', {routes: [], userName: '', avatar: ''});
})

// api
app.post('/api/tickdata', (req, res) => {
  getMPUserTickData(req.body['email'], function(err, routes, userName, userAvatar) {
    if (err.length > 0) {
      FormSubmission.create({email: req.body['email'], num_ticks: -1});
      res.status(404)
      res.send(err)
    } else {
      FormSubmission.create({email: req.body['email'], num_ticks: routes.length});
      res.json({routes: routes, userName: userName, avatar: userAvatar});
    }
  });
})

// Prolific climber as an example
app.post('/api/tickdata/:userId', (req, res) => {
  getMPUserTickData(req.params.userId, function(err, routes, userName, userAvatar) {
    if (err.length > 0) {
      FormSubmission.create({email: req.params.userId, num_ticks: -1});
      res.status(404)
      res.send(err)
    } else {
      FormSubmission.create({email: req.params.userId, num_ticks: routes.length});
      res.json({routes: routes, userName: userName, avatar: userAvatar});
    }
  }); 
})


app.listen(process.env.PORT || 5000)
console.log('listening on port 5000')

function getMPUserTickData(email, callback) {
  var url = "";
  if (email.match(/@/)) {
    url = "https://www.mountainproject.com/data/get-user?email="+email+"&key="+process.env.MP_KEY;
  } else {
    url = "https://www.mountainproject.com/data/get-user?userId="+email+"&key="+process.env.MP_KEY;
  }
  axios
    .get(url)
    .then(response => {
      var userId = response.data['id'];
      var userName = response.data['name'];
      var userAvatar = response.data['avatar'];
      if (userName) {
        console.log("Loading data for: " +userName)
        axios
          .get("https://www.mountainproject.com/u/"+userName+"//"+userId+"?action=ticks&&export=1")
          .then(response => {
            let $ = cheerio.load(response.data);
            let routesAsText = $('pre').text().split("\n");
            let routes = [];

            // Loop through each line
            for (var i = 2; i < routesAsText.length; i++) {
              let route = routesAsText[i].split('|');
              if (route.length == 13) {
                routeGrade = route[2].split(' ')[0];
                routes.push({
                  date: route[0],
                  routeName: route[1],
                  grade: routeGrade,
                  pitches: route[5],
                  type: route[11],
                  style: route[9],
                  leadStyle: route[10]
                });
              }
            }

            // Return the data
            callback('', routes, userName, userAvatar);
            return;
          })
          .catch(error => {
            callback('Error loading user data. Please try again latter.');
            return;
          });

      } else {
        console.log('user not found')
        callback('This email address was not found on Mountain Project.');
        return;
      }
    })
    .catch(error => {
      console.log(error);
      callback('Error loading user data. Please try again latter.');
      return;
    });
}
