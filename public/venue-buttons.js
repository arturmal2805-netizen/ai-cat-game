// Shared compact venue marks. Labels stay available to keyboard/screen-reader users.
const venues={
 mall:{label:'Підводний Cat Mall — ТРЦ',path:'M6 13 5 5l8 5a13 13 0 0 1 6 0l8-5-1 8a11 11 0 1 1-20 0ZM11 19h.01M21 19h.01M14 24l2 1 2-1M3 22l6 1M23 23l6-1'},
 spa:{label:'CHICHI SPA — огляд',path:'M16 27C8 22 9 13 16 5c7 8 8 17 0 22Zm0 0C7 28 3 20 4 13c8 1 12 7 12 14Zm0 0c9 1 13-7 12-14-8 1-12 7-12 14ZM4 27c7 4 17 4 24 0'},
 warehouse:{label:'CHICHI Warehouse — огляд',path:'M4 27V16a12 12 0 0 1 24 0v11ZM4 16h24M10 16C10 9 12 4 16 4s6 5 6 12M13 27v-7h6v7M8 21h2M22 21h2'}
};
export function venueButton(kind){const spec=venues[kind];if(!spec)throw Error('Unknown venue');const b=document.createElement('button');b.type='button';b.className='venue-access';b.dataset.venue=kind;b.title=spec.label;b.setAttribute('aria-label',spec.label);b.innerHTML=`<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="${spec.path}"/></svg>`;return b;}
