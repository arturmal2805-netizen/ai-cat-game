export function inferenceDiagnostics(text) {
 const messages=[];
 let start=-1,depth=0,inString=false,escaped=false;
 for(let i=0;i<text.length;i++){
  const char=text[i];
  if(start<0){if(char==='{'){start=i;depth=1;}continue;}
  if(inString){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')inString=false;continue;}
  if(char==='"'){inString=true;continue;}
  if(char==='{')depth++;
  if(char==='}'&&--depth===0){
   try {
    const event=JSON.parse(text.slice(start,i+1));
    for(const log of event.logs||[]){
     if(Array.isArray(log.message)&&log.message[0]==='Cloudflare AI inference failed:')messages.push(log.message.map(String).join(' ').slice(0,700));
    }
   }catch{ /* Ignore non-JSON CLI banners. */ }
   start=-1;
  }
 }
 return [...new Set(messages)];
}
