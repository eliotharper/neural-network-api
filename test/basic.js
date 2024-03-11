var nock = require('nock');
var akinator = require('../lib/akinator.js');

var helloResp = require('./fixtures/hello-resp.json');
var answerResp = require('./fixtures/answer-resp.json');
var characterResp = require('./fixtures/character-resp.json');
var answerResp = require('./fixtures/answer-resp.json');

var assert = require('assert');

describe('akinator client', function() {
  var nockScope;
  before(function() {
    nockScope = nock('http://api-en1.akinator.com')
      .get('/ws/new_session?partner=1&player=apinator')
      .reply(200, helloResp)
      .get('/ws/answer?session=295&signature=1263400654&step=0&answer=2')
      .reply(200, answerResp)
      .get('/ws/list?session=295&signature=1263400654&step=2&size=2&max_pic_width=246&max_pic_height=294&pref_photos=VO-OK&mode_question=0')
      .reply(200, characterResp);
  });

  after(function() {
    nockScope.done();
  });

  it('should process hello-answer-character responses', function(cb) {
    akinator.hello(function(err, state) {
      assert.deepEqual(state, helloResp.parameters);
      akinator.answer(state, 2, function(err, state1) {
        assert.deepEqual(state1.step_information.answers, answerResp.parameters.answers);
        assert.deepEqual(state1.step_information.question, answerResp.parameters.question);
        assert.deepEqual(state1.step_information.step, answerResp.parameters.step);
        akinator.character(state1, function(err, state2) {
          assert.deepEqual(state2, characterResp.parameters);
          cb();
        });
      });
    });
  });

});
