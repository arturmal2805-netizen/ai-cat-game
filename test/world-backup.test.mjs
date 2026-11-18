import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,loadGame,SAVE_KEY} from '../public/economy.js';
import {encodeWorldBackup,decodeWorldBackup,worldBackupName,WORLD_BACKUP_LIMIT} from '../public/world-backup.js';
const now=1795030000000;
test('portable backup includes the complete game, verifies checksum and restores without time advancement',async()=>{
 const game=newGame(now);game.coins=4381984;game.diamonds=240;
 const before=JSON.stringify(game),text=await encodeWorldBackup(game,now),decoded=await decodeWorldBackup(text,now);
 assert.equal(JSON.stringify(game),before);assert.deepEqual(decoded.raw,game);assert.equal(decoded.verified,true);
 assert.equal(decoded.game.coins,game.coins);assert.equal(decoded.game.diamonds,240);
 const direct=loadGame({getItem:k=>k===SAVE_KEY?before:null},now,{advance:false,strict:true});assert.deepEqual(decoded.game,direct);
});
test('altered, malformed, unsupported and oversized backup fails before touching the world',async()=>{
 const envelope=JSON.parse(await encodeWorldBackup(newGame(now),now));envelope.game.coins++;
 await assert.rejects(decodeWorldBackup(JSON.stringify(envelope),now),/сумма/);
 envelope.formatVersion=99;await assert.rejects(decodeWorldBackup(JSON.stringify(envelope),now),/Версия/);
 await assert.rejects(decodeWorldBackup('{',now),/JSON/);
 await assert.rejects(decodeWorldBackup(' '.repeat(WORLD_BACKUP_LIMIT+1),now),/большой/);
 await assert.rejects(decodeWorldBackup(JSON.stringify({...newGame(now),relocatedPurchases:{broken:true}}),now));
});
test('legacy saves remain importable, credentials never enter a portable backup',async()=>{
 const game=newGame(now);assert.equal((await decodeWorldBackup(JSON.stringify(game),now)).verified,false);
 for(const key of ['token','password','apiKey','private_key','recoveryCode'])await assert.rejects(encodeWorldBackup({...game,[key]:'PRIVATE'},now),/секрет/);
 assert.match(worldBackupName(new Date(2026,10,18,21,5,9)),/^CHICHI_WORLD_BACKUP_2026-11-18_21-05-09\.json$/);
});

test('the copy made before confirmed import remains discoverable by read-only recovery',async()=>{
 const {recoveryCopies}=await import('../public/save-recovery.js');const game=newGame(now),text=await encodeWorldBackup(game,now);
 const copies=recoveryCopies({getItem:key=>key==='chichi-world-before-file-import'?text:null});
 assert.equal(copies.length,1);assert.deepEqual(copies[0].game,game);
});
