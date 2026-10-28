import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

test('build_theory.mjs turns every grade markdown into well-formed JSON (3 units, 15 weeks, 3 quiz questions each)',()=>{
 execFileSync(process.execPath,['tools/build_theory.mjs'],{stdio:'pipe'});
 for(const grade of [6,7,8,9]){
  const data=JSON.parse(fs.readFileSync(`public/theory/grade-${grade}.json`,'utf-8'));
  assert.equal(data.grade,grade);assert.equal(data.units.length,3,`grade ${grade}: 3 units`);
  let n=0;
  for(const unit of data.units){
   assert(unit.title&&unit.place,`grade ${grade} unit has a title and a place`);
   for(const week of unit.weeks){
    n++;
    assert.equal(week.number,n,`weeks are numbered 1..15 in order`);
    for(const field of ['title','objective','safety','discuss','challenge'])
     assert(typeof week[field]==='string'&&week[field].length>0,`grade ${grade} week ${n}: "${field}" is not empty`);
    assert(week.theory.length>=1&&week.steps.length>=1,`grade ${grade} week ${n}: has theory paragraphs and steps`);
    assert.equal(week.quiz.length,3,`grade ${grade} week ${n}: exactly 3 quiz questions`);
    for(const q of week.quiz){
     assert.equal(q.options.length,3,'3 options per question');
     assert(q.correct>=0&&q.correct<3,'a valid correct-option index');
     assert(q.question.length>0&&q.options.every(o=>o.length>0),'no empty question or option text');
    }
   }
  }
  assert.equal(n,15,`grade ${grade}: 15 weeks total`);
 }
 const index=JSON.parse(fs.readFileSync('public/theory/index.json','utf-8'));
 assert.deepEqual(index.map(g=>g.grade),[6,7,8,9]);
});
