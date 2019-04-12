/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
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

import * as sax from 'sax';


export class XMLNode {

	name:string;

	children:Array<XMLNode|string>;

	attributes:{[name:string]:string};

	constructor(name?:string, attrs?:{[name:string]:string}) {
		this.name = name || '';
		this.attributes = attrs || {};
		this.children = [];
	}

	toString():string {
		if (this.children.length === 0) {
			return `<${this.name} ${Object.entries(this.attributes).map(v => v[0] + '=' + v[1])} />`;

		} else {
			return `<${this.name} ${Object.entries(this.attributes).map(v => v[0] + '=' + v[1])}>`;
		}
	}

	mapChildren<T>(fn:(item:XMLNode|string)=>T):Array<T> {
		return this.children.map(fn);
	}

	filterChildren(fn:(item:XMLNode)=>boolean):Array<XMLNode> {
		return this.children.filter(isXMLNode).filter(fn);
	}

	findChild(fn:(item:XMLNode)=>boolean, defaultVal?:XMLNode):XMLNode|undefined {
		const ans = this.children.find(v => v instanceof XMLNode && fn(v));
		return ans ? ans as XMLNode : defaultVal;
	}

	findAllChildren(fn:(item:XMLNode)=>boolean):Array<XMLNode> {
		return this.children.filter(isXMLNode).filter(fn);
	}

	findChildRecursive(fn:(item:XMLNode)=>boolean, defaultVal?:XMLNode):XMLNode|undefined {

		const innerFn = (node:XMLNode) => {
			for (let i = 0; i < node.children.length; i += 1) {
				const v = node.children[i];
				if (isXMLNode(v)) {
					if (fn(v)) {
						return v;

					} else {
						const ans = innerFn(v);
						if (ans !== undefined) {
							return ans;
						}
					}
				}
			}
			return undefined;
		};

		const ans = innerFn(this);
		return ans || defaultVal;
	}

	textContent():string {
		return this.children.filter(isTextNode).reduce(
			(acc, curr) => acc.concat([curr.trim()]),[]).join(' ');
	}
}

function isTextNode(v:XMLNode|string):v is string {
	return typeof v === 'string';
}

function isXMLNode(v:XMLNode|string):v is XMLNode {
	return v instanceof XMLNode;
}


export function dumpTree(rootXMLNode:XMLNode):void {

	const whitespace = (len:number) => Array(len).fill(' ').join('');

	const dtree = (root:XMLNode|string, depth:number) => {
		if (typeof root === 'string') {
			console.log(whitespace(depth) + root);

		} else {
			console.log(whitespace(depth) + root.toString());
			root.children.forEach(child => dtree(child, depth + 4));
			console.log(whitespace(depth) + `</${root.name}>`);
		}
	}

	dtree(rootXMLNode, 0);
}

/**
 * A SAX based parser producing a simple tree of XMLNode and string instances.
 */
export class XMLParser {

 	private readonly parser:sax.SAXParser;

 	private tree:XMLNode;

 	private stack:Array<XMLNode>;

 	constructor() {
 		this.parser = sax.parser(true, {});
 		this.parser.onerror = this.onError.bind(this);
 		this.parser.ontext = this.onText.bind(this);
 		this.parser.onopentag = this.onOpenTag.bind(this);
 		this.parser.onattribute = this.onAttribute.bind(this);
 		this.parser.onclosetag = this.onCloseTag.bind(this);
 	}

 	private onError(err) {
 	}

 	private onText(t) {
 		this.stackCurr().children.push(t);
 	}

 	private onOpenTag(node:{name:string; attributes:{}, isSelfClosing:boolean}) {
 		const curr = this.stackCurr();
 		const elm = this.pushXMLNode(node.name, node.attributes);
 		curr.children.push(elm);
 	}

 	private onAttribute(attr:{name:string; value:string}) {
 	}

 	private onCloseTag() {
 		this.stack.pop();
 	}

 	private stackCurr():XMLNode {
 		return this.stack[this.stack.length - 1];
 	}

 	private pushXMLNode(name:string, attrs:{[name:string]:string}):XMLNode {
 		const node = new XMLNode(name, attrs);
 		this.stack.push(node);
 		return node;
 	}

 	parse(xml:string):XMLNode {
 		this.tree = new XMLNode('__document__');
 		this.stack = [this.tree];
 		this.parser.write(xml).close();
 		return this.tree;
 	}
 }