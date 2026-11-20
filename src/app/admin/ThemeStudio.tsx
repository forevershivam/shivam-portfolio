'use client';
import { useEffect, useMemo, useState } from 'react';
import { builtInPresets, colorFamily, contrastRatio, defaultTheme, fontChoices, isHex, makeThemeFromAccent, normalizeTheme, paletteRoles, type PaletteRole, type PortfolioTheme, type ThemePreset, type ThemeTypography } from '@/lib/portfolio-theme';

type Props={
  value:PortfolioTheme;onChange:(value:PortfolioTheme)=>void;
  presets:ThemePreset[];onSavePresets:(value:ThemePreset[])=>Promise<void>;
};
const input='w-full rounded-lg border border-[#DCE5EA] bg-[#FFFFFF] px-3 py-2 text-[#162536] outline-none focus:border-[#60D99A]';
const btn='rounded-lg border border-[#DCE5EA] bg-[#F2F7F5] px-3 py-2 text-sm font-semibold text-[#0F766E] hover:bg-[#E7F5EE] disabled:opacity-40';
const labels:Record<keyof ThemeTypography,string>={
  headings:'Headings',body:'Body text',buttons:'Buttons',accents:'Decorative / italic'
};
function HexEditor({value,label,onCommit}:{value:string;label:string;onCommit:(value:string)=>void}){
  const [draft,setDraft]=useState(value);
  useEffect(()=>{setDraft(value);},[value]);
  const commit=()=>{if(isHex(draft))onCommit(draft.toUpperCase());else setDraft(value);};
  return <input aria-label={label+' hex'} className={input+' !w-full !min-w-0'} maxLength={7} spellCheck={false} value={draft}
    onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/>;
}

