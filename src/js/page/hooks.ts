/*
 * Copyright 2026 Institute of the Czech National Corpus,
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

import * as React from 'react';

/**
 * useLayoutEffect on the client, useEffect on the server
 * (prevents SSR warnings).
 */
export const useIsomorphicLayoutEffect =
    typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

/**
 * Shrinks an element to the width of its longest rendered line of text.
 *
 * CSS (inline-block, fit-content) keeps the box at its maximum width
 * once the text wraps, leaving empty space after the text. This hook
 * measures the actual line boxes and sets an explicit width. It re-measures
 * after each render and whenever the width of the parent element changes.
 *
 * The element should be shrinkable by itself (e.g. display: inline-block
 * or width: fit-content) so the text wraps naturally before measuring.
 */
export function useShrinkToText<T extends HTMLElement>(
    ref: React.RefObject<T>
): void {
    const measure = React.useCallback(() => {
        const elm = ref.current;
        if (!elm) {
            return;
        }
        elm.style.width = '';
        const range = document.createRange();
        range.selectNodeContents(elm);
        const rects = range.getClientRects();
        if (rects.length === 0) {
            return;
        }
        let left = Infinity;
        let right = -Infinity;
        for (let i = 0; i < rects.length; i++) {
            left = Math.min(left, rects[i].left);
            right = Math.max(right, rects[i].right);
        }
        const cs = window.getComputedStyle(elm);
        const extra =
            cs.boxSizing === 'border-box'
                ? parseFloat(cs.paddingLeft) +
                  parseFloat(cs.paddingRight) +
                  parseFloat(cs.borderLeftWidth) +
                  parseFloat(cs.borderRightWidth)
                : 0;
        elm.style.width = `${Math.ceil(right - left + extra)}px`;
    }, [ref]);

    // re-measure after each render (content may change)
    useIsomorphicLayoutEffect(measure);

    // re-measure whenever the available width changes
    React.useEffect(() => {
        const parent = ref.current?.parentElement;
        if (!parent || typeof ResizeObserver === 'undefined') {
            return;
        }
        let lastWidth = parent.clientWidth;
        let frame: number | null = null;
        const observer = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width;
            // ignore height-only changes (caused by our own re-wrapping)
            if (width === lastWidth) {
                return;
            }
            lastWidth = width;
            // defer DOM changes out of the observer callback
            // to avoid "ResizeObserver loop" errors
            if (frame !== null) {
                cancelAnimationFrame(frame);
            }
            frame = requestAnimationFrame(() => {
                frame = null;
                measure();
            });
        });
        observer.observe(parent);
        return () => {
            observer.disconnect();
            if (frame !== null) {
                cancelAnimationFrame(frame);
            }
        };
    }, [ref, measure]);
}
