// Lightweight, scroll-driven 5UCW stencil. Geometry is also used for the SVG fallback.
import { makeGeometry, scene, PROTEIN_OPACITY, IRON_COLORS, type Paint } from './protein-geometry.js?v=cartoon-1';
async function mount(figure: HTMLElement): Promise<void> {
  const canvas=figure.querySelector<HTMLCanvasElement>('canvas')!;
  const context=canvas.getContext('2d');
  // Composite all cartoon surfaces once to avoid dark, busy transparency overlaps.
  const proteinCanvas=document.createElement('canvas');
  const proteinContext=proteinCanvas.getContext('2d');
  if(!context||!proteinContext) return;
  try {
    const response=await fetch('/assets/protein/5ucw.json');
    if(!response.ok) throw new Error('Structure unavailable');
    const model=makeGeometry(await response.json());
    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
    let width=1,height=1,density=1,current=0,target=0,frame=0,last=0;
    const progress=()=>Math.max(0,Math.min(1,scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)));
    function paint(ctx: CanvasRenderingContext2D, parts: Paint[]): void {
      ctx.lineCap='round';ctx.lineJoin='round';
      for(const part of parts) {
        ctx.beginPath();ctx.moveTo(part.points[0][0],part.points[0][1]);
        for(let i=1;i<part.points.length;i++) ctx.lineTo(part.points[i][0],part.points[i][1]);
        if(part.filled) {
          ctx.closePath();ctx.fillStyle=part.color;ctx.fill();
        }
        // Same-color hairline on filled faces only closes anti-aliasing seams.
        ctx.strokeStyle=part.color;ctx.lineWidth=part.width;ctx.stroke();
      }
    }
    function draw(): void {
      context!.setTransform(density,0,0,density,0,0);context!.clearRect(0,0,width,height);
      proteinContext!.setTransform(density,0,0,density,0,0);proteinContext!.clearRect(0,0,width,height);
      const frame=scene(model,width,height,current);
      paint(proteinContext!,frame.protein);
      context!.globalAlpha=PROTEIN_OPACITY;
      context!.drawImage(proteinCanvas,0,0,width,height);
      context!.globalAlpha=1;
      paint(context!,frame.heme);
      const [x,y]=frame.iron.center,r=frame.iron.radius;
      const highlight=context!.createRadialGradient(x-r*.3,y-r*.35,r*.08,x,y,r);
      highlight.addColorStop(0,IRON_COLORS[0]);highlight.addColorStop(.52,IRON_COLORS[1]);highlight.addColorStop(1,IRON_COLORS[2]);
      context!.beginPath();context!.arc(x,y,r,0,Math.PI*2);context!.fillStyle=highlight;context!.fill();
      figure.dataset.rotation=current.toFixed(4);
    }
    function tick(now:number):void {
      frame=0;
      if(document.hidden||reducedMotion.matches) return;
      const delta=Math.min((now-last)/1000||.016,.05);last=now;
      current+=(target-current)*(1-Math.exp(-14*delta));
      if(Math.abs(target-current)<.00015) current=target;
      draw();figure.dataset.state=current===target?'idle':'scrolling';
      if(current!==target) frame=requestAnimationFrame(tick);
    }
    function requestDraw():void {
      if(frame||document.hidden||reducedMotion.matches) return;
      last=performance.now();frame=requestAnimationFrame(tick);
    }
    function updateScroll():void {
      if(reducedMotion.matches) return;
      target=progress();requestDraw();
    }
    function resize():void {
      const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;
      density=Math.min(devicePixelRatio||1,1.5);
      canvas.width=Math.max(1,Math.round(width*density));canvas.height=Math.max(1,Math.round(height*density));
      proteinCanvas.width=canvas.width;proteinCanvas.height=canvas.height;
      current=target=reducedMotion.matches?0:progress();draw();
    }
    new ResizeObserver(resize).observe(canvas);
    new ResizeObserver(updateScroll).observe(document.body);
    addEventListener('scroll',updateScroll,{passive:true});
    addEventListener('resize',updateScroll,{passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){cancelAnimationFrame(frame);frame=0;}else updateScroll();
    });
    reducedMotion.addEventListener('change',()=>{
      cancelAnimationFrame(frame);frame=0;
      current=target=reducedMotion.matches?0:progress();
      figure.dataset.state=reducedMotion.matches?'reduced-motion':'idle';draw();
    });
    resize();figure.classList.add('protein-ready');
    figure.dataset.state=reducedMotion.matches?'reduced-motion':'idle';
  } catch { figure.dataset.state='fallback'; }
}
const observer=new IntersectionObserver(entries=>{
  for(const entry of entries) if(entry.isIntersecting){observer.unobserve(entry.target);void mount(entry.target as HTMLElement);}
});
document.querySelectorAll<HTMLElement>('.protein-stencil').forEach(figure=>observer.observe(figure));
