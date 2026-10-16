/* ============================================================
   hidamari_harem.js — ひだまり喫茶 ハーレム演出拡張
   本体(hidamari_v11.html)から読み込まれ、window.HIDAMARI / window.HIDAMARI_HOOKS を通して連携します。
   このファイルが無くても本体は普通に遊べます。
   告白・大モテ祭りの一枚絵は、HTMLと同じフォルダの 001.jpg / 002.jpg / 003.jpg を使います。
   (画像が無いときは、女の子のイラストを使った代替表示になります)
   枚数を増やすときは、下の IMG に ファイル名 を足してください。
   ============================================================ */
(function(){
'use strict';
const HD=window.HIDAMARI,HK=window.HIDAMARI_HOOKS;
if(!HD||!HK){console.warn('hidamari_harem: 本体のAPIが見つかりません');return;}

/* ---------- 設定 ---------- */
const IMG={
  normal:['001.jpg','002.jpg'],            /* 通常の告白 */
  special:['003.jpg'],                      /* 絆が最大の子の特別な告白 */
  festival:['001.jpg','002.jpg','003.jpg']  /* 大モテ祭り(順に切り替わる) */
};
const FEST_CD=600000;   /* 大モテ祭りの間隔(ミリ秒) */
const FEST_MIN=8;       /* 大モテ祭りに必要な採用人数 */

const $=HD.$,esc=HD.esc,mt=HD.mt,NM=HD.NM;
const rnd=n=>Math.floor(Math.random()*n),pick=a=>a[rnd(a.length)];
const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);const t=a[i];a[i]=a[j];a[j]=t;}return a;};
const ps=i=>{const s=Math.sin(i*127.1+311.7)*43758.5453;return s-Math.floor(s);};

/* ---------- セーブデータ(本体のセーブに同梱されます) ---------- */
function X(){
  const S=HD.S(),x=S.hx||(S.hx={});
  if(x.rankMax===undefined)x.rankMax=-1;
  if(x.pile===undefined)x.pile=0;
  if(!x.mail)x.mail={date:'',claimed:false,ids:[]};
  if(x.festAt===undefined)x.festAt=0;
  if(!x.sp)x.sp={};
  if(!x.cf)x.cf={};
  if(!x.st)x.st={conf:0,sp:0,fest:0,seat:0,mail:0};
  return x;
}
const owned=()=>HD.ownedList();
const capBond=v=>Math.min(HD.BOND_MAX*10,v);
function addBond(id,v){const S=HD.S();S.bond[id]=capBond((S.bond[id]||0)+v);}
function rankIdx(){const v=HD.moteScore();let r=0;HD.MOTER.forEach((m,i)=>{if(v>=m[0])r=i;});return r;}

