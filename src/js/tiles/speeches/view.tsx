/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
 *                Faculty of Arts, Charles University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apacut.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as Immutable from 'immutable';
import * as React from 'react';
import { IActionDispatcher, ViewUtils, BoundWithProps } from 'kombo';
import { SpeechesModel } from './model';
import { GlobalComponents } from '../../views/global';
import { CoreTileComponentProps, TileComponent } from '../../common/tile';
import { Theme } from '../../common/theme';
import { Speech, SpeechesModelState, Expand } from './modelDomain';
import { RGBAColor } from '../../common/types';
import { ActionName, Actions } from './actions';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:SpeechesModel):TileComponent {

    const globComponents = ut.getComponents();

    function color2str(c:RGBAColor):string {
        return c !== null ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})` : 'transparent';
    }

    function calcTextColorFromBg(bgColor:RGBAColor):RGBAColor {
        const color = bgColor ? bgColor : [255, 255, 255, 1];
        const lum = 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2];
        return lum > 128 ? [1, 1, 1, 1] : [231, 231, 231, 1];
    }

    function exportMetadata(data) {
        if (data.size > 0) {
            return data.map((val, attr) => `${attr}: ${val}`).join(', ');

        } else {
            return ut.translate('speeches__no_speech_metadata_available');
        }
    }

    // ------------------------- <ExpandSpeechesButton /> ---------------------------

    const ExpandSpeechesButton:React.SFC<{
        position:string;
        tileId:number;

    }> = (props) => {

        const handleExpandClick = (position:Expand) => {
            dispatcher.dispatch({
                name: ActionName.ExpandSpeech,
                payload: {
                    tileId: props.tileId,
                    position: position
                }
            });
        };

        const ifTopThenElseIfBottom = (val1:string, val2:string) => {
            if (props.position === 'top') {
                return val1;

            } else if (props.position === 'bottom') {
                return val2;
            }
        };

        const createImgPath = () => {
            return ut.createStaticUrl(ifTopThenElseIfBottom(
                'triangle_up.svg', 'triangle_down.svg'
            ));
        };

        const createImgAlt = () => {
            return ut.translate(ifTopThenElseIfBottom(
                'speeches__expand_up_symbol', 'speeches__expand_down_symbol'
            ));
        };

        const createTitle = () => {
            return ut.translate(ifTopThenElseIfBottom(
                'speeches__click_to_expand_up', 'speeches__click_to_expand_down'
            ));
        };

        return (
            <a onClick={handleExpandClick.bind(null, props.position)}
                    title={createTitle()}>
                <img src={createImgPath()} alt={createImgAlt()} />
            </a>
        );
    };



    // ------------------------- <SpeechText /> ---------------------------

    const SpeechText:React.SFC<{
        bulletColor:string;
        data:Array<{class:string; str:string}>;

    }> = (props) => {

        return (
            <div className="speech-text">
                <span style={{color: props.bulletColor}}>{'\u25cf\u00a0'}</span>
                {props.data.map((item, i) => {
                    return <span key={i} className={item.class ? item.class : null}>{item.str}</span>;
                })}
            </div>
        );
    };


    // ------------------------- <TRSingleSpeech /> ---------------------------

    const TRSingleSpeech:React.SFC<{
        idx:number;
        speech:Speech;

    }> = (props) => {

        const style = {
            backgroundColor: color2str(props.speech.colorCode),
            color: color2str(calcTextColorFromBg(props.speech.colorCode))
        };
        return (
            <tr key={`speech-${props.idx}`} className="speech">
                <th>
                    <strong className="speaker" title={exportMetadata(props.speech.metadata)}
                            style={style}>
                        {props.speech.speakerId}
                    </strong>
                </th>
                <td className="text">
                    <SpeechText data={props.speech.text} key={props.idx}
                            bulletColor={color2str(props.speech.colorCode)} />
                </td>
            </tr>
        );
    };

    // ------------------------- <TROverlappingSpeeches /> ---------------------------

    const TROverlappingSpeeches:React.SFC<{
        idx:number;
        speeches:Array<Speech>;

    }> = (props) => {

        const renderOverlappingSpeakersLabel = () => {
            const ans = [];
            Immutable.List<Speech>(props.speeches)
                .groupBy(v => v.speakerId)
                .valueSeq()
                .forEach((speakerSpeeches, i) => {
                    const speech = speakerSpeeches.get(0);
                    if (i > 0) {
                        ans.push(<span key={`p-${props.idx}:${i}`} className="plus">{'\u00a0'}+{'\u00a0'}</span>);
                    }
                    const css = {
                        backgroundColor: color2str(speech.colorCode),
                        color: color2str(calcTextColorFromBg(speech.colorCode))
                    };
                    ans.push(<strong key={`${props.idx}:${i}`} className="speaker"
                                    title={exportMetadata(speech.metadata)}
                                    style={css}>{speech.speakerId}</strong>);
                });
            return ans;
        };

        return (
            <tr key={`speech-${props.idx}`} className="speech">
                <th>
                    {renderOverlappingSpeakersLabel()}
                </th>
                <td className="text overlapping-block">
                    {props.speeches.map((speech, i) => <SpeechText data={speech.text}
                                key={`${props.idx}:${i}`}
                                bulletColor={color2str(speech.colorCode)} />)}
                </td>
            </tr>
        );
    };


    // -------------------------- <LoadNext /> --------------------------------------

    const LoadNext:React.SFC<{
        tileId:number;

    }> = (props) => {

        const handleClick = () => {
            dispatcher.dispatch<Actions.LoadAnotherSpeech>({
                name: ActionName.LoadAnotherSpeech,
                payload: {
                    tileId: props.tileId
                }
            });
        };

        return (
            <div className="tweak-box">
                <a onClick={handleClick} title={ut.translate('speeches__load_different_sp_button')}>
                    <img src={ut.createStaticUrl('triangle_right.svg')} alt={ut.translate('speeches__load_different_sp_button')} />
                </a>
            </div>
        );
    };

    // ------------------------- <SpeechView /> -------------------------------

    const SpeechView:React.SFC<{
        tileId:number;
        isTweakMode:boolean;
        data:Array<Array<Speech>>;
        hasExpandLeft:boolean;
        hasExpandRight:boolean;

    }> = (props) => {
        const renderSpeechLines = () => {
            return (props.data || []).map((item, i) => {
                if (item.length === 1) {
                    return <TRSingleSpeech key={`sp-line-${i}`} speech={item[0]} idx={i} />;

                } else if (item.length > 1) {
                    return <TROverlappingSpeeches key={`sp-line-${i}`} speeches={item} idx={i} />;

                } else {
                    return null;
                }
            });
        };

        return (
            <div>
                <table className="speeches">
                    <tbody>
                        <tr className="next">
                            <th>
                                {props.isTweakMode ?
                                    <LoadNext tileId={props.tileId} /> : null}
                            </th>
                            <td />
                        </tr>
                        <tr className="expand">
                            <th>
                                {props.hasExpandLeft && props.isTweakMode  ?
                                    <ExpandSpeechesButton tileId={props.tileId} position={Expand.TOP} />
                                : null}
                            </th>
                            <td />
                        </tr>
                        {renderSpeechLines()}
                        <tr className="expand">
                            <th>
                                {props.hasExpandRight && props.isTweakMode ?
                                    <ExpandSpeechesButton tileId={props.tileId} position={Expand.BOTTOM} />
                                : null}
                            </th>
                            <td />
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }

    // -------------------------- <SpeechesTile /> --------------------------------------

    class SpeechesTile extends React.PureComponent<SpeechesModelState & CoreTileComponentProps> {
        render() {
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.length > 0}
                        sourceIdent={{corp: this.props.corpname, subcorp: this.props.subcDesc}}
                        backlink={this.props.backlink}
                        supportsTileReload={this.props.supportsReloadOnError}>
                    <div className="SpeechesTile">
                       <SpeechView data={this.props.data} hasExpandLeft={!!this.props.expandLeftArgs.get(-1)}
                                hasExpandRight={!!this.props.expandRightArgs.get(-1)}
                                tileId={this.props.tileId} isTweakMode={this.props.isTweakMode} />
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, SpeechesModelState>(SpeechesTile, model);

}