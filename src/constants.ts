export interface TokenLegend {tokenTypes:readonly string[];tokenModifiers:readonly string[]}
export interface TokenRange {line:number;start:number;length:number}

/** Use provider semantics, never infer final from uppercase spelling alone. */
export function constantRanges(lines:readonly string[],legend:TokenLegend,data:ArrayLike<number>):TokenRange[]{
 const result:TokenRange[]=[];
 const readonly=legend.tokenModifiers.indexOf('readonly');
 let line=0,start=0;
 for(let i=0;i+4<data.length;i+=5){
  line+=data[i];start=data[i]===0?start+data[i+1]:data[i+1];
  const length=data[i+2],type=legend.tokenTypes[data[i+3]];
  const immutable=readonly>=0 && readonly<32 && (data[i+4] & (1<<readonly))!==0;
  if(type!=='enumMember' && (!immutable || !['variable','property','parameter'].includes(type)))continue;
  if(length<=0 || line<0 || start<0 || !lines[line] || start+length>lines[line].length)continue;
  if(/^[A-Z][A-Z0-9_]*$/.test(lines[line].slice(start,start+length)))result.push({line,start,length});
 }
 return result;
}
