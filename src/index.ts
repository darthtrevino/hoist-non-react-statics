/**
 * Copyright 2015, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
import { ForwardRef, isMemo } from "react-is";


export interface ReactStatics {
  childContextTypes: true;
  contextType: true;
  contextTypes: true;
  defaultProps: true;
  displayName: true;
  getDefaultProps: true;
  getDerivedStateFromError: true;
  getDerivedStateFromProps: true;
  mixins: true;
  propTypes: true;
  type: true;
}

export interface KnownStatics {
  name: true;
  length: true;
  prototype: true;
  caller: true;
  callee: true;
  arguments: true;
  arity: true;
}

export interface MemoStatics {
  '$$typeof': true;
  compare: true;
  defaultProps: true;
  displayName: true;
  propTypes: true;
  type: true;
}

export interface ForwardRefStatics {
  '$$typeof': true;
  render: true;
  defaultProps: true;
  displayName: true;
  propTypes: true;
}

const REACT_STATICS: ReactStatics = {
  childContextTypes: true,
  contextType: true,
  contextTypes: true,
  defaultProps: true,
  displayName: true,
  getDefaultProps: true,
  getDerivedStateFromError: true,
  getDerivedStateFromProps: true,
  mixins: true,
  propTypes: true,
  type: true
};

 const KNOWN_STATICS: KnownStatics = {
  name: true,
  length: true,
  prototype: true,
  caller: true,
  callee: true,
  arguments: true,
  arity: true
};

const FORWARD_REF_STATICS: ForwardRefStatics = {
  $$typeof: true,
  render: true,
  defaultProps: true,
  displayName: true,
  propTypes: true
};

const MEMO_STATICS: MemoStatics = {
  $$typeof: true,
  compare: true,
  defaultProps: true,
  displayName: true,
  propTypes: true,
  type: true
};

export type NonReactStatics<
  S extends React.ComponentType<any>,
  C extends {
    [key: string]: true;
  } = {}
> = {
  [key in Exclude<
    keyof S,
    S extends React.MemoExoticComponent<any>
      ? keyof MemoStatics | keyof C
      : S extends React.ForwardRefExoticComponent<any>
      ? keyof ForwardRefStatics | keyof C
      : keyof ReactStatics | keyof KnownStatics | keyof C
  >]: S[key];
};

const TYPE_STATICS = {};
TYPE_STATICS[ForwardRef] = FORWARD_REF_STATICS;

function getStatics(component) {
  if (isMemo(component)) {
    return MEMO_STATICS;
  }
  return TYPE_STATICS[component["$$typeof"]] || REACT_STATICS;
}

const defineProperty = Object.defineProperty;
const getOwnPropertyNames = Object.getOwnPropertyNames;
const getOwnPropertySymbols: any = Object.getOwnPropertySymbols;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const getPrototypeOf = Object.getPrototypeOf;
const objectPrototype = Object.prototype;

export default function hoistNonReactStatics(
  targetComponent: React.ComponentType<any>,
  sourceComponent: React.ComponentType<any>,
  blacklist?: Record<string, boolean>
) {
  if (typeof sourceComponent !== "string") {
    // don't hoist over string (html) components

    if (objectPrototype) {
      const inheritedComponent = getPrototypeOf(sourceComponent);
      if (inheritedComponent && inheritedComponent !== objectPrototype) {
        hoistNonReactStatics(targetComponent, inheritedComponent, blacklist);
      }
    }

    let keys = getOwnPropertyNames(sourceComponent);

    if (getOwnPropertySymbols) {
      keys = keys.concat(getOwnPropertySymbols(sourceComponent));
    }

    const targetStatics = getStatics(targetComponent);
    const sourceStatics = getStatics(sourceComponent);

    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i];
      if (
        !KNOWN_STATICS[key] &&
        !(blacklist && blacklist[key]) &&
        !(sourceStatics && sourceStatics[key]) &&
        !(targetStatics && targetStatics[key])
      ) {
        const descriptor = getOwnPropertyDescriptor(sourceComponent, key);
        try {
          // Avoid failures from read-only properties
          defineProperty(targetComponent, key, descriptor);
        } catch (e) {}
      }
    }
  }

  return targetComponent;
}
