# -*- coding: utf-8 -*-
# upd dist

import sys
import sqlite3
import time
import re

def is_tag(t):
    return re.match(r'[a-zA-Z$]', 'J$')

def pos2pos(s): return s

def penn2pos(s):
    try:
        return {
            'CC': 'J', #  Coordinating conjunction
            'CD': 'C', #  Cardinal number
            'DT': 'X', #  Determiner
            'EX': 'X', #  Existential there
            'FW': 'X', #  Foreign word
            'IN': 'R', #  Preposition or subordinating conjunction
            'JJ': 'A', #  Adjective
            'JJR': 'A', # Adjective, comparative
            'JJS': 'A', # Adjective, superlative
            'LS': 'X', #  List item marker
            'MD': 'X', #  Modal
            'NN': 'N', #  Noun, singular or mass
            'NNS': 'N', # Noun, plural
            'NNP': 'X', # Proper noun, singular
            'NNPS': 'X', #    Proper noun, plural
            'PDT': 'X', # Predeterminer
            'POS': 'X', # Possessive ending
            'PRP': 'P', # Personal pronoun
            'PRP$': 'P', #    Possessive pronoun
            'RB': 'D', #  Adverb
            'RBR': 'D', # Adverb, comparative
            'RBS': 'D', # Adverb, superlative
            'RP': 'T', #  Particle
            'SYM': 'X', # Symbol
            'TO': 'X', #  to
            'UH': 'I', #  Interjection
            'VB': 'V', #  Verb, base form
            'VBD': 'V', # Verb, past tense
            'VBG': 'V', # Verb, gerund or present participle
            'VBN': 'V', # Verb, past participle
            'VBP': 'V', # Verb, non-3rd person singular present
            'VBZ': 'V', # Verb, 3rd person singular present
            'WDT': 'V', # Wh-determiner
            'WP': 'P', #  Wh-pronoun
            'WP$': 'P', # Possessive wh-pronoun
            'WRB': 'D' # Wh-adverb
        }[s]
    except KeyError:
        #print('Unrecognized tag {0}'.format(s))
        return 'X'


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

def is_stop_word(w):
    return w is None or re.match(r'^[\d\.,\:;\!\?%\$\[\]=\*\-\+\(\)\{\}/\|"\'_<>"&#@~\^§]+$', w)

def run(db, pos_imp):
    create_tables(db)
    cur = db.cursor()
    cur.execute("SELECT col0, col1, col2, `count` AS abs, arf FROM colcounts ORDER BY col1, col2, col0")
    curr_lemma = None
    words = []
    for item in [x for x in cur.fetchall()] + [(None, None, None, None, None)]:
        if is_stop_word(item[1]):
            continue
        if curr_lemma is None or item[1] != curr_lemma[1] or (item[1] == curr_lemma[1] and item[2] != curr_lemma[2]):
            if len(words) > 0:
                try:
                    cur.execute('INSERT INTO lemma (value, pos, count, arf) VALUES (?, ?, ?, ?)', [curr_lemma[1], pos_imp(curr_lemma[2]), get_lemma_total(words), get_lemma_arf(words)])
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
        run(db, pos_imp)
        db.commit()
        print('Done in {0}'.format(time.time() - t0))
