'use strict';
module.exports = function (grunt) { console.log('grunt');
  grunt.registerMultiTask('lucy_oven', 'A grunt plugin for running Lucy cookbooks', function () {
    var done = this.async();
    require(__dirname + '/../oven.js').bake(this.data, done);
  });
}
