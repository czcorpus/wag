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
import { Dict, List, pipe, tuple } from 'cnc-tskit';
import { GroupLayoutConfig } from './index.js';
import { TileConf } from '../page/tile.js';


export const queriesConf = [
  {word: 'hlava', lemma: 'hlava', pos: ['N']},
  {word: 'ruka', lemma: 'ruka', pos: ['N']},
  {word: 'noha', lemma: 'noha', pos: ['N']},
]

const tileConf: {[name:string]:AnyPreviewTileConf} = {
    PREVIEW__wordFreq: {
        tileType: "WordFreqTile",
        label: {
            "cs-CZ": "Základní charakteristika",
            "en-US": "Basic characteristics"
        },
        apiURL: "/PREVIEW__wordFreq",
        infoApiURL: "---",
        helpURL: "/wag/static/vendor/ucnk/tiles-help/single/WordFreqProfile.cs.html",
        corpname: "ksp_2",
        corpusSize: 43224671,
        sfwRowRange: 7,
        useDataStream: true,
    },
    PREVIEW__mergeCorpFreq: {
        tileType: "MergeCorpFreqTile",
        apiType: "mquery",
        apiURL: "/PREVIEW__mergeCorpFreq",
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
            "url": "---"
        },
    },
    PREVIEW__wordForms: {
        tileType: "WordFormsTile",
        apiType: "mquery",
        apiURL: "/PREVIEW__wordForms",
        useDataStream: true,
        label: {
            "cs-CZ": "Tvary",
            "en-US": "Forms"
        },
        corpname: "syn2020",
        maxNumItems: 10,
        corpusSize: 150426,
        freqFilterAlphaLevel: "0.05",
        helpURL: "---",
    },
    PREVIEW__colloc: {
        tileType: "CollocTile",
        apiType: "default",
        apiURL: "/PREVIEW__colloc",
        useDataStream: true,
        corpname: "syn2020",
        minFreq: 5,
        minLocalFreq: 5,
        rangeSize: 3,
        helpURL: "anything",
        posQueryGenerator: ["tag", "ppTagset"],
        backlink:{
            url: "---"
        }
    },
    PREVIEW__concordance: {
        tileType: 'ConcordanceTile',
        label: {
            "cs-CZ": "Konkordance",
            "en-US": "Concordance"
        },
        pageSize: 10,
        posAttrs: ["word"],
        useDataStream: true,
        sentenceStruct: "s",
        posQueryGenerator: [
            "tag",
            "ppTagset"
        ],
        apiURL: "/PREVIEW__concordance",
        corpname: "syn2020",
    },
    PREVIEW__timeDistrib: {
        tileType: "TimeDistribTile",
        apiType: "mquery",
        apiURL: "/PREVIEW__timeDistrib",
        useDataStream: true,
        corpname: "syn2020",
        subcname: ["9eSmyKII"],
        showMeasuredFreq: true,
        posQueryGenerator: ["tag", "ppTagset"],
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
            "url": "---"
        }
    },
    PREVIEW__freqBar: {
        tileType: "FreqBarTile",
        apiURL: "/PREVIEW__freqBar",
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
            "url": "---"
        }
    },
    PREVIEW__speeches: {
        tileType: "SpeechesTile",
        apiType: "mquery",
        apiURL: "/PREVIEW__speeches",
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
            "url": "---"
        }
    },
    PREVIEW__geoAreas: {
        tileType: "GeoAreasTile",
        apiType: "mquery",
        apiURL: "/PREVIEW__geoAreas",
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
            "url": "---"
        }
    },
    PREVIEW__wordSim: {
        tileType: "WordSimTile",
        useDataStream: true,
        apiURL: "/PREVIEW__wordSim",
        maxResultItems: 20,
        minMatchFreq: 0,
    },
    PREVIEW__translations: {
        tileType: "TranslationsTile",
        apiURL: "/PREVIEW__translations",
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
            url: "---"
        },
    },
    PREVIEW__treqSubsets: {
        tileType: "TreqSubsetsTile",
        apiURL: "/PREVIEW__treqSubsets",
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
            url: "---"
        },
    }
};

