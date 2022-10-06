// Generated by ScalaTS 0.5.9: https://scala-ts.github.io/scala-ts/

import { Array, isArray } from './Array';

export interface TopSecurityEvent {
  source: Array;
  destination: Array;
}

export function isTopSecurityEvent(v: any): v is TopSecurityEvent {
  return (
    (v['source'] && isArray(v['source'])) &&
    (v['destination'] && isArray(v['destination']))
  );
}