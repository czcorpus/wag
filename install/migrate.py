#!/usr/bin/env python3
#
# Copyright 2020 Martin Zimandl <martin.zimandl@gmail.com>
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


def get_doc(db_conf: DbConf, id: str):
    protocol, server = re.split(r'(https?://)', db_conf.server)[1:]
    ans = requests.get(f'{protocol}{db_conf.username}:{db_conf.password}@{server}/{db_conf.db}/{id}')
    return ans.json()


def get_all_docs(db_conf: DbConf):
    protocol, server = re.split(r'(https?://)', db_conf.server)[1:]
    ans = requests.get(f'{protocol}{db_conf.username}:{db_conf.password}@{server}/{db_conf.db}/_all_docs')
    return ans.json()


def migrate_data(db_conf: DbConf, path: str):
    all_docs = get_all_docs(db_conf)
    for row in all_docs['rows']:
        waitFor, readSubqFrom = None, None
        ident = row['id']
        doc = get_doc(db_conf, ident)

        if 'waitFor' in doc['conf']:
            waitFor = doc['conf']['waitFor']
            del doc['conf']['waitFor']
        if 'readSubqFrom' in doc['conf']:
            readSubqFrom = doc['conf']['readSubqFrom']
            del doc['conf']['readSubqFrom']

        if waitFor or readSubqFrom:
            with open(path) as fr:
                l_data = json.load(fr)
            if doc['lang'] in l_data:
                for mode in ['single', 'cmp', 'translat']:
                    for group in l_data[doc['lang']][mode]['groups']:
                        for tile in group['tiles']:
                            if tile['tile'] == doc['ident']:
                                if waitFor:
                                    tile['waitFor'] = waitFor
                                if readSubqFrom:
                                    tile['readSubqFrom'] = readSubqFrom
            print(l_data)
            with open(path, 'w') as f:
                json.dump(l_data, f, indent=4, ensure_ascii=False)

            del doc['_id']
            protocol, server = re.split(r'(https?://)', db_conf.server)[1:]
            ans = requests.put(f'{protocol}{db_conf.username}:{db_conf.password}@{server}/{db_conf.db}/{ident}',
                    data=json.dumps(doc), headers={'Accept': 'application/json', 'Content-Type': 'application/json'})
            
            print(ans.text)


if __name__ == '__main__':
    argparser = argparse.ArgumentParser('Write an existing tile JSON config to a CouchDB instance')
    argparser.add_argument('layouts_conf', metavar='LAYOUTS_CONF', help='WaG server configuration file with tileDB filled in')
    argparser.add_argument('wdglance_conf', metavar='WDGLANCE_CONF', help='a JSON file containing tiles configurations')
    args = argparser.parse_args()
    with open(args.wdglance_conf) as fr:
        server_conf = json.load(fr)
    tmp = server_conf['couchtiles']
    db_conf = DbConf()
    db_conf.db = tmp.get('db', db_conf.db)
    db_conf.server = tmp.get('server', db_conf.server)
    db_conf.prefix = tmp.get('prefix', db_conf.prefix)
    db_conf.username = tmp.get('username', db_conf.username)
    db_conf.password = tmp.get('password', db_conf.password)
    migrate_data(db_conf, args.layouts_conf)