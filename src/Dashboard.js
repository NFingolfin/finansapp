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
import {
  LayoutDashboard, WalletCards, ReceiptText, TrendingUp, Target,
  CreditCard, BarChart3, UserRound, LogOut, Eye, EyeOff,
  Moon, Sun, Menu, X
} from 'lucide-react'

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

  useEffect(() => { profilGetir() }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
  const initials = displayName.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()

  const menuItems = [
    { id: 'ozet',      label: t('genelOzet'),  icon: LayoutDashboard },
    { id: 'hesaplar',  label: t('hesaplar'),   icon: WalletCards },
    { id: 'islemler',  label: t('islemler'),   icon: ReceiptText },
    { id: 'yatirimlar',label: t('yatirimlar'), icon: TrendingUp },
    { id: 'hedefler',  label: t('hedefler'),   icon: Target },
    { id: 'borclar',   label: t('borclar'),    icon: CreditCard },
    { id: 'raporlar',  label: t('raporlar'),   icon: BarChart3 },
    { id: 'hesabim',   label: t('hesabim'),    icon: UserRound },
  ]
  const pageDescriptions = {
    ozet: 'Finansal durumunuza genel bir bakış.',
    hesaplar: 'Tüm hesaplarınızı ve bakiyelerinizi yönetin.',
    islemler: 'Gelir, gider ve transfer hareketlerinizi takip edin.',
    yatirimlar: 'Portföyünüzü ve yatırım performansınızı izleyin.',
    hedefler: 'Finansal hedeflerinizi planlayın ve ilerlemenizi görün.',
    borclar: 'Tüm borçlarınızı yönetin, ödemelerinizi planlayın.',
    raporlar: 'Finansal hareketlerinizi detaylı olarak analiz edin.',
    hesabim: 'Profil ve uygulama tercihlerinizi yönetin.',
  }

  return (
    <div style={styles.wrapper} className="app-shell">
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
<div className="app-sidebar" style={{
  ...styles.sidebar,
  position: 'fixed',
  top: 0,
  left: 0,
  height: '100vh',
  transform: mobil ? (menuAcik ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
  transition: 'transform 0.3s ease',
  zIndex: 999,
}}>
        <div style={styles.logoWrap} className="app-logo-block">
          <FinkodLogo size={32} uid="s" />
          <div>
            <div style={styles.logo}>Finkod Cüzdan</div>
            <div style={styles.logoAlt}>by NKode Solutions</div>
          </div>
        </div>
        <nav style={styles.nav}>
          {menuItems.map(item => {
            const Icon = item.icon
            return (
            <button
              key={item.id}
              className={`app-nav-item${aktifSayfa === item.id ? ' is-active' : ''}`}
              style={aktifSayfa === item.id ? styles.menuItemAktif : styles.menuItem}
              onClick={() => { setAktifSayfa(item.id); if (mobil) setMenuAcik(false) }}
            >
              <Icon size={18} strokeWidth={1.8} />
              {item.label}
            </button>
          )})}
        </nav>

        <button
          style={gizliMod ? styles.gizliBtnAktif : styles.gizliBtn}
          onClick={gizliModToggle}
        >
          {gizliMod ? <Eye size={16} /> : <EyeOff size={16} />} {gizliMod ? t('degerleriGoster') : t('degerleriGizle')}
        </button>
        <button style={styles.cikisBtn} onClick={handleCikis}>
          <LogOut size={16} /> {t('cikisYap')}
        </button>
        <div style={styles.nkodeBranding}>
          <div style={styles.nkodeDot} />
          NKode Solutions
        </div>
      </div>

      {/* Ana İçerik */}
<div style={{
  ...styles.content,
  marginLeft: mobil ? '0' : '260px',
  width: mobil ? '100%' : 'calc(100% - 260px)',
  overflow: 'hidden',
  boxSizing: 'border-box',
}}>
<div style={styles.header} className="app-topbar">
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    {mobil && (
      <button
        style={styles.hamburger}
        onClick={() => setMenuAcik(!menuAcik)}>
        {menuAcik ? <X size={22} /> : <Menu size={22} />}
      </button>
    )}
    <div style={styles.topbarHeading}>
      <h1 style={styles.topbarTitle}>{menuItems.find(m => m.id === aktifSayfa)?.label}</h1>
      {!mobil && <p style={styles.topbarSubtitle}>{pageDescriptions[aktifSayfa]}</p>}
    </div>
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
      {tema === 'light' ? <Moon size={17} /> : <Sun size={17} />}
    </button>
    <button style={styles.headerUser} onClick={() => setAktifSayfa('hesabim')} aria-label="Hesabım sayfasına git">
      <span style={styles.headerAvatar}>{initials}</span>
      {!mobil && <span style={styles.headerUserText}><strong>{displayName}</strong><small>{session.user.email}</small></span>}
    </button>
  </div>
</div>

        <div style={styles.pageContent} className="app-page">
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
  const pm = (val) => gizliMod ? '₺ ****' : '₺' + parseFloat(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const { t } = useLang()
  const [ozet, setOzet] = useState({
    toplamNakit: 0,
    toplamYatirim: 0,
    toplamBorc: 0,
    yatirimDeger: 0,
  })
  const [hesaplar, setHesaplar] = useState([])
  const [yatirimlar, setYatirimlar] = useState([])
  const [dovizKurlar, setDovizKurlar] = useState({ TRY: 1, USD: 1, EUR: 1, GBP: 1 })
  const [hoveredPortfoy, setHoveredPortfoy] = useState(null)
  const [pinnedPortfoy, setPinnedPortfoy] = useState(null)

  useEffect(() => {
    verileriGetir()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const verileriGetir = async () => {
    const { data: hesapData } = await supabase.from('hesaplar').select('*').eq('user_id', session.user.id)
    const { data: yatirimData } = await supabase.from('yatirimlar').select('*').eq('user_id', session.user.id)
    const { data: borcData } = await supabase.from('borclar').select('*').eq('user_id', session.user.id).eq('aktif', true)

    // yatirim_toplam DB'de yok, yatirimlar üzerinden hesapla
    const hesaplarWithYatirim = (hesapData || []).map(h => {
      const yatirimToplam = (yatirimData || [])
        .filter(y => y.hesap_id === h.id)
        .reduce((a, y) => a + parseFloat(y.guncel_deger || 0), 0)
      return { ...h, yatirim_toplam: yatirimToplam }
    })
    if (hesapData) setHesaplar(hesaplarWithYatirim)
    if (yatirimData) setYatirimlar(yatirimData)

    // Güncel döviz kurlarını çek
    let kurlar = { TRY: 1, USD: 1, EUR: 1, GBP: 1 }
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      const dovizData = await res.json()
      const usdTry = dovizData.rates?.TRY || 1
      kurlar = {
        TRY: 1,
        USD: usdTry,
        EUR: usdTry / (dovizData.rates?.EUR || 1),
        GBP: usdTry / (dovizData.rates?.GBP || 1),
      }
      setDovizKurlar(kurlar)
    } catch (e) {}

    const kur = (pb) => kurlar[pb] || 1

    // Tüm yatırımlar TRY karşılığına çevrilmiş
    const yatirimToplam = (yatirimData || [])
      .reduce((a, y) => a + parseFloat(y.guncel_deger) * kur(y.para_birimi), 0)

    // Nakit: tüm hesapların bakiyesi TRY'ye çevrilmiş (Kredi Kartı ve Borç türü hariç)
    const toplamNakit = (hesapData || [])
      .filter(h => h.tur !== 'Kredi Kartı' && h.tur !== 'Borç')
      .reduce((a, h) => a + parseFloat(h.bakiye) * kur(h.para_birimi), 0)

    // Toplam borç
    const toplamBorc = (borcData || [])
      .reduce((a, b) => a + parseFloat(b.kalan_borc), 0)

    // Toplam varlık = nakit + yatırım değeri
    const toplamVarlik = toplamNakit + yatirimToplam

    // Net varlık = toplam varlık - borç
    const netVarlik = toplamVarlik - toplamBorc

    setOzet({ toplamNakit, toplamYatirim: yatirimToplam, toplamBorc, toplamVarlik, netVarlik })
  }

  const turRenkMap = {
    'Hisse': '#213f5b', 'Kripto': '#3f6577', 'Fon': '#557d90',
    'Döviz': '#7393a3', 'Altın': '#8da8b5', 'BES': '#a5bac4', 'Diğer': '#bdcbd2',
    'Nakit': '#6f8fa2',
  }

const kartlar = [
  { baslik: t('toplamVarlik'),  deger: pm(ozet.toplamVarlik), icon: '₺', sayfa: 'hesaplar' },
  { baslik: t('toplamNakit'),   deger: pm(ozet.toplamNakit), icon: '₺', sayfa: 'hesaplar' },
  { baslik: t('toplamYatirim'), deger: pm(ozet.toplamYatirim), icon: '↗', sayfa: 'yatirimlar' },
  { baslik: t('toplamBorc'),    deger: pm(ozet.toplamBorc), icon: '−', sayfa: 'borclar' },
  { baslik: t('netVarlik'),     deger: pm(ozet.netVarlik), icon: '=', sayfa: null },
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
      ...(i === kartlar.length - 1 ? styles.netKart : {}),
      cursor: kart.sayfa ? 'pointer' : 'default'
    }}
    onClick={() => kart.sayfa && setAktifSayfa(kart.sayfa)}>
            <div style={{ ...styles.kartIcon, ...(i === kartlar.length - 1 ? styles.netKartMetin : {}) }}>{kart.icon}</div>
            <div style={{ ...styles.kartDeger, ...(i === kartlar.length - 1 ? styles.netKartMetin : {}) }}>{kart.deger}</div>
            <div style={{ ...styles.kartBaslik, ...(i === kartlar.length - 1 ? styles.netKartAlt : {}) }}>{kart.baslik}</div>
          </div>
        ))}
      </div>

      <div style={styles.altGrid}>
        <div style={styles.panel} onClick={() => setPinnedPortfoy(null)}>
          <h3 style={styles.panelBaslik}>Portföy Dağılımı</h3>
          {(() => {
            const turGruplar = {}
            const detailsMap = {}
            // Nakit detayı
            detailsMap['Nakit'] = hesaplar
              .filter(h => h.tur !== 'Kredi Kartı' && h.tur !== 'Borç')
              .map(h => {
                const kur = dovizKurlar[h.para_birimi] || 1
                // Yatırım hesapları için sadece nakit bakiye (yatirim_toplam hariç)
                return { ad: h.ad, deger: parseFloat(h.bakiye) * kur, karPct: null }
              })
              .filter(h => h.deger > 0)

            for (const y of yatirimlar) {
              const kur = dovizKurlar[y.para_birimi] || 1
              const deger = parseFloat(y.guncel_deger || 0) * kur
              if (deger <= 0) continue
              const maliyet = parseFloat(y.maliyet || 0) * kur
              const kar = deger - maliyet
              const karPct = maliyet > 0 ? ((kar / maliyet) * 100).toFixed(1) : null
              turGruplar[y.tur] = (turGruplar[y.tur] || 0) + deger
              if (!detailsMap[y.tur]) detailsMap[y.tur] = []
              detailsMap[y.tur].push({ ad: y.ad, deger, karPct })
            }

            const pieData = [
              ...(ozet.toplamNakit > 0 ? [{ label: 'Nakit', value: ozet.toplamNakit }] : []),
              ...Object.entries(turGruplar).map(([label, value]) => ({ label, value })),
            ].sort((a, b) => b.value - a.value)
            const total = pieData.reduce((s, d) => s + d.value, 0)
            if (total === 0) return <p style={styles.bosMetin}>Henüz varlık yok.</p>

            let cumAngle = -Math.PI / 2
            const slices = pieData.map((d) => {
              const sweep = (d.value / total) * 2 * Math.PI
              const start = cumAngle; cumAngle += sweep; const end = cumAngle
              const r = 80, cx = 100, cy = 100
              const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
              const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end)
              const large = sweep > Math.PI ? 1 : 0
              const path = sweep >= 2 * Math.PI - 0.001
                ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`
                : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
              return { ...d, path, color: turRenkMap[d.label] || '#94a3b8', pct: ((d.value / total) * 100).toFixed(1) }
            })

            const activeLabel = pinnedPortfoy || hoveredPortfoy
            const activeSlice = slices.find(s => s.label === activeLabel)
            const activeDetails = activeLabel ? (detailsMap[activeLabel] || []) : []

            const handleClick = (e, label) => {
              e.stopPropagation()
              setPinnedPortfoy(prev => prev === label ? null : label)
            }

            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <svg viewBox="0 0 200 200" width="170" height="170">
                    {slices.map((s, i) => (
                      <path key={i} d={s.path} fill={s.color} stroke="var(--bg-card)" strokeWidth="3"
                        style={{ opacity: activeLabel && activeLabel !== s.label ? 0.35 : 1, transition: 'opacity 0.18s', cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredPortfoy(s.label)}
                        onMouseLeave={() => setHoveredPortfoy(null)}
                        onClick={(e) => handleClick(e, s.label)} />
                    ))}
                    <circle cx="100" cy="100" r="48" fill="var(--bg-card)" style={{ pointerEvents: 'none' }} />
                    <text x="100" y="104" textAnchor="middle" fill={activeSlice?.color || 'var(--text-primary)'} fontSize="11" fontWeight="700" style={{ pointerEvents: 'none' }}>
                      {activeSlice ? `${activeSlice.pct}%` : (gizliMod ? '₺ ****' : `₺${total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
                    </text>
                  </svg>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={e => e.stopPropagation()}>
                  {slices.map((s, i) => (
                    <div key={i}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', padding: '5px 7px', borderRadius: '8px', cursor: 'pointer', background: activeLabel === s.label ? `${s.color}18` : 'transparent', outline: pinnedPortfoy === s.label ? `1.5px solid ${s.color}60` : 'none', transition: 'background 0.15s' }}
                      onMouseEnter={() => setHoveredPortfoy(s.label)}
                      onMouseLeave={() => setHoveredPortfoy(null)}
                      onClick={(e) => handleClick(e, s.label)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: s.color, flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-primary)', fontWeight: activeLabel === s.label ? '600' : '400' }}>{s.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{gizliMod ? '₺ ****' : `₺${s.value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '600', minWidth: '40px', textAlign: 'right' }}>{s.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {activeLabel && activeDetails.length > 0 && (
                  <div style={{ marginTop: '10px', padding: '10px', background: 'var(--bg-input)', borderRadius: '10px', border: `1px solid ${activeSlice?.color || 'var(--border)'}40` }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{activeLabel} · Detay</span>
                      {pinnedPortfoy === activeLabel && (
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', padding: '0 2px' }}
                          onClick={(e) => { e.stopPropagation(); setPinnedPortfoy(null) }}>✕</button>
                      )}
                    </div>
                    {activeDetails.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 0', borderBottom: i < activeDetails.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{item.ad}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{gizliMod ? '₺ ****' : `₺${item.deger.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                          {item.karPct !== null && (
                            <span style={{ color: parseFloat(item.karPct) >= 0 ? '#0d9488' : '#ef4444', minWidth: '44px', textAlign: 'right' }}>
                              {parseFloat(item.karPct) >= 0 ? '+' : ''}{item.karPct}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        <div style={styles.panel}>
          <h3 style={styles.panelBaslik}>{t('hesapBakiyeleri')}</h3>
          {hesaplar.length === 0 ? (
            <p style={styles.bosMetin}>Henüz hesap yok.</p>
          ) : hesaplar.map(hesap => {
            const yatirimToplam = parseFloat(hesap.yatirim_toplam || 0)
            const bakiye = parseFloat(hesap.bakiye || 0)
            const gosterilen = (hesap.yatirim_hesabi && yatirimToplam > 0) ? bakiye + yatirimToplam : bakiye
            const sembol = hesap.para_birimi === 'TRY' ? '₺' : hesap.para_birimi + ' '
            return (
              <div key={hesap.id} className="balance-row" style={styles.hesapSatir}>
                <div style={styles.hesapAd}>{hesap.ad}</div>
                <div style={styles.hesapSag}>
                  <div style={{ color: gosterilen < 0 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: '700', fontSize: '14px' }}>
                    {gizliMod ? '****' : `${sembol}${gosterilen.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </div>
                  <div style={styles.hesapTur}>{hesap.tur}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
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
    width: '260px',
    background: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '22px 18px',
    position: 'fixed',
    height: '100vh',
    boxSizing: 'border-box',
    boxShadow: 'none',
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
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontWeight: '750',
    lineHeight: 1.2,
  },
  logoAlt: {
    color: 'var(--text-muted)',
    fontSize: '9px',
    letterSpacing: '0.5px',
    fontWeight: 500,
  },
  userInfo: {
    display: 'flex', alignItems: 'center', gap: '11px',
    textAlign: 'left', marginBottom: '24px', marginTop: '8px',
    padding: '10px 2px', background: 'transparent', border: 'none',
  },
  userAvatar: { width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#9bb9bd', color: '#fff', fontSize: '13px', fontWeight: '650', letterSpacing: '.03em' },
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
    margin: 0,
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
    background: 'linear-gradient(135deg, #6e9ca3, #8cbcc1)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    fontWeight: '650',
  },
  menuIcon: { fontSize: '18px' },
  gizliBtn: {
    display: 'flex', alignItems: 'center', gap: '9px',
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
    display: 'flex', alignItems: 'center', gap: '9px',
    padding: '10px 12px',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.35)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    cursor: 'pointer',
    marginBottom: '8px',
    width: '100%',
    textAlign: 'left',
    fontWeight: '600',
  },
  cikisBtn: {
    display: 'flex', alignItems: 'center', gap: '9px',
    padding: '12px',
    background: 'rgba(239,68,68,0.06)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    cursor: 'pointer',
  },
content: {
  flex: 1,
  padding: '0',
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
  marginBottom: '0',
  minHeight: '76px',
  padding: '0 34px',
  background: 'color-mix(in srgb, var(--surface) 91%, transparent)',
  borderBottom: '1px solid var(--border)',
  flexWrap: 'wrap',
  gap: '8px',
},
topbarHeading: { display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 },
topbarTitle: { margin: 0, color: 'var(--text-primary)', fontSize: '21px', lineHeight: 1.2, fontWeight: '750', letterSpacing: '-.025em' },
topbarSubtitle: { margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '11px', lineHeight: 1.2 },
headerUser: { display: 'flex', alignItems: 'center', gap: '9px', height: '44px', padding: '4px 9px 4px 5px', background: 'transparent', border: '1px solid transparent', borderRadius: '11px', cursor: 'pointer', textAlign: 'left' },
headerAvatar: { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#8fb0b5', color: '#fff', fontSize: '11px', fontWeight: '700', flexShrink: 0 },
headerUserText: { display: 'flex', flexDirection: 'column', minWidth: 0, color: 'var(--text-primary)' },
contentHeading: { marginBottom: '26px' },
contentTitle: { margin: 0, color: 'var(--text-primary)', fontSize: '28px', fontWeight: '750', letterSpacing: '-.035em' },
contentSubtitle: { margin: '7px 0 0', color: 'var(--text-muted)', fontSize: '14px' },
pageTitle: {
  color: 'var(--text-primary)',
  fontSize: '22px',
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
},
  tarih: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    display: 'flex', alignItems: 'center', gap: '7px',
  },
  pageContent: { padding: '22px 34px 72px' },
kartGrid: {
  display: 'grid',
  gridTemplateColumns: window.innerWidth < 768 ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
  gap: '16px',
  marginBottom: '22px',
},
kart: {
  background: 'var(--bg-card)',
  borderRadius: '14px',
  padding: window.innerWidth < 768 ? '16px 14px' : '20px',
  textAlign: 'left',
  boxShadow: 'none',
  border: '1px solid var(--border)',
  minHeight: '132px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
},
netKart: { background: 'linear-gradient(135deg, #6faeb3 0%, #2d6482 100%)', border: 'none', boxShadow: '0 10px 24px rgba(45,100,130,.18)' },
netKartMetin: { color: '#fff' },
netKartAlt: { color: 'rgba(255,255,255,.78)' },
kartIcon: {
  fontSize: window.innerWidth < 768 ? '17px' : '20px',
  marginBottom: window.innerWidth < 768 ? '8px' : '15px', color: 'var(--text-primary)', fontWeight: '600'
},
kartDeger: {
  color: 'var(--text-primary)',
  fontSize: window.innerWidth < 768 ? '15px' : '20px',
  fontWeight: '750',
  marginBottom: '6px',
  letterSpacing: '-.025em'
},
kartBaslik: {
  color: 'var(--text-muted)',
  fontSize: window.innerWidth < 768 ? '10px' : '12px',
  fontWeight: '550'
},
altGrid: {
  display: 'grid',
  gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr',
  gap: '18px',
  alignItems: 'stretch',
},
  panel: {
    background: 'var(--bg-card)',
    borderRadius: '14px',
    padding: '22px',
    boxShadow: 'none',
    border: '1px solid var(--border)', minHeight: '360px',
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
  color: 'var(--text-primary)',
  fontSize: '24px',
  cursor: 'pointer',
  marginRight: '16px',
  padding: '4px 8px',
},

  islemSatir: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' },
  badge: { padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  islemAd: { color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500' },
  islemTarih: { color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' },
  hesapSatir: { display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 9px', borderRadius: '9px', transition: 'background .16s ease' },
  hesapAd: { color: 'var(--text-primary)', fontSize: '13px', fontWeight: '550', flex: 1 },
  hesapSag: { textAlign: 'right', minWidth: '120px' },
  hesapTur: { color: 'var(--text-muted)', fontSize: '10px', marginTop: '3px' },
}

export default Dashboard
