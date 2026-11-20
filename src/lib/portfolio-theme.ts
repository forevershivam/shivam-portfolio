export const paletteRoles = {
  accent: 'Primary accent',
  accentLight: 'Soft accent',
  accentDark: 'Deep accent',
  heading: 'Headings on dark',
  text: 'Body text on dark',
  muted: 'Muted text',
  background: 'Dark background',
  surface: 'Cards / surfaces',
  lightBackground: 'Light background',
  lightText: 'Text on light',
  border: 'Borders / dividers',
  button: 'Primary buttons',
  buttonHover: 'Button hover',
  buttonText: 'Button label',
  outline: 'Focus / outline',
} as const;
export type PaletteRole = keyof typeof paletteRoles;
export type ThemePalette = Record<PaletteRole,string>;
export const fontChoices = {
  geist: { label: 'Geist Sans', css: 'var(--font-geist-sans), Arial, sans-serif' },
  space: { label: 'Space Grotesk', css: 'var(--font-space-grotesk), Arial, sans-serif' },
  instrument: { label: 'Instrument Serif', css: 'var(--font-instrument-serif), Georgia, serif' },
  mono: { label: 'Geist Mono', css: 'var(--font-geist-mono), monospace' },
} as const;
export type ThemeFont = keyof typeof fontChoices;
export type ThemeTypography = { headings: ThemeFont; body: ThemeFont; buttons: ThemeFont; accents: ThemeFont };
export type PortfolioTheme = { accent: string; colors: ThemePalette; typography: ThemeTypography; radius: { buttons:number; cards:number } };
export type ThemePreset = { id: string; name: string; theme: PortfolioTheme };
export const defaultTheme: PortfolioTheme = {
  accent:'#34D399',
  colors:{
    accent:'#34D399',accentLight:'#6EE7B7',accentDark:'#10B981',
    heading:'#E2E8E4',text:'#CAD4CE',muted:'#94A39B',
    background:'#0A0F0D',surface:'#0B110E',lightBackground:'#E2E8E4',lightText:'#45524B',border:'#24332B',
    button:'#34D399',buttonHover:'#6EE7B7',buttonText:'#0A0F0D',outline:'#34D399',
  },
  typography:{headings:'space',body:'geist',buttons:'geist',accents:'instrument'},
  radius:{buttons:14,cards:24},
};
export const isHex=(value:unknown):value is string=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value);
export function normalizeTheme(value: Partial<PortfolioTheme> | undefined | null): PortfolioTheme {
  const oldAccent=isHex(value?.accent)?value.accent:defaultTheme.accent;
  const palette:ThemePalette={...defaultTheme.colors,...(value?.colors||{})};
  for(const role of Object.keys(paletteRoles) as PaletteRole[])if(!isHex(palette[role]))palette[role]=defaultTheme.colors[role];
  if(!value?.colors)palette.accent=oldAccent; // Backwards compatibility with old single-accent saves.
  const typography={...defaultTheme.typography,...(value?.typography||{})};
  for(const role of Object.keys(typography) as (keyof ThemeTypography)[])if(!(typography[role] in fontChoices))typography[role]=defaultTheme.typography[role];
  const radius={...defaultTheme.radius,...(value?.radius||{})};
  radius.buttons=Number.isFinite(radius.buttons)?Math.max(0,Math.min(40,radius.buttons)):defaultTheme.radius.buttons;
  radius.cards=Number.isFinite(radius.cards)?Math.max(0,Math.min(48,radius.cards)):defaultTheme.radius.cards;
  return {accent:palette.accent,colors:palette,typography,radius};
}
function rgb(hex:string):[number,number,number]{
  return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
}
export function contrastRatio(a:string,b:string):number {
  const luminance=(hex:string)=>rgb(hex).map(n=>{const v=n/255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;}).reduce((x,v,i)=>x+v*[0.2126,0.7152,0.0722][i],0);
  const [top,bottom]=[luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (top+0.05)/(bottom+0.05);
}
export function colorFamily(hex:string):Record<string,string>{
  const [r,g,b]=rgb(isHex(hex)?hex:'#34D399').map(v=>v/255);
  const high=Math.max(r,g,b),low=Math.min(r,g,b),diff=high-low;
  let h=0,s=0;const l=(high+low)/2;
  if(diff!==0){
    s=diff/(1-Math.abs(2*l-1));
    if(high===r)h=((g-b)/diff)%6;
    else if(high===g)h=(b-r)/diff+2;
    else h=(r-g)/diff+4;
    h=(h*60+360)%360;
  }
  const shades:[string,number][]=[['50',96],['100',91],['200',82],['300',73],['400',64],['500',55],['600',46],['700',37],['800',28],['900',20],['950',12]];
  const hslToHex=(light:number)=>{
    const L=light/100;const S=Math.max(0.12,Math.min(0.9,s));const c=(1-Math.abs(2*L-1))*S;
    const x=c*(1-Math.abs(((h/60)%2)-1)),m=L-c/2;let [rr,gg,bb]=[0,0,0];
    if(h<60)[rr,gg,bb]=[c,x,0];
    else if(h<120)[rr,gg,bb]=[x,c,0];
    else if(h<180)[rr,gg,bb]=[0,c,x];
    else if(h<240)[rr,gg,bb]=[0,x,c];
    else if(h<300)[rr,gg,bb]=[x,0,c];
    else [rr,gg,bb]=[c,0,x];
    return '#'+[rr,gg,bb].map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('').toUpperCase();
  };
  return Object.fromEntries(shades.map(([key,light])=>[key,hslToHex(light)]));
}
export function makeThemeFromAccent(hex:string):PortfolioTheme {
  const shades=colorFamily(hex);
  return normalizeTheme({...defaultTheme,accent:hex,colors:{
    ...defaultTheme.colors,accent:hex,accentLight:shades['300'],accentDark:shades['700'],
    button:hex,buttonHover:shades['300'],buttonText:contrastRatio(hex,'#0A0F0D')>=4.5?'#0A0F0D':'#FFFFFF',outline:hex,
  }});
}
export const builtInPresets:ThemePreset[]=[
  {id:'emerald',name:'Shivam Emerald',theme:defaultTheme},
  {id:'ocean',name:'Ocean Blue',theme:makeThemeFromAccent('#3B82F6')},
  {id:'violet',name:'Royal Violet',theme:makeThemeFromAccent('#A78BFA')},
  {id:'coral',name:'Coral Sunset',theme:makeThemeFromAccent('#FB7185')},
  {id:'amber',name:'Golden Amber',theme:makeThemeFromAccent('#F59E0B')},
  {id:'teal',name:'Deep Teal',theme:makeThemeFromAccent('#14B8A6')},
];
export function themeVariables(theme:PortfolioTheme):Record<string,string>{
  const t=normalizeTheme(theme);const c=t.colors;
  return {
    '--color-accent':c.accent,'--color-accent-light':c.accentLight,'--color-accent-muted':c.accentDark,
    '--color-ink':c.background,'--color-surface':c.surface,'--color-cream':c.lightBackground,
    '--color-warm':c.lightText,'--color-light':c.text,'--color-muted':c.muted,'--color-gray-soft':c.muted,
    '--color-border':c.border,'--color-border-subtle':c.border,'--color-elevated-dark':c.border,
    '--color-surface-mid':c.surface,'--color-surface-card':c.surface,'--color-elevated':c.surface,
    '--portfolio-heading':c.heading,'--portfolio-text':c.text,'--portfolio-button':c.button,
    '--portfolio-button-hover':c.buttonHover,'--portfolio-button-text':c.buttonText,
    '--portfolio-outline':c.outline,'--portfolio-border':c.border,
    '--font-display':fontChoices[t.typography.headings].css,
    '--portfolio-heading-font':fontChoices[t.typography.headings].css,
    '--portfolio-body-font':fontChoices[t.typography.body].css,
    '--portfolio-accent-font':fontChoices[t.typography.accents].css,
    '--font-sans':fontChoices[t.typography.body].css,
    '--portfolio-button-font':fontChoices[t.typography.buttons].css,
    '--font-serif':fontChoices[t.typography.accents].css,
    '--portfolio-radius-button':t.radius.buttons+'px','--portfolio-radius-card':t.radius.cards+'px',
  };
}
