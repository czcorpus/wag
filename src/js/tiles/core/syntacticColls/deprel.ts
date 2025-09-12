/*
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
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

export type DeprelValue = [string, string, string];


// the data below is taken from our Wiki: https://wiki.korpus.cz/doku.php/pojmy:ud


export const deprelValues:Array<DeprelValue> = [
    ['acl', 'přívlastek jako finitní i nefinitní klauze, nevazebný dopolněk', 'Mám dojem, že bych nepřepral ani hraboše. Nikdy jsem ji neviděl naštvanou.'],
    ['acl:relcl', 'vztažná věta', 'Nevěří tomu, co vidí.'],
    ['advcl', 'vedlejší věta příslovečná', 'Spěchal, aby přišel včas.'],
    ['advmod', 'adverbiální příslovečné určení', 'geneticky upravené potraviny'],
    ['advmod:emph', 'zdůrazňovací slovo, intensifikátor', 'Trvalo to sotva pár vteřin.'],
    ['amod', 'adjektivní (shodný) přívlastek', 'Václav si vzal třímilionovou půjčku.'],
    ['appos', 'apozice (přístavek)', 'Přijel Michal, můj bratr.'],
    ['aux', 'pomocné sloveso', 'Mohli byste přijet už příští týden?'],
    ['aux:pass', 'pomocné sloveso trpného rodu', 'Výstrahy byly bohužel oslyšeny.'],
    ['case', 'předložka', 'Bydlím na samotě.'],
    ['cc', 'souřadicí spojka', 'Je to mladý a nadějný chlapík.'],
    ['ccomp', 'obligatorní větné doplnění', 'Ještě včera hlásili, že pršet nebude.'],
    ['clf', 'klasifikátor', '三个学生 sān gè xuéshēng'],
    ['compound', 'nefinální části složené číslovky', 'Bude to stát padesát pět tisíc korun.'],
    ['conj', 'další člen koordinace', 'Teta včera večer přijela, přespala a ráno zase odjela.'],
    ['cop', 'spona', 'Lenka je v kondici.'],
    ['csubj', 'větný podmět', 'Obžalovanému přitížilo, že neměl alibi.'],
    ['csubj:pass', 'větný podmět pasiva', 'Jak se pozná, že je to správně?'],
    ['dep', 'nespecifikovaná závislost', 'Rozhlédl se na druhou.'],
    ['det', 'determinace', 'Která kniha se vám líbí nejvíc?'],
    ['det:numgov', 'zájmenná číslovka v neshodném pádu)', 'Mimoto bylo nablízku několik dalších králíků.'],
    ['det:nummod', 'zájmenná číslovka ve shodném pádu', 'V městě se na mnoha místech objevily plameny.'],
    ['discourse', 'diskursní výraz', 'čemu že se to zpronevěřily'],
    ['dislocated', 'extrapozice', 'Dumplings I like.'],
    ['expl:pass', 'zvratné zájmeno ve zvratném pasivu', 'S tím se nedalo nic dělat.'],
    ['expl:pv', 'zvratná částice u reflexiva tantum', 'Ona se občas tak legračně dívá.'],
    ['fixed', 'další části víceslovného výrazu', 've srovnání například s úvěry'],
    ['flat', 'další části označení osoby', 'Nejlépe to vyjádřil papež Jan Pavel II.'],
    ['flat:foreign', 'další části cizího víceslovného výrazu', 'Summum ius, summa iniuria je estetická maxima.'],
    ['goeswith', 'další část chybně rozděleného tvaru', 'Zastavil se a z těžka oddychoval.'],
    ['iobj', 'nepřímý předmět v akuzativu', 'Učí mne chemii.'],
    ['list', 'další části seznamu', 'Steve Jones tel.: 555-9814 e-mail: jones@abc.edf'],
    ['mark', 'podřadicí spojka', 'Nevěděli jsme, že babička není doma.'],
    ['nmod', 'jmenný (neshodný) přívlastek', 'kancelář ředitele'],
    ['nsubj', 'jmenný podmět', 'Auto je červené.'],
    ['nsubj:pass', 'podmět věty se slovesem v trpném rodě', 'Vypnutí vysílačky se trestá.'],
    ['nummod', 'číslovka', 'Jedno kotě spalo.'],
    ['nummod:gov', 'číslovka v pádu neshodném se jménem', 'Pět mužů hrálo karty.'],
    ['obj', 'přímý předmět', 'Přiloží si ruku na srdce.'],
    ['obl', 'jmenné příslovečné určení', 'Vzduch se tetelil očekáváním blaha.'],
    ['obl:arg', 'předmět v nepřímém pádu nebo přísl. určení ve funkci argumentu', 'Otec určitě myslel jen na matku. Věnoval jí knížku.'],
    ['orphan', 'závislost na vypuštěném větném členu', 'Pavel si objednal špenát a Markéta brokolici.'],
    ['parataxis', 'vsuvka, uvozovací věta', '„Ten člověk,“ řekl Honza, „odjel brzy ráno.'],
    ['punct', 'interpunkce', 'Máte všecko?'],
    ['reparandum', 'oprava chyby v plynulosti řeči', 'Jděte dopra- doleva.'],
    ['root', 'řídící člen věty', 'Miluju anglickou kuchyni.'],
    ['vocative', 'oslovení', 'Honzo, pojď mi pomoct!'],
    ['xcomp', 'adjektivum nebo sloveso jako obligatorní doplnění s nevyjádřeným podmětem', 'Doktorka mi doporučila denně cvičit.']
];