import assert from 'node:assert/strict';
import {parseModelJson} from './parse-model-json.mjs';
assert.deepEqual(parseModelJson('{"amount":"100.00"}'),{amount:'100.00'});
assert.deepEqual(parseModelJson('```json\n{"amount":"100.00"}\n```'),{amount:'100.00'});
for(const invalid of ['Here is JSON: {"amount":"100.00"}','```json\n{"amount":\n```','```json\n{}\n```\nExtra explanation','{} {}',null]) assert.throws(()=>parseModelJson(invalid));
console.log('Parser checks passed: raw/fenced JSON accepted; prose, truncation, multiple values and non-text rejected.');
