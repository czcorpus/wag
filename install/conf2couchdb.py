#!/usr/bin/env python3
#
# Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
# Copyright 2020 Institute of the Czech National Corpus,
#                Faculty of Arts, Charles University
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import requests
from requests.auth import HTTPBasicAuth
import json
import sys
import re
from typing import Dict, Any
import argparse


class DbConf():

    server = 'http://localhost:5984'
    db = 'wag'
    prefix = ''
    username = ''
    password = ''


def insert_tile(db_conf: DbConf, lang: str, ident: str, conf: Dict[str, Any]):
    prefix = db_conf.prefix + ':' if db_conf.prefix else ''
    doc_id = f'{prefix}{lang}:{ident}'
    doc = dict(_id=doc_id, lang=lang, ident=ident, conf=conf)
    protocol, server = re.split(r'(https?://)', db_conf.server)[1:]
    ans = requests.put(f'{protocol}{db_conf.username}:{db_conf.password}@{server}/{db_conf.db}/{doc_id}',
            data=json.dumps(doc), headers={'Accept': 'application/json', 'Content-Type': 'application/json'})
    print(ans.text)

def process_lang_block(db_conf: DbConf, lang: str, data: Dict[str, Any]):
    for tile in data.keys():
        insert_tile(db_conf, lang, tile, data[tile])


def process_conf(db_conf: DbConf, path: str):
    with open(path) as fr:
        data = json.load(fr)
    for lang in data.keys():
        process_lang_block(db_conf, lang, data[lang])

if __name__ == '__main__':
    argparser = argparse.ArgumentParser('Write an existing tile JSON config to a CouchDB instance')
    argparser.add_argument('server_conf', metavar='SERVER_CONF', help='WaG server configuration file with tileDB filled in')
    argparser.add_argument('tile_conf', metavar='TILE_CONF', help='a JSON file containing tiles configurations')
    args = argparser.parse_args()
    with open(args.server_conf) as fr:
        server_conf = json.load(fr)
    tmp = server_conf['tileDB']
    db_conf = DbConf()
    db_conf.db = tmp.get('db', db_conf.db)
    db_conf.server = tmp.get('server', db_conf.server)
    db_conf.prefix = tmp.get('prefix', db_conf.prefix)
    db_conf.username = tmp.get('username', db_conf.username)
    db_conf.password = tmp.get('password', db_conf.password)
    process_conf(db_conf, args.tile_conf)