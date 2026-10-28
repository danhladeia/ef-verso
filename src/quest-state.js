export const SAVE_KEY='ef-verso-progress-v1';
const stages=['school','court','return','complete'];
export const initialProgress=()=>({version:1,stage:'school',baskets:0,attempts:0,coins:0,badges:[],visited:[]});
export function normalizeProgress(raw){
 if(!raw||raw.version!==1||!stages.includes(raw.stage))return initialProgress();
 const stage=raw.stage,baskets=stage==='school'?0:stage==='court'?Math.min(2,Math.max(0,Math.floor(Number(raw.baskets)||0))):3;
 return {version:1,stage,baskets,attempts:Math.max(baskets,Math.min(100000,Math.floor(Number(raw.attempts)||0))),coins:stage==='complete'?100:0,badges:stage==='complete'?['Primeiras Cestas']:[],visited:Array.isArray(raw.visited)?[...new Set(raw.visited.filter(n=>typeof n==='string').slice(0,64))]:[]};
}
export function reduceProgress(state,event){
 if(event.type==='accept'&&state.stage==='school')return {...state,stage:'court'};
 if(event.type==='shot'&&state.stage==='court'){
  const baskets=Math.min(3,state.baskets+Number(event.scored===true));return {...state,baskets,attempts:state.attempts+1,stage:baskets===3?'return':'court'};
 }
 if(event.type==='claim'&&state.stage==='return')return {...state,stage:'complete',coins:100,badges:['Primeiras Cestas']};
 if(event.type==='visit'&&!state.visited.includes(event.name))return {...state,visited:[...state.visited,event.name].slice(0,64)};
 return state;
}
export function createProgress(storage){
 let state=initialProgress(),saved=true;
 try{state=normalizeProgress(JSON.parse(storage.getItem(SAVE_KEY)));}catch{saved=false;}
 return {get state(){return state;},get saved(){return saved;},dispatch(event){state=reduceProgress(state,event);try{storage.setItem(SAVE_KEY,JSON.stringify(state));saved=true;}catch{saved=false;}return state;}};
}
