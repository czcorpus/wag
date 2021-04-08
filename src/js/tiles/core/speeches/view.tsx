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
import * as React from 'react';
import { IActionDispatcher, ViewUtils, BoundWithProps } from 'kombo';
import { SpeechesModel } from './model';
import { GlobalComponents } from '../../../views/global';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile';
import { Theme } from '../../../page/theme';
import { Speech, SpeechesModelState, SpeechLine, Segment } from './modelDomain';
import { Actions } from './actions';
import { List, pipe, Color } from 'cnc-tskit';
import { LineElement } from '../../../api/abstract/concordance';



export function init(
    dispatcher:IActionDispatcher,
    ut:ViewUtils<GlobalComponents>,
    theme:Theme,
    model:SpeechesModel
):TileComponent {

    const globComponents = ut.getComponents();

    function exportMetadata(data) {
        if (data.size > 0) {
            return data.map((val, attr) => `${attr}: ${val}`).join(', ');

        } else {
            return ut.translate('speeches__no_speech_metadata_available');
        }
    }


    // ------------------------- <SpeechText /> ---------------------------

    const SpeechText:React.SFC<{
        bulletColor:string;
        data:Array<LineElement>;
        isIncomplete:boolean;

    }> = (props) => {

        return (
            <div className="speech-text">
                <span style={{color: props.bulletColor}}>{'\u25cf\u00a0'}</span>
                {props.isIncomplete ? '\u2026\u00a0' : null}
                {List.map(
                    (item, i) => <span key={i} className={item.type ? item.type : null}>{item.str}</span>,
                    props.data
                )}
            </div>
        );
    };


    // ------------------------- <TRSingleSpeech /> ---------------------------

    const TRSingleSpeech:React.SFC<{
        tileId:number;
        idx:number;
        speech:Speech;
        isPlaying:boolean;

    }> = (props) => {
        const style = {
            backgroundColor: Color.color2str(props.speech.colorCode),
            color: pipe(props.speech.colorCode, Color.textColorFromBg(), Color.color2str())
        };
        return (
            <>
                <dt className="speaker">
                    <strong title={exportMetadata(props.speech.metadata)}
                            style={style}>
                        {props.speech.speakerId ? props.speech.speakerId : '\u2026'}
                    </strong>
                    {props.speech.segments.length > 0 ?
                        <PlayerIcon tileId={props.tileId} lineIdx={props.idx} isPlaying={props.isPlaying}
                                segments={props.speech.segments} /> :
                        null
                    }
                </dt>
                <dd className="speech">
                    <div className="text">
                        <SpeechText data={props.speech.text} key={props.idx}
                                bulletColor={Color.color2str(props.speech.colorCode)}
                                isIncomplete={!props.speech.speakerId} />
                    </div>
                </dd>
            </>
        );
    };

    // ------------------------- <TROverlappingSpeeches /> ---------------------------

    const TROverlappingSpeeches:React.SFC<{
        tileId:number;
        idx:number;
        speeches:Array<Speech>;
        isPlaying:boolean;

    }> = (props) => {

        const renderOverlappingSpeakersLabel = () => {
            return pipe(
                props.speeches,
                List.groupBy(v => v.speakerId),
                List.reduce(
                    (acc, [,speakerSpeeches], i) => {
                        const speech = speakerSpeeches[0];
                        if (i > 0) {
                            acc.push(<span key={`p-${props.idx}:${i}`} className="plus">{'\u00a0'}+{'\u00a0'}</span>);
                        }
                        const css = {
                            backgroundColor: Color.color2str(speech.colorCode),
                            color: Color.color2str(Color.textColorFromBg(speech.colorCode))
                        };
                        acc.push(<strong key={`${props.idx}:${i}`} className="speaker"
                                        title={exportMetadata(speech.metadata)}
                                        style={css}>{speech.speakerId}</strong>);
                        return acc;
                    },
                    [] as Array<React.ReactElement>
                )
            );
        };

        return (
            <>
                <dt className="speaker">
                    {renderOverlappingSpeakersLabel()}
                    <PlayerIcon tileId={props.tileId} lineIdx={props.idx} isPlaying={props.isPlaying}
                            segments={props.speeches.reduce((acc, curr) => acc.concat(curr.segments), [])} />
                </dt>
                <dd className="speech overlapping-block">
                    <div className="text">
                        {props.speeches.map((speech, i) => <SpeechText data={speech.text}
                                    key={`${props.idx}:${i}`}
                                    bulletColor={Color.color2str(speech.colorCode)}
                                    isIncomplete={!speech.speakerId} />)}
                    </div>
                </dd>
            </>
        );
    };


    // -------------------------- <LoadNext /> --------------------------------------

    const LoadNext:React.SFC<{
        tileId:number;
        active:boolean;

    }> = (props) => {

        const handleClick = () => {
            dispatcher.dispatch<typeof Actions.LoadAnotherSpeech>({
                name: Actions.LoadAnotherSpeech.name,
                payload: {
                    tileId: props.tileId
                }
            });
        };

        return (
            <a style={props.active ? null : {pointerEvents: 'none', cursor: 'default'}} onClick={handleClick} title={ut.translate('speeches__load_different_sp_button')}>
                <img src={ut.createStaticUrl(props.active ? 'next.svg' : 'next_grey.svg')} style={{width: '1.8em'}} alt={ut.translate('speeches__load_different_sp_button')} />
            </a>
        );
    };

    // ------------------------- <PlayerIcon /> -------------------------------

    const PlayerIcon:React.SFC<{
        tileId:number;
        lineIdx:number;
        isPlaying:boolean;
        segments:Array<Segment>;

    }> = (props) => {

        const handleClick = () => {
            dispatcher.dispatch<typeof Actions.ClickAudioPlayer>({
                name: Actions.ClickAudioPlayer.name,
                payload: {
                    tileId: props.tileId,
                    lineIdx: props.lineIdx,
                    segments: props.segments
                }
            });
        };

        return (
            <a className="PlayerIcon" onClick={handleClick}>
                <img src={ut.createStaticUrl(props.isPlaying ? 'audio-3w.svg' : 'audio-0w.svg')}
                        alt={ut.translate('global__img_alt_play_audio')} />
            </a>
        )
    }

    // ------------------------- <SpeechView /> -------------------------------

    const SpeechView:React.SFC<{
        tileId:number;
        isTweakMode:boolean;
        data:Array<SpeechLine>;
        hasExpandLeft:boolean;
        hasExpandRight:boolean;
        playingLineIdx:number;
        availTokens:number[];

    }> = (props) => {
        const renderSpeechLines = () => {
            return (props.data || []).map((item, i) => {
                if (item.length === 1) {
                    return <TRSingleSpeech key={`sp-line-${i}`} tileId={props.tileId}
                                speech={item[0]} idx={i} isPlaying={props.playingLineIdx === i} />;

                } else if (item.length > 1) {
                    return <TROverlappingSpeeches key={`sp-line-${i}`} tileId={props.tileId} speeches={item}
                                idx={i} isPlaying={props.playingLineIdx === i} />;

                } else {
                    return null;
                }
            });
        };

        const handlePlayAllClick = () => {
            dispatcher.dispatch<typeof Actions.ClickAudioPlayAll>({
                name: Actions.ClickAudioPlayAll.name,
                payload: {
                    tileId: props.tileId
                }
            });
        };

        return (
            <div>
                <div className="navig">
                    <div className="next">
                            {props.isTweakMode ?
                                <LoadNext tileId={props.tileId} active={props.availTokens.length > 1} /> : null}
                    </div>
                </div>
                <div className="play-all">
                    <a onClick={handlePlayAllClick}>
                        {ut.translate('speeches__play_all_btn')}
                    </a>
                </div>
                <dl className="speeches">
                    {renderSpeechLines()}
                </dl>
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
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <div className="SpeechesTile">
                       <SpeechView data={this.props.data} hasExpandLeft={!!List.get(-1, this.props.expandLeftArgs)}
                                hasExpandRight={!!List.get(-1, this.props.expandRightArgs)}
                                tileId={this.props.tileId} isTweakMode={this.props.isTweakMode}
                                playingLineIdx={this.props.playback ? this.props.playback.currLineIdx : -1}
                                availTokens={this.props.availTokens} />
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, SpeechesModelState>(SpeechesTile, model);

}