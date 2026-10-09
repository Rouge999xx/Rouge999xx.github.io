/* Pip: procedural WebGL character, joint picking, and local autonomous behavior.
   No network, downloaded model, or AI service is required. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const home=$('ragdollHome'), overlay=$('ragdollOverlay'), canvas=$('ragdollCanvas');
  if (!home || !window.RagdollPhysics || !window.RagdollBrain) return;
  const handle=$('ragdollHandle'), bubble=$('ragdollBubble'), shadow=$('ragdollShadow');
  const pocket=$('ragdollPocket'), autoButton=$('ragdollAuto'), hideButton=$('ragdollHide');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let renderer;

  // An ellipsoid mesh is reused for the shell, visor, joints, and rounded limbs.
  // The orthographic camera maps simulation positions directly to screen pixels.
  function createRenderer() {
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
    if (!gl) throw new Error('WebGL unavailable');
    const vertex=`attribute vec3 position;
      uniform mat4 model; uniform vec2 viewport;
      varying vec3 normal; varying vec3 world;
      void main() {
        vec4 p=model*vec4(position,1.0); world=p.xyz;
        vec3 a=model[0].xyz, b=model[1].xyz, c=model[2].xyz;
        normal=normalize(a/dot(a,a)*position.x+b/dot(b,b)*position.y+c/dot(c,c)*position.z);
        gl_Position=vec4(p.x/viewport.x*2.0-1.0,1.0-p.y/viewport.y*2.0,-p.z/400.0,1.0);
      }`;
    const fragment=`precision mediump float;
      uniform vec3 color; varying vec3 normal; varying vec3 world;
      void main() {
        vec3 n=normalize(normal), light=normalize(vec3(-0.5,-0.8,1.2));
        float diffuse=max(0.0,dot(n,light));
        float rim=pow(1.0-max(0.0,n.z),3.0);
        float spec=pow(max(0.0,dot(n,normalize(light+vec3(0.0,0.0,1.0)))),32.0);
        gl_FragColor=vec4(color*(0.38+diffuse*0.62)+vec3(spec*0.26)+vec3(0.1,0.16,0.06)*rim,1.0);
      }`;
    function shader(type,source) {
      const s=gl.createShader(type); gl.shaderSource(s,source);gl.compileShader(s);
      if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    const program=gl.createProgram();
    const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Shader link failed');
    gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
    const vertices=[],indices=[],rings=16,segments=24;
    for (let r=0;r<=rings;r++) for (let s=0;s<=segments;s++) {
      const theta=r/rings*Math.PI,phi=s/segments*Math.PI*2;
      vertices.push(Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi));
    }
    for (let r=0;r<rings;r++) for (let s=0;s<segments;s++) {
      const a=r*(segments+1)+s,b=a+segments+1;
      indices.push(a,b,a+1,b,b+1,a+1);
    }
    const vb=gl.createBuffer(),ib=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    const attr=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,3,gl.FLOAT,false,0,0);
    const uniforms=Object.fromEntries(['model','viewport','color'].map(n=>[n,gl.getUniformLocation(program,n)]));
    gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
    function ellipsoid(center,size,color,axis=[0,1,0]) {
      const y=axis, ref=Math.abs(y[2])>.95?[1,0,0]:[0,0,1];
      let x=[y[1]*ref[2]-y[2]*ref[1],y[2]*ref[0]-y[0]*ref[2],y[0]*ref[1]-y[1]*ref[0]];
      const length=Math.hypot(...x);x=x.map(v=>v/length);
      const z=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
      gl.uniformMatrix4fv(uniforms.model,false,new Float32Array([
        ...x.map(v=>v*size[0]),0,...y.map(v=>v*size[1]),0,...z.map(v=>v*size[2]),0,...center,1
      ]));
      gl.uniform3fv(uniforms.color,color);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    }
    function limb(a,b,r,color) {
      const d=b.map((v,i)=>v-a[i]),length=Math.hypot(...d)||1;
      ellipsoid(a.map((v,i)=>(v+b[i])/2),[r,length/2+r*.35,r],color,d.map(v=>v/length));
    }
    return {
      resize(w,h) {
        const dpr=Math.min(devicePixelRatio||1,1.75);
        canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
        gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(uniforms.viewport,w,h);
      },
      clear() {gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);},
      draw(points,scale,time) {
        this.clear();
        const p=points.map(p=>p.pos),ivory=[.86,.88,.79],lime=[.65,.93,.27],dark=[.055,.07,.08],joint=[.16,.19,.17];
        const avg=(a,b)=>a.map((v,i)=>(v+b[i])/2);
        const torso=avg(p[1],p[8]),axis=p[8].map((v,i)=>v-p[1][i]);
        const len=Math.hypot(...axis)||1;
        ellipsoid(torso,[24*scale,len*.53,15*scale],ivory,axis.map(v=>v/len));
        ellipsoid(p[8],[21*scale,15*scale,13*scale],dark);
        for (const [a,b,r,c] of [[2,4,8,ivory],[4,6,7,lime],[3,5,8,ivory],[5,7,7,lime],
          [9,11,10,ivory],[11,13,8,ivory],[10,12,10,ivory],[12,14,8,ivory]]) limb(p[a],p[b],r*scale,c);
        [2,3,4,5,9,10,11,12].forEach(i=>ellipsoid(p[i],[7*scale,7*scale,7*scale],joint));
        [6,7].forEach(i=>ellipsoid(p[i],[8*scale,10*scale,7*scale],lime));
        [13,14].forEach(i=>ellipsoid([p[i][0],p[i][1]-2*scale,p[i][2]+4*scale],[11*scale,6*scale,16*scale],dark));
        limb(p[0],p[1],7*scale,joint);
        ellipsoid(p[0],[22*scale,24*scale,21*scale],ivory);
        // Helmet visor, two luminous eyes, and a small chest badge.
        const headAxis=p[0].map((v,i)=>v-p[1][i]);
        const headLength=Math.hypot(...headAxis)||1;
        const up=headAxis.map(v=>v/headLength),right=[-up[1],up[0],0];
        const face=p[0].map((v,i)=>v+(i===2?18*scale:0));
        ellipsoid(face,[18*scale,12*scale,7*scale],dark,up);
        const blink=Math.sin(time*.7)> .997 ? .15 : 1;
        [-1,1].forEach(side=>ellipsoid(face.map((v,i)=>v+right[i]*side*7*scale+(i===2?6*scale:0)),[3*scale,4*scale*blink,2*scale],lime,up));
        ellipsoid([torso[0],torso[1]-8*scale,torso[2]+15*scale],[5*scale,5*scale,2*scale],lime);
      }
    };
  }

  function unavailable() {
    overlay.hidden=true;$('ragdollFallback').hidden=false;
    $('ragdollTitle').textContent='Pip is offline.';
    $('ragdollDescription').textContent='This browser could not start the 3D playground. You can still explore the rest of the portfolio.';
    document.querySelectorAll('[data-pip-action], #ragdollAuto, #ragdollReset, #ragdollHide').forEach(b=>b.disabled=true);
  }
  try {renderer=createRenderer();} catch (error) {console.warn('Pip:',error);unavailable();return;}

  let width=innerWidth,height=innerHeight,scale=innerWidth<600?.9:1.22;
  let dock=home.getBoundingClientRect(),floor=dock.top+dock.height*.74;
  let x=dock.left+dock.width*.5,homeX=x,free=false,hidden=false,auto=true;
  let action='idle',actionUntil=0,targetX=x,direction=1,time=0;
  let recoveryUntil=0,grab=null,pointer={x:width*.5,y:height*.5},lastTap=0;
  let pointerId=null,pointerStart=null,pointerLast=null,lastFrame=0,accumulator=0,frame=0;
  let bubbleUntil=0,visible=false,dockDirty=true;
  const body=new RagdollPhysics(x,floor,scale);
  const brain=new RagdollBrain(performance.now());
  let adventure=null,idleTimer=0,pageBusyUntil=0,lastTargetScan=0,adventureRect=null;
  const pageRules=[
    {selector:'.project-card',kind:'perch',label:el=>`${el.querySelector('h3')?.textContent||'this project'}`},
    {selector:'.filter-button',kind:'tap',label:el=>`${el.textContent.replace(/\d/g,'').trim()} projects`},
    {selector:'.stack-button',kind:'tap',label:el=>`${el.textContent.replace(/\d/g,'').trim()}`},
    {selector:'[data-flow-view]',kind:'tap',label:el=>`Flow Auto ${el.textContent.trim()}`},
    {selector:'.floating-card, .image-tag, .skill-cloud span, .about-facts > div, .principle, .hero-cta, .core-live',kind:'poke',label:el=>
      el.matches('.core-live')?'my little status light':el.matches('.floating-card')?'this floating badge':el.matches('.hero-cta')?'this button':el.textContent.trim().slice(0,36)},
    {selector:'.ragdoll-platform',kind:'perch',label:()=> 'home base'}
  ];
  const descriptions={
    idle:['Hello, human.','Leave him for five seconds and he’ll find his own adventure. Grab him or give him a command whenever you want to join in.'],
    adventure:['Ooh, what’s this?','Pip is playing with the page. He can perch on cards, poke badges, and try the project filters and stack tabs.'],
    walk:['Off I go.','Pip is exploring on his own. Pick him up at any time.'],
    wave:['Hello there!','A little wave, just for you. Double tap Pip whenever you want to say hello.'],
    dance:['Got a beat?','A few questionable dance moves. He seems pretty pleased with them.'],
    sit:['Taking five.','Even a little ragdoll needs a break. Grab him or choose another action to get him up.'],
    follow:['Coming with you.','Move your pointer or tap an open space and Pip will follow along the bottom of the page. Tap Follow me again to stop.'],
    tumble:['Whoa, gravity.','Loose limbs, a little bounce, then back on his feet. Give him a moment.'],
    held:['You have me!','His joints are loose while you hold him. Move and release to toss him into the page.'],
    recover:['I’m okay!','Pip is finding his feet. He can get back up on his own.' ]
  };
  function say(message,seconds=2.5,announce=false) {
    bubble.textContent=message;bubbleUntil=time+seconds;
    if (announce) $('ragdollStatus').textContent=message;
  }
  function readout(name) {
    const [title,description]=descriptions[name]||descriptions.idle;
    $('ragdollTitle').textContent=title;$('ragdollDescription').textContent=description;
    document.querySelectorAll('#coreViewGrid [data-pip-action]').forEach(b=>{
      const active=b.dataset.pipAction===action;
      b.classList.toggle('is-active',active);
      if(b.dataset.pipAction==='follow')b.setAttribute('aria-pressed',String(active));
    });
    $('ragdollLocation').textContent=free?'OUT EXPLORING':'AT HOME';
    $('ragdollHomeHint').textContent=free?'His spot is here when he needs it.':'Go on. Pick him up.';
  }
  function setAction(name,duration=4) {
    action=name;actionUntil=time+duration;readout(name);
  }
  function syncAuto() {
    autoButton.classList.toggle('is-active',auto);autoButton.setAttribute('aria-pressed',String(auto));
    autoButton.querySelector('span').textContent=auto?'AUTONOMY ON':'AUTONOMY OFF';
    $('ragdollPocketAuto').textContent=auto?'Pause':'Resume';
    $('ragdollPocketAuto').setAttribute('aria-pressed',String(auto));
  }
  function scheduleIdle() {
    clearTimeout(idleTimer);
    if(auto&&!hidden&&!document.hidden&&!document.body.classList.contains('is-locked')) {
      idleTimer=setTimeout(wake,Math.max(1,brain.nextDecision-performance.now()+1));
    }
  }
  function clearAdventure() {
    if(adventure) {
      adventure.target.el.classList.remove('pip-is-playing','pip-is-perched','pip-is-poked');
      adventure.target.el.removeAttribute('data-pip-visitor');
      adventure=null;adventureRect=null;
      if(free)floor=height-24;
    }
  }
  function interact() {
    const wasPlaying=!!adventure;
    clearAdventure();brain.interact(performance.now());
    if(wasPlaying) {x=clamp(body.points[8].pos[0],60*scale,width-60*scale);targetX=x;setAction('idle');}
    scheduleIdle();
  }
  function setAutonomy() {
    interact();auto=!auto;syncAuto();
    if(!auto && ['walk','follow'].includes(action))setAction('idle');
    say(auto?'Five seconds, then adventure.':'I’ll wait for you.',2,true);scheduleIdle();wake();
  }
  function availableTarget(el,rect,allowActive=false) {
    if(!el.isConnected || el.closest('[hidden], .is-filtered-out, .modal-backdrop, .command-backdrop'))return false;
    if(rect.width<8||rect.height<8||rect.bottom<112||rect.top>height-100||rect.right<20||rect.left>width-20)return false;
    const style=getComputedStyle(el);
    if(style.visibility==='hidden'||style.display==='none'||Number(style.opacity)<.1)return false;
    const focus=document.activeElement;
    if(el.contains(focus)||el.matches(':hover')||el.closest('form'))return false;
    if(el.matches(':disabled')||(!allowActive&&el.matches('.is-active')))return false;
    return true;
  }
  function findPlaythings() {
    const targets=[];
    for(const rule of pageRules) document.querySelectorAll(rule.selector).forEach((el,index)=>{
      const rect=el.getBoundingClientRect();
      if(!availableTarget(el,rect))return;
      // Leave controls alone while a visitor is working in that section.
      if(rule.kind==='tap' && performance.now()<pageBusyUntil)return;
      targets.push({id:`${rule.selector}:${index}`,el,kind:rule.kind,label:rule.label(el)});
    });
    return targets;
  }
  function destination(target,rect) {
    const perch=target.kind==='perch'&&rect.top>205*scale&&rect.width>90;
    const tx=clamp(rect.left+rect.width*(perch?.7:.5),55*scale,width-55*scale);
    return {x:perch?tx:clamp(tx-40*scale,55*scale,width-55*scale),
      floor:clamp(perch?rect.top+5:rect.top+Math.min(rect.height*.5,70)+130*scale,205*scale,height-24),
      touch:[tx,clamp(rect.top+Math.min(rect.height*.5,70),112,height-60),20*scale],perch};
  }
  function startAdventure(now) {
    const target=brain.choose(findPlaythings(),now);
    if(!target) {
      if(!free)leaveHome();
      targetX=clamp(x+(Math.random()<.5?-140:140),60*scale,width-60*scale);
      setAction(Math.abs(targetX-x)>10?'walk':'wave',4);say('I’m going exploring.',2);return;
    }
    const wasVisible=free||(dock.bottom>100&&dock.top<height);
    if(!free)leaveHome();
    if(!wasVisible) {x=clamp(width-90*scale,60*scale,width-60*scale);floor=height-24;body.reset(x,floor);}
    const rect=target.el.getBoundingClientRect(),to=destination(target,rect);
    adventure={target,phase:'approach',from:{x,floor},to,started:now/1000,startScroll:scrollY,
      duration:clamp(Math.hypot(to.x-x,to.floor-floor)/240,1.1,2.8),activated:false};
    adventureRect=rect;lastTargetScan=now;
    setAction('adventure',Infinity);say(`Let me look at ${target.label}.`,3);
    target.el.setAttribute('data-pip-visitor','approaching');
  }
  function finishAdventure() {
    clearAdventure();targetX=x;setAction('idle',2);brain.rest(performance.now(),1800);scheduleIdle();
  }
  function advanceAdventure(now) {
    const visit=adventure;if(!visit)return false;
    if(now-lastTargetScan>100) {adventureRect=visit.target.el.getBoundingClientRect();lastTargetScan=now;}
    if(!availableTarget(visit.target.el,adventureRect,true) || (visit.target.kind==='tap'&&now<pageBusyUntil)) {
      finishAdventure();return false;
    }
    visit.to=destination(visit.target,adventureRect);
    const elapsed=now/1000-visit.started;
    if(visit.phase==='approach') {
      const progress=clamp(elapsed/visit.duration,0,1),ease=progress*progress*(3-2*progress);
      x=visit.from.x+(visit.to.x-visit.from.x)*ease;
      floor=visit.from.floor+(visit.to.floor-visit.from.floor)*ease-Math.sin(progress*Math.PI)*(motion.matches?15:60)*scale;
      const pose=RagdollPhysics.pose(x,floor,scale,time,'walk',Math.sign(visit.to.x-visit.from.x)||1);
      body.step({floor:height-24,width,pose,strength:.2});
      if(progress===1) {
        visit.phase='play';visit.started=now/1000;
        visit.target.el.classList.add('pip-is-playing');
        visit.target.el.setAttribute('data-pip-visitor','playing');
        say(visit.to.perch?`Best seat for ${visit.target.label}.`:`Boop! ${visit.target.label}.`,3.5);
      }
    } else {
      x=visit.to.x;floor=visit.to.floor;
      const pose=RagdollPhysics.pose(x,floor,scale,time,visit.to.perch?'sit':'wave',1);
      if(!visit.to.perch) {
        pose[5]=[visit.to.touch[0]-16*scale,visit.to.touch[1]+30*scale,10*scale];
        pose[7]=[...visit.to.touch];
      }
      body.step({floor:visit.to.perch?floor:height-24,width,pose,strength:.18});
      visit.target.el.classList.add(visit.to.perch?'pip-is-perched':'pip-is-poked');
      const hand=body.points[7].pos;
      const withinReach=Math.hypot(hand[0]-visit.to.touch[0],hand[1]-visit.to.touch[1])<32*scale;
      if(!visit.activated && elapsed>.65 && (visit.to.perch || withinReach)) {
        visit.activated=true;
        dispatchEvent(new CustomEvent('pip-play',{detail:{x:visit.to.touch[0],y:visit.to.perch?floor:visit.to.touch[1]}}));
        // Only these local presentation controls may be activated. Never navigate,
        // copy data, open a dialog, submit a form, or change the visitor's theme.
        if(visit.target.kind==='tap' && visit.target.el.matches('.filter-button, .stack-button, [data-flow-view]') &&
          !visit.target.el.matches(':hover, :disabled') && now>=pageBusyUntil) {
          visit.target.el.click();
          visit.target.el.setAttribute('data-pip-visitor','tapped');
          say(`I tried ${visit.target.label}!`,3);
        }
      }
      if(elapsed>(visit.to.perch?8:4.2))finishAdventure();
    }
    return true;
  }
  function leaveHome() {
    if(free)return;
    free=true;floor=height-24;
    x=clamp(body.points[8].pos[0],60*scale,width-60*scale);targetX=x;
    pocket.hidden=false;readout(action);
  }
  function cancelGrab() {
    const id=pointerId;pointerId=null;grab=null;handle.classList.remove('is-dragging');
    if(id!==null&&handle.hasPointerCapture(id))handle.releasePointerCapture(id);
  }
  function resetHome() {
    interact();
    cancelGrab();free=false;hidden=false;hideButton.textContent='HIDE PIP';hideButton.setAttribute('aria-pressed','false');
    dock=home.getBoundingClientRect();homeX=dock.left+dock.width*.5;x=homeX;
    floor=dock.top+dock.height*.74;body.reset(x,floor);targetX=x;recoveryUntil=0;
    pocket.hidden=true;setAction('idle',2);say('Home sweet home.',2,true);wake();
  }
  function toggleHidden() {
    interact();
    cancelGrab();hidden=!hidden;hideButton.textContent=hidden?'SHOW PIP':'HIDE PIP';
    hideButton.setAttribute('aria-pressed',String(hidden));
    $('ragdollStatus').textContent=hidden?'Pip is hidden. Use Show Pip in the 3D playground to bring him back.':'Pip is back.';
    if(hidden) {overlay.hidden=true;cancelAnimationFrame(frame);frame=0;clearTimeout(idleTimer);} else {scheduleIdle();wake();}
  }
  function perform(name) {
    if(name==='autonomy'){setAutonomy();return;}
    if(name==='home'){resetHome();return;}
    if(name==='hide'){toggleHidden();return;}
    interact();
    if(hidden)toggleHidden();
    cancelGrab();recoveryUntil=0;
    if(name==='explore') {
      leaveHome();body.reset(clamp(x,70,width-70),floor);setAction('walk',6);targetX=clamp(x+(x<width/2?160:-160),70,width-70);
      say('Adventure time!',2,true);
    } else if(name==='follow') {
      if(action==='follow'){setAction('idle');say('I’ll stay here.',2,true);}
      else {leaveHome();body.reset(clamp(x,70,width-70),floor);setAction('follow',Infinity);say('Lead the way.',2,true);}
    } else if(name==='jump') {
      body.impulse(direction*2,-10*scale,3);recoveryUntil=time+1.3;setAction('tumble',1.3);say('Wheee!',2,true);
    } else {setAction(name,name==='sit'?10:5);say(name==='wave'?'Hey, you!':name==='dance'?'Watch these moves.':'Just a little rest.',2.5,true);}
    wake();
  }
  document.querySelectorAll('[data-pip-action]').forEach(b=>b.addEventListener('click',()=>perform(b.dataset.pipAction)));
  $('ragdollReset').addEventListener('click',resetHome);hideButton.addEventListener('click',toggleHidden);
  autoButton.addEventListener('click',setAutonomy);
  // The only input surface is the character's small bounding box, not the canvas.
  handle.addEventListener('pointerdown',event=>{
    if(pointerId!==null || (event.pointerType==='mouse'&&event.button!==0))return;
    interact();
    event.preventDefault();pointerId=event.pointerId;
    handle.setPointerCapture(pointerId);handle.focus({preventScroll:true});
    pointerStart={x:event.clientX,y:event.clientY};pointerLast={...pointerStart,time:performance.now()};
    let index=0,best=Infinity;
    body.points.forEach((p,i)=>{const d=Math.hypot(p.pos[0]-event.clientX,p.pos[1]-event.clientY);if(d<best){best=d;index=i;}});
    grab={index,target:[event.clientX,event.clientY,body.points[index].pos[2]],offset:[body.points[index].pos[0]-event.clientX,body.points[index].pos[1]-event.clientY],vx:0,vy:0};
    grab.target[0]+=grab.offset[0];grab.target[1]+=grab.offset[1];
    handle.classList.add('is-dragging');readout('held');say('Oh! We’re doing this.',2);wake();
  });
  handle.addEventListener('pointermove',event=>{
    if(pointerId===null) {brain.interact(performance.now());scheduleIdle();return;}
    if(event.pointerId!==pointerId || !grab)return;
    brain.interact(performance.now());scheduleIdle();
    const now=performance.now(),dt=Math.max(8,now-pointerLast.time);
    grab.vx=clamp((event.clientX-pointerLast.x)/dt*16.67,-16,16);
    grab.vy=clamp((event.clientY-pointerLast.y)/dt*16.67,-16,16);
    grab.target=[clamp(event.clientX+grab.offset[0],24,width-24),clamp(event.clientY+grab.offset[1],26,height-12),grab.target[2]];
    pointerLast={x:event.clientX,y:event.clientY,time:now};
    if(!free && (event.clientX<dock.left || event.clientX>dock.right || event.clientY<dock.top || event.clientY>dock.bottom))leaveHome();
  });
  function release(event,cancelled=false) {
    if(event.pointerId!==pointerId || !grab)return;
    const moved=Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>7;
    const vx=grab.vx,vy=grab.vy,fresh=performance.now()-pointerLast.time<100;
    brain.interact(performance.now());scheduleIdle();
    cancelGrab();
    if(!cancelled && !moved) {
      if(time-lastTap<.4)perform('wave');
      else {setAction('wave',2);say('Hi! Grab and drag me.',2);}
      lastTap=time;
    } else {
      // A moved pickup always frees Pip, even when released within his home.
      if(moved)leaveHome();
      if(!cancelled && fresh)body.impulse(vx*.6,vy*.6);
      recoveryUntil=time+(motion.matches?.45:1.8);setAction('tumble',2);say(cancelled?'Back on my feet.':'Nice landing. Probably.',2);
    }
  }
  handle.addEventListener('pointerup',e=>release(e));
  handle.addEventListener('pointercancel',e=>release(e,true));
  handle.addEventListener('lostpointercapture',e=>{if(pointerId===e.pointerId)release(e,true);});
  addEventListener('blur',()=>{if(grab){cancelGrab();recoveryUntil=time+1;setAction('tumble',1);}});
  addEventListener('pointermove',event=>{pointer={x:event.clientX,y:event.clientY};},{passive:true});
  addEventListener('pointerdown',event=>{
    if(event.isTrusted && event.target.closest('.project-toolbar, .stack-layout, [data-flow-preview]')) {
      pageBusyUntil=performance.now()+5000;
      if(adventure?.target.kind==='tap')finishAdventure();
    }
    if(action==='follow' && !event.target.closest('button,a,input,textarea,select'))pointer={x:event.clientX,y:event.clientY};
  },{passive:true});
  addEventListener('keydown',event=>{
    if(event.isTrusted && event.target.closest('.project-toolbar, .stack-layout, [data-flow-preview]')) {
      pageBusyUntil=performance.now()+5000;
      if(adventure?.target.kind==='tap')finishAdventure();
    }
  });
  handle.addEventListener('keydown',event=>{
    const key=event.key.toLowerCase();
    if(!['arrowleft','arrowright','arrowup','arrowdown',' ','w','d','h','escape'].includes(key))return;
    interact();
    event.preventDefault();
    if(key==='h'||key==='escape'){resetHome();$('ragdollReset').focus({preventScroll:true});return;}
    if(key===' '){perform('jump');return;}
    if(key==='w'||key==='d'){perform(key==='w'?'wave':'dance');return;}
    leaveHome();
    if(key==='arrowup')perform('jump');
    else if(key==='arrowdown')perform('sit');
    else {direction=key==='arrowleft'?-1:1;targetX=clamp(x+direction*65,60,width-60);setAction('walk',2);wake();}
  });

  function simulate() {
    time+=1/60;
    const now=performance.now();
    if(document.body.classList.contains('is-locked'))return;
    if(!free) {
      const newFloor=dock.top+dock.height*.74,newX=dock.left+dock.width*.5;
      if(newFloor!==floor || newX!==homeX) {body.translate(newX-homeX,newFloor-floor);x+=newX-homeX;targetX+=newX-homeX;homeX=newX;floor=newFloor;}
    } else floor=height-24;
    if(grab) {
      body.step({floor:free?height-12:Math.max(floor,grab.target[1]+60*scale),width,grab});return;
    }
    if(recoveryUntil>time) {
      body.step({floor,width});x=clamp(body.points[8].pos[0],55*scale,width-55*scale);return;
    }
    if(brain.ready(now,{enabled:auto,held:!!grab,hidden,locked:document.body.classList.contains('is-locked'),busy:!!adventure})) {
      startAdventure(now);
    }
    if(advanceAdventure(now))return;
    if(action==='tumble') {x=clamp(body.points[8].pos[0],55*scale,width-55*scale);targetX=x;setAction('recover',1);say('I’m okay!',2);}
    if(action==='recover' && time>actionUntil)setAction('idle',2);
    if(action==='follow')targetX=clamp(pointer.x,60*scale,width-60*scale);
    if((action==='walk'||action==='follow') && Math.abs(targetX-x)>3) {
      direction=Math.sign(targetX-x);x+=direction*Math.min(Math.abs(targetX-x),motion.matches?1.2:1.5);
    }
    const moving=['walk','follow'].includes(action) && Math.abs(targetX-x)>3;
    if(action==='walk' && !moving)setAction('idle',2);
    if(time>actionUntil && action!=='follow')setAction('idle',2);
    const pose=RagdollPhysics.pose(x,floor,scale,motion.matches?0:time,moving?action:action==='follow'?'idle':action,direction);
    body.step({floor,width,pose,strength:action==='recover'?.04:.15});
  }
  function draw() {
    const locked=document.body.classList.contains('is-locked');
    visible=!hidden&&!locked&&(free || (dock.bottom>80 && dock.top<height));
    overlay.hidden=!visible;
    overlay.dataset.pipState=hidden?'hidden':!auto?'paused':grab?'held':adventure?'playing':
      performance.now()-brain.lastInteraction<5000?'waiting':'autonomous';
    overlay.dataset.pipTarget=adventure?.target.label||'';
    if(!visible) {renderer.clear();return;}
    renderer.draw(body.points,scale,time);
    // Keep the quick controls away from Pip's feet as he crosses the screen.
    pocket.style.right=x<width/2?'16px':'auto';
    pocket.style.left=x<width/2?'auto':'16px';
    const minX=Math.min(...body.points.map(p=>p.pos[0]))-24*scale,maxX=Math.max(...body.points.map(p=>p.pos[0]))+24*scale;
    const minY=Math.min(...body.points.map(p=>p.pos[1]))-28*scale,maxY=Math.max(...body.points.map(p=>p.pos[1]))+12*scale;
    Object.assign(handle.style,{left:`${minX}px`,top:`${minY}px`,width:`${maxX-minX}px`,height:`${maxY-minY}px`});
    const head=body.points[0].pos;
    bubble.classList.toggle('is-visible',time<bubbleUntil);
    bubble.style.left=`${clamp(head[0]+30*scale,8,Math.max(8,width-bubble.offsetWidth-8))}px`;
    bubble.style.top=`${clamp(head[1]-60*scale,80,height-50)}px`;
    shadow.style.left=`${clamp(body.points[8].pos[0]-39,0,width-78)}px`;shadow.style.top=`${floor-8}px`;
    shadow.style.opacity=String(clamp(1-Math.abs(floor-body.points[8].pos[1]-78*scale)/220,.12,1));
  }
  function animate(now) {
    frame=0;if(hidden||document.hidden)return;
    if(dockDirty){dock=home.getBoundingClientRect();dockDirty=false;}
    // Sleep while docked offscreen. Scroll/resize observers wake the playground.
    if(!free && (dock.bottom<0||dock.top>height) && !brain.ready(now,{enabled:auto,hidden,locked:document.body.classList.contains('is-locked')})) {
      overlay.hidden=true;lastFrame=0;scheduleIdle();return;
    }
    const dt=lastFrame?Math.min(.05,(now-lastFrame)/1000):1/60;lastFrame=now;accumulator+=dt;
    while(accumulator>=1/60){simulate();accumulator-=1/60;}
    draw();frame=requestAnimationFrame(animate);
  }
  function wake() {if(!frame&&!hidden&&!document.hidden){lastFrame=0;frame=requestAnimationFrame(animate);}}
  function resize() {
    width=innerWidth;height=innerHeight;renderer.resize(width,height);dockDirty=true;
    // Keep existing joint lengths during resize, and clamp the whole character to the screen.
    const nextX=clamp(x,60*scale,Math.max(60*scale,width-60*scale));
    if(free){body.translate(nextX-x,0);x=nextX;targetX=clamp(targetX,60*scale,width-60*scale);}
    wake();
  }
  addEventListener('resize',resize,{passive:true});
  addEventListener('scroll',()=>{
    dockDirty=true;
    // Browser scroll anchoring can adjust a few pixels when the readout or a
    // filter changes. Keep the visit; cancel when the visitor scrolls away.
    if(adventure && Math.abs(scrollY-adventure.startScroll)>60){finishAdventure();body.impulse(0,-2);}
    wake();
  },{passive:true});
  new ResizeObserver(()=>{dockDirty=true;wake();}).observe(home);
  new IntersectionObserver(()=>{dockDirty=true;wake();}).observe(home);
  // Existing reveal animations change the dock's screen position as it comes into view.
  home.closest('.core-lab').addEventListener('transitionend',()=>{dockDirty=true;wake();});
  document.addEventListener('visibilitychange',()=>{
    cancelGrab();clearAdventure();
    if(document.hidden){cancelAnimationFrame(frame);frame=0;clearTimeout(idleTimer);}
    else {brain.interact(performance.now());scheduleIdle();wake();}
  });
  motion.addEventListener('change',wake);
  new MutationObserver(()=>{
    if(document.body.classList.contains('is-locked')) {if(adventure)finishAdventure();cancelGrab();clearTimeout(idleTimer);}
    else {scheduleIdle();wake();}
  }).observe(document.body,{attributes:true,attributeFilter:['class']});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);frame=0;overlay.hidden=true;});
  canvas.addEventListener('webglcontextrestored',()=>{try{renderer=createRenderer();resize();wake();}catch{unavailable();}});
  syncAuto();resize();readout('idle');say('Five seconds. Then I explore.',4);scheduleIdle();wake();
})();
