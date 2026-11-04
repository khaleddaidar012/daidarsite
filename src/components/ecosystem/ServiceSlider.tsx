'use client'
import {useEffect,useState} from 'react';
import {Store,Monitor,MessagesSquare,Users, Wrench,Pause,Play} from 'lucide-react';
import styles from './workspace.module.css';
const slides=[
 {ar:'متاجر إلكترونية',en:'Online stores',description:'وسّع دائرة عملائك وابدأ البيع عبر الإنترنت.',english:'Reach more customers and start selling online.',Icon:Store},
 {ar:'أنظمة إلكترونية',en:'Business systems',description:'نظّم شغلك وتابع المبيعات والمخزون بسهولة.',english:'Manage sales and inventory with less effort.',Icon:Monitor},
 {ar:'إدارة العملاء',en:'Customer management',description:'حسّن التواصل مع عملائك المحتملين وتابع طلباتهم.',english:'Stay in touch with customers and follow their requests.',Icon:MessagesSquare},
 {ar:'إدارة فريقك',en:'Team management',description:'نظّم مهام فريقك وتابع سير العمل من مكان واحد.',english:'Organize team tasks and follow progress in one place.',Icon:Users},
 {ar:'خدمات أخرى',en:'More services',description:'إدارة أنظمتك الحالية واستشارات تقنية تناسب احتياجاتك.',english:'System management and technical advice for your business.',Icon:Wrench},
];
export default function ServiceSlider({ar}:{ar:boolean}){
 const [index,setIndex]=useState(0),[leaving,setLeaving]=useState(false),[hover,setHover]=useState(false),[focused,setFocused]=useState(false),[paused,setPaused]=useState(false),[reduced,setReduced]=useState(true),[visible,setVisible]=useState(true);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const motion=()=>setReduced(media.matches),visibility=()=>setVisible(!document.hidden);motion();visibility();media.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility)}},[]);
 const stopped=paused||hover||focused||reduced||!visible;
 useEffect(()=>{if(stopped){setLeaving(false);return}let exit:ReturnType<typeof setTimeout>;const timer=setInterval(()=>{setLeaving(true);exit=setTimeout(()=>{setIndex(i=>(i+1)%slides.length);setLeaving(false)},220)},4000);return()=>{clearInterval(timer);clearTimeout(exit)}},[stopped]);
 const slide=slides[index],Icon=slide.Icon;
 return <section aria-label={ar?'اكتشف خدمات دعيدر':'Explore Daidar services'} className={styles.slider} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false)}} data-paused={stopped}>
  <div key={index} className={`${styles.slide} ${leaving?styles.leaving:''}`}><span className={styles.slideIcon}><Icon size={30} aria-hidden="true"/></span><div><p className={styles.eyebrow}>{ar?'حلول أبسط لشغلك':'Simple tools for your business'}</p><h1>{ar?slide.ar:slide.en}</h1><p>{ar?slide.description:slide.english}</p></div></div>
  <div className={styles.sliderControls}><div className={styles.dots}>{slides.map((s,i)=><button key={s.en} type="button" aria-label={ar?s.ar:s.en} aria-pressed={i===index} onClick={()=>{setIndex(i);setLeaving(false)}} />)}</div><button type="button" onClick={()=>setPaused(p=>!p)} aria-label={paused?(ar?'تشغيل العرض':'Play slideshow'):(ar?'إيقاف العرض':'Pause slideshow')}>{paused?<Play size={16}/>:<Pause size={16}/>}</button></div>
 </section>;
}
