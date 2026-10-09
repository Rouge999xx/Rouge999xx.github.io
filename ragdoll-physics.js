/* Small position-based 3D ragdoll. Simulation uses CSS pixels and a fixed 60 Hz step. */
(function (root) {
  'use strict';
  const rest = [
    [0, -164, 0], [0, -137, 0], [-23, -128, 0], [23, -128, 0],
    [-35, -96, 0], [35, -96, 0], [-40, -68, 0], [40, -68, 0],
    [0, -78, 0], [-14, -74, 0], [14, -74, 0],
    [-17, -38, 0], [17, -38, 0], [-19, -5, 5], [19, -5, 5]
  ];
  const bones = [[0,1],[1,2],[1,3],[2,3],[2,8],[3,8],[1,8],
    [2,4],[4,6],[3,5],[5,7],[8,9],[8,10],[9,10],
    [9,11],[11,13],[10,12],[12,14],[2,9],[3,10]];
  const distance = (a,b) => Math.hypot(...a.map((v,i) => v-b[i]));
  class RagdollPhysics {
    constructor(x, floor, scale = 1) {
      this.scale = scale;
      this.links = bones.map(([a,b]) => ({a,b,length:distance(rest[a],rest[b])*scale}));
      this.reset(x,floor);
    }
    reset(x, floor) {
      this.points = rest.map(p => {
        const pos = [x+p[0]*this.scale, floor+p[1]*this.scale, p[2]*this.scale];
        return {pos, prev:[...pos]};
      });
    }
    translate(dx,dy,dz = 0) {
      for (const p of this.points) for (const key of ['pos','prev']) {
        p[key][0]+=dx; p[key][1]+=dy; p[key][2]+=dz;
      }
    }
    impulse(dx,dy,dz = 0) {
      for (const p of this.points) {
        p.prev[0]-=dx; p.prev[1]-=dy; p.prev[2]-=dz;
      }
    }
    step({floor, width, pose = null, strength = 0, grab = null}) {
      for (let i=0; i<this.points.length; i++) {
        const p = this.points[i];
        const velocity = p.pos.map((v,j) => (v-p.prev[j])*.975);
        p.prev = [...p.pos];
        p.pos = p.pos.map((v,j) => v+Math.max(-35,Math.min(35,velocity[j])));
        p.pos[1] += .46*this.scale;
        if (pose) for (let j=0;j<3;j++) p.pos[j]+=(pose[i][j]-p.pos[j])*strength;
      }
      // Iterative length constraints keep the body attached while allowing the limbs to flop.
      for (let iteration=0;iteration<12;iteration++) {
        for (const {a,b,length} of this.links) {
          const pa=this.points[a].pos, pb=this.points[b].pos;
          const delta=pb.map((v,j) => v-pa[j]);
          const d=Math.hypot(...delta)||.0001;
          const correction=(d-length)/d*.5;
          for (let j=0;j<3;j++) {pa[j]+=delta[j]*correction;pb[j]-=delta[j]*correction;}
        }
        if (grab) this.points[grab.index].pos = [...grab.target];
        for (let i=0;i<this.points.length;i++) {
          const p=this.points[i];
          const radius=(i===0?19:i>=13?5:6)*this.scale;
          if (p.pos[1]>floor-radius) {
            p.pos[1]=floor-radius;
            // Floor friction and a small bounce; previous positions encode velocity.
            const impact=p.pos[1]-p.prev[1];
            p.prev[1]=p.pos[1]+Math.max(0,impact)*.12;
            p.prev[0]+=(p.pos[0]-p.prev[0])*.3;
          }
          p.pos[0]=Math.max(radius,Math.min(width-radius,p.pos[0]));
          p.pos[1]=Math.max(radius,p.pos[1]);
          p.pos[2]=Math.max(-65,Math.min(65,p.pos[2]));
        }
      }
    }
    static pose(x,floor,scale,time,action='idle',direction=1) {
      const pose=rest.map(p=>[x+p[0]*scale,floor+p[1]*scale,p[2]*scale]);
      const move=(i,dx,dy,dz=0)=>{pose[i][0]+=dx*scale;pose[i][1]+=dy*scale;pose[i][2]+=dz*scale;};
      if (action==='walk' || action==='follow') {
        const stride=Math.sin(time*8);
        [11,13].forEach(i=>move(i,stride*15,Math.min(0,stride)*7,stride*10));
        [12,14].forEach(i=>move(i,-stride*15,Math.min(0,-stride)*7,-stride*10));
        [4,6].forEach(i=>move(i,-stride*10,0,-stride*12));
        [5,7].forEach(i=>move(i,stride*10,0,stride*12));
        pose.forEach(p=>p[1]-=Math.abs(stride)*3*scale);
      } else if (action==='wave') {
        move(5,12,-42,12);move(7,10+Math.sin(time*10)*12,-91,18);
        move(0,Math.sin(time*3)*3,0);
      } else if (action==='dance') {
        pose.forEach(p=>p[0]+=Math.sin(time*5)*10*scale);
        move(4,-12,-22,Math.sin(time*6)*16);move(6,-8,-45,20);
        move(5,12,-22,-Math.sin(time*6)*16);move(7,8,-45,20);
        move(11,-7,Math.sin(time*6)*5);move(12,7,-Math.sin(time*6)*5);
        pose.forEach(p=>p[1]-=(Math.sin(time*10)+1)*4*scale);
      } else if (action==='sit') {
        for (let i=0;i<=10;i++) move(i,0,52);
        move(11,-20,23,18);move(12,20,23,18);
        move(13,-28,0,28);move(14,28,0,28);
        move(6,12,37,20);move(7,-12,37,20);
      } else {
        const breath=Math.sin(time*2)*1.5;
        for (let i=0;i<8;i++) move(i,0,breath);
        move(0,Math.sin(time*.8)*3,0,3);
      }
      // A slight turn exposes the depth of the shoulders and limbs.
      const angle=direction*.19;
      pose.forEach(p=>{
        const dx=p[0]-x,z=p[2];
        p[0]=x+dx*Math.cos(angle)+z*Math.sin(angle);
        p[2]=z*Math.cos(angle)-dx*Math.sin(angle);
      });
      return pose;
    }
  }
  if (typeof module!=='undefined' && module.exports) module.exports=RagdollPhysics;
  else root.RagdollPhysics=RagdollPhysics;
})(typeof window!=='undefined'?window:globalThis);
