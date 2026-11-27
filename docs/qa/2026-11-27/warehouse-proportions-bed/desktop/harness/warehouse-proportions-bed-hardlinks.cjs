// QA-only disk-bounded snapshot: game assets are frozen during the entire audit.
// Link read-only assets, leaving worker/SQLite/source capture as independent files.
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');const original=fs.cpSync;
fs.cpSync=function(src,dst,options){if(path.resolve(src)==='/workspace/chichi-warehouse-proportions-fix/public'&&/^\/tmp\/chichi-aquarium-[^/]+\/assets$/.test(dst)){cp.execFileSync('cp',['-al',src,dst]);fs.appendFileSync('/workspace/qa/three-rocks-readonly-assets.txt',dst+'\n');return;}return original.call(this,src,dst,options);};
