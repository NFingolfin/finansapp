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
    { id: 'ozet', label: 'Genel Özet', icon: '📊' },
    { id: 'hesaplar', label: 'Hesaplar', icon: '🏦' },
    { id: 'islemler', label: 'İşlemler', icon: '💸' },
    { id: 'yatirimlar', label: 'Yatırımlar', icon: '📈' },
    { id: 'hedefler', label: 'Hedefler', icon: '🎯' },
    { id: 'borclar', label: 'Borçlar', icon: '💳' },
    { id: 'raporlar', label: 'Raporlar', icon: '📋' },
    { id: 'hesabim', label: 'Hesabım', icon: '👤' },
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

        <button style={styles.cikisBtn} onClick={handleCikis}>
          🚪 Çıkış Yap
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
  {!mobil && (
    <div style={styles.tarih}>
      {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  )}
</div>

        <div style={styles.pageContent}>
          {aktifSayfa === 'ozet' && <OzetSayfasi session={session} mobil={mobil} />}
          {aktifSayfa === 'hesaplar' && <Hesaplar session={session} mobil={mobil} />}
          {aktifSayfa === 'islemler' && <Islemler session={session} mobil={mobil} />}
          {aktifSayfa === 'yatirimlar' && <Yatirimlar session={session} mobil={mobil} />}
          {aktifSayfa === 'borclar' && <Borclar session={session} mobil={mobil} />}
          {aktifSayfa === 'hedefler' && <Hedefler session={session} mobil={mobil} />}
          {aktifSayfa === 'raporlar' && <Raporlar session={session} mobil={mobil} />}
          {aktifSayfa === 'hesabim' && <Hesabim session={session} mobil={mobil} onProfilGuncellendi={profilGetir} />}
        </div>
      </div>
    </div>
  )
}

function OzetSayfasi({ session }) {
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
    { baslik: 'Toplam Varlık', deger: '₺' + (ozet.toplamVarlik || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }), renk: '#0d9488', icon: '💎' },
    { baslik: 'Toplam Nakit', deger: '₺' + (ozet.toplamNakit || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }), renk: '#0ea5e9', icon: '💵' },
    { baslik: 'Toplam Yatırım', deger: '₺' + (ozet.toplamYatirim || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }), renk: '#eab308', icon: '📈' },
    { baslik: 'Toplam Borç', deger: '₺' + (ozet.toplamBorc || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }), renk: '#ef4444', icon: '💳' },
    { baslik: 'Net Varlık', deger: '₺' + (ozet.netVarlik || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }), renk: (ozet.netVarlik || 0) >= 0 ? '#0d9488' : '#ef4444', icon: '⚖️' },
  ]

  return (
    <div>
      <div style={{ 
  ...styles.kartGrid, 
  gridTemplateColumns: window.innerWidth < 480 ? '1fr 1fr' : window.innerWidth < 768 ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)'
}}>
        {kartlar.map((kart, i) => (
          <div key={i} style={{ ...styles.kart, borderTop: `3px solid ${kart.renk}` }}>
            <div style={styles.kartIcon}>{kart.icon}</div>
            <div style={{ ...styles.kartDeger, color: kart.renk }}>{kart.deger}</div>
            <div style={styles.kartBaslik}>{kart.baslik}</div>
          </div>
        ))}
      </div>

      <div style={styles.altGrid}>
        <div style={styles.panel}>
          <h3 style={styles.panelBaslik}>Son İşlemler</h3>
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
                {islem.tur === 'gelir' ? '+' : '-'}₺{parseFloat(islem.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.panel}>
          <h3 style={styles.panelBaslik}>Hesap Bakiyeleri</h3>
          {hesaplar.length === 0 ? (
            <p style={styles.bosMetin}>Henüz hesap yok.</p>
          ) : hesaplar.map(hesap => (
            <div key={hesap.id} style={styles.hesapSatir}>
              <div style={styles.hesapAd}>{hesap.ad}</div>
              <div style={styles.hesapTur}>{hesap.tur}</div>
              <div style={{ color: parseFloat(hesap.bakiye) < 0 ? '#ef4444' : '#0d9488', fontWeight: 'bold', fontSize: '14px' }}>
                {hesap.para_birimi === 'TRY' ? '₺' : hesap.para_birimi + ' '}
                {parseFloat(hesap.bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
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
  background: '#f1f5f9',
  fontFamily: "'Segoe UI', sans-serif",
  width: '100%',
  overflowX: 'hidden',
},
  sidebar: {
    width: '240px',
    background: '#ffffff',
    borderRight: '1px solid #e2e8f0',
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
    color: '#0d9488',
    fontSize: '14px',
    fontWeight: '700',
    lineHeight: 1.2,
  },
  logoAlt: {
    color: 'rgba(13,148,136,0.55)',
    fontSize: '9px',
    letterSpacing: '0.5px',
    fontWeight: 500,
  },
  userInfo: {
    textAlign: 'center',
    marginBottom: '24px',
    marginTop: '8px',
    padding: '10px 8px',
    background: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  kullaniciAd: {
    color: '#1e293b',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '2px',
  },
  kullaniciEmail: {
    color: '#94a3b8',
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
    color: '#94a3b8',
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
    color: '#64748b',
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
    background: 'rgba(13,148,136,0.08)',
    border: 'none',
    borderRadius: '10px',
    color: '#0d9488',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    fontWeight: 'bold',
  },
  menuIcon: { fontSize: '18px' },
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
  color: '#0f172a',
  fontSize: '20px',
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
},
  tarih: {
    color: '#94a3b8',
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
  background: '#ffffff',
  borderRadius: '14px',
  padding: window.innerWidth < 768 ? '12px 10px' : '20px',
  textAlign: 'center',
  boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
  border: '1px solid #f1f5f9',
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
    background: '#ffffff',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    border: '1px solid #f1f5f9',
  },
  panelBaslik: {
    color: '#0f172a',
    fontSize: '15px',
    fontWeight: '600',
    margin: '0 0 16px 0',
  },
  bosMetin: {
    color: '#94a3b8',
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

  islemSatir: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
  badge: { padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  islemAd: { color: '#0f172a', fontSize: '13px', fontWeight: '500' },
  islemTarih: { color: '#94a3b8', fontSize: '11px', marginTop: '2px' },
  hesapSatir: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
  hesapAd: { color: '#0f172a', fontSize: '13px', fontWeight: '500', flex: 1 },
  hesapTur: { color: '#94a3b8', fontSize: '11px' },
}

export default Dashboard