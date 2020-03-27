![WaG screenshot](https://github.com/czcorpus/wdglance/blob/master/assets/screenshot1.jpg)

# Word at a Glance (WaG)

Obtain and compile information about:

1) a single word,
2) two or more words compared with each other,
3) a word translation

using miscellaneous online lingustic tools, corpora and databases.

## Currently supported resources/services

 - [KonText](https://github.com/czcorpus/kontext)
 - [NoSketch Engine](https://nlp.fi.muni.cz/trac/noske)
 - [Treq](https://treq.korpus.cz/)
 - [Clarin FCS Core 1](https://www.clarin.eu/content/federated-content-search-clarin-fcs)
 - [Datamuse API](https://www.datamuse.com/)
 - [REST API of the Leipzig Corpora Collection](http://api.corpora.uni-leipzig.de/ws/swagger-ui.html) (LCC)

|                   | WaG       | KonText | NoSkE  | Treq   | Clarin FCS | Datamuse   | ElasticSearch | LCC   |
--------------------|-----------|---------|--------|--------|------------|------------|-------------|---------|
| collocations      |           | :star:  | :construction:       |        |            |            |             | :star:  |
| concFilter        |           | :star:  |        |        |            |            |             |         |
| concordance       |           | :star:  | :star: |        | :star:     |            |             | :star:  |
| freqBar           |           | :star:  | :construction:       |        |            |            |             |         |
| freqComparison    |           | :star:  |        |        |            |            |             |         |
| freqPie           |           | :star:  | :construction:       |        |            |            |             |         |
| geoAreas          |           | :star:  |        |        |            |            |             |         |
| html              |           | :star:  | :star: |        |            |            |             |         |
| matchingDocuments |           | :star:  |        |        |            |            | :star:      |         |
| mergeCorpFreq     |           | :star:  |        |        |            |            |             |         |
| speeches          |           | :star:  |        |        |            |            |             |         |
| timeDistrib       |           | :star:  |        |        |            |            |             |         |
| translations      |           |         |        | :star: |            |            |             |         |
| treqSubsets       |           |         |        | :star: |            |            |             |         |
| wordForms         | :star:    | :star:  |        |        |            |            |             |         |
| wordFreq          | :star:    | :star:  |        |        |            |            |             |         |
| wordSim           | :star:    |    |        |        |            |  :star:    |             | :star: |


## Requirements

Wdglance is able to run either as a self-hosted application or within a compatible web page.
For the self-hosted variant the following is needed:

- Node.JS + NPM package manager
- HTTP proxy server (Nginx, HAProxy, Apache)

Please refer for more information to the [INSTALL.md](./INSTALL.md).
