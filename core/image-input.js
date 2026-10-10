import {inflateSync} from 'node:zlib';
/** Bounded input-quality gate, not object recognition or identifier detection. */
export function usableImage(image){
 try{
  if(typeof image!=='string')return false;const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);if(!match)return false;
  const bytes=Buffer.from(match[2],'base64');if(bytes.length>3*1024*1024)return false;let width,height;
  if(match[1]==='png'){
   if(bytes.length<33||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return false;
   width=bytes.readUInt32BE(16);height=bytes.readUInt32BE(20);
   if(!dimensions(width,height)||bytes[24]!==8||bytes[28]!==0)return false;
   const channels={0:1,2:3,4:2,6:4}[bytes[25]];if(!channels)return false;
   const chunks=[];let offset=8;while(offset+12<=bytes.length){const size=bytes.readUInt32BE(offset);if(size>bytes.length-offset-12)return false;const type=bytes.toString('ascii',offset+4,offset+8);if(type==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+size));offset+=size+12;if(type==='IEND')break}
   const stride=width*channels,expected=(stride+1)*height;if(expected>50*1024*1024)return false;
   const raw=inflateSync(Buffer.concat(chunks),{maxOutputLength:expected});if(raw.length!==expected)return false;
   let previous=new Uint8Array(stride),min=[255,255,255],max=[0,0,0];const sampleStep=Math.max(1,Math.floor(width*height/12000));
   for(let y=0;y<height;y++){const start=y*(stride+1),filter=raw[start],row=new Uint8Array(stride);if(filter>4)return false;
    for(let x=0;x<stride;x++){const left=x>=channels?row[x-channels]:0,up=previous[x],corner=x>=channels?previous[x-channels]:0;let predict=0;if(filter===1)predict=left;if(filter===2)predict=up;if(filter===3)predict=Math.floor((left+up)/2);if(filter===4){const p=left+up-corner,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-corner);predict=a<=b&&a<=c?left:b<=c?up:corner}row[x]=(raw[start+1+x]+predict)&255}
    for(let x=0;x<width;x++)if((y*width+x)%sampleStep===0){const i=x*channels,alpha=channels===2?row[i+1]:channels===4?row[i+3]:255;for(let c=0;c<3;c++){const v=Math.round((channels<=2?row[i]:row[i+c])*alpha/255+255*(1-alpha/255));min[c]=Math.min(min[c],v);max[c]=Math.max(max[c],v)}}
    previous=row;
   }
   return max.some((v,i)=>v-min[i]>=12);
  }
  if(match[1]==='jpeg'){
   if(bytes[0]!==255||bytes[1]!==216)return false;let i=2;
   while(i+3<bytes.length){if(bytes[i++]!==255)continue;while(bytes[i]===255)i++;const marker=bytes[i++];if(marker===217||marker===218)break;if(marker===1||marker>=208&&marker<=215)continue;const size=bytes.readUInt16BE(i);if(size<2||i+size>bytes.length)return false;if(marker>=192&&marker<=207&&![196,200,204].includes(marker)){if(size<7)return false;height=bytes.readUInt16BE(i+3);width=bytes.readUInt16BE(i+5);return dimensions(width,height)}i+=size}
   return false;
  }
  if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')return false;const type=bytes.toString('ascii',12,16);
  if(type==='VP8X'&&bytes.length>=30){width=1+bytes.readUIntLE(24,3);height=1+bytes.readUIntLE(27,3)}
  else if(type==='VP8L'&&bytes.length>=25&&bytes[20]===47){width=1+(bytes[21]|((bytes[22]&63)<<8));height=1+((bytes[22]>>6)|(bytes[23]<<2)|((bytes[24]&15)<<10))}
  else if(type==='VP8 '&&bytes.length>=30&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42){width=bytes.readUInt16LE(26)&16383;height=bytes.readUInt16LE(28)&16383}
  return dimensions(width,height);
 }catch{return false}
}
function dimensions(w,h){return Number.isInteger(w)&&Number.isInteger(h)&&w>=128&&h>=128&&w<=8192&&h<=8192&&w*h<=12000000}
