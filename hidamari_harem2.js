/* ============================================================
   hidamari_harem2.js — ひだまり喫茶 拡張ファイル(サブ)
   今後の新要素は、まずこのファイルに追加していきます。
   (hidamari_harem.js は完成した演出ファイルとして、基本的に触りません)
   本体(hidamari_v12.html)から読み込まれ、window.HIDAMARI / window.HIDAMARI_HOOKS で連携します。
   ・全員とデート(デートタブ)
   ・画面上部の数字が枠からはみ出したとき、自動で文字を縮める
   ============================================================ */
(function(){
'use strict';
const HD=window.HIDAMARI,HK=window.HIDAMARI_HOOKS;
if(!HD||!HK){console.warn('hidamari_harem2: 本体のAPIが見つかりません');return;}
const $=HD.$;

/* ---------- 全員とデート ---------- */
const avail=()=>HD.ownedList().filter(h=>!HD.onDate(h.id));
/* 人数が多いほど1人あたりのごほうびは小さくなる(合計は「枠の数+√人数」回ぶんの通常デート)。ふれあいは全員が満額。 */
const factor=n=>Math.min(1,(HD.slots()+Math.sqrt(n))/n);

function injectGroupDate(){
  const p=$('p-date');if(!p)return;
  const S=HD.S(),g=S.dates.filter(d=>d.f),av=avail(),n=av.length;
  let h;
  if(g.length){
    const end=Math.max.apply(null,g.map(d=>d.end)),c=HD.COURSES[g[0].k];
    h='<div class="gather"><p><strong>全員でデート中('+g.length+'人)</strong>「'+c.n+'」に出かけています。帰ってくると、まとめてごほうびがもらえます。'+
      '<span class="bar" style="display:block" data-dend="'+end+'" data-dtot="'+c.sec+'"><i></i></span></p><span class="tl" data-dtl="'+end+'"></span></div>';
  }else{
    const f=factor(n),eq=(f*n).toFixed(1);
    h='<div class="gather"><p><strong>全員とデート</strong>いま出かけられる '+n+'人 全員で、いっしょに出かけます。'+
      (n>=2?'ごほうびは、通常のデート約'+eq+'回ぶん(1人あたり'+Math.max(1,Math.round(f*100))+'%)。ふれあいは全員が満額でもらえます。':'2人以上いるときに使えます。')+
      '出かけている間は、その子たちは接客できません。</p><div class="acts">'+
      HD.COURSES.map((c,k)=>'<button class="btn small" data-gd="'+k+'"'+(n>=2?'':' disabled')+'>全員で'+c.n+' '+(c.sec<60?c.sec+'秒':(c.sec/60)+'分')+'</button>').join('')+'</div></div>';
  }
  p.insertAdjacentHTML('afterbegin',h);
}
function startGroup(k){
  const S=HD.S(),av=avail();
  if(av.length<2){HD.sfx.ng();HD.toast('出かけられる子が2人以上いません');return;}
  const c=HD.COURSES[k];if(!c)return;
  const f=factor(av.length),end=Date.now()+c.sec*1000;
  av.forEach(h=>S.dates.push({id:h.id,k:k,end:end,f:f}));
  HD.dq('date',1);HD.sfx.dStart();
  HD.toast(av.length+'人全員で「'+c.n+'」に出かけました!');
  HD.render();HD.save();
}
const prevPanel=HK.panel;
HK.panel=function(t){if(prevPanel)prevPanel(t);if(t==='date')injectGroupDate();};
const dp=$('p-date');
if(dp)dp.addEventListener('click',e=>{const b=e.target.closest('[data-gd]');if(!b||b.disabled)return;startGroup(parseInt(b.getAttribute('data-gd'),10)||0);});

/* ---------- 上部の数字を枠に収める ---------- */
/* 枠は固定幅。桁が増えて入りきらないときだけ、その数字の文字を小さくします(他の枠は動きません)。 */
function fit(){
  document.querySelectorAll('.hud .stat').forEach(box=>{
    const b=box.querySelector('b'),sp=box.querySelector('span');
    if(sp)sp.title=sp.textContent;
    if(!b)return;
    const t=b.textContent;
    if(b._t===t)return;
    b._t=t;
    let s=box.classList.contains('main')?30:20;
    b.style.fontSize=s+'px';
    while(b.scrollWidth>b.clientWidth+0.5&&s>9){s-=1;b.style.fontSize=s+'px';}
  });
}
setInterval(fit,400);fit();
})();
