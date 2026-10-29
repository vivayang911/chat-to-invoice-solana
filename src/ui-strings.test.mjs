import {test} from 'node:test';
import assert from 'node:assert/strict';
import {translate} from './ui-strings.mjs';
test('Chinese UI translation preserves numeric facts and English mode',()=>{
 assert.equal(translate('Analyze agreement','zh'),'分析当前约定');
 assert.equal(translate('Analyze agreement','en'),'Analyze agreement');
 assert.equal(translate('$100.00 USD','zh'),'$100.00 USD');
 assert.equal(translate('Amount · M2','zh'),'金额 · M2');
 assert.match(translate('Completed · 12.3 sec · agnes-3.0-flash. Human review required.','zh'),/12\.3/);
 assert.match(translate('Invoice blocked: No confirmed billable amount.','zh'),/没有已确认的可收费金额/);
});
