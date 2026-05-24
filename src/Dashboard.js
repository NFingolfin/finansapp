import { useState } from 'react'
import { useEffect } from 'react'
import { supabase } from './supabase'
import Hesaplar from './Hesaplar'
import Islemler from './Islemler'
import Yatirimlar from './Yatirimlar'
import Borclar from './Borclar'
import Hedefler from './Hedefler'
import Raporlar from './Raporlar'


function Dashboard({ session }) {
  const [aktifSayfa, setAktifSayfa] = useState('ozet')

  const handleCikis = async () => {
    await supabase.auth.signOut()
  }

  const menuItems = [
    { id: 'ozet', label: 'Genel Özet', icon: '📊' },
    { id: 'hesaplar', label: 'Hesaplar', icon: '🏦' },
    { id: 'islemler', label: 'İşlemler', icon: '💸' },
    { id: 'yatirimlar', label: 'Yatırımlar', icon: '📈' },
    { id: 'hedefler', label: 'Hedefler', icon: '🎯' },
    { id: 'borclar', label: 'Borçlar', icon: '💳' },
    { id: 'raporlar', label: 'Raporlar', icon: '📋' },

    
  ]

  return (
    <div style={styles.wrapper}>
      {/* Sol Menü */}
      <div style={styles.sidebar}>
        <div style={styles.logo}>💰 FinansApp</div>
        <div style={styles.userInfo}>{session.user.email.split('@')[0]}</div>

        <nav style={styles.nav}>
          {menuItems.map(item => (
            <button
              key={item.id}
              style={aktifSayfa === item.id ? styles.menuItemAktif : styles.menuItem}
              onClick={() => setAktifSayfa(item.id)}
            >
              <span style={styles.menuIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button style={styles.cikisBtn} onClick={handleCikis}>
          🚪 Çıkış Yap
        </button>
      </div>

      {/* Ana İçerik */}
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.pageTitle}>
            {menuItems.find(m => m.id === aktifSayfa)?.icon}{' '}
            {menuItems.find(m => m.id === aktifSayfa)?.label}
          </h1>
          <div style={styles.tarih}>
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div style={styles.pageContent}>
          {aktifSayfa === 'ozet' && <OzetSayfasi session={session} />}
          {aktifSayfa === 'hesaplar' && <Hesaplar session={session} />}
          {aktifSayfa === 'islemler' && <Islemler session={session} />}
          {aktifSayfa === 'yatirimlar' && <Yatirimlar session={session} />}
          {aktifSayfa === 'borclar' && <Borclar session={session} />}
          {aktifSayfa === 'hedefler' && <Hedefler session={session} />}
          {aktifSayfa === 'raporlar' && <Raporlar session={session} />}
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

  const turRenk = { gelir: '#4ecca3', gider: '#ff6b6b', transfer: '#45b7d1' }
  const turLabel = { gelir: 'Gelir', gider: 'Gider', transfer: 'Transfer' }

  const kartlar = [
    { baslik: 'Toplam Varlık', deger: '₺' + (ozet.toplamVarlik || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }), renk: '#4ecca3', icon: '💎' },
    { baslik: 'Toplam Nakit', deger: '₺' + (ozet.toplamNakit || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }), renk: '#45b7d1', icon: '💵' },
    { baslik: 'Toplam Yatırım', deger: '₺' + (ozet.toplamYatirim || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }), renk: '#ffd93d', icon: '📈' },
    { baslik: 'Toplam Borç', deger: '₺' + (ozet.toplamBorc || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }), renk: '#ff6b6b', icon: '💳' },
    { baslik: 'Net Varlık', deger: '₺' + (ozet.netVarlik || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }), renk: (ozet.netVarlik || 0) >= 0 ? '#4ecca3' : '#ff6b6b', icon: '⚖️' },
  ]

  return (
    <div>
      <div style={{ ...styles.kartGrid, gridTemplateColumns: 'repeat(5, 1fr)' }}>
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
              <div style={{ color: islem.tur === 'gelir' ? '#4ecca3' : '#ff6b6b', fontWeight: 'bold', fontSize: '14px' }}>
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
              <div style={{ color: parseFloat(hesap.bakiye) < 0 ? '#ff6b6b' : '#4ecca3', fontWeight: 'bold', fontSize: '14px' }}>
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
    background: '#0f172a',
    fontFamily: "'Segoe UI', sans-serif",
  },
  sidebar: {
    width: '240px',
    background: 'rgba(255,255,255,0.03)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    position: 'fixed',
    height: '100vh',
    boxSizing: 'border-box',
  },
  logo: {
    color: '#4ecca3',
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '4px',
    textAlign: 'center',
  },
  userInfo: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '12px',
    textAlign: 'center',
    marginBottom: '32px',
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
    color: 'rgba(255,255,255,0.5)',
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
    background: 'rgba(78,204,163,0.15)',
    border: 'none',
    borderRadius: '10px',
    color: '#4ecca3',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    fontWeight: 'bold',
  },
  menuIcon: { fontSize: '18px' },
  cikisBtn: {
    padding: '12px',
    background: 'rgba(255,100,100,0.1)',
    border: '1px solid rgba(255,100,100,0.2)',
    borderRadius: '10px',
    color: '#ff6b6b',
    fontSize: '14px',
    cursor: 'pointer',
  },
content: {
  marginLeft: '240px',
  flex: 1,
  padding: '32px',
  minHeight: '100vh',
  boxSizing: 'border-box',
  overflow: 'hidden',
  maxWidth: 'calc(100vw - 240px)',
},
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  pageTitle: {
    color: '#fff',
    fontSize: '24px',
    margin: 0,
  },
  tarih: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '14px',
  },
  pageContent: {},
  kartGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  kart: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
  },
  kartIcon: { fontSize: '28px', marginBottom: '12px' },
  kartDeger: { color: '#fff', fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' },
  kartBaslik: { color: 'rgba(255,255,255,0.5)', fontSize: '13px' },
  altGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  panel: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '24px',
  },
  panelBaslik: {
    color: '#fff',
    fontSize: '16px',
    margin: '0 0 16px 0',
  },
  bosMetin: {
    color: 'rgba(255,255,255,0.3)',
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
  yakindaBaslik: { color: '#fff', fontSize: '22px', margin: '0 0 8px 0' },
  yakindaMetin: { color: 'rgba(255,255,255,0.4)', fontSize: '15px' },

  islemSatir: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  badge: { padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  islemAd: { color: '#fff', fontSize: '13px', fontWeight: '500' },
  islemTarih: { color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px' },
  hesapSatir: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  hesapAd: { color: '#fff', fontSize: '13px', fontWeight: '500', flex: 1 },
  hesapTur: { color: 'rgba(255,255,255,0.4)', fontSize: '11px' },
}

export default Dashboard