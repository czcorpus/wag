import * as Rx from '@reactivex/rxjs';


export interface ITileProvider {

    init():void;
    getLabel():string;
    getView():React.ComponentClass|React.SFC<{}>;

}

export interface DataApi<T, U> {
    call(queryArgs:T):Rx.Observable<U>;
}