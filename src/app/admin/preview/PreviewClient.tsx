'use client';
import { useEffect, useState } from 'react';
import { PortfolioContentProvider } from '@/components/providers/PortfolioContentProvider';
import { portfolioDefaults, type PortfolioData } from '@/lib/portfolio-defaults';
import Navbar from '@/components/shared/Navbar';
import HomeBanner from '@/components/sections/HomeBanner';
import About from '@/components/sections/About';
import Projects from '@/components/sections/Projects';
import Contact from '@/components/sections/Contact';
import Footer from '@/components/shared/Footer';
export default function PreviewClient(){
  const [authorized,setAuthorized]=useState(false);
  const [content,setContent]=useState<PortfolioData>(portfolioDefaults);
  const [received,setReceived]=useState(false);
  useEffect(()=>{
    let active=true;
    const onMessage=(event:MessageEvent)=>{
      if(event.origin!==window.location.origin||event.source!==window.parent)return;
      if(event.data?.kind==='portfolio-preview-content'&&event.data.content){
        setContent(event.data.content as PortfolioData);setReceived(true);
      }
    };
    window.addEventListener('message',onMessage);
    fetch('/api/admin/auth',{credentials:'same-origin',cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .then(r=>{
        if(active&&r?.authenticated){setAuthorized(true);window.parent.postMessage({kind:'portfolio-preview-ready'},window.location.origin);}
      }).catch(()=>{});
    return()=>{active=false;window.removeEventListener('message',onMessage);};
  },[]);
  if(!authorized)return <div className="flex min-h-screen items-center justify-center bg-[#0A0F0D] p-8 text-white">Admin login required for preview.</div>;
  if(!received)return <div className="flex min-h-screen items-center justify-center bg-[#0A0F0D] p-8 text-white">Waiting for editor preview…</div>;
  return <PortfolioContentProvider value={content}>
    <Navbar/>
    <main id="main-content"><HomeBanner/><About/><section className="bg-cream"><Projects/></section><Contact/><Footer/></main>
  </PortfolioContentProvider>;
}
