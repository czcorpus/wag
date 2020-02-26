export const makeShorthandText = (text:string, maxLength:number = 20, oneWordTolerance:number = 23) => {
    const shorthand = text.split(' ').reduce((acc, curr) =>
        acc.length > 0 ? (acc.length + curr.length + 1 < maxLength ? [acc, curr].join(' ') : acc) : curr
    );

    if (shorthand.length > oneWordTolerance) {
        return shorthand.slice(0, oneWordTolerance);
    } else {
        return shorthand;
    }
}