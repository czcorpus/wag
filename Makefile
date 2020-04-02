.PHONY: configtest configtest-samples configschemata
configschemata :
	./node_modules/typescript-json-schema/bin/typescript-json-schema src/js/conf/index.ts ServerConf --ignoreErrors --out conf/server-schema.json --required --strictNullChecks
	./node_modules/typescript-json-schema/bin/typescript-json-schema src/js/conf/index.ts ClientStaticConf --ignoreErrors --out conf/wdglance-schema.json --required --strictNullChecks
	./node_modules/typescript-json-schema/bin/typescript-json-schema src/js/conf/index.ts LanguageLayoutsConfig --ignoreErrors --out conf/layouts-schema.json --required --strictNullChecks
	./node_modules/typescript-json-schema/bin/typescript-json-schema src/js/conf/index.ts LanguageAnyTileConf --ignoreErrors --out conf/tiles-schema.json --required --strictNullChecks
	./node_modules/typescript-json-schema/bin/typescript-json-schema src/js/conf/index.ts ColorsConf --ignoreErrors --out conf/themes-schema.json --required --strictNullChecks

configtest :
	nodejs node_modules/ajv-cli/index.js -s ./conf/server-schema.json -d ./conf/server.json
	nodejs node_modules/ajv-cli/index.js -s ./conf/wdglance-schema.json -d ./conf/wdglance.json

	$(eval LAYOUTS_PATH=$(shell node -pe 'JSON.parse(fs.readFileSync("conf/wdglance.json", "utf8")).layouts'))
	$(if $(wildcard $(LAYOUTS_PATH)), nodejs node_modules/ajv-cli/index.js -s ./conf/layouts-schema.json -d $(LAYOUTS_PATH),)

	$(eval TILES_PATH=$(shell node -pe 'JSON.parse(fs.readFileSync("conf/wdglance.json", "utf8")).tiles'))
	$(if $(wildcard $(TILES_PATH)), nodejs node_modules/ajv-cli/index.js -s ./conf/tiles-schema.json -d $(TILES_PATH),)

	$(eval THEMES_PATH=$(shell node -pe 'JSON.parse(fs.readFileSync("conf/wdglance.json", "utf8")).colors'))
	$(if $(wildcard $(THEMES_PATH)), nodejs node_modules/ajv-cli/index.js -s ./conf/themes-schema.json -d $(THEMES_PATH),)


configtest-samples :
	nodejs node_modules/ajv-cli/index.js -s ./conf/server-schema.json -d ./conf/server.sample.json
	nodejs node_modules/ajv-cli/index.js -s ./conf/wdglance-schema.json -d ./conf/wdglance.sample.json
