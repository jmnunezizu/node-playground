var Backbone = require('backbone-browserify');
var _ = require('underscore');

var PlaylistCollection = Backbone.Collection.extend({

    initialize: function(options) {
        this.url = options.url;
        this.fetch();
    }

});

var PlaylistEntryView = Backbone.View.extend({

    tagName: 'li',
    className: 'video-entry',

    MAX_VIDEO_TITLE_LENGTH: 50,

    events: {
        'click': 'playVideoHandler'
    },

    initialize: function(options) {
        this.app = options.app;
        this.model = options.model;
    },

    render: function() {
        var video = this.model.attributes;
        this.$el.attr('data-id', video.id);

        var anchorEl = $('<a>', { href: '#' + video.id });

        var imgSrc = video.snippet.thumbnails.default.url;
        var imgEl = $('<img>', { src: imgSrc });
        
        var headingEl = $('<h4>').text(this.cropVideoTitle(video.snippet.title));

        imgEl.appendTo(anchorEl);
        headingEl.appendTo(anchorEl);

        anchorEl.appendTo(this.$el);
    },

    playVideoHandler: function(e) {
        var videoEntryEl = $(e.currentTarget);
        this.$el.parent().find('.video-entry').removeClass('active');
        videoEntryEl.addClass('active');
        var video = this.model.attributes;
        this.app.trigger('playlist:playVideo', video);
    },

    cropVideoTitle: function(videoTitle) {
        var headingText = videoTitle;
        if (videoTitle.length > this.MAX_VIDEO_TITLE_LENGTH) {
            headingText = videoTitle.substring(0, this.MAX_VIDEO_TITLE_LENGTH);
            headingText = headingText.substring(0, headingText.lastIndexOf(' '));
            headingText = headingText.concat('...');
        }

        return headingText;
    }

});

var PlaylistView = Backbone.View.extend({
    
    initialize: function(config) {
        this.app = config.app;
        this.el = config.el;
        this.collection = config.collection;
        this.playlistEntryViews = [];
        this.currentVideo = this.FIRST_VIDEO;
        this.totalVisibleVideos = 6;

        this.collection.bind('reset', this.render, this);
        this.collection.bind('reset', this.fireReadyEvent, this);

        _.bindAll(this, 'renderVideoEntry');
    },

    fireReadyEvent: function() {
        this.app.trigger('playlist:ready');
    },

    renderVideoEntry: function(model, index) {
        var totalItems = this.collection.length;
        var playlistEntryView = new PlaylistEntryView({ app: this.app, model: model });
        playlistEntryView.render();
        this.playlistEntryViews.push(playlistEntryView);
        if (index === 0) $(playlistEntryView.el).addClass('first');
        if (index === totalItems - 1) $(playlistEntryView.el).addClass('last');
        this.listContainerEl.append(playlistEntryView.el);
    },

    render: function() {
        this.listContainerEl = $('<ul>', { 'class': 'video-list' });
        this.collection.each(this.renderVideoEntry);

        // append the elements to the container
        this.$el.append(this.listContainerEl);

        // we calculate the video entry height (used for scrolling)
        this.videoEntryHeight = this.$el.find('.video-list li:first').innerHeight();
    }

});

var VideoPlayerView = Backbone.View.extend({

    className: 'video-player',

    initialize: function(config) {
        this.cfg = $.extend(this.defaultConfig, config);
        this.player = null;

        _.bindAll(this, 'onYouTubeIframeAPIReady');

        this.initYoutubeApi();
    },

    playVideo: function(video) {
        this.video = video;

        if (this.hasPlayerBeenInitialised()) {
            this.player.loadVideoById({ videoId: video.snippet.resourceId.videoId });
        } else {
            this.player = new YT.Player('player', {
                width: '799',
                height: '450',
                videoId: video.snippet.resourceId.videoId,
                playerVars: {
                    rel: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    version: 3
                },
                events: {
                    'onReady': function(e) { e.target.playVideo(); }
                }
            });
        }
    },

    stopVideo: function() {
        if (this.hasPlayerBeenInitialised()) {
            this.player.stopVideo();
        }
    },

    render: function() {
        var playerEl = $('<div>', { id: 'player' });
        this.$el.append(playerEl);
    },

    initYoutubeApi: function() {
        var tag = document.createElement('script');
        tag.src = "http://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = this.onYouTubeIframeAPIReady;
    },

    hasPlayerBeenInitialised: function() {
        return this.player !== null && typeof this.player !== 'undefined';
    },

    onYouTubeIframeAPIReady: function() {        
    }

});

var YouTubePlayerView = Backbone.View.extend({

    id: 'youtube-video-player',

    initialize: function(options) {
        this.options = options;
        _.extend(this, Backbone.Events);
        this.autoplayVideoId = window.location.hash.substring(1);
    },

    render: function() {
        // create the video player
        var headerContainerEl = $('<div>', { 'class': 'tv-player-header' });
        var headerEl = $('<h2>', { 'class': 'video-title' }).text(this.options.playerTitle);
        headerEl.appendTo(headerContainerEl);
        headerContainerEl.appendTo(this.$el);

        this.videoPlayerView = new VideoPlayerView();
        this.videoPlayerView.render();
        this.$el.append(this.videoPlayerView.el);

        // create the playlist
        var playlistContainerEl = $('<aside>', { 'class': 'playlist' }).appendTo(this.$el);
        this.playlistCollection = new PlaylistCollection(this.options.playlist);
        this.playlistView = new PlaylistView({ app: this, el: playlistContainerEl, collection: this.playlistCollection });

        this.on('playlist:playVideo', this.playVideo);
        this.on('playlist:ready', this.autoplayVideo, this);
    },

    playVideo: function(video) {
        this.updateVideoTitle(video.snippet.title);
        this.videoPlayerView.playVideo(video);
    },

    stopVideo: function() {
        this.videoPlayerView.stopVideo();
    },

    updateVideoTitle: function(videoTitle) {
        this.$el.find('.video-title').text(videoTitle);
    },

    autoplayVideo: function() {
        var videoModel = this.playlistCollection.get(this.autoplayVideoId);
        if (videoModel !== null && typeof videoModel !== 'undefined') {
            var video = videoModel.attributes;
            this.playVideo(video);
        }
    }

});

module.exports = function(options) {
    defaults = {
        playerTitle: 'YouTube Video Player',
        autoplayVideo: false
    };

    var youTubePlayerOptions = _.extend(defaults, options);
    var youTubePlayerView = new YouTubePlayerView(youTubePlayerOptions);

    return youTubePlayerView;
};
