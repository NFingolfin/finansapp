import { useState } from 'react'
import { useEffect } from 'react'
import { supabase } from './supabase'
import Hesaplar from './Hesaplar'
import Islemler from './Islemler'
import Yatirimlar from './Yatirimlar'
import Borclar from './Borclar'
import Hedefler from './Hedefler'
import Raporlar from './Raporlar'
import Hesabim from './Hesabim'
import FinkodLogo from './Logo'
import ChatBot from './ChatBot'
import { useTema } from './ThemeContext'
import { useLang } from './LangContext'

const useWindowSize = () => {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])
  return width
}

function Dashboard({ session }) {
  const [aktifSayfa, setAktifSayfa] = useState('ozet')
  const [profil, setProfil] = useState(null)
  const windowWidth = useWindowSize()
const mobil = windowWidth < 768
const [menuAcik, setMenuAcik] = useState(false)
  const { tema, temaToggle } = useTema()
  const { dil, dilDegistir, t } = useLang()
  const [gizliMod, setGizliMod] = useState(() => localStorage.getItem('gizliMod') === 'true')
  const gizliModToggle = () => setGizliMod(prev => {
    const yeni = !prev
    localStorage.setItem('gizliMod', yeni.toString())
    return yeni
  })

  useEffect(() => { profilGetir() }, [])

  const profilGetir = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('ad, soyad')
      .eq('id', session.user.id)
      .single()
    if (data) {
      setProfil(data)
    } else if (error?.code === 'PGRST116') {
      // Satır yok — upsert ile oluştur
      await supabase.from('profiles').upsert(
        { id: session.user.id, ad: '', soyad: '' },
        { onConflict: 'id' }
      )
    }
  }

  const handleCikis = async () => {
    await supabase.auth.signOut()
  }

  const displayName = profil?.ad
    ? `${profil.ad} ${profil.soyad || ''}`.trim()
    : session.user.email.split('@')[0]

  const menuItems = [
    { id: 'ozet',      label: t('genelOzet'),  icon: '📊' },
    { id: 'hesaplar',  label: t('hesaplar'),   icon: '🏦' },
    { id: 'islemler',  label: t('islemler'),   icon: '💸' },
    { id: 'yatirimlar',label: t('yatirimlar'), icon: '📈' },
    { id: 'hedefler',  label: t('hedefler'),   icon: '🎯' },
    { id: 'borclar',   label: t('borclar'),    icon: '💳' },
    { id: 'raporlar',  label: t('raporlar'),   icon: '📋' },
    { id: 'hesabim',   label: t('hesabim'),    icon: '👤' },
  ]

  return (
    <div style={styles.wrapper}>
  {/* Mobil overlay */}
{mobil && menuAcik && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 998,
    }}
    onClick={() => setMenuAcik(false)}
  />
)}
      {/* Sol Menü */}