/* ---------- 台詞(性格タイプごと) ---------- */
const NAMED={hinata:'genki',rin:'cool',nonoka:'tennen',mio:'imo',kaguya:'mist',mina:'tsun',akari:'onee',shizuku:'dere',luna:'genki',sumire:'ojou',yuzu:'genki',kotori:'tennen',yuki:'cool',momiji:'maji',elena:'gal',lily:'dere',mikan:'genki',sora:'boku',shino:'cool',honoka:'tennen'};
const arch=h=>h.arch||NAMED[h.id]||'genki';
const T={
genki:{hot:['マスター!こっち向いて、こっち!','きゃー!今日のマスター、いつもよりかっこいい!','隣、ぜったい私がもらうからね!'],joy:'やったー!マスターの隣、ゲット!',sulk:'むー!ずるいー!次は絶対、私だからね!',
 conf:['ねえ、マスター。私ね、マスターのことが大好きなの!','友だちとしてじゃなくて、ちゃんと「好き」の方だよ!','返事は、今度でいいよ。……でも、顔が熱いのは見逃してね!'],
 sp:['もう、ごまかせない。マスターが一番好き。世界で一番!','毎朝「おはよう」って言えるのも、全部マスターのおかげ。','これからもずっと、私の隣で笑っていてね。約束だよ!'],
 mail:['今日もマスターの顔が見られて元気いっぱい!これ、差し入れ!','お仕事がんばってね!応援してる!']},
cool:{hot:['……こっちを見て。','騒がしいわね。でも、あなたの隣なら、悪くない。','……そこ、空いてるなら私が座るわ。'],joy:'……ありがとう。選んでくれて、嬉しい。',sulk:'……別に。気にしていないわ。……本当よ。',
 conf:['……少しだけ、時間をもらえる?','言葉にするのは苦手だけど……あなたのことが、好き。','……聞こえていたなら、それでいい。返事は急がないわ。'],
 sp:['何度も言おうとして、言えなかった。……でも、今夜は言う。','あなたが好き。誰にも譲りたくないくらいに。','……これからも、あなたの隣にいさせて。お願い。'],
 mail:['……読まなくてもいい。ただ、渡したかっただけ。','差し入れ。無理はしないで。']},
tsun:{hot:['ちょ、ちょっと!他の子ばっかり見ないでよ!','べ、別に隣に座りたいわけじゃないんだから!','こっち向きなさいよ、バカ!'],joy:'ま、まあ当然ね!……あ、ありがとう。',sulk:'べ、別に悔しくなんかないんだからね!……ばか。',
 conf:['い、いいから黙って聞きなさいよ!','……好きなの。あんたのことが。べ、別に深い意味じゃ……あるけど!','二度は言わないから!ちゃんと覚えておきなさいよね!'],
 sp:['もう無理。ツンツンしてるの、疲れちゃった。','好きよ。大好き。あんた以外、考えられないの。','……責任、とりなさいよね。ずっと、そばにいなさい!'],
 mail:['べ、別にあんたのために書いたんじゃないんだから!','差し入れ、残さず食べなさいよね!']},
dere:{hot:['あ、あの……こっち、見てくれますか……?','隣に、座っても……いいですか?','みなさんに負けないくらい、がんばります……!'],joy:'あ、ありがとうございます……!とっても、うれしいです。',sulk:'だ、大丈夫です……次は、勇気を出しますから……。',
 conf:['あ、あの……お話が、あります……。','私、マスターのことが……好きです。','い、言っちゃった……!へ、返事は、いつでも……!'],
 sp:['ずっと胸の中にしまっていた気持ちを、今日は言わせてください。','あなたのおかげで、私は変われました。大好きです。','これからも、隣にいてもいいですか……?'],
 mail:['お手紙、うまく書けなくて……でも、気持ちだけは本当です。','差し入れです。あの、よかったら……。']},
onee:{hot:['あらあら、みんな元気ね。マスター、こっちにいらっしゃい?','隣、お姉さんが座ってあげましょうか?','頑張る子は、ご褒美が必要よ?'],joy:'ふふ、ありがとう。たっぷり甘やかしてあげるわ。',sulk:'あらあら……いいのよ。お姉さんは待つのも得意だから。',
 conf:['ねえ、マスター。ちょっとだけ、お姉さんの本音、聞いてくれる?','年上だからって、余裕があるわけじゃないのよ。……あなたが好き。','ふふ、顔が真っ赤。かわいい。返事は、ゆっくりでいいわ。'],
 sp:['ずっと見守るだけでいいと思っていたの。でも、もう無理みたい。','あなたが好き。お姉さんとしてじゃなく、一人の女として。','これからは、私があなたを支えさせて。ずっと、ね。'],
 mail:['無理していない?お姉さん、ちゃんと見てるからね。','手作りのお菓子、おなかが空いたら食べてね。']},
imo:{hot:['せんぱーい!こっち向いてくださいっ!','せんぱいの隣、私の特等席ですよね?','ほめてほめて!今日もがんばりました!'],joy:'やったぁ!せんぱい、だいすきです!',sulk:'うぅ……次は、絶対私の番ですからね!',
 conf:['せ、せんぱい!お話があります!','ずっと憧れてました。でも、今は「憧れ」じゃ足りなくて……好きです!','へ、返事は……えっと、いつでも!でも、できれば早めがいいです!'],
 sp:['せんぱいの背中を追いかけて、ここまで来ました。','後輩としてじゃなく、一人の女の子として、好きです。','隣を歩けるように、もっとがんばります。だから、そばにいさせてください!'],
 mail:['せんぱいへ!今日もお疲れさまです!','差し入れです!ちゃんと食べてくださいねっ!']},
ojou:{hot:['わたくしを見てくださいませ。','隣の席は、わたくしにふさわしいですわ。','ふふ、皆さま必死ですこと。でも、負けませんわ。'],joy:'当然ですわ。……でも、嬉しいですわ。ありがとう。',sulk:'ま、まあ、今回は譲って差し上げますわ。……次は、覚えていらして?',
 conf:['マスター、少々お時間をよろしくて?','わたくし、生まれて初めて、欲しいものができましたの。……あなたですわ。','お返事は、急ぎませんわ。……ただし、断るなんて許しませんわよ?'],
 sp:['家の名前ではなく、わたくし自身を見てくださったのは、あなただけ。','愛していますわ。心から、あなたを。','これからは、わたくしの隣が、あなたの席ですのよ。'],
 mail:['お手紙をしたためましたの。心して読みなさい。','屋敷の庭で採れた花ですわ。飾ってくださいませ。']},
tennen:{hot:['マスター、こっちこっちー。','あれー?みんな、どうしたのー?あ、マスターかー!','となり、あいてるー?わたし、すわるー。'],joy:'わーい、やったー!マスター、ありがとー!',sulk:'そっかー。じゃあ、つぎにするねー。……ちょっと、さみしいけど。',
 conf:['マスター、あのねー。ちょっと、いいかなー?','わたしね、マスターのこと、すきー。とっても、すきー。','ふふ、いっちゃったー。へんじは、いつでもいいよー。'],
 sp:['ずっとね、胸があったかくて、これがなんなのか、わかったの。','これが「すき」ってことなんだね。マスターが、だいすき。','ずーっといっしょに、いてね。やくそくだよー?'],
 mail:['おてがみ、かいたよー。じょうずにかけたかなー?','おやつ、もってきたよー。いっしょにたべよー。']},
boku:{hot:['マスター、ボクの方、見てよ!','ボクが隣、もらっちゃおうかな!','みんな、ほんとにマスター大好きだよね!……ボクも、だけど。'],joy:'やった!ボクを選ぶなんて、さすがマスター、わかってる!',sulk:'ちぇー。……まあ、次はボクが勝つからいいけどね!',
 conf:['あのさ、マスター。ちょっとだけ、真面目な話していい?','ボク、マスターのことが好きだ。ほんとに、好き。','へへ、柄じゃないよね。でも、嘘じゃないから!'],
 sp:['ボクはさ、ずっと自分らしくいられる場所を探してた。','それが、マスターの隣だったんだ。好きだよ。','ずっとボクの一番近くにいてよ。ボクも、そうするから。'],
 mail:['やっほー!手紙なんて柄じゃないけど、書いてみた!','差し入れ!ボクの自信作だよ!']},
mist:{hot:['ふふ……こちらを向いて。運命が、そう言っているわ。','今夜の星は、あなたの隣を指しているの。','隣は、私のもの。……そう決まっているのよ。'],joy:'ふふ、ありがとう。……これも、運命ね。',sulk:'いいわ。星は、また巡るもの。……でも、少しだけ妬けるわ。',
 conf:['ねえ、マスター。今夜だけ、占いを抜きにして話すわね。','私、あなたに恋をしているみたい。……星は、何も教えてくれなかったのに。','ふふ、驚いた?返事は、星が瞬くまで待つわ。'],
 sp:['運命なんて、信じていなかった。でも、あなたに出会って変わったの。','あなたが好き。星よりも、月よりも。','これからも、同じ空の下で、あなたの隣にいさせて。'],
 mail:['この手紙は、月の光の下で書いたの。','差し入れ。夜更かしのお供に。']},
maji:{hot:['マスター、こちらを向いてください。','隣の席の件ですが、私が適任だと思います。','規則よりも大切なものが、あるんです。'],joy:'ありがとうございます。誠心誠意、お務めします。',sulk:'承知しました。……次の機会を、お待ちします。',
 conf:['マスター、少々お時間をいただけますか。','不器用ですが、はっきり申し上げます。あなたのことが、好きです。','お返事は、急ぎません。ただ、真剣だということだけ、覚えていてください。'],
 sp:['私は、嘘が苦手です。だから、正直に言います。','あなたが好きです。誰よりも、誠実に。','これからも、そばで支えさせてください。生涯をかけて。'],
 mail:['拝啓。……堅いですね。気持ちだけ、受け取ってください。','差し入れです。栄養バランスを考えました。']},
gal:{hot:['マスター、こっち向いてー!写真撮ろー!','隣ゲットー!ウチが先だよねっ!','みんなマスター好きすぎでしょ!……ウチもだけど!'],joy:'やったー!マスター、マジ神!ありがとー!',sulk:'えー!?しょーがないなー!次はウチね!',
 conf:['ねね、マスター。ちょっとだけ、マジな話していい?','ウチさ、マスターのこと、本気で好きなんだよね。','ちょ、笑わないでよ!……返事は、いつでもいいからさ。'],
 sp:['ずっとノリで誤魔化してたけど、もう無理。','マスターが好き。マジで。他の誰でもなく、マスターが。','これからも、いっぱい思い出つくろーね。ずっと、一緒に。'],
 mail:['やっほー!手紙書いたよー!読んでねー!','差し入れ!インスタ映えするやつ選んだ!']}
};
const SHOUT=['好きです!','付き合ってください!','私を選んで!','マスターっ!','告白します!','こっち向いてー!','ずっと好きでした!','今日こそ言います!','私が一番好き!','隣にいさせて!'];
/* モテ度ランクが上がるほど、行列の女の子の台詞が変わる */
const QL=[
['あの、店長さんですよね…?クラスで話題なんです。','同じクラスの子が、ここの店長さんカッコいいって言ってて…','緊張する…!握手してもらってもいいですか?','友だちに自慢しちゃおうかな。'],
['商店街で噂になってますよ、店長さんのこと!','八百屋のおばちゃんも「いい男だ」って言ってました!','ご近所さんが、みんな店長さんの話をしてます!','今日こそ、顔を覚えてもらうんだ。'],
['街じゅうの女の子が、店長さんの話をしてるんです!','駅の掲示板にまで、店長さんの話題が…!','今日こそ名前を呼んでもらうんだから…!','ライバルが多すぎて、気が気じゃないです!'],
['県外から新幹線で来ちゃいました!','店長さんファンクラブ、県内だけで会員500人らしいです!','朝4時から並んでます!後悔はしません!','ローカル番組で見て、一目で恋に落ちました!'],
['全国放送で見て、飛行機で来ました!','ファンレター、ポストに入りきらないらしいですよ?','全国のファンを代表して来ました!','雑誌の「抱かれたい店長」1位、納得です!'],
['モテの王者に会えるなんて…夢みたい!','ひれ伏します…!サインください!','王者の顔、ちゃんと目に焼きつけました!','周りの女の子の視線が、すごい圧です…!'],
['海外のファンも並んでます!私は通訳係です!','世界一モテる男の前で、緊張しないほうが無理です!','国境を越えて、会いに来ました!','地球の裏側から、愛を込めて!'],
['神話の中の人に、会えてしまった……','私の孫にまで語り継ぎます、この日のことを!','もはや信仰です。お布施させてください!','伝説の店長に、今日も会えた…生きててよかった!']
];
const FEED_MOTE=['あの店の店長、モテすぎでは?','ひだまり喫茶、店長の周りに女の子がぎっしりで草','店長に向かってハートが飛びまくってる。現実?','モテモテタイム突入してるの見た。包囲網がすごい','店長の隣の席、争奪戦が始まってて見てるだけで楽しい','これもう店長じゃなくてアイドルでは?','女の子たちの視線が全部店長に集まってる','「隣に座るのは誰?」って場面、ドラマかと思った','店長、愛されすぎて心配になるレベル','モテすぎ店長のハーレム喫茶、今日も平和です'];
const FEED_RANK=['{n}が「{r}」に昇格したらしい。そりゃそうだよね','「{r}」になった店長、ひだまり喫茶で目撃情報多数','昇格おめでとう!「{r}」の店長、もっと推せる','「{r}」って呼ばれてて笑った。でも納得','店長が「{r}」になったので、今夜は祝杯です'];
const GIFTS=[['🎁','プレゼント'],['💐','花束'],['🍫','チョコレート'],['🧸','ぬいぐるみ'],['🍰','ケーキ'],['🌹','バラ'],['👜','バッグ'],['🍓','いちご'],['🧁','カップケーキ'],['🍷','ワイン'],['💌','ラブレター'],['🎀','リボン']];

