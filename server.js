const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set('useFindAndModify', false);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Database

const { Schema } = mongoose;

const exerciseSchema = new Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String
});

const userSchema = new Schema({
  username: {type: String, required: true},
  log: [exerciseSchema]
})

const Exercise = mongoose.model('Exercise', exerciseSchema);
const User = mongoose.model('User', userSchema);

// Routes

// Save a new user
app.post('/api/exercise/new-user', (req, res) => {
  
  var userInput = req.body.username;
  
  //Check if user exists
  User.exists({username: userInput}, (err, result) => {
    if (err) {
      console.error(err);
    }
    else {
      // Send error if username is taken
      if (result === true) {
        res.send({error: "Username already taken"});
      }
      // Save new user if username is available
      // and send user info
      else {
        const user = new User({
          username: userInput
        });
        user.save((err) => {
          if (err) console.error(err);
        });
        res.send({
          username: user.username,
          _id: user._id
        });
      }
    }
  });
});

// Get all users
app.get('/api/exercise/users', (req, res) => {
  User.find({}, 'username', (err, result) => {
    if (err) console.error(err);
    res.send(result);
  });
});

// Add a new exercise
app.post('/api/exercise/add', (req, res) => {
  var userId = req.body.userId;
  
  // Check if date is given
  // Set date to current date if not
  var date = req.body.date;
  var dateObj = {};
  if (!date) {
    dateObj = new Date();
  }
  else {
    dateObj = new Date(date);
  }
  var dateString = dateObj.toDateString();
  
  var exercise = new Exercise({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: dateString
  });

  User.findByIdAndUpdate(userId, {$push: {log: exercise}}, {new: true}, (err, updatedData) => {
      if (err) console.error(err);
      
      res.send({
        _id: updatedData._id,
        username: updatedData.username,
        date: exercise.date,
        duration: exercise.duration,
        description: exercise.description
      });
    }
  );
});

// Get users exercise log
app.get('/api/exercise/log/', (req, res) => {
  
  var userId = req.query.userId;

  User.findById(userId, (err, result) => {
    
    if (err) {
      console.error(err);
    }

    var responseObj = result;
    
    if (req.query.limit) {
      responseObj.log = responseObj.log.slice(0, req.query.limit);
    }

    if(req.query.from || req.query.to) {
      var fromDate = new Date(0);
      var toDate = new Date();
      if(req.query.from) {
        fromDate = new Date(req.query.from);
      }
      if (req.query.to) {
        toDate = new Date(req.query.to);
      }

      fromDate = fromDate.getTime();
      toDate = toDate.getTime();

      responseObj.log = responseObj.log.filter((exercise) => {
        var exerciseDate = new Date(exercise.date).getTime();
        return exerciseDate >= fromDate && exerciseDate <= toDate;
      });
    }

    responseObj = responseObj.toJSON();
    responseObj.count = result.log.length;
    res.send(responseObj);
  })
});


// Not found middleware
app.use('*', (req, res, next) => {
  return next({status: 404, message: 'not found'})
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
