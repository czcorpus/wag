# -*- coding: utf-8 -*-
# upd dist

import sys
import sqlite3
import time



def create_tables(db):
    cur = db.cursor()
    cur.execute('DROP TABLE IF EXISTS word')
    cur.execute('DROP TABLE IF EXISTS lemma')
    cur.execute('CREATE TABLE lemma (value TEXT, pos TEXT, count INTEGER, arf INTEGER, PRIMARY KEY(value, pos))')
    cur.execute('CREATE TABLE word (value TEXT, lemma TEXT, pos TEXT, count INTEGER, arf INTEGER, PRIMARY KEY (value, lemma, pos), FOREIGN KEY (lemma, pos) REFERENCES lemma(value, pos))')


def get_lemma_total(rows):
    return sum(row[3] for row in rows)

def get_lemma_arf(rows):
    return sum(row[4] for row in rows)


def run(db):
    create_tables(db)
    cur = db.cursor()
    cur.execute("SELECT col0, col1, col2, `count` AS abs, arf FROM colcounts ORDER BY col1, col0")
    curr_lemma = None
    words = []
    for item in [x for x in cur.fetchall()] + [(None, None, None, None, None)]:
        if curr_lemma is None or item[1] != curr_lemma[1]:
            if len(words) > 0:
                cur.execute('INSERT INTO lemma (value, pos, count, arf) VALUES (?, ?, ?, ?)', [curr_lemma[1], curr_lemma[2], get_lemma_total(words), get_lemma_arf(words)])
                for w in words:
                    cur.execute('INSERT INTO word (value, lemma, pos, count, arf) VALUES (?, ?, ?, ?, ?)', [w[0], w[1], w[2], w[3], w[4]])
            curr_lemma = item
            words = []
        words.append(item)

if __name__ == '__main__':
    with sqlite3.connect(sys.argv[1]) as db:
        t0 = time.time()
        run(db)
        db.commit()
        print('Done in {0}'.format(time.time() - t0))
