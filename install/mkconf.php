<?php
// convert default JSON tile configuration into PHP array as used by
// UCNK's portal web app.
$conf = array("wdglance" => json_decode(file_get_contents($argv[1]), true));
echo "<?php\nreturn " . var_export($conf, true) . ";\n";
