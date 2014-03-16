var config = require('./config');
var express = require('express');
var youtube = require('./services/youtube')(config.get('server:googleapis:apikey'));

module.exports = function(app) {

    var api = express();

    api.get('/videoplayer/playlist/:playlistId', function(req, res) {
        var playlistId = req.params.playlistId;
        youtube.playlist(playlistId, function(err, videos) {
            if (err) return res.json(500, {err: 'could not retrieve videos for playlist ' + playlistId });

            res.json(videos);
        });
    });

    app.use('/api/1.0/', api);

};