/* Artistic organisms and decorative cable motion; account state and prices remain live. */
(()=>{
'use strict';
const image=new Image(); image.src='assets/organisms.png';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const crops=[[290,38,295,662],[900,110,380,585],[1515,9,470,700]];
const oldOffice=drawOffice,oldDesk=dkDrawScene;
const css=document.createElement('style');css.textContent='#office,#dk-scene{image-rendering:auto!important}';document.head.append(css);
function floor(ctx,w,h,y){
 const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#0b0c12');bg.addColorStop(1,'#06090b');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='rgba(116,169,162,.07)';ctx.lineWidth=1;
 for(let i=-6;i<10;i++){ctx.beginPath();ctx.moveTo(w/2+i*60,y);ctx.lineTo(w/2+i*220,h);ctx.stroke();}
 ctx.fillStyle='#14181c';ctx.fillRect(0,y,w,5);
}
function monitor(ctx,c,x,y,w,h){
 ctx.fillStyle='#171c22';ctx.fillRect(x,y,w,h);ctx.fillStyle='#090f13';ctx.fillRect(x+8,y+8,w-16,h-25);
 const values=(PX_HIST[c.chartSym||'BTC']||[]).slice(-40);
 ctx.strokeStyle='rgba(110,173,154,.09)';ctx.lineWidth=.7;
 for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(x+8,y+8+i*(h-33)/5);ctx.lineTo(x+w-8,y+8+i*(h-33)/5);ctx.stroke();}
 if(values.length>1){let lo=Math.min(...values),hi=Math.max(...values);if(lo===hi)hi=lo+1;ctx.strokeStyle=c.col;ctx.lineWidth=1.5;ctx.beginPath();values.forEach((v,i)=>{const xx=x+12+i/(values.length-1)*(w-24),yy=y+h-29-(v-lo)/(hi-lo)*(h-53);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.stroke();}
 ctx.textBaseline='top';ctx.font=(w>200?'11':'8')+'px ui-monospace, monospace';ctx.fillStyle='#b6ccc6';ctx.fillText(c.chartSym||'BTC',x+12,y+10);
 if(values.length<2){ctx.fillStyle='#798581';ctx.fillText('—',x+w/2,y+h/2);}
 ctx.fillStyle='#151b21';ctx.fillRect(x+w*.45,y+h,w*.1,h*.16);ctx.fillRect(x+w*.3,y+h*1.16,w*.4,5);
}
function creature(ctx,ix,c,cx,base,height,portX,portY,time){
 const crop=crops[ix],width=height*crop[2]/crop[3],motion=reduced.matches?0:Math.sin(time*.8+ix)*height*.008;
 const x=cx-width/2+motion,y=base-height;
 const glow=ctx.createRadialGradient(cx,base,1,cx,base,height*.48);glow.addColorStop(0,c.col+'20');glow.addColorStop(1,c.col+'00');ctx.fillStyle=glow;ctx.fillRect(cx-height*.5,base-height*.3,height,height*.5);
 ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(cx,base+3,width*.45,5,0,0,Math.PI*2);ctx.fill();
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,...crop,x,y,width,height);
 const attach=[[.59,.35],[.78,.31],[.52,.3]][ix];
 for(let j=0;j<2;j++){
 const ax=x+width*attach[0]-j*3,ay=y+height*(attach[1]+j*.105),ex=portX,ey=portY+j*8;
 const p=[ax,ay,ax+height*.23,ay+height*.26,ex-height*.22,ey+height*.10,ex,ey];
 const path=()=>{ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(...p.slice(2));};
 path();ctx.strokeStyle='#11191d';ctx.lineWidth=4;ctx.stroke();path();ctx.strokeStyle='#819a96';ctx.lineWidth=1.3;ctx.stroke();
 const q=reduced.matches?.5:((time*.24+j*.42+ix*.17)%1+1)%1,u=1-q;
 const px=u*u*u*p[0]+3*u*u*q*p[2]+3*u*q*q*p[4]+q*q*q*p[6],py=u*u*u*p[1]+3*u*u*q*p[3]+3*u*q*q*p[5]+q*q*q*p[7];
 ctx.save();ctx.shadowColor=c.col;ctx.shadowBlur=8;ctx.fillStyle=c.col;ctx.beginPath();ctx.arc(px,py,1.7,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.fillStyle='#344844';ctx.beginPath();ctx.arc(ax,ay,2.8,0,Math.PI*2);ctx.fill();ctx.fillStyle=c.col;ctx.beginPath();ctx.arc(ax,ay,1,0,Math.PI*2);ctx.fill();
 }
 ctx.fillStyle='#1b252b';ctx.fillRect(portX-3,portY-6,20,25);ctx.fillStyle=c.col;ctx.fillRect(portX+3,portY,3,2);ctx.fillRect(portX+3,portY+8,3,2);
}
drawOffice=function(){
 oldOffice();if(!image.complete||!image.naturalWidth)return;
 const ctx=octx,w=off.width,h=off.height;ctx.save();ctx.beginPath();ctx.rect(0,145,w,h-145);ctx.clip();floor(ctx,w,h,332);
 C.forEach((c,i)=>{const left=w/3*i;monitor(ctx,c,left+171,226,112,79);creature(ctx,i,c,left+107,332,145,left+214,319,t);});ctx.restore();
};
dkDrawScene=function(time){
 if(!dkX||!image.complete||!image.naturalWidth){oldDesk(time);return;}
 const ctx=dkX,w=dkCv.width,h=dkCv.height,c=C[DK];ctx.save();floor(ctx,w,h,350);monitor(ctx,c,470,83,285,206);creature(ctx,DK,c,240,350,278,594,328,time);
 ctx.fillStyle='#7d918b';ctx.font='10px ui-monospace, monospace';ctx.fillText((c.neurons||c.nn)+' NEURONS  →  DESK',40,h-20);ctx.restore();
};
window.MICRO_ORGANIC_SCENES={version:1,ready:()=>image.complete&&image.naturalWidth>0};
})();
