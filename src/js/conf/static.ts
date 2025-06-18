/*
 * Copyright 2025 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2025 Institute of the Czech National Corpus,
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
import { List, pipe } from 'cnc-tskit';
import { GroupLayoutConfig, LayoutsConfig } from './index.js';
import { QueryType } from '../query/index.js';


export const queriesConf = [
  {word: 'hlava', lemma: 'hlava', pos: ['N']},
  {word: 'ruka', lemma: 'ruka', pos: ['N']},
  {word: 'noha', lemma: 'noha', pos: ['N']},
]

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
    wordSim: {
        tileType: "WordSimTile",
        useDataStream: true,
        apiURL: "---",
        maxResultItems: 20,
        minMatchFreq: 0,
    },
    translations: {
        tileType: "TranslationsTile",
        apiURL: "http://localhost/treq",
        useDataStream: true,
        primaryPackage: "CORE",
        srchPackages: {
            en: [
                "SYNDICATE",
                "CORE",
                "EUROPARL",
                "PRESSEUROP",
                "SUBTITLES"
            ]
        },
        backlink:{
            url: "http://treq.korpus.cz/index.php"
        },
    },
    treqSubsets: {
        tileType: "TreqSubsetsTile",
        apiURL: "http://localhost/treq",
        useDataStream: true,
        primaryPackage: "CORE",
        srchPackages: {
            en: [
                {packages: ["ACQUIS"]},
                {packages: ["CORE"]},
                {packages: ["EUROPARL"]},
                {packages: ["SUBTITLES"]}
            ]
        },
        backlink:{
            url: "http://treq.korpus.cz/index.php"
        },
    }
};

export const layoutConf: LayoutsConfig = {
    single: {
        groups: [
            {
                groupLabel: "Frequency information",
                tiles: [
                    {tile: 'wordFreq', width: 1},
                    {tile: 'mergeCorpFreq', width: 1},
                    {tile: 'wordForms', width: 1},
                ]
            },
            {
                groupLabel: "Written language",
                tiles: [
                    {tile: 'colloc', width: 1},
                    {tile: 'concordance', width: 2},
                    {tile: 'timeDistrib', width: 2},
                    {tile: 'wordSim', width: 1},
                ]
            },
            {
                groupLabel: "Spoken language",
                tiles: [
                    {tile: 'freqBar', width: 3},
                    {tile: 'speeches', width: 1},
                    {tile: 'geoAreas', width: 2},
                ]
            },
        ],
        mainPosAttr: 'pos',
    },
    cmp: {
        groups: [
            {
                groupLabel: "Tile examples",
                tiles: [
                    {tile: 'wordFreq', width: 1},
                    {tile: 'mergeCorpFreq', width: 1},
                    {tile: 'freqBar', width: 1},
                    {tile: 'colloc', width: 3},
                    {tile: 'concordance', width: 3},
                    {tile: 'timeDistrib', width: 3},
                    {tile: 'geoAreas', width: 3},
                ]
            }
        ],
        mainPosAttr: 'pos',
    },
    translat: {
        targetLanguages: [
            {
                code: "en",
                label: "English",
            }
        ],
        groups: [
            {
                groupLabel: "Translations",
                tiles: [
                    {tile: 'translations', width: 1},
                    {tile: 'treqSubsets', width: 2},
                ]
            },
        ],
        mainPosAttr: 'pos',
    }
};

export function prepareTileData(queryType:QueryType):Array<Array<any>> {  
  return pipe(
    layoutConf[queryType]['groups'] as GroupLayoutConfig[],
    List.flatMap(v => v.tiles),
    List.map(v => tileDataConf[v.tile]),
  );
}

const tileDataConf: {[key:string]:Array<any>} = {
    wordFreq: [
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
        {
          "matches": [
            {
              "_id": "000000",
              "lemma": "ruka",
              "forms": [
                {
                  "word": "-",
                  "count": 66547,
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
              "count": 66547,
              "ipm": 0.001539560590293446,
              "ngramSize": 1,
              "simFreqScore": 37602.5
            },
            {
              "_id": "000001",
              "lemma": "jak",
              "forms": [
                {
                  "word": "-",
                  "count": 69447,
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
              "count": 69447,
              "ipm": 0.0016066519048808954,
              "ngramSize": 1,
              "simFreqScore": 37840.69921875
            },
            {
              "_id": "000002",
              "lemma": "tam",
              "forms": [
                {
                  "word": "-",
                  "count": 72434,
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
              "count": 72434,
              "ipm": 0.0016757559589059682,
              "ngramSize": 1,
              "simFreqScore": 37856.1015625
            },
            {
              "_id": "000003",
              "lemma": "každý",
              "forms": [
                {
                  "word": "-",
                  "count": 69495,
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
              "count": 69495,
              "ipm": 0.001607762381811998,
              "ngramSize": 1,
              "simFreqScore": 38279.3984375
            },
            {
              "_id": "000004",
              "lemma": "čas",
              "forms": [
                {
                  "word": "-",
                  "count": 71314,
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
              "count": 71314,
              "ipm": 0.001649844830513574,
              "ngramSize": 1,
              "simFreqScore": 39185.30078125
            },
            {
              "_id": "000005",
              "lemma": "stát",
              "forms": [
                {
                  "word": "-",
                  "count": 71395,
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
              "count": 71395,
              "ipm": 0.0016517187603348098,
              "ngramSize": 1,
              "simFreqScore": 39838.80078125
            },
            {
              "_id": "000006",
              "lemma": "sám",
              "forms": [
                {
                  "word": "-",
                  "count": 76120,
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
              "count": 76120,
              "ipm": 0.0017610313332402229,
              "ngramSize": 1,
              "simFreqScore": 39912.80078125
            },
            {
              "_id": "000007",
              "lemma": "jeden",
              "forms": [
                {
                  "word": "-",
                  "count": 69915,
                  "arf": 0
                }
              ],
              "sublemmas": [
                {
                  "value": "-",
                  "count": 1
                }
              ],
              "pos": "C",
              "is_pname": false,
              "count": 69915,
              "ipm": 0.001617479054959146,
              "ngramSize": 1,
              "simFreqScore": 40060.1015625
            },
            {
              "_id": "000008",
              "lemma": "dát",
              "forms": [
                {
                  "word": "-",
                  "count": 74677,
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
              "count": 74677,
              "ipm": 0.0017276476204989507,
              "ngramSize": 1,
              "simFreqScore": 40836.69921875
            },
            {
              "_id": "000009",
              "lemma": "pak",
              "forms": [
                {
                  "word": "-",
                  "count": 76177,
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
              "count": 76177,
              "ipm": 0.0017623500245959073,
              "ngramSize": 1,
              "simFreqScore": 42116.1015625
            },
            {
              "_id": "00000a",
              "lemma": "snad",
              "forms": [
                {
                  "word": "-",
                  "count": 70519,
                  "arf": 0
                }
              ],
              "sublemmas": [
                {
                  "value": "-",
                  "count": 1
                }
              ],
              "pos": "T",
              "is_pname": false,
              "count": 70519,
              "ipm": 0.001631452556342187,
              "ngramSize": 1,
              "simFreqScore": 37116.80078125
            },
            {
              "_id": "00000b",
              "lemma": "ze",
              "forms": [
                {
                  "word": "-",
                  "count": 62655,
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
              "count": 62655,
              "ipm": 0.001449519419129876,
              "ngramSize": 1,
              "simFreqScore": 36853.19921875
            },
            {
              "_id": "00000c",
              "lemma": "duše",
              "forms": [
                {
                  "word": "-",
                  "count": 69189,
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
              "count": 69189,
              "ipm": 0.001600683091376219,
              "ngramSize": 1,
              "simFreqScore": 36653
            },
            {
              "_id": "00000d",
              "lemma": "teď",
              "forms": [
                {
                  "word": "-",
                  "count": 67454,
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
              "count": 67454,
              "ipm": 0.0015605439773040725,
              "ngramSize": 1,
              "simFreqScore": 36116.3984375
            },
            {
              "_id": "00000e",
              "lemma": "nic",
              "forms": [
                {
                  "word": "-",
                  "count": 65092,
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
              "count": 65092,
              "ipm": 0.0015058992583193982,
              "ngramSize": 1,
              "simFreqScore": 35903.30078125
            },
            {
              "_id": "00000f",
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
              "_id": "00000g",
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
              "_id": "00000h",
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
              "_id": "00000i",
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
            }
          ]
        },
        {
          "matches": [
            {
              "_id": "000000",
              "lemma": "noha",
              "forms": [
                {
                  "word": "-",
                  "count": 25186,
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
              "count": 25186,
              "ipm": 0.0005826764997239655,
              "ngramSize": 1,
              "simFreqScore": 14246.2001953125
            },
            {
              "_id": "000001",
              "lemma": "dítě",
              "forms": [
                {
                  "word": "-",
                  "count": 27006,
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
              "count": 27006,
              "ipm": 0.0006247820833616062,
              "ngramSize": 1,
              "simFreqScore": 14282.099609375
            },
            {
              "_id": "000002",
              "lemma": "další",
              "forms": [
                {
                  "word": "-",
                  "count": 26166,
                  "arf": 0
                }
              ],
              "sublemmas": [
                {
                  "value": "-",
                  "count": 1
                }
              ],
              "pos": "A",
              "is_pname": false,
              "count": 26166,
              "ipm": 0.0006053487370673105,
              "ngramSize": 1,
              "simFreqScore": 14349.400390625
            },
            {
              "_id": "000003",
              "lemma": "někdo",
              "forms": [
                {
                  "word": "-",
                  "count": 26887,
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
              "count": 26887,
              "ipm": 0.0006220290259699142,
              "ngramSize": 1,
              "simFreqScore": 14403.099609375
            },
            {
              "_id": "000004",
              "lemma": "dál",
              "forms": [
                {
                  "word": "-",
                  "count": 27358,
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
              "count": 27358,
              "ipm": 0.0006329255808563587,
              "ngramSize": 1,
              "simFreqScore": 14408
            },
            {
              "_id": "000005",
              "lemma": "štěstí",
              "forms": [
                {
                  "word": "-",
                  "count": 27368,
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
              "count": 27368,
              "ipm": 0.000633156930217005,
              "ngramSize": 1,
              "simFreqScore": 14411.599609375
            },
            {
              "_id": "000006",
              "lemma": "padat",
              "forms": [
                {
                  "word": "-",
                  "count": 26837,
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
              "count": 26837,
              "ipm": 0.0006208722791666824,
              "ngramSize": 1,
              "simFreqScore": 14481.400390625
            },
            {
              "_id": "000007",
              "lemma": "pohled",
              "forms": [
                {
                  "word": "-",
                  "count": 26517,
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
              "count": 26517,
              "ipm": 0.0006134690996259983,
              "ngramSize": 1,
              "simFreqScore": 14672.400390625
            },
            {
              "_id": "000008",
              "lemma": "myslet",
              "forms": [
                {
                  "word": "-",
                  "count": 27245,
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
              "count": 27245,
              "ipm": 0.0006303113330810545,
              "ngramSize": 1,
              "simFreqScore": 14738.900390625
            },
            {
              "_id": "000009",
              "lemma": "tak",
              "forms": [
                {
                  "word": "-",
                  "count": 27178,
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
              "count": 27178,
              "ipm": 0.0006287612923647238,
              "ngramSize": 1,
              "simFreqScore": 14750.7001953125
            },
            {
              "_id": "00000a",
              "lemma": "člověk",
              "forms": [
                {
                  "word": "-",
                  "count": 27333,
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
              "count": 27333,
              "ipm": 0.0006323472074547427,
              "ngramSize": 1,
              "simFreqScore": 14213.2001953125
            },
            {
              "_id": "00000b",
              "lemma": "konec",
              "forms": [
                {
                  "word": "-",
                  "count": 25336,
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
              "count": 25336,
              "ipm": 0.0005861467401336611,
              "ngramSize": 1,
              "simFreqScore": 14137.900390625
            },
            {
              "_id": "00000c",
              "lemma": "krása",
              "forms": [
                {
                  "word": "-",
                  "count": 26330,
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
              "count": 26330,
              "ipm": 0.0006091428665819111,
              "ngramSize": 1,
              "simFreqScore": 14125.2998046875
            },
            {
              "_id": "00000d",
              "lemma": "síla",
              "forms": [
                {
                  "word": "-",
                  "count": 25637,
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
              "count": 25637,
              "ipm": 0.0005931103558891171,
              "ngramSize": 1,
              "simFreqScore": 14086.5
            },
            {
              "_id": "00000e",
              "lemma": "starý",
              "forms": [
                {
                  "word": "-",
                  "count": 25764,
                  "arf": 0
                }
              ],
              "sublemmas": [
                {
                  "value": "-",
                  "count": 1
                }
              ],
              "pos": "A",
              "is_pname": false,
              "count": 25764,
              "ipm": 0.0005960484927693261,
              "ngramSize": 1,
              "simFreqScore": 14054.7001953125
            },
            {
              "_id": "00000f",
              "lemma": "pár",
              "forms": [
                {
                  "word": "-",
                  "count": 26619,
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
              "count": 26619,
              "ipm": 0.0006158288631045914,
              "ngramSize": 1,
              "simFreqScore": 14054.2001953125
            },
            {
              "_id": "00000g",
              "lemma": "okno",
              "forms": [
                {
                  "word": "-",
                  "count": 26262,
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
              "count": 26262,
              "ipm": 0.0006075696909295157,
              "ngramSize": 1,
              "simFreqScore": 14017.7998046875
            },
            {
              "_id": "00000h",
              "lemma": "naděje",
              "forms": [
                {
                  "word": "-",
                  "count": 27170,
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
              "count": 27170,
              "ipm": 0.0006285762128762067,
              "ngramSize": 1,
              "simFreqScore": 14004.7998046875
            },
            {
              "_id": "00000i",
              "lemma": "nový",
              "forms": [
                {
                  "word": "-",
                  "count": 24612,
                  "arf": 0
                }
              ],
              "sublemmas": [
                {
                  "value": "-",
                  "count": 1
                }
              ],
              "pos": "A",
              "is_pname": false,
              "count": 24612,
              "ipm": 0.0005693970464228635,
              "ngramSize": 1,
              "simFreqScore": 13988.7998046875
            },
            {
              "_id": "00000j",
              "lemma": "strom",
              "forms": [
                {
                  "word": "-",
                  "count": 26225,
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
              "count": 26225,
              "ipm": 0.0006067136982951241,
              "ngramSize": 1,
              "simFreqScore": 13955.599609375
            }
          ]
        }
    ],
    mergeCorpFreq: [
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
        {
          "parts": [
            {
              "concSize": 91336,
              "corpusSize": 121826797,
              "freqs": [
                {
                  "word": "FIC: beletrie",
                  "freq": 64800,
                  "base": 41591113,
                  "ipm": 1558.0251
                },
                {
                  "word": "NMG: publicistika",
                  "freq": 13586,
                  "base": 39966492,
                  "ipm": 339.93478
                },
                {
                  "word": "NFC: oborová literatura",
                  "freq": 12950,
                  "base": 40269192,
                  "ipm": 321.58582
                }
              ],
              "fcrit": "doc.txtype_group 0 0"
            },
            {
              "concSize": 1455,
              "corpusSize": 6361707,
              "freqs": [
                {
                  "word": "ruka",
                  "freq": 1455,
                  "base": 6361707,
                  "ipm": 228.7122
                }
              ],
              "fcrit": "lemma/e 0~0>0/i 0~0>0"
            }
          ]
        },
        {
          "parts": [
            {
              "concSize": 32504,
              "corpusSize": 121826797,
              "freqs": [
                {
                  "word": "FIC: beletrie",
                  "freq": 21359,
                  "base": 41591113,
                  "ipm": 513.54724
                },
                {
                  "word": "NMG: publicistika",
                  "freq": 6537,
                  "base": 39966492,
                  "ipm": 163.56201
                },
                {
                  "word": "NFC: oborová literatura",
                  "freq": 4608,
                  "base": 40269192,
                  "ipm": 114.42991
                }
              ],
              "fcrit": "doc.txtype_group 0 0"
            },
            {
              "concSize": 1375,
              "corpusSize": 6361707,
              "freqs": [
                {
                  "word": "noha",
                  "freq": 1375,
                  "base": 6361707,
                  "ipm": 216.13696
                }
              ],
              "fcrit": "lemma/e 0~0>0/i 0~0>0"
            }
          ]
        },
    ],
    wordForms: [
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
    colloc: [
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
        {
          "corpusSize": 121826797,
          "concSize": 0,
          "subcSize": 121826797,
          "colls": [
            {
              "word": "držet",
              "score": 10.2123,
              "freq": 4302
            },
            {
              "word": "vzít",
              "score": 9.3968,
              "freq": 2801
            },
            {
              "word": "zvednout",
              "score": 9.3814,
              "freq": 2242
            },
            {
              "word": "položit",
              "score": 9.3632,
              "freq": 2123
            },
            {
              "word": "pravý",
              "score": 9.1558,
              "freq": 1892
            },
            {
              "word": "natáhnout",
              "score": 9.1298,
              "freq": 1659
            },
            {
              "word": "levý",
              "score": 8.9747,
              "freq": 1530
            },
            {
              "word": "mávnout",
              "score": 8.9318,
              "freq": 1393
            },
            {
              "word": "ruka",
              "score": 8.8654,
              "freq": 2600
            },
            {
              "word": "podat",
              "score": 8.7388,
              "freq": 1344
            }
          ],
          "resultType": "coll",
          "measure": "logDice",
          "srchRange": [
            3,
            3
          ]
        },
        {
          "corpusSize": 121826797,
          "concSize": 0,
          "subcSize": 121826797,
          "colls": [
            {
              "word": "pod",
              "score": 9.1729,
              "freq": 1970
            },
            {
              "word": "vzhůru",
              "score": 9.1342,
              "freq": 653
            },
            {
              "word": "ruka",
              "score": 8.664,
              "freq": 1533
            },
            {
              "word": "noha",
              "score": 8.6465,
              "freq": 795
            },
            {
              "word": "postavit",
              "score": 8.6372,
              "freq": 658
            },
            {
              "word": "levý",
              "score": 8.6314,
              "freq": 494
            },
            {
              "word": "bosý",
              "score": 8.5628,
              "freq": 392
            },
            {
              "word": "pravý",
              "score": 8.3162,
              "freq": 485
            },
            {
              "word": "prst",
              "score": 8.0898,
              "freq": 421
            },
            {
              "word": "zvednout",
              "score": 7.9301,
              "freq": 382
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
    concordance: [
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
        {
          "lines": [
            {
              "text": [
                {
                  "type": "token",
                  "word": "začala",
                  "strong": false,
                  "attrs": {
                    "lemma": "začít"
                  }
                },
                {
                  "type": "token",
                  "word": "pálit",
                  "strong": false,
                  "attrs": {
                    "lemma": "pálit"
                  }
                },
                {
                  "type": "token",
                  "word": "kůže",
                  "strong": false,
                  "attrs": {
                    "lemma": "kůže"
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
                  "word": "chvílemi",
                  "strong": false,
                  "attrs": {
                    "lemma": "chvíle"
                  }
                },
                {
                  "type": "token",
                  "word": "jsem",
                  "strong": false,
                  "attrs": {
                    "lemma": "být"
                  }
                },
                {
                  "type": "token",
                  "word": "necítila",
                  "strong": false,
                  "attrs": {
                    "lemma": "cítit"
                  }
                },
                {
                  "type": "token",
                  "word": "prsty",
                  "strong": false,
                  "attrs": {
                    "lemma": "prst"
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
                  "word": "rukou",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "ruka"
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
                  "word": "brnělo",
                  "strong": false,
                  "attrs": {
                    "lemma": "brnět"
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
                  "word": "ucho",
                  "strong": false,
                  "attrs": {
                    "lemma": "ucho"
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
                  "word": "vypráví",
                  "strong": false,
                  "attrs": {
                    "lemma": "vyprávět"
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
                  "word": "Potíže",
                  "strong": false,
                  "attrs": {
                    "lemma": "potíž"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#111552106",
              "props": {
                "s.id": "blze1827:27:4:5"
              }
            },
            {
              "text": [
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
                  "word": "řekl",
                  "strong": false,
                  "attrs": {
                    "lemma": "říci"
                  }
                },
                {
                  "type": "token",
                  "word": "Nils",
                  "strong": false,
                  "attrs": {
                    "lemma": "Nils"
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
                  "word": "Jestli",
                  "strong": false,
                  "attrs": {
                    "lemma": "jestli"
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
                  "word": "dáme",
                  "strong": false,
                  "attrs": {
                    "lemma": "dát"
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
                  "word": "ruky",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "ruka"
                  }
                },
                {
                  "type": "token",
                  "word": "tamburínu",
                  "strong": false,
                  "attrs": {
                    "lemma": "tamburína"
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
                  "word": "půjde",
                  "strong": false,
                  "attrs": {
                    "lemma": "jít"
                  }
                },
                {
                  "type": "token",
                  "word": "rytmus",
                  "strong": false,
                  "attrs": {
                    "lemma": "rytmus"
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
                  "word": "kytek",
                  "strong": false,
                  "attrs": {
                    "lemma": "kytka"
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
                  "word": "„",
                  "strong": false,
                  "attrs": {
                    "lemma": "\""
                  }
                }
              ],
              "alignedText": null,
              "ref": "#24905254",
              "props": {
                "s.id": "solbe_valkaproti:1:1071:2"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "platby",
                  "strong": false,
                  "attrs": {
                    "lemma": "platba"
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
                  "word": "podivné",
                  "strong": false,
                  "attrs": {
                    "lemma": "podivný"
                  }
                },
                {
                  "type": "token",
                  "word": "dění",
                  "strong": false,
                  "attrs": {
                    "lemma": "dění"
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
                  "word": "Egyptě",
                  "strong": false,
                  "attrs": {
                    "lemma": "Egypt"
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
                  "word": "“",
                  "strong": false,
                  "attrs": {
                    "lemma": "\""
                  }
                },
                {
                  "type": "token",
                  "word": "Rozhodila",
                  "strong": false,
                  "attrs": {
                    "lemma": "rozhodit"
                  }
                },
                {
                  "type": "token",
                  "word": "ruce",
                  "strong": true,
                  "matchType": "kwic",
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
                  "word": "„",
                  "strong": false,
                  "attrs": {
                    "lemma": "\""
                  }
                },
                {
                  "type": "token",
                  "word": "Kdo",
                  "strong": false,
                  "attrs": {
                    "lemma": "kdo"
                  }
                },
                {
                  "type": "token",
                  "word": "ví",
                  "strong": false,
                  "attrs": {
                    "lemma": "vědět"
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
                  "word": "to",
                  "strong": false,
                  "attrs": {
                    "lemma": "ten"
                  }
                },
                {
                  "type": "token",
                  "word": "prozradilo",
                  "strong": false,
                  "attrs": {
                    "lemma": "prozradit"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#6752447",
              "props": {
                "s.id": "sussm_ztracenaoa:1:3583:1"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "rozměrného",
                  "strong": false,
                  "attrs": {
                    "lemma": "rozměrný"
                  }
                },
                {
                  "type": "token",
                  "word": "koberce",
                  "strong": false,
                  "attrs": {
                    "lemma": "koberec"
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
                  "word": "roztáhli",
                  "strong": false,
                  "attrs": {
                    "lemma": "roztáhnout"
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
                  "word": "prknech",
                  "strong": false,
                  "attrs": {
                    "lemma": "prkno"
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
                  "word": "jednu",
                  "strong": false,
                  "attrs": {
                    "lemma": "jeden"
                  }
                },
                {
                  "type": "token",
                  "word": "ruku",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "ruka"
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
                  "word": "bok",
                  "strong": false,
                  "attrs": {
                    "lemma": "bok"
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
                  "word": "Řekla",
                  "strong": false,
                  "attrs": {
                    "lemma": "říci"
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
                  "word": "Chtěla",
                  "strong": false,
                  "attrs": {
                    "lemma": "chtít"
                  }
                },
                {
                  "type": "token",
                  "word": "bych",
                  "strong": false,
                  "attrs": {
                    "lemma": "být"
                  }
                },
                {
                  "type": "token",
                  "word": ",",
                  "strong": false,
                  "attrs": {
                    "lemma": ","
                  }
                }
              ],
              "alignedText": null,
              "ref": "#37094166",
              "props": {
                "s.id": "mcewa_prvnilaska:1:198:7"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "dobyli",
                  "strong": false,
                  "attrs": {
                    "lemma": "dobýt"
                  }
                },
                {
                  "type": "token",
                  "word": "pevnost",
                  "strong": false,
                  "attrs": {
                    "lemma": "pevnost"
                  }
                },
                {
                  "type": "token",
                  "word": "mého",
                  "strong": false,
                  "attrs": {
                    "lemma": "můj"
                  }
                },
                {
                  "type": "token",
                  "word": "otce",
                  "strong": false,
                  "attrs": {
                    "lemma": "otec"
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
                  "word": "přivedli",
                  "strong": false,
                  "attrs": {
                    "lemma": "přivést"
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
                  "word": "do",
                  "strong": false,
                  "attrs": {
                    "lemma": "do"
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
                  "word": "rukou",
                  "strong": true,
                  "matchType": "kwic",
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
                  "word": "A",
                  "strong": false,
                  "attrs": {
                    "lemma": "a"
                  }
                },
                {
                  "type": "token",
                  "word": "také",
                  "strong": false,
                  "attrs": {
                    "lemma": "také"
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
                  "word": "mezi",
                  "strong": false,
                  "attrs": {
                    "lemma": "mezi"
                  }
                },
                {
                  "type": "token",
                  "word": "námi",
                  "strong": false,
                  "attrs": {
                    "lemma": "my"
                  }
                },
                {
                  "type": "token",
                  "word": "všeobecně",
                  "strong": false,
                  "attrs": {
                    "lemma": "všeobecně"
                  }
                },
                {
                  "type": "token",
                  "word": "známo",
                  "strong": false,
                  "attrs": {
                    "lemma": "známý"
                  }
                },
                {
                  "type": "token",
                  "word": ",",
                  "strong": false,
                  "attrs": {
                    "lemma": ","
                  }
                }
              ],
              "alignedText": null,
              "ref": "#11382034",
              "props": {
                "s.id": "bengt_zrzavyorm:1:308:1"
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
                  "word": "čas",
                  "strong": false,
                  "attrs": {
                    "lemma": "čas"
                  }
                },
                {
                  "type": "token",
                  "word": "zastavil",
                  "strong": false,
                  "attrs": {
                    "lemma": "zastavit"
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
                  "word": "Vzal",
                  "strong": false,
                  "attrs": {
                    "lemma": "vzít"
                  }
                },
                {
                  "type": "token",
                  "word": "její",
                  "strong": false,
                  "attrs": {
                    "lemma": "její"
                  }
                },
                {
                  "type": "token",
                  "word": "ruku",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "ruka"
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
                  "word": "své",
                  "strong": false,
                  "attrs": {
                    "lemma": "svůj"
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
                  "word": "Najednou",
                  "strong": false,
                  "attrs": {
                    "lemma": "najednou"
                  }
                },
                {
                  "type": "token",
                  "word": "pocítil",
                  "strong": false,
                  "attrs": {
                    "lemma": "pocítit"
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
                  "word": "je",
                  "strong": false,
                  "attrs": {
                    "lemma": "být"
                  }
                },
                {
                  "type": "token",
                  "word": "příjemné",
                  "strong": false,
                  "attrs": {
                    "lemma": "příjemný"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#7336511",
              "props": {
                "s.id": "fossu_indickanev:1:1035:3"
              }
            },
            {
              "text": [
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
                  "word": "špičkami",
                  "strong": false,
                  "attrs": {
                    "lemma": "špička"
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
                  "word": "zbytek",
                  "strong": false,
                  "attrs": {
                    "lemma": "zbytek"
                  }
                },
                {
                  "type": "token",
                  "word": "její",
                  "strong": false,
                  "attrs": {
                    "lemma": "její"
                  }
                },
                {
                  "type": "token",
                  "word": "váhy",
                  "strong": false,
                  "attrs": {
                    "lemma": "váha"
                  }
                },
                {
                  "type": "token",
                  "word": "spočíval",
                  "strong": false,
                  "attrs": {
                    "lemma": "spočívat"
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
                  "word": "jeho",
                  "strong": false,
                  "attrs": {
                    "lemma": "jeho"
                  }
                },
                {
                  "type": "token",
                  "word": "rukou",
                  "strong": true,
                  "matchType": "kwic",
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
                  "word": "Hank",
                  "strong": false,
                  "attrs": {
                    "lemma": "Hank"
                  }
                },
                {
                  "type": "token",
                  "word": "opustil",
                  "strong": false,
                  "attrs": {
                    "lemma": "opustit"
                  }
                },
                {
                  "type": "token",
                  "word": "její",
                  "strong": false,
                  "attrs": {
                    "lemma": "její"
                  }
                },
                {
                  "type": "token",
                  "word": "rty",
                  "strong": false,
                  "attrs": {
                    "lemma": "ret"
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
                  "word": "zkoumal",
                  "strong": false,
                  "attrs": {
                    "lemma": "zkoumat"
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
                  "word": "ústy",
                  "strong": false,
                  "attrs": {
                    "lemma": "ústa"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#1687698",
              "props": {
                "s.id": "dever_procitnuti:1:1059:5"
              }
            },
            {
              "text": [
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
                  "word": "květinovém",
                  "strong": false,
                  "attrs": {
                    "lemma": "květinový"
                  }
                },
                {
                  "type": "token",
                  "word": "záhonu",
                  "strong": false,
                  "attrs": {
                    "lemma": "záhon"
                  }
                },
                {
                  "type": "token",
                  "word": "u",
                  "strong": false,
                  "attrs": {
                    "lemma": "u"
                  }
                },
                {
                  "type": "token",
                  "word": "okna",
                  "strong": false,
                  "attrs": {
                    "lemma": "okno"
                  }
                },
                {
                  "type": "token",
                  "word": "sálu",
                  "strong": false,
                  "attrs": {
                    "lemma": "sál"
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
                  "word": "pak",
                  "strong": false,
                  "attrs": {
                    "lemma": "pak"
                  }
                },
                {
                  "type": "token",
                  "word": "napřáhl",
                  "strong": false,
                  "attrs": {
                    "lemma": "napřáhnout"
                  }
                },
                {
                  "type": "token",
                  "word": "ruku",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "ruka"
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
                  "word": "hodil",
                  "strong": false,
                  "attrs": {
                    "lemma": "hodit"
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
                  "word": "ní",
                  "strong": false,
                  "attrs": {
                    "lemma": "on"
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
                  "word": "okna",
                  "strong": false,
                  "attrs": {
                    "lemma": "okno"
                  }
                },
                {
                  "type": "token",
                  "word": "novou",
                  "strong": false,
                  "attrs": {
                    "lemma": "nový"
                  }
                },
                {
                  "type": "token",
                  "word": "hrst",
                  "strong": false,
                  "attrs": {
                    "lemma": "hrst"
                  }
                },
                {
                  "type": "token",
                  "word": "země",
                  "strong": false,
                  "attrs": {
                    "lemma": "země"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#4996104",
              "props": {
                "s.id": "dumau_hospodajam:1:1109:3"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "mohl",
                  "strong": false,
                  "attrs": {
                    "lemma": "moci"
                  }
                },
                {
                  "type": "token",
                  "word": "Lev",
                  "strong": false,
                  "attrs": {
                    "lemma": "lev"
                  }
                },
                {
                  "type": "token",
                  "word": "odpovědět",
                  "strong": false,
                  "attrs": {
                    "lemma": "odpovědět"
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
                  "word": "uviděl",
                  "strong": false,
                  "attrs": {
                    "lemma": "uvidět"
                  }
                },
                {
                  "type": "token",
                  "word": "Austin",
                  "strong": false,
                  "attrs": {
                    "lemma": "Austin"
                  }
                },
                {
                  "type": "token",
                  "word": "frontu",
                  "strong": false,
                  "attrs": {
                    "lemma": "fronta"
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
                  "word": "Zvedl",
                  "strong": false,
                  "attrs": {
                    "lemma": "zvednout"
                  }
                },
                {
                  "type": "token",
                  "word": "ruku",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "ruka"
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
                  "word": "ukázal",
                  "strong": false,
                  "attrs": {
                    "lemma": "ukázat"
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
                  "word": "klikatícího",
                  "strong": false,
                  "attrs": {
                    "lemma": "klikatící"
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
                  "word": "lidského",
                  "strong": false,
                  "attrs": {
                    "lemma": "lidský"
                  }
                },
                {
                  "type": "token",
                  "word": "hada",
                  "strong": false,
                  "attrs": {
                    "lemma": "had"
                  }
                },
                {
                  "type": "token",
                  "word": "čekajícího",
                  "strong": false,
                  "attrs": {
                    "lemma": "čekající"
                  }
                },
                {
                  "type": "token",
                  "word": "před",
                  "strong": false,
                  "attrs": {
                    "lemma": "před"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#13712733",
              "props": {
                "s.id": "smith_agent6:1:307:2"
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
                  "word": "že",
                  "strong": false,
                  "attrs": {
                    "lemma": "že"
                  }
                },
                {
                  "type": "token",
                  "word": "viděla",
                  "strong": false,
                  "attrs": {
                    "lemma": "vidět"
                  }
                },
                {
                  "type": "token",
                  "word": "krůpěje",
                  "strong": false,
                  "attrs": {
                    "lemma": "krůpěj"
                  }
                },
                {
                  "type": "token",
                  "word": "potu",
                  "strong": false,
                  "attrs": {
                    "lemma": "pot"
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
                  "word": "jeho",
                  "strong": false,
                  "attrs": {
                    "lemma": "jeho"
                  }
                },
                {
                  "type": "token",
                  "word": "čele",
                  "strong": false,
                  "attrs": {
                    "lemma": "čelo"
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
                  "word": "Ruka",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "ruka"
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
                  "word": "mu",
                  "strong": false,
                  "attrs": {
                    "lemma": "on"
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
                  "word": "vzduchu",
                  "strong": false,
                  "attrs": {
                    "lemma": "vzduch"
                  }
                },
                {
                  "type": "token",
                  "word": "chvěla",
                  "strong": false,
                  "attrs": {
                    "lemma": "chvět"
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
                  "word": "Ty",
                  "strong": false,
                  "attrs": {
                    "lemma": "ty"
                  }
                },
                {
                  "type": "token",
                  "word": "seš",
                  "strong": false,
                  "attrs": {
                    "lemma": "být"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#16381442",
              "props": {
                "s.id": "mathi_dvanactkmf:1:1161:4"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "sebou",
                  "strong": false,
                  "attrs": {
                    "lemma": "se"
                  }
                },
                {
                  "type": "token",
                  "word": "trhaly",
                  "strong": false,
                  "attrs": {
                    "lemma": "trhat"
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
                  "word": "takže",
                  "strong": false,
                  "attrs": {
                    "lemma": "takže"
                  }
                },
                {
                  "type": "token",
                  "word": "Groves",
                  "strong": false,
                  "attrs": {
                    "lemma": "Groves"
                  }
                },
                {
                  "type": "token",
                  "word": "ji",
                  "strong": false,
                  "attrs": {
                    "lemma": "on"
                  }
                },
                {
                  "type": "token",
                  "word": "musel",
                  "strong": false,
                  "attrs": {
                    "lemma": "muset"
                  }
                },
                {
                  "type": "token",
                  "word": "svýma",
                  "strong": false,
                  "attrs": {
                    "lemma": "svůj"
                  }
                },
                {
                  "type": "token",
                  "word": "velkýma",
                  "strong": false,
                  "attrs": {
                    "lemma": "velký"
                  }
                },
                {
                  "type": "token",
                  "word": "rukama",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "ruka"
                  }
                },
                {
                  "type": "token",
                  "word": "přimáčknout",
                  "strong": false,
                  "attrs": {
                    "lemma": "přimáčknout"
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
                  "word": "mohl",
                  "strong": false,
                  "attrs": {
                    "lemma": "moci"
                  }
                },
                {
                  "type": "token",
                  "word": "Slater",
                  "strong": false,
                  "attrs": {
                    "lemma": "Slater"
                  }
                },
                {
                  "type": "token",
                  "word": "sevřít",
                  "strong": false,
                  "attrs": {
                    "lemma": "sevřít"
                  }
                },
                {
                  "type": "token",
                  "word": "zadní",
                  "strong": false,
                  "attrs": {
                    "lemma": "zadní"
                  }
                },
                {
                  "type": "token",
                  "word": "část",
                  "strong": false,
                  "attrs": {
                    "lemma": "část"
                  }
                },
                {
                  "type": "token",
                  "word": "hlavy",
                  "strong": false,
                  "attrs": {
                    "lemma": "hlava"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#30768313",
              "props": {
                "s.id": "masel_krizromano:1:60:1"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "daleko",
                  "strong": false,
                  "attrs": {
                    "lemma": "daleko"
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
                  "word": "uvedenou",
                  "strong": false,
                  "attrs": {
                    "lemma": "uvedený"
                  }
                },
                {
                  "type": "token",
                  "word": "pizzerii",
                  "strong": false,
                  "attrs": {
                    "lemma": "pizzerie"
                  }
                },
                {
                  "type": "token",
                  "word": "navštívil",
                  "strong": false,
                  "attrs": {
                    "lemma": "navštívit"
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
                  "word": "zbraní",
                  "strong": false,
                  "attrs": {
                    "lemma": "zbraň"
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
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "ruka"
                  }
                },
                {
                  "type": "token",
                  "word": "mladík",
                  "strong": false,
                  "attrs": {
                    "lemma": "mladík"
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
                  "word": "zjednal",
                  "strong": false,
                  "attrs": {
                    "lemma": "zjednat"
                  }
                },
                {
                  "type": "token",
                  "word": "pořádek",
                  "strong": false,
                  "attrs": {
                    "lemma": "pořádek"
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
                  "word": "Samozřejmě",
                  "strong": false,
                  "attrs": {
                    "lemma": "samozřejmě"
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
                  "word": "nic",
                  "strong": false,
                  "attrs": {
                    "lemma": "nic"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#121256021",
              "props": {
                "s.id": "rozh1835:5:7:4"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "novými",
                  "strong": false,
                  "attrs": {
                    "lemma": "nový"
                  }
                },
                {
                  "type": "token",
                  "word": "výtahy",
                  "strong": false,
                  "attrs": {
                    "lemma": "výtah"
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
                  "word": "Měl",
                  "strong": false,
                  "attrs": {
                    "lemma": "mít"
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
                  "word": "tom",
                  "strong": false,
                  "attrs": {
                    "lemma": "ten"
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
                  "word": "sebou",
                  "strong": false,
                  "attrs": {
                    "lemma": "se"
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
                  "word": "ruce",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "ruka"
                  }
                },
                {
                  "type": "token",
                  "word": "asistenta",
                  "strong": false,
                  "attrs": {
                    "lemma": "asistent"
                  }
                },
                {
                  "type": "token",
                  "word": "z",
                  "strong": false,
                  "attrs": {
                    "lemma": "z"
                  }
                },
                {
                  "type": "token",
                  "word": "řad",
                  "strong": false,
                  "attrs": {
                    "lemma": "řada"
                  }
                },
                {
                  "type": "token",
                  "word": "čerstvě",
                  "strong": false,
                  "attrs": {
                    "lemma": "čerstvě"
                  }
                },
                {
                  "type": "token",
                  "word": "přijatých",
                  "strong": false,
                  "attrs": {
                    "lemma": "přijatý"
                  }
                },
                {
                  "type": "token",
                  "word": "zaměstnanců",
                  "strong": false,
                  "attrs": {
                    "lemma": "zaměstnanec"
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
                  "word": "S",
                  "strong": false,
                  "attrs": {
                    "lemma": "s"
                  }
                },
                {
                  "type": "token",
                  "word": "jeho",
                  "strong": false,
                  "attrs": {
                    "lemma": "jeho"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#20366748",
              "props": {
                "s.id": "murak_bezbarvycu:2:530:2"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "Za",
                  "strong": false,
                  "attrs": {
                    "lemma": "za"
                  }
                },
                {
                  "type": "token",
                  "word": "Pinochetových",
                  "strong": false,
                  "attrs": {
                    "lemma": "Pinochetův"
                  }
                },
                {
                  "type": "token",
                  "word": "let",
                  "strong": false,
                  "attrs": {
                    "lemma": "rok"
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
                  "word": "vlastní",
                  "strong": false,
                  "attrs": {
                    "lemma": "vlastní"
                  }
                },
                {
                  "type": "token",
                  "word": "středisko",
                  "strong": false,
                  "attrs": {
                    "lemma": "středisko"
                  }
                },
                {
                  "type": "token",
                  "word": "výslechů",
                  "strong": false,
                  "attrs": {
                    "lemma": "výslech"
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
                  "word": "jeho",
                  "strong": false,
                  "attrs": {
                    "lemma": "jeho"
                  }
                },
                {
                  "type": "token",
                  "word": "rukama",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "ruka"
                  }
                },
                {
                  "type": "token",
                  "word": "prošly",
                  "strong": false,
                  "attrs": {
                    "lemma": "projít"
                  }
                },
                {
                  "type": "token",
                  "word": "stovky",
                  "strong": false,
                  "attrs": {
                    "lemma": "stovka"
                  }
                },
                {
                  "type": "token",
                  "word": "vězňů",
                  "strong": false,
                  "attrs": {
                    "lemma": "vězeň"
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
                  "word": "Bokobza",
                  "strong": false,
                  "attrs": {
                    "lemma": "Bokobza"
                  }
                },
                {
                  "type": "token",
                  "word": "otevřel",
                  "strong": false,
                  "attrs": {
                    "lemma": "otevřít"
                  }
                },
                {
                  "type": "token",
                  "word": "jednu",
                  "strong": false,
                  "attrs": {
                    "lemma": "jeden"
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
              "alignedText": null,
              "ref": "#5299061",
              "props": {
                "s.id": "grang_miserere:1:3155:2"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "POMALU",
                  "strong": false,
                  "attrs": {
                    "lemma": "pomalu"
                  }
                },
                {
                  "type": "token",
                  "word": "ŽMOULÁ",
                  "strong": false,
                  "attrs": {
                    "lemma": "žmoulat"
                  }
                },
                {
                  "type": "token",
                  "word": "–",
                  "strong": false,
                  "attrs": {
                    "lemma": "-"
                  }
                },
                {
                  "type": "token",
                  "word": "HELE",
                  "strong": false,
                  "attrs": {
                    "lemma": "hele"
                  }
                },
                {
                  "type": "token",
                  "word": "!",
                  "strong": false,
                  "attrs": {
                    "lemma": "!"
                  }
                },
                {
                  "type": "token",
                  "word": "MÁM",
                  "strong": false,
                  "attrs": {
                    "lemma": "mít"
                  }
                },
                {
                  "type": "token",
                  "word": "KULIČKU",
                  "strong": false,
                  "attrs": {
                    "lemma": "kulička"
                  }
                },
                {
                  "type": "token",
                  "word": "!",
                  "strong": false,
                  "attrs": {
                    "lemma": "!"
                  }
                },
                {
                  "type": "token",
                  "word": "CHECHTAJÍC",
                  "strong": false,
                  "attrs": {
                    "lemma": "chechtat"
                  }
                },
                {
                  "type": "token",
                  "word": "RUKA",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "ruka"
                  }
                },
                {
                  "type": "token",
                  "word": "ZATŘESE",
                  "strong": false,
                  "attrs": {
                    "lemma": "zatřást"
                  }
                },
                {
                  "type": "token",
                  "word": "POVĚTŘÍM",
                  "strong": false,
                  "attrs": {
                    "lemma": "povětří"
                  }
                },
                {
                  "type": "token",
                  "word": "VZPOMÍNEK",
                  "strong": false,
                  "attrs": {
                    "lemma": "vzpomínka"
                  }
                },
                {
                  "type": "token",
                  "word": "PRÁZDNOTOU",
                  "strong": false,
                  "attrs": {
                    "lemma": "prázdnota"
                  }
                },
                {
                  "type": "token",
                  "word": "POKOJE",
                  "strong": false,
                  "attrs": {
                    "lemma": "pokoj"
                  }
                },
                {
                  "type": "token",
                  "word": "SNÁŠÍ",
                  "strong": false,
                  "attrs": {
                    "lemma": "snášet"
                  }
                },
                {
                  "type": "token",
                  "word": "SE",
                  "strong": false,
                  "attrs": {
                    "lemma": "se"
                  }
                },
                {
                  "type": "token",
                  "word": "MALINKÝ",
                  "strong": false,
                  "attrs": {
                    "lemma": "malinký"
                  }
                },
                {
                  "type": "token",
                  "word": "PAPÍREK",
                  "strong": false,
                  "attrs": {
                    "lemma": "papírek"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#39197387",
              "props": {
                "s.id": "kofla_doduchoduz:1:57:1"
              }
            }
          ],
          "concSize": 91336,
          "corpusSize": 121826797,
          "ipm": 749.7201128910907,
          "resultType": "conc"
        },
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
                  "word": "podotkla",
                  "strong": false,
                  "attrs": {
                    "lemma": "podotknout"
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
                  "word": "Ty",
                  "strong": false,
                  "attrs": {
                    "lemma": "ty"
                  }
                },
                {
                  "type": "token",
                  "word": "jsi",
                  "strong": false,
                  "attrs": {
                    "lemma": "být"
                  }
                },
                {
                  "type": "token",
                  "word": "samá",
                  "strong": false,
                  "attrs": {
                    "lemma": "samý"
                  }
                },
                {
                  "type": "token",
                  "word": "ruka",
                  "strong": false,
                  "attrs": {
                    "lemma": "ruka"
                  }
                },
                {
                  "type": "token",
                  "word": "samá",
                  "strong": false,
                  "attrs": {
                    "lemma": "samý"
                  }
                },
                {
                  "type": "token",
                  "word": "noha",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
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
                  "word": "jsi",
                  "strong": false,
                  "attrs": {
                    "lemma": "být"
                  }
                },
                {
                  "type": "token",
                  "word": "vytrénovaný",
                  "strong": false,
                  "attrs": {
                    "lemma": "vytrénovaný"
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
                  "word": "máš",
                  "strong": false,
                  "attrs": {
                    "lemma": "mít"
                  }
                },
                {
                  "type": "token",
                  "word": "tělo",
                  "strong": false,
                  "attrs": {
                    "lemma": "tělo"
                  }
                },
                {
                  "type": "token",
                  "word": "sportovce",
                  "strong": false,
                  "attrs": {
                    "lemma": "sportovec"
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
                  "word": "to",
                  "strong": false,
                  "attrs": {
                    "lemma": "ten"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#15392049",
              "props": {
                "s.id": "enqui_knihapodob:1:635:5"
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
                  "word": "nerezový",
                  "strong": false,
                  "attrs": {
                    "lemma": "nerezový"
                  }
                },
                {
                  "type": "token",
                  "word": "nástavec",
                  "strong": false,
                  "attrs": {
                    "lemma": "nástavec"
                  }
                },
                {
                  "type": "token",
                  "word": "PowerBell",
                  "strong": false,
                  "attrs": {
                    "lemma": "PowerBell"
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
                  "word": "patentovanou",
                  "strong": false,
                  "attrs": {
                    "lemma": "patentovaný"
                  }
                },
                {
                  "type": "token",
                  "word": "spodní",
                  "strong": false,
                  "attrs": {
                    "lemma": "spodní"
                  }
                },
                {
                  "type": "token",
                  "word": "částí",
                  "strong": false,
                  "attrs": {
                    "lemma": "část"
                  }
                },
                {
                  "type": "token",
                  "word": "mixovací",
                  "strong": false,
                  "attrs": {
                    "lemma": "mixovací"
                  }
                },
                {
                  "type": "token",
                  "word": "nohy",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
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
                  "word": "Její",
                  "strong": false,
                  "attrs": {
                    "lemma": "její"
                  }
                },
                {
                  "type": "token",
                  "word": "zvonovitá",
                  "strong": false,
                  "attrs": {
                    "lemma": "zvonovitý"
                  }
                },
                {
                  "type": "token",
                  "word": "část",
                  "strong": false,
                  "attrs": {
                    "lemma": "část"
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
                  "word": "otočena",
                  "strong": false,
                  "attrs": {
                    "lemma": "otočit"
                  }
                },
                {
                  "type": "token",
                  "word": "proti",
                  "strong": false,
                  "attrs": {
                    "lemma": "proti"
                  }
                },
                {
                  "type": "token",
                  "word": "směru",
                  "strong": false,
                  "attrs": {
                    "lemma": "směr"
                  }
                },
                {
                  "type": "token",
                  "word": "pohybu",
                  "strong": false,
                  "attrs": {
                    "lemma": "pohyb"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#111867242",
              "props": {
                "s.id": "mami1809:28:57:4"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "Vtom",
                  "strong": false,
                  "attrs": {
                    "lemma": "vtom"
                  }
                },
                {
                  "type": "token",
                  "word": "někdo",
                  "strong": false,
                  "attrs": {
                    "lemma": "někdo"
                  }
                },
                {
                  "type": "token",
                  "word": "zabuší",
                  "strong": false,
                  "attrs": {
                    "lemma": "zabušit"
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
                  "word": "dveře",
                  "strong": false,
                  "attrs": {
                    "lemma": "dveře"
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
                  "word": "Kovář",
                  "strong": false,
                  "attrs": {
                    "lemma": "kovář"
                  }
                },
                {
                  "type": "token",
                  "word": "vyskočí",
                  "strong": false,
                  "attrs": {
                    "lemma": "vyskočit"
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
                  "word": "nohy",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
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
                  "word": "když",
                  "strong": false,
                  "attrs": {
                    "lemma": "když"
                  }
                },
                {
                  "type": "token",
                  "word": "střelí",
                  "strong": false,
                  "attrs": {
                    "lemma": "střelit"
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
                  "word": "a",
                  "strong": false,
                  "attrs": {
                    "lemma": "a"
                  }
                },
                {
                  "type": "token",
                  "word": "žene",
                  "strong": false,
                  "attrs": {
                    "lemma": "hnát"
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
                  "word": "ke",
                  "strong": false,
                  "attrs": {
                    "lemma": "k"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#19819825",
              "props": {
                "s.id": "leine_prorocizfj:1:1887:1"
              }
            },
            {
              "text": [
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
                  "word": "postupně",
                  "strong": false,
                  "attrs": {
                    "lemma": "postupně"
                  }
                },
                {
                  "type": "token",
                  "word": "umyla",
                  "strong": false,
                  "attrs": {
                    "lemma": "umýt"
                  }
                },
                {
                  "type": "token",
                  "word": "paže",
                  "strong": false,
                  "attrs": {
                    "lemma": "paže"
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
                  "word": "prsa",
                  "strong": false,
                  "attrs": {
                    "lemma": "prsa"
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
                  "word": "břicho",
                  "strong": false,
                  "attrs": {
                    "lemma": "břicho"
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
                  "word": "nohy",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
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
                  "word": "Zvládneme",
                  "strong": false,
                  "attrs": {
                    "lemma": "zvládnout"
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
                  "word": "ozve",
                  "strong": false,
                  "attrs": {
                    "lemma": "ozvat"
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
                  "word": "po",
                  "strong": false,
                  "attrs": {
                    "lemma": "po"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#18568998",
              "props": {
                "s.id": "colem_knihavzpom:1:1548:1"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "druhý",
                  "strong": false,
                  "attrs": {
                    "lemma": "druhý"
                  }
                },
                {
                  "type": "token",
                  "word": "zase",
                  "strong": false,
                  "attrs": {
                    "lemma": "zase"
                  }
                },
                {
                  "type": "token",
                  "word": "začínáme",
                  "strong": false,
                  "attrs": {
                    "lemma": "začínat"
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
                  "word": "Jdu",
                  "strong": false,
                  "attrs": {
                    "lemma": "jít"
                  }
                },
                {
                  "type": "token",
                  "word": "pomalu",
                  "strong": false,
                  "attrs": {
                    "lemma": "pomalu"
                  }
                },
                {
                  "type": "token",
                  "word": "zvednout",
                  "strong": false,
                  "attrs": {
                    "lemma": "zvednout"
                  }
                },
                {
                  "type": "token",
                  "word": "kluky",
                  "strong": false,
                  "attrs": {
                    "lemma": "kluk"
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
                  "word": "nohy",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
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
                  "word": "Jo",
                  "strong": false,
                  "attrs": {
                    "lemma": "jo"
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
                  "word": "ještě",
                  "strong": false,
                  "attrs": {
                    "lemma": "ještě"
                  }
                },
                {
                  "type": "token",
                  "word": "něco",
                  "strong": false,
                  "attrs": {
                    "lemma": "něco"
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
                  "word": "Byla",
                  "strong": false,
                  "attrs": {
                    "lemma": "být"
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
                  "word": "nějaká",
                  "strong": false,
                  "attrs": {
                    "lemma": "nějaký"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#34101136",
              "props": {
                "s.id": "hajic_vzpominkyo:1:2112:3"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "Saru",
                  "strong": false,
                  "attrs": {
                    "lemma": "Sára"
                  }
                },
                {
                  "type": "token",
                  "word": "teď",
                  "strong": false,
                  "attrs": {
                    "lemma": "teď"
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
                  "word": "ani",
                  "strong": false,
                  "attrs": {
                    "lemma": "ani"
                  }
                },
                {
                  "type": "token",
                  "word": "nenapadlo",
                  "strong": false,
                  "attrs": {
                    "lemma": "napadnout"
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
                  "word": "by",
                  "strong": false,
                  "attrs": {
                    "lemma": "být"
                  }
                },
                {
                  "type": "token",
                  "word": "její",
                  "strong": false,
                  "attrs": {
                    "lemma": "její"
                  }
                },
                {
                  "type": "token",
                  "word": "nohy",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
                  }
                },
                {
                  "type": "token",
                  "word": "mohly",
                  "strong": false,
                  "attrs": {
                    "lemma": "moci"
                  }
                },
                {
                  "type": "token",
                  "word": "být",
                  "strong": false,
                  "attrs": {
                    "lemma": "být"
                  }
                },
                {
                  "type": "token",
                  "word": "nějak",
                  "strong": false,
                  "attrs": {
                    "lemma": "nějak"
                  }
                },
                {
                  "type": "token",
                  "word": "elegantní",
                  "strong": false,
                  "attrs": {
                    "lemma": "elegantní"
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
                  "word": "Staly",
                  "strong": false,
                  "attrs": {
                    "lemma": "stát"
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
                  "word": "z",
                  "strong": false,
                  "attrs": {
                    "lemma": "z"
                  }
                },
                {
                  "type": "token",
                  "word": "nich",
                  "strong": false,
                  "attrs": {
                    "lemma": "oni"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#21832054",
              "props": {
                "s.id": "bival_ctenarizbr:1:486:2"
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
                  "word": "a",
                  "strong": false,
                  "attrs": {
                    "lemma": "a"
                  }
                },
                {
                  "type": "token",
                  "word": "kočky",
                  "strong": false,
                  "attrs": {
                    "lemma": "kočka"
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
                  "word": "Motaly",
                  "strong": false,
                  "attrs": {
                    "lemma": "motat"
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
                  "word": "návštěvníkům",
                  "strong": false,
                  "attrs": {
                    "lemma": "návštěvník"
                  }
                },
                {
                  "type": "token",
                  "word": "přátelsky",
                  "strong": false,
                  "attrs": {
                    "lemma": "přátelsky"
                  }
                },
                {
                  "type": "token",
                  "word": "pod",
                  "strong": false,
                  "attrs": {
                    "lemma": "pod"
                  }
                },
                {
                  "type": "token",
                  "word": "nohama",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
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
                  "word": "Podle",
                  "strong": false,
                  "attrs": {
                    "lemma": "podle"
                  }
                },
                {
                  "type": "token",
                  "word": "správcové",
                  "strong": false,
                  "attrs": {
                    "lemma": "správcová"
                  }
                },
                {
                  "type": "token",
                  "word": "choval",
                  "strong": false,
                  "attrs": {
                    "lemma": "chovat"
                  }
                },
                {
                  "type": "token",
                  "word": "svérázný",
                  "strong": false,
                  "attrs": {
                    "lemma": "svérázný"
                  }
                },
                {
                  "type": "token",
                  "word": "spisovatel",
                  "strong": false,
                  "attrs": {
                    "lemma": "spisovatel"
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
                  "word": "třicet",
                  "strong": false,
                  "attrs": {
                    "lemma": "třicet"
                  }
                },
                {
                  "type": "token",
                  "word": "čtyřnohých",
                  "strong": false,
                  "attrs": {
                    "lemma": "čtyřnohý"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#4908922",
              "props": {
                "s.id": "dudov_zivotasouz:1:3083:4"
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
                  "word": "voda",
                  "strong": false,
                  "attrs": {
                    "lemma": "voda"
                  }
                },
                {
                  "type": "token",
                  "word": "teče",
                  "strong": false,
                  "attrs": {
                    "lemma": "téci"
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
                  "word": "kopce",
                  "strong": false,
                  "attrs": {
                    "lemma": "kopec"
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
                  "word": "princové",
                  "strong": false,
                  "attrs": {
                    "lemma": "princ"
                  }
                },
                {
                  "type": "token",
                  "word": "padají",
                  "strong": false,
                  "attrs": {
                    "lemma": "padat"
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
                  "word": "nohám",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
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
                  "word": "koukám",
                  "strong": false,
                  "attrs": {
                    "lemma": "koukat"
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
                  "word": "chodí",
                  "strong": false,
                  "attrs": {
                    "lemma": "chodit"
                  }
                },
                {
                  "type": "token",
                  "word": "i",
                  "strong": false,
                  "attrs": {
                    "lemma": "i"
                  }
                },
                {
                  "type": "token",
                  "word": "tvoje",
                  "strong": false,
                  "attrs": {
                    "lemma": "tvůj"
                  }
                },
                {
                  "type": "token",
                  "word": "mladší",
                  "strong": false,
                  "attrs": {
                    "lemma": "mladý"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#14917415",
              "props": {
                "s.id": "cerve_zavriociot:1:556:2"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "krásná",
                  "strong": false,
                  "attrs": {
                    "lemma": "krásný"
                  }
                },
                {
                  "type": "token",
                  "word": "!",
                  "strong": false,
                  "attrs": {
                    "lemma": "!"
                  }
                },
                {
                  "type": "token",
                  "word": "Růžolící",
                  "strong": false,
                  "attrs": {
                    "lemma": "růžolící"
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
                  "word": "krásná",
                  "strong": false,
                  "attrs": {
                    "lemma": "krásný"
                  }
                },
                {
                  "type": "token",
                  "word": "dáma",
                  "strong": false,
                  "attrs": {
                    "lemma": "dáma"
                  }
                },
                {
                  "type": "token",
                  "word": "svírající",
                  "strong": false,
                  "attrs": {
                    "lemma": "svírající"
                  }
                },
                {
                  "type": "token",
                  "word": "nástroj",
                  "strong": false,
                  "attrs": {
                    "lemma": "nástroj"
                  }
                },
                {
                  "type": "token",
                  "word": "mezi",
                  "strong": false,
                  "attrs": {
                    "lemma": "mezi"
                  }
                },
                {
                  "type": "token",
                  "word": "nohama",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
                  }
                },
                {
                  "type": "token",
                  "word": "Tak",
                  "strong": false,
                  "attrs": {
                    "lemma": "tak"
                  }
                },
                {
                  "type": "token",
                  "word": "přímý",
                  "strong": false,
                  "attrs": {
                    "lemma": "přímý"
                  }
                },
                {
                  "type": "token",
                  "word": "jindy",
                  "strong": false,
                  "attrs": {
                    "lemma": "jindy"
                  }
                },
                {
                  "type": "token",
                  "word": "nejsem",
                  "strong": false,
                  "attrs": {
                    "lemma": "být"
                  }
                },
                {
                  "type": "token",
                  "word": "!",
                  "strong": false,
                  "attrs": {
                    "lemma": "!"
                  }
                },
                {
                  "type": "token",
                  "word": "To",
                  "strong": false,
                  "attrs": {
                    "lemma": "ten"
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
                  "word": "věř",
                  "strong": false,
                  "attrs": {
                    "lemma": "věřit"
                  }
                },
                {
                  "type": "token",
                  "word": "!",
                  "strong": false,
                  "attrs": {
                    "lemma": "!"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#41287364",
              "props": {
                "s.id": "demps_carodejkyz:1:485:1"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "ale",
                  "strong": false,
                  "attrs": {
                    "lemma": "ale"
                  }
                },
                {
                  "type": "token",
                  "word": "opakovat",
                  "strong": false,
                  "attrs": {
                    "lemma": "opakovat"
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
                  "word": ",",
                  "strong": false,
                  "attrs": {
                    "lemma": ","
                  }
                },
                {
                  "type": "token",
                  "word": "neboť",
                  "strong": false,
                  "attrs": {
                    "lemma": "neboť"
                  }
                },
                {
                  "type": "token",
                  "word": "již",
                  "strong": false,
                  "attrs": {
                    "lemma": "již"
                  }
                },
                {
                  "type": "token",
                  "word": "sotva",
                  "strong": false,
                  "attrs": {
                    "lemma": "sotva"
                  }
                },
                {
                  "type": "token",
                  "word": "stál",
                  "strong": false,
                  "attrs": {
                    "lemma": "stát"
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
                  "word": "nohou",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
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
                  "word": "Poslední",
                  "strong": false,
                  "attrs": {
                    "lemma": "poslední"
                  }
                },
                {
                  "type": "token",
                  "word": "jsme",
                  "strong": false,
                  "attrs": {
                    "lemma": "být"
                  }
                },
                {
                  "type": "token",
                  "word": "měli",
                  "strong": false,
                  "attrs": {
                    "lemma": "mít"
                  }
                },
                {
                  "type": "token",
                  "word": "zase",
                  "strong": false,
                  "attrs": {
                    "lemma": "zase"
                  }
                },
                {
                  "type": "token",
                  "word": "číslo",
                  "strong": false,
                  "attrs": {
                    "lemma": "číslo"
                  }
                },
                {
                  "type": "token",
                  "word": "my",
                  "strong": false,
                  "attrs": {
                    "lemma": "my"
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
                  "word": "S",
                  "strong": false,
                  "attrs": {
                    "lemma": "s"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#81071151",
              "props": {
                "s.id": "mlcoc_zapiskyleg:1:539:12"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "po",
                  "strong": false,
                  "attrs": {
                    "lemma": "po"
                  }
                },
                {
                  "type": "token",
                  "word": "prknech",
                  "strong": false,
                  "attrs": {
                    "lemma": "prkno"
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
                  "word": "V",
                  "strong": false,
                  "attrs": {
                    "lemma": "v"
                  }
                },
                {
                  "type": "token",
                  "word": "pokojíku",
                  "strong": false,
                  "attrs": {
                    "lemma": "pokojík"
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
                  "word": "věžičce",
                  "strong": false,
                  "attrs": {
                    "lemma": "věžička"
                  }
                },
                {
                  "type": "token",
                  "word": "Shauna",
                  "strong": false,
                  "attrs": {
                    "lemma": "Shaun"
                  }
                },
                {
                  "type": "token",
                  "word": "vrtí",
                  "strong": false,
                  "attrs": {
                    "lemma": "vrtět"
                  }
                },
                {
                  "type": "token",
                  "word": "nohama",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
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
                  "word": "cvrček",
                  "strong": false,
                  "attrs": {
                    "lemma": "cvrček"
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
                  "word": "Sní",
                  "strong": false,
                  "attrs": {
                    "lemma": "snít"
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
                  "word": "o",
                  "strong": false,
                  "attrs": {
                    "lemma": "o"
                  }
                },
                {
                  "type": "token",
                  "word": "Mahonym",
                  "strong": false,
                  "attrs": {
                    "lemma": "Mahony"
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
                  "word": "Odvádí",
                  "strong": false,
                  "attrs": {
                    "lemma": "odvádět"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#27204124",
              "props": {
                "s.id": "kiddo_zivel:1:1237:1"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "ale",
                  "strong": false,
                  "attrs": {
                    "lemma": "ale"
                  }
                },
                {
                  "type": "token",
                  "word": "byla",
                  "strong": false,
                  "attrs": {
                    "lemma": "být"
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
                  "word": "krev",
                  "strong": false,
                  "attrs": {
                    "lemma": "krev"
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
                  "word": "Hladký",
                  "strong": false,
                  "attrs": {
                    "lemma": "hladký"
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
                  "word": "vyhrabal",
                  "strong": false,
                  "attrs": {
                    "lemma": "vyhrabat"
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
                  "word": "nohy",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
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
                  "word": "ohlédl",
                  "strong": false,
                  "attrs": {
                    "lemma": "ohlédnout"
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
                  "word": "po",
                  "strong": false,
                  "attrs": {
                    "lemma": "po"
                  }
                },
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
                  "word": ".",
                  "strong": false,
                  "attrs": {
                    "lemma": "."
                  }
                },
                {
                  "type": "token",
                  "word": "Oči",
                  "strong": false,
                  "attrs": {
                    "lemma": "oko"
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
                  "word": "vyvalené",
                  "strong": false,
                  "attrs": {
                    "lemma": "vyvalený"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#31267259",
              "props": {
                "s.id": "snego_krevprorus:1:2254:3"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "pasu",
                  "strong": false,
                  "attrs": {
                    "lemma": "pas"
                  }
                },
                {
                  "type": "token",
                  "word": "i",
                  "strong": false,
                  "attrs": {
                    "lemma": "i"
                  }
                },
                {
                  "type": "token",
                  "word": "boků",
                  "strong": false,
                  "attrs": {
                    "lemma": "bok"
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
                  "word": "neméně",
                  "strong": false,
                  "attrs": {
                    "lemma": "málo"
                  }
                },
                {
                  "type": "token",
                  "word": "důležitá",
                  "strong": false,
                  "attrs": {
                    "lemma": "důležitý"
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
                  "word": "i",
                  "strong": false,
                  "attrs": {
                    "lemma": "i"
                  }
                },
                {
                  "type": "token",
                  "word": "délka",
                  "strong": false,
                  "attrs": {
                    "lemma": "délka"
                  }
                },
                {
                  "type": "token",
                  "word": "nohou",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
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
                  "word": "Ve",
                  "strong": false,
                  "attrs": {
                    "lemma": "v"
                  }
                },
                {
                  "type": "token",
                  "word": "specializovaném",
                  "strong": false,
                  "attrs": {
                    "lemma": "specializovaný"
                  }
                },
                {
                  "type": "token",
                  "word": "obchodu",
                  "strong": false,
                  "attrs": {
                    "lemma": "obchod"
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
                  "word": "možné",
                  "strong": false,
                  "attrs": {
                    "lemma": "možný"
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
                  "word": "vybrat",
                  "strong": false,
                  "attrs": {
                    "lemma": "vybrat"
                  }
                },
                {
                  "type": "token",
                  "word": "nejen",
                  "strong": false,
                  "attrs": {
                    "lemma": "nejen"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#121287746",
              "props": {
                "s.id": "styl1843:6:5:2"
              }
            },
            {
              "text": [
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
                  "word": "potřebovat",
                  "strong": false,
                  "attrs": {
                    "lemma": "potřebovat"
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
                  "word": "zraněná",
                  "strong": false,
                  "attrs": {
                    "lemma": "zraněný"
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
                  "word": "bez",
                  "strong": false,
                  "attrs": {
                    "lemma": "bez"
                  }
                },
                {
                  "type": "token",
                  "word": "pevné",
                  "strong": false,
                  "attrs": {
                    "lemma": "pevný"
                  }
                },
                {
                  "type": "token",
                  "word": "půdy",
                  "strong": false,
                  "attrs": {
                    "lemma": "půda"
                  }
                },
                {
                  "type": "token",
                  "word": "pod",
                  "strong": false,
                  "attrs": {
                    "lemma": "pod"
                  }
                },
                {
                  "type": "token",
                  "word": "nohama",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
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
                  "word": "Prostě",
                  "strong": false,
                  "attrs": {
                    "lemma": "prostě"
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
                  "word": "jednoduše",
                  "strong": false,
                  "attrs": {
                    "lemma": "jednoduše"
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
                  "word": "na",
                  "strong": false,
                  "attrs": {
                    "lemma": "na"
                  }
                },
                {
                  "type": "token",
                  "word": "pravdu",
                  "strong": false,
                  "attrs": {
                    "lemma": "pravda"
                  }
                },
                {
                  "type": "token",
                  "word": "připravená",
                  "strong": false,
                  "attrs": {
                    "lemma": "připravený"
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
              "alignedText": null,
              "ref": "#15520248",
              "props": {
                "s.id": "hjort_ucednik:1:370:4"
              }
            },
            {
              "text": [
                {
                  "type": "token",
                  "word": "signál",
                  "strong": false,
                  "attrs": {
                    "lemma": "signál"
                  }
                },
                {
                  "type": "token",
                  "word": "polnice",
                  "strong": false,
                  "attrs": {
                    "lemma": "polnice"
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
                  "word": "Pravda",
                  "strong": false,
                  "attrs": {
                    "lemma": "pravda"
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
                  "word": "chodila",
                  "strong": false,
                  "attrs": {
                    "lemma": "chodit"
                  }
                },
                {
                  "type": "token",
                  "word": "nějak",
                  "strong": false,
                  "attrs": {
                    "lemma": "nějak"
                  }
                },
                {
                  "type": "token",
                  "word": "divně",
                  "strong": false,
                  "attrs": {
                    "lemma": "divně"
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
                  "word": "nohy",
                  "strong": true,
                  "matchType": "kwic",
                  "attrs": {
                    "lemma": "noha"
                  }
                },
                {
                  "type": "token",
                  "word": "kladla",
                  "strong": false,
                  "attrs": {
                    "lemma": "klást"
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
                  "word": "provazochodkyně",
                  "strong": false,
                  "attrs": {
                    "lemma": "provazochodkyně"
                  }
                },
                {
                  "type": "token",
                  "word": "jednu",
                  "strong": false,
                  "attrs": {
                    "lemma": "jeden"
                  }
                },
                {
                  "type": "token",
                  "word": "před",
                  "strong": false,
                  "attrs": {
                    "lemma": "před"
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
                  "word": ".",
                  "strong": false,
                  "attrs": {
                    "lemma": "."
                  }
                },
                {
                  "type": "token",
                  "word": "A",
                  "strong": false,
                  "attrs": {
                    "lemma": "a"
                  }
                },
                {
                  "type": "token",
                  "word": "ty",
                  "strong": false,
                  "attrs": {
                    "lemma": "ten"
                  }
                }
              ],
              "alignedText": null,
              "ref": "#37821493",
              "props": {
                "s.id": "bocor_hlavamehoo:1:116:3"
              }
            }
          ],
          "concSize": 32504,
          "corpusSize": 121826797,
          "ipm": 266.8050117085488,
          "resultType": "conc"
        },
    ],
    timeDistrib: [
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
        },
        {
          "entries": {
            "concSize": 91336,
            "corpusSize": 121826797,
            "freqs": [
              {
                "word": "2017",
                "freq": 14324,
                "base": 19839356,
                "ipm": 721.99927
              },
              {
                "word": "2016",
                "freq": 12063,
                "base": 17929079,
                "ipm": 672.81757
              },
              {
                "word": "2015",
                "freq": 11594,
                "base": 17644046,
                "ipm": 657.1055
              },
              {
                "word": "2013",
                "freq": 7141,
                "base": 7196676,
                "ipm": 992.2637
              },
              {
                "word": "2014",
                "freq": 6625,
                "base": 6107369,
                "ipm": 1084.7551
              },
              {
                "word": "2012",
                "freq": 5567,
                "base": 4981385,
                "ipm": 1117.5607
              },
              {
                "word": "2018",
                "freq": 8949,
                "base": 16132615,
                "ipm": 554.7148
              },
              {
                "word": "2010",
                "freq": 5450,
                "base": 4934398,
                "ipm": 1104.4915
              },
              {
                "word": "2008",
                "freq": 4382,
                "base": 4095099,
                "ipm": 1070.0596
              },
              {
                "word": "2009",
                "freq": 3483,
                "base": 3216945,
                "ipm": 1082.7043
              },
              {
                "word": "2011",
                "freq": 2317,
                "base": 2974202,
                "ipm": 779.0325
              },
              {
                "word": "2019",
                "freq": 5381,
                "base": 11822369,
                "ipm": 455.15414
              },
              {
                "word": "2007",
                "freq": 586,
                "base": 686298,
                "ipm": 853.8565
              },
              {
                "word": "1995",
                "freq": 487,
                "base": 315097,
                "ipm": 1545.5558
              },
              {
                "word": "2001",
                "freq": 523,
                "base": 386104,
                "ipm": 1354.5574
              },
              {
                "word": "2006",
                "freq": 511,
                "base": 919116,
                "ipm": 555.969
              },
              {
                "word": "1999",
                "freq": 393,
                "base": 399836,
                "ipm": 982.90295
              },
              {
                "word": "1997",
                "freq": 339,
                "base": 305381,
                "ipm": 1110.0886
              },
              {
                "word": "2004",
                "freq": 326,
                "base": 263512,
                "ipm": 1237.1353
              },
              {
                "word": "2005",
                "freq": 323,
                "base": 648991,
                "ipm": 497.69565
              },
              {
                "word": "1998",
                "freq": 254,
                "base": 333078,
                "ipm": 762.58417
              },
              {
                "word": "2000",
                "freq": 91,
                "base": 204948,
                "ipm": 444.01508
              },
              {
                "word": "2002",
                "freq": 91,
                "base": 67665,
                "ipm": 1344.8607
              },
              {
                "word": "2003",
                "freq": 79,
                "base": 324759,
                "ipm": 243.25731
              },
              {
                "word": "1996",
                "freq": 57,
                "base": 98473,
                "ipm": 578.83887
              }
            ],
            "fcrit": ""
          },
          "chunkNum": 2,
          "totalChunks": 3
        },
        {
          "entries": {
            "concSize": 32504,
            "corpusSize": 121826797,
            "freqs": [
              {
                "word": "2017",
                "freq": 5169,
                "base": 19839356,
                "ipm": 260.54272
              },
              {
                "word": "2015",
                "freq": 4257,
                "base": 17644046,
                "ipm": 241.2712
              },
              {
                "word": "2016",
                "freq": 4230,
                "base": 17929079,
                "ipm": 235.92957
              },
              {
                "word": "2013",
                "freq": 2626,
                "base": 7196676,
                "ipm": 364.8907
              },
              {
                "word": "2014",
                "freq": 2115,
                "base": 6107369,
                "ipm": 346.30295
              },
              {
                "word": "2018",
                "freq": 3443,
                "base": 16132615,
                "ipm": 213.4186
              },
              {
                "word": "2012",
                "freq": 1734,
                "base": 4981385,
                "ipm": 348.09595
              },
              {
                "word": "2010",
                "freq": 1796,
                "base": 4934398,
                "ipm": 363.9755
              },
              {
                "word": "2008",
                "freq": 1423,
                "base": 4095099,
                "ipm": 347.48856
              },
              {
                "word": "2009",
                "freq": 1334,
                "base": 3216945,
                "ipm": 414.67914
              },
              {
                "word": "2011",
                "freq": 703,
                "base": 2974202,
                "ipm": 236.36594
              },
              {
                "word": "2019",
                "freq": 2007,
                "base": 11822369,
                "ipm": 169.76294
              },
              {
                "word": "2007",
                "freq": 280,
                "base": 686298,
                "ipm": 407.98602
              },
              {
                "word": "2001",
                "freq": 235,
                "base": 386104,
                "ipm": 608.64435
              },
              {
                "word": "1995",
                "freq": 182,
                "base": 315097,
                "ipm": 577.5999
              },
              {
                "word": "2006",
                "freq": 221,
                "base": 919116,
                "ipm": 240.44843
              },
              {
                "word": "2004",
                "freq": 137,
                "base": 263512,
                "ipm": 519.9004
              },
              {
                "word": "1999",
                "freq": 174,
                "base": 399836,
                "ipm": 435.17844
              },
              {
                "word": "1997",
                "freq": 123,
                "base": 305381,
                "ipm": 402.77554
              },
              {
                "word": "1998",
                "freq": 73,
                "base": 333078,
                "ipm": 219.16788
              },
              {
                "word": "2005",
                "freq": 119,
                "base": 648991,
                "ipm": 183.36156
              },
              {
                "word": "2000",
                "freq": 39,
                "base": 204948,
                "ipm": 190.29216
              },
              {
                "word": "1996",
                "freq": 29,
                "base": 98473,
                "ipm": 294.49698
              },
              {
                "word": "2003",
                "freq": 36,
                "base": 324759,
                "ipm": 110.85143
              },
              {
                "word": "2002",
                "freq": 19,
                "base": 67665,
                "ipm": 280.7951
              }
            ],
            "fcrit": ""
          },
          "chunkNum": 2,
          "totalChunks": 3
        },
    ],
    freqBar: [
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
      },
      {
        "concSize": 1455,
        "corpusSize": 6361707,
        "freqs": [
          {
            "word": "Z: žena",
            "freq": 791,
            "base": 3477226,
            "ipm": 227.48018
          },
          {
            "word": "M: muž",
            "freq": 664,
            "base": 2855090,
            "ipm": 232.5671
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
      },
      {
        "concSize": 1375,
        "corpusSize": 6361707,
        "freqs": [
          {
            "word": "Z: žena",
            "freq": 763,
            "base": 3477226,
            "ipm": 219.4278
          },
          {
            "word": "M: muž",
            "freq": 612,
            "base": 2855090,
            "ipm": 214.35402
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
      },
    ],
    speeches: [
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
    geoAreas: [
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
      },
      {
        "concSize": 1455,
        "corpusSize": 6361707,
        "freqs": [
          {
            "word": "středočeská",
            "freq": 440,
            "base": 2155505,
            "ipm": 204.12851
          },
          {
            "word": "severovýchodočeská",
            "freq": 254,
            "base": 1170854,
            "ipm": 216.93567
          },
          {
            "word": "středomoravská",
            "freq": 212,
            "base": 874753,
            "ipm": 242.35413
          },
          {
            "word": "pohraničí české",
            "freq": 154,
            "base": 568470,
            "ipm": 270.9026
          },
          {
            "word": "slezská",
            "freq": 98,
            "base": 292150,
            "ipm": 335.44412
          },
          {
            "word": "východomoravská",
            "freq": 83,
            "base": 364947,
            "ipm": 227.43028
          },
          {
            "word": "jihočeská",
            "freq": 77,
            "base": 297619,
            "ipm": 258.72003
          },
          {
            "word": "západočeská",
            "freq": 67,
            "base": 369985,
            "ipm": 181.08842
          },
          {
            "word": "pohraničí moravské",
            "freq": 31,
            "base": 68870,
            "ipm": 450.1234
          },
          {
            "word": "česko-moravská",
            "freq": 30,
            "base": 122521,
            "ipm": 244.856
          },
          {
            "word": "neznámé",
            "freq": 8,
            "base": 11483,
            "ipm": 696.68207
          },
          {
            "word": "zahraničí",
            "freq": 1,
            "base": 35159,
            "ipm": 28.44222
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
      },
      {
        "concSize": 1375,
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
            "freq": 249,
            "base": 1170854,
            "ipm": 212.66528
          },
          {
            "word": "středomoravská",
            "freq": 186,
            "base": 874753,
            "ipm": 212.63145
          },
          {
            "word": "pohraničí české",
            "freq": 149,
            "base": 568470,
            "ipm": 262.10706
          },
          {
            "word": "západočeská",
            "freq": 109,
            "base": 369985,
            "ipm": 294.60654
          },
          {
            "word": "východomoravská",
            "freq": 78,
            "base": 364947,
            "ipm": 213.72968
          },
          {
            "word": "slezská",
            "freq": 70,
            "base": 292150,
            "ipm": 239.60295
          },
          {
            "word": "česko-moravská",
            "freq": 33,
            "base": 122521,
            "ipm": 269.34158
          },
          {
            "word": "jihočeská",
            "freq": 26,
            "base": 297619,
            "ipm": 87.360016
          },
          {
            "word": "pohraničí moravské",
            "freq": 20,
            "base": 68870,
            "ipm": 290.40222
          },
          {
            "word": "zahraničí",
            "freq": 7,
            "base": 35159,
            "ipm": 199.09554
          },
          {
            "word": "neznámé",
            "freq": 1,
            "base": 11483,
            "ipm": 87.08526
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
      },
    ],
    wordSim: [
      [
        {
          "word": "ruka",
          "pos": "N",
          "score": 0.9081081
        },
        {
          "word": "noha",
          "pos": "N",
          "score": 0.8799323
        },
        {
          "word": "potom",
          "pos": "D",
          "score": 0.84114397
        },
        {
          "word": "jenže",
          "pos": "J",
          "score": 0.82253796
        },
        {
          "word": "když",
          "pos": "J",
          "score": 0.8196497
        },
        {
          "word": "zase",
          "pos": "D",
          "score": 0.818619
        },
        {
          "word": "nechat",
          "pos": "V",
          "score": 0.80789137
        },
        {
          "word": "nakonec",
          "pos": "D",
          "score": 0.80778503
        },
        {
          "word": "snad",
          "pos": "T",
          "score": 0.801815
        },
        {
          "word": "kdyby",
          "pos": "J",
          "score": 0.79879415
        }
      ],
    ],
    translations: [
      {
        "sum": 35769,
        "lines": [
          {
            "freq": "30699",
            "perc": "85.8",
            "from": "hlava",
            "to": {
              "word": "head",
              "examples": {
                "text": [
                  {
                    "text": [
                      {
                        "type": "token",
                        "word": "na",
                        "strong": false,
                        "attrs": {
                          "lemma": "na",
                          "tag": "RR--6-----------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "koni",
                        "strong": false,
                        "attrs": {
                          "lemma": "kůň",
                          "tag": "NNMS6-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "ale",
                        "strong": false,
                        "attrs": {
                          "lemma": "ale",
                          "tag": "J^--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "najdou",
                        "strong": false,
                        "attrs": {
                          "lemma": "najít",
                          "tag": "VB-P---3P-AA---P"
                        }
                      },
                      {
                        "type": "token",
                        "word": "ho",
                        "strong": false,
                        "attrs": {
                          "lemma": "on",
                          "tag": "PHIS4--3--------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "v",
                        "strong": false,
                        "attrs": {
                          "lemma": "v",
                          "tag": "RR--6-----------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "posteli",
                        "strong": false,
                        "attrs": {
                          "lemma": "postel",
                          "tag": "NNFS6-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "a",
                        "strong": false,
                        "attrs": {
                          "lemma": "a",
                          "tag": "J^--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "jeho",
                        "strong": false,
                        "attrs": {
                          "lemma": "jeho",
                          "tag": "PSFS1-S3--------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "hlava",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "hlava",
                          "tag": "NNFS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "udeří",
                        "strong": false,
                        "attrs": {
                          "lemma": "udeřit",
                          "tag": "VB-S---3P-AA---P"
                        }
                      },
                      {
                        "type": "token",
                        "word": "o",
                        "strong": false,
                        "attrs": {
                          "lemma": "o",
                          "tag": "RR--4-----------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "práh",
                        "strong": false,
                        "attrs": {
                          "lemma": "práh",
                          "tag": "NNIS4-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ".",
                        "strong": false,
                        "attrs": {
                          "lemma": ".",
                          "tag": "Z:--------------"
                        }
                      }
                    ],
                    "alignedText": [
                      {
                        "type": "token",
                        "word": "ends",
                        "strong": false,
                        "attrs": {
                          "lemma": "end",
                          "tag": "VBZ"
                        }
                      },
                      {
                        "type": "token",
                        "word": "up",
                        "strong": false,
                        "attrs": {
                          "lemma": "up",
                          "tag": "RP"
                        }
                      },
                      {
                        "type": "token",
                        "word": "back",
                        "strong": false,
                        "attrs": {
                          "lemma": "back",
                          "tag": "RB"
                        }
                      },
                      {
                        "type": "token",
                        "word": "on",
                        "strong": false,
                        "attrs": {
                          "lemma": "on",
                          "tag": "IN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "a",
                        "strong": false,
                        "attrs": {
                          "lemma": "a",
                          "tag": "DT"
                        }
                      },
                      {
                        "type": "token",
                        "word": "bed",
                        "strong": false,
                        "attrs": {
                          "lemma": "bed",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "and",
                        "strong": false,
                        "attrs": {
                          "lemma": "and",
                          "tag": "CC"
                        }
                      },
                      {
                        "type": "token",
                        "word": "then",
                        "strong": false,
                        "attrs": {
                          "lemma": "then",
                          "tag": "RB"
                        }
                      },
                      {
                        "type": "token",
                        "word": "with",
                        "strong": false,
                        "attrs": {
                          "lemma": "with",
                          "tag": "IN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "his",
                        "strong": false,
                        "attrs": {
                          "lemma": "his",
                          "tag": "PP$"
                        }
                      },
                      {
                        "type": "token",
                        "word": "head",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "head",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "hitting",
                        "strong": false,
                        "attrs": {
                          "lemma": "hit",
                          "tag": "VBG"
                        }
                      },
                      {
                        "type": "token",
                        "word": "the",
                        "strong": false,
                        "attrs": {
                          "lemma": "the",
                          "tag": "DT"
                        }
                      },
                      {
                        "type": "token",
                        "word": "doorsill",
                        "strong": false,
                        "attrs": {
                          "lemma": "doorsill",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": ".",
                        "strong": false,
                        "attrs": {
                          "lemma": ".",
                          "tag": "SENT"
                        }
                      }
                    ],
                    "ref": "#74885132",
                    "props": {
                      "text.author": "Kundera",
                      "text.group": "Core",
                      "text.srclang": "cs",
                      "text.title": "Kniha smíchu a zapomnění",
                      "text.txtype": "fiction"
                    }
                  }
                ],
                "interactionId": "treqInteractionKey:head",
                "ref": ""
              }
            }
          },
          {
            "freq": "1409",
            "perc": "3.9",
            "from": "hlava",
            "to": {
              "word": "mind",
              "examples": {
                "text": [
                  {
                    "text": [
                      {
                        "type": "token",
                        "word": "Naplňte",
                        "strong": false,
                        "attrs": {
                          "lemma": "naplnit",
                          "tag": "Vi-P---2--A----P"
                        }
                      },
                      {
                        "type": "token",
                        "word": "si",
                        "strong": false,
                        "attrs": {
                          "lemma": "se",
                          "tag": "P7--3-----------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "mysl",
                        "strong": false,
                        "attrs": {
                          "lemma": "mysl",
                          "tag": "NNFS4-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "odpadem",
                        "strong": false,
                        "attrs": {
                          "lemma": "odpad",
                          "tag": "NNIS7-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "a",
                        "strong": false,
                        "attrs": {
                          "lemma": "a",
                          "tag": "J^--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "vaše",
                        "strong": false,
                        "attrs": {
                          "lemma": "váš",
                          "tag": "PSFS1-P2--------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "hlava",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "hlava",
                          "tag": "NNFS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "shnije",
                        "strong": false,
                        "attrs": {
                          "lemma": "shnít",
                          "tag": "VB-S---3P-AA---P"
                        }
                      },
                      {
                        "type": "token",
                        "word": ".",
                        "strong": false,
                        "attrs": {
                          "lemma": ".",
                          "tag": "Z:--------------"
                        }
                      }
                    ],
                    "alignedText": [
                      {
                        "type": "token",
                        "word": "Fill",
                        "strong": false,
                        "attrs": {
                          "lemma": "fill",
                          "tag": "VB"
                        }
                      },
                      {
                        "type": "token",
                        "word": "your",
                        "strong": false,
                        "attrs": {
                          "lemma": "your",
                          "tag": "PP$"
                        }
                      },
                      {
                        "type": "token",
                        "word": "mind",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "mind",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "with",
                        "strong": false,
                        "attrs": {
                          "lemma": "with",
                          "tag": "IN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "rubbish",
                        "strong": false,
                        "attrs": {
                          "lemma": "rubbish",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": ","
                        }
                      },
                      {
                        "type": "token",
                        "word": "and",
                        "strong": false,
                        "attrs": {
                          "lemma": "and",
                          "tag": "CC"
                        }
                      },
                      {
                        "type": "token",
                        "word": "it",
                        "strong": false,
                        "attrs": {
                          "lemma": "it",
                          "tag": "PP"
                        }
                      },
                      {
                        "type": "token",
                        "word": "'ll",
                        "strong": false,
                        "attrs": {
                          "lemma": "will",
                          "tag": "MD"
                        }
                      },
                      {
                        "type": "token",
                        "word": "rot",
                        "strong": false,
                        "attrs": {
                          "lemma": "rot",
                          "tag": "VB"
                        }
                      },
                      {
                        "type": "token",
                        "word": "your",
                        "strong": false,
                        "attrs": {
                          "lemma": "your",
                          "tag": "PP$"
                        }
                      },
                      {
                        "type": "token",
                        "word": "head",
                        "strong": false,
                        "attrs": {
                          "lemma": "head",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": ".",
                        "strong": false,
                        "attrs": {
                          "lemma": ".",
                          "tag": "SENT"
                        }
                      }
                    ],
                    "ref": "#235468465",
                    "props": {
                      "text.group": "Subtitles",
                      "text.srclang": "en",
                      "text.title": "Angela's Ashes",
                      "text.txtype": "subtitles"
                    }
                  }
                ],
                "interactionId": "treqInteractionKey:mind",
                "ref": ""
              }
            }
          },
          {
            "freq": "432",
            "perc": "1.2",
            "from": "hlava",
            "to": {
              "word": "Heads",
              "examples": {
                "text": [
                  {
                    "text": [
                      {
                        "type": "token",
                        "word": "Tak",
                        "strong": false,
                        "attrs": {
                          "lemma": "tak",
                          "tag": "Db--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "co",
                        "strong": false,
                        "attrs": {
                          "lemma": "co",
                          "tag": "PQ--1-----------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "to",
                        "strong": false,
                        "attrs": {
                          "lemma": "ten",
                          "tag": "PDNS1-----------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "bude",
                        "strong": false,
                        "attrs": {
                          "lemma": "být",
                          "tag": "VB-S---3F-AA---I"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "Špinavá",
                        "strong": false,
                        "attrs": {
                          "lemma": "špinavý",
                          "tag": "AAFS1----1A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "Sal",
                        "strong": false,
                        "attrs": {
                          "lemma": "Sal",
                          "tag": "NNFS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "hlava",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "hlava",
                          "tag": "NNFS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "nebo",
                        "strong": false,
                        "attrs": {
                          "lemma": "nebo",
                          "tag": "J^--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "nohy",
                        "strong": false,
                        "attrs": {
                          "lemma": "noha",
                          "tag": "NNFP1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "?",
                        "strong": false,
                        "attrs": {
                          "lemma": "?",
                          "tag": "Z:--------------"
                        }
                      }
                    ],
                    "alignedText": [
                      {
                        "type": "token",
                        "word": "Heads",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "head",
                          "tag": "NNS"
                        }
                      },
                      {
                        "type": "token",
                        "word": "or",
                        "strong": false,
                        "attrs": {
                          "lemma": "or",
                          "tag": "CC"
                        }
                      },
                      {
                        "type": "token",
                        "word": "tails",
                        "strong": false,
                        "attrs": {
                          "lemma": "tail",
                          "tag": "NNS"
                        }
                      },
                      {
                        "type": "token",
                        "word": "?",
                        "strong": false,
                        "attrs": {
                          "lemma": "?",
                          "tag": "SENT"
                        }
                      }
                    ],
                    "ref": "#204577753",
                    "props": {
                      "text.group": "Subtitles",
                      "text.srclang": "en",
                      "text.title": "Stardust",
                      "text.txtype": "subtitles"
                    }
                  }
                ],
                "interactionId": "treqInteractionKey:Heads",
                "ref": ""
              }
            }
          },
          {
            "freq": "391",
            "perc": "1.1",
            "from": "hlava",
            "to": {
              "word": "headache",
              "examples": {
                "text": [
                  {
                    "text": [
                      {
                        "type": "token",
                        "word": "Porodní",
                        "strong": false,
                        "attrs": {
                          "lemma": "porodní",
                          "tag": "AAFP1----1A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "bolesti",
                        "strong": false,
                        "attrs": {
                          "lemma": "bolest",
                          "tag": "NNFP1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "Maribeth",
                        "strong": false,
                        "attrs": {
                          "lemma": "Maribeth",
                          "tag": "X@--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "sice",
                        "strong": false,
                        "attrs": {
                          "lemma": "sice",
                          "tag": "J^--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "nedostala",
                        "strong": false,
                        "attrs": {
                          "lemma": "dostat",
                          "tag": "VpFS---3R-NA---P"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "ale",
                        "strong": false,
                        "attrs": {
                          "lemma": "ale",
                          "tag": "J^--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "bolela",
                        "strong": false,
                        "attrs": {
                          "lemma": "bolet",
                          "tag": "VpFS---3R-AA---I"
                        }
                      },
                      {
                        "type": "token",
                        "word": "ji",
                        "strong": false,
                        "attrs": {
                          "lemma": "on",
                          "tag": "PPFS4--3--------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "hlava",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "hlava",
                          "tag": "NNFS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ".",
                        "strong": false,
                        "attrs": {
                          "lemma": ".",
                          "tag": "Z:--------------"
                        }
                      }
                    ],
                    "alignedText": [
                      {
                        "type": "token",
                        "word": "had",
                        "strong": false,
                        "attrs": {
                          "lemma": "have",
                          "tag": "VBD"
                        }
                      },
                      {
                        "type": "token",
                        "word": "no",
                        "strong": false,
                        "attrs": {
                          "lemma": "no",
                          "tag": "DT"
                        }
                      },
                      {
                        "type": "token",
                        "word": "labor",
                        "strong": false,
                        "attrs": {
                          "lemma": "labor",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "pains",
                        "strong": false,
                        "attrs": {
                          "lemma": "pain",
                          "tag": "NNS"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": ","
                        }
                      },
                      {
                        "type": "token",
                        "word": "but",
                        "strong": false,
                        "attrs": {
                          "lemma": "but",
                          "tag": "CC"
                        }
                      },
                      {
                        "type": "token",
                        "word": "she",
                        "strong": false,
                        "attrs": {
                          "lemma": "she",
                          "tag": "PP"
                        }
                      },
                      {
                        "type": "token",
                        "word": "had",
                        "strong": false,
                        "attrs": {
                          "lemma": "have",
                          "tag": "VBD"
                        }
                      },
                      {
                        "type": "token",
                        "word": "a",
                        "strong": false,
                        "attrs": {
                          "lemma": "a",
                          "tag": "DT"
                        }
                      },
                      {
                        "type": "token",
                        "word": "good-sized",
                        "strong": false,
                        "attrs": {
                          "lemma": "good-sized",
                          "tag": "JJ"
                        }
                      },
                      {
                        "type": "token",
                        "word": "headache",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "headache",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": ".",
                        "strong": false,
                        "attrs": {
                          "lemma": ".",
                          "tag": "SENT"
                        }
                      }
                    ],
                    "ref": "#120016846",
                    "props": {
                      "text.author": "Steelová",
                      "text.group": "Core",
                      "text.srclang": "en",
                      "text.title": "Dar",
                      "text.txtype": "fiction"
                    }
                  }
                ],
                "interactionId": "treqInteractionKey:headache",
                "ref": ""
              }
            }
          },
          {
            "freq": "348",
            "perc": "1.0",
            "from": "hlava",
            "to": {
              "word": "brain",
              "examples": {
                "text": [
                  {
                    "text": [
                      {
                        "type": "token",
                        "word": "Morrell",
                        "strong": false,
                        "attrs": {
                          "lemma": "Morrell",
                          "tag": "NNMS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "vždycky",
                        "strong": false,
                        "attrs": {
                          "lemma": "vždycky",
                          "tag": "Db--------A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "opravdový",
                        "strong": false,
                        "attrs": {
                          "lemma": "opravdový",
                          "tag": "AAMS1----1A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "kamarád",
                        "strong": false,
                        "attrs": {
                          "lemma": "kamarád",
                          "tag": "NNMS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "byl",
                        "strong": false,
                        "attrs": {
                          "lemma": "být",
                          "tag": "VpIS---3R-AA---I"
                        }
                      },
                      {
                        "type": "token",
                        "word": "také",
                        "strong": false,
                        "attrs": {
                          "lemma": "také",
                          "tag": "Db--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "skvělá",
                        "strong": false,
                        "attrs": {
                          "lemma": "skvělý",
                          "tag": "AAFS1----1A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "hlava",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "hlava",
                          "tag": "NNFS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ".",
                        "strong": false,
                        "attrs": {
                          "lemma": ".",
                          "tag": "Z:--------------"
                        }
                      }
                    ],
                    "alignedText": [
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": ","
                        }
                      },
                      {
                        "type": "token",
                        "word": "ever",
                        "strong": false,
                        "attrs": {
                          "lemma": "ever",
                          "tag": "RB"
                        }
                      },
                      {
                        "type": "token",
                        "word": "a",
                        "strong": false,
                        "attrs": {
                          "lemma": "a",
                          "tag": "DT"
                        }
                      },
                      {
                        "type": "token",
                        "word": "true",
                        "strong": false,
                        "attrs": {
                          "lemma": "true",
                          "tag": "JJ"
                        }
                      },
                      {
                        "type": "token",
                        "word": "comrade",
                        "strong": false,
                        "attrs": {
                          "lemma": "comrade",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": ","
                        }
                      },
                      {
                        "type": "token",
                        "word": "too",
                        "strong": false,
                        "attrs": {
                          "lemma": "too",
                          "tag": "RB"
                        }
                      },
                      {
                        "type": "token",
                        "word": "had",
                        "strong": false,
                        "attrs": {
                          "lemma": "have",
                          "tag": "VBD"
                        }
                      },
                      {
                        "type": "token",
                        "word": "a",
                        "strong": false,
                        "attrs": {
                          "lemma": "a",
                          "tag": "DT"
                        }
                      },
                      {
                        "type": "token",
                        "word": "splendid",
                        "strong": false,
                        "attrs": {
                          "lemma": "splendid",
                          "tag": "JJ"
                        }
                      },
                      {
                        "type": "token",
                        "word": "brain",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "brain",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": ".",
                        "strong": false,
                        "attrs": {
                          "lemma": ".",
                          "tag": "SENT"
                        }
                      }
                    ],
                    "ref": "#81534905",
                    "props": {
                      "text.author": "London",
                      "text.group": "Core",
                      "text.srclang": "en",
                      "text.title": "Tulák po hvězdách",
                      "text.txtype": "fiction"
                    }
                  }
                ],
                "interactionId": "treqInteractionKey:brain",
                "ref": ""
              }
            }
          },
          {
            "freq": "269",
            "perc": "0.8",
            "from": "hlava",
            "to": {
              "word": "face",
              "examples": {
                "text": [
                  {
                    "text": [
                      {
                        "type": "token",
                        "word": "v",
                        "strong": false,
                        "attrs": {
                          "lemma": "v",
                          "tag": "RR--4-----------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "Austin",
                        "strong": false,
                        "attrs": {
                          "lemma": "austin",
                          "tag": "NNIS4-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "Friars",
                        "strong": false,
                        "attrs": {
                          "lemma": "Friars",
                          "tag": "X@--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "příslušné",
                        "strong": false,
                        "attrs": {
                          "lemma": "příslušný",
                          "tag": "AAFP4----1A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "listiny",
                        "strong": false,
                        "attrs": {
                          "lemma": "listina",
                          "tag": "NNFP4-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "objeví",
                        "strong": false,
                        "attrs": {
                          "lemma": "objevit",
                          "tag": "VB-S---3P-AA---P"
                        }
                      },
                      {
                        "type": "token",
                        "word": "se",
                        "strong": false,
                        "attrs": {
                          "lemma": "se",
                          "tag": "P7--4-----------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "ve",
                        "strong": false,
                        "attrs": {
                          "lemma": "v",
                          "tag": "RV--6-----------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "dveřích",
                        "strong": false,
                        "attrs": {
                          "lemma": "dveře",
                          "tag": "NNFP6-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "hlava",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "hlava",
                          "tag": "NNFS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ":",
                        "strong": false,
                        "attrs": {
                          "lemma": ":",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "malá",
                        "strong": false,
                        "attrs": {
                          "lemma": "malý",
                          "tag": "AAFS1----1A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "úzká",
                        "strong": false,
                        "attrs": {
                          "lemma": "úzký",
                          "tag": "AAFS1----1A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "londýnská",
                        "strong": false,
                        "attrs": {
                          "lemma": "londýnský",
                          "tag": "AAFS1----1A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "vyholená",
                        "strong": false,
                        "attrs": {
                          "lemma": "vyholený",
                          "tag": "AAFS1----1A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "hlava",
                        "strong": false,
                        "attrs": {
                          "lemma": "hlava",
                          "tag": "NNFS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "s",
                        "strong": false,
                        "attrs": {
                          "lemma": "s",
                          "tag": "RR--7-----------"
                        }
                      }
                    ],
                    "alignedText": [
                      {
                        "type": "token",
                        "word": "London",
                        "strong": false,
                        "attrs": {
                          "lemma": "London",
                          "tag": "NP"
                        }
                      },
                      {
                        "type": "token",
                        "word": "head",
                        "strong": false,
                        "attrs": {
                          "lemma": "head",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "with",
                        "strong": false,
                        "attrs": {
                          "lemma": "with",
                          "tag": "IN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "a",
                        "strong": false,
                        "attrs": {
                          "lemma": "a",
                          "tag": "DT"
                        }
                      },
                      {
                        "type": "token",
                        "word": "close-shaved",
                        "strong": false,
                        "attrs": {
                          "lemma": "close-shaved",
                          "tag": "JJ"
                        }
                      },
                      {
                        "type": "token",
                        "word": "skull",
                        "strong": false,
                        "attrs": {
                          "lemma": "skull",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "and",
                        "strong": false,
                        "attrs": {
                          "lemma": "and",
                          "tag": "CC"
                        }
                      },
                      {
                        "type": "token",
                        "word": "a",
                        "strong": false,
                        "attrs": {
                          "lemma": "a",
                          "tag": "DT"
                        }
                      },
                      {
                        "type": "token",
                        "word": "raw",
                        "strong": false,
                        "attrs": {
                          "lemma": "raw",
                          "tag": "JJ"
                        }
                      },
                      {
                        "type": "token",
                        "word": "young",
                        "strong": false,
                        "attrs": {
                          "lemma": "young",
                          "tag": "JJ"
                        }
                      },
                      {
                        "type": "token",
                        "word": "face",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "face",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": ".",
                        "strong": false,
                        "attrs": {
                          "lemma": ".",
                          "tag": "SENT"
                        }
                      }
                    ],
                    "ref": "#84660864",
                    "props": {
                      "text.author": "Mantelová",
                      "text.group": "Core",
                      "text.srclang": "en",
                      "text.title": "Wolf Hall",
                      "text.txtype": "fiction"
                    }
                  }
                ],
                "interactionId": "treqInteractionKey:face",
                "ref": ""
              }
            }
          },
          {
            "freq": "241",
            "perc": "0.7",
            "from": "hlava",
            "to": {
              "word": "capita",
              "examples": {
                "text": [],
                "interactionId": "treqInteractionKey:capita",
                "ref": ""
              }
            }
          },
          {
            "freq": "110",
            "perc": "0.3",
            "from": "hlava",
            "to": {
              "word": "skull",
              "examples": {
                "text": [
                  {
                    "text": [
                      {
                        "type": "token",
                        "word": "udělala",
                        "strong": false,
                        "attrs": {
                          "lemma": "udělat",
                          "tag": "VpFS---3R-AA---P"
                        }
                      },
                      {
                        "type": "token",
                        "word": "úplná",
                        "strong": false,
                        "attrs": {
                          "lemma": "úplný",
                          "tag": "AAFS1----1A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "tma",
                        "strong": false,
                        "attrs": {
                          "lemma": "tma",
                          "tag": "NNFS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "cítil",
                        "strong": false,
                        "attrs": {
                          "lemma": "cítit",
                          "tag": "VpMS---1R-AA---I"
                        }
                      },
                      {
                        "type": "token",
                        "word": "jsem",
                        "strong": false,
                        "attrs": {
                          "lemma": "být",
                          "tag": "VB-S---1P-AA---I"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "jak",
                        "strong": false,
                        "attrs": {
                          "lemma": "jak",
                          "tag": "Db--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "mě",
                        "strong": false,
                        "attrs": {
                          "lemma": "já",
                          "tag": "PH-S4--1--------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "bolí",
                        "strong": false,
                        "attrs": {
                          "lemma": "bolet",
                          "tag": "VB-S---3P-AA---I"
                        }
                      },
                      {
                        "type": "token",
                        "word": "hlava",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "hlava",
                          "tag": "NNFS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "jenže",
                        "strong": false,
                        "attrs": {
                          "lemma": "jenže",
                          "tag": "J^--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "jsem",
                        "strong": false,
                        "attrs": {
                          "lemma": "být",
                          "tag": "VB-S---1P-AA---I"
                        }
                      },
                      {
                        "type": "token",
                        "word": "nevěděl",
                        "strong": false,
                        "attrs": {
                          "lemma": "vědět",
                          "tag": "VpMS---1R-NA---I"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "že",
                        "strong": false,
                        "attrs": {
                          "lemma": "že",
                          "tag": "J,--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "je",
                        "strong": false,
                        "attrs": {
                          "lemma": "být",
                          "tag": "VB-S---3P-AA---I"
                        }
                      },
                      {
                        "type": "token",
                        "word": "to",
                        "strong": false,
                        "attrs": {
                          "lemma": "ten",
                          "tag": "PDNS1-----------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "od",
                        "strong": false,
                        "attrs": {
                          "lemma": "od",
                          "tag": "RR--2-----------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "toho",
                        "strong": false,
                        "attrs": {
                          "lemma": "ten",
                          "tag": "PDNS2-----------"
                        }
                      }
                    ],
                    "alignedText": [
                      {
                        "type": "token",
                        "word": "did",
                        "strong": false,
                        "attrs": {
                          "lemma": "do",
                          "tag": "VBD"
                        }
                      },
                      {
                        "type": "token",
                        "word": "n’t",
                        "strong": false,
                        "attrs": {
                          "lemma": "n’t",
                          "tag": "NP"
                        }
                      },
                      {
                        "type": "token",
                        "word": "know",
                        "strong": false,
                        "attrs": {
                          "lemma": "know",
                          "tag": "VBP"
                        }
                      },
                      {
                        "type": "token",
                        "word": "then",
                        "strong": false,
                        "attrs": {
                          "lemma": "then",
                          "tag": "RB"
                        }
                      },
                      {
                        "type": "token",
                        "word": "that",
                        "strong": false,
                        "attrs": {
                          "lemma": "that",
                          "tag": "IN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "a",
                        "strong": false,
                        "attrs": {
                          "lemma": "a",
                          "tag": "DT"
                        }
                      },
                      {
                        "type": "token",
                        "word": "bullet",
                        "strong": false,
                        "attrs": {
                          "lemma": "bullet",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "had",
                        "strong": false,
                        "attrs": {
                          "lemma": "have",
                          "tag": "VBD"
                        }
                      },
                      {
                        "type": "token",
                        "word": "fractured",
                        "strong": false,
                        "attrs": {
                          "lemma": "fracture",
                          "tag": "VBN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "my",
                        "strong": false,
                        "attrs": {
                          "lemma": "my",
                          "tag": "PP$"
                        }
                      },
                      {
                        "type": "token",
                        "word": "skull",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "skull",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": ".",
                        "strong": false,
                        "attrs": {
                          "lemma": ".",
                          "tag": "SENT"
                        }
                      }
                    ],
                    "ref": "#57192923",
                    "props": {
                      "text.author": "Chandler",
                      "text.group": "Core",
                      "text.srclang": "en",
                      "text.title": "Muž",
                      "text.txtype": "fiction"
                    }
                  }
                ],
                "interactionId": "treqInteractionKey:skull",
                "ref": ""
              }
            }
          },
          {
            "freq": "91",
            "perc": "0.3",
            "from": "hlava",
            "to": {
              "word": "worry",
              "examples": {
                "text": [
                  {
                    "text": [
                      {
                        "type": "token",
                        "word": "Nedělej",
                        "strong": false,
                        "attrs": {
                          "lemma": "dělat",
                          "tag": "Vi-S---2--N----I"
                        }
                      },
                      {
                        "type": "token",
                        "word": "si",
                        "strong": false,
                        "attrs": {
                          "lemma": "se",
                          "tag": "P7--3-----------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "kvůli",
                        "strong": false,
                        "attrs": {
                          "lemma": "kvůli",
                          "tag": "RR--3-----------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "mně",
                        "strong": false,
                        "attrs": {
                          "lemma": "já",
                          "tag": "PP-S3--1--------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "starosti",
                        "strong": false,
                        "attrs": {
                          "lemma": "starost",
                          "tag": "NNFP4-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "hlava",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "hlava",
                          "tag": "NNFS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "je",
                        "strong": false,
                        "attrs": {
                          "lemma": "být",
                          "tag": "VB-S---3P-AA---I"
                        }
                      },
                      {
                        "type": "token",
                        "word": "úplně",
                        "strong": false,
                        "attrs": {
                          "lemma": "úplně",
                          "tag": "Dg-------1A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "v",
                        "strong": false,
                        "attrs": {
                          "lemma": "v",
                          "tag": "RR--6-----------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "pořádku",
                        "strong": false,
                        "attrs": {
                          "lemma": "pořádek",
                          "tag": "NNIS6-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ".",
                        "strong": false,
                        "attrs": {
                          "lemma": ".",
                          "tag": "Z:--------------"
                        }
                      }
                    ],
                    "alignedText": [
                      {
                        "type": "token",
                        "word": "Do",
                        "strong": false,
                        "attrs": {
                          "lemma": "do",
                          "tag": "VBP"
                        }
                      },
                      {
                        "type": "token",
                        "word": "n't",
                        "strong": false,
                        "attrs": {
                          "lemma": "n't",
                          "tag": "RB"
                        }
                      },
                      {
                        "type": "token",
                        "word": "worry",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "worry",
                          "tag": "VB"
                        }
                      },
                      {
                        "type": "token",
                        "word": "about",
                        "strong": false,
                        "attrs": {
                          "lemma": "about",
                          "tag": "IN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "me",
                        "strong": false,
                        "attrs": {
                          "lemma": "me",
                          "tag": "PP"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": ","
                        }
                      },
                      {
                        "type": "token",
                        "word": "my",
                        "strong": false,
                        "attrs": {
                          "lemma": "my",
                          "tag": "PP$"
                        }
                      },
                      {
                        "type": "token",
                        "word": "head",
                        "strong": false,
                        "attrs": {
                          "lemma": "head",
                          "tag": "NN"
                        }
                      },
                      {
                        "type": "token",
                        "word": "feels",
                        "strong": false,
                        "attrs": {
                          "lemma": "feel",
                          "tag": "VBZ"
                        }
                      },
                      {
                        "type": "token",
                        "word": "completely",
                        "strong": false,
                        "attrs": {
                          "lemma": "completely",
                          "tag": "RB"
                        }
                      },
                      {
                        "type": "token",
                        "word": "normal",
                        "strong": false,
                        "attrs": {
                          "lemma": "normal",
                          "tag": "JJ"
                        }
                      },
                      {
                        "type": "token",
                        "word": ".",
                        "strong": false,
                        "attrs": {
                          "lemma": ".",
                          "tag": "SENT"
                        }
                      }
                    ],
                    "ref": "#107923460",
                    "props": {
                      "text.author": "Rowlingová",
                      "text.group": "Core",
                      "text.srclang": "en",
                      "text.title": "Harry Potter a ohnivý pohár",
                      "text.txtype": "fiction"
                    }
                  }
                ],
                "interactionId": "treqInteractionKey:worry",
                "ref": ""
              }
            }
          },
          {
            "freq": "124",
            "perc": "0.3",
            "from": "hlava",
            "to": {
              "word": "Head",
              "examples": {
                "text": [
                  {
                    "text": [
                      {
                        "type": "token",
                        "word": "Hora",
                        "strong": false,
                        "attrs": {
                          "lemma": "hora",
                          "tag": "NNFS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "Etna",
                        "strong": false,
                        "attrs": {
                          "lemma": "Etno",
                          "tag": "NNNS2-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": "Z:--------------"
                        }
                      },
                      {
                        "type": "token",
                        "word": "Severní",
                        "strong": false,
                        "attrs": {
                          "lemma": "severní",
                          "tag": "AAFS1----1A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "hlava",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "hlava",
                          "tag": "NNFS1-----A-----"
                        }
                      },
                      {
                        "type": "token",
                        "word": "…",
                        "strong": false,
                        "attrs": {
                          "lemma": ".",
                          "tag": "Z:--------------"
                        }
                      }
                    ],
                    "alignedText": [
                      {
                        "type": "token",
                        "word": "Mount",
                        "strong": false,
                        "attrs": {
                          "lemma": "Mount",
                          "tag": "NP"
                        }
                      },
                      {
                        "type": "token",
                        "word": "Etna",
                        "strong": false,
                        "attrs": {
                          "lemma": "Etna",
                          "tag": "NP"
                        }
                      },
                      {
                        "type": "token",
                        "word": ",",
                        "strong": false,
                        "attrs": {
                          "lemma": ",",
                          "tag": ","
                        }
                      },
                      {
                        "type": "token",
                        "word": "North",
                        "strong": false,
                        "attrs": {
                          "lemma": "North",
                          "tag": "NP"
                        }
                      },
                      {
                        "type": "token",
                        "word": "Head",
                        "strong": true,
                        "matchType": "kwic",
                        "attrs": {
                          "lemma": "Head",
                          "tag": "NP"
                        }
                      },
                      {
                        "type": "token",
                        "word": "…",
                        "strong": false,
                        "attrs": {
                          "lemma": "…",
                          "tag": "NP"
                        }
                      }
                    ],
                    "ref": "#232677418",
                    "props": {
                      "text.group": "Subtitles",
                      "text.srclang": "en",
                      "text.title": "Under the Mountain",
                      "text.txtype": "subtitles"
                    }
                  }
                ],
                "interactionId": "treqInteractionKey:Head",
                "ref": ""
              }
            }
          }
        ],
        "fromCorp": "intercorp_v13_cs",
        "toCorp": "intercorp_v13_en"
      }
    ],
    treqSubsets: [
      {
        "subsets": {
          "ACQUIS": {
            "sum": 4782,
            "lines": [
              {
                "freq": "2647",
                "from": "hlava",
                "perc": "55.4",
                "to": "Title"
              },
              {
                "freq": "1385",
                "from": "hlava",
                "perc": "29.0",
                "to": "title"
              },
              {
                "freq": "191",
                "from": "hlava",
                "perc": "4.0",
                "to": "head"
              },
              {
                "freq": "189",
                "from": "Hlava",
                "perc": "4.0",
                "to": "Title"
              },
              {
                "freq": "180",
                "from": "hlava",
                "perc": "3.8",
                "to": "Titles"
              },
              {
                "freq": "56",
                "from": "hlava",
                "perc": "1.2",
                "to": "Heads"
              },
              {
                "freq": "26",
                "from": "hlava",
                "perc": "0.5",
                "to": "capita"
              },
              {
                "freq": "19",
                "from": "hlava",
                "perc": "0.4",
                "to": "Chapter"
              },
              {
                "freq": "13",
                "from": "hlava",
                "perc": "0.3",
                "to": "Head"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.1",
                "to": "Pre-2005"
              },
              {
                "freq": "5",
                "from": "hlava",
                "perc": "0.1",
                "to": "chapter"
              },
              {
                "freq": "4",
                "from": "Hlava",
                "perc": "0.1",
                "to": "Section"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.1",
                "to": "TITLES"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.1",
                "to": "legal"
              },
              {
                "freq": "7",
                "from": "hlava",
                "perc": "0.1",
                "to": "Section"
              },
              {
                "freq": "5",
                "from": "hlava",
                "perc": "0.1",
                "to": "section"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.1",
                "to": "Subpart"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.1",
                "to": "Appropriations"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.1",
                "to": "p"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "Subparts"
              },
              {
                "freq": "2",
                "from": "Hlava",
                "perc": "0.0",
                "to": "Policy"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "BASIS"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "XX"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "unforeseeable"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "seminar"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "remark"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "note"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "child"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "headless"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "Communication"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "Appropriations"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "subsequent"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "Remarks"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "commitment"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "Article"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Venture"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "title"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "see"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "PRE-ACCESSION"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "nor"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Chapters"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "expansion"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "ASPECTS"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "administrative"
              }
            ]
          },
          "CORE": {
            "sum": 21988,
            "lines": [
              {
                "freq": "20093",
                "from": "hlava",
                "perc": "91.4",
                "to": "head"
              },
              {
                "freq": "857",
                "from": "hlava",
                "perc": "3.9",
                "to": "mind"
              },
              {
                "freq": "189",
                "from": "hlava",
                "perc": "0.9",
                "to": "face"
              },
              {
                "freq": "143",
                "from": "hlava",
                "perc": "0.7",
                "to": "brain"
              },
              {
                "freq": "83",
                "from": "hlava",
                "perc": "0.4",
                "to": "think"
              },
              {
                "freq": "63",
                "from": "hlava",
                "perc": "0.3",
                "to": "skull"
              },
              {
                "freq": "42",
                "from": "hlava",
                "perc": "0.2",
                "to": "hair"
              },
              {
                "freq": "34",
                "from": "hlava",
                "perc": "0.2",
                "to": "Head"
              },
              {
                "freq": "46",
                "from": "hlava",
                "perc": "0.2",
                "to": "neck"
              },
              {
                "freq": "36",
                "from": "hlava",
                "perc": "0.2",
                "to": "thought"
              },
              {
                "freq": "27",
                "from": "hlava",
                "perc": "0.1",
                "to": "her"
              },
              {
                "freq": "22",
                "from": "hlava",
                "perc": "0.1",
                "to": "eye"
              },
              {
                "freq": "21",
                "from": "hlava",
                "perc": "0.1",
                "to": "forehead"
              },
              {
                "freq": "20",
                "from": "hlava",
                "perc": "0.1",
                "to": "idea"
              },
              {
                "freq": "17",
                "from": "hlava",
                "perc": "0.1",
                "to": "nod"
              },
              {
                "freq": "11",
                "from": "hlava",
                "perc": "0.1",
                "to": "back"
              },
              {
                "freq": "27",
                "from": "hlava",
                "perc": "0.1",
                "to": "his"
              },
              {
                "freq": "23",
                "from": "hlava",
                "perc": "0.1",
                "to": "wonder"
              },
              {
                "freq": "21",
                "from": "hlava",
                "perc": "0.1",
                "to": "worry"
              },
              {
                "freq": "20",
                "from": "hlava",
                "perc": "0.1",
                "to": "top"
              },
              {
                "freq": "19",
                "from": "hlava",
                "perc": "0.1",
                "to": "chin"
              },
              {
                "freq": "11",
                "from": "hlava",
                "perc": "0.1",
                "to": "him"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "distress"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "brow"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "blood"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "around"
              },
              {
                "freq": "9",
                "from": "hlava",
                "perc": "0.0",
                "to": "drunk"
              },
              {
                "freq": "7",
                "from": "Hlava",
                "perc": "0.0",
                "to": "Head"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.0",
                "to": "man"
              },
              {
                "freq": "5",
                "from": "hlava",
                "perc": "0.0",
                "to": "up"
              },
              {
                "freq": "5",
                "from": "hlava",
                "perc": "0.0",
                "to": "memory"
              },
              {
                "freq": "5",
                "from": "hlava",
                "perc": "0.0",
                "to": "again"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.0",
                "to": "high"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.0",
                "to": "hand"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "me"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "headache"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "forget"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "with"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "off"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "editor"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "devise"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "their"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "shot"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "Ruler"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "point"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "nose"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "madhouse"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "loose"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "lean"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "jerk"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Cheer"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "head-a"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Harry"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "forward"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "dement"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "bow"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "bald"
              },
              {
                "freq": "10",
                "from": "hlava",
                "perc": "0.0",
                "to": "shoulder"
              },
              {
                "freq": "9",
                "from": "hlava",
                "perc": "0.0",
                "to": "air"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.0",
                "to": "scalp"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.0",
                "to": "end"
              },
              {
                "freq": "5",
                "from": "hlava",
                "perc": "0.0",
                "to": "stupid"
              },
              {
                "freq": "5",
                "from": "hlava",
                "perc": "0.0",
                "to": "look"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.0",
                "to": "worryin"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.0",
                "to": "Heads"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "wit"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "inside"
              },
              {
                "freq": "3",
                "from": "Hlava",
                "perc": "0.0",
                "to": "head"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "about"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "pillow"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "hit"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "ead"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "upside-down"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "skull-full"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "shit-faced"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "round"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "over"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "my"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Mad"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "liquor"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "kill"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "important"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "headcase"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "haunt"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "goodness"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "forte"
              }
            ]
          },
          "EUROPARL": {
            "sum": 892,
            "lines": [
              {
                "freq": "418",
                "from": "hlava",
                "perc": "46.9",
                "to": "Heads"
              },
              {
                "freq": "327",
                "from": "hlava",
                "perc": "36.7",
                "to": "head"
              },
              {
                "freq": "46",
                "from": "hlava",
                "perc": "5.2",
                "to": "Head"
              },
              {
                "freq": "38",
                "from": "hlava",
                "perc": "4.3",
                "to": "capita"
              },
              {
                "freq": "23",
                "from": "hlava",
                "perc": "2.6",
                "to": "Title"
              },
              {
                "freq": "9",
                "from": "hlava",
                "perc": "1.0",
                "to": "mind"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.7",
                "to": "leader"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.4",
                "to": "title"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.3",
                "to": "clear-headed"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.3",
                "to": "chief"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.2",
                "to": "mainly"
              },
              {
                "freq": "2",
                "from": "Hlava",
                "perc": "0.2",
                "to": "Catch-22"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.2",
                "to": "person"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.2",
                "to": "clear-headedness"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.1",
                "to": "off-the-cuff"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.1",
                "to": "idea"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.1",
                "to": "deliberation"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.1",
                "to": "Title"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.1",
                "to": "nurse"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.1",
                "to": "Chapter"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.1",
                "to": "beyond"
              }
            ]
          },
          "SUBTITLES": {
            "sum": 12276,
            "lines": [
              {
                "freq": "9888",
                "from": "hlava",
                "perc": "80.5",
                "to": "head"
              },
              {
                "freq": "528",
                "from": "hlava",
                "perc": "4.3",
                "to": "mind"
              },
              {
                "freq": "388",
                "from": "hlava",
                "perc": "3.2",
                "to": "headache"
              },
              {
                "freq": "201",
                "from": "hlava",
                "perc": "1.6",
                "to": "brain"
              },
              {
                "freq": "80",
                "from": "hlava",
                "perc": "0.7",
                "to": "face"
              },
              {
                "freq": "70",
                "from": "hlava",
                "perc": "0.6",
                "to": "worry"
              },
              {
                "freq": "45",
                "from": "hlava",
                "perc": "0.4",
                "to": "hair"
              },
              {
                "freq": "47",
                "from": "hlava",
                "perc": "0.4",
                "to": "skull"
              },
              {
                "freq": "41",
                "from": "hlava",
                "perc": "0.3",
                "to": "Head"
              },
              {
                "freq": "41",
                "from": "Hlava",
                "perc": "0.3",
                "to": "head"
              },
              {
                "freq": "38",
                "from": "hlava",
                "perc": "0.3",
                "to": "air"
              },
              {
                "freq": "29",
                "from": "hlava",
                "perc": "0.2",
                "to": "crazy"
              },
              {
                "freq": "23",
                "from": "Hlava",
                "perc": "0.2",
                "to": "Head"
              },
              {
                "freq": "20",
                "from": "hlava",
                "perc": "0.2",
                "to": "neck"
              },
              {
                "freq": "25",
                "from": "hlava",
                "perc": "0.2",
                "to": "upside"
              },
              {
                "freq": "20",
                "from": "hlava",
                "perc": "0.2",
                "to": "nut"
              },
              {
                "freq": "20",
                "from": "hlava",
                "perc": "0.2",
                "to": "about"
              },
              {
                "freq": "18",
                "from": "hlava",
                "perc": "0.1",
                "to": "up"
              },
              {
                "freq": "18",
                "from": "hlava",
                "perc": "0.1",
                "to": "man"
              },
              {
                "freq": "16",
                "from": "hlava",
                "perc": "0.1",
                "to": "it"
              },
              {
                "freq": "14",
                "from": "hlava",
                "perc": "0.1",
                "to": "away"
              },
              {
                "freq": "13",
                "from": "hlava",
                "perc": "0.1",
                "to": "heads"
              },
              {
                "freq": "12",
                "from": "hlava",
                "perc": "0.1",
                "to": "thought"
              },
              {
                "freq": "12",
                "from": "hlava",
                "perc": "0.1",
                "to": "behead"
              },
              {
                "freq": "11",
                "from": "hlava",
                "perc": "0.1",
                "to": "decapitate"
              },
              {
                "freq": "11",
                "from": "hlava",
                "perc": "0.1",
                "to": "ass"
              },
              {
                "freq": "8",
                "from": "hlava",
                "perc": "0.1",
                "to": "Heads"
              },
              {
                "freq": "7",
                "from": "hlava",
                "perc": "0.1",
                "to": "thinking"
              },
              {
                "freq": "7",
                "from": "hlava",
                "perc": "0.1",
                "to": "here"
              },
              {
                "freq": "18",
                "from": "hlava",
                "perc": "0.1",
                "to": "top"
              },
              {
                "freq": "17",
                "from": "hlava",
                "perc": "0.1",
                "to": "off"
              },
              {
                "freq": "16",
                "from": "hlava",
                "perc": "0.1",
                "to": "hand"
              },
              {
                "freq": "13",
                "from": "hlava",
                "perc": "0.1",
                "to": "mental"
              },
              {
                "freq": "13",
                "from": "hlava",
                "perc": "0.1",
                "to": "hat"
              },
              {
                "freq": "12",
                "from": "hlava",
                "perc": "0.1",
                "to": "smart"
              },
              {
                "freq": "11",
                "from": "hlava",
                "perc": "0.1",
                "to": "think"
              },
              {
                "freq": "11",
                "from": "hlava",
                "perc": "0.1",
                "to": "back"
              },
              {
                "freq": "10",
                "from": "hlava",
                "perc": "0.1",
                "to": "life"
              },
              {
                "freq": "8",
                "from": "hlava",
                "perc": "0.1",
                "to": "ear"
              },
              {
                "freq": "7",
                "from": "hlava",
                "perc": "0.1",
                "to": "scalp"
              },
              {
                "freq": "7",
                "from": "hlava",
                "perc": "0.1",
                "to": "drunk"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "bump"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "shirt"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "nuts"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "bulbhead"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "shadow"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "high"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "brassy"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "ruler"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "health"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "bother"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "retard"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "headshot"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "bit"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "puppet"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "dead"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "biggie"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "preference"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "body"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "bat"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "pothead"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "behind"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "around"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "point"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "backbone"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "alarm"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "pluck"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "way"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "ahead"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "plate"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "upward"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "ACD"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "pillow"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "though"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "-"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "percent"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "these"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "penny"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "table"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "over"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "straight"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "one"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "split"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "novel"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "screw"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "no-brainer"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "real"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Mm-hm"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "on"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "method"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "nerve"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "melon"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "Mother"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "L00k"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "migraine"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "lop"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "keep"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "logic"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "Huddle"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "knot"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "home"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "JFK"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "head-ache"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "insane"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "handstand"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Iesson"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "full"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "cheek"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "foot"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "chairman"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "fancy"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "housekeeper"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "dome"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Hennessy"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "delusional"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "Heads"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "calm"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "head-first"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "bone"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.0",
                "to": "whole"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "headdoesn"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "bean"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.0",
                "to": "shit"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "heada"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "wire"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.0",
                "to": "own"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "hammer"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "water"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.0",
                "to": "okay"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "fumble"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "wacko"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.0",
                "to": "mouth"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "fist"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "two"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.0",
                "to": "forget"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "father"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "turn"
              },
              {
                "freq": "5",
                "from": "hlava",
                "perc": "0.0",
                "to": "tipsy"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "face-first"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Topics"
              },
              {
                "freq": "5",
                "from": "hlava",
                "perc": "0.0",
                "to": "sense"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "escapade"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "thick"
              },
              {
                "freq": "5",
                "from": "hlava",
                "perc": "0.0",
                "to": "easy"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "ead"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "temple"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.0",
                "to": "too"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "dumb"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "target"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.0",
                "to": "step"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "duck"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "stress"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.0",
                "to": "me"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "delay"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "story"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.0",
                "to": "idea"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Cross"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "Stay"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.0",
                "to": "hangover"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "crack"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "stage"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "wear"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "contract"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "smarter"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "together"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "combo"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "siren"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "that"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "clear"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "sight"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "sleep"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "cave"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Scheisse"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "place"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "offhand"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "bulkhead"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "shaII"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "night"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "brilliant"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "run"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "her"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Brains"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "right"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "headstrong"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "bonus"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "relax"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "em"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "bigwig"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "psychotic"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "day"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Ben"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "prayer"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "blood"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "at"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "pop"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "bad"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "anybody"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "plunge"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "your"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "achy"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "plot"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "wall"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Adil"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Pipe"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "upstairs"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "above"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "pie"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "thing"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "pen-pal"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "them"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "part"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "system"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "or"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "stay"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "OCD"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "shot"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "noogie"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "rope"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "moment"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "parade"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "midsection"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "noodle"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "mentally"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "myself"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "mad"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "mine"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "low"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "little"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "loose"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "inside"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "lemon"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "hook"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "kitty"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "hit"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Jack"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "hard"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "impression"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "get"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Chin"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "forgotten"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "chance"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "fault"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "hypothesis"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "dude"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "hers"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "die"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "head-sized"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "confuse"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "headless"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "bug"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "header"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "blank"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.0",
                "to": "stupid"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "Headbutt"
              },
              {
                "freq": "2",
                "from": "hlava",
                "perc": "0.0",
                "to": "ball"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.0",
                "to": "right"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "hand"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "weird"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.0",
                "to": "out"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "guy"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "waist"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.0",
                "to": "now"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "fond"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "video"
              },
              {
                "freq": "6",
                "from": "hlava",
                "perc": "0.0",
                "to": "heart"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "fight"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "twist"
              },
              {
                "freq": "6",
                "from": "Hlava",
                "perc": "0.0",
                "to": "Catch-22"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "fall"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "trouble"
              },
              {
                "freq": "5",
                "from": "hlava",
                "perc": "0.0",
                "to": "there"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "especially"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "thinkin"
              },
              {
                "freq": "5",
                "from": "hlava",
                "perc": "0.0",
                "to": "look"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "eliminate"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "terrible"
              },
              {
                "freq": "5",
                "from": "hlava",
                "perc": "0.0",
                "to": "down"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "Dummkopf"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "temper"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.0",
                "to": "throat"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "dude"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "talk"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.0",
                "to": "sick"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "drive"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "straighten"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.0",
                "to": "leader"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "death"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "stickup"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.0",
                "to": "helmet"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "crate"
              },
              {
                "freq": "1",
                "from": "Hlava",
                "perc": "0.0",
                "to": "stay"
              },
              {
                "freq": "4",
                "from": "hlava",
                "perc": "0.0",
                "to": "block"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "cool"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "soldier"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "upset"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "concern"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "skulling"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "the"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "cleverness"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "sink"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "sweat"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "certifiable"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "side"
              },
              {
                "freq": "3",
                "from": "hlava",
                "perc": "0.0",
                "to": "retarded"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "cake"
              },
              {
                "freq": "1",
                "from": "hlava",
                "perc": "0.0",
                "to": "shoulder"
              }
            ]
          },
        }
      }
    ],
};