var express = require('express');
var config = require('./config');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var app = express();

app.set('view engine', 'jade');

// serve static files
app.use(express.static(__dirname + '/public'));

// session support
var cookieSecret = config.get('server:cookieOptions:secret');
app.use(cookieParser(cookieSecret));
app.use(session({ secret: cookieSecret, key: 'sessionId' }));

// parse request body into req.body
app.use(bodyParser());

// register app routes
require('./routes')(app);

var port = config.get('server:port');

var server = app.listen(port, function() {
	console.log('Listening on port %d', server.address().port);
});