/* ---------- スタイル ---------- */
const css=document.createElement('style');
css.textContent=`
.hx-edge{position:fixed;inset:0;z-index:45;pointer-events:none;opacity:0;transition:opacity .5s;box-shadow:inset 0 0 70px 16px rgba(255,92,150,.7),inset 0 0 160px 30px rgba(255,160,200,.35)}
.hx-edge.on{opacity:1;animation:hxedge 1.1s ease-in-out infinite alternate}
@keyframes hxedge{to{box-shadow:inset 0 0 110px 26px rgba(255,60,130,.85),inset 0 0 200px 50px rgba(255,190,220,.45)}}
#mgr{position:relative}
.hx-spk{position:absolute;pointer-events:none;font-size:14px;opacity:0}
#mgr.hx-star .hx-spk{animation:hxtw 1s ease-in-out infinite}
#mgr.hx-star .mgrsvg{box-shadow:0 0 0 3px #ffd36acc,0 0 28px #ff7aa2}
@keyframes hxtw{0%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:1;transform:scale(1.25) rotate(90deg)}100%{opacity:0;transform:scale(.4) rotate(180deg)}}
.hx-pulse{animation:hxpulse .35s ease}
@keyframes hxpulse{40%{transform:scale(1.14)}}
.hx-fh{position:fixed;z-index:70;pointer-events:none;font-size:18px;margin:-9px 0 0 -9px;filter:drop-shadow(0 1px 3px #0008)}
.seat.hx-look svg{transition:transform .25s}
#hx-pile{position:absolute;right:10px;bottom:78px;width:150px;height:100px;pointer-events:none;z-index:4}
.hx-gi{position:absolute;font-size:18px;line-height:1;filter:drop-shadow(0 2px 2px #0009);transform:translateX(-50%)}
#hx-peeks{position:absolute;inset:0;pointer-events:none;z-index:3}
.hx-pk{position:absolute;width:34px;height:34px;animation:hxpk 2.4s ease-in-out infinite alternate}
.hx-pk>svg{display:block;width:100%;height:100%;border-radius:50%;background:#ffe3ef;box-shadow:0 0 0 2px #fffa}
.hx-pk>i{position:absolute;right:-3px;bottom:-4px;font-size:11px;font-style:normal}
@keyframes hxpk{to{transform:translate(var(--tx),var(--ty))}}
.hx-bar{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;justify-content:center;font-size:.8rem;color:var(--mute)}
.hx-bar b{color:var(--fg);font-variant-numeric:tabular-nums}
#hx-ov{position:fixed;inset:0;z-index:80;pointer-events:none}
#hx-ov>*{pointer-events:auto}
.hx-modal{position:fixed;inset:0;z-index:80;background:#0a0818d0;display:grid;place-items:center;padding:16px;overflow-y:auto}
.hx-card{width:100%;max-width:520px;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:16px 18px 18px;display:grid;gap:12px}
.hx-card h3{margin:0;font:400 1.1rem/1.3 var(--f-display);color:var(--rose)}
.hx-p{margin:0;font-size:.9rem;color:var(--mute)}
.hx-cands{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}
.hx-cand{border:1px solid var(--line);background:var(--bg2);color:var(--fg);border-radius:16px;padding:10px 6px;display:grid;justify-items:center;gap:4px;cursor:pointer;font:inherit}
.hx-cand:hover,.hx-cand:focus-visible{border-color:var(--c,var(--rose))}
.hx-cf,.hx-lf{display:block;width:64px;height:64px;border-radius:50%;overflow:hidden;background:#ffe3ef;box-shadow:0 0 0 3px var(--c,#ff7aa2)}
.hx-lf{width:44px;height:44px;flex:0 0 auto}
.hx-cf svg,.hx-lf svg{display:block;width:100%;height:100%}
.hx-ln{display:flex;gap:10px;align-items:center;background:var(--bg2);border-radius:14px;padding:8px 10px}
.hx-ln p{margin:2px 0 0;font-size:.88rem}
.hx-ln.paper{background:#fff6ea;color:#5a3a2e}
.hx-ln.paper b{color:#b8556b}
.hx-scene{position:fixed;inset:0;z-index:80;display:grid;grid-template-rows:auto 1fr auto;background:#0a0818;overflow:hidden;--c:#ff7aa2}
.hx-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity 1s}
.hx-bg.on{opacity:1;animation:hxkb 12s ease-in-out infinite alternate}
@keyframes hxkb{to{transform:scale(1.08)}}
.hx-fb{position:absolute;inset:0;background:radial-gradient(circle at 50% 38%,color-mix(in srgb,var(--c) 62%,#2a1040),#120c26 78%)}
.hx-art{position:absolute;bottom:0;left:50%;transform:translateX(-50%);height:80%}
.hx-art svg{height:100%;width:auto;display:block}
.hx-glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 40%,#ffffff22,#0000 60%)}
.hx-scene.gold .hx-glow{background:radial-gradient(circle at 50% 35%,#ffe08aaa,#ff7aa244 45%,#0000 75%);animation:hxgold 2s ease-in-out infinite alternate}
@keyframes hxgold{to{opacity:.55}}
.hx-vig{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,#0007 0,#0000 22%,#0000 42%,#000d 100%)}
.hx-hd{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:14px 16px;font:400 1.05rem/1.3 var(--f-display);color:#fff;text-shadow:0 1px 6px #000a}
.hx-x{border:0;background:#0006;color:#fff;width:34px;height:34px;border-radius:50%;font-size:1.1rem;cursor:pointer}
.hx-box{position:relative;z-index:2;margin:0 auto 18px;width:min(640px,calc(100% - 24px));background:#120f26eb;border:1px solid #ffffff33;border-radius:18px;padding:14px 18px 16px;display:grid;gap:8px;min-height:150px;align-content:start}
.hx-nm{font:400 .85rem/1.2 var(--f-display);color:var(--c);min-height:1.2em}
.hx-tx{margin:0;font-size:1rem;line-height:1.8;min-height:3.6em}
.hx-tx.n{color:var(--mute);font-style:italic}
.hx-nx{justify-self:end}
.hx-crowd{position:absolute;inset:0;z-index:1;pointer-events:none}
.hx-ff{position:absolute;transform:translate(-50%,-50%);border-radius:50%;overflow:hidden;background:#ffe3ef;box-shadow:0 0 0 1.5px #fffb;animation:hxff 1.1s ease-in-out infinite alternate}
.hx-ff:nth-child(3n){animation-delay:.35s}.hx-ff:nth-child(3n+1){animation-delay:.7s}
.hx-ff svg{display:block;width:100%;height:100%}
@keyframes hxff{from{margin-top:0}to{margin-top:-6px}}
.hx-mgrc{position:absolute;left:50%;top:50%;width:min(120px,26vw);transform:translate(-50%,-50%);z-index:2;filter:drop-shadow(0 0 18px #ff7aa2)}
.hx-mgrc svg{display:block;width:100%;height:auto}
.hx-sb{position:absolute;z-index:3;transform:translate(-50%,-135%);background:#fff;color:var(--wood);font-weight:700;font-size:.8rem;padding:4px 9px;border-radius:12px;white-space:nowrap;box-shadow:0 3px 10px #0006;animation:pop .2s ease}
.hx-big{position:relative;z-index:2;align-self:start;justify-self:center;text-align:center;font:400 clamp(1.8rem,8vw,3.2rem)/1.1 var(--f-display);color:#fff;text-shadow:0 0 18px #ff3d85,0 2px 0 #ff3d85;margin-top:2vh;animation:hxbig .7s ease-in-out infinite alternate;pointer-events:none}
@keyframes hxbig{to{transform:scale(1.07) rotate(-1.5deg)}}
.hx-rank{position:fixed;inset:0;z-index:90;display:grid;place-items:center;text-align:center;overflow:hidden;background:radial-gradient(circle,#ff7aa2e6 0,#2a0a30f2 72%);cursor:pointer;animation:hxin .4s ease}
@keyframes hxin{from{opacity:0}}
.hx-rank>i{position:absolute;top:-30px;font-style:normal;font-size:1.6rem;animation:hxfall 3s linear infinite}
@keyframes hxfall{to{transform:translateY(110vh) rotate(360deg)}}
.hx-rk{position:relative;padding:0 18px}
.hx-rk small{display:block;color:#ffe3ef;letter-spacing:.1em;font-size:.9rem}
.hx-rk h2{margin:8px 0;font:400 clamp(1.7rem,8vw,3.4rem)/1.25 var(--f-display);color:#fff;text-shadow:0 0 22px #ffd36a,0 3px 0 #ff3d85;animation:hxzoom .6s cubic-bezier(.2,1.6,.4,1)}
@keyframes hxzoom{from{transform:scale(.3);opacity:0}}
.hx-rk p{margin:0 0 6px;color:#ffd36a;font:400 1.1rem var(--f-display)}
.hx-rk span{color:#ffffffaa;font-size:.75rem}
`;
document.head.appendChild(css);

