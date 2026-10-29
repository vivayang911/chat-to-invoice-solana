import test from 'node:test';import assert from 'node:assert/strict';import {evaluationCases} from './evaluation-cases.mjs';
test('component evaluation recognizes the observed Chinese text description without requiring one synonym',()=>{
 for(const id of ['E11','E12','E13','E14']){const c=evaluationCases.find(x=>x.id===id).requiredComponents.find(x=>x.name==='text'),pattern=new RegExp(c.pattern,'i');for(const description of ['50字符文本','50字文字新增','Added text package','50 characters'])assert.equal(pattern.test(description),true,id+': '+description);for(const description of ['海报设计','Logo design'])assert.equal(pattern.test(description),false);}
});
