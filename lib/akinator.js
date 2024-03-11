var request = require('request');
var objectAssign = require('object-assign');

var API_PREFIXES = [
  'http://api-en1.akinator.com/ws',
  'http://api-en2.akinator.com/ws',
  'http://api-en3.akinator.com/ws'
];

function logErrors(err, res, body) {
  if (err) {
    console.log('no response from akinator server:', err);
    return err;
  }
  if (res.statusCode != 200) {
    console.log('non-200 response from akinator server:', res.statusCode);
    return res.statusCode;
  }
  if (body.completion != 'OK') {
    console.log('non-OK response from akinator server:', body.completion);
    return body.completion;
  }
  return null;
}

function akinatorRequest(uri, cb) {
  var prefixes = API_PREFIXES.slice();
  function tryRequest() {
    var prefix = prefixes.shift();
    console.log(prefix + uri);
    request({uri: prefix + uri, json: true}, function(err, res, body) {
      var e = logErrors(err, res, body);
      if (e) {
        if (prefixes.length == 0)
          return cb(e);
        else return tryRequest();
      }
      cb(null, body);
    });
  }
  tryRequest()
}

function hello(cb) {
  akinatorRequest('/new_session?partner=1&player=apinator', function(err, body) {
    if (err) return cb(err);
    cb(null, body.parameters);
  });
}

function answer(state, answerId, cb) {
  var i = state.identification;
  var s = state.step_information;
  var uri = '/answer?session=' + i.session + '&signature=' + i.signature + '&step=' + s.step + '&answer=' + answerId;
  akinatorRequest(uri, function(err, body) {
    if (err)
      return cb(err);
    cb(null, {identification: i, step_information: {
      step: Number(s.step) + 1,
      answers: body.parameters.answers,
      question: body.parameters.question,
      progression: body.parameters.progression
    }});
  });
}

function character(state, cb) {
  var i = state.identification;
  var s = state.step_information;
  var uri =  '/list?session=' + i.session + '&signature=' + i.signature + '&step=' + (Number(s.step)+1) + '&size=2&max_pic_width=246&max_pic_height=294&pref_photos=VO-OK&mode_question=0';
  akinatorRequest(uri, function(err, body) {
    cb(null, objectAssign({}, body.parameters, {identification: i}));
  });
}

module.exports.hello = hello;
module.exports.answer = answer;
module.exports.character = character;
