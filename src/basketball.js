// A guided ballistic shot. Points are awarded only on a downward rim crossing.
export const GRAVITY=9.8;
export function launchShot(start,hoop,aim,power){
 const duration=1.25,target={x:hoop.x+(power-.5)*6,y:hoop.y,z:start.z+aim*3};
 return {start:{...start},velocity:{x:(target.x-start.x)/duration,y:(target.y-start.y+.5*GRAVITY*duration**2)/duration,z:(target.z-start.z)/duration}};
}
export function shotPosition(shot,t){const {start:s,velocity:v}=shot;return {x:s.x+v.x*t,y:s.y+v.y*t-.5*GRAVITY*t*t,z:s.z+v.z*t};}
export function rimCrossing(shot,hoop,radius=.22){
 const {start:s,velocity:v}=shot,disc=v.y*v.y-2*GRAVITY*(hoop.y-s.y);
 if(disc<0)return {time:Infinity,scored:false,along:-Infinity,across:0};
 const time=(v.y+Math.sqrt(disc))/GRAVITY,p=shotPosition(shot,time);
 // "along": past (+) or short of (−) the rim, seen from the shooter; "across": to the side.
 const dx=hoop.x-s.x,dz=hoop.z-s.z,d=Math.hypot(dx,dz)||1,ox=p.x-hoop.x,oz=p.z-hoop.z;
 return {time,scored:Math.hypot(ox,oz)<radius,offsetX:ox,offsetZ:oz,along:(ox*dx+oz*dz)/d,across:(oz*dx-ox*dz)/d};
}

// Free shot: the student walks, faces the hoop and holds Space; the longer it is held, the farther the ball goes.
// The charge sets the reach (1 to 12 m) at rim height with a fixed release angle, so each instant of holding
// adds the same distance. A subtle help pulls direction and reach toward the hoop only when already close to it.
export const SHOT={angle:58*Math.PI/180,minRange:1,maxRange:12,chargeTime:1.3,aimFull:15*Math.PI/180,aimWindow:35*Math.PI/180,aimHelp:.8,powerWindow:.12,powerHelp:.65};
function speedFor(range,height){
 const c=Math.cos(SHOT.angle);
 // Too short to climb to the rim at this angle: still scale with range, so an under-charged shot
 // always lands short instead of coincidentally reaching the hoop through a degenerate formula.
 const rise=Math.max(.15,range*Math.tan(SHOT.angle)-height);
 return Math.sqrt(GRAVITY*range*range/(2*c*c*rise));
}
export function idealPower(start,hoop){return (Math.hypot(hoop.x-start.x,hoop.z-start.z)-SHOT.minRange)/(SHOT.maxRange-SHOT.minRange);}
export function throwShot(start,hoop,forward,power){
 let heading=Math.atan2(forward.x,forward.z);
 const toHoop=Math.atan2(hoop.x-start.x,hoop.z-start.z),miss=Math.atan2(Math.sin(toHoop-heading),Math.cos(toHoop-heading)),abs=Math.abs(miss);
 const aim=abs<SHOT.aimFull?SHOT.aimHelp:abs<SHOT.aimWindow?SHOT.aimHelp*(SHOT.aimWindow-abs)/(SHOT.aimWindow-SHOT.aimFull):0;heading+=miss*aim;
 power=Math.min(1,Math.max(0,power));const ideal=idealPower(start,hoop);if(Math.abs(power-ideal)<SHOT.powerWindow)power+=(ideal-power)*SHOT.powerHelp;
 const speed=speedFor(SHOT.minRange+power*(SHOT.maxRange-SHOT.minRange),hoop.y-start.y),flat=speed*Math.cos(SHOT.angle);
 return {start:{...start},velocity:{x:Math.sin(heading)*flat,y:speed*Math.sin(SHOT.angle),z:Math.cos(heading)*flat},power,ideal,aimHelp:aim};
}
