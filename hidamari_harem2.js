/* ============================================================
   hidamari_harem2.js — ひだまり喫茶 拡張ファイル(サブ)
   今後の新要素は、まずこのファイルに追加していきます。
   (hidamari_harem.js は完成した演出ファイルとして、基本的に触りません)
   本体(hidamari_v13.html)から読み込まれ、window.HIDAMARI / window.HIDAMARI_HOOKS で連携します。
   ・全員とデート(デートタブ)
   ・全員デート帰りのハーレムイベント(過激・モテモテ／コース別・人数別・選択肢付き)
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
  const ids=av.map(h=>h.id);
  av.forEach(h=>S.dates.push({id:h.id,k:k,end:end,f:f}));
  pendingGroup={ids:ids,k:k,end:end,n:av.length};
  HD.dq('date',1);HD.sfx.dStart();
  HD.toast(av.length+'人全員で「'+c.n+'」に出かけました!');
  HD.render();HD.save();
}
const prevPanel=HK.panel;
HK.panel=function(t){if(prevPanel)prevPanel(t);if(t==='date')injectGroupDate();};
const dp=$('p-date');
if(dp)dp.addEventListener('click',e=>{const b=e.target.closest('[data-gd]');if(!b||b.disabled)return;startGroup(parseInt(b.getAttribute('data-gd'),10)||0);});

/* ============================================================
   全員デート帰りのハーレムイベント
   ・コース別(お散歩 / カフェ巡り / おでかけ)で地の文と煽りが変わる
   ・人数帯(2〜 / 8〜 / 20〜 / 50〜 / 100〜 / 200〜)で包囲の熱量が上がる
   ・会話のあと選択肢4〜5つ → 結果台詞 → ごほうび
   ・過激・モテモテ寄り(独占・密着・やきもち・逃げ場なし)
   ============================================================ */
let pendingGroup=null;
let gsc=null;

const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=b[i];b[i]=b[j];b[j]=t;}return b;};
const nm0=h=>{const n=h.name||'';const p=n.split(/\s+/);return p.length>1?p[p.length-1]:n;};

/* ---- 台詞プール(過激・モテモテ) ---- */
const CLAIM=[
  'マスターは私の！ …でも、みんなも好きだから、今日だけはシェアしてあげる',
  '隣は私の席。反対側も私。前も後ろも、全部私で埋める',
  'デートなのに人数多すぎ…でもマスターの周りが私の子たちで埋まるの、嫌いじゃない',
  '帰ったらマスター、逃がさないからね。腕も、腰も、ぜんぶ',
  'みんなでマスターを囲むの、普通のデートよりずっとドキドキする…',
  '外では我慢した分、店に着いたら倍返し。マスターの体、貸して',
  'ひとり占めしたい気持ちと、みんなで囲みたい気持ちが同時にくるの、おかしい？',
  'マスターの匂い…今日一日、ずっと側にいられて幸せ。まだ終わらないで',
  '他の子がマスターに触るの、許せるのは同じ店の子だけ。外の女の子は絶対ダメ',
  'キスの順番、どうする？ …じゃんけんで決める？ それとも、全員いっせいに？',
  'マスターの指、一本ずつ私が占領するから。余ってる指、ある？',
  '今日のマスター、みんなの共有物。でも心の中では、私だけのもの',
  '服の裾、握ってるの見つかってもいい。離したくないんだもん',
  'マスターが笑った瞬間、全員の息が止まったの、気づいてた？',
  '帰りの電車、マスターの両脇は争奪戦だったよね。次は私が勝つ'
];
const JEALOUS=[
  'ちょっと、腕の両取りしないで！片側は空けてよ',
  'その冷たい顔、やきもちだよね？ かわいいから許す',
  '膝、空けてて…乗る？ それとも他の子の番？',
  '先輩呼びで甘えすぎ。今日は全員、同じ条件だからね',
  '夜だけの特等席とか言わないで。今日は昼も夜もみんなの',
  '撫でてほしい…マスター、手、余ってる？ 余ってなくてもいいけど',
  'お姉さんポジションで抱きつかないで。ずるい',
  '声は小さいけど、袖はぎゅって握ってる。気づいてる？',
  'センターはマスター。私たちは取り巻きでいい…でも触る順番は譲らない',
  'マスターの服、引っ張らないで…破けたら、誰が弁償するの',
  'さっきのカフェ、隣の席の女の子がマスター見たよね。許さない',
  '写真、私だけ写ってない。次は絶対、マスターの真横'
];
const SWEET=[
  '今日いちばん楽しかったのは、マスターが笑った瞬間',
  '手、つなぎたかった。でも人数多すぎて、指が足りない',
  'マスターの肩に頭、乗せてもいい？ …もう乗せてるけど',
  '帰りの風、ちょっと寒い。だから、もっと近くていい？',
  'みんなの視線、全部マスターに向いてる。誇らしいのに、独占したくなる',
  'この距離、普通のデートじゃありえない。だから特別',
  'マスターの声、今日はずっと隣で聞いてた。耳が幸せ',
  '次は二人きり…って言いたいけど、みんなも連れてきちゃうかも'
];
const MASTER_L=[
  '人数が多いと、腕が足りないな…',
  '今日は誰ひとり置いていかない。約束だ',
  '店に着いたら、まずは全員分のコーヒーを淹れる',
  '…囲まれるの、もう慣れたつもりだったけど、まだ心臓がうるさい',
  'この店は、みんなの席でいっぱいだ。俺の隣も、いっぱいだ',
  '片方の手を取ったら、反対側から別の手が伸びてくる',
  '逃げるつもりは、最初からない',
  '今日の貸しは、ちゃんと返す。順番に、な'
];

