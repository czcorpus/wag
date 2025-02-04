# WaG - Word at a Glance

![WaG screenshot](https://github.com/czcorpus/wag/blob/master/assets/screenshot1.jpg)

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
 - [MQuery](https://github.com/czcorpus/mquery)
 - [NoSketch Engine](https://nlp.fi.muni.cz/trac/noske)
 - [Treq](https://treq.korpus.cz/)
 - [Clarin FCS Core 1](https://www.clarin.eu/content/federated-content-search-clarin-fcs)
 - [Datamuse API](https://www.datamuse.com/)
 - [Leipzig Corpora Collection (REST API)](http://api.corpora.uni-leipzig.de/ws/swagger-ui.html) (LCC)

|                   | WaG       | KonText | MQuery | NoSkE  | Treq   | Clarin FCS | Datamuse   | ElasticSearch | LCC   |
--------------------|-----------|---------|--------|--------|------------|------------|-------------|---------|---------|
| collocations      |           | :star:  | 🚧    | :star: |            |            |            |             | :star:  |
| concFilter        |           | :star:  |       |         |        |            |            |             |         |
| concordance       |           | :star:  |       | :star: |        | :star:     |            |             | :star:  |
| freqBar           |           | :star:  |       | :star:  |        |            |            |             |         |
| freqComparison    |           | :star:  | :star: | :star: |        |            |            |             |         |
| freqPie           |           | :star:  |       | :star: |        |            |            |             |         |
| geoAreas          |           | :star:  |       | :star: |        |            |            |             |         |
| multiWordGeoAreas |           | :star:  |       | :star: |        |            |            |             |         |
| html              |           | :star:  |       | :star: |        |            |            |             |         |
| matchingDocuments |           | :star:  |       |        |        |            |            | :star:      |         |
| mergeCorpFreq     |           | :star:  |       | :star: |        |            |            |             |         |
| speeches          |           | :star:  |       |        |        |            |            |             |         |
| syntacticColls    |           |         | :star: |       |        |            |             |            |         |
| timeDistrib       |           | :star:  | :star:       | :star: |       |            |            |             |         |
| multiWordtimeDistrib |        | :star:  |        | :star: |        |            |            |             |         |
| translations      |           |         |        |        | :star: |            |            |             |         |
| treqSubsets       |           |         |        |        | :star: |            |            |             |         |
| wordForms         | :star:    | :star:  | 🚧     |       |         |            |            |             |         |
| wordFreq          | :star:    | :star:  | 🚧     |       |         |            |            |             |         |
| wordSim           | :star:    |         | 🚧     |       |         |            |  :star:    |             | :star: |


## Requirements

WaG is able to run either as a self-hosted application or within a compatible web page.
For the self-hosted variant the following is needed:

- Node.JS + NPM package manager
- HTTP proxy server (Nginx, HAProxy, Apache)
- a core word frequency database:   
   - [CouchDB](https://couchdb.apache.org/) (data can be generated from a corpus vertical file using [CNC-MASM](https://github.com/czcorpus/cnc-masm))
   - [KorpusDB](https://db.korpus.cz/search/forms/) (CNC's own service)
   - [KonText](https://github.com/czcorpus/kontext)   
   - [SQLite3](https://www.sqlite.org/)

Please refer for more information to the [INSTALL.md](./INSTALL.md).

## How to cite WaG

Tomáš Machálek (2020): Word at a Glance: Modular Word Profile Aggregator. In: [Proceedings of LREC 2020](http://www.lrec-conf.org/proceedings/lrec2020/pdf/2020.lrec-1.866.pdf), s. 7011–7016.

```bibtex
@InProceedings{machalek2020lrec,
 author = {Tomáš Machálek},
 title = "{Word at a Glance: Modular Word Profile Aggregator.}",
 booktitle = {Proceedings of the Twelfth International Conference on Language Resources and Evaluation (LREC 2020)},
 year = {2020},
 publisher = {European Language Resources Association (ELRA)},
 language = {english}
}
```
