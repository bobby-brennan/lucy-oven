var FS = require('fs');
var EJS = require('ejs');
var Readline = require('readline');
var RL = null;

exports.bake = function(options, done) {
  var Cookbook = JSON.parse(FS.readFileSync('cookbook.json'));
  console.log('cook:' + JSON.stringify(Cookbook));
  var recipeName = options.recipe,
      dest = options.dest,
      recipe = Cookbook.recipes[recipeName];
  var answers = {};

  function fillQuestions(qs, recName, done) {
    if (!answers[recName]) answers[recName] = {};
    console.log('filling:' + recName);
    var questionNo = -1;
    function fillNextQuestion() {
      if (++questionNo == qs.length) return done();
      var question = qs[questionNo]
      if (question.include) {
        console.log('include:' + question.include);
        return fillQuestions(Cookbook.recipes[question.include].questions, question.include, fillNextQuestion);
      }
      RL.question(question.question + '\n', function(answer) {
        answers[recName][question.name] = JSON.stringify(answer) || 'req.body.' + recipeName + '.' + question.name;
        if (question.conditionals && question.conditionals[answer]) {
          return fillQuestions(question.conditionals[answer], recName, fillNextQuestion);
        }
        fillNextQuestion();
      })
    };
    fillNextQuestion();
  }

  function sendOutput(done) {
    EJS.renderFile('recipes/client/html/' + recipe.templates.client + '.ejs.html', answers, function(err, result) {
      if (err) throw err;
      FS.writeFile(dest + recipe.templates.client + '.html', result, function(err) {
        var answerKeys = Object.keys(answers);
        var numProcessed = 0;
        answerKeys.forEach(function(input, idx) {
          var templates = Cookbook.recipes[input].templates;
          if (typeof templates.server === 'string') templates.server = [templates.server];
          templates.server.forEach(function(tmpl) {
            EJS.renderFile('recipes/server/node/' + tmpl + '.ejs.js', answers, function(err, result) {
              if (err) throw err;
              FS.writeFile(dest + tmpl + '.js', result, function() {
                if (++numProcessed === answerKeys.length) done();
              });
            })
          })
        })
      });
    })
  }

  if (options.answers) {
    answers = options.answers;
    sendOutput(done);
  } else {
    RL = Readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    fillQuestions(recipe.questions, recipeName, function() {
      RL.close();
      sendOutput(done);
    });
  }
}