/* コース別の導入・煽り */
const COURSE_FLAVOR=[
  {
    open:[
      '公園の並木道。マスターの両腕に、何本もの手が絡みついたまま、店へ向かう。',
      '夕方の遊歩道。女の子たちの足音が、マスターの影を何重にも重ねている。',
      '散歩の終わり。誰かがマスターの袖を引き、全員が足を止めた。'
    ],
    mid:[
      'ベンチに座ろうとした瞬間、左右から体が密着する。すきまがない。',
      '信号待ちのあいだに、後ろから抱きつく子、前から見上げる子、横から腕を組む子。',
      '「ひとりで歩かせない」——その言葉が、何人もの口から重なる。'
    ],
    title:'全員お散歩の帰り道'
  },
  {
    open:[
      'はしごした最後のカフェを出た瞬間、外気より熱い視線がマスターを包む。',
      'カフェのドアが閉まったあと。マスターの周囲に、女の子たちの輪が自然にできた。',
      '甘い匂いの残る帰り道。マスターの両脇は、すでに埋まりきっている。'
    ],
    mid:[
      '「あの店の隣の席、他の客がマスター見てた」——誰かの一言で、空気が張りつめる。',
      'シェアしたデザートのあと、唇の砂糖を指摘する子が何人もいる。距離が近い。',
      '会計のとき、全員が「私が払う」と手を出した。マスターの財布は、触らせてもらえない。'
    ],
    title:'全員カフェ巡りの帰り道'
  },
  {
    open:[
      '遠出の帰り。駅のホームで、マスターを中心に女の子たちの円陣ができている。',
      '一日の終わり。荷物を持たせようとした手が、何本も重なってマスターの腕を塞いだ。',
      '改札を出た瞬間、全員の足がマスターのほうへ寄る。逃げ道は人混みの向こうにしかない。'
    ],
    mid:[
      '電車の中、マスターの肩に頭を乗せる権利を巡って、静かな争いが起きていた。',
      'お土産袋を持つ手が足りない。代わりに、マスターの指を握る手が余っている。',
      '「今日はずっと一緒だった。なのに、まだ足りない」——誰かがそう呟き、全員が頷く。'
    ],
    title:'全員おでかけの帰り道'
  }
];

