const {test}=require('node:test');
const assert=require('node:assert/strict');
function fixture(items){
 const lines=items.map(item=>item.text);
 const data=[];
 for(let i=0;i<items.length;i++){
  const item=items[i];data.push(i?1:0,item.text.indexOf(item.name),item.name.length,item.type??0,item.readonly?1:0);
 }
 return {lines,data,legend:{tokenTypes:['variable','property','class','enumMember'],tokenModifiers:['readonly']}};
}
test('only readonly uppercase variable/field references receive constant color',()=>{
 const {constantRanges}=require('../dist/constants');
 const f=fixture([
  {text:'final int MAX_RETRIES = 3;',name:'MAX_RETRIES',readonly:true},
  {text:'int MUTABLE_COUNT = 2;',name:'MUTABLE_COUNT'},
  {text:'final int maxRetries = 3;',name:'maxRetries',readonly:true},
  {text:'final class UPPERCASE {}',name:'UPPERCASE',readonly:true,type:2},
  {text:'return MAX_RETRIES;',name:'MAX_RETRIES',readonly:true,type:1},
 ]);
 assert.deepEqual(constantRanges(f.lines,f.legend,f.data),[{line:0,start:10,length:11},{line:4,start:7,length:11}]);
});
test('enum constants are implicit final, but lowercase enum names stay neutral',()=>{
 const {constantRanges}=require('../dist/constants');
 const f=fixture([{text:'READY,',name:'READY',type:3},{text:'lowercase,',name:'lowercase',type:3}]);
 assert.deepEqual(constantRanges(f.lines,f.legend,f.data),[{line:0,start:0,length:5}]);
});
test('semantic positions on the same line accumulate and missing readonly does not guess from spelling',()=>{
 const {constantRanges}=require('../dist/constants');
 const legend={tokenTypes:['variable'],tokenModifiers:['readonly']};
 assert.deepEqual(constantRanges(['MAX + MIN'],legend,[0,0,3,0,1,0,6,3,0,1]),[{line:0,start:0,length:3},{line:0,start:6,length:3}]);
 assert.deepEqual(constantRanges(['MAX'],{...legend,tokenModifiers:[]},[0,0,3,0,0]),[]);
});
