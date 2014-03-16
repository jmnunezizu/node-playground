var express = require('express');
var config = require('./src/config');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var enchilada = require('enchilada');
var stylus = require('stylus');

var app = express();

app.set('view engine', 'jade');

app.use(express.logger('short'));

app.use(express.favicon(__dirname + '/public/images/favicon.ico'));

// session support
var cookieSecret = config.get('server:cookieOptions:secret');
app.use(cookieParser(cookieSecret));
app.use(session({ secret: cookieSecret, key: 'sessionId' }));

// parse request body into req.body
app.use(bodyParser());

// register app routes
require('./src/routes')(app);

// register api
require('./src/api-v1')(app);

// serve js files as browserified bundles
app.use(enchilada({
    src: __dirname + '/public',
    routes: {
        '/js/lib/html5shiv.js': './js/lib/html5shiv.js'
    }
}));
// serve stylus stylesheets as compiled css
app.use(stylus.middleware({
    src: __dirname + '/public',
    compress: true
}));
app.use(express.static(__dirname + '/public'));

// start up the server
var port = config.get('server:port');
var server = app.listen(port, function() {
    console.log('Listening on port %d', port);
});

server.on('error', function(err) {
    if (err.code === 'EADDRINUSE') {
        console.error('Something is already listening to port %d, please stop the offending process and try again', port);
    } else {
        console.error('error starting server', err);
        throw err;
    }
});
