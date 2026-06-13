import { state } from './state.js';
import { getSimulation } from './graph.js';
import { refreshMapIfActive } from './mapView.js';

// In map view the force simulation must stay stopped — node positions are managed
// by mapView.js, and any sim tick would strip the map's counter-scale transform
// off the nodes. Everywhere else, nudge the simulation back to life with the
// given alpha so the layout settles after a change.
export function restartOrRefresh(alpha = 0.3) {
  if (state.mapViewActive) {
    getSimulation()?.stop();
    refreshMapIfActive();
  } else {
    getSimulation().alpha(alpha).restart();
  }
}