/* 人数帯ごとの地の文 */
function scaleNarr(n){
  if(n>=200)return [
    '二百人規模の帰り道。これはもうデートというより、行進だった。',
    'マスターの名前が、何重にも重なって聞こえる。商店街の人々が振り返る。',
    '先頭も最後尾も見えない列。中心にいるのは、いつもマスターだけ。'
  ];
  if(n>=100)return [
    '百人規模の熱が、マスターの周囲を渦巻く。誰ひとり、離れる気配がない。',
    '道の両側が女の子で埋まる。マスターの歩幅に、全員が合わせている。',
    '「百人分の貸し」——誰かが冗談めかして言い、誰も笑わなかった。'
  ];
  if(n>=50)return [
    '五十人分の視線と体温。マスターの周囲に、すきまがない。',
    '信号が青になっても、輪が解けない。マスターが動くまで、誰も動かない。',
    '後ろから押されるように、さらに何人もが寄ってくる。'
  ];
  if(n>=20)return [
    '二十人を超える熱が、マスターの背中に重なる。',
    '会話が何重にも重なり、マスターの名前だけがはっきり聞こえる。',
    '左右の腕はすでに埋まり、肩にも、袖にも、手が伸びている。'
  ];
  if(n>=8)return [
    '人数が増えるほど、独占欲と共有欲が同時に膨らむ。',
    '誰かがマスターの手を取れば、別の誰かが反対の手を取る。',
    '笑い声の奥に、かすかな張り合いがある。'
  ];
  return [
    '少人数でも、距離は近い。マスターの両脇は、もう空いていない。',
    '二人以上いれば、それはもうハーレムの始まりだ。'
  ];
}

function buildIntro(ids,k){
  const HM=HD.HM,n=ids.length;
  const ordered=shuffle(ids.map(id=>HM[id]).filter(Boolean));
  const flav=COURSE_FLAVOR[k]||COURSE_FLAVOR[0];
  const lines=[];
  lines.push(['n',pick(flav.open)+(n>=10?' 人数は'+n+'人。':'')]);
  lines.push(['n',pick(flav.mid)]);
  const leaders=ordered.slice(0,Math.min(4,ordered.length));
  leaders.forEach((h,i)=>lines.push([h.id,CLAIM[(h.i+i+k*3)%CLAIM.length]]));
  if(ordered.length>=3){
    lines.push([ordered[1].id,pick(JEALOUS)]);
    lines.push([ordered[0].id,'いいの。今日は全員でマスターを囲む日なんだから。']);
    lines.push([ordered[2].id,'じゃあ左は私。右は…じゃんけん？ それとも、マスターが決める？']);
  }
  ordered.slice(4,Math.min(7,ordered.length)).forEach((h,i)=>lines.push([h.id,SWEET[(h.i+i)%SWEET.length]]));
  const sn=scaleNarr(n);
  lines.push(['n',pick(sn)]);
  if(n>=8){
    ordered.slice(7,Math.min(11,ordered.length)).forEach(h=>lines.push([h.id,CLAIM[(h.i+11)%CLAIM.length]]));
  }
  if(n>=20){
    lines.push(['n','さらに何人もが、マスターの名前を短く呼ぶ。返事をする暇がない。']);
    ordered.slice(11,Math.min(14,ordered.length)).forEach(h=>lines.push([h.id,'私も…見て。']));
  }
  if(n>=50)lines.push(['n',pick(sn)]);
  if(n>=100)lines.push(['n','列のどこかで「マスター大好き」が波のように伝播する。止められない。']);
  if(n>=200)lines.push(['n','二百人の足音が、一つのリズムになっている。中心は、マスター。']);
  lines.push(['m',pick(MASTER_L)]);
  const closer=ordered[0];
  if(closer)lines.push([closer.id,'店に着いたら、マスターは私たちの真ん中。今日一日の貸し、返してもらうからね。']);
  lines.push(['n','店の看板が見えた。女の子たちの輪が、じりじりと狭まる。どうする？']);
  return {lines:lines,ordered:ordered,title:flav.title};
}

