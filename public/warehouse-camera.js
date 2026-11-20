import {attractionCameraView} from './camera-views.js';
// Look along the long open-water axis. Keep the eye underwater on portrait
// screens while fitting the actual shell, not only its purchase footprint.
export function warehouseCameraView(bounds,fov,aspect){let elevation=.12,view;for(let i=0;i<3;i++){view=attractionCameraView(bounds,fov,aspect,-Math.PI/2-.16,elevation);elevation=Math.min(.12,Math.asin(Math.min(.999,80/view.distance)));}return attractionCameraView(bounds,fov,aspect,-Math.PI/2-.16,elevation);}
