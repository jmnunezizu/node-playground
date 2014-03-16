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
    
    events: {
        'click .scroll-button-up': 'onScrollButtonUpClick',
        'click .scroll-button-down': 'onScrollButtonDownClick'
    },

    FIRST_VIDEO: 1,
    ANIMATION_SPEED: 250,

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
        var scrollUpEl = $('<a>', { 'class': 'scroll-button scroll-button-up img-replace', href: '#' }).text('Up');
        var scrollDownEl = $('<a>', { 'class': 'scroll-button scroll-button-down img-replace', href: '#' }).text('Down');

        this.listContainerEl = $('<ul>', { 'class': 'video-list' });
        this.collection.each(this.renderVideoEntry);

        // append the elements to the container
        //this.$el.append(scrollUpEl);
        this.$el.append(this.listContainerEl);
        //this.$el.append(scrollDownEl);

        // we calculate the video entry height (used for scrolling)
        this.videoEntryHeight = this.$el.find('.video-list li:first').innerHeight();

        this.updateScrollButtonStates()
    },

    onScrollButtonUpClick: function(e) {
        e.preventDefault();

        if (this.isButtonDisabled('.scroll-button-up') || this.isPlaylistScrolling()) {
            return;
        } else {
            this.scrollPlaylist('up');
            this.updateScrollButtonStates();
        }
    },

    onScrollButtonDownClick: function(e) {
        e.preventDefault();

        if (this.isButtonDisabled('.scroll-button-down') || this.isPlaylistScrolling()) {
            return;
        } else {
            this.scrollPlaylist('down');
            this.updateScrollButtonStates();
        }
    },

    scrollPlaylist: function(direction, numRows) {
        numRows = numRows || 1;
        this.$el.find('.video-list').addClass('scrolling');

        var firstVideoEntry = this.$el.find('.video-list li:first');
        var topValue = firstVideoEntry.css('top');
        
        var currentOffset = null;
        if (topValue == 'auto') {
            currentOffset = 0;
        } else {
            currentOffset = parseInt(topValue, 10);
        }
        var offset = currentOffset;

        if (direction === 'up') {
            offset = currentOffset + (this.videoEntryHeight * numRows);
            this.currentVideo = this.currentVideo - numRows;
        } else if (direction === 'down') {
            this.currentVideo = this.currentVideo + numRows;
            offset = currentOffset - (this.videoEntryHeight * numRows);
        } else {
            throw new Error('Unknown direction ' + direction + '. Only up and down are supported.');
        }

        var self = this;
        this.$el.find('.video-list li').animate({ 'top': "#{offset}px" }, this.ANIMATION_SPEED, 'linear', function() {
            self.$el.find('.video-list').removeClass('scrolling');
        });
    },

    updateScrollButtonStates: function() {
        if (this.isFirstVideo()) {
            this.disableScrollButton('.scroll-button-up');
            this.enableScrollButton('.scroll-button-down');
        } else if (this.hasReachedLastVideo()) {
            this.disableScrollButton('.scroll-button-down');
            this.enableScrollButton('.scroll-button-up');
        } else {
            this.enableScrollButton('.scroll-button');
        }
    },

    isButtonDisabled: function(className) {
        return this.$el.find(className).hasClass('disabled');
    },

    isPlaylistScrolling: function() {
        return this.$el.find('.video-list').hasClass('scrolling');
    },

    disableScrollButton: function(className) {
        return this.$el.find(className).addClass('disabled');
    },

    enableScrollButton: function(className) {
        return this.$el.find(className).removeClass('disabled');
    },

    isFirstVideo: function() {
        return this.currentVideo === this.FIRST_VIDEO;
    },

    hasReachedLastVideo: function() {
        return this.collection.length - this.currentVideo + 1 === this.totalVisibleVideos;
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
        var headerEl = $('<h2>', { 'class': 'video-title' }).text('45s');
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
        autoplayVideo: false
    };

    var youTubePlayerOptions = _.extend(defaults, options);
    var youTubePlayerView = new YouTubePlayerView(youTubePlayerOptions);

    return youTubePlayerView;
};
