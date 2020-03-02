export const makeShorthandText = (text:string, maxLength:number = 20, oneWordTolerance:number = 23) => {
    const shorthand = text.split(' ').reduce((acc, curr, index) =>
        acc[1] ? (
            index === 0 ?
            [curr, true] :
            (
                acc[0].length + curr.length + 1 < maxLength ?
                [[acc[0], curr].join(' '), true] :
                [acc[0], false]
            )
        ) : acc,
        ['', true] as [string, boolean]
    )[0] as string;

    if (shorthand.length < text.length) {
        return shorthand.length > oneWordTolerance ? shorthand.slice(0, oneWordTolerance) + '...' : shorthand + '...';
    } else {
        return text;
    }
}