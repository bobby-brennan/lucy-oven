var Express = require('express');
var App = Express();

require('<%= routeFile %>').setRoutes(App);

App.listen(3000);
