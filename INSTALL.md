# Wdglance installation

## Installation steps

1) Install Node.js version 8 or newer.
2) Clone wdglance repository: `git clone https://github.com/czcorpus/wdglance.git`
3) run `npm install`
4) build the project `npm start build:server && make start build:production`
5) prepare word database or a service able to provide word frequency information (TODO)
6) prepare your *server.json* config (TODO)
7) define some services (you can look for examples in *conf/wdglance.sample.json*)
8) install a proxy server (e.g. Nginx) to serve static files and handle the Node application
9) run the service `npm start server`


### Nginx as a proxy for wdglance

```
upstream wdg_express {
    server localhost:3000 fail_timeout=1;
}

server {
    listen 80;
    server_name your_domain;

    location /wdglance/assets/ {
        alias /path/to/wdglance/assets/;
    }

    location /wdglance/ {
        proxy_set_header Host $http_host;
        proxy_redirect off;
        proxy_pass http://wdg_express/;
        proxy_read_timeout 10;
    }
}
```

(note: you should always prefer HTTPS access over HTTP but it is not the
primary issue of the example above we do not care about that)



### Server application as a service (systemd)

Please note that the port number must match the one defined in *conf/server.json*.

```
[Unit]
Description=Word at a Glance Express server
After=network.target

[Service]
Environment=NODE_PORT=3001
Type=simple
User=www-data
ExecStart=/usr/bin/node /path/to/wdglance/dist-server/service.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Word frequency database

**TODO**


## Custom tiles

WaG allows you to create also completely custom tiles without need to modify the core code.

First, put a directory to the `src/js/tiles/custom` along with `index.ts` file. The `index.ts` file must:

1) export its tile type:  e.g. `export const TILE_TYPE = 'MyTileType';`
2) export `init()` factory function, e.g.: `export const init:TileFactory.TileFactory<MyTileConf> = (args) => new MyTile(args);`
    1) the type returned by the `init()` function must implement `ITileProvider`

Second, update your app's configuration - i.e. at least define a tile instance and put it in the layout.

Third, build the project.

```
npm start build:server && make start build:production
```

Now restart the server and the tile should appear on the page (based on the layout you've put the tile in).

## Tips

### Configuration

When editing JSON configuration files using many modern code editors
(VSCode, Sublime Text, Webstorm, Atom,...), JSON schema files can be used to make
use of IntelliSense-like functions and continuous validation as you type.

Just put `"$schema": "https://utils.korpus.cz/json/schema/wdglance/wdglance-schema.json"` to
the root of your wdglance.json config file. In case you use separate files for *tiles* and/or
*layouts* then use also *https://utils.korpus.cz/json/schema/wdglance/tiles-schema.json* and
*https://utils.korpus.cz/json/schema/wdglance/layouts-schema.json* respectively.

It is also possible to generate your local version of the schemata and refer them via their
local path.

```
npm start schemata:make
```

You can always validate your configuration:

```
make start schemata:configtest
```
