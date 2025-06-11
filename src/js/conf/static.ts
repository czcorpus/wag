/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
 *                Faculty of Arts, Charles University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { LayoutsConfig } from './index.js';


export const tileConf: {[name:string]:any} = {
    wordFreq: {
        tileType: "WordFreqTile",
        label: {
            "cs-CZ": "Základní charakteristika",
            "en-US": "Basic characteristics"
        },
        apiURL: "http://localhost:8182/service/2/frodo/",
        infoApiURL: "http://localhost:8182/service/4/mquery/",
        helpURL: "/wag/static/vendor/ucnk/tiles-help/single/WordFreqProfile.cs.html",
        corpname: "ksp_2",
        corpusSize: 43224671,
        sfwRowRange: 7,
        useDataStream: true,
    },
    mergeCorpFreq: {
        tileType: "MergeCorpFreqTile",
        apiType: "mquery",
        apiURL: "http://localhost:8182/service/4/mquery/",
        useDataStream: true,
        pixelsPerItem: 80,
        sources: [
            {
                "corpname": "syn2020",
                "corpusSize": 120748715,
                "fcrit": "doc.txtype_group 0",
                "flimit": 0,
                "freqSort": "freq",
                "fpage": 1,
                "fttIncludeEmpty": true,
                "freqType": "text-types",
                "posQueryGenerator": ["tag", "ppTagset"]
            },
            {
                "corpname": "oral_v1",
                "corpusSize": 6361707,
                "fcrit": "sp.gender 0",
                "flimit": 0,
                "freqSort": "freq",
                "fpage": 1,
                "fttIncludeEmpty": true,
                "freqType": "text-types",
                "posQueryGenerator": ["tag", "ppTagset"],
                "valuePlaceholder": "Spoken language",
                "isSingleCategory": true
            }
        ],
        backlink:{
            "url": "http://localhost/kontext"
        },
    },
    wordForms: {
        tileType: "WordFormsTile",
        apiType: "mquery",
        apiURL: "http://localhost:8182/service/4/mquery/",
        useDataStream: true,
        label: {
            "cs-CZ": "Tvary",
            "en-US": "Forms"
        },
        corpname: "syn2020",
        maxNumItems: 10,
        corpusSize: 150426,
        freqFilterAlphaLevel: "0.05",
        helpURL: "anything",
    },
    colloc: {
        tileType: "CollocTile",
        apiType: "default",
        apiURL: "http://localhost:8182/service/4/mquery/",
        useDataStream: true,
        corpname: "syn2020",
        minFreq: 5,
        minLocalFreq: 5,
        rangeSize: 3,
        helpURL: "anything",
        posQueryGenerator: ["tag", "ppTagset"],
        backlink:{
            url: "http://localhost/kontext"
        }
    },
    concordance: {
        tileType: 'ConcordanceTile',
        label: {
            "cs-CZ": "Konkordance",
            "en-US": "Concordance"
        },
        useDataStream: true,
        posQueryGenerator: [
            "tag",
            "ppTagset"
        ],
        apiURL: "---",
        corpname: "syn2020",
    },
    timeDistrib: {
        tileType: "TimeDistribTile",
        apiType: "mquery",
        apiURL: "http://localhost:8182/service/4/mquery/",
        useDataStream: true,
        corpname: "syn2020",
        subcname: ["9eSmyKII"],
        showMeasuredFreq: true,
        posQueryGenerator: ["tag", "ppTagset"],
        waitForTimeoutSecs: 10,
        helpURL: "anything",
        subcBacklinkLabel: {
            "9eSmyKII": "pub"
        },
        fcrit: "doc.pubyear 0",
        fromYear: 1990,
        toYear: 2020,
        corpName: "syn2020",
        subcorpName: "9eSmyKII",
        maxItems: 100,
        backlink: {
            "url": "http://localhost/kontext"
        }
    },
    freqBar: {
      tileType: "FreqBarTile",
      apiURL: "http://localhost:8182/service/4/mquery/",
      useDataStream: true,
      corpname: "oral_v1",
      fcrit: "sp.gender 0",
      freqType: "text-types",
      label: {
          "cs-CZ": "Autoři podle pohlaví",
          "en-US": "Authors by gender"
      },
      flimit: 1,
      fpage: 1,
      matchCase: true,
      fttIncludeEmpty: false,
      posQueryGenerator: [
          "tag",
          "ppTagset"
      ],
      backlink: {
          "url": "http://localhost/kontext"
      }
    },
    speeches: {
        tileType: "SpeechesTile",
        apiType: "mquery",
        apiURL: "http://localhost:8182/service/4/mquery/",
        useDataStream: true,

        audioPlaybackUrl: "/kontext/audio",
        helpURL: "/wag/static/help/czcorpus/missing.html",
        corpname: "oral_v1",
        speakerIdAttr: ["sp", "nickname"],
        speechSegment: ["seg", "soundfile"],
        speechOverlapAttr: ["sp", "overlap"],
        speechOverlapVal: "ano",
        posQueryGenerator: ["tag", "ppTagset"],
        backlink:{
            "url": "http://localhost/kontext"
        }
    },
    geoAreas: {
        tileType: "GeoAreasTile",
        apiType: "mquery",
        apiURL: "http://localhost:8182/service/4/mquery/",
        useDataStream: true,

        helpURL: "/wag/static/help/czcorpus/missing.html",
        corpname: "oral_v1",
        freqType: "text-types",
        fcrit: "sp.reg_current 0",
        flimit: 1,
        fpage: 1,
        freqSort: "rel",
        frequencyDisplayLimit: 5,
        fttIncludeEmpty: false,
        posQueryGenerator: ["tag", "ppTagset"],
        areaCodeMapping: {
            "středočeská": "naSTR",
            "severovýchodočeská": "naSVC",
            "středomoravská": "naSTM",
            "pohraničí české": "naCPO",
            "východomoravská": "naVYM",
            "západočeská": "naZAC",
            "jihočeská": "naJIC",
            "slezská": "naSLE",
            "česko-moravská": "naCMO",
            "pohraničí moravské": "naMPO",
            "zahraničí": "naFRG",
            "neznámé": "naUNK"
        },
        backlink:{
            "url": "http://localhost/kontext"
        }
    },
};

export const layoutConf: LayoutsConfig = {
    single: {
        groups: [
            {
                groupLabel: "Tile examples",
                tiles: [
                    {tile: 'wordFreq', width: 1},
                    {tile: 'mergeCorpFreq', width: 1},
                    {tile: 'wordForms', width: 1},
                    {tile: 'colloc', width: 1},
                    {tile: 'concordance', width: 2},
                    {tile: 'timeDistrib', width: 2},
                    {tile: 'freqBar', width: 1},
                    {tile: 'speeches', width: 1},
                    {tile: 'geoAreas', width: 2},
                ]
            }
        ],
        mainPosAttr: 'pos',
    }
};

