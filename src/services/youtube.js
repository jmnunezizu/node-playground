var debug = require('debug')('youtube');
var googleapis = require('googleapis');

module.exports = youtube;

function youtube(apiKey) {
    var params = {
        maxResults: 50
    };
    return {
        video: function(videoId, cb) {
            new YouTubeRequest(apiKey, defaults(params, {}), cb);
        },
        playlist: function(playlistId, cb) {
            new YouTubeRequest(apiKey, defaults(params, { playlistId: playlistId, part: 'snippet' }), cb);
        }
    }
}

function YouTubeRequest(apiKey, params, cb) {
    debug('using Google API with apiKey %s', apiKey);
    debug('using the params:', params);
    googleapis.discover('youtube', 'v3').execute(function(err, client) {
        var request = client.youtube.playlistItems.list(params).withApiKey(apiKey);
        request.execute(function(err, response) {
            if (err) {
                debug('received error:', err);
                cb(err);
            } else {
                cb(null, response.items);
            }
        });
    });
}

function defaults(obj) {
    var args = Array.prototype.slice.call(arguments, 1);
    args.forEach(function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };
