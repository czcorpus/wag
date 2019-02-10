.PHONY: production devel devel-server
production :
	nodejs node_modules/webpack/bin/webpack.js --config webpack.prod.js
devel :
	nodejs node_modules/webpack/bin/webpack.js --config webpack.dev.js
devel-server :
	nodejs node_modules/webpack-dev-server/bin/webpack-dev-server.js --config webpack.dev.js
server :
	nodejs node_modules/webpack/bin/webpack.js --config webpack.server.js