/* ---------- DOM(後付け) ---------- */
const stage=$('stage');
const edge=document.createElement('div');edge.className='hx-edge';document.body.appendChild(edge);
const ov=document.createElement('div');ov.id='hx-ov';document.body.appendChild(ov);
const pile=document.createElement('div');pile.id='hx-pile';stage.appendChild(pile);
const peeks=document.createElement('div');peeks.id='hx-peeks';stage.appendChild(peeks);
const mgr=$('mgr');
for(let i=0;i<6;i++){const s=document.createElement('span');s.className='hx-spk';s.textContent=i%2?'✨':'⭐';
  s.style.cssText='left:'+[-6,50,88,-8,92,40][i]+'%;top:'+[0,-14,6,60,64,92][i]+'%;animation-delay:'+(i*0.17).toFixed(2)+'s';mgr.appendChild(s);}
const bar=document.createElement('div');bar.className='hx-bar';
bar.innerHTML='<span>🎁 プレゼントの山 <b id="hx-pn">0</b></span><span>👀 のぞき見 <b id="hx-pk">0</b>人</span><button class="btn small" id="hx-mailbtn" data-hx="mail">💌 ラブレター</button><button class="btn small ghost" id="hx-festbtn" data-hx="fest">💗 大モテ祭り</button>';
$('hap').insertAdjacentElement('afterend',bar);
bar.addEventListener('click',e=>{const b=e.target.closest('[data-hx]');if(!b||b.disabled)return;if(b.getAttribute('data-hx')==='mail')openMail();else festival();});

