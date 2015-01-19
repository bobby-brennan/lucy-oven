var FS = require('fs');
var EJS = require('ejs');

var Readline = require('readline');

var RL = Readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var Cookbook = JSON.parse(FS.readFileSync('cookbook.json'));

var recipeName = 'mediaList',
    dest = 'test/';

var inputs = {};

recipe = Cookbook.recipes[recipeName];

function fillQuestions(qs, recName, done) {
  if (!inputs[recName]) inputs[recName] = {};
  console.log('filling:' + recName);
  var questionNo = -1;
  function fillNextQuestion() {
    if (++questionNo == qs.length) return done();
    var question = qs[questionNo]
    if (question.include) {
      return fillQuestions(Cookbook.recipes[question.include].questions, question.include, fillNextQuestion);
    }
    RL.question(question.question + '\n', function(answer) {
      inputs[recName][question.name] = JSON.stringify(answer) || 'req.body.' + recipeName + '.' + question.name;
      if (question.conditionals && question.conditionals[answer]) {
        return fillQuestions(question.conditionals[answer], recName, fillNextQuestion);
      }
      fillNextQuestion();
    })
  };
  fillNextQuestion();
}

fillQuestions(recipe.questions, recipeName, function() {
  RL.close();
  Object.keys(inputs).forEach(function(input) {
    var templates = Cookbook.recipes[input].templates;
    if (typeof templates.server === 'string') templates.server = [templates.server];
    templates.server.forEach(function(tmpl) {
      EJS.renderFile('recipes/server/node/' + tmpl + '.ejs.js', inputs, function(err, result) {
        if (err) throw err;
        FS.writeFile(dest + tmpl + '.js', result);
      })
    })
  })
  EJS.renderFile('recipes/client/' + recipe.templates.client + '.ejs.html', inputs, function(err, result) {
    if (err) throw err;
    FS.writeFile(dest + recipe.templates.client + '.html', result);
  })
})
