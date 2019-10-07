# Word At a Glance (WaG)

Obtain and compile information about:

1) a single word,
2) two or more words compared with each other :construction:,
3) a word translation

using miscellaneous online lingustic tools, corpora and databases.

## Currently supported resources/services

 - [KonText](https://github.com/czcorpus/kontext)
 - [Treq](https://treq.korpus.cz/)
 - [Clarin FCS Core 1](https://www.clarin.eu/content/federated-content-search-clarin-fcs)
 - [Datamuse API](https://www.datamuse.com/)
 - [REST API of the Leipzig Corpora Collection](http://api.corpora.uni-leipzig.de/ws/swagger-ui.html) (LCC)

|               | WaG       | KonText | NoSkE  | Treq   | Clarin FCS | Datamuse   | ElasticSearch | LCC   |
----------------|-----------|---------|--------|--------|------------|------------|-------------|---------|
| collocations  |           | :star:  |        |        |            |            |             | :star:  |
| concFilter    |           | :star:  |        |        |            |            |             |         |
| concordance   |           | :star:  |        |        | :star:     |            |             | :construction: |
| freqBar       |           | :star:  |        |        |            |            |             |         |
| freqPie       |           | :star:  |        |        |            |            |             |         |
| geoAreas      |           | :star:  |        |        |            |            |             |         |
| html          |           | :star:  | :star: |        |            |            |             |         |
| mergeCorpFreq |           | :star:  |        |        |            |            |             |         |
| speeches      |           | :star:  |        |        |            |            |             |         |
| timeDistrib   |           | :star:  |        |        |            |            |             |         |
| treq          |           |         |        | :star: |            |            |             |         |
| treqSubsets   |           |         |        | :star: |            |            |             |         |
| wordForms     | :star:    | :star:  |        |        |            |            |             |         |
| wordFreq      | :star:    | :star:  |        |        |            |            |             |         |
| wordSim       | :construction: |    |        |        |            |  :star:    |             | :star: | 

## Planned resources

  - NoSketchEngine, ElasticSearch

## Requirements

Wdglance is able to run either as a self-hosted application or within a compatible web page.
For the self-hosted variant the following is needed:

- Node.JS + NPM package manager
- HTTP proxy server (Nginx, HAProxy, Apache)

Please refer for more information to the [INSTALL.md](./INSTALL.md).
