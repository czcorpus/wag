.PHONY: production devel devel-server configtest
production :
	nodejs node_modules/webpack/bin/webpack.js --config webpack.prod.js
devel :
	nodejs node_modules/webpack/bin/webpack.js --config webpack.dev.js
devel-server :
	nodejs node_modules/webpack-dev-server/bin/webpack-dev-server.js --config webpack.dev.js
server :
	nodejs node_modules/webpack/bin/webpack.js --config webpack.server.js
configtest :
	nodejs node_modules/ajv-cli/index.js -s ./conf/wdglance-schema.json -d ./conf/wdglance.json
	nodejs node_modules/ajv-cli/index.js -s ./conf/layouts-schema.json -d ./conf/layouts.json
	nodejs node_modules/ajv-cli/index.js -s ./conf/tiles-schema.json -d ./conf/tiles.json
configschemata :
	./node_modules/typescript-json-schema/bin/typescript-json-schema src/js/conf.ts ClientStaticConf --ignoreErrors --out conf/wdglance-schema.json --required --strictNullChecks
	./node_modules/typescript-json-schema/bin/typescript-json-schema src/js/conf.ts LanguageLayoutsConfig --ignoreErrors --out conf/layouts-schema.json --required --strictNullChecks
	./node_modules/typescript-json-schema/bin/typescript-json-schema src/js/conf.ts LanguageAnyTileConf --ignoreErrors --out conf/tiles-schema.json --required --strictNullChecks
