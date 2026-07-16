import { useMemo, useState } from 'react'
import { supabase } from './supabase'
import { Pencil, Plus, Power, Trash2, X } from 'lucide-react'

const BOS_FORM = { tur: 'gider', ana_kategori: '', alt_kategori: '', butce_grubu: '', ikon: '', renk: '#2a7180', aktif: true }
const TUR_LABEL = { gelir: 'Gelir', gider: 'Gider', yatirim: 'Yatırım', transfer: 'Transfer', borc: 'Borç' }
const BUTCE_GRUPLARI = [
  { value: 'Gelir', label: 'Gelir' },
  { value: 'Zaruri', label: 'Zaruri' },
  { value: 'Keyfi', label: 'Keyfi' },
  { value: 'Yatırım', label: 'Yatırım' },
  { value: 'Borç Ödeme', label: 'Borç Ödeme' },
  { value: 'Transfer', label: 'Transfer' },
  { value: 'Diğer', label: 'Diğer' }
]

function KategoriYonetimi({ session, kategoriler, onKapat, onDegisti }) {
  const [form, setForm] = useState(BOS_FORM)
  const [anaSecim, setAnaSecim] = useState('__yeni__')
  const [duzenlenenId, setDuzenlenenId] = useState(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState('')

  const sirali = useMemo(() => [...kategoriler].sort((a, b) =>
    `${a.tur}-${a.ana_kategori}-${a.alt_kategori || ''}`.localeCompare(`${b.tur}-${b.ana_kategori}-${b.alt_kategori || ''}`, 'tr')
  ), [kategoriler])
  const mevcutAnaKategoriler = useMemo(() => [...new Set(kategoriler
    .filter(k => k.tur === form.tur).map(k => k.ana_kategori).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'tr')), [kategoriler, form.tur])

  const formTemizle = () => { setForm(BOS_FORM); setAnaSecim('__yeni__'); setDuzenlenenId(null); setHata('') }

  const kaydet = async () => {
    const ana = form.ana_kategori.trim()
    const alt = form.alt_kategori.trim() || null
    if (!form.tur || !ana) { setHata('Tür ve ana kategori zorunludur.'); return }
    const tekrar = kategoriler.some(k => k.id !== duzenlenenId && k.tur === form.tur &&
      k.ana_kategori.trim().toLocaleLowerCase('tr-TR') === ana.toLocaleLowerCase('tr-TR') &&
      (k.alt_kategori || '').trim().toLocaleLowerCase('tr-TR') === (alt || '').toLocaleLowerCase('tr-TR'))
    if (tekrar) { setHata('Aynı tür, ana kategori ve alt kategori daha önce eklenmiş.'); return }

    setKaydediliyor(true); setHata('')
    const veri = { user_id: session.user.id, tur: form.tur, ana_kategori: ana, alt_kategori: alt,
      butce_grubu: form.butce_grubu || null, ikon: form.ikon.trim() || null, renk: form.renk || null,
      aktif: form.aktif, updated_at: new Date().toISOString() }
    const sorgu = duzenlenenId
      ? supabase.from('kategoriler').update(veri).eq('id', duzenlenenId).eq('user_id', session.user.id)
      : supabase.from('kategoriler').insert(veri)
    const { error } = await sorgu
    if (error) setHata(error.message)
    else { formTemizle(); await onDegisti() }
    setKaydediliyor(false)
  }

  const duzenle = k => {
    setDuzenlenenId(k.id)
    setAnaSecim(k.ana_kategori)
    setForm({ tur: k.tur, ana_kategori: k.ana_kategori, alt_kategori: k.alt_kategori || '',
      butce_grubu: k.butce_grubu || '', ikon: k.ikon || '', renk: k.renk || '#2a7180', aktif: k.aktif })
    setHata('')
  }

  const aktifDegistir = async k => {
    await supabase.from('kategoriler').update({ aktif: !k.aktif, updated_at: new Date().toISOString() })
      .eq('id', k.id).eq('user_id', session.user.id)
    await onDegisti()
  }

  const sil = async k => {
    if (!window.confirm(`“${k.ana_kategori}${k.alt_kategori ? ` / ${k.alt_kategori}` : ''}” kategorisi silinsin mi? Eski işlemler metin bilgileriyle görünmeye devam eder.`)) return
    await supabase.from('kategoriler').delete().eq('id', k.id).eq('user_id', session.user.id)
    if (duzenlenenId === k.id) formTemizle()
    await onDegisti()
  }

  return <div style={s.overlay}>
    <div style={s.modal}>
      <div style={s.header}><div><h3 style={s.title}>Kategori Yönetimi</h3><p style={s.subtitle}>Gelir, gider ve diğer işlem kategorilerinizi yönetin.</p></div><button style={s.iconBtn} onClick={onKapat}><X size={19}/></button></div>
      <div style={s.body}>
        <section style={s.formCard}>
          <h4 style={s.sectionTitle}>{duzenlenenId ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}</h4>
          <div style={s.grid}>
            <Field label="Tür"><select style={s.input} value={form.tur} onChange={e => { setForm({...form, tur:e.target.value, ana_kategori:'', alt_kategori:''}); setAnaSecim('__yeni__') }}>{Object.entries(TUR_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Bütçe Grubu"><select style={s.input} value={form.butce_grubu} onChange={e => setForm({...form,butce_grubu:e.target.value})}><option value="">Seçilmedi</option>{BUTCE_GRUPLARI.map(g=><option key={g.value} value={g.value}>{g.label}</option>)}</select></Field>
            <Field label="Ana Kategori *"><select style={s.input} value={anaSecim} onChange={e=>{const v=e.target.value;setAnaSecim(v);setForm({...form,ana_kategori:v==='__yeni__'?'':v})}}><option value="__yeni__">+ Yeni ana kategori</option>{mevcutAnaKategoriler.map(a=><option key={a} value={a}>{a}</option>)}</select></Field>
            {anaSecim === '__yeni__' && <Field label="Yeni Ana Kategori *"><input style={s.input} value={form.ana_kategori} onChange={e=>setForm({...form,ana_kategori:e.target.value})} placeholder="Örn. Ulaşım"/></Field>}
            <Field label="Alt Kategori"><input style={s.input} value={form.alt_kategori} onChange={e=>setForm({...form,alt_kategori:e.target.value})} placeholder="Örn. Yakıt"/></Field>
            <Field label="İkon"><input style={s.input} value={form.ikon} onChange={e=>setForm({...form,ikon:e.target.value})} placeholder="Örn. car veya 🚗"/></Field>
            <Field label="Renk"><input style={{...s.input,padding:'4px 8px'}} type="color" value={form.renk} onChange={e=>setForm({...form,renk:e.target.value})}/></Field>
          </div>
          <label style={s.check}><input type="checkbox" checked={form.aktif} onChange={e=>setForm({...form,aktif:e.target.checked})}/> Aktif kategori</label>
          {hata && <div style={s.error}>{hata}</div>}
          <div style={s.formActions}>{duzenlenenId && <button style={s.secondary} onClick={formTemizle}>İptal</button>}<button style={s.primary} onClick={kaydet} disabled={kaydediliyor}><Plus size={15}/>{kaydediliyor?'Kaydediliyor...':duzenlenenId?'Güncelle':'Kategori Ekle'}</button></div>
        </section>
        <section style={s.listCard}><div style={s.listHead}><h4 style={s.sectionTitle}>Kategoriler</h4><span style={s.count}>{kategoriler.length} kayıt</span></div>
          <div style={s.list}>{sirali.length===0?<div style={s.empty}>Henüz kategori eklenmemiş.</div>:sirali.map(k=><div key={k.id} style={{...s.row,opacity:k.aktif?1:.55}}>
            <span style={{...s.dot,background:k.renk||'#94a3b8'}}>{k.ikon||''}</span><div style={s.rowText}><strong>{k.ana_kategori}</strong><span>{k.alt_kategori||'Alt kategori yok'} · {TUR_LABEL[k.tur]}</span></div>{k.butce_grubu&&<span style={s.badge}>{k.butce_grubu}</span>}
            <div style={s.actions}><button title="Düzenle" style={s.iconBtn} onClick={()=>duzenle(k)}><Pencil size={14}/></button><button title={k.aktif?'Pasif yap':'Aktif yap'} style={s.iconBtn} onClick={()=>aktifDegistir(k)}><Power size={14}/></button><button title="Sil" style={{...s.iconBtn,color:'#b45353'}} onClick={()=>sil(k)}><Trash2 size={14}/></button></div>
          </div>)}</div>
        </section>
      </div>
    </div>
  </div>
}

function Field({label,children}) { return <label style={s.field}><span>{label}</span>{children}</label> }

const s={overlay:{position:'fixed',inset:0,zIndex:1200,background:'rgba(15,35,50,.34)',backdropFilter:'blur(5px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20},modal:{width:'min(960px,96vw)',maxHeight:'90vh',overflow:'hidden',background:'#fff',border:'1px solid var(--border)',borderRadius:18,boxShadow:'0 24px 70px rgba(20,45,60,.2)'},header:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'22px 24px',borderBottom:'1px solid var(--border)'},title:{margin:0,fontSize:20,color:'var(--text-primary)'},subtitle:{margin:'5px 0 0',fontSize:12,color:'var(--text-muted)'},body:{display:'grid',gridTemplateColumns:'minmax(290px,.8fr) minmax(360px,1.2fr)',gap:14,padding:16,overflowY:'auto',maxHeight:'calc(90vh - 86px)'},formCard:{padding:18,border:'1px solid var(--border)',borderRadius:13,background:'var(--surface-soft)',alignSelf:'start'},listCard:{padding:18,border:'1px solid var(--border)',borderRadius:13},sectionTitle:{margin:'0 0 14px',fontSize:14,color:'var(--text-primary)'},grid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10},field:{display:'flex',flexDirection:'column',gap:6,fontSize:11,fontWeight:600,color:'var(--text-secondary)'},input:{width:'100%',boxSizing:'border-box',height:38,border:'1px solid var(--border)',borderRadius:8,background:'#fff',padding:'0 10px',color:'var(--text-primary)',outline:'none'},check:{display:'flex',alignItems:'center',gap:7,marginTop:13,fontSize:12,color:'var(--text-secondary)'},error:{marginTop:10,padding:9,borderRadius:8,background:'#fff1f1',color:'#b54747',fontSize:11},formActions:{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14},primary:{display:'inline-flex',alignItems:'center',gap:6,border:0,borderRadius:8,padding:'10px 14px',background:'#285d72',color:'#fff',fontWeight:650,cursor:'pointer'},secondary:{border:'1px solid var(--border)',borderRadius:8,padding:'9px 13px',background:'#fff',color:'var(--text-secondary)',cursor:'pointer'},listHead:{display:'flex',justifyContent:'space-between',alignItems:'center'},count:{fontSize:11,color:'var(--text-muted)'},list:{display:'flex',flexDirection:'column',gap:7},row:{display:'flex',alignItems:'center',gap:9,minHeight:52,padding:'7px 8px',border:'1px solid var(--border)',borderRadius:10},dot:{width:30,height:30,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12,flexShrink:0},rowText:{display:'flex',flexDirection:'column',gap:3,minWidth:0,flex:1},badge:{padding:'4px 7px',borderRadius:10,background:'var(--surface-soft)',color:'var(--text-secondary)',fontSize:9,whiteSpace:'nowrap'},actions:{display:'flex',gap:2},iconBtn:{width:30,height:30,display:'inline-flex',alignItems:'center',justifyContent:'center',border:0,borderRadius:7,background:'transparent',color:'var(--text-secondary)',cursor:'pointer'},empty:{padding:'38px 12px',textAlign:'center',color:'var(--text-muted)',fontSize:12}}

export default KategoriYonetimi