function buildChoices(ordered,n,k){
  const top=ordered[0],sec=ordered[1],thr=ordered[2];
  const pickL=(m)=>shuffle(ordered).slice(0,Math.min(m,ordered.length));
  const joy=h=>'…っ、やった。マスター、見てて。';
  const sulk=h=>'むう…次は絶対、私の番だからね。';
  const claim=h=>CLAIM[(h.i+5)%CLAIM.length];

  const allBond=v=>{const o={};ordered.forEach(h=>{o[h.id]=v;});return o;};
  const halfBond=()=>{const o={};ordered.slice(0,Math.max(1,Math.ceil(ordered.length/2))).forEach(h=>{o[h.id]=3;});ordered.slice(Math.ceil(ordered.length/2)).forEach(h=>{o[h.id]=1;});return o;};
  const oneBond=(h,v)=>{const o=allBond(1);if(h)o[h.id]=v;return o;};

  const ch=[];
  ch.push({
    t:'全員を同等に抱きしめる',
    res:[['m','今日はみんなの番だ。一人残らず、な。']]
      .concat(pickL(4).map(h=>[h.id,joy(h)]))
      .concat([['n','マスターの両腕に、何人もが殺到する。均衡はすぐ崩れたが、誰も不満そうではなかった。']]),
    fx:{b:allBond(3),min:45,tag:'fair',mote:45,rush:true,tk:n>=10?1:0,fans:2}
  });
  ch.push({
    t:'ひとりずつ、順番に向き合う',
    res:[['m','順番だ。ちゃんと、ひとりずつ聞くから。']]
      .concat(pickL(3).map((h,i)=>[h.id,i===0?joy(h):sulk(h)]))
      .concat([['n','列ができ始める。先頭の子の顔が、赤くなっている。']]),
    fx:{b:halfBond(),min:32,tag:'fair',mote:28,tk:n>=20?1:0}
  });
  if(top){
    ch.push({
      t:nm0(top)+'の手を取って、先頭に立たせる',
      res:[[top.id,joy(top)]]
        .concat((sec?[sec]:[]).concat(thr?[thr]:[]).map(h=>[h.id,sulk(h)]))
        .concat([['n',nm0(top)+'がマスターの隣にぴったり寄り、他の子たちの視線が熱を帯びる。']]),
      fx:{b:oneBond(top,8),min:28,tag:top.id,mote:22,buzz:12}
    });
  }
  ch.push({
    t:'店の奥へ、一応逃げてみる',
    res:[['m','み、みんな、いったん落ち着いて——!']]
      .concat(pickL(3).map(h=>[h.id,claim(h)]))
      .concat([['n','女の子たちは笑いながら追いかけてきた。マスターの退避は、三十秒持たなかった。']]),
    fx:{b:allBond(2),min:20,tag:'fair',mote:35,rush:false}
  });
  if(n>=15){
    ch.push({
      t:'「今日は閉店後、貸切」と宣言する',
      res:[['m','今日の閉店後は、みんなの貸切だ。外には出さない。']]
        .concat(pickL(5).map(h=>[h.id,joy(h)]))
        .concat([['n','歓声が店内に反響する。看板を裏返す子、カーテンを閉める子、マスターの椅子を囲む子。']]),
      fx:{b:allBond(4),min:55,tag:'fair',mote:55,rush:true,tk:Math.max(1,Math.ceil(n/40)),fans:3}
    });
  }
  return ch;
}

function gscCrowdShow(ids){
  const box=$('scCrowd'),st=$('scStage');
  if(!box||!st)return;
  st.classList.add('crowd');box.hidden=false;
  const HM=HD.HM,S=HD.S();
  const L=ids.map(id=>HM[id]).filter(Boolean);
  const n=L.length,W=box.clientWidth||340,Hh=box.clientHeight||280;
  const fs=n<=20?34:n<=60?28:n<=120?22:n<=200?18:16,cx=W/2,cy=Hh/2;
  let html='',i=0,ring=0;
  const face=(h,x,y)=>'<span class="scf" data-id="'+h.id+'" style="left:'+x.toFixed(1)+'px;top:'+y.toFixed(1)+'px;width:'+fs+'px;height:'+fs+'px">'+(HD.av?HD.av(h,S.owned[h.id]||1,true):'')+'</span>';
  while(i<n&&ring<40){
    const rx=W/2-fs/2-2-ring*fs*0.8,ry=Hh/2-fs/2-2-ring*fs*0.8;
    if(rx<fs||ry<fs*0.6)break;
    const per=Math.max(6,Math.floor(Math.PI*(3*(rx+ry)-Math.sqrt((3*rx+ry)*(rx+3*ry)))/(fs*0.85)));
    for(let j=0;j<per&&i<n;j++,i++){
      const a=2*Math.PI*j/per+ring*0.5;
      html+=face(L[i],cx+rx*Math.cos(a),cy+ry*Math.sin(a));
    }
    ring++;
  }
  for(;i<n;i++){
    const a=Math.random()*6.283,r=0.25+Math.random()*0.5;
    html+=face(L[i],cx+W*0.4*r*Math.cos(a),cy+Hh*0.4*r*Math.sin(a));
  }
  box.innerHTML=html;
}