<div style={{
  ...styles.sidebar,
  position: 'fixed',
  top: 0,
  left: 0,
  height: '100vh',
  transform: mobil ? (menuAcik ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
  transition: 'transform 0.3s ease',
  zIndex: 999,
}}>
        <div style={styles.logoWrap}>
          <FinkodLogo size={32} uid="s" />
          <div>
            <div style={styles.logo}>Finkod Cüzdan</div>
            <div style={styles.logoAlt}>by NKode Solutions</div>
          </div>
        </div>
        <div style={styles.userInfo}>
          <div style={styles.kullaniciAd}>{displayName}</div>
          <div style={styles.kullaniciEmail}>{session.user.email}</div>
        </div>

        <nav style={styles.nav}>
          {menuItems.map(item => (
            <button
              key={item.id}
              style={aktifSayfa === item.id ? styles.menuItemAktif : styles.menuItem}
              onClick={() => { setAktifSayfa(item.id); if (mobil) setMenuAcik(false) }}
            >
              <span style={styles.menuIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button
          style={gizliMod ? styles.gizliBtnAktif : styles.gizliBtn}
          onClick={gizliModToggle}
        >
          {gizliMod ? t('degerleriGoster') : t('degerleriGizle')}
        </button>
        <button style={styles.cikisBtn} onClick={handleCikis}>
          🚪 {t('cikisYap')}
        </button>
        <div style={styles.nkodeBranding}>
          <div style={styles.nkodeDot} />
          NKode Solutions
        </div>
      </div>

      {/* Ana İçerik */}
<div style={{
  ...styles.content,
  marginLeft: mobil ? '0' : '240px',
  width: mobil ? '100%' : 'calc(100% - 240px)',
  overflow: 'hidden',
  boxSizing: 'border-box',
}}>
<div style={styles.header}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    {mobil && (
      <button
        style={styles.hamburger}
        onClick={() => setMenuAcik(!menuAcik)}>
        {menuAcik ? '✕' : '☰'}
      </button>
    )}
    <h1 style={styles.pageTitle}>
      {menuItems.find(m => m.id === aktifSayfa)?.icon}{' '}
      {menuItems.find(m => m.id === aktifSayfa)?.label}
    </h1>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    {/* Dil seçici */}
    <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border)' }}>
      {['tr', 'en'].map(d => (
        <button key={d} onClick={() => dilDegistir(d)} style={{
          padding: '4px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer',
          fontSize: '12px', fontWeight: 'bold',
          background: dil === d ? 'var(--accent)' : 'transparent',
          color: dil === d ? '#fff' : 'var(--text-secondary)',
          transition: 'all 0.2s',
        }}>{d.toUpperCase()}</button>
      ))}
    </div>
    {/* Tema butonu */}
    <button onClick={temaToggle} style={{
      padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '8px',
      background: 'var(--bg-subtle)', color: 'var(--text-primary)',
      cursor: 'pointer', fontSize: '16px', lineHeight: 1,
    }}>
      {tema === 'light' ? '🌙' : '☀️'}
    </button>
    {!mobil && (
      <div style={styles.tarih}>
        {new Date().toLocaleDateString(dil === 'en' ? 'en-GB' : 'tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    )}
  </div>
</div>

        <div style={styles.pageContent}>
          {aktifSayfa === 'ozet' && <OzetSayfasi session={session} mobil={mobil} setAktifSayfa={setAktifSayfa} gizliMod={gizliMod} />}
          {aktifSayfa === 'hesaplar' && <Hesaplar session={session} mobil={mobil} gizliMod={gizliMod} />}
          {aktifSayfa === 'islemler' && <Islemler session={session} mobil={mobil} gizliMod={gizliMod} />}
          {aktifSayfa === 'yatirimlar' && <Yatirimlar session={session} mobil={mobil} gizliMod={gizliMod} />}
          {aktifSayfa === 'borclar' && <Borclar session={session} mobil={mobil} gizliMod={gizliMod} />}
          {aktifSayfa === 'hedefler' && <Hedefler session={session} mobil={mobil} gizliMod={gizliMod} />}
          {aktifSayfa === 'raporlar' && <Raporlar session={session} mobil={mobil} gizliMod={gizliMod} />}
          {aktifSayfa === 'hesabim' && <Hesabim session={session} mobil={mobil} onProfilGuncellendi={profilGetir} />}
        </div>
      </div>
      <ChatBot session={session} onIslemEklendi={() => {}} />
    </div>
  )
}

function OzetSayfasi({ session, setAktifSayfa, mobil, gizliMod }) {
  const pm = (val) => gizliMod ? '₺ ****' : '₺' + parseFloat(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })
  const { t } = useLang()
  const [ozet, setOzet] = useState({
    toplamNakit: 0,
    toplamYatirim: 0,
    toplamBorc: 0,
    yatirimDeger: 0,
  })
  const [sonIslemler, setSonIslemler] = useState([])
  const [hesaplar, setHesaplar] = useState([])

  useEffect(() => {
    verileriGetir()
  }, [])

  const verileriGetir = async () => {
    const { data: hesapData } = await supabase.from('hesaplar').select('*').eq('user_id', session.user.id)
    const { data: islemData } = await supabase.from('islemler').select('*, hesaplar(ad)')
      .eq('user_id', session.user.id).order('tarih', { ascending: false }).limit(5)
    const { data: yatirimData } = await supabase.from('yatirimlar').select('*').eq('user_id', session.user.id)
    const { data: borcData } = await supabase.from('borclar').select('*').eq('user_id', session.user.id).eq('aktif', true)

    if (hesapData) setHesaplar(hesapData)
    if (islemData) setSonIslemler(islemData)

    // Yatırım hesaplarındaki toplam yatırım değeri
    const yatirimToplam = (yatirimData || [])
      .filter(y => y.para_birimi === 'TRY')
      .reduce((a, y) => a + parseFloat(y.guncel_deger), 0)

    // Nakit: yatırım hesabı olmayanların bakiyesi + yatırım hesaplarının nakit kısmı
    const toplamNakit = (hesapData || [])
      .filter(h => h.para_birimi === 'TRY' && h.tur !== 'Kredi Kartı')
      .reduce((a, h) => a + parseFloat(h.bakiye), 0)

    // Toplam borç
    const toplamBorc = (borcData || [])
      .reduce((a, b) => a + parseFloat(b.kalan_borc), 0)

    // Toplam varlık = nakit + yatırım değeri
    const toplamVarlik = toplamNakit + yatirimToplam

    // Net varlık = toplam varlık - borç
    const netVarlik = toplamVarlik - toplamBorc

    setOzet({ toplamNakit, toplamYatirim: yatirimToplam, toplamBorc, toplamVarlik, netVarlik })
  }

  const turRenk = { gelir: '#0d9488', gider: '#ef4444', transfer: '#0ea5e9' }
  const turLabel = { gelir: 'Gelir', gider: 'Gider', transfer: 'Transfer' }

const kartlar = [
  { baslik: t('toplamVarlik'),  deger: pm(ozet.toplamVarlik),  renk: '#0d9488', icon: '💎', sayfa: 'hesaplar' },
  { baslik: t('toplamNakit'),   deger: pm(ozet.toplamNakit),   renk: '#0ea5e9', icon: '💵', sayfa: 'hesaplar' },
  { baslik: t('toplamYatirim'), deger: pm(ozet.toplamYatirim), renk: '#eab308', icon: '📈', sayfa: 'yatirimlar' },
  { baslik: t('toplamBorc'),    deger: pm(ozet.toplamBorc),    renk: '#ef4444', icon: '💳', sayfa: 'borclar' },
  { baslik: t('netVarlik'),     deger: pm(ozet.netVarlik),     renk: (ozet.netVarlik || 0) >= 0 ? '#0d9488' : '#ef4444', icon: '⚖️', sayfa: null },
]

  return (
    <div>
      <div style={{ 
  ...styles.kartGrid, 
  gridTemplateColumns: window.innerWidth < 480 ? '1fr 1fr' : window.innerWidth < 768 ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)'
}}>
{kartlar.map((kart, i) => (
  <div key={i}
    style={{
      ...styles.kart,
      borderTop: `3px solid ${kart.renk}`,
      cursor: kart.sayfa ? 'pointer' : 'default'
    }}
    onClick={() => kart.sayfa && setAktifSayfa(kart.sayfa)}>
            <div style={styles.kartIcon}>{kart.icon}</div>
            <div style={{ ...styles.kartDeger, color: kart.renk }}>{kart.deger}</div>
            <div style={styles.kartBaslik}>{kart.baslik}</div>
          </div>
        ))}
      </div>

      <div style={styles.altGrid}>
        <div style={styles.panel}>
          <h3 style={styles.panelBaslik}>{t('sonIslemler')}</h3>
          {sonIslemler.length === 0 ? (
            <p style={styles.bosMetin}>Henüz işlem yok.</p>
          ) : sonIslemler.map(islem => (
            <div key={islem.id} style={styles.islemSatir}>
              <div style={{ ...styles.badge, background: (turRenk[islem.tur] || '#a8a8b3') + '22', color: turRenk[islem.tur] || '#a8a8b3' }}>
                {turLabel[islem.tur] || islem.tur}
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.islemAd}>{islem.aciklama || islem.kategori}</div>
                <div style={styles.islemTarih}>{islem.tarih} · {islem.hesaplar?.ad}</div>
              </div>
              <div style={{ color: islem.tur === 'gelir' ? '#0d9488' : '#ef4444', fontWeight: 'bold', fontSize: '14px' }}>
                {gizliMod ? '₺ ****' : `${islem.tur === 'gelir' ? '+' : '-'}₺${parseFloat(islem.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.panel}>
          <h3 style={styles.panelBaslik}>{t('hesapBakiyeleri')}</h3>
          {hesaplar.length === 0 ? (
            <p style={styles.bosMetin}>Henüz hesap yok.</p>
          ) : hesaplar.map(hesap => (
            <div key={hesap.id} style={styles.hesapSatir}>
              <div style={styles.hesapAd}>{hesap.ad}</div>
              <div style={styles.hesapTur}>{hesap.tur}</div>
              <div style={{ color: parseFloat(hesap.bakiye) < 0 ? '#ef4444' : '#0d9488', fontWeight: 'bold', fontSize: '14px' }}>
                {gizliMod ? '****' : `${hesap.para_birimi === 'TRY' ? '₺' : hesap.para_birimi + ' '}${parseFloat(hesap.bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
function YakindaGelecek({ baslik }) {
  return (
    <div style={styles.yakinda}>
      <div style={styles.yakindaIcon}>🚧</div>
      <h2 style={styles.yakindaBaslik}>{baslik} sayfası</h2>
      <p style={styles.yakindaMetin}>Bu bölüm yakında eklenecek.</p>
    </div>
  )
}

const styles = {
wrapper: {
  display: 'flex',
  minHeight: '100vh',
  background: 'var(--bg-primary)',
  fontFamily: "'Segoe UI', sans-serif",
  width: '100%',
  overflowX: 'hidden',
},
  sidebar: {
    width: '240px',
    background: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    position: 'fixed',
    height: '100vh',
    boxSizing: 'border-box',
    boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px',
  },
  logoIcon: {
    width: 32, height: 32,
    borderRadius: '9px',
    background: 'rgba(13,148,136,0.08)',
    border: '1px solid rgba(13,148,136,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  logo: {
    color: 'var(--accent)',
    fontSize: '14px',
    fontWeight: '700',
    lineHeight: 1.2,
  },
  logoAlt: {
    color: 'var(--text-muted)',
    fontSize: '9px',
    letterSpacing: '0.5px',
    fontWeight: 500,
  },
  userInfo: {
    textAlign: 'center',
    marginBottom: '24px',
    marginTop: '8px',
    padding: '10px 8px',
    background: 'var(--bg-subtle)',
    borderRadius: '10px',
    border: '1px solid var(--border)',
  },
  kullaniciAd: {
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '2px',
  },
  kullaniciEmail: {
    color: 'var(--text-muted)',
    fontSize: '10px',
    letterSpacing: '0.2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '180px',
    margin: '0 auto',
  },
  nkodeBranding: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--text-muted)',
    fontSize: '10px',
    letterSpacing: '0.4px',
    marginTop: '12px',
    justifyContent: 'center',
  },
  nkodeDot: {
    width: 5, height: 5, borderRadius: '50%',
    background: '#0d9488', opacity: 0.6,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  menuItemAktif: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    background: 'rgba(13,148,136,0.1)',
    border: 'none',
    borderRadius: '10px',
    color: 'var(--accent)',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    fontWeight: 'bold',
  },
  menuIcon: { fontSize: '18px' },
  gizliBtn: {
    padding: '10px 12px',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'pointer',
    marginBottom: '8px',
    width: '100%',
    textAlign: 'left',
  },
  gizliBtnAktif: {
    padding: '10px 12px',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.35)',
    borderRadius: '10px',
    color: '#ef4444',
    fontSize: '13px',
    cursor: 'pointer',
    marginBottom: '8px',
    width: '100%',
    textAlign: 'left',
    fontWeight: '600',
  },
  cikisBtn: {
    padding: '12px',
    background: 'rgba(239,68,68,0.06)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '10px',
    color: '#ef4444',
    fontSize: '14px',
    cursor: 'pointer',
  },
content: {
  flex: 1,
  padding: '16px',
  minHeight: '100vh',
  boxSizing: 'border-box',
  width: '100%',
  overflowX: 'hidden',
  minWidth: 0,
},
header: {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
  flexWrap: 'wrap',
  gap: '8px',
},
pageTitle: {
  color: 'var(--text-primary)',
  fontSize: '20px',
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
},
  tarih: {
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  pageContent: {},
kartGrid: {
  display: 'grid',
  gridTemplateColumns: window.innerWidth < 768 ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
  gap: '12px',
  marginBottom: '24px',
},
kart: {
  background: 'var(--bg-card)',
  borderRadius: '14px',
  padding: window.innerWidth < 768 ? '12px 10px' : '20px',
  textAlign: 'center',
  boxShadow: 'var(--shadow-sm)',
  border: '1px solid var(--border-light)',
},
kartIcon: {
  fontSize: window.innerWidth < 768 ? '18px' : '24px',
  marginBottom: window.innerWidth < 768 ? '4px' : '10px'
},
kartDeger: {
  color: '#0f172a',
  fontSize: window.innerWidth < 768 ? '13px' : '20px',
  fontWeight: 'bold',
  marginBottom: '4px'
},
kartBaslik: {
  color: '#64748b',
  fontSize: window.innerWidth < 768 ? '10px' : '12px'
},
altGrid: {
  display: 'grid',
  gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr',
  gap: '16px',
},
  panel: {
    background: 'var(--bg-card)',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-light)',
  },
  panelBaslik: {
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontWeight: '600',
    margin: '0 0 16px 0',
  },
  bosMetin: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    textAlign: 'center',
    padding: '24px 0',
  },
  yakinda: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
  },
  yakindaIcon: { fontSize: '48px', marginBottom: '16px' },
  yakindaBaslik: { color: '#0f172a', fontSize: '22px', margin: '0 0 8px 0' },
  yakindaMetin: { color: '#64748b', fontSize: '15px' },
  overlay: {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  zIndex: 999,
},
hamburger: {
  background: 'none',
  border: 'none',
  color: '#0f172a',
  fontSize: '24px',
  cursor: 'pointer',
  marginRight: '16px',
  padding: '4px 8px',
},

  islemSatir: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-light)' },
  badge: { padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  islemAd: { color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500' },
  islemTarih: { color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' },
  hesapSatir: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-light)' },
  hesapAd: { color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', flex: 1 },
  hesapTur: { color: 'var(--text-muted)', fontSize: '11px' },
}

export default Dashboard