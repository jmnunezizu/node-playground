var config = require('../config');
var googleapis = require('googleapis');

module.exports = function() {
	var apikey = config.get('server:googleapis:apikey');
    if (apikey === null || typeof apikey === 'undefined') {
		throw new Error('The Google API Key must be defined');
	}

};