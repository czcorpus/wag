# -*- coding: utf-8 -*-
# upd dist

import sys
import sqlite3
import time
import re

from .common import upcase_regex, pos2pos, penn2pos, is_stop_ngram


def rm_morphodita_stuff(s):
    s = re.split(r'[-_`]', s)
    return s[0]

def create_tables(db):
    cur = db.cursor()
    cur.execute('DROP TABLE IF EXISTS word')
    cur.execute('DROP TABLE IF EXISTS lemma')
    cur.execute('CREATE TABLE lemma (value TEXT, pos TEXT, count INTEGER, arf INTEGER, is_pname INTEGER, PRIMARY KEY(value, pos))')
    cur.execute('CREATE TABLE word (value TEXT, lemma TEXT, pos TEXT, count INTEGER, arf INTEGER, PRIMARY KEY (value, lemma, pos), FOREIGN KEY (lemma, pos) REFERENCES lemma(value, pos))')


def get_lemma_total(rows):
    return sum(row[3] for row in rows)

def get_lemma_arf(rows):
    return sum(row[4] for row in rows)

def proc_line(cur, item, curr_lemma, words):
    if curr_lemma is None or item[1] != curr_lemma[1] or (item[1] == curr_lemma[1] and item[2] != curr_lemma[2]):
        if len(words) > 0:
            try:
                cur.execute('INSERT INTO lemma (value, pos, count, arf, is_pname) VALUES (?, ?, ?, ?, ?)',
                    [curr_lemma[1], pos_imp(curr_lemma[2]), get_lemma_total(words), get_lemma_arf(words), int(upcase_regex.match(curr_lemma[1]) is not None)])
            except sqlite3.IntegrityError:
                print('Problem with lemma+pos {0}'.format(curr_lemma))
                print('UPDATE lemma SET count = count + %s, arf = arf + %s WHERE value = %s AND pos = %s' % (get_lemma_total(words), get_lemma_arf(words), curr_lemma[1], pos_imp(curr_lemma[2])))
                cur.execute('UPDATE lemma SET count = count + ?, arf = arf + ? WHERE value = ? AND pos = ?', [get_lemma_total(words), get_lemma_arf(words), curr_lemma[1], pos_imp(curr_lemma[2])])
            for w in words:
                try:
                    cur.execute('INSERT INTO word (value, lemma, pos, count, arf) VALUES (?, ?, ?, ?, ?)', [w[0], w[1], pos_imp(w[2]), w[3], w[4]])
                except sqlite3.IntegrityError:
                    print('Problem with word+lemma+pos {0}'.format(curr_lemma))
                    print('UPDATE word SET count = count + %s, arf = arf + %s WHERE value = %s AND lemma = %s AND pos = %s' % (w[3], w[4], w[0], w[1], pos_imp(w[2])))
                    cur.execute('UPDATE word SET count = count + ?, arf = arf + ? WHERE value = ? AND lemma = ? AND pos = ?', (w[3], w[4], w[0], w[1], pos_imp(w[2])))
        curr_lemma = item
        words = []
    words.append(item)
    return words, curr_lemma

def run(db, pos_imp):
    create_tables(db)
    cur1 = db.cursor()
    cur2 = db.cursor()
    cur1.execute("SELECT col0, col1, col2, `count` AS abs, arf FROM colcounts ORDER BY col1, col2, col0")
    curr_lemma = None
    words = []
    num_stop = 0
    for item in cur1:
        tmp = list(item)
        tmp[1] = rm_morphodita_stuff(item[1])
        item = tuple(item)
        if is_stop_ngram(item[1]):
            num_stop += 1
            continue
        words, curr_lemma = proc_line(cur2, item, curr_lemma, words)
    proc_line(cur2, (None, None, None, None, None), curr_lemma, words)
    print('num stop words: {}'.format(num_stop))


if __name__ == '__main__':
    if len(sys.argv) < 1:
        print('Missing database path')
        sys.exit(1)
    if len(sys.argv) > 2:
        if sys.argv[2] == 'penn':
            pos_imp = penn2pos
        else:
            print('Unknown PoS tag type {0}'.format(sys.argv[2]))
            sys.exit(1)
    else:
        pos_imp = pos2pos
    with sqlite3.connect(sys.argv[1]) as db:
        t0 = time.time()
        db.execute('PRAGMA journal_mode = OFF')
        db.execute('BEGIN TRANSACTION')
        run(db, pos_imp)
        db.commit()
        print('Done in {0}'.format(time.time() - t0))