const busy=()=>!$('modal').hidden||ov.childElementCount>0||!!document.querySelector('.hx-modal,.hx-scene');
const loadSrc=src=>new Promise(res=>{const im=new Image();im.onload=()=>res(src);im.onerror=()=>res(null);im.src=src;});
async function loadOne(list){return loadSrc(pick(list));}
function closeEl(el){if(el&&el.parentNode)el.parentNode.removeChild(el);}

/* ---------- 音(モテモテタイム専用) ---------- */
function fanfare(){
  const a=HD.ac();if(!a)return;const n=a.currentTime;
  [0,4,7,9,12,14,16].forEach((k,i)=>HD.bell(HD.noteHz(k+5),n+i*.06,.1));
  HD.tone(220,n,.9,'sawtooth',.05,880);HD.tone(330,n+.1,.8,'triangle',.07,990);HD.noise(n+.1,.6,.07,7000);
}
function kyun(){
  const a=HD.ac();if(!a)return;const n=a.currentTime,f=900+rnd(500);
  HD.tone(f,n,.14,'sine',.07,f*1.6);HD.tone(f*1.5,n+.09,.12,'sine',.05,f*2.1);
}
let arpT=null,arpK=0;
function arpStart(){clearInterval(arpT);arpK=0;
  arpT=setInterval(()=>{const a=HD.ac();if(!a||!HD.moteOn())return;const n=a.currentTime,p=[0,2,4,2,5,4,2,7][arpK++%8];
    HD.bell(HD.noteHz(p+10),n,.035);if(arpK%2===0)HD.tone(HD.noteHz(p),n,.2,'triangle',.03);},340);}
function arpStop(){clearInterval(arpT);arpT=null;}

/* ---------- ハートが店長へ飛ぶ ---------- */
function flyHeart(fromEl,toEl){
  if(reduce||document.hidden||!fromEl||!toEl)return;
  const a=fromEl.getBoundingClientRect(),b=toEl.getBoundingClientRect();
  const e=document.createElement('div');e.className='hx-fh';e.textContent=pick(['💗','💕','💖','💘']);
  const x0=a.left+a.width/2+(Math.random()-.5)*a.width*.4,y0=a.top+a.height*.35,x1=b.left+b.width/2,y1=b.top+b.height*.4;
  e.style.left=x0+'px';e.style.top=y0+'px';document.body.appendChild(e);
  const dx=x1-x0,dy=y1-y0,mx=dx*.5+(Math.random()-.5)*70,my=dy*.5-50-Math.random()*40;
  const an=e.animate([{transform:'translate(0,0) scale(.6)',opacity:0},{transform:'translate('+mx+'px,'+my+'px) scale(1.15)',opacity:1,offset:.45},{transform:'translate('+dx+'px,'+dy+'px) scale(.5)',opacity:.1}],{duration:800+Math.random()*300,easing:'ease-in'});
  an.onfinish=()=>closeEl(e);setTimeout(()=>closeEl(e),1500);
}
function pulseMgr(){const m=$('mgrsvg');if(!m)return;m.classList.remove('hx-pulse');void m.offsetWidth;m.classList.add('hx-pulse');}
const seatEl=id=>document.querySelector('.seat[data-seat="'+id+'"]');

/* ---------- モテモテタイム ---------- */
let mtFeed=null,seatDone=false;
HK.moteStart=function(){
  fanfare();arpStart();seatDone=false;
  HD.feedPush(mt('あの店の店長、モテすぎでは?'),true);
  clearInterval(mtFeed);
  mtFeed=setInterval(()=>{if(!HD.moteOn()){clearInterval(mtFeed);return;}HD.feedPush(mt(pick(FEED_MOTE)),false);},2200);
  const n=owned().length,x=X();
  if(n>=3&&Math.random()<0.7)setTimeout(()=>{if(HD.moteOn()&&!seatDone)seatContest();},2600);
  if(n>=12&&Date.now()-x.festAt>FEST_CD&&Math.random()<0.15)setTimeout(()=>{if(!busy())festival(true);},7000);
};
HK.moteEnd=function(){
  arpStop();clearInterval(mtFeed);
  edge.classList.remove('on');mgr.classList.remove('hx-star');
  document.querySelectorAll('.seat.hx-look').forEach(s=>{s.classList.remove('hx-look');const v=s.querySelector('svg');if(v)v.style.transform='';});
  const x=X();x.pile+=1+Math.floor(owned().length/12);HD.save();
};
HK.moteBurst=function(){
  const L=owned().filter(h=>!HD.onDate(h.id));
  if(!L.length)return true;
  const tier=rankIdx(),k=Math.min(L.length,1+rnd(3)+(tier>=2?1:0)+(tier>=5?1:0));
  shuffle(L).slice(0,k).forEach((h,i)=>{
    setTimeout(()=>{if(!HD.moteOn())return;HD.say(h.id,pick(T[arch(h)].hot),true);const s=seatEl(h.id);if(s){flyHeart(s,$('mgrsvg'));setTimeout(()=>flyHeart(s,$('mgrsvg')),180);}},i*130);
  });
  kyun();setTimeout(pulseMgr,500);
  if(Math.random()<0.07&&!busy()){
    const bag=[];L.forEach(h=>{const w=1+Math.floor((HD.S().bond[h.id]||0)/10);for(let i=0;i<w;i++)bag.push(h);});
    confess(pick(bag));
  }
  return true;
};
/* 行列の女の子の台詞が、ランクで変わる */
HK.custLine=function(){if(Math.random()<0.25)return null;return pick(QL[Math.min(QL.length-1,rankIdx())]);};

/* ---------- モテ演出の見た目(0.4秒ごと) ---------- */
function fxTick(){
  const on=HD.moteOn();
  edge.classList.toggle('on',on);mgr.classList.toggle('hx-star',on);
  const seats=document.querySelectorAll('.seat[data-seat]');
  if(!on){seats.forEach(s=>{if(s.classList.contains('hx-look')){s.classList.remove('hx-look');const v=s.querySelector('svg');if(v)v.style.transform='';}});return;}
  const mr=$('mgrsvg').getBoundingClientRect(),mx=mr.left+mr.width/2,sw=stage.getBoundingClientRect().width||600;
  seats.forEach(s=>{
    if(s.classList.contains('away')){return;}
    const r=s.getBoundingClientRect(),sx=r.left+r.width/2,v=s.querySelector('svg');if(!v)return;
    const tilt=Math.max(-9,Math.min(9,(mx-sx)/sw*16));
    s.classList.add('hx-look');v.style.transform='rotate('+tilt.toFixed(1)+'deg) translateY(-2px)';
  });
}