/**
 * AnyPreviewTileConf is a mix of all the preview mode tiles' configs.
 */
interface AnyPreviewTileConf extends TileConf {
  apiURL:string;
  infoApiURL?:string;
  apiType?:string;
  corpname?:string;
  corpName?:string;
  sentenceStruct?:string;
  subcname?:unknown;
  subcorpName?:string;
  matchCase?:boolean;
  pixelsPerItem?:number;
  primaryPackage?:string;
  srchPackages?:unknown;
  maxResultItems?:number;
  subcBacklinkLabel?:unknown;
  freqType?:string;
  frequencyDisplayLimit?:number;
  minMatchFreq?:number;
  fcrit?:string;
  audioPlaybackUrl?:string;
  flimit?:number;
  fpage?:number;
  speakerIdAttr?:unknown;
  speechSegment?:unknown;
  speechOverlapAttr?:unknown;
  speechOverlapVal?:string;
  posQueryGenerator?:unknown;
  freqSort?:string;
  fttIncludeEmpty?:boolean;
  areaCodeMapping?:unknown;
  showMeasuredFreq?:boolean;
  pageSize?:number;
  minFreq?:number;
  fromYear?:number;
  toYear?:number;
  posAttrs?:Array<string>;
  maxItems?:number;
  minLocalFreq?:number;
  maxNumItems?:number;
  rangeSize?:number;
  corpusSize?:number;
  sources?:unknown;
  freqFilterAlphaLevel?:string;
  sfwRowRange?:unknown;
}

/**
 * Create tile configurations for the preview mode. Data that is
 * taken from a hardcoded configuration structure which extended
 * in a way that each tile (e.g. FooTile => {... conf ...}) is entered
 * twice (for the second time it is: FooTile2 => { ... conf ... }). This
 * allows for using cmp+single supporting tiles in both modes on the same page
 * (with additional tricks performed by tile factory - see mkTileFactory() in tileLoader.ts)
 */
export function generatePreviewTileConf():{[name:string]:AnyPreviewTileConf} {
  return pipe(
    tileConf,
    Dict.toEntries(),
    List.map(([k, v]) => [
      tuple(k, v),
      tuple(k+'2', v)
    ]),
    List.flatMap(v => v),
    Dict.fromEntries()
  )
}

export const previewLayoutConf:Array<GroupLayoutConfig> = [
  {
      groupLabel: "Frequency information",
      tiles: [
          {tile: 'PREVIEW__wordFreq', width: 1},
          {tile: 'PREVIEW__mergeCorpFreq', width: 1},
          {tile: 'PREVIEW__wordForms', width: 1},
      ]
  },
  {
      groupLabel: "Written language",
      tiles: [
          {tile: 'PREVIEW__colloc', width: 1},
          {tile: 'PREVIEW__concordance', width: 2},
          {tile: 'PREVIEW__timeDistrib', width: 2},
          {tile: 'PREVIEW__wordSim', width: 1},
      ]
  },
  {
      groupLabel: "Spoken language",
      tiles: [
          {tile: 'PREVIEW__freqBar', width: 3},
          {tile: 'PREVIEW__speeches', width: 1},
          {tile: 'PREVIEW__geoAreas', width: 2},
      ]
  },
  {
      groupLabel: "Comparison",
      tiles: [
          {tile: 'PREVIEW__wordFreq2', width: 1},
          {tile: 'PREVIEW__mergeCorpFreq2', width: 1},
          {tile: 'PREVIEW__freqBar2', width: 1},
          {tile: 'PREVIEW__colloc2', width: 3},
          {tile: 'PREVIEW__concordance2', width: 3},
          {tile: 'PREVIEW__timeDistrib2', width: 3},
          {tile: 'PREVIEW__geoAreas2', width: 3},
      ]
  },
  {
      groupLabel: "Translations",
      tiles: [
          {tile: 'PREVIEW__translations', width: 1},
          {tile: 'PREVIEW__treqSubsets', width: 2},
      ]
  },
];