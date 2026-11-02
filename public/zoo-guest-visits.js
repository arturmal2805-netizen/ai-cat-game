import {normalizeZooGuests,zooGuestAnimal,ZOO_GUEST_MS} from './zoo-guest-data.js';
import {normalizeZoo,zooIsOpen} from './zoo-system.js';
export function zooGuestResidents(game,houseId){
 const h=game.housing?.homes?.[houseId];if(!h)return [];
 return [h.owner,h.roommate].filter((id,i,a)=>id&&a.indexOf(id)===i&&game.housing.residences[id]===houseId);
}
export function activeZooGuests(game,now=Date.now()){
 return Object.values(game.zoo?.guestVisits||{}).filter(v=>!v.cancelledAt&&v.startedAt<=now&&now<v.endsAt&&zooGuestAnimal(v.animalId)&&zooIsOpen(game,zooGuestAnimal(v.animalId).exhibit.id)&&zooGuestResidents(game,v.houseId).length);
}
export function startZooGuest(game,animalId,houseId,id,now=Date.now()){
 const animal=zooGuestAnimal(animalId);if(!animal||!zooIsOpen(game,animal.exhibit.id))throw Error('Спочатку відкрийте вольєр цієї тварини.');
 const ledger=normalizeZooGuests(game.zoo?.guestVisits),previous=ledger[animalId];
 if(previous?.id===id){if(previous.houseId!==houseId)throw Error('Цей візит уже прив’язаний до іншої оселі.');return game;}
 if(activeZooGuests(game,now).some(v=>v.animalId===animalId))throw Error('Тварина вже гостює. Дочекайтеся її повернення.');
 if(!zooGuestResidents(game,houseId).length)throw Error('Оберіть особистий будинок із мешканцями.');
 const record={id,animalId,houseId,startedAt:now,endsAt:now+ZOO_GUEST_MS};
 if(!normalizeZooGuests({[animalId]:record})[animalId])throw Error('Недійсний гостьовий візит.');
 if(previous&&now<Math.max(previous.startedAt,previous.cancelledAt||0))throw Error('Некоректний час візиту.');
 const next=structuredClone(game);next.zoo=normalizeZoo(game.zoo);next.zoo.guestVisits={...ledger,[animalId]:record};return next;
}
export function endZooGuest(game,animalId,now=Date.now()){
 const old=game.zoo?.guestVisits?.[animalId];if(!old||old.cancelledAt)return game;
 const next=structuredClone(game);next.zoo.guestVisits[animalId].cancelledAt=Math.max(old.startedAt,now);return next;
}
