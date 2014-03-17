var express = require('express');
var router = express();
var dependencies = require('../resources/dependencies');

function view(viewName) {
    return function(req, res) {
        res.render(viewName);
    };
}

router.get('/', function(req, res) {
    res.render('index', { dependencies: dependencies });
});
router.get('/youtube', view('youtube'));

module.exports = router;
