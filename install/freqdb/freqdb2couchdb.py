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

"""
Convert sqlite3-based word frequency database to CouchDB.
Please note that this is still an ad-hoc script which may
not work for your user case (e.g. the character filtering).
"""

import sys
import couchdb
import sqlite3
import re

DB_NAME = 'freqdb3g_v3'


class DummyDB2():
    """
    For testing
    """

    def update(self, data):
        print(data)

    def __getitem__(self, v):
        return self


def select_lines(db1):
    cursor = db1.cursor()
    cursor.execute('SELECT w.value, w.lemma, w.pos, w.count, w.arf, w.pos as lemma_pos, m.count as lemma_count, m.arf as lemma_arf, m.is_pname as lemma_is_pname '
                   'FROM word AS w JOIN lemma AS m ON m.value = w.lemma AND m.pos = w.pos ORDER BY w.lemma, w.pos, w.value')
    return cursor

KEY_ALPHABET = ['%d' % i for i in range(10)] + [chr(x) for x in range(ord('a'), ord('z') + 1)] + [chr(x) for x in range(ord('A'), ord('Z') + 1)]


def mk_id(x):
    ans = [0, 0, 0, 0, 0, 0]
    idx = len(ans) - 1
    while x > 0:
        p = x % len(KEY_ALPHABET)
        ans[idx] = KEY_ALPHABET[p]
        x = int(x / len(KEY_ALPHABET))
        idx -= 1
    ans = ''.join([str(x) for x in ans])
    return ans


def convert(db1, db2):
    buff = []
    curr_lemma = None
    i = 0
    id_base = 0
    for row in select_lines(db1):
        if re.match(r'^[\sA-Za-z0-9áÁéÉěĚšŠčČřŘžŽýÝíÍúÚůťŤďĎňŇóÓ-]+$', row['lemma']):
            new_lemma, new_pos = row['lemma'], row['lemma_pos']
            if curr_lemma is None or new_lemma != curr_lemma['lemma'] or new_pos != curr_lemma['pos']:
                if curr_lemma != None:
                    buff.append(curr_lemma)
                curr_lemma = {
                    '_id': mk_id(id_base),
                    'lemma': new_lemma,
                    'forms': [],
                    'pos': new_pos,
                    'arf': row['lemma_arf'],
                    'is_pname': bool(row['lemma_is_pname']),
                    'count': row['lemma_count']
                }
                id_base += 1
            curr_lemma['forms'].append({'word': row['value'], 'count': row['count'], 'arf': row['arf']})
            if len(buff) == 50000:
                db2.update(buff)
                buff = []
        i += 1
        if i % 100000 == 0:
            print('Processed {} records'.format(i))
    buff.append(curr_lemma)
    if len(buff) > 0:
        db2.update(buff)


if __name__ == '__main__':
    db1 = sqlite3.connect(sys.argv[1])
    db1.row_factory = sqlite3.Row
    db2 = couchdb.Server(sys.argv[2])
    #db2 = DummyDB2()
    convert(db1, db2[DB_NAME])