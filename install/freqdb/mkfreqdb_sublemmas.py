# -*- coding: utf-8 -*-
# upd dist

import sys
import sqlite3
import time
from typing import List, Dict
from collections import namedtuple, defaultdict

from common import upcase_regex, pos2pos, penn2pos, is_stop_ngram

Record = namedtuple('Record', ['word', 'lemma', 'sublemma', 'tag', 'abs', 'arf'])



def create_tables(db):
    cur = db.cursor()
    cur.execute('DROP TABLE IF EXISTS word')
    cur.execute('DROP TABLE IF EXISTS lemma')
    cur.execute('DROP TABLE IF EXISTS sublemma')
    cur.execute('CREATE TABLE lemma (value TEXT, pos TEXT, count INTEGER, arf INTEGER, is_pname INTEGER, PRIMARY KEY(value, pos))')
    cur.execute('CREATE TABLE sublemma (value TEXT, lemma TEXT, pos TEXT, count INTEGER, PRIMARY KEY (value, lemma, pos), FOREIGN KEY (lemma, pos) REFERENCES lemma(value, pos))')
    cur.execute('CREATE TABLE word (value TEXT, lemma TEXT, sublemma TEXT, pos TEXT, count INTEGER, arf INTEGER, PRIMARY KEY (value, lemma, sublemma, pos), FOREIGN KEY (lemma, sublemma, pos) REFERENCES sublemma(lemma, value, pos))')



def get_lemma_total(rows: List[Record]):
    return sum(row.abs for row in rows)

def get_lemma_arf(rows: List[Record]):
    return sum(row.arf for row in rows)


def proc_line(cur, item: Record, curr_lemma: Record, words: List[Record], sublemmas: Dict[str, int]):
    if curr_lemma is None or item.lemma != curr_lemma.lemma or item.tag != curr_lemma.tag:
        if len(words) > 0:
            try:
                #print(f' ---> INSERT LEMMA {curr_lemma}')
                cur.execute('INSERT INTO lemma (value, pos, count, arf, is_pname) VALUES (?, ?, ?, ?, ?)',
                    [curr_lemma.lemma, pos_imp(curr_lemma.tag), get_lemma_total(words), get_lemma_arf(words), int(upcase_regex.match(curr_lemma.lemma) is not None)])
            except sqlite3.IntegrityError:
                print('Duplicate lemma record {}'.format(curr_lemma))
                print('UPDATE lemma SET count = count + %s, arf = arf + %s WHERE value = %s AND pos = %s' % (get_lemma_total(words), get_lemma_arf(words), curr_lemma.lemma, pos_imp(curr_lemma.tag)))
                cur.execute('UPDATE lemma SET count = count + ?, arf = arf + ? WHERE value = ? AND pos = ?', [get_lemma_total(words), get_lemma_arf(words), curr_lemma.lemma, pos_imp(curr_lemma.tag)])
            for s in sublemmas:
                try:
                    cur.execute('INSERT INTO sublemma (value, lemma, pos, count) VALUES (?, ?, ?, ?)', (s, curr_lemma.lemma, pos_imp(curr_lemma.tag), sublemmas[s]))
                except sqlite3.IntegrityError:
                    print('Duplicate sublemma: {}'.format(s))
                    print('UPDATE sublemma SET count = count + {} WHERE value = {} AND lemma = {} AND pos = {}'.format(sublemmas[s], s, curr_lemma.lemma, pos_imp(curr_lemma.tag)))
                    cur.execute('UPDATE sublemma SET count = count + ? WHERE value = ? AND lemma = ? AND pos = ?', (sublemmas[s], s, curr_lemma.lemma, pos_imp(curr_lemma.tag)))
            for w in words:
                try:
                    cur.execute('INSERT INTO word (value, lemma, sublemma, pos, count, arf) VALUES (?, ?, ?, ?, ?, ?)', [w.word, w.lemma, w.sublemma, pos_imp(w.tag), w.abs, w.arf])
                except sqlite3.IntegrityError:
                    print('Duplicate word {}'.format(w))
                    print('UPDATE word SET count = count + %s, arf = arf + %s WHERE value = %s AND lemma = %s AND pos = %s' % (w.abs, w.arf, w.word, w.lemma, pos_imp(w.tag)))
                    cur.execute('UPDATE word SET count = count + ?, arf = arf + ? WHERE value = ? AND lemma = ? AND pos = ?', (w.abs, w.arf, w.word, w.lemma, pos_imp(w.tag)))
        curr_lemma = item
        words = []
        sublemmas = defaultdict(lambda: 0)
    words.append(item)
    return words, sublemmas, curr_lemma

def run(db, pos_imp):
    create_tables(db)
    cur1 = db.cursor()
    cur2 = db.cursor()
    cur1.execute("SELECT col0, col2, col3, col4, `count` AS abs, arf FROM colcounts ORDER BY col2, col3, col4, col0")
    curr_lemma = None
    words: List[Record] = []
    sublemmas: Dict[str, int] = defaultdict(lambda: 0)
    num_stop = 0
    for item in cur1:
        item = Record(*item)
        if is_stop_ngram(item.lemma):
            num_stop += 1
            continue
        words, sublemmas, curr_lemma = proc_line(cur2, item, curr_lemma, words, sublemmas)
        sublemmas[item.sublemma] += 1
    proc_line(cur2, Record(None, None, None, None, None, None), curr_lemma, words, sublemmas)  # proc the last element
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
