// Generated by ScalaTS 0.5.9: https://scala-ts.github.io/scala-ts/

import { Array, isArray } from './Array';

export interface ComplianceProfileEntry {
  test_number: string;
  tags: Array;
}

export function isComplianceProfileEntry(v: any): v is ComplianceProfileEntry {
  return (
    ((typeof v['test_number']) === 'string') &&
    (v['tags'] && isArray(v['tags']))
  );
}