# upd dist

import sys
import sqlite3


def run(db):
    cur = db.cursor()
    i = 0
    cur.execute("SELECT col0, col1, col2 FROM colcounts ORDER BY `arf`")
    for item in [x for x in cur.fetchall()]:
        cur.execute('UPDATE colcounts SET idx = ? WHERE col0 = ? AND col1 = ? AND col2 = ?', (i, item[0], item[1], item[2]))
        i += 1

if __name__ == '__main__':
    with sqlite3.connect(sys.argv[1]) as db:
        run(db)
        db.commit()
