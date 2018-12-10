import * as Rx from '@reactivex/rxjs';


export interface ITileProvider {

    init():void;
    getView():React.Component|React.SFC<{}>;

}

export interface DataApi<T, U> {
    call(queryArgs:T):Rx.Observable<U>;
}