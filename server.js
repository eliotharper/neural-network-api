var http = require('http')
var uuid = require('uuid');

var express = require('express');
var levenshtein = require('levenshtein');

//var redis   = require('redis').createClient();
var store = {};
var redis = {
  get: function(key, cb) {
    cb(null, store[key]);
  },
  set: function(key, value, cb) {
    store[key] = value;
    cb(null);
  }
}

var akinator = require('./lib/akinator.js');

var app = express();

function handleError(res) {
  return res.send('This service is currently unavailable. Please try again later.')
}

function akinatorSession(req, res, next) {
  redis.get(req.params.key, function(err, val) {
    console.log(err, val);
    if (err) {
      return res.send(500, 'aaaa');
    }
    if (!val) {
      return res.send(404);
    }
    try {
      var session = JSON.parse(val);
      if (session.error) {
        return handleError(res);
      }
      req.session = session;
      next();
    } catch(e) {
      // TODO: figure out idiomatic way to handle errors in middleware
      res.send(500, 'aaaaa');
    }
  });
}

app.get('/newsession', function(req, res) {
  var key = uuid.v4();
  akinator.hello(function(err, session) {
    if (err) {
      // respond with session key even if api server is down
      session = { error: true };
      //return res.send(500);
    }
    redis.set(key, JSON.stringify(session), function(err) {
      res.end(key);
    });
    //redis.expire(key, 600);
  });
});

function formatGuess(state) {
  console.log(state.elements[0].element);
  return "I think of " + state.elements[0].element.name;
}

function formatAnswers(state) {
  return (parseInt(state.step_information.step)+1) + '. ' + state.step_information.question;

  return {
    question: state.step_information.question,
    answers: state.step_information.answers.map(function(a) { return a.answer; })
  };
}

app.get('/game/:key', akinatorSession, function(req, res) {
  res.send(formatAnswers(req.session));
});

//var answers = ['yes', 'no', 'don\'t know', 'probably', 'probably not'];

function matchAnswer(input, answers) {
  if (input.length < 2)
    return -1;
  var input = input.toLowerCase();
  var best = answers
    .map( function(a, i) { return [i, levenshtein(a.answer, input)]; } )
    .sort(function(i1, i2) {
       return i1[1] > i2[1];
     })[0];
  if (best[1] < 2)
    return best[0];
  return -1
}

app.get('/game/:key/list', akinatorSession, function(req, res) {
});

app.get('/status', function(req, res) {
  res.send({"status":200, "message":"server is running"});
});

app.get('/game/:key/response/:answer', akinatorSession, function(req, res) {
  var key = req.params.key;
  var answerId = matchAnswer(req.params.answer, req.session.step_information.answers);
  if (answerId < 0) {
    return res.send('I didn\'t recognise your reply. Please respond with either: "yes", "no", "don\'t know", "probably" or "probably not".');
  }
  akinator.answer(req.session, answerId, function(err, newState) {
    if (err)
      return handleError(res);

    if (Number(newState.step_information.progression) > 95) {
      akinator.character(req.session, function(err, ch) {
        res.send(formatGuess(ch));
      });
      return;
    }

    redis.set(key, JSON.stringify(newState), function(err) {
      res.send(formatAnswers(newState));
    });
  });
});

var port = process.env.PORT;
http.createServer(app).listen(port || 3094);
