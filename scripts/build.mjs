/**
 * GitHub-only static site builder. No CMS, deployment service, third-party library
 * or secrets. Edit JSON data in GitHub; GitHub Actions creates the pages.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'content/site.json'), 'utf8'));
const projectData = JSON.parse(fs.readFileSync(path.join(root, 'content/projects.json'), 'utf8'));
const projects = Array.isArray(projectData.projects) ? projectData.projects : [];
const dest = path.join(root, 'dist');
fs.rmSync(dest, {recursive:true, force:true});
fs.mkdirSync(dest, {recursive:true});

const themes = {
 teal: {bg:'#F8F7F3',surface:'#EEF0EA',line:'#CED7CF',ink:'#222B2A',muted:'#4D5B56',accent:'#0C5955',warm:'#0C5955'},
 mocha: {bg:'#211C17',surface:'#332A22',line:'#5B4632',ink:'#F6EDDD',muted:'#D6C7B4',accent:'#F4D9A0',warm:'#C8792C'},
 champagne: {bg:'#FCF7EC',surface:'#F5EBDA',line:'#D7C5AA',ink:'#3B2A20',muted:'#604B3B',accent:'#8D4F17',warm:'#8D4F17'},
 slate: {bg:'#EAE3D6',surface:'#F4EEE4',line:'#CBBFAF',ink:'#1C2525',muted:'#465354',accent:'#245B63',warm:'#245B63'}
};
const themeName = Object.hasOwn(themes, data.theme) ? data.theme : 'teal';
const theme = {...themes[themeName]};
function luminance(color) {
 const c=color.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 return .2126*c[0]+.7152*c[1]+.0722*c[2];
}
function contrast(a,b) {const x=luminance(a), y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for (const [key,target] of [['primaryColor','ink'],['accentColor','accent']]){
 const val=data[key];
 if(typeof val==='string' && /^#[0-9a-fA-F]{6}$/.test(val) && contrast(val,theme.bg)>=4.5) theme[target]=val;
}
const accentText = contrast(theme.accent,'#FFFFFF')>=4.5 ? '#FFFFFF':'#151515';
const cssVars = Object.entries({...theme,'accent-ink':accentText}).map(([k,v])=>`--${k}:${v}`).join(';');

const siteUrl = new URL(data.siteUrl || 'https://forevershivam.github.io/shivam-portfolio/');
if (siteUrl.protocol !== 'https:') throw new Error('siteUrl must use https');
const base = siteUrl.pathname.endsWith('/') ? siteUrl.pathname : `${siteUrl.pathname}/`;
const href = (part='') => base+String(part).replace(/^\/+/, '');
const canonical = (part='') => new URL(href(part), siteUrl.origin).href;
const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const para = text => esc(text).replace(/\n/g,'<br>');
const paragraphs = (items=[]) => (Array.isArray(items)?items:[]).map(t=>`<p>${para(t)}</p>`).join('');
const isHttps = v => /^https:\/\//i.test(String(v||''));
const externalLink = (url,label,cls='') => isHttps(url)?`<a ${cls?`class="${esc(cls)}" `:''}href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>`:'';
const localAsset = input => {
 if(!input) return '';
 const clean=String(input).replace(/^\/+/, '');
 if(!/^assets\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp|avif|pdf|svg|ico)$/i.test(clean) || clean.includes('..')) throw new Error(`Local asset must be an assets/ path: ${clean}`);
 return href(clean);
};
const resumeLink = data.resume ? `<a class="button button-outline" href="${esc(localAsset(data.resume))}" download>Download resume PDF <span aria-hidden="true">↗</span></a>` : '<span class="resume-unavailable">Resume PDF: [ADD REAL RESUME FILE]</span>';
const nav = (mobile=false)=>`<nav aria-label="${mobile?'Mobile':'Primary'} navigation"${mobile?'':' class="desktop-nav"'}><a href="${href()}">Home</a><a href="${href('projects/')}">Projects</a><a href="${href('about/')}">About</a><a href="${href('contact/')}">Contact</a></nav>`;
const header = `<header class="site-header"><div class="shell nav-wrap"><a class="brand" href="${href()}" aria-label="Shivam Sharma home"><span class="brand-symbol">SS</span><span class="brand-word">SHIVAM SHARMA</span></a>${nav()}<details class="mobile-menu"><summary aria-label="Open navigation menu"><span></span><span></span><span class="sr-only">Menu</span></summary>${nav(true)}</details></div></header>`;
const footer = `<footer class="footer"><div class="shell footer-top"><div><p class="eyebrow">SHIVAM SHARMA</p><p class="footer-desc">${esc(data.role||'Data Analyst')}, ${esc(data.location||'India')}</p></div><div class="footer-links">${externalLink(data.linkedin,'LinkedIn')}${externalLink(data.github,'GitHub')}<a href="mailto:${encodeURIComponent(data.email)}">Email</a></div></div><div class="shell footer-bottom"><span>© ${new Date().getUTCFullYear()} Shivam Sharma</span><nav aria-label="Legal pages"><a href="${href('privacy-policy/')}">Privacy Policy</a><a href="${href('terms-and-conditions/')}">Terms and Conditions</a></nav></div></footer>`;
const cssLink=href('assets/styles.css');
function shell(title,desc,slug,body) {
 const url=canonical(slug);
 const favicon=href('assets/favicon.ico');
 return `<!doctype html><html lang="en" data-theme="${themeName}" style="${cssVars}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="theme-color" content="${theme.bg}"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(url)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}"><meta name="twitter:card" content="summary"><link rel="icon" href="${favicon}" sizes="any"><link rel="icon" href="${href('assets/favicon-32x32.png')}" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="${href('assets/apple-touch-icon.png')}" sizes="180x180"><link rel="stylesheet" href="${cssLink}"></head><body><a class="skip-link" href="#main">Skip to content</a>${header}${body}${footer}</body></html>`;
}
function save(where,html) {
 const output=path.join(dest,where);
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,html,'utf8');
}
const listed=projects.filter(p=>p.published===true && p.slug && p.title).sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999));
const slugs=new Set();
for(const p of listed){
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) throw new Error(`Invalid project slug: ${p.slug}`);
 if(slugs.has(p.slug)) throw new Error(`Duplicate project slug: ${p.slug}`);
 slugs.add(p.slug);
}
function projectList(level=2){
 if(!listed.length) return `<div class="empty-projects"><p class="eyebrow">PORTFOLIO / COMING SOON</p><p>${esc(data.home.projectsEmptyMessage||'Project case studies will be added here')}</p></div>`;
 return `<div class="project-grid">${listed.map((p,i)=>`<article class="project-card"><div class="project-card-meta"><span>${String(i+1).padStart(2,'0')} / PROJECT</span><span>${esc((p.tools||[]).slice(0,3).join(' / '))}</span></div><h${level}><a href="${href('projects/'+p.slug+'/')}">${esc(p.title)}</a></h${level}><p>${esc(p.summary||'')}</p><a class="text-link" href="${href('projects/'+p.slug+'/')}">Read case study <span aria-hidden="true">↗</span></a></article>`).join('')}</div>`;
}
const skills=()=>`<div class="skill-grid">${(data.skills||[]).map(g=>`<div class="skill-group"><p class="eyebrow">${esc(g.category)}</p><p>${esc((g.items||[]).join(' · '))}</p></div>`).join('')}</div>`;
const intro=(k,title,lead)=>`<p class="eyebrow eyebrow-accent">${esc(k)}</p><h1>${esc(title)}</h1><p class="interior-lead">${esc(lead)}</p>`;
const portrait= data.portrait?`<img class="portrait-real" src="${esc(localAsset(data.portrait))}" alt="${esc(data.portraitAlt||'Portrait of Shivam Sharma')}" loading="lazy" decoding="async">`:`<span class="tiny-index">PROFILE / 01</span><div class="portrait-initials">S<span>S</span></div><p class="placeholder-note">[ADD YOUR REAL PHOTO IN GITHUB]</p>`;
const h = data.home;
const home = `<main id="main"><section class="hero shell section"><div class="hero-copy"><p class="eyebrow eyebrow-accent"><span class="small-diamond" aria-hidden="true"></span>${esc(h.kicker)}</p><h1>${esc(h.title)}</h1><p class="hero-summary">${esc(h.intro)}</p><div class="hero-actions"><a class="button" href="${href('projects/')}">View projects <span aria-hidden="true">↗</span></a><a class="button button-outline" href="${href('contact/')}">Get in touch</a></div><div class="hero-availability"><span class="micro-label">CURRENT FOCUS</span><p>${esc(h.focus)}</p></div></div><div class="portrait-panel"><div class="portrait-placeholder">${portrait}</div><div class="portrait-caption"><span>SHIVAM SHARMA</span><span>DATA ANALYST / INDIA</span></div></div></section><section class="section section-rule shell"><div class="section-top"><div><p class="eyebrow">01 / PORTFOLIO</p><h2>${esc(h.workTitle)}</h2></div><p class="section-intro">${esc(h.workIntro)}</p></div>${projectList(3)}<a class="text-link section-bottom-link" href="${href('projects/')}">Explore all projects <span aria-hidden="true">↗</span></a></section><section class="skills-band"><div class="shell section"><div class="section-top"><div><p class="eyebrow">02 / SKILLS</p><h2>${esc(h.skillsTitle)}</h2></div><p class="section-intro">${esc(h.skillsIntro)}</p></div>${skills()}</div></section><section class="shell section bottom-cta"><p class="eyebrow">03 / CONTACT</p><h2>${esc(h.contactTitle)}</h2><p>${esc(h.contactIntro)}</p><div class="hero-actions"><a class="button" href="${href('contact/')}">Contact me <span aria-hidden="true">↗</span></a>${resumeLink}</div><div class="social-inline">${externalLink(data.linkedin,'LinkedIn')}${externalLink(data.github,'GitHub')}</div></section></main>`;
save('index.html',shell(data.siteTitle, data.siteDescription,'',home));
const prBody=`<main id="main"><div class="shell interior section">${intro('PORTFOLIO / WORK','Projects','My project case studies, including the question, data, approach and findings.')}<div class="interior-divider"></div>${projectList()}</div></main>`;
save('projects/index.html',shell(`Projects | ${data.name}`,'Real project case studies by Shivam Sharma','projects/',prBody));
const about=data.about;
const aboutBody=`<main id="main"><div class="shell interior section"><p class="eyebrow eyebrow-accent">PROFILE / SHIVAM SHARMA</p><h1>${esc(about.title)}</h1><div class="about-grid"><div class="reading-text about-body">${paragraphs(about.paragraphs)}<a href="${href('contact/')}" class="text-link">Contact me <span aria-hidden="true">↗</span></a></div><aside class="about-aside"><p class="eyebrow">LOCATION</p><p>${esc(data.location)}</p><div class="aside-line"></div><p class="eyebrow">FOCUS</p><p>${esc(about.focus)}</p></aside></div><section class="about-details"><p class="eyebrow">SKILLS & EDUCATION</p><h2>Skills and education</h2>${skills()}<div class="education-list"><h3>Education</h3>${(data.education||[]).map(e=>`<div class="education-entry"><strong>${esc(e.degree)}</strong><span>${esc(e.institution)}</span>${e.dates?`<span>${esc(e.dates)}</span>`:''}</div>`).join('')}</div></section></div></main>`;
save('about/index.html',shell(`About | ${data.name}`,`About ${data.name}, a data analyst based in India.`,'about/',aboutBody));
const contact=data.contact;
const contactBody=`<main id="main"><div class="shell interior section contact-page">${intro('LET’S TALK / CONTACT',contact.title,contact.intro)}<div class="contact-methods"><div><p class="eyebrow">EMAIL</p><a href="mailto:${encodeURIComponent(data.email)}" class="contact-big">${esc(data.email)}</a></div><div><p class="eyebrow">PROFILES</p><div class="contact-social">${externalLink(data.linkedin,'LinkedIn')}${externalLink(data.github,'GitHub')}</div></div><div><p class="eyebrow">RESUME</p>${data.resume?`<a href="${esc(localAsset(data.resume))}" class="text-link" download>Download resume PDF <span aria-hidden="true">↗</span></a>`:'<p class="empty-value">[ADD REAL RESUME PDF]</p>'}</div></div><p class="contact-note">${esc(contact.note)}</p></div></main>`;
save('contact/index.html',shell(`Contact | ${data.name}`,`Contact ${data.name} about data analyst opportunities and reporting projects.`,'contact/',contactBody));
function legalPage(type,title,desc,slug){const parts=data[type]||[];const body=`<main id="main"><div class="shell interior section legal-page"><p class="eyebrow eyebrow-accent">SITE INFORMATION</p><h1>${esc(title)}</h1><p class="legal-note">${esc(desc)}</p><div class="interior-divider"></div>${parts.map(s=>`<section class="legal-section"><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></section>`).join('')}<p class="legal-disclaimer">Please have these terms reviewed before relying on them as legal advice.</p></div></main>`;save(`${slug}/index.html`,shell(`${title} | ${data.name}`,title,`${slug}/`,body));}
legalPage('privacy','Privacy Policy','How this personal portfolio handles information.','privacy-policy');
legalPage('terms','Terms and Conditions','Conditions for visiting and using this portfolio.','terms-and-conditions');
for(const p of listed){
 const list=(items,ordered=false)=>`<${ordered?'ol':'ul'} class="${ordered?'case-steps':'case-findings'}">${(items||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</${ordered?'ol':'ul'}>`;
 const block=(title,inner)=>`<section class="case-section"><h2>${title}</h2><div class="reading-text">${inner}</div></section>`;
 const images=(p.screenshots||[]).map(x=>x.path?`<figure><img src="${esc(localAsset(x.path))}" alt="${esc(x.alt||'Real project screenshot')}" loading="lazy"><figcaption>${esc(x.caption||'')}</figcaption></figure>`:`<figure><div class="shot-placeholder">[REPLACE WITH REAL SCREENSHOT: ${esc(p.title)}]</div><figcaption>${esc(x.caption||'')}</figcaption></figure>`).join('')||`<figure><div class="shot-placeholder">[REPLACE WITH REAL SCREENSHOT: ${esc(p.title)}]</div></figure>`;
 const body=`<main id="main"><div class="shell interior section"><a class="text-link back-link" href="${href('projects/')}">← Back to projects</a><div class="case-head"><p class="eyebrow eyebrow-accent">PROJECT CASE STUDY</p><h1>${esc(p.title)}</h1><p class="interior-lead">${esc(p.summary||'')}</p></div><div class="case-layout"><div>${block('Problem',para(p.problem||'[ADD REAL PROJECT PROBLEM]'))}${block('Data and source',para(p.dataSource||'[ADD DATA SOURCE]'))}${block('Tools',`<div class="case-tag-list">${(p.tools||[]).map(t=>`<span>${esc(t)}</span>`).join('')}</div>`)}${block('Steps I took',list(p.steps,true))}${block('What I found',list(p.findings))}${block('Link to the work',p.workLink&&isHttps(p.workLink)?externalLink(p.workLink,'View original work','text-link'):'<span class="empty-value">[ADD REAL PROJECT LINK]</span>')}</div><aside class="case-aside"><p class="eyebrow">PROJECT DETAILS</p><span>Tools used</span><p>${esc((p.tools||[]).join(' / '))}</p></aside></div><section class="screenshots"><h2>Screenshots</h2><div class="shot-grid">${images}</div></section></div></main>`;
 save(`projects/${p.slug}/index.html`,shell(`${p.title} | ${data.name}`,p.summary||`Project by ${data.name}`,`projects/${p.slug}/`,body));
}
save('404.html',shell(`Page not found | ${data.name}`,'This page was not found.','',`<main id="main"><div class="shell interior section not-found"><p class="eyebrow">404 / NOT FOUND</p><h1>Page not found</h1><p>The page you requested could not be found.</p><a class="button" href="${href()}">Return home <span aria-hidden="true">↗</span></a></div></main>`));
for(const asset of fs.readdirSync(path.join(root,'assets'),{withFileTypes:true})){
 if(!asset.isFile()) continue;
 fs.mkdirSync(path.join(dest,'assets'),{recursive:true});
 fs.copyFileSync(path.join(root,'assets',asset.name),path.join(dest,'assets',asset.name));
}
fs.writeFileSync(path.join(dest,'.nojekyll'),'');
fs.writeFileSync(path.join(dest,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${canonical('sitemap.xml')}\n`);
fs.writeFileSync(path.join(dest,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['','projects/','about/','contact/','privacy-policy/','terms-and-conditions/',...listed.map(p=>`projects/${p.slug}/`)].map(x=>`<url><loc>${esc(canonical(x))}</loc></url>`).join('')}</urlset>`);
console.log(`Built ${6+listed.length} content pages, ${listed.length} published projects, theme: ${themeName}. Base: ${base}`);
