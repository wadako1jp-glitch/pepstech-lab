(function(){
  "use strict";

  var RABBIT_MODEL = "assets/mascot-rabbit.glb";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
     刷り(print run) — 紙 + インク2色。ネオンをやめ、印刷インクの階調に寄せる
     ============================================================ */
  var RUNS = [
    { paper:"#EFE9DD", card:"#FBF8F1", fg:"#20242C", soft:"#5B616B",
      ink1:"#E0467A", ink2:"#2B3A67", n1:"蛍光ピンク", n2:"藍", pn:"淡クリーム" },
    { paper:"#F1EFE4", card:"#FCFBF4", fg:"#1E2620", soft:"#586055",
      ink1:"#C2452C", ink2:"#4A6741", n1:"朱", n2:"苔", pn:"白茶" },
    { paper:"#DEDACF", card:"#F4F1E9", fg:"#1B2230", soft:"#565E6C",
      ink1:"#BE8A2C", ink2:"#1F3050", n1:"黄土", n2:"濃紺", pn:"灰白" },
    { paper:"#F3F1F0", card:"#FFFFFF", fg:"#26242B", soft:"#605D68",
      ink1:"#6B5B95", ink2:"#2A2A2A", n1:"藤", n2:"墨", pn:"純白" },
    { paper:"#16202E", card:"#1F2C3D", fg:"#E8E3D8", soft:"#9AA6B4",
      ink1:"#E0467A", ink2:"#7FC4B8", n1:"蛍光ピンク", n2:"緑青", pn:"濃紺（夜刷り）", dark:true },
    { paper:"#E9E2D2", card:"#F8F3E7", fg:"#2A211C", soft:"#665B52",
      ink1:"#8C4A2F", ink2:"#3F7A6E", n1:"赤錆", n2:"青緑", pn:"生成" },
    { paper:"#1C1B22", card:"#26252E", fg:"#EDE9E2", soft:"#9C98A4",
      ink1:"#D9C34A", ink2:"#8A7FD1", n1:"硫黄", n2:"藤紫", pn:"黒（夜刷り）", dark:true }
  ];

  var FONTS = ["var(--f-cond)","var(--f-serif)","var(--f-mono)","var(--f-goth)"];

  /* ============================================================
     断片データ（本番は fragments.json）
     ============================================================ */
  var SAMPLE = [
    { tag:"HN", title:"Show HN: 個人サイトを4年ぶりに更新した",
      body:"コメント欄が「Comic Sansは正義か」で200件荒れている。本題は誰も読んでいない。",
      src:"news.ycombinator.com（サンプル）" },
    { tag:"WIKI", title:"きょうのランダム記事",
      body:"「赤提灯」は、日本の大衆酒場の目印として軒先に吊るされる赤い提灯の通称である。",
      src:"ja.wikipedia.org / Random（サンプル）" },
    { tag:"天気", title:"東京 きょう",
      body:"曇りのち一時雨。傘は持っていくが、たぶん使わないまま帰ってくる。",
      src:"weather API（サンプル）" },
    { tag:"運行情報", title:"○○線 遅延30分",
      body:"原因は「車両点検」。いつもの。振替輸送、いつもの改札、いつもの人だかり。",
      src:"train delay API（サンプル）" },
    { tag:"HN", title:"Ask HN: 趣味サイトにサーバー処理は過剰設計か",
      body:"最多得票の回答:「趣味に過剰も何もない」。以上、閉廷。",
      src:"news.ycombinator.com（サンプル）" },
    { tag:"WIKI", title:"きょうのランダム記事 その2",
      body:"「奥付」とは、書籍の巻末に置かれ、発行者・印刷所・刊行年などを記した部分をいう。",
      src:"ja.wikipedia.org / Random（サンプル）" },
    { tag:"RSS", title:"個人サイト、静かに増加中",
      body:"SNS疲れの受け皿として自前ドメインに戻る動きがある、という趣旨の記事。",
      src:"RSS feed（サンプル）" },
    { tag:"メモ", title:"串カツ田中は関東で妥協できる串カツ屋であるのか",
      body:"命題は未解決のまま。二度目の検証が必要である。",
      src:"手元の日報（サンプル）" }
  ];

  var LOG = [
    { when:"4年前のきょう", text:"「そろそろブログを再開する」と書いて、そのまま4年が経過した" },
    { when:"きのう", text:"Syncthingの共有先にAndroidを追加し忘れていたことに気づく" },
    { when:"11年前の火曜", text:"はてなダイアリーからの引っ越し作業（未完）" },
    { when:"けさ", text:"収集ジョブを入れた。1時間おきに勝手に刷り直る" },
    { when:"来週の予定", text:"RSSの購読先を決める（決まっていない）" },
    { when:"時刻不明", text:"一番見づらい版を刷ってしまったが、そのまま出すことにした" }
  ];

  /* ミーム生成用の語彙。断片のタイトルからも作る。 */
  var MEME_TOP = [
    "グリッドを捨てた","デザインシステムが無い","毎回ちがう版で刷る",
    "cronはまだ書いていない","配色は運","本文より装飾が多い",
    "4年ぶりの更新","誰も読んでいない"
  ];
  var MEME_BOTTOM = [
    "以上","それでいい","閉廷","知らんけど","仕様です","続く","現場からは以上です"
  ];

  /* ============================================================
     小道具
     ============================================================ */
  function rand(a,b){ return a+Math.random()*(b-a); }
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function shuffle(a){
    var r=a.slice(),i,j,t;
    for(i=r.length-1;i>0;i--){ j=Math.floor(Math.random()*(i+1)); t=r[i]; r[i]=r[j]; r[j]=t; }
    return r;
  }
  function esc(s){
    return String(s).replace(/[&<>"']/g,function(c){
      return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];
    });
  }
  function hexRGB(h){
    h=h.replace("#","");
    if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  }

  /* ============================================================
     紙の粒子（1枚だけ作って敷き詰める）
     ============================================================ */
  function makeGrain(){
    var n=180, c=document.createElement("canvas");
    c.width=c.height=n;
    var x=c.getContext("2d"), img=x.createImageData(n,n), d=img.data, i;
    for(i=0;i<d.length;i+=4){
      var v=210+Math.random()*45;
      d[i]=d[i+1]=d[i+2]=v;
      d[i+3]=Math.random()*38;
    }
    x.putImageData(img,0,0);
    return c.toDataURL("image/png");
  }

  /* ============================================================
     ハーフトーン網点でリソ印刷を生成
     マスクを描いて、そこから網点を打つ。インク2色をわずかにズラす＝見当ズレ
     ============================================================ */
  function drawShapes(ctx,w,h,seedShapes){
    ctx.fillStyle="#000";
    for(var i=0;i<seedShapes;i++){
      var kind=Math.floor(rand(0,3));
      ctx.save();
      ctx.globalAlpha=rand(.45,1);
      if(kind===0){
        ctx.beginPath();
        ctx.arc(rand(0,w),rand(0,h),rand(w*.12,w*.45),0,Math.PI*2);
        ctx.fill();
      }else if(kind===1){
        ctx.translate(rand(0,w),rand(0,h));
        ctx.rotate(rand(0,Math.PI));
        ctx.fillRect(-w*.5,-rand(4,h*.16),w,rand(8,h*.3));
      }else{
        ctx.beginPath();
        ctx.moveTo(rand(0,w),rand(0,h));
        ctx.lineTo(rand(0,w),rand(0,h));
        ctx.lineTo(rand(0,w),rand(0,h));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function halftoneLayer(target,w,h,ink,offX,offY,shapes,cell){
    var m=document.createElement("canvas");
    m.width=w; m.height=h;
    var mc=m.getContext("2d");
    mc.clearRect(0,0,w,h);
    drawShapes(mc,w,h,shapes);
    var data=mc.getImageData(0,0,w,h).data;

    var rgb=hexRGB(ink);
    target.save();
    target.globalCompositeOperation="multiply";
    target.fillStyle="rgb("+rgb[0]+","+rgb[1]+","+rgb[2]+")";
    var maxR=cell*0.62;
    for(var y=cell/2;y<h;y+=cell){
      for(var x=cell/2;x<w;x+=cell){
        var px=Math.min(w-1,Math.max(0,Math.round(x-offX)));
        var py=Math.min(h-1,Math.max(0,Math.round(y-offY)));
        var a=data[(py*w+px)*4+3]/255;
        if(a<=.04) continue;
        target.beginPath();
        target.arc(x,y,maxR*Math.sqrt(a),0,Math.PI*2);
        target.fill();
      }
    }
    target.restore();
  }

  function genPrint(w,h,run,opt){
    opt=opt||{};
    var c=document.createElement("canvas");
    c.width=w; c.height=h;
    var x=c.getContext("2d");
    x.fillStyle=opt.bg||run.card;
    x.fillRect(0,0,w,h);
    var cell=opt.cell||rand(5,8);
    var lo=opt.dense?4:2, hi=opt.dense?7:4;
    /* 2版を少しズラして重ねる = 見当ズレ */
    halftoneLayer(x,w,h,run.ink2,0,0,Math.floor(rand(lo,hi)),cell);
    halftoneLayer(x,w,h,run.ink1,rand(-3,3),rand(-3,3),Math.floor(rand(lo,hi)),cell);
    return c;
  }

  /* ============================================================
     ミーム生成
     ・背景は生成したリソ印刷
     ・字幕はImpact（日本語は太ゴシックにフォールバック）＋黒フチで必ず読める
     ============================================================ */
  function fitText(ctx,text,maxW,startPx){
    var px=startPx;
    do{
      ctx.font='700 '+px+'px Impact, "Arial Black", "Hiragino Sans", "Yu Gothic", sans-serif';
      if(ctx.measureText(text).width<=maxW) break;
      px-=1;
    }while(px>11);
    return px;
  }

  function captionLine(ctx,text,w,y,basePx){
    var px=fitText(ctx,text,w-18,basePx);
    ctx.textAlign="center";
    ctx.lineJoin="round";
    ctx.miterLimit=2;
    ctx.lineWidth=Math.max(3,px*0.17);
    ctx.strokeStyle="#000";
    ctx.strokeText(text,w/2,y);
    ctx.fillStyle="#fff";
    ctx.fillText(text,w/2,y);
    return px;
  }

  function genMeme(w,h,run,top,bottom){
    var c=genPrint(w,h,run,{ cell:rand(4,6.5), dense:true });
    var x=c.getContext("2d");
    /* 白い紙の上だと白フチ文字が沈むので、全面を一段沈めてから上下を締める */
    x.fillStyle="rgba(0,0,0,.32)";
    x.fillRect(0,0,w,h);
    var g=x.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"rgba(0,0,0,.46)");
    g.addColorStop(.32,"rgba(0,0,0,0)");
    g.addColorStop(.68,"rgba(0,0,0,0)");
    g.addColorStop(1,"rgba(0,0,0,.5)");
    x.fillStyle=g; x.fillRect(0,0,w,h);

    x.textBaseline="top";
    if(top) captionLine(x,top,w,9,Math.round(h*0.17));
    x.textBaseline="bottom";
    if(bottom) captionLine(x,bottom,w,h-8,Math.round(h*0.17));
    return c;
  }

  /* 断片のタイトルを字幕に流用する = 収集物からミームを生成 */
  function memeFromFragment(f){
    var t=f.title;
    if(t.length>22) t=t.slice(0,21)+"…";
    return { top:t, bottom:pick(MEME_BOTTOM) };
  }

  /* ============================================================
     カード生成
     ============================================================ */
  var run, frags=SAMPLE;

  function el(tag,cls){ var e=document.createElement(tag); if(cls) e.className=cls; return e; }

  /* canvas から img を作る。width/height を必ず入れて、
     デコード前でもブラウザが高さを確保できるようにする（配置計算がズレるため） */
  function genImg(canvas,alt){
    var img=el("img","gen");
    img.width=canvas.width;
    img.height=canvas.height;
    img.alt=alt||"";
    img.src=canvas.toDataURL();
    return img;
  }

  function cardText(f,withImage){
    var c=el("div","card");
    if(withImage){
      c.appendChild(genImg(genPrint(250,124,run),""));
    }
    var tag=el("span","tag"); tag.textContent=f.tag; c.appendChild(tag);
    var h=el("h3"); h.textContent=f.title; h.style.fontFamily=pick(FONTS); c.appendChild(h);
    var p=el("p"); p.textContent=f.body; p.style.fontFamily=pick(FONTS); c.appendChild(p);
    var s=el("span","src");
    if(f.url){
      /* 収集元へ辿れるようにする。転載ではなく参照であることを明示する意味もある */
      var a=document.createElement("a");
      a.href=f.url;
      a.target="_blank";
      a.rel="noopener noreferrer";
      a.textContent="source: "+f.src;
      s.appendChild(a);
    }else{
      s.textContent="source: "+f.src;
    }
    c.appendChild(s);
    return c;
  }

  function cardPrint(){
    var c=el("div","card print");
    c.appendChild(genImg(genPrint(226,186,run),"生成されたリソ印刷"));
    var cap=el("span","cap");
    cap.textContent="無題 / "+run.n1+"・"+run.n2+" 2版刷り";
    c.appendChild(cap);
    return c;
  }

  /* topText を渡すと語彙を指定できる。同じ紙面に同じミームが2枚出るのを避けるため。 */
  function cardMeme(f,topText){
    var c=el("div","card meme");
    var m=f?memeFromFragment(f)
          :{ top:topText||pick(MEME_TOP), bottom:pick(MEME_BOTTOM) };
    c.appendChild(genImg(genMeme(226,196,run,m.top,m.bottom),
      "生成されたミーム: "+m.top+" / "+m.bottom));
    var cap=el("span","cap");
    cap.textContent=f?"収集した断片から自動生成":"語彙プールから自動生成";
    c.appendChild(cap);
    return c;
  }

  function cardMascot(){
    var c=el("div","card mascot");
    var mv=document.createElement("model-viewer");
    mv.setAttribute("alt","マスコットのうさぎ");
    mv.setAttribute("camera-controls","");
    mv.setAttribute("disable-zoom","");
    mv.setAttribute("shadow-intensity","0.7");
    mv.setAttribute("exposure","1.05");
    mv.setAttribute("environment-image","neutral");
    mv.setAttribute("camera-orbit","28deg 78deg auto");
    if(!reduceMotion){
      mv.setAttribute("auto-rotate","");
      mv.setAttribute("rotation-per-second","14deg");
    }
    mv.src=RABBIT_MODEL;
    c.appendChild(mv);
    var cap=el("span","cap");
    cap.textContent="マスコット（ドラッグで回せます）";
    c.appendChild(cap);
    return c;
  }

  /* ============================================================
     散乱配置
     ============================================================ */
  function layout(cards){
    var board=document.getElementById("board");
    board.innerHTML="";
    cards.forEach(function(c){ board.appendChild(c); });

    var W=board.clientWidth;
    var CW=250;
    var cols=Math.floor(W/(CW+22));

    if(cols<2){
      board.className="board stack";
      cards.forEach(function(c){
        c.style.transform="rotate("+rand(-1.6,1.6).toFixed(2)+"deg)";
        c.style.left=c.style.top=""; c.style.zIndex="";
      });
      board.style.height="";
      return;
    }

    board.className="board scatter";
    var colW=W/cols;
    cards.forEach(function(c,i){
      var col=i%cols, row=Math.floor(i/cols);
      var x=col*colW+rand(-14,Math.max(2,colW-CW+14));
      var y=row*196+rand(-12,30);
      x=Math.max(-10,Math.min(x,W-CW+10));
      y=Math.max(4,y);
      c.style.left=x.toFixed(0)+"px";
      c.style.top=y.toFixed(0)+"px";
      c.style.transform="rotate("+rand(-3.4,3.4).toFixed(2)+"deg)";
      c.style.zIndex=String(2+Math.floor(rand(0,18)));
    });
    fitBoard(board,cards);
    /* カードは画像デコードやフォント確定のあとで伸びる。
       個別に待ち合わせても取りこぼすので、寸法変化そのものを監視して追従する。 */
    observeCards(board,cards);
  }

  /* 絶対配置なので親の高さは自前で確保する（足りないと次のセクションに被る） */
  function fitBoard(board,cards){
    var bottom=0;
    cards.forEach(function(c){
      bottom=Math.max(bottom,parseFloat(c.style.top||0)+c.offsetHeight);
    });
    board.style.height=(bottom+40)+"px";
  }

  var boardRO=null;
  function observeCards(board,cards){
    if(boardRO){ boardRO.disconnect(); boardRO=null; }

    if(typeof ResizeObserver==="undefined"){
      [120,600,1600,4000].forEach(function(ms){
        setTimeout(function(){ fitBoard(board,cards); },ms);
      });
      return;
    }
    /* カードは絶対配置なので、親の高さを変えても子は動かない = ループしない */
    var queued=false;
    boardRO=new ResizeObserver(function(){
      if(queued) return;
      queued=true;
      requestAnimationFrame(function(){
        queued=false;
        fitBoard(board,cards);
      });
    });
    cards.forEach(function(c){ boardRO.observe(c); });
  }

  function buildCards(){
    var pool=shuffle(frags);
    var cards=[];
    /* 断片カード（半分くらいに生成画像を載せる） */
    pool.slice(0,6).forEach(function(f,i){ cards.push(cardText(f,i%2===0)); });
    /* ミーム: 収集物由来 2枚 + 語彙プール由来 2枚。語彙は重複させない */
    var tops=shuffle(MEME_TOP);
    cards.push(cardMeme(pool[0]));
    cards.push(cardMeme(pool[1]));
    cards.push(cardMeme(null,tops[0]));
    cards.push(cardMeme(null,tops[1]));
    /* 生成プリント */
    cards.push(cardPrint());
    cards.push(cardPrint());
    /* マスコット */
    cards.push(cardMascot());
    return shuffle(cards);
  }

  /* ============================================================
     刷り直し
     ============================================================ */
  function applyRun(){
    run=pick(RUNS);
    var s=document.documentElement.style;
    s.setProperty("--paper",run.paper);
    s.setProperty("--card",run.card);
    s.setProperty("--fg",run.fg);
    s.setProperty("--fg-soft",run.soft);
    s.setProperty("--ink1",run.ink1);
    s.setProperty("--ink2",run.ink2);
    s.setProperty("--stamp-blend",run.dark?"screen":"multiply");

    document.getElementById("sw1").style.background=run.ink1;
    document.getElementById("sw2").style.background=run.ink2;
    document.getElementById("inkName1").textContent=run.n1;
    document.getElementById("inkName2").textContent=run.n2;
    document.getElementById("paperName").textContent=run.pn;

    /* 版数は題字のゴム印と巻末の奥付、両方に出る */
    var no=String(Math.floor(rand(1,999999))).padStart(6,"0");
    document.getElementById("runNo").textContent=no;
    document.getElementById("runNo2").textContent=no;

    document.querySelector("h1").style.fontFamily =
      Math.random()<.75 ? "var(--f-cond)" : "var(--f-serif)";
  }

  function buildLog(){
    var ul=document.getElementById("log");
    ul.innerHTML="";
    shuffle(LOG).forEach(function(o){
      var li=el("li");
      var w=el("span","when"); w.textContent=o.when;
      var t=el("span"); t.textContent=o.text; t.style.fontFamily=pick(FONTS);
      li.appendChild(w); li.appendChild(t);
      ul.appendChild(li);
    });
  }

  function reprint(){
    applyRun();
    buildLog();
    layout(buildCards());
  }

  /* fragments.json → 失敗したらサンプル（収集ジョブが止まってもページは死なない）
     形は配列でも {generated_at, items} でも受ける。 */
  function loadFragments(){
    var f=document.getElementById("feed");
    return fetch("fragments.json",{cache:"no-store"})
      .then(function(r){ if(!r.ok) throw 0; return r.json(); })
      .then(function(j){
        var items=Array.isArray(j)?j:(j&&j.items);
        if(!Array.isArray(items)||!items.length) throw 0;
        f.textContent=items.length+"件"+
          (j.generated_at?"（"+shortTime(j.generated_at)+" 採取）":"");
        return items;
      })
      .catch(function(){
        f.textContent="サンプル（採取できず）";
        return SAMPLE;
      });
  }

  function shortTime(iso){
    var d=new Date(iso);
    if(isNaN(d)) return iso;
    var p=function(n){ return (n<10?"0":"")+n; };
    return (d.getMonth()+1)+"/"+d.getDate()+" "+p(d.getHours())+":"+p(d.getMinutes());
  }

  document.documentElement.style.setProperty("--grain","url("+makeGrain()+")");
  document.getElementById("reprint").addEventListener("click",reprint);

  var rt;
  window.addEventListener("resize",function(){
    clearTimeout(rt);
    rt=setTimeout(function(){ layout(Array.prototype.slice.call(document.querySelectorAll("#board .card"))); },180);
  });

  loadFragments().then(function(j){ frags=j; reprint(); });
})();