export default function ThemeStudio({value,onChange,presets,onSavePresets}:Props){
  const [undo,setUndo]=useState<PortfolioTheme[]>([]);
  const [redo,setRedo]=useState<PortfolioTheme[]>([]);
  const [base,setBase]=useState(value.colors.accent);
  const [shadeRole,setShadeRole]=useState<PaletteRole>('accent');
  const [presetName,setPresetName]=useState('');
  const [selectedId,setSelectedId]=useState('emerald');
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const shades=useMemo(()=>colorFamily(isHex(base)?base:value.colors.accent),[base,value.colors.accent]);
  const allPresets=[...builtInPresets,...presets];
  const selected=allPresets.find(x=>x.id===selectedId);
  const apply=(next:PortfolioTheme)=>{
    setUndo(history=>[...history.slice(-49),structuredClone(value)]);
    setRedo([]);onChange(normalizeTheme(next));setMessage('');
  };
  const updateColor=(key:PaletteRole,hex:string)=>{
    if(!isHex(hex))return;
    apply({...value,accent:key==='accent'?hex:value.accent,colors:{...value.colors,[key]:hex}});
  };
  const updateFont=(key:keyof ThemeTypography,val:string)=>{
    if(!(val in fontChoices))return;
    apply({...value,typography:{...value.typography,[key]:val}});
  };
  const undoEdit=()=>{
    if(!undo.length)return;setRedo(history=>[...history,structuredClone(value)]);
    onChange(undo[undo.length-1]);setUndo(history=>history.slice(0,-1));
  };
  const redoEdit=()=>{
    if(!redo.length)return;setUndo(history=>[...history,structuredClone(value)]);
    onChange(redo[redo.length-1]);setRedo(history=>history.slice(0,-1));
  };
  const saveCustom=async()=>{
    if(!presetName.trim()){setMessage('Enter a preset name.');return;}
    setSaving(true);try{
      const id='custom-'+crypto.randomUUID();
      await onSavePresets([...presets,{id,name:presetName.trim().slice(0,65),theme:structuredClone(value)}]);
      setSelectedId(id);setPresetName('');setMessage('Custom preset saved in your private library.');
    }catch(e){setMessage(e instanceof Error?e.message:'Could not save preset');}finally{setSaving(false);}
  };
  const changePreset=async(kind:'rename'|'replace'|'duplicate'|'delete')=>{
    const custom=presets.find(p=>p.id===selectedId);
    if(!custom)return;
    if(kind==='delete'&&!window.confirm('Delete this custom preset? Your current theme will not change.'))return;
    setSaving(true);try{
      const id='custom-'+crypto.randomUUID();
      const list=kind==='delete'?presets.filter(p=>p.id!==custom.id):
        kind==='duplicate'?[...presets,{id,name:custom.name+' copy',theme:structuredClone(custom.theme)}]:
        presets.map(p=>p.id!==custom.id?p:kind==='replace'?{...p,theme:structuredClone(value)}:{...p,name:(presetName.trim()||p.name).slice(0,65)});
      await onSavePresets(list);if(kind==='delete')setSelectedId('emerald');
      if(kind==='duplicate')setSelectedId(id);
      setMessage('Preset library updated.');
    }catch(e){setMessage(e instanceof Error?e.message:'Could not update preset');}finally{setSaving(false);}
  };
  const contrastRows=[
    ['Heading / dark background',value.colors.heading,value.colors.background],
    ['Body / dark background',value.colors.text,value.colors.background],
    ['Button text / button',value.colors.buttonText,value.colors.button],
    ['Text on light area',value.colors.lightText,value.colors.lightBackground],
  ] as const;
  return <div className="space-y-7 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE5EA] bg-[#EDF8F3] p-4">
      <div><h3 className="font-semibold text-slate-900">Design history</h3><p className="mt-1 text-xs text-[#64748B]">Undo / redo unsaved changes. Published versions can be restored in the History panel below.</p></div>
      <div className="flex gap-2"><button className={btn} disabled={!undo.length} onClick={undoEdit} type="button">↶ Undo</button><button className={btn} disabled={!redo.length} onClick={redoEdit} type="button">↷ Redo</button><button type="button" className={btn} onClick={()=>apply(defaultTheme)}>Reset to Emerald</button></div>
    </div>

    <section className="rounded-xl border border-[#DCE5EA] p-4">
      <h3 className="text-base font-bold text-slate-900">Colour family · 50–950</h3><p className="mb-4 mt-1 text-[#64748B]">Choose a base colour, generate matching shades, then assign each shade to a role.</p>
      <div className="mb-4 flex flex-wrap items-center gap-3"><input aria-label="Choose base colour" type="color" className="h-12 w-16 cursor-pointer rounded-lg" value={isHex(base)?base:value.colors.accent} onChange={e=>setBase(e.target.value)}/><input className={input+' !w-32'} value={base} onChange={e=>setBase(e.target.value)}/><button type="button" disabled={!isHex(base)} className={btn} onClick={()=>apply(makeThemeFromAccent(base))}>Apply harmonized accent</button>
      <label className="min-w-[170px]"><span className="mb-1 block text-xs text-[#64748B]">Shade click updates</span><select className={input} value={shadeRole} onChange={e=>setShadeRole(e.target.value as PaletteRole)}>{(Object.keys(paletteRoles) as PaletteRole[]).map(key=><option value={key} key={key}>{paletteRoles[key]}</option>)}</select></label></div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 xl:grid-cols-11">{Object.entries(shades).map(([shade,hex])=><button key={shade} type="button" title={'Use '+hex+' for '+paletteRoles[shadeRole]} onClick={()=>updateColor(shadeRole,hex)} className="rounded-xl border border-[#DCE5EA] bg-[#F8FAFC] p-1.5 text-center"><span className="block h-12 rounded-lg" style={{backgroundColor:hex}}/><span className="mt-1 block text-xs text-slate-900">{shade}</span><span className="block text-[10px] text-[#64748B]">{hex}</span></button>)}</div>
    </section>

    <section className="rounded-xl border border-[#DCE5EA] p-4">
      <h3 className="text-base font-bold text-slate-900">Colour roles</h3><p className="mb-4 mt-1 text-[#64748B]">Each role is saved separately: headings, text, backgrounds, buttons, hover, outlines, cards and borders.</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{(Object.keys(paletteRoles) as PaletteRole[]).map(key=><div key={key} className="rounded-xl border border-[#DCE5EA] bg-[#FFFFFF] p-3">
        <label className="mb-2 block text-xs font-semibold text-[#0F766E]">{paletteRoles[key]}</label>
        <div className="flex items-center gap-2"><input type="color" aria-label={paletteRoles[key]} value={value.colors[key]} onChange={e=>updateColor(key,e.target.value)} className="h-10 w-12 cursor-pointer rounded-md"/><HexEditor label={paletteRoles[key]} value={value.colors[key]} onCommit={hex=>updateColor(key,hex)} /></div>
      </div>)}</div>
    </section>

    <section className="rounded-xl border border-[#DCE5EA] p-4">
      <h3 className="text-base font-bold text-slate-900">Typography library</h3><p className="mb-4 mt-1 text-[#64748B]">Fonts already bundled in your website. Choose one for each role.</p>
      <div className="grid gap-4 sm:grid-cols-2">{(Object.keys(labels) as (keyof ThemeTypography)[]).map(key=><label key={key} className="block"><span className="mb-2 block text-xs font-semibold text-[#0F766E]">{labels[key]}</span><select className={input} value={value.typography[key]} onChange={e=>updateFont(key,e.target.value)}>{Object.entries(fontChoices).map(([id,option])=><option key={id} value={id}>{option.label}</option>)}</select><span className="mt-2 block text-lg text-slate-900" style={{fontFamily:fontChoices[value.typography[key]].css}}>Aa Bb Cc — Design preview</span></label>)}</div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{(['buttons','cards'] as const).map(key=><label key={key}><span className="block text-xs text-[#0F766E]">{key==='buttons'?'Button corner radius':'Card corner radius'}: {value.radius[key]}px</span><input className="mt-2 w-full accent-emerald-400" type="range" min="0" max="48" value={value.radius[key]} onChange={e=>apply({...value,radius:{...value.radius,[key]:Number(e.target.value)}})}/></label>)}</div>
    </section>

    <section className="rounded-xl border border-[#DCE5EA] p-4">
      <h3 className="text-base font-bold text-slate-900">Preset library</h3><p className="mb-4 mt-1 text-[#64748B]">Built-in schemes plus your own custom presets. These save colours, fonts and corner styles together.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="mb-2 block text-xs text-[#64748B]">Choose preset</span><select className={input} value={selectedId} onChange={e=>setSelectedId(e.target.value)}>{allPresets.map(p=><option key={p.id} value={p.id}>{p.name}{p.id.startsWith('custom-')?' (Custom)':''}</option>)}</select></label>
        <div className="flex items-end"><button type="button" className={btn+' w-full'} disabled={!selected} onClick={()=>selected&&apply(selected.theme)}>Apply selected preset</button></div>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-2"><label className="min-w-[200px] flex-1"><span className="mb-2 block text-xs text-[#64748B]">Custom preset name</span><input className={input} maxLength={65} value={presetName} placeholder="e.g. Shivam Ocean V2" onChange={e=>setPresetName(e.target.value)}/></label><button type="button" className={btn} disabled={saving||presets.length>=30} onClick={saveCustom}>Save as custom preset</button></div>
      {selectedId.startsWith('custom-')&&<div className="mt-3 flex flex-wrap gap-2"><button type="button" className={btn} disabled={saving} onClick={()=>changePreset('rename')}>Rename</button><button type="button" className={btn} disabled={saving} onClick={()=>changePreset('replace')}>Update from current</button><button type="button" className={btn} disabled={saving||presets.length>=30} onClick={()=>changePreset('duplicate')}>Duplicate</button><button type="button" className={btn} disabled={saving} onClick={()=>changePreset('delete')}>Delete</button></div>}
      {message&&<p role="status" className="mt-3 text-xs text-[#0F766E]">{message}</p>}
    </section>

    <section className="rounded-xl border border-[#DCE5EA] p-4">
      <h3 className="text-base font-bold text-slate-900">Contrast & accessibility</h3><p className="mt-1 text-xs text-[#64748B]">WCAG AA normal-text target: 4.5:1. Check before publishing; this is advisory, not an automatic correction.</p>
      <div className="mt-3 space-y-2">{contrastRows.map(([label,fore,back])=>{
        const ratio=contrastRatio(fore,back);return <div key={label} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#DCE5EA] px-3 py-2"><span>{label}</span><span className={ratio>=4.5?'text-[#0F766E]':'text-[#9A6700]'}>{ratio.toFixed(2)}:1 · {ratio>=4.5?'AA pass':'Check contrast'}</span></div>;
      })}</div>
    </section>

    <div className="overflow-hidden rounded-2xl border" style={{background:value.colors.background,borderColor:value.colors.border,borderRadius:value.radius.cards}}>
      <div className="p-6 md:p-9">
        <p className="text-xs uppercase tracking-[0.2em]" style={{color:value.colors.accent}}>LIVE DESIGN SAMPLE</p>
        <h3 className="mt-3 text-4xl font-bold" style={{color:value.colors.heading,fontFamily:fontChoices[value.typography.headings].css}}>Shivam Sharma</h3>
        <p className="mt-3 max-w-xl leading-relaxed" style={{color:value.colors.text,fontFamily:fontChoices[value.typography.body].css}}>A data analytics portfolio featuring Excel, SQL, dashboards and business insights.</p>
        <div className="mt-6 flex flex-wrap gap-3"><button type="button" style={{background:value.colors.button,color:value.colors.buttonText,borderRadius:value.radius.buttons,fontFamily:fontChoices[value.typography.buttons].css}} className="px-5 py-3 font-bold">Primary button</button><span className="rounded-xl border px-5 py-3" style={{color:value.colors.muted,borderColor:value.colors.border}}>Outlined card</span></div>
      </div>
      <div className="p-6" style={{background:value.colors.lightBackground,color:value.colors.lightText}}>Light interface sample · Labels, headings and cards should remain readable.</div>
    </div>
  </div>;
}
