CPATH=${CONFIG_PATH:-./conf}
SCPATH=${SERVER_CONF:-${CPATH}/server.json}
ajv --allow-union-types --all-errors -s ./conf/server-schema.json -d $SCPATH
ajv --allow-union-types -s ./conf/wdglance-schema.json -d $CPATH/wdglance.json
LAYOUTS_PATH=$(node -pe 'const p=JSON.parse(fs.readFileSync("'$CPATH'/wdglance.json", "utf8")).layouts; typeof p === "string" ? p : typeof p')
if test -f $LAYOUTS_PATH 2> /dev/null; then ajv -s ./conf/layouts-schema.json -d $LAYOUTS_PATH ; else echo "layouts file ($LAYOUTS_PATH) not found"; fi
TILES_PATH=$(node -pe 'const p=JSON.parse(fs.readFileSync("'$CPATH'/wdglance.json", "utf8")).tiles; typeof p === "string" ? p : typeof p')
if test -f $TILES_PATH 2> /dev/null; then ajv --allow-union-types -s ./conf/tiles-schema.json -d $TILES_PATH ; else echo "tiles file ($TILES_PATH) not found"; fi
THEMES_PATH=$(node -pe 'const p=JSON.parse(fs.readFileSync("'$CPATH'/wdglance.json", "utf8")).colors; typeof p === "string" ? p : typeof p')
if test -f $THEMES_PATH 2> /dev/null; then ajv -s ./conf/themes-schema.json -d $THEMES_PATH ; else echo "themes file ($THEMES_PATH) not found"; fi
DATA_READABILITY_PATH=$(node -pe 'const p=JSON.parse(fs.readFileSync("'$CPATH'/wdglance.json", "utf8")).dataReadability; typeof p === "string" ? p : typeof p')
if test -f $DATA_READABILITY_PATH 2> /dev/null; then ajv -s ./conf/dataReadability-schema.json -d $DATA_READABILITY_PATH ; else echo "dataReadability file ($DATA_READABILITY_PATH) not found"; fi