var Express = require('express');
var App = Express();

App.use(Express.static(__dirname + '/static'));

require('<%= routeFile %>').setRoutes(App);

App.listen(3000);
