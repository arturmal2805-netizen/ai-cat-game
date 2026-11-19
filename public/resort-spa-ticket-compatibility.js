import {resortPaidTicket} from './resort-spa-economy.js';
// Resolve at visit start. The selected ORIGINAL ID is used for both reserve
// and consume. Never mint a new receipt, refund, or silently use someone else's.
export function resortTicketService(game,catId,requested,contract){
 if(!contract)return requested;const zone=contract.zone(requested);if(!zone)return null;
 if(resortPaidTicket(game,catId,requested))return requested;
 if(zone.retired||zone.legacy)return zone.retired?null:requested;
 const aliases=zone.key==='vip'?['resort-jacuzzi']:zone.key==='midnight'?['resort-amber','resort-nap','resort-meditation','resort-beauty','resort-sauna']:[];
 return aliases.find(id=>resortPaidTicket(game,catId,id))||requested;
}