export const responseDataConf: Array<Array<any>> = [
    [
        {
            "matches": [
              {
                "_id": "000000",
                "lemma": "hlava",
                "forms": [
                  {
                    "word": "-",
                    "count": 57682,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "N",
                "is_pname": false,
                "count": 57682,
                "ipm": 0.0013344693820804326,
                "ngramSize": 1,
                "simFreqScore": 33149.30078125
              },
              {
                "_id": "000001",
                "lemma": "však",
                "forms": [
                  {
                    "word": "-",
                    "count": 67868,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "J",
                "is_pname": false,
                "count": 67868,
                "ipm": 0.0015701218408348326,
                "ngramSize": 1,
                "simFreqScore": 33578.5
              },
              {
                "_id": "000002",
                "lemma": "pod",
                "forms": [
                  {
                    "word": "-",
                    "count": 62129,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "R",
                "is_pname": false,
                "count": 62129,
                "ipm": 0.0014373504427598767,
                "ngramSize": 1,
                "simFreqScore": 34019.6015625
              },
              {
                "_id": "000003",
                "lemma": "vidět",
                "forms": [
                  {
                    "word": "-",
                    "count": 63232,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "V",
                "is_pname": false,
                "count": 63232,
                "ipm": 0.0014628682772391721,
                "ngramSize": 1,
                "simFreqScore": 34606.80078125
              },
              {
                "_id": "000004",
                "lemma": "od",
                "forms": [
                  {
                    "word": "-",
                    "count": 60464,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "R",
                "is_pname": false,
                "count": 60464,
                "ipm": 0.0013988307742122548,
                "ngramSize": 1,
                "simFreqScore": 34675.19921875
              },
              {
                "_id": "000005",
                "lemma": "slovo",
                "forms": [
                  {
                    "word": "-",
                    "count": 66684,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "N",
                "is_pname": false,
                "count": 66684,
                "ipm": 0.0015427300765343014,
                "ngramSize": 1,
                "simFreqScore": 35234.19921875
              },
              {
                "_id": "000006",
                "lemma": "ještě",
                "forms": [
                  {
                    "word": "-",
                    "count": 64889,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "D",
                "is_pname": false,
                "count": 64889,
                "ipm": 0.0015012028662982767,
                "ngramSize": 1,
                "simFreqScore": 35334.3984375
              },
              {
                "_id": "000007",
                "lemma": "kde",
                "forms": [
                  {
                    "word": "-",
                    "count": 67027,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "D",
                "is_pname": false,
                "count": 67027,
                "ipm": 0.0015506653596044722,
                "ngramSize": 1,
                "simFreqScore": 35338.3984375
              },
              {
                "_id": "000008",
                "lemma": "kdo",
                "forms": [
                  {
                    "word": "-",
                    "count": 67351,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "P",
                "is_pname": false,
                "count": 67351,
                "ipm": 0.0015581610788894147,
                "ngramSize": 1,
                "simFreqScore": 35442.19921875
              },
              {
                "_id": "000009",
                "lemma": "sen",
                "forms": [
                  {
                    "word": "-",
                    "count": 68182,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "N",
                "is_pname": false,
                "count": 68182,
                "ipm": 0.0015773862107591287,
                "ngramSize": 1,
                "simFreqScore": 35804.5
              },
              {
                "_id": "00000a",
                "lemma": "tělo",
                "forms": [
                  {
                    "word": "-",
                    "count": 60846,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "N",
                "is_pname": false,
                "count": 60846,
                "ipm": 0.0014076683197889463,
                "ngramSize": 1,
                "simFreqScore": 33135.3984375
              },
              {
                "_id": "00000b",
                "lemma": "než",
                "forms": [
                  {
                    "word": "-",
                    "count": 58377,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "J",
                "is_pname": false,
                "count": 58377,
                "ipm": 0.001350548162645356,
                "ngramSize": 1,
                "simFreqScore": 32760.599609375
              },
              {
                "_id": "00000c",
                "lemma": "tu",
                "forms": [
                  {
                    "word": "-",
                    "count": 60743,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "D",
                "is_pname": false,
                "count": 60743,
                "ipm": 0.0014052854213742888,
                "ngramSize": 1,
                "simFreqScore": 31980.69921875
              },
              {
                "_id": "00000d",
                "lemma": "cesta",
                "forms": [
                  {
                    "word": "-",
                    "count": 54585,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "N",
                "is_pname": false,
                "count": 54585,
                "ipm": 0.0012628204850882497,
                "ngramSize": 1,
                "simFreqScore": 30581.599609375
              },
              {
                "_id": "00000e",
                "lemma": "se",
                "forms": [
                  {
                    "word": "-",
                    "count": 50929,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "R",
                "is_pname": false,
                "count": 50929,
                "ipm": 0.0011782391588359342,
                "ngramSize": 1,
                "simFreqScore": 30313.400390625
              },
              {
                "_id": "00000f",
                "lemma": "proč",
                "forms": [
                  {
                    "word": "-",
                    "count": 64824,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "D",
                "is_pname": false,
                "count": 64824,
                "ipm": 0.0014996990954540754,
                "ngramSize": 1,
                "simFreqScore": 28613
              },
              {
                "_id": "00000g",
                "lemma": "tvář",
                "forms": [
                  {
                    "word": "-",
                    "count": 50359,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "N",
                "is_pname": false,
                "count": 50359,
                "ipm": 0.0011650522452790906,
                "ngramSize": 1,
                "simFreqScore": 28270.19921875
              },
              {
                "_id": "00000h",
                "lemma": "ani",
                "forms": [
                  {
                    "word": "-",
                    "count": 50809,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "J",
                "is_pname": false,
                "count": 50809,
                "ipm": 0.0011754629665081777,
                "ngramSize": 1,
                "simFreqScore": 27869
              },
              {
                "_id": "00000i",
                "lemma": "náš",
                "forms": [
                  {
                    "word": "-",
                    "count": 51258,
                    "arf": 0
                  }
                ],
                "sublemmas": [
                  {
                    "value": "-",
                    "count": 1
                  }
                ],
                "pos": "P",
                "is_pname": false,
                "count": 51258,
                "ipm": 0.0011858505528012,
                "ngramSize": 1,
                "simFreqScore": 27598.19921875
              }
            ]
        },
    ],
    [
        {
            parts: [
                {
                  "concSize": 72676,
                  "corpusSize": 121826797,
                  "freqs": [
                    {
                      "word": "FIC: beletrie",
                      "freq": 50442,
                      "base": 41591113,
                      "ipm": 1212.8073
                    },
                    {
                      "word": "NMG: publicistika",
                      "freq": 12451,
                      "base": 39966492,
                      "ipm": 311.53598
                    },
                    {
                      "word": "NFC: oborová literatura",
                      "freq": 9783,
                      "base": 40269192,
                      "ipm": 242.94006
                    }
                  ],
                  "fcrit": "doc.txtype_group 0 0"
                },
                {
                  "concSize": 1384,
                  "corpusSize": 6361707,
                  "freqs": [
                    {
                      "word": "hlava",
                      "freq": 1384,
                      "base": 6361707,
                      "ipm": 217.55167
                    }
                  ],
                  "fcrit": "lemma/e 0~0>0/i 0~0>0"
                }
            ],
        },
    ],
    [
        [
            {
              "lemma": "hlava",
              "pos": "N",
              "forms": [
                {
                  "word": "hlavou",
                  "freq": 21047,
                  "base": 121826797,
                  "ipm": 172.76166
                },
                {
                  "word": "hlavu",
                  "freq": 20365,
                  "base": 121826797,
                  "ipm": 167.16354
                },
                {
                  "word": "hlavy",
                  "freq": 12456,
                  "base": 121826797,
                  "ipm": 102.24351
                },
                {
                  "word": "hlavě",
                  "freq": 9957,
                  "base": 121826797,
                  "ipm": 81.73079
                },
                {
                  "word": "hlava",
                  "freq": 6268,
                  "base": 121826797,
                  "ipm": 51.45009
                },
                {
                  "word": "hlavami",
                  "freq": 1108,
                  "base": 121826797,
                  "ipm": 9.094879
                },
                {
                  "word": "hlav",
                  "freq": 767,
                  "base": 121826797,
                  "ipm": 6.2958236
                },
                {
                  "word": "hlavách",
                  "freq": 605,
                  "base": 121826797,
                  "ipm": 4.966067
                },
                {
                  "word": "hlavám",
                  "freq": 39,
                  "base": 121826797,
                  "ipm": 0.32012662
                },
                {
                  "word": "hlavama",
                  "freq": 34,
                  "base": 121826797,
                  "ipm": 0.27908474
                },
                {
                  "word": "hlavo",
                  "freq": 30,
                  "base": 121826797,
                  "ipm": 0.24625123
                }
              ]
            }
        ],
    ],
    [
        {
            "corpusSize": 121826797,
            "concSize": 0,
            "subcSize": 121826797,
            "colls": [
              {
                "word": "zavrtět",
                "score": 11.1676,
                "freq": 5520
              },
              {
                "word": "nad",
                "score": 9.6493,
                "freq": 3445
              },
              {
                "word": "zvednout",
                "score": 9.5347,
                "freq": 2071
              },
              {
                "word": "bolest",
                "score": 8.8909,
                "freq": 1273
              },
              {
                "word": "kroutit",
                "score": 8.8341,
                "freq": 1040
              },
              {
                "word": "potřást",
                "score": 8.5596,
                "freq": 855
              },
              {
                "word": "pokývat",
                "score": 8.5121,
                "freq": 820
              },
              {
                "word": "sklonit",
                "score": 8.5091,
                "freq": 839
              },
              {
                "word": "lámat",
                "score": 8.4941,
                "freq": 821
              },
              {
                "word": "vrtět",
                "score": 8.3449,
                "freq": 733
              }
            ],
            "resultType": "coll",
            "measure": "logDice",
            "srchRange": [
              3,
              3
            ]
        },
    ],
    [
        {
            "lines": [
              {
                "text": [
                  {
                    "type": "token",
                    "word": "a",
                    "strong": false,
                    "attrs": {
                      "lemma": "a"
                    }
                  },
                  {
                    "type": "token",
                    "word": "koleny",
                    "strong": false,
                    "attrs": {
                      "lemma": "koleno"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Když",
                    "strong": false,
                    "attrs": {
                      "lemma": "když"
                    }
                  },
                  {
                    "type": "token",
                    "word": "Potížistka",
                    "strong": false,
                    "attrs": {
                      "lemma": "potížistka"
                    }
                  },
                  {
                    "type": "token",
                    "word": "zasadila",
                    "strong": false,
                    "attrs": {
                      "lemma": "zasadit"
                    }
                  },
                  {
                    "type": "token",
                    "word": "Brainerdovi",
                    "strong": false,
                    "attrs": {
                      "lemma": "Brainerdovi"
                    }
                  },
                  {
                    "type": "token",
                    "word": "krvavou",
                    "strong": false,
                    "attrs": {
                      "lemma": "krvavý"
                    }
                  },
                  {
                    "type": "token",
                    "word": "ránu",
                    "strong": false,
                    "attrs": {
                      "lemma": "rána"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlavou",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "už",
                    "strong": false,
                    "attrs": {
                      "lemma": "už"
                    }
                  },
                  {
                    "type": "token",
                    "word": "nevstal",
                    "strong": false,
                    "attrs": {
                      "lemma": "vstát"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Vítězka",
                    "strong": false,
                    "attrs": {
                      "lemma": "vítězka"
                    }
                  },
                  {
                    "type": "token",
                    "word": "mu",
                    "strong": false,
                    "attrs": {
                      "lemma": "on"
                    }
                  },
                  {
                    "type": "token",
                    "word": "sundala",
                    "strong": false,
                    "attrs": {
                      "lemma": "sundat"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hodinky",
                    "strong": false,
                    "attrs": {
                      "lemma": "hodinky"
                    }
                  },
                  {
                    "type": "token",
                    "word": "ze",
                    "strong": false,
                    "attrs": {
                      "lemma": "z"
                    }
                  }
                ],
                "ref": "#37224307",
                "props": {
                  "s.id": "palah_necosivymy:1:1748:8"
                }
              },
              {
                "text": [
                  {
                    "type": "token",
                    "word": "dlouhé",
                    "strong": false,
                    "attrs": {
                      "lemma": "dlouhý"
                    }
                  },
                  {
                    "type": "token",
                    "word": "vlasy",
                    "strong": false,
                    "attrs": {
                      "lemma": "vlas"
                    }
                  },
                  {
                    "type": "token",
                    "word": "jsou",
                    "strong": false,
                    "attrs": {
                      "lemma": "být"
                    }
                  },
                  {
                    "type": "token",
                    "word": "pryč",
                    "strong": false,
                    "attrs": {
                      "lemma": "pryč"
                    }
                  },
                  {
                    "type": "token",
                    "word": "a",
                    "strong": false,
                    "attrs": {
                      "lemma": "a"
                    }
                  },
                  {
                    "type": "token",
                    "word": "místo",
                    "strong": false,
                    "attrs": {
                      "lemma": "místo"
                    }
                  },
                  {
                    "type": "token",
                    "word": "toho",
                    "strong": false,
                    "attrs": {
                      "lemma": "ten"
                    }
                  },
                  {
                    "type": "token",
                    "word": "má",
                    "strong": false,
                    "attrs": {
                      "lemma": "mít"
                    }
                  },
                  {
                    "type": "token",
                    "word": "na",
                    "strong": false,
                    "attrs": {
                      "lemma": "na"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlavě",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": "vrabčí",
                    "strong": false,
                    "attrs": {
                      "lemma": "vrabčí"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hnízdo",
                    "strong": false,
                    "attrs": {
                      "lemma": "hnízdo"
                    }
                  },
                  {
                    "type": "token",
                    "word": "krátkých",
                    "strong": false,
                    "attrs": {
                      "lemma": "krátký"
                    }
                  },
                  {
                    "type": "token",
                    "word": "vlasů",
                    "strong": false,
                    "attrs": {
                      "lemma": "vlas"
                    }
                  },
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "které",
                    "strong": false,
                    "attrs": {
                      "lemma": "který"
                    }
                  },
                  {
                    "type": "token",
                    "word": "jí",
                    "strong": false,
                    "attrs": {
                      "lemma": "on"
                    }
                  },
                  {
                    "type": "token",
                    "word": "vůbec",
                    "strong": false,
                    "attrs": {
                      "lemma": "vůbec"
                    }
                  },
                  {
                    "type": "token",
                    "word": "nesluší",
                    "strong": false,
                    "attrs": {
                      "lemma": "slušet"
                    }
                  }
                ],
                "ref": "#31935341",
                "props": {
                  "s.id": "black_podivnahol:1:2207:2"
                }
              },
              {
                "text": [
                  {
                    "type": "token",
                    "word": "je",
                    "strong": false,
                    "attrs": {
                      "lemma": "být"
                    }
                  },
                  {
                    "type": "token",
                    "word": "všechno",
                    "strong": false,
                    "attrs": {
                      "lemma": "všechen"
                    }
                  },
                  {
                    "type": "token",
                    "word": "pryč",
                    "strong": false,
                    "attrs": {
                      "lemma": "pryč"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Smůla",
                    "strong": false,
                    "attrs": {
                      "lemma": "smůla"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "“",
                    "strong": false,
                    "attrs": {
                      "lemma": "\""
                    }
                  },
                  {
                    "type": "token",
                    "word": "Carl",
                    "strong": false,
                    "attrs": {
                      "lemma": "Carlo"
                    }
                  },
                  {
                    "type": "token",
                    "word": "zavrtěl",
                    "strong": false,
                    "attrs": {
                      "lemma": "zavrtět"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlavou",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Opravdu",
                    "strong": false,
                    "attrs": {
                      "lemma": "opravdu"
                    }
                  },
                  {
                    "type": "token",
                    "word": "úžasná",
                    "strong": false,
                    "attrs": {
                      "lemma": "úžasný"
                    }
                  },
                  {
                    "type": "token",
                    "word": "odměna",
                    "strong": false,
                    "attrs": {
                      "lemma": "odměna"
                    }
                  },
                  {
                    "type": "token",
                    "word": "za",
                    "strong": false,
                    "attrs": {
                      "lemma": "za"
                    }
                  },
                  {
                    "type": "token",
                    "word": "snahu",
                    "strong": false,
                    "attrs": {
                      "lemma": "snaha"
                    }
                  },
                  {
                    "type": "token",
                    "word": "chovat",
                    "strong": false,
                    "attrs": {
                      "lemma": "chovat"
                    }
                  },
                  {
                    "type": "token",
                    "word": "se",
                    "strong": false,
                    "attrs": {
                      "lemma": "se"
                    }
                  },
                  {
                    "type": "token",
                    "word": "zodpovědně",
                    "strong": false,
                    "attrs": {
                      "lemma": "zodpovědně"
                    }
                  }
                ],
                "ref": "#8429863",
                "props": {
                  "s.id": "adler_vzkazvlahv:1:612:1"
                }
              },
              {
                "text": [
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Heinrich",
                    "strong": false,
                    "attrs": {
                      "lemma": "Heinrich"
                    }
                  },
                  {
                    "type": "token",
                    "word": "pozvedl",
                    "strong": false,
                    "attrs": {
                      "lemma": "pozvednout"
                    }
                  },
                  {
                    "type": "token",
                    "word": "obočí",
                    "strong": false,
                    "attrs": {
                      "lemma": "obočí"
                    }
                  },
                  {
                    "type": "token",
                    "word": "a",
                    "strong": false,
                    "attrs": {
                      "lemma": "a"
                    }
                  },
                  {
                    "type": "token",
                    "word": "změřil",
                    "strong": false,
                    "attrs": {
                      "lemma": "změřit"
                    }
                  },
                  {
                    "type": "token",
                    "word": "si",
                    "strong": false,
                    "attrs": {
                      "lemma": "se"
                    }
                  },
                  {
                    "type": "token",
                    "word": "dotyčnou",
                    "strong": false,
                    "attrs": {
                      "lemma": "dotyčný"
                    }
                  },
                  {
                    "type": "token",
                    "word": "od",
                    "strong": false,
                    "attrs": {
                      "lemma": "od"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlavy",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": "k",
                    "strong": false,
                    "attrs": {
                      "lemma": "k"
                    }
                  },
                  {
                    "type": "token",
                    "word": "patě",
                    "strong": false,
                    "attrs": {
                      "lemma": "pata"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Načež",
                    "strong": false,
                    "attrs": {
                      "lemma": "načež"
                    }
                  },
                  {
                    "type": "token",
                    "word": "všechny",
                    "strong": false,
                    "attrs": {
                      "lemma": "všechen"
                    }
                  },
                  {
                    "type": "token",
                    "word": "požádal",
                    "strong": false,
                    "attrs": {
                      "lemma": "požádat"
                    }
                  },
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "aby",
                    "strong": false,
                    "attrs": {
                      "lemma": "aby|být"
                    }
                  },
                  {
                    "type": "token",
                    "word": "je",
                    "strong": false,
                    "attrs": {
                      "lemma": "oni"
                    }
                  }
                ],
                "ref": "#78229154",
                "props": {
                  "s.id": "obryn_partyzanem:1:368:1"
                }
              },
              {
                "text": [
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "“",
                    "strong": false,
                    "attrs": {
                      "lemma": "\""
                    }
                  },
                  {
                    "type": "token",
                    "word": "vymáčkl",
                    "strong": false,
                    "attrs": {
                      "lemma": "vymáčknout"
                    }
                  },
                  {
                    "type": "token",
                    "word": "ze",
                    "strong": false,
                    "attrs": {
                      "lemma": "z"
                    }
                  },
                  {
                    "type": "token",
                    "word": "sebe",
                    "strong": false,
                    "attrs": {
                      "lemma": "se"
                    }
                  },
                  {
                    "type": "token",
                    "word": "Émile",
                    "strong": false,
                    "attrs": {
                      "lemma": "Émile"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Adamsberg",
                    "strong": false,
                    "attrs": {
                      "lemma": "Adamsberg"
                    }
                  },
                  {
                    "type": "token",
                    "word": "zavrtěl",
                    "strong": false,
                    "attrs": {
                      "lemma": "zavrtět"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlavou",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": ":",
                    "strong": false,
                    "attrs": {
                      "lemma": ":"
                    }
                  },
                  {
                    "type": "token",
                    "word": "„",
                    "strong": false,
                    "attrs": {
                      "lemma": "\""
                    }
                  },
                  {
                    "type": "token",
                    "word": "Věděl",
                    "strong": false,
                    "attrs": {
                      "lemma": "vědět"
                    }
                  },
                  {
                    "type": "token",
                    "word": "o",
                    "strong": false,
                    "attrs": {
                      "lemma": "o"
                    }
                  },
                  {
                    "type": "token",
                    "word": "tom",
                    "strong": false,
                    "attrs": {
                      "lemma": "ten"
                    }
                  },
                  {
                    "type": "token",
                    "word": "jen",
                    "strong": false,
                    "attrs": {
                      "lemma": "jen"
                    }
                  },
                  {
                    "type": "token",
                    "word": "jeden",
                    "strong": false,
                    "attrs": {
                      "lemma": "jeden"
                    }
                  },
                  {
                    "type": "token",
                    "word": "člověk",
                    "strong": false,
                    "attrs": {
                      "lemma": "člověk"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  }
                ],
                "ref": "#14184097",
                "props": {
                  "s.id": "varga_zahadamrtv:1:1110:1"
                }
              },
              {
                "text": [
                  {
                    "type": "token",
                    "word": "mně",
                    "strong": false,
                    "attrs": {
                      "lemma": "já"
                    }
                  },
                  {
                    "type": "token",
                    "word": "mrazil",
                    "strong": false,
                    "attrs": {
                      "lemma": "mrazit"
                    }
                  },
                  {
                    "type": "token",
                    "word": "kosti",
                    "strong": false,
                    "attrs": {
                      "lemma": "kost"
                    }
                  },
                  {
                    "type": "token",
                    "word": "a",
                    "strong": false,
                    "attrs": {
                      "lemma": "a"
                    }
                  },
                  {
                    "type": "token",
                    "word": "kerým",
                    "strong": false,
                    "attrs": {
                      "lemma": "který"
                    }
                  },
                  {
                    "type": "token",
                    "word": "mi",
                    "strong": false,
                    "attrs": {
                      "lemma": "já"
                    }
                  },
                  {
                    "type": "token",
                    "word": "vstávaly",
                    "strong": false,
                    "attrs": {
                      "lemma": "vstávat"
                    }
                  },
                  {
                    "type": "token",
                    "word": "vlasy",
                    "strong": false,
                    "attrs": {
                      "lemma": "vlas"
                    }
                  },
                  {
                    "type": "token",
                    "word": "na",
                    "strong": false,
                    "attrs": {
                      "lemma": "na"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlavě",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "co",
                    "strong": false,
                    "attrs": {
                      "lemma": "co"
                    }
                  },
                  {
                    "type": "token",
                    "word": "mě",
                    "strong": false,
                    "attrs": {
                      "lemma": "já"
                    }
                  },
                  {
                    "type": "token",
                    "word": "nutil",
                    "strong": false,
                    "attrs": {
                      "lemma": "nutit"
                    }
                  },
                  {
                    "type": "token",
                    "word": "myslet",
                    "strong": false,
                    "attrs": {
                      "lemma": "myslet"
                    }
                  },
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "že",
                    "strong": false,
                    "attrs": {
                      "lemma": "že"
                    }
                  },
                  {
                    "type": "token",
                    "word": "sem",
                    "strong": false,
                    "attrs": {
                      "lemma": "sem"
                    }
                  },
                  {
                    "type": "token",
                    "word": "na",
                    "strong": false,
                    "attrs": {
                      "lemma": "na"
                    }
                  }
                ],
                "ref": "#9358835",
                "props": {
                  "s.id": "gambo_nekropolis:1:191:1"
                }
              },
              {
                "text": [
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "jak",
                    "strong": false,
                    "attrs": {
                      "lemma": "jak"
                    }
                  },
                  {
                    "type": "token",
                    "word": "si",
                    "strong": false,
                    "attrs": {
                      "lemma": "se"
                    }
                  },
                  {
                    "type": "token",
                    "word": "asi",
                    "strong": false,
                    "attrs": {
                      "lemma": "asi"
                    }
                  },
                  {
                    "type": "token",
                    "word": "pamatuješ",
                    "strong": false,
                    "attrs": {
                      "lemma": "pamatovat"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "“",
                    "strong": false,
                    "attrs": {
                      "lemma": "\""
                    }
                  },
                  {
                    "type": "token",
                    "word": "Bzučí",
                    "strong": false,
                    "attrs": {
                      "lemma": "bzučet"
                    }
                  },
                  {
                    "type": "token",
                    "word": "mi",
                    "strong": false,
                    "attrs": {
                      "lemma": "já"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlavě",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "protože",
                    "strong": false,
                    "attrs": {
                      "lemma": "protože"
                    }
                  },
                  {
                    "type": "token",
                    "word": "se",
                    "strong": false,
                    "attrs": {
                      "lemma": "se"
                    }
                  },
                  {
                    "type": "token",
                    "word": "s",
                    "strong": false,
                    "attrs": {
                      "lemma": "s"
                    }
                  },
                  {
                    "type": "token",
                    "word": "obrovskou",
                    "strong": false,
                    "attrs": {
                      "lemma": "obrovský"
                    }
                  },
                  {
                    "type": "token",
                    "word": "námahou",
                    "strong": false,
                    "attrs": {
                      "lemma": "námaha"
                    }
                  },
                  {
                    "type": "token",
                    "word": "snažím",
                    "strong": false,
                    "attrs": {
                      "lemma": "snažit"
                    }
                  },
                  {
                    "type": "token",
                    "word": "myslet",
                    "strong": false,
                    "attrs": {
                      "lemma": "myslet"
                    }
                  },
                  {
                    "type": "token",
                    "word": "rychleji",
                    "strong": false,
                    "attrs": {
                      "lemma": "rychle"
                    }
                  }
                ],
                "ref": "#2173002",
                "props": {
                  "s.id": "hanna_ztratyalzi:4:470:1"
                }
              },
              {
                "text": [
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "kdo",
                    "strong": false,
                    "attrs": {
                      "lemma": "kdo"
                    }
                  },
                  {
                    "type": "token",
                    "word": "se",
                    "strong": false,
                    "attrs": {
                      "lemma": "se"
                    }
                  },
                  {
                    "type": "token",
                    "word": "dá",
                    "strong": false,
                    "attrs": {
                      "lemma": "dát"
                    }
                  },
                  {
                    "type": "token",
                    "word": "koupit",
                    "strong": false,
                    "attrs": {
                      "lemma": "koupit"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "“",
                    "strong": false,
                    "attrs": {
                      "lemma": "\""
                    }
                  },
                  {
                    "type": "token",
                    "word": "Gabriella",
                    "strong": false,
                    "attrs": {
                      "lemma": "Gabriella"
                    }
                  },
                  {
                    "type": "token",
                    "word": "zdvihla",
                    "strong": false,
                    "attrs": {
                      "lemma": "zdvihnout"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlavu",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": "k",
                    "strong": false,
                    "attrs": {
                      "lemma": "k"
                    }
                  },
                  {
                    "type": "token",
                    "word": "nebi",
                    "strong": false,
                    "attrs": {
                      "lemma": "nebe"
                    }
                  },
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "jako",
                    "strong": false,
                    "attrs": {
                      "lemma": "jako"
                    }
                  },
                  {
                    "type": "token",
                    "word": "by",
                    "strong": false,
                    "attrs": {
                      "lemma": "být"
                    }
                  },
                  {
                    "type": "token",
                    "word": "si",
                    "strong": false,
                    "attrs": {
                      "lemma": "se"
                    }
                  },
                  {
                    "type": "token",
                    "word": "tam",
                    "strong": false,
                    "attrs": {
                      "lemma": "tam"
                    }
                  },
                  {
                    "type": "token",
                    "word": "mohla",
                    "strong": false,
                    "attrs": {
                      "lemma": "moci"
                    }
                  },
                  {
                    "type": "token",
                    "word": "přečíst",
                    "strong": false,
                    "attrs": {
                      "lemma": "přečíst"
                    }
                  }
                ],
                "ref": "#6377904",
                "props": {
                  "s.id": "rose_reinkarnov:2:36:1"
                }
              },
              {
                "text": [
                  {
                    "type": "token",
                    "word": "Ze",
                    "strong": false,
                    "attrs": {
                      "lemma": "z"
                    }
                  },
                  {
                    "type": "token",
                    "word": "sprchy",
                    "strong": false,
                    "attrs": {
                      "lemma": "sprcha"
                    }
                  },
                  {
                    "type": "token",
                    "word": "se",
                    "strong": false,
                    "attrs": {
                      "lemma": "se"
                    }
                  },
                  {
                    "type": "token",
                    "word": "řine",
                    "strong": false,
                    "attrs": {
                      "lemma": "řinout"
                    }
                  },
                  {
                    "type": "token",
                    "word": "voda",
                    "strong": false,
                    "attrs": {
                      "lemma": "voda"
                    }
                  },
                  {
                    "type": "token",
                    "word": "a",
                    "strong": false,
                    "attrs": {
                      "lemma": "a"
                    }
                  },
                  {
                    "type": "token",
                    "word": "Sofii",
                    "strong": false,
                    "attrs": {
                      "lemma": "Sofie"
                    }
                  },
                  {
                    "type": "token",
                    "word": "duní",
                    "strong": false,
                    "attrs": {
                      "lemma": "dunět"
                    }
                  },
                  {
                    "type": "token",
                    "word": "v",
                    "strong": false,
                    "attrs": {
                      "lemma": "v"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlavě",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": "Victoriin",
                    "strong": false,
                    "attrs": {
                      "lemma": "Victoriin"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlas",
                    "strong": false,
                    "attrs": {
                      "lemma": "hlas"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Jako",
                    "strong": false,
                    "attrs": {
                      "lemma": "jako"
                    }
                  },
                  {
                    "type": "token",
                    "word": "by",
                    "strong": false,
                    "attrs": {
                      "lemma": "být"
                    }
                  },
                  {
                    "type": "token",
                    "word": "se",
                    "strong": false,
                    "attrs": {
                      "lemma": "se"
                    }
                  },
                  {
                    "type": "token",
                    "word": "do",
                    "strong": false,
                    "attrs": {
                      "lemma": "do"
                    }
                  },
                  {
                    "type": "token",
                    "word": "ní",
                    "strong": false,
                    "attrs": {
                      "lemma": "on"
                    }
                  },
                  {
                    "type": "token",
                    "word": "vleptával",
                    "strong": false,
                    "attrs": {
                      "lemma": "vleptávat"
                    }
                  }
                ],
                "ref": "#17449108",
                "props": {
                  "s.id": "sund_vranidivka:1:3739:1"
                }
              },
              {
                "text": [
                  {
                    "type": "token",
                    "word": "dodavatel",
                    "strong": false,
                    "attrs": {
                      "lemma": "dodavatel"
                    }
                  },
                  {
                    "type": "token",
                    "word": "?",
                    "strong": false,
                    "attrs": {
                      "lemma": "?"
                    }
                  },
                  {
                    "type": "token",
                    "word": "Králova",
                    "strong": false,
                    "attrs": {
                      "lemma": "Králův"
                    }
                  },
                  {
                    "type": "token",
                    "word": "Huť",
                    "strong": false,
                    "attrs": {
                      "lemma": "huť"
                    }
                  },
                  {
                    "type": "token",
                    "word": "…",
                    "strong": false,
                    "attrs": {
                      "lemma": "..."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Panebože",
                    "strong": false,
                    "attrs": {
                      "lemma": "pánbůh"
                    }
                  },
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "letí",
                    "strong": false,
                    "attrs": {
                      "lemma": "letět"
                    }
                  },
                  {
                    "type": "token",
                    "word": "mi",
                    "strong": false,
                    "attrs": {
                      "lemma": "já"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlavou",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Jak",
                    "strong": false,
                    "attrs": {
                      "lemma": "jak"
                    }
                  },
                  {
                    "type": "token",
                    "word": "dlouho",
                    "strong": false,
                    "attrs": {
                      "lemma": "dlouho"
                    }
                  },
                  {
                    "type": "token",
                    "word": "tu",
                    "strong": false,
                    "attrs": {
                      "lemma": "tu"
                    }
                  },
                  {
                    "type": "token",
                    "word": "byl",
                    "strong": false,
                    "attrs": {
                      "lemma": "být"
                    }
                  },
                  {
                    "type": "token",
                    "word": "?",
                    "strong": false,
                    "attrs": {
                      "lemma": "?"
                    }
                  },
                  {
                    "type": "token",
                    "word": "Kolik",
                    "strong": false,
                    "attrs": {
                      "lemma": "kolik"
                    }
                  },
                  {
                    "type": "token",
                    "word": "set",
                    "strong": false,
                    "attrs": {
                      "lemma": "sto"
                    }
                  },
                  {
                    "type": "token",
                    "word": "let",
                    "strong": false,
                    "attrs": {
                      "lemma": "rok"
                    }
                  }
                ],
                "ref": "#20996017",
                "props": {
                  "s.id": "renci_veznena:1:1886:1"
                }
              },
              {
                "text": [
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Zpěvem",
                    "strong": false,
                    "attrs": {
                      "lemma": "zpěv"
                    }
                  },
                  {
                    "type": "token",
                    "word": "kukačky",
                    "strong": false,
                    "attrs": {
                      "lemma": "kukačka"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Večer",
                    "strong": false,
                    "attrs": {
                      "lemma": "večer"
                    }
                  },
                  {
                    "type": "token",
                    "word": "zemi",
                    "strong": false,
                    "attrs": {
                      "lemma": "země"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hnojí",
                    "strong": false,
                    "attrs": {
                      "lemma": "hnojit"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Rarach",
                    "strong": false,
                    "attrs": {
                      "lemma": "Rarach"
                    }
                  },
                  {
                    "type": "token",
                    "word": "Hlava",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": "skřeta",
                    "strong": false,
                    "attrs": {
                      "lemma": "skřet"
                    }
                  },
                  {
                    "type": "token",
                    "word": "břízy",
                    "strong": false,
                    "attrs": {
                      "lemma": "bříza"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Květem",
                    "strong": false,
                    "attrs": {
                      "lemma": "květ"
                    }
                  },
                  {
                    "type": "token",
                    "word": "louky",
                    "strong": false,
                    "attrs": {
                      "lemma": "louka"
                    }
                  },
                  {
                    "type": "token",
                    "word": "obklopena",
                    "strong": false,
                    "attrs": {
                      "lemma": "obklopit"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Ústa",
                    "strong": false,
                    "attrs": {
                      "lemma": "ústa"
                    }
                  },
                  {
                    "type": "token",
                    "word": "Slunce",
                    "strong": false,
                    "attrs": {
                      "lemma": "slunce"
                    }
                  }
                ],
                "ref": "#39728483",
                "props": {
                  "s.id": "denk_hranaohne:1:321:1"
                }
              },
              {
                "text": [
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Vstane",
                    "strong": false,
                    "attrs": {
                      "lemma": "vstát"
                    }
                  },
                  {
                    "type": "token",
                    "word": "a",
                    "strong": false,
                    "attrs": {
                      "lemma": "a"
                    }
                  },
                  {
                    "type": "token",
                    "word": "potichu",
                    "strong": false,
                    "attrs": {
                      "lemma": "potichu"
                    }
                  },
                  {
                    "type": "token",
                    "word": "odejde",
                    "strong": false,
                    "attrs": {
                      "lemma": "odejít"
                    }
                  },
                  {
                    "type": "token",
                    "word": "od",
                    "strong": false,
                    "attrs": {
                      "lemma": "od"
                    }
                  },
                  {
                    "type": "token",
                    "word": "stolu",
                    "strong": false,
                    "attrs": {
                      "lemma": "stůl"
                    }
                  },
                  {
                    "type": "token",
                    "word": "se",
                    "strong": false,
                    "attrs": {
                      "lemma": "s"
                    }
                  },
                  {
                    "type": "token",
                    "word": "sklopenou",
                    "strong": false,
                    "attrs": {
                      "lemma": "sklopený"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlavou",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": "a",
                    "strong": false,
                    "attrs": {
                      "lemma": "a"
                    }
                  },
                  {
                    "type": "token",
                    "word": "s",
                    "strong": false,
                    "attrs": {
                      "lemma": "s"
                    }
                  },
                  {
                    "type": "token",
                    "word": "tou",
                    "strong": false,
                    "attrs": {
                      "lemma": "ten"
                    }
                  },
                  {
                    "type": "token",
                    "word": "knížkou",
                    "strong": false,
                    "attrs": {
                      "lemma": "knížka"
                    }
                  },
                  {
                    "type": "token",
                    "word": "v",
                    "strong": false,
                    "attrs": {
                      "lemma": "v"
                    }
                  },
                  {
                    "type": "token",
                    "word": "ruce",
                    "strong": false,
                    "attrs": {
                      "lemma": "ruka"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Jako",
                    "strong": false,
                    "attrs": {
                      "lemma": "jako"
                    }
                  },
                  {
                    "type": "token",
                    "word": "zlomenej",
                    "strong": false,
                    "attrs": {
                      "lemma": "zlomený"
                    }
                  }
                ],
                "ref": "#13255015",
                "props": {
                  "s.id": "maher_pole:1:889:5"
                }
              },
              {
                "text": [
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "V",
                    "strong": false,
                    "attrs": {
                      "lemma": "v"
                    }
                  },
                  {
                    "type": "token",
                    "word": "noci",
                    "strong": false,
                    "attrs": {
                      "lemma": "noc"
                    }
                  },
                  {
                    "type": "token",
                    "word": "ve",
                    "strong": false,
                    "attrs": {
                      "lemma": "v"
                    }
                  },
                  {
                    "type": "token",
                    "word": "snu",
                    "strong": false,
                    "attrs": {
                      "lemma": "sen"
                    }
                  },
                  {
                    "type": "token",
                    "word": "někdy",
                    "strong": false,
                    "attrs": {
                      "lemma": "někdy"
                    }
                  },
                  {
                    "type": "token",
                    "word": "vídal",
                    "strong": false,
                    "attrs": {
                      "lemma": "vídat"
                    }
                  },
                  {
                    "type": "token",
                    "word": "jeho",
                    "strong": false,
                    "attrs": {
                      "lemma": "jeho"
                    }
                  },
                  {
                    "type": "token",
                    "word": "černou",
                    "strong": false,
                    "attrs": {
                      "lemma": "černý"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlavu",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "jak",
                    "strong": false,
                    "attrs": {
                      "lemma": "jak"
                    }
                  },
                  {
                    "type": "token",
                    "word": "se",
                    "strong": false,
                    "attrs": {
                      "lemma": "se"
                    }
                  },
                  {
                    "type": "token",
                    "word": "blíží",
                    "strong": false,
                    "attrs": {
                      "lemma": "blížit"
                    }
                  },
                  {
                    "type": "token",
                    "word": "k",
                    "strong": false,
                    "attrs": {
                      "lemma": "k"
                    }
                  },
                  {
                    "type": "token",
                    "word": "loďce",
                    "strong": false,
                    "attrs": {
                      "lemma": "loďka"
                    }
                  },
                  {
                    "type": "token",
                    "word": "a",
                    "strong": false,
                    "attrs": {
                      "lemma": "a"
                    }
                  },
                  {
                    "type": "token",
                    "word": "pak",
                    "strong": false,
                    "attrs": {
                      "lemma": "pak"
                    }
                  },
                  {
                    "type": "token",
                    "word": "mizí",
                    "strong": false,
                    "attrs": {
                      "lemma": "mizet"
                    }
                  }
                ],
                "ref": "#26275266",
                "props": {
                  "s.id": "endo_mlceni:1:1129:3"
                }
              },
              {
                "text": [
                  {
                    "type": "token",
                    "word": "je",
                    "strong": false,
                    "attrs": {
                      "lemma": "oni"
                    }
                  },
                  {
                    "type": "token",
                    "word": "podal",
                    "strong": false,
                    "attrs": {
                      "lemma": "podat"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "„",
                    "strong": false,
                    "attrs": {
                      "lemma": "\""
                    }
                  },
                  {
                    "type": "token",
                    "word": "Nerozumím",
                    "strong": false,
                    "attrs": {
                      "lemma": "rozumět"
                    }
                  },
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "“",
                    "strong": false,
                    "attrs": {
                      "lemma": "\""
                    }
                  },
                  {
                    "type": "token",
                    "word": "zakroutila",
                    "strong": false,
                    "attrs": {
                      "lemma": "zakroutit"
                    }
                  },
                  {
                    "type": "token",
                    "word": "Freya",
                    "strong": false,
                    "attrs": {
                      "lemma": "Freya"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlavou",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Jednou",
                    "strong": false,
                    "attrs": {
                      "lemma": "jeden"
                    }
                  },
                  {
                    "type": "token",
                    "word": "rukou",
                    "strong": false,
                    "attrs": {
                      "lemma": "ruka"
                    }
                  },
                  {
                    "type": "token",
                    "word": "uchopila",
                    "strong": false,
                    "attrs": {
                      "lemma": "uchopit"
                    }
                  },
                  {
                    "type": "token",
                    "word": "vak",
                    "strong": false,
                    "attrs": {
                      "lemma": "vak"
                    }
                  },
                  {
                    "type": "token",
                    "word": "a",
                    "strong": false,
                    "attrs": {
                      "lemma": "a"
                    }
                  },
                  {
                    "type": "token",
                    "word": "druhou",
                    "strong": false,
                    "attrs": {
                      "lemma": "druhý"
                    }
                  },
                  {
                    "type": "token",
                    "word": "si",
                    "strong": false,
                    "attrs": {
                      "lemma": "se"
                    }
                  },
                  {
                    "type": "token",
                    "word": "vzala",
                    "strong": false,
                    "attrs": {
                      "lemma": "vzít"
                    }
                  }
                ],
                "ref": "#6647324",
                "props": {
                  "s.id": "sussm_ztracenaoa:1:973:1"
                }
              },
              {
                "text": [
                  {
                    "type": "token",
                    "word": ".",
                    "strong": false,
                    "attrs": {
                      "lemma": "."
                    }
                  },
                  {
                    "type": "token",
                    "word": "Bezpečnostní",
                    "strong": false,
                    "attrs": {
                      "lemma": "bezpečnostní"
                    }
                  },
                  {
                    "type": "token",
                    "word": "prvek",
                    "strong": false,
                    "attrs": {
                      "lemma": "prvek"
                    }
                  },
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "který",
                    "strong": false,
                    "attrs": {
                      "lemma": "který"
                    }
                  },
                  {
                    "type": "token",
                    "word": "by",
                    "strong": false,
                    "attrs": {
                      "lemma": "být"
                    }
                  },
                  {
                    "type": "token",
                    "word": "měl",
                    "strong": false,
                    "attrs": {
                      "lemma": "mít"
                    }
                  },
                  {
                    "type": "token",
                    "word": "více",
                    "strong": false,
                    "attrs": {
                      "lemma": "hodně"
                    }
                  },
                  {
                    "type": "token",
                    "word": "ochránit",
                    "strong": false,
                    "attrs": {
                      "lemma": "ochránit"
                    }
                  },
                  {
                    "type": "token",
                    "word": "hlavy",
                    "strong": true,
                    "matchType": "kwic",
                    "attrs": {
                      "lemma": "hlava"
                    }
                  },
                  {
                    "type": "token",
                    "word": "jezdců",
                    "strong": false,
                    "attrs": {
                      "lemma": "jezdec"
                    }
                  },
                  {
                    "type": "token",
                    "word": ",",
                    "strong": false,
                    "attrs": {
                      "lemma": ","
                    }
                  },
                  {
                    "type": "token",
                    "word": "bude",
                    "strong": false,
                    "attrs": {
                      "lemma": "být"
                    }
                  },
                  {
                    "type": "token",
                    "word": "při",
                    "strong": false,
                    "attrs": {
                      "lemma": "při"
                    }
                  },
                  {
                    "type": "token",
                    "word": "závodech",
                    "strong": false,
                    "attrs": {
                      "lemma": "závod"
                    }
                  },
                  {
                    "type": "token",
                    "word": "F1",
                    "strong": false,
                    "attrs": {
                      "lemma": "F1"
                    }
                  },
                  {
                    "type": "token",
                    "word": "uveden",
                    "strong": false,
                    "attrs": {
                      "lemma": "uvést"
                    }
                  },
                  {
                    "type": "token",
                    "word": "do",
                    "strong": false,
                    "attrs": {
                      "lemma": "do"
                    }
                  },
                  {
                    "type": "token",
                    "word": "praxe",
                    "strong": false,
                    "attrs": {
                      "lemma": "praxe"
                    }
                  }
                ],
                "ref": "#88231733",
                "props": {
                  "s.id": "pr160729:69:8:1"
                }
              }
            ],
            "concSize": 72676,
            "corpusSize": 121826797,
            "ipm": 596.5518407251567,
            "resultType": "conc"
        },
    ],
    [
        {
            "entries": {
              "concSize": 72676,
              "corpusSize": 121826797,
              "freqs": [
                {
                  "word": "2018",
                  "freq": 7318,
                  "base": 16132615,
                  "ipm": 453.61523
                },
                {
                  "word": "2016",
                  "freq": 10046,
                  "base": 17929079,
                  "ipm": 560.3188
                },
                {
                  "word": "2019",
                  "freq": 4634,
                  "base": 11822369,
                  "ipm": 391.9688
                },
                {
                  "word": "2017",
                  "freq": 11200,
                  "base": 19839356,
                  "ipm": 564.5344
                },
                {
                  "word": "2015",
                  "freq": 8940,
                  "base": 17644046,
                  "ipm": 506.68652
                },
                {
                  "word": "2001",
                  "freq": 510,
                  "base": 386104,
                  "ipm": 1320.8876
                },
                {
                  "word": "2007",
                  "freq": 420,
                  "base": 686298,
                  "ipm": 611.97906
                },
                {
                  "word": "2003",
                  "freq": 121,
                  "base": 324759,
                  "ipm": 372.58398
                },
                {
                  "word": "2008",
                  "freq": 3394,
                  "base": 4095099,
                  "ipm": 828.7956
                },
                {
                  "word": "2009",
                  "freq": 2854,
                  "base": 3216945,
                  "ipm": 887.1771
                },
                {
                  "word": "1995",
                  "freq": 395,
                  "base": 315097,
                  "ipm": 1253.5822
                },
                {
                  "word": "1999",
                  "freq": 271,
                  "base": 399836,
                  "ipm": 677.77783
                },
                {
                  "word": "1996",
                  "freq": 65,
                  "base": 98473,
                  "ipm": 660.0794
                },
                {
                  "word": "2005",
                  "freq": 223,
                  "base": 648991,
                  "ipm": 343.6103
                },
                {
                  "word": "2004",
                  "freq": 221,
                  "base": 263512,
                  "ipm": 838.67145
                },
                {
                  "word": "2010",
                  "freq": 4171,
                  "base": 4934398,
                  "ipm": 845.2905
                },
                {
                  "word": "2011",
                  "freq": 2011,
                  "base": 2974202,
                  "ipm": 676.14777
                },
                {
                  "word": "2012",
                  "freq": 4138,
                  "base": 4981385,
                  "ipm": 830.6926
                },
                {
                  "word": "1997",
                  "freq": 289,
                  "base": 305381,
                  "ipm": 946.3588
                },
                {
                  "word": "2000",
                  "freq": 68,
                  "base": 204948,
                  "ipm": 331.79147
                },
                {
                  "word": "2002",
                  "freq": 46,
                  "base": 67665,
                  "ipm": 679.8197
                },
                {
                  "word": "2013",
                  "freq": 5631,
                  "base": 7196676,
                  "ipm": 782.4445
                },
                {
                  "word": "1998",
                  "freq": 338,
                  "base": 333078,
                  "ipm": 1014.77734
                },
                {
                  "word": "2006",
                  "freq": 341,
                  "base": 919116,
                  "ipm": 371.00867
                },
                {
                  "word": "2014",
                  "freq": 5031,
                  "base": 6107369,
                  "ipm": 823.759
                }
              ],
              "fcrit": ""
            },
            "chunkNum": 1,
            "totalChunks": 3
        }
    ],
    [
      {
        "concSize": 1384,
        "corpusSize": 6361707,
        "freqs": [
          {
            "word": "Z: žena",
            "freq": 752,
            "base": 3477226,
            "ipm": 216.26434
          },
          {
            "word": "M: muž",
            "freq": 632,
            "base": 2855090,
            "ipm": 221.35905
          },
          {
            "word": "Y",
            "freq": 0,
            "base": 29391,
            "ipm": 0
          }
        ],
        "fcrit": "sp.gender 0 0",
        "resultType": "freqs"
      }
    ],
    [
      {
        "context": {
          "text": [
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Martin_4834",
                "overlap": "ano"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/g/f/gf7rmxk7.mp3"
              }
            },
            {
              "type": "token",
              "word": "čoveče",
              "strong": false,
              "attrs": {
                "lemma": "člověk"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Zdeňka_4159",
                "overlap": "ano"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/g/f/gf7rmxk7.mp3"
              }
            },
            {
              "type": "token",
              "word": "ne",
              "strong": false,
              "attrs": {
                "lemma": "ne"
              }
            },
            {
              "type": "token",
              "word": "tam",
              "strong": false,
              "attrs": {
                "lemma": "tam"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Zdeňka_4159",
                "overlap": "ne"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/3/g/3gvdok5n.mp3"
              }
            },
            {
              "type": "token",
              "word": "vypadáš",
              "strong": false,
              "attrs": {
                "lemma": "vypadat"
              }
            },
            {
              "type": "token",
              "word": "právě",
              "strong": false,
              "attrs": {
                "lemma": "právě"
              }
            },
            {
              "type": "token",
              "word": "legračně",
              "strong": false,
              "attrs": {
                "lemma": "legračně"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Veronika_4157",
                "overlap": "ano"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/w/l/wly8wpid.mp3"
              }
            },
            {
              "type": "token",
              "word": "prej",
              "strong": false,
              "attrs": {
                "lemma": "prý"
              }
            },
            {
              "type": "token",
              "word": "jak",
              "strong": false,
              "attrs": {
                "lemma": "jak"
              }
            },
            {
              "type": "token",
              "word": "Ivan",
              "strong": false,
              "attrs": {
                "lemma": "Ivan"
              }
            },
            {
              "type": "token",
              "word": "+",
              "strong": false,
              "attrs": {
                "lemma": "+"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Martin_4834",
                "overlap": "ano"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/w/l/wly8wpid.mp3"
              }
            },
            {
              "type": "token",
              "word": "jo",
              "strong": false,
              "attrs": {
                "lemma": "jo"
              }
            },
            {
              "type": "token",
              "word": "(nesrozumitelné)",
              "strong": false,
              "attrs": {
                "lemma": "(nesrozumitelné)"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Zdeňka_4159",
                "overlap": "ano"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/w/i/wie3x2fm.mp3"
              }
            },
            {
              "type": "token",
              "word": "fakt",
              "strong": false,
              "attrs": {
                "lemma": "fakt"
              }
            },
            {
              "type": "token",
              "word": "dobrý",
              "strong": false,
              "attrs": {
                "lemma": "dobrý"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Veronika_4157",
                "overlap": "ano"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/w/i/wie3x2fm.mp3"
              }
            },
            {
              "type": "token",
              "word": "jak",
              "strong": false,
              "attrs": {
                "lemma": "jak"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Veronika_4157",
                "overlap": "ne"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/n/m/nmglaxob.mp3"
              }
            },
            {
              "type": "token",
              "word": "+",
              "strong": false,
              "attrs": {
                "lemma": "+"
              }
            },
            {
              "type": "token",
              "word": "Ivan",
              "strong": false,
              "attrs": {
                "lemma": "Ivan"
              }
            },
            {
              "type": "token",
              "word": "Mládek",
              "strong": false,
              "attrs": {
                "lemma": "Mládek"
              }
            },
            {
              "type": "token",
              "word": "řikali",
              "strong": false,
              "attrs": {
                "lemma": "říkat"
              }
            },
            {
              "type": "token",
              "word": "(nesrozumitelné)",
              "strong": false,
              "attrs": {
                "lemma": "(nesrozumitelné)"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Y",
                "overlap": "ne"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/p/t/pt3a6pfr.mp3"
              }
            },
            {
              "type": "token",
              "word": "(smích)",
              "strong": false,
              "attrs": {
                "lemma": "(smích)"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Martin_4834",
                "overlap": "ne"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/2/e/2edjn3x3.mp3"
              }
            },
            {
              "type": "token",
              "word": "taková",
              "strong": false,
              "attrs": {
                "lemma": "takový"
              }
            },
            {
              "type": "token",
              "word": ".",
              "strong": false,
              "attrs": {
                "lemma": "."
              }
            },
            {
              "type": "token",
              "word": "ani",
              "strong": false,
              "attrs": {
                "lemma": "ani"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/6/9/69f19011.mp3"
              }
            },
            {
              "type": "token",
              "word": "sem",
              "strong": false,
              "attrs": {
                "lemma": "být"
              }
            },
            {
              "type": "token",
              "word": "nevěděl",
              "strong": false,
              "attrs": {
                "lemma": "vědět"
              }
            },
            {
              "type": "token",
              "word": "že",
              "strong": false,
              "attrs": {
                "lemma": "že"
              }
            },
            {
              "type": "token",
              "word": "mám",
              "strong": false,
              "attrs": {
                "lemma": "mít"
              }
            },
            {
              "type": "token",
              "word": "takovou",
              "strong": false,
              "attrs": {
                "lemma": "takový"
              }
            },
            {
              "type": "token",
              "word": "velkou",
              "strong": false,
              "attrs": {
                "lemma": "velký"
              }
            },
            {
              "type": "token",
              "word": "hlavu",
              "strong": true,
              "attrs": {
                "lemma": "hlava"
              }
            },
            {
              "type": "token",
              "word": "sem",
              "strong": false,
              "attrs": {
                "lemma": "být"
              }
            },
            {
              "type": "token",
              "word": "myslel",
              "strong": false,
              "attrs": {
                "lemma": "myslet|myslit"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/p/0/p084aruq.mp3"
              }
            },
            {
              "type": "token",
              "word": "(smích)",
              "strong": false,
              "attrs": {
                "lemma": "(smích)"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Sára_4837",
                "overlap": "ne"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/f/y/fyv1ukcl.mp3"
              }
            },
            {
              "type": "token",
              "word": "že",
              "strong": false,
              "attrs": {
                "lemma": "že"
              }
            },
            {
              "type": "token",
              "word": "máš",
              "strong": false,
              "attrs": {
                "lemma": "mít"
              }
            },
            {
              "type": "token",
              "word": ".",
              "strong": false,
              "attrs": {
                "lemma": "."
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Sára_4837",
                "overlap": "ano"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/j/5/j5pbvcd0.mp3"
              }
            },
            {
              "type": "token",
              "word": "má",
              "strong": false,
              "attrs": {
                "lemma": "mít"
              }
            },
            {
              "type": "token",
              "word": "manželka",
              "strong": false,
              "attrs": {
                "lemma": "manželka"
              }
            },
            {
              "type": "token",
              "word": "má",
              "strong": false,
              "attrs": {
                "lemma": "mít"
              }
            },
            {
              "type": "token",
              "word": "hlavu",
              "strong": false,
              "attrs": {
                "lemma": "hlava"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Martin_4834",
                "overlap": "ano"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/j/5/j5pbvcd0.mp3"
              }
            },
            {
              "type": "token",
              "word": "(nesrozumitelné)",
              "strong": false,
              "attrs": {
                "lemma": "(nesrozumitelné)"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Sára_4837",
                "overlap": "ano"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/0/k/0khrbgzj.mp3"
              }
            },
            {
              "type": "token",
              "word": "jako",
              "strong": false,
              "attrs": {
                "lemma": "jako"
              }
            },
            {
              "type": "token",
              "word": "kuželka",
              "strong": false,
              "attrs": {
                "lemma": "kuželka"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Zdeňka_4159",
                "overlap": "ano"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/0/k/0khrbgzj.mp3"
              }
            },
            {
              "type": "token",
              "word": "(nesrozumitelné)",
              "strong": false,
              "attrs": {
                "lemma": "(nesrozumitelné)"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Martin_4834",
                "overlap": "ano"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/h/e/herhd3oz.mp3"
              }
            },
            {
              "type": "token",
              "word": "já",
              "strong": false,
              "attrs": {
                "lemma": "já"
              }
            },
            {
              "type": "token",
              "word": "proto",
              "strong": false,
              "attrs": {
                "lemma": "proto"
              }
            },
            {
              "type": "token",
              "word": "sem",
              "strong": false,
              "attrs": {
                "lemma": "být"
              }
            },
            {
              "type": "token",
              "word": "jako",
              "strong": false,
              "attrs": {
                "lemma": "jako"
              }
            },
            {
              "type": "token",
              "word": "furt",
              "strong": false,
              "attrs": {
                "lemma": "furt"
              }
            },
            {
              "type": "token",
              "word": "nemohl",
              "strong": false,
              "attrs": {
                "lemma": "moci"
              }
            },
            {
              "type": "token",
              "word": "(nesrozumitelné)",
              "strong": false,
              "attrs": {
                "lemma": "(nesrozumitelné)"
              }
            },
            {
              "type": "token",
              "word": "na",
              "strong": false,
              "attrs": {
                "lemma": "na"
              }
            },
            {
              "type": "token",
              "word": "sebe",
              "strong": false,
              "attrs": {
                "lemma": "se"
              }
            },
            {
              "type": "token",
              "word": "jo",
              "strong": false,
              "attrs": {
                "lemma": "jo"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Zdeňka_4159",
                "overlap": "ano"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/h/e/herhd3oz.mp3"
              }
            },
            {
              "type": "token",
              "word": "(nesrozumitelné)",
              "strong": false,
              "attrs": {
                "lemma": "(nesrozumitelné)"
              }
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "seg"
            },
            {
              "type": "markup",
              "structureType": "close",
              "name": "sp"
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "sp",
              "attrs": {
                "nickname": "Zdeňka_4159",
                "overlap": "ne"
              }
            },
            {
              "type": "markup",
              "structureType": "open",
              "name": "seg",
              "attrs": {
                "soundfile": "oral2013/q/6/q6swq3yn.mp3"
              }
            },
            {
              "type": "token",
              "word": "to",
              "strong": false,
              "attrs": {
                "lemma": "ten"
              }
            },
            {
              "type": "token",
              "word": "je",
              "strong": false,
              "attrs": {
                "lemma": "být"
              }
            },
            {
              "type": "token",
              "word": "taky",
              "strong": false,
              "attrs": {
                "lemma": "taky"
              }
            },
            {
              "type": "token",
              "word": "pěkný",
              "strong": false,
              "attrs": {
                "lemma": "pěkný"
              }
            }
          ],
          "alignedText": null,
          "ref": "#3411688"
        },
        "resultType": "tokenContext"
      }
    ],
    [
      {
        "concSize": 1384,
        "corpusSize": 6361707,
        "freqs": [
          {
            "word": "středočeská",
            "freq": 447,
            "base": 2155505,
            "ipm": 207.37599
          },
          {
            "word": "severovýchodočeská",
            "freq": 291,
            "base": 1170854,
            "ipm": 248.53653
          },
          {
            "word": "středomoravská",
            "freq": 148,
            "base": 874753,
            "ipm": 169.19063
          },
          {
            "word": "pohraničí české",
            "freq": 148,
            "base": 568470,
            "ipm": 260.34793
          },
          {
            "word": "slezská",
            "freq": 84,
            "base": 292150,
            "ipm": 287.52353
          },
          {
            "word": "východomoravská",
            "freq": 72,
            "base": 364947,
            "ipm": 197.28891
          },
          {
            "word": "západočeská",
            "freq": 65,
            "base": 369985,
            "ipm": 175.6828
          },
          {
            "word": "jihočeská",
            "freq": 58,
            "base": 297619,
            "ipm": 194.88004
          },
          {
            "word": "česko-moravská",
            "freq": 32,
            "base": 122521,
            "ipm": 261.17972
          },
          {
            "word": "pohraničí moravské",
            "freq": 30,
            "base": 68870,
            "ipm": 435.6033
          },
          {
            "word": "zahraničí",
            "freq": 5,
            "base": 35159,
            "ipm": 142.21109
          },
          {
            "word": "neznámé",
            "freq": 4,
            "base": 11483,
            "ipm": 348.34103
          },
          {
            "word": "Y",
            "freq": 0,
            "base": 29391,
            "ipm": 0
          }
        ],
        "fcrit": "sp.reg_current 0 0",
        "resultType": "freqs"
      }
    ]
];