/* ---------- ランク昇格 ---------- */
function showRank(r,steps){
  const lab=HD.MOTER[r][1],x=X();
  const el=document.createElement('div');el.className='hx-rank';
  let c='';for(let i=0;i<26;i++)c+='<i style="left:'+rnd(100)+'%;animation-delay:'+(Math.random()*2).toFixed(2)+'s;animation-duration:'+(2.4+Math.random()*2).toFixed(2)+'s">'+pick(['💗','💖','✨','💕','🌸'])+'</i>';
  el.innerHTML=c+'<div class="hx-rk"><small>モテ度ランク 昇格!</small><h2>「'+esc(lab)+'」になった!</h2><p>モテ度 '+HD.fmt(HD.moteScore())+'</p><span>(タップで閉じる)</span></div>';
  document.body.appendChild(el);
  const close=()=>{closeEl(el);};el.addEventListener('click',close);setTimeout(close,4800);
  const a=HD.ac();if(a){const n=a.currentTime;[0,2,4,7,9,12,14,16,19].forEach((k,i)=>HD.bell(HD.noteHz(k+5),n+i*.08,.1));HD.noise(n,.9,.09,6000);}
  const g=HD.tapGain()*120*steps;HD.gain(g);HD.S().tickets+=steps;
  HD.toast('モテ度ランク昇格!「'+lab+'」 +'+HD.fmt(g)+' 円・チケット+'+steps);
  HD.feedPush(pick(FEED_RANK).split('{n}').join(NM()).split('{r}').join(lab),true);
  HD.save();
}
function rankCheck(){
  const x=X(),r=rankIdx();
  if(x.rankMax<0){x.rankMax=r;return;}
  if(r>x.rankMax){const st=r-x.rankMax;x.rankMax=r;showRank(r,st);}
}

/* ---------- 席の取り合い「隣に座るのは誰?」 ---------- */
function seatContest(){
  if(busy())return;
  const S=HD.S(),L=owned().filter(h=>!HD.onDate(h.id));if(L.length<3)return;
  seatDone=true;
  const C=shuffle(L).slice(0,L.length>=30?4:3);
  const m=document.createElement('div');m.className='hx-modal';
  m.innerHTML='<div class="hx-card"><h3>💗 隣に座るのは誰?</h3><p class="hx-p">'+esc(mt('モテモテタイム!女の子たちが、マスターの隣の席をめぐって睨み合っている。'))+'</p><div class="hx-cands">'+
    C.map((h,i)=>'<button class="hx-cand" data-i="'+i+'" style="--c:'+h.c+'"><span class="hx-cf">'+HD.av(h,S.owned[h.id],true)+'</span><b>'+esc(h.name)+'</b><span class="role">ふれあい ★'+HD.bondRank(h.id)+'</span></button>').join('')+
    '</div><button class="btn ghost small hx-xx" style="justify-self:end">あとにする</button></div>';
  ov.appendChild(m);
  m.querySelector('.hx-xx').addEventListener('click',()=>closeEl(m));
  m.querySelectorAll('.hx-cand').forEach(b=>b.addEventListener('click',()=>{
    const w=C[+b.getAttribute('data-i')],x=X(),card=m.querySelector('.hx-card');
    addBond(w.id,3);x.st.seat++;x.pile+=1;
    const g=Math.max(HD.tapGain()*25,HD.perSec()*30);HD.gain(g);
    const line=(h,t,sulk)=>'<div class="hx-ln" style="--c:'+h.c+'"><span class="hx-lf">'+HD.av(h,S.owned[h.id],true)+'</span><div><b>'+esc(HD.given(h))+(sulk?'(すねている)':'')+'</b><p>'+esc(mt(t))+'</p></div></div>';
    card.innerHTML='<h3>💗 '+esc(HD.given(w))+'が、隣に座った!</h3>'+line(w,T[arch(w)].joy,false)+C.filter(h=>h!==w).map(h=>line(h,T[arch(h)].sulk,true)).join('')+
      '<p class="hx-p">'+esc(HD.given(w))+'とのふれあい+3 ・ +'+HD.fmt(g)+' 円</p><button class="btn hx-xx" style="justify-self:end">閉じる</button>';
    card.querySelector('.hx-xx').addEventListener('click',()=>{
      closeEl(m);
      C.filter(h=>h!==w).forEach((h,i)=>setTimeout(()=>HD.say(h.id,T[arch(h)].sulk,true),300+i*260));
      setTimeout(()=>HD.say(w.id,T[arch(w)].joy,true),150);
    });
    HD.sfx.up();HD.toast(HD.given(w)+'が隣に座りました。ふれあい+3');
    HD.save();HD.render();HD.checkAch();
  }));
}

/* ---------- 告白シーン(一枚絵風) ---------- */
function openScene(o){
  const S=HD.S(),el=document.createElement('div');el.className='hx-scene'+(o.special?' gold':'');el.style.setProperty('--c',o.color);
  el.innerHTML=(o.img?'<div class="hx-bg on" style="background-image:url(\''+o.img+'\')"></div>':'<div class="hx-fb"><div class="hx-art"></div></div>')+
    '<div class="hx-glow"></div><div class="hx-vig"></div><div class="hx-hd"><span>'+esc(mt(o.title))+'</span><button class="hx-x" aria-label="閉じる">×</button></div><div></div>'+
    '<div class="hx-box"><div class="hx-nm"></div><p class="hx-tx"></p><button class="btn hx-nx">つぎへ</button></div>';
  ov.appendChild(el);
  let i=0,done=false;
  const art=el.querySelector('.hx-art'),nm=el.querySelector('.hx-nm'),tx=el.querySelector('.hx-tx'),nx=el.querySelector('.hx-nx');
  const fin=()=>{if(done)return;done=true;closeEl(el);o.onEnd&&o.onEnd();};
  const show=()=>{
    const ln=o.lines[i],sp=ln[0];
    if(art){art.innerHTML=sp==='m'?HD.mgrSVG(false):HD.av(HD.HM[sp==='n'?o.hero.id:sp],Math.max(1,S.owned[o.hero.id]||1),false);}
    nm.textContent=sp==='n'?'':(sp==='m'?NM():HD.HM[sp].name);
    tx.textContent=mt(ln[1]);tx.className='hx-tx'+(sp==='n'?' n':'');
    if(HD.HM[sp])HD.sfx.voice(HD.HM[sp]);
    nx.textContent=i>=o.lines.length-1?'おわり':'つぎへ';
  };
  nx.addEventListener('click',()=>{if(i<o.lines.length-1){i++;show();}else fin();});
  el.querySelector('.hx-x').addEventListener('click',fin);
  show();nx.focus();
}
async function confess(h){
  if(busy())return;
  const S=HD.S(),x=X(),g=HD.given(h),t=T[arch(h)],spec=HD.bondRank(h.id)>=HD.BOND_MAX;
  const img=await loadOne(spec?IMG.special:IMG.normal);
  if(busy())return;
  const lines=spec
    ?[['n','特別な夜。ランプの灯りの下で、'+g+'がまっすぐに'+NM()+'を見つめている。'],[h.id,t.sp[0]],['m','……ああ。ちゃんと聞いてるよ。'],[h.id,t.sp[1]],[h.id,t.sp[2]],['n',g+'の瞳から、ひとすじ涙がこぼれた。ふたりの影が、そっと重なった。']]
    :[['n','閉店後のホール。'+g+'が、'+NM()+'のエプロンの裾をそっと掴んだ。'],[h.id,t.conf[0]],['m','え……俺に?'],[h.id,t.conf[1]],[h.id,t.conf[2]]];
  openScene({title:spec?'💗 特別な告白 ─ '+h.name:'💗 告白 ─ '+h.name,color:h.c,img:img,hero:h,lines:lines,special:spec,onEnd:function(){
    const S2=HD.S();let msg=g+'の告白!ふれあい+'+(spec?10:5);
    addBond(h.id,spec?10:5);x.st.conf++;x.pile+=spec?6:2;
    const gn=Math.max(HD.tapGain()*(spec?150:60),HD.perSec()*(spec?240:90));HD.gain(gn);msg+=' ・ +'+HD.fmt(gn)+' 円';
    if(!x.cf[h.id]){x.cf[h.id]=1;S2.tickets+=1;msg+=' ・チケット+1';}
    if(spec){x.st.sp++;if(!x.sp[h.id]){x.sp[h.id]=1;S2.tickets+=3;msg+=' ・特別な告白 初回チケット+3';}}
    HD.toast(msg);HD.sfx.ach();HD.save();HD.render();HD.checkAch();
  }});
}

