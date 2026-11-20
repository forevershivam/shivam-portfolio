export const site={
 name:'Shivam Sharma',firstName:'Shivam',lastName:'Sharma',handle:'stillshivam',
 brand:'shivam.data',email:'shivamsharmanot@outlook.com',
 location:'Delhi, India',timeZone:'Asia/Kolkata',timeZoneLabel:'IST',
 url:process.env.NEXT_PUBLIC_SITE_URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000'),
 tagline:'Data Analyst | Excel, SQL, Power BI & MIS Reporting',
 roles:['Back Office Executive','MIS Executive','Associate Analyst','Data Entry']
} as const;
export type SocialKey='github'|'linkedin'|'instagram';
export const socials:Record<SocialKey,{label:string;href:string}>={
 github:{label:'GitHub',href:'https://github.com/forevershivam'},
 linkedin:{label:'LinkedIn',href:'https://www.linkedin.com/in/stillshivam'},
 instagram:{label:'Instagram',href:'https://www.instagram.com/stillshivam/'}
};
export const socialList=[socials.linkedin,socials.github,socials.instagram];
export const navLinks=[
 {name:'Home',href:'/#top',menuOnly:true},
 {name:'About',href:'/#about'},
 {name:'Skills',href:'/#tech-stack'},
 {name:'Projects',href:'/#projects'},
 {name:'Contact',href:'/#contact'}
] as const;
