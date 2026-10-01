import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBoard, saveBoard, parseBackup, STORAGE_KEY} from '../browser/storage.js';
const record = {id:'one',company:'Example',role:'Intern',status:'Saved',deadline:'2026-10-12',url:'https://example.com',notes:'Original note'};
function memory() {
  const entries = new Map();
  return {getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)};
}
test('board survives a save/load cycle',()=>{
  const s=memory(); assert.deepEqual(loadBoard(s),[]);
  saveBoard([record],s); assert.deepEqual(loadBoard(s),[record]);
});
test('invalid import leaves the saved board intact',()=>{
  const s=memory();saveBoard([record],s);
  assert.throws(()=>saveBoard([{...record,url:'javascript:alert(1)'}],s));
  assert.deepEqual(loadBoard(s),[record]);
  assert.throws(()=>parseBackup(JSON.stringify({version:1,applications:[{...record,deadline:'2026-02-30'}]})));
  assert.throws(()=>parseBackup(JSON.stringify({version:2,applications:[]})));
});
test('duplicates, large boards and invalid fields are rejected',()=>{
  const s=memory();
  assert.throws(()=>saveBoard([record,record],s));
  assert.throws(()=>saveBoard(Array(501).fill(record),s));
  assert.throws(()=>saveBoard([{...record,company:'   '}],s));
  assert.throws(()=>saveBoard([{...record,status:'Unknown'}],s));
  assert.throws(()=>saveBoard([{...record,url:'https://name:password@example.com'}],s));
});
test('backup imports preserve text but discard unrelated fields',()=>{
  const data=parseBackup(JSON.stringify({version:1,applications:[{...record,company:'<img src=x>',unexpected:'drop'}]}));
  assert.equal(data[0].company,'<img src=x>'); assert.equal(data[0].unexpected,undefined);
});
test('unreadable storage and quota errors are reported',()=>{
  const s=memory();s.setItem(STORAGE_KEY,'broken json');
  assert.throws(()=>loadBoard(s));
  assert.throws(()=>saveBoard([record],{setItem(){throw Error('Quota exceeded');}}));
});