/* ---------- 大モテ祭り(全員が同時に告白) ---------- */
let festOn=false;
async function festival(auto){
  const x=X(),L=owned();
  if(busy()||festOn)return;
  if(L.length<FEST_MIN){HD.toast('大モテ祭りは、'+FEST_MIN+'人以上を採用すると開催できます');return;}
  const left=FEST_CD-(Date.now()-x.festAt);
  if(left>0){HD.toast('次の大モテ祭りまで あと'+Math.ceil(left/1000)+'秒');return;}
  festOn=true;x.festAt=Date.now();x.st.fest++;
  const imgs=(await Promise.all(IMG.festival.map(loadSrc))).filter(Boolean);
  const S=HD.S(),el=document.createElement('div');el.className='hx-scene gold';el.style.setProperty('--c','#ff7aa2');
  const n=Math.min(L.length,150);
  el.innerHTML=(imgs.length?imgs.map((s,i)=>'<div class="hx-bg'+(i?'':' on')+'" style="background-image:url(\''+s+'\')"></div>').join(''):'<div class="hx-fb"></div>')+
    '<div class="hx-glow"></div><div class="hx-vig"></div><div class="hx-crowd"></div><div class="hx-mgrc">'+HD.mgrSVG(false)+'</div>'+
    '<div class="hx-hd"><span>💗 大モテ祭り</span><span></span></div><div class="hx-big">全員が、同時に告白!</div>'+
    '<div class="hx-box"><div class="hx-nm" style="--c:#ff7aa2">'+esc(NM())+'の周りに、'+L.length+'人</div><p class="hx-tx"></p><button class="btn hx-nx" disabled>受け止める</button></div>';
  ov.appendChild(el);
  /* 全員(最大150人)を店長のまわりに何重にも並べる */
  const crowd=el.querySelector('.hx-crowd'),W=window.innerWidth,Hh=window.innerHeight,cx=W/2,cy=Hh*0.46;
  const fs=n<=20?46:n<=50?38:n<=100?30:26,pool=shuffle(L).slice(0,n),els=[];
  let k=0,i=0,html='';const place=(h,px,py)=>{html+='<span class="hx-ff" data-id="'+h.id+'" style="left:'+px.toFixed(1)+'px;top:'+py.toFixed(1)+'px;width:'+fs+'px;height:'+fs+'px">'+HD.av(h,S.owned[h.id],true)+'</span>';};
  while(i<n&&k<40){
    const rx=Math.min(W*0.48,70+fs*1.05*(k+1)),ry=Math.min(Hh*0.4,60+fs*0.9*(k+1));
    const per=Math.max(6,Math.floor(2*Math.PI*((rx+ry)/2)/(fs*1.05)));
    for(let j=0;j<per&&i<n;j++,i++){const a=2*Math.PI*j/per+k*0.5;place(pool[i],cx+rx*Math.cos(a),cy+ry*Math.sin(a));}
    k++;if(rx>=W*0.48&&ry>=Hh*0.4&&k>8)break;
  }
  for(;i<n;i++){const a=Math.random()*6.283,r=0.3+Math.random()*0.7;place(pool[i],cx+W*0.45*r*Math.cos(a),cy+Hh*0.38*r*Math.sin(a));}
  crowd.innerHTML=html;crowd.querySelectorAll('.hx-ff').forEach(e=>els.push(e));
  const tx=el.querySelector('.hx-tx'),nx=el.querySelector('.hx-nx'),mgrc=el.querySelector('.hx-mgrc');
  tx.textContent=mt('女の子たちが一斉に、マスターへ想いを叫び始めた──!');tx.className='hx-tx n';
  const bgs=el.querySelectorAll('.hx-bg');let bi=0;
  const t1=bgs.length>1?setInterval(()=>{bgs[bi].classList.remove('on');bi=(bi+1)%bgs.length;bgs[bi].classList.add('on');},2600):null;
  const t2=setInterval(()=>{
    shuffle(els).slice(0,3).forEach(f=>{
      const r=f.getBoundingClientRect(),b=document.createElement('span');b.className='hx-sb';b.textContent=mt(pick(SHOUT));
      b.style.left=(r.left+r.width/2)+'px';b.style.top=(r.top+r.height/2)+'px';el.appendChild(b);setTimeout(()=>closeEl(b),950);
    });kyun();
  },520);
  const t3=setInterval(()=>{for(let j=0;j<3;j++){const f=pick(els);if(f)flyHeart(f,mgrc);}},130);
  let sec=5;
  const t4=setInterval(()=>{sec--;if(sec>0)nx.textContent='受け止める('+sec+')';else{nx.textContent='全員を受け止める';nx.disabled=false;clearInterval(t4);}},1000);
  nx.textContent='受け止める(5)';
  fanfare();HD.feedPush(mt('【速報】店長に全員が同時に告白!?あの店、大モテ祭りが始まった'),true);
  const stop=()=>{clearInterval(t1);clearInterval(t2);clearInterval(t3);clearInterval(t4);};
  const fin=()=>{
    stop();closeEl(el);festOn=false;
    const nn=L.length,S2=HD.S(),gn=Math.max(HD.perSec()*600,HD.tapGain()*300)*(1+nn/25),tk=Math.ceil(nn/25);
    owned().forEach(h=>addBond(h.id,2));
    HD.gain(gn);S2.tickets+=tk;x.pile+=Math.ceil(nn/2);HD.setBuff(30000);
    HD.toast('大モテ祭り!'+nn+'人全員から告白! +'+HD.fmt(gn)+' 円・チケット+'+tk+'・全員とふれあい+2・常連ラッシュ30秒');
    HD.sfx.ach();HD.save();HD.render();HD.checkAch();
  };
  nx.addEventListener('click',fin);
}

