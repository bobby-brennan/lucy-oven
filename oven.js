var FS = require('fs');
var EJS = require('ejs');
var Mkdirp = require('mkdirp').sync;
var Glob = require('glob').sync;
var Readline = require('readline');
var RL = null;

exports.bake = function(options, done) {
  var Cookbook = JSON.parse(FS.readFileSync('cookbook.json'));
  var recipeName = options.recipe,
      dest = options.dest,
      clientLanguage = options.clientLanguage || 'html',
      serverLanguage = options.serverLanguage || 'node',
      recipe = Cookbook.recipes[recipeName];
  var answers = {};

  function fillQuestions(qs, recName, done) {
    if (!answers[recName]) answers[recName] = {};
    var questionNo = -1;
    function fillNextQuestion() {
      if (++questionNo == qs.length) return done();
      var question = qs[questionNo]
      if (question.include) {
        return fillQuestions(Cookbook.recipes[question.include].questions, question.include, fillNextQuestion);
      }
      RL.question(question.question + '\n', function(answer) {
        answers[recName][question.name] = answer;
        if (question.conditionals && question.conditionals[answer]) {
          return fillQuestions(question.conditionals[answer], recName, fillNextQuestion);
        }
        fillNextQuestion();
      })
    };
    fillNextQuestion();
  }

  if (typeof recipe.templates.server === 'string') recipe.templates.server = [recipe.templates.server];

  function sendOutput(done) {
    var serverRoutes = [].concat.apply([], Object.keys(answers).filter(function(key) {return key !== 'setup'}).map(function(key) {
      var tmpls = Cookbook.recipes[key].templates;
      if (typeof tmpls.server === 'string') tmpls.server = [tmpls.server];
      return tmpls.server.map(function(tmpl) {
        return {
          path: '/' + tmpl,
          file: process.cwd() + '/recipes/server/' + serverLanguage + '/' + tmpl + '.ejs.js'
        };
      });
    }))
    var TEMPLATES = {
      client: {
        html: {
          files: [{
            from: __dirname + '/tmpls/html/page.ejs.html',
            to: 'static/' + recipeName + '.html',
            inputs: {
              answers: answers,
              clientFile: process.cwd() + '/recipes/client/html/' + recipe.templates.client + '.ejs.html',
              dataPath: recipe.templates.server[0],
            }
          }]
        }
      },
      server: {
        node: {
          files: [{
            from: __dirname + '/tmpls/node/routes.ejs.js',
            to: Cookbook.name + '-routes.js',
            inputs: {routes: serverRoutes, answers: answers, setupFile: process.cwd() + '/recipes/server/node/setup.ejs.js'},
          },{
            from: __dirname + '/tmpls/node/server.ejs.js',
            to: 'server.js',
            inputs: {
              routeFile: './' + Cookbook.name + '-routes.js'
            }
          }, {
            from: __dirname + '/tmpls/node/package.json',
            to: 'package.json',
            inputs: {}
          }, {
            from: __dirname + '/tmpls/node/bower.json',
            to: 'bower.json',
            inputs: {}
          }]
        }
      }
    }
    var clientTmpl = TEMPLATES.client[clientLanguage];
    var serverTmpl = TEMPLATES.server[serverLanguage];
    var filesToRender = clientTmpl.files.concat(serverTmpl.files);
    if (filesToRender.length === 0) return done();

    Mkdirp(dest + '/static');

    function copyFiles(done) {
      var filesCopied = 0;
      var filesToCopy = Glob('recipes/server/' + serverLanguage + '/copy/**/*');
      console.log('copying:' + JSON.stringify(filesToCopy));
      filesToCopy.forEach(function(toCopy) {
        var outfile = dest + Cookbook.name + '/' + toCopy.substring(toCopy.indexOf('/copy/') + 6);
        if (FS.statSync(toCopy).isDirectory()) {
          Mkdirp(outfile);
        } else {
          var contents = FS.readFileSync(toCopy);
          FS.writeFileSync(outfile, contents);
        }
        if (++filesCopied == filesToCopy.length) return done();
      })
    }

    function renderFiles(done) {
      var filesProcessed = 0;
      filesToRender.forEach(function(file, index) {
        EJS.renderFile(file.from, file.inputs, function(err, result) {
          if (err) throw err;
          FS.writeFile(dest + file.to, result, function(err) {
            if (++filesProcessed == serverTmpl.files.length) return done();
          });
        });
      })
    }

    renderFiles(function() {copyFiles(done)});
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
