# Word at a Glance (WaG)

![WaG screenshot](https://github.com/czcorpus/wdglance/blob/master/assets/screenshot1.jpg)

1. Use existing corpus/data search and retrieval software as backend,
1. Obtain and compile information about:
   1. single word,
   1. two or more words compared with each other,
   1. word translation.
1. explore text metadata statistics, time-based trends, word cloud-based data and many more,
1. combine statistics from different corpora,
1. Use results of a resource as an input for other resource.


## Currently supported resources

 - [KonText](https://github.com/czcorpus/kontext)
 - [NoSketch Engine](https://nlp.fi.muni.cz/trac/noske)
 - [Treq](https://treq.korpus.cz/)
 - [Clarin FCS Core 1](https://www.clarin.eu/content/federated-content-search-clarin-fcs)
 - [Datamuse API](https://www.datamuse.com/)
 - [Leipzig Corpora Collection (REST API)](http://api.corpora.uni-leipzig.de/ws/swagger-ui.html) (LCC)

|                   | WaG       | KonText | NoSkE  | Treq   | Clarin FCS | Datamuse   | ElasticSearch | LCC   |
--------------------|-----------|---------|--------|--------|------------|------------|-------------|---------|
| collocations      |           | :star:  | :star: |        |            |            |             | :star:  |
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
