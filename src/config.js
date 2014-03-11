var nconf = require('nconf');

nconf.argv()
	 .env();

var envConfig = nconf.get('CONFIG_DIR');

nconf.file('envOverride', envConfig + '/config.json')
     .file('userOverride', __dirname + '/../user.config.json')
     .file('defaults', __dirname + '/../config/config.json');

module.exports = nconf;