function gscShowLine(){
  if(!gsc)return;
  const ln=gsc.lines[gsc.i],sp=ln[0],tx=ln[1],HM=HD.HM,S=HD.S();
  if(HM[sp])gsc.cur=sp;
  const bx=$('scCrowd');
  if(bx){
    const pv=bx.querySelector('.on');if(pv)pv.classList.remove('on');
    if(HM[sp]){const el=bx.querySelector('[data-id="'+sp+'"]');if(el)el.classList.add('on');}
  }
  const hh=HM[gsc.cur],lv=Math.max(1,(hh&&S.owned[gsc.cur])||1);
  const mg=sp==='m'||sp==='n';
  const art=$('scArt');
  if(art){
    art.innerHTML=mg?(HD.mgrSVG?HD.mgrSVG(false):''):(hh&&HD.av?HD.av(hh,lv,false):'');
    art.className='sc-art'+(sp==='n'?' dim':'');
  }
  const nameEl=$('scName');
  if(nameEl)nameEl.textContent=sp==='n'?'':(sp==='m'?HD.NM():(HM[sp]?HM[sp].name:''));
  const p=$('scText');
  if(p){
    p.textContent=HD.mt?HD.mt(tx):tx;
    p.className='sc-text'+(sp==='n'?' n':'');
    p.style.animation='none';void p.offsetWidth;p.style.animation='';
  }
  if(HM[sp]&&HD.sfx&&HD.sfx.voice)try{HD.sfx.voice(HM[sp]);}catch(e){}
  const next=$('scNext');
  if(next){
    next.hidden=false;
    if(gsc.phase==='choice')next.hidden=true;
    else next.textContent=gsc.i>=gsc.lines.length-1?(gsc.phase==='lines'&&gsc.choices?'選ぶ':'おわり'):'つぎへ';
  }
  const ch=$('scChoices');if(ch&&gsc.phase!=='choice')ch.hidden=true;
}

function gscShowChoices(){
  if(!gsc||!gsc.choices)return;
  gsc.phase='choice';
  const next=$('scNext');if(next)next.hidden=true;
  const box=$('scChoices');
  if(!box)return;
  box.hidden=false;
  box.innerHTML=gsc.choices.map((c,i)=>'<button class="btn ghost" data-gch="'+i+'">'+(HD.mt?HD.mt(c.t):c.t)+'</button>').join('');
  const nameEl=$('scName');if(nameEl)nameEl.textContent='';
  const p=$('scText');if(p){p.textContent='どうしますか?';p.className='sc-text n';}
}

function gscPick(i){
  if(!gsc||gsc.phase!=='choice')return;
  const c=gsc.choices[i];if(!c)return;
  gsc.pick=c;gsc.lines=c.res;gsc.i=0;gsc.phase='result';
  const box=$('scChoices');if(box)box.hidden=true;
  const next=$('scNext');if(next)next.hidden=false;
  gscShowLine();
  if(next)next.focus();
}

function gscApplyFx(fx){
  const S=HD.S();
  if(!fx)return'';
  let msg=[];
  if(fx.b){
    Object.keys(fx.b).forEach(id=>{
      if(S.owned[id])S.bond[id]=Math.min(HD.BOND_MAX*10,(S.bond[id]||0)+fx.b[id]);
    });
  }
  const min=fx.min||20;
  const g=Math.max((HD.perSec?HD.perSec():0)*3*min,100*min);
  if(HD.gain)HD.gain(g);
  msg.push('+'+(HD.fmt?HD.fmt(g):g)+' 円');
  if(fx.mote&&HD.addMote)HD.addMote(fx.mote);
  if(fx.rush&&HD.setBuff){HD.setBuff(15000);msg.push('常連ラッシュ15秒');}
  if(fx.tk){S.tickets=(S.tickets||0)+fx.tk;msg.push('チケット+'+fx.tk);}
  if(fx.fans){const gf=fx.fans*(10+(S.fans||0)*0.005);S.fans=(S.fans||0)+gf;msg.push('フォロワー+'+(HD.fmt?HD.fmt(gf):Math.floor(gf)));}
  S.stats=S.stats||{};
  S.stats.gdate=(S.stats.gdate||0)+1;
  return msg.join('・');
}

