import * as React from 'react';
import {ActionDispatcher, ViewUtils} from 'kombo';
import { TTDistribModel } from '../model';

export function init(dispatcher:ActionDispatcher, ut:ViewUtils<{}>, model:TTDistribModel) {

    const View:React.SFC<{}> = (props) => {
        return <div>HIT</div>;
    };

    return {
        View:View
    };
}