/* ---------- ラブレターと差し入れ(毎日) ---------- */
function ensureMail(){
  const x=X(),d=HD.dkey(),L=owned();
  if(x.mail.date!==d){x.mail={date:d,claimed:false,ids:shuffle(L).slice(0,Math.min(L.length,2+Math.floor(L.length/15))).map(h=>h.id)};}
  else if(!x.mail.claimed&&x.mail.ids.some(id=>!HD.S().owned[id])){x.mail.ids=shuffle(L).slice(0,Math.min(L.length,2+Math.floor(L.length/15))).map(h=>h.id);}
}
function openMail(){
  ensureMail();const x=X(),S=HD.S();
  if(x.mail.claimed||!x.mail.ids.length){HD.toast('今日のラブレターは受け取り済みです。また明日!');return;}
  if(busy())return;
  const hs=x.mail.ids.map(id=>HD.HM[id]),gs=hs.map(()=>pick(GIFTS));
  const m=document.createElement('div');m.className='hx-modal';
  m.innerHTML='<div class="hx-card"><h3>💌 今日のラブレターと差し入れ</h3>'+hs.map((h,i)=>'<div class="hx-ln paper" style="--c:'+h.c+'"><span class="hx-lf">'+HD.av(h,S.owned[h.id],true)+'</span><div><b>'+esc(h.name)+' より '+gs[i][0]+' '+esc(gs[i][1])+'</b><p>'+esc(mt(pick(T[arch(h)].mail)))+'</p></div></div>').join('')+
    '<button class="btn hx-ok" style="justify-self:end">受け取る</button></div>';
  ov.appendChild(m);
  m.querySelector('.hx-ok').addEventListener('click',()=>{
    const n=hs.length,g=HD.tapGain()*40*n+HD.perSec()*60;
    x.mail.claimed=true;x.st.mail++;x.pile+=n;hs.forEach(h=>addBond(h.id,1));
    HD.gain(g);let msg='ラブレターと差し入れ '+n+'通 +'+HD.fmt(g)+' 円・プレゼントの山が高くなった';
    if(n>=5){HD.S().tickets+=1;msg+='・チケット+1';}
    HD.toast(msg);HD.sfx.coin();closeEl(m);HD.save();HD.render();HD.checkAch();
  });
}

/* ---------- プレゼントの山・のぞき見 ---------- */
const pileN=()=>X().pile+Object.keys(HD.S().gift||{}).length*2;
let pileKey=-1;
function renderPile(){
  const n=Math.min(70,pileN());if(n===pileKey)return;pileKey=n;
  let h='',layer=0,rem=0,cap=Math.max(2,9);
  for(let i=0;i<n;i++){
    if(rem>=cap){layer++;rem=0;cap=Math.max(2,9-Math.floor(layer*1.4));}
    const x=75+(rem-(cap-1)/2)*15+(ps(i)-.5)*5,y=layer*11+(ps(i+50)-.5)*3;
    h+='<span class="hx-gi" style="left:'+x.toFixed(1)+'px;bottom:'+y.toFixed(1)+'px">'+GIFTS[(i*7+layer)%GIFTS.length][0]+'</span>';rem++;
  }
  pile.innerHTML=h;
}
const peekN=()=>{const n=owned().length;return n<2?0:Math.min(18,Math.floor(n/5)+rankIdx()*2+(HD.moteOn()?4:0));};
function renderPeeks(){
  const n=peekN();if(peeks.getAttribute('data-n')===String(n))return;peeks.setAttribute('data-n',n);
  let h='';
  for(let i=0;i<n;i++){
    const r1=ps(i*3+1),r2=ps(i*3+2),side=i%3;let st,tx,ty;
    if(side===0){st='left:-13px;top:'+(18+r1*62).toFixed(0)+'%';tx='9px';ty=(r2*10-5).toFixed(0)+'px';}
    else if(side===1){st='right:-13px;top:'+(18+r1*62).toFixed(0)+'%';tx='-9px';ty=(r2*10-5).toFixed(0)+'px';}
    else{st='top:-12px;left:'+(8+r1*84).toFixed(0)+'%';tx='0px';ty='8px';}
    h+='<span class="hx-pk" style="'+st+';--tx:'+tx+';--ty:'+ty+';animation-delay:-'+(r2*2).toFixed(2)+'s">'+HD.custH(300+i).face+'<i>💗</i></span>';
  }
  peeks.innerHTML=h;
}
function updBar(){
  const x=X(),n=owned().length;
  $('hx-pn').textContent=pileN();$('hx-pk').textContent=peekN();
  const mb=$('hx-mailbtn'),ready=!x.mail.claimed&&x.mail.ids.length>0;
  mb.disabled=!ready;mb.className='btn small'+(ready?'':' ghost');mb.textContent=ready?'💌 ラブレター×'+x.mail.ids.length+'通':'💌 今日は受け取り済み';
  const fb=$('hx-festbtn'),left=FEST_CD-(Date.now()-x.festAt);
  if(n<FEST_MIN){fb.disabled=true;fb.textContent='💗 大モテ祭り('+FEST_MIN+'人以上)';}
  else if(left>0){fb.disabled=true;fb.textContent='💗 大モテ祭り あと'+Math.ceil(left/1000)+'秒';}
  else{fb.disabled=false;fb.textContent='💗 大モテ祭りを開く';}
}

/* ---------- 実績 ---------- */
HD.ACH.push(
 {id:'hx_c1',n:'はじめての告白',d:'告白イベントを見る',f:()=>X().st.conf>=1},
 {id:'hx_c10',n:'告白される日々',d:'告白イベントを10回見る',f:()=>X().st.conf>=10},
 {id:'hx_sp1',n:'特別な告白',d:'絆が最大の子から特別な告白を受ける',f:()=>X().st.sp>=1},
 {id:'hx_f1',n:'大モテ祭り',d:'全員が同時に告白する祭りを開く',f:()=>X().st.fest>=1},
 {id:'hx_s10',n:'隣は誰のもの?',d:'席の取り合いを10回さばく',f:()=>X().st.seat>=10},
 {id:'hx_r3',n:'県内で噂',d:'モテ度ランクを「県内で噂のモテ男」にする',f:()=>X().rankMax>=3},
 {id:'hx_p100',n:'プレゼントの山',d:'プレゼントの山を100個にする',f:()=>pileN()>=100}
);

/* ---------- 起動 ---------- */
ensureMail();rankCheck();renderPile();renderPeeks();updBar();
setInterval(fxTick,400);
setInterval(()=>{ensureMail();rankCheck();renderPile();renderPeeks();updBar();},1000);
if(HD.moteOn()){arpStart();}
})();