function gscFinish(){
  if(!gsc)return;
  const fx=(gsc.pick&&gsc.pick.fx)||{b:{},min:25,mote:30,tag:'fair'};
  const S=HD.S();
  (gsc.ids||[]).forEach(id=>{
    if(S.owned[id])S.bond[id]=Math.min(HD.BOND_MAX*10,(S.bond[id]||0)+2);
  });
  const extra=gscApplyFx(fx);
  const n=(gsc.ids||[]).length;
  let msg='全員デートの帰り道('+n+'人)…'+extra;
  if(HD.sfx&&HD.sfx.ach)HD.sfx.ach();
  else if(HD.sfx&&HD.sfx.coin)HD.sfx.coin();
  HD.toast(msg);
  gscClose();
  HD.render();HD.save();
  if(HD.checkAch)HD.checkAch();
}

function gscClose(){
  gsc=null;
  const modal=$('modal'),crowd=$('scCrowd'),stage=$('scStage'),ch=$('scChoices');
  if(modal)modal.hidden=true;
  if(crowd){crowd.innerHTML='';crowd.hidden=true;}
  if(stage)stage.classList.remove('crowd');
  if(ch){ch.hidden=true;ch.innerHTML='';}
}

function gscNext(){
  if(!gsc)return;
  if(gsc.phase==='choice')return;
  if(gsc.i<gsc.lines.length-1){gsc.i++;gscShowLine();return;}
  if(gsc.phase==='lines'&&gsc.choices){gscShowChoices();return;}
  if(gsc.phase==='result'){gscFinish();return;}
  gscFinish();
}

function openGroupReturn(pg){
  if(gsc)return;
  const ids=pg.ids,k=pg.k,n=pg.n;
  const built=buildIntro(ids,k);
  const choices=buildChoices(built.ordered,n,k);
  const mainId=ids[0];
  const color=(HD.HM[mainId]&&HD.HM[mainId].c)||'#ff7aa2';
  gsc={
    lines:built.lines,i:0,ids:ids,k:k,n:n,cur:mainId,
    phase:'lines',choices:choices,pick:null,ordered:built.ordered
  };
  const scene=$('scene'),title=$('scTitle'),modal=$('modal');
  if(scene)scene.style.setProperty('--c',color);
  if(title)title.textContent=HD.mt?HD.mt(built.title):built.title;
  if(modal)modal.hidden=false;
  gscCrowdShow(ids);
  gscShowLine();
  const next=$('scNext');if(next)next.focus();
  if(HD.sfx&&HD.sfx.dDone)HD.sfx.dDone();
}

(function(){
  const nextBtn=$('scNext'),closeBtn=$('scClose'),modal=$('modal');
  if(nextBtn)nextBtn.addEventListener('click',function(e){
    if(!gsc)return;
    e.stopImmediatePropagation();
    gscNext();
  },true);
  if(closeBtn)closeBtn.addEventListener('click',function(e){
    if(!gsc)return;
    e.stopImmediatePropagation();
    gscFinish();
  },true);
  if(modal)modal.addEventListener('click',function(e){
    if(!gsc)return;
    if(e.target===modal){e.stopImmediatePropagation();gscFinish();}
  },true);
  document.addEventListener('keydown',function(e){
    if(!gsc)return;
    if(e.key==='Escape'){e.stopImmediatePropagation();gscFinish();}
  },true);
  document.addEventListener('click',function(e){
    if(!gsc||gsc.phase!=='choice')return;
    const b=e.target.closest('[data-gch]');
    if(!b)return;
    e.stopImmediatePropagation();
    gscPick(parseInt(b.getAttribute('data-gch'),10)||0);
  },true);
})();

setInterval(function(){
  if(!pendingGroup||gsc)return;
  const S=HD.S();
  if(S.dates.some(d=>d.f))return;
  if(Date.now()<pendingGroup.end-50)return;
  const pg=pendingGroup;
  pendingGroup=null;
  setTimeout(function(){openGroupReturn(pg);},600);
},400);

/* ---------- 上部の数字を枠に収める ---------- */
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
