var express = require('express');
var router = express();
var dependencies = require('../resources/dependencies');
var config = require('./config');

function view(viewName) {
    return function(req, res) {
        res.render(viewName);
    };
}

router.get('/', function(req, res) {
    res.render('index', { dependencies: dependencies });
});
router.get('/youtube', function(req, res) {
    res.render('youtube', { playlistId: config.get('server:youtube:playlistId')})
});

module.exports = router;
