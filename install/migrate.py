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
from typing import Dict, Any, Tuple
import argparse


class DbConf():

    server = 'http://localhost:5984'
    db = 'wag'
    db2 = 'wag_new'
    prefix = ''
    username = ''
    password = ''
    dry_run = False


def parse_server_url(url: str) -> Tuple[str, str]:
    return re.split(r'(https?://)', url)[1:]


def put_document(db_conf: DbConf, ident: str, doc):
    protocol, server = parse_server_url(db_conf.server)
    url = f'{protocol}{db_conf.username}:{db_conf.password}@{server}/{db_conf.db2}/{ident}'
    if db_conf.dry_run:
        print('----------------')
        print(f'db update -> {url}')
        print(json.dumps(doc))
        return None
    else:
        if db_conf.db != db_conf.db2:
            del doc['_rev']
        print(url)
        print(doc)
        return requests.put(url, data=json.dumps(doc),
                            headers={'Accept': 'application/json', 'Content-Type': 'application/json'})


def get_doc(db_conf: DbConf, id: str):
    protocol, server = parse_server_url(db_conf.server)
    ans = requests.get(f'{protocol}{db_conf.username}:{db_conf.password}@{server}/{db_conf.db}/{id}')
    return ans.json()


def get_all_docs(db_conf: DbConf):
    protocol, server = parse_server_url(db_conf.server)
    ans = requests.get(f'{protocol}{db_conf.username}:{db_conf.password}@{server}/{db_conf.db}/_all_docs')
    return ans.json()


def migrate_data(db_conf: DbConf, path: str):
    all_docs = get_all_docs(db_conf)
    for row in all_docs['rows']:
        waitFor, readSubqFrom = None, None
        ident = row['id']
        if not ident.startswith('cnc:'):
            print(f'skipping {ident}')
            continue
        doc = get_doc(db_conf, ident)
        if 'conf' not in doc:
            print(f'skipping {ident} (no conf section)')
            continue

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
                        if type(group) is str:
                            print(f'skipping group {group}')
                            continue
                        for tile in group['tiles']:
                            if tile['tile'] == doc['ident']:
                                if waitFor:
                                    tile['waitFor'] = waitFor
                                if readSubqFrom:
                                    tile['readSubqFrom'] = readSubqFrom
                                if db_conf.dry_run:
                                    print('----------------')
                                    print(f'layout update --> {tile}')
            if not db_conf.dry_run:
                with open(path, 'w') as f:
                    json.dump(l_data, f, indent=4, ensure_ascii=False)

            del doc['_id']
            ans = put_document(db_conf, ident, doc)
            if ans is not None:
                print(f'{ans.status_code}: {ans.text}')


if __name__ == '__main__':
    argparser = argparse.ArgumentParser('migrate', description='Migrate "waitFor" and "readSubqFrom" configurations from CouchDB tile conf to layout conf')
    argparser.add_argument('layouts_conf', metavar='LAYOUTS_CONF', help='WaG server configuration file with tileDB filled in')
    argparser.add_argument('wdglance_conf', metavar='WDGLANCE_CONF', help='a JSON file containing tiles configurations')
    argparser.add_argument('-s', '--source-db', type=str, help='Source database (default is wag_conf)')
    argparser.add_argument('-t', '--target-db', type=str, help='Target database (default is wag_conf)')
    argparser.add_argument('-r', '--server', type=str, help='Custom server URL')
    argparser.add_argument('-d', '--dry-run', action='store_const', const=True, help='Do not write anything, just print the target docs (this overrides --target-db)')
    args = argparser.parse_args()
    with open(args.wdglance_conf) as fr:
        wdglance_conf = json.load(fr)
    tmp = wdglance_conf['tiles']
    if type(tmp) is not dict or 'server' not in tmp:
        print(f'ERROR: It looks like {args.wdglance_conf} does not use CouchDB for providing tile configs')
        sys.exit(1)
    db_conf = DbConf()
    db_conf.db = tmp.get('db', db_conf.db)
    db_conf.db2 = args.target_db if args.target_db else db_conf.db
    db_conf.dry_run = args.dry_run
    if args.server:
        db_conf.server = args.server
    else:
        db_conf.server = tmp.get('server', db_conf.server)
    db_conf.prefix = tmp.get('prefix', db_conf.prefix)
    db_conf.username = tmp.get('username', db_conf.username)
    db_conf.password = tmp.get('password', db_conf.password)
    migrate_data(db_conf, args.layouts_conf)