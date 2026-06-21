import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useLang } from './LangContext'

function Yatirimlar({ session, mobil, gizliMod }) {
  const { t } = useLang()
  const pm = (val, opts = { minimumFractionDigits: 2 }) =>
    gizliMod ? '****' : parseFloat(val || 0).toLocaleString('tr-TR', opts)
  const pbSembol = (pb) => ({ 'TRY': '₺', 'USD': '$', 'EUR': '€', 'GBP': '£' }[pb] || pb)
  const [yatirimlar, setYatirimlar] = useState([])
  const [hesaplar, setHesaplar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [formAcik, setFormAcik] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [guncelleniyor, setGuncelleniyor] = useState(false)
  const [satisFormAcik, setSatisFormAcik] = useState(false)
const [satisYatirim, setSatisYatirim] = useState(null)
const [duzenleModal, setDuzenleModal] = useState(false)
const [duzenleYatirim, setDuzenleYatirim] = useState(null)
const [kapaliGruplar, setKapaliGruplar] = useState(new Set())
const toggleGrup = (ad) => setKapaliGruplar(prev => {
  const next = new Set(prev)
  if (next.has(ad)) next.delete(ad); else next.add(ad)
  return next
})
const [gorunum, setGorunum] = useState('liste')
const [kurlar, setKurlar] = useState({ TRY: 1, USD: 1, EUR: 1, GBP: 1 })
const [hoveredTur, setHoveredTur] = useState(null)
const [hoveredHesap, setHoveredHesap] = useState(null)
const [satis, setSatis] = useState({ miktar: '', tutar: '', hesap_id: '', tarih: new Date().toISOString().split('T')[0] })
const [yeni, setYeni] = useState({
  ad: '', tur: 'Hisse', miktar: '', birim_maliyet: '', komisyon: '0',
  guncel_deger: '', para_birimi: 'TRY', hesap_id: '', hesaptan_duş: false, odeme_hesap_id: ''
})

  const turler = ['Hisse', 'Kripto', 'Fon', 'Döviz', 'Altın', 'BES', 'Diğer']
  const paraBirimleri = ['TRY', 'USD', 'EUR', 'GBP']

  const turRenk = {
    'Hisse': '#0d9488', 'Kripto': '#eab308', 'Fon': '#0ea5e9',
    'Döviz': '#a78bfa', 'Altın': '#f59e0b', 'BES': '#34d399', 'Diğer': '#94a3b8'
  }
  const turIkon = {
    'Hisse': '📊', 'Kripto': '₿', 'Fon': '📁',
    'Döviz': '💱', 'Altın': '🥇', 'BES': '🏛️', 'Diğer': '💼'
  }

  useEffect(() => {
    yatirimlariGetir()
    hesaplariGetir()
    fetch('https://api.exchangerate-api.com/v4/latest/TRY')
      .then(r => r.json())
      .then(d => {
        if (d.rates) setKurlar({
          TRY: 1,
          USD: 1 / (d.rates.USD || 1),
          EUR: 1 / (d.rates.EUR || 1),
          GBP: 1 / (d.rates.GBP || 1),
        })
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const yatirimlariGetir = async () => {
    setYukleniyor(true)
    const { data, error } = await supabase
      .from('yatirimlar')
      .select('*, hesaplar(ad)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    if (!error) setYatirimlar(data)
    setYukleniyor(false)
  }

  const hesaplariGetir = async () => {
    const { data } = await supabase
      .from('hesaplar')
      .select('id, ad, tur, bakiye, para_birimi, yatirim_hesabi')
      .eq('user_id', session.user.id)
    if (data) setHesaplar(data)
  }

const usdYatirimlarGuncelle = async () => {
  const usdYatirimlar = yatirimlar.filter(y => y.para_birimi === 'USD' && parseFloat(y.miktar) > 0)
  if (usdYatirimlar.length === 0) return
  const kripto = usdYatirimlar.filter(y => y.tur === 'Kripto')
  if (kripto.length > 0) {
    try {
      // Tüm Binance USDT çiftlerini çek — statik map'e gerek yok
      const r = await fetch('https://api.binance.com/api/v3/ticker/price')
      const tumFiyatlar = await r.json()
      const fiyatMap = {}
      for (const f of (Array.isArray(tumFiyatlar) ? tumFiyatlar : [])) {
        if (f.symbol.endsWith('USDT')) {
          fiyatMap[f.symbol.slice(0, -4)] = parseFloat(f.price)
        }
      }
      for (const y of kripto) {
        const fiyat = fiyatMap[y.ad.toUpperCase()]
        if (fiyat && fiyat > 0) {
          await supabase.from('yatirimlar').update({
            birim_fiyat: fiyat,
            guncel_deger: fiyat * parseFloat(y.miktar)
          }).eq('id', y.id)
        }
      }
    } catch (e) { console.error('USD kripto fiyat hatası:', e) }
  }
  const hisse = usdYatirimlar.filter(y => y.tur === 'Hisse')
  for (const y of hisse) {
    try {
      const r = await fetch(`https://api.twelvedata.com/price?symbol=${y.ad.toUpperCase()}&apikey=demo`)
      const d = await r.json()
      if (d.price) {
        const yeniBirimFiyat = parseFloat(d.price)
        await supabase.from('yatirimlar').update({
          birim_fiyat: yeniBirimFiyat,
          guncel_deger: yeniBirimFiyat * parseFloat(y.miktar)
        }).eq('id', y.id)
      }
    } catch (e) {}
  }
}

const fiyatlariGuncelle = async () => {
  setGuncelleniyor(true)
  try {
    const { data: { session: authSession } } = await supabase.auth.getSession()
    const response = await fetch(
      `https://mkmejbkuvwhjqtowmvqu.supabase.co/functions/v1/update-prices`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    const result = await response.json()
    console.log('Güncellenen:', result.guncellenen)
  } catch (e) {
    console.error('TRY güncelleme hatası:', e)
  }
  await usdYatirimlarGuncelle()
  await yatirimlariGetir()
  setGuncelleniyor(false)
}
  const yatirimEkle = async () => {
  if (!yeni.ad || !yeni.miktar || !yeni.birim_maliyet) return
  setKaydediliyor(true)

  const miktar = parseFloat(yeni.miktar)
  const birimMaliyet = parseFloat(yeni.birim_maliyet)
  const komisyon = parseFloat(yeni.komisyon) || 0
  const toplamMaliyet = (miktar * birimMaliyet) + komisyon

  // Güncel fiyatı API'den çekmeyi dene
  let guncelDeger = toplamMaliyet // varsayılan maliyet 
  let birimFiyat = birimMaliyet

  try {
    const TWELVE_API_KEY = 'BURAYA_API_KEY'
    if (yeni.tur === 'Hisse') {
      const r = await fetch(`https://api.twelvedata.com/price?symbol=${yeni.ad.toUpperCase()}:BIST&apikey=${TWELVE_API_KEY}`)
      const d = await r.json()
      if (d.price) {
        birimFiyat = parseFloat(d.price)
        guncelDeger = birimFiyat * miktar
      }
    } else if (yeni.tur === 'Kripto') {
      const sembolMap = { 'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'XRP': 'ripple', 'ADA': 'cardano', 'DOGE': 'dogecoin' }
      const coinId = sembolMap[yeni.ad.toUpperCase()]
      if (coinId) {
        const apiPara = yeni.para_birimi === 'USD' ? 'usd' : yeni.para_birimi === 'EUR' ? 'eur' : 'try'
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${apiPara}`)
        const d = await r.json()
        if (d[coinId]?.[apiPara]) {
          birimFiyat = d[coinId][apiPara]
          guncelDeger = birimFiyat * miktar
        }
      }
    } else if (yeni.tur === 'Döviz') {
      const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      const d = await r.json()
      const usdTry = d.rates?.TRY || 0
      const dovizMap = { 'USD': usdTry, 'EUR': usdTry / d.rates?.EUR, 'GBP': usdTry / d.rates?.GBP }
      if (dovizMap[yeni.ad.toUpperCase()]) {
        birimFiyat = dovizMap[yeni.ad.toUpperCase()]
        guncelDeger = birimFiyat * miktar
      }
    } else if (yeni.tur === 'Altın') {
      const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      const d = await r.json()
      const usdTry = d.rates?.TRY || 0
      birimFiyat = (2350 * usdTry) / 31.1035
      guncelDeger = birimFiyat * miktar
    }
  } catch (e) {
    console.error('Fiyat çekme hatası:', e)
  }

  const { error } = await supabase.from('yatirimlar').insert({
    user_id: session.user.id,
    ad: yeni.ad,
    tur: yeni.tur,
    miktar: miktar,
    birim_maliyet: birimMaliyet,
    komisyon: komisyon,
    maliyet: toplamMaliyet,
    guncel_deger: guncelDeger,
    birim_fiyat: birimFiyat,
    para_birimi: yeni.para_birimi,
    hesap_id: yeni.hesap_id || null
  })

  if (!error && yeni.maliyet) {
    let odemeHesapId = null
    if (yeni.hesaptan_duş && yeni.odeme_hesap_id) {
      odemeHesapId = yeni.odeme_hesap_id
    } else if (yeni.hesap_id) {
      odemeHesapId = yeni.hesap_id
    }
    if (odemeHesapId) {
      await supabase.from('islemler').insert({
        user_id: session.user.id,
        hesap_id: odemeHesapId,
        tarih: new Date().toISOString().split('T')[0],
        tutar: toplamMaliyet,
        tur: 'gider',
        kategori: 'Yatırım',
        aciklama: `${yeni.ad} alımı (${miktar} adet)`
      })
    }
  }

  if (!error) {
    setFormAcik(false)
    setYeni({ ad: '', tur: 'Hisse', miktar: '', birim_maliyet: '', komisyon: '0', guncel_deger: '', para_birimi: 'TRY', hesap_id: '', hesaptan_duş: false, odeme_hesap_id: '' })
    yatirimlariGetir()
  }
  setKaydediliyor(false)
}

  const yatirimSil = async (id) => {
    if (!window.confirm('Bu yatırımı silmek istediğine emin misin?')) return
    await supabase.from('yatirimlar').delete().eq('id', id)
    yatirimlariGetir()
  }
  const yatirimGuncelle = async () => {
  if (!duzenleYatirim) return
  setKaydediliyor(true)
  const miktar = parseFloat(duzenleYatirim.miktar) || 0
  const birimFiyat = parseFloat(duzenleYatirim.birim_fiyat) || 0
  const guncelDeger = miktar > 0 && birimFiyat > 0 ? miktar * birimFiyat : parseFloat(duzenleYatirim.guncel_deger)

  await supabase.from('yatirimlar').update({
    ad: duzenleYatirim.ad,
    tur: duzenleYatirim.tur,
    miktar: miktar,
    birim_maliyet: parseFloat(duzenleYatirim.birim_maliyet) || 0,
    birim_fiyat: birimFiyat,
    maliyet: parseFloat(duzenleYatirim.maliyet) || 0,
    guncel_deger: guncelDeger,
    hesap_id: duzenleYatirim.hesap_id || null,
  }).eq('id', duzenleYatirim.id)

  setDuzenleModal(false)
  setDuzenleYatirim(null)
  yatirimlariGetir()
  setKaydediliyor(false)
}
const satisYap = async () => {
  if (!satis.tutar || !satis.hesap_id) return
  setKaydediliyor(true)

  const satılanMiktar = parseFloat(satis.miktar) || 0
  const satisTutar = parseFloat(satis.tutar)
  const mevcutMiktar = parseFloat(satisYatirim.miktar) || 0
  const mevcutMaliyet = parseFloat(satisYatirim.maliyet)
  const mevcutDeger = parseFloat(satisYatirim.guncel_deger)

  const tamSatis = satılanMiktar >= mevcutMiktar || mevcutMiktar === 0

  if (tamSatis) {
    // Yatırımı sil
    await supabase.from('yatirimlar').delete().eq('id', satisYatirim.id)
  } else {
    // Kısmen sat — oransal güncelle
    const kalaanOran = (mevcutMiktar - satılanMiktar) / mevcutMiktar
    await supabase.from('yatirimlar').update({
      miktar: mevcutMiktar - satılanMiktar,
      maliyet: mevcutMaliyet * kalaanOran,
      guncel_deger: mevcutDeger * kalaanOran,
    }).eq('id', satisYatirim.id)
  }

  // Seçilen hesaba satış geliri ekle
  await supabase.from('islemler').insert({
    user_id: session.user.id,
    hesap_id: satis.hesap_id,
    tarih: satis.tarih,
    tutar: satisTutar,
    tur: 'gelir',
    kategori: 'Yatırım Getirisi',
    aciklama: `${satisYatirim.ad} satışı`
  })

  setSatisFormAcik(false)
  setSatisYatirim(null)
  setSatis({ miktar: '', tutar: '', hesap_id: '', tarih: new Date().toISOString().split('T')[0] })
  yatirimlariGetir()
  setKaydediliyor(false)
}
  const toplamMaliyet = yatirimlar.reduce((a, y) => a + parseFloat(y.maliyet || 0) * (kurlar[y.para_birimi] || 1), 0)
  const toplamGuncel = yatirimlar.reduce((a, y) => a + parseFloat(y.guncel_deger || 0) * (kurlar[y.para_birimi] || 1), 0)
  const toplamKarZarar = toplamGuncel - toplamMaliyet
  const toplamGetiri = toplamMaliyet > 0 ? ((toplamKarZarar / toplamMaliyet) * 100).toFixed(2) : 0

  const pieRenkler = ['#0d9488','#eab308','#0ea5e9','#a78bfa','#f59e0b','#34d399','#ef4444','#f97316','#ec4899','#6366f1']
  const renderPieChart = (data, title, detailsMap, hovered, setHovered) => {
    const total = data.reduce((s, d) => s + d.value, 0)
    if (total === 0) return null
    const sorted = [...data].sort((a, b) => b.value - a.value)
    let cumAngle = -Math.PI / 2
    const slices = sorted.map((d, i) => {
      const sweep = (d.value / total) * 2 * Math.PI
      const start = cumAngle
      cumAngle += sweep
      const end = cumAngle
      const r = 80, cx = 100, cy = 100
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
      const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end)
      const large = sweep > Math.PI ? 1 : 0
      const path = sweep >= 2 * Math.PI - 0.001
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
      return { path, color: pieRenkler[i % pieRenkler.length], label: d.label, value: d.value, pct: ((d.value / total) * 100).toFixed(1) }
    })
    const hovSlice = slices.find(s => s.label === hovered)
    const hovDetails = hovered ? (detailsMap[hovered] || []) : []
    return (
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-light)', flex: 1, minWidth: mobil ? '100%' : '280px' }}>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600', marginBottom: '20px', textAlign: 'center' }}>{title}</h3>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <svg viewBox="0 0 200 200" width="180" height="180">
            {slices.map((s, i) => (
              <path key={i} d={s.path} fill={s.color} stroke="var(--bg-card)" strokeWidth="3"
                style={{ opacity: hovered && hovered !== s.label ? 0.35 : 1, transition: 'opacity 0.18s', cursor: 'pointer' }}
                onMouseEnter={() => setHovered(s.label)}
                onMouseLeave={() => setHovered(null)} />
            ))}
            <circle cx="100" cy="100" r="48" fill="var(--bg-card)" style={{ pointerEvents: 'none' }} />
            <text x="100" y="93" textAnchor="middle" fill="var(--text-muted)" fontSize="10" style={{ pointerEvents: 'none' }}>
              {hovered ? hovered : `${slices.length} kalem`}
            </text>
            {hovSlice && (
              <text x="100" y="108" textAnchor="middle" fill={hovSlice.color} fontSize="12" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                {hovSlice.pct}%
              </text>
            )}
          </svg>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {slices.map((s, i) => (
            <div key={i}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', background: hovered === s.label ? `${s.color}12` : 'transparent', transition: 'background 0.15s' }}
              onMouseEnter={() => setHovered(s.label)}
              onMouseLeave={() => setHovered(null)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: s.color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: hovered === s.label ? '600' : '400' }}>{s.label}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  ₺{gizliMod ? '****' : s.value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600', minWidth: '42px', textAlign: 'right' }}>{s.pct}%</span>
              </div>
            </div>
          ))}
        </div>

        {hovered && hovDetails.length > 0 && (
          <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: `1px solid ${hovSlice?.color || 'var(--border)'}30` }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{hovered} · Detay</div>
            {hovDetails.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '5px 0', borderBottom: i < hovDetails.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <span style={{ color: 'var(--text-primary)' }}>{item.ad}</span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>₺{gizliMod ? '****' : item.deger.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                  <span style={{ color: item.kar >= 0 ? '#0d9488' : '#ef4444', fontSize: '12px', minWidth: '48px', textAlign: 'right' }}>{item.kar >= 0 ? '+' : ''}{item.karPct}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ ...styles.ozetGrid, gridTemplateColumns: mobil ? 'repeat(2,1fr)' : 'repeat(4,1fr)' }}>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Toplam Maliyet</div>
          <div style={{ ...styles.ozetDeger, color: '#0ea5e9' }}>₺{pm(toplamMaliyet)}</div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Güncel Değer</div>
          <div style={{ ...styles.ozetDeger, color: '#0d9488' }}>₺{pm(toplamGuncel)}</div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Kar / Zarar</div>
          <div style={{ ...styles.ozetDeger, color: toplamKarZarar >= 0 ? '#0d9488' : '#ef4444' }}>
            {gizliMod ? '₺ ****' : `${toplamKarZarar >= 0 ? '+' : ''}₺${toplamKarZarar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
          </div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Toplam Getiri</div>
          <div style={{ ...styles.ozetDeger, color: toplamGetiri >= 0 ? '#0d9488' : '#ef4444' }}>
            {toplamGetiri >= 0 ? '+' : ''}{toplamGetiri}%
          </div>
        </div>
      </div>

      <div style={{ ...styles.toolbar, flexWrap: mobil ? 'wrap' : 'nowrap', gap: '10px' }}>
        <button style={styles.guncelleBtn} onClick={fiyatlariGuncelle} disabled={guncelleniyor}>
          {guncelleniyor ? '⏳ Güncelleniyor...' : '🔄 Fiyatları Güncelle'}
        </button>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '4px' }}>
          <button style={{ ...styles.gorunumBtn, background: gorunum === 'liste' ? 'var(--bg-card)' : 'transparent', color: gorunum === 'liste' ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: gorunum === 'liste' ? 'var(--shadow-sm)' : 'none' }} onClick={() => setGorunum('liste')}>☰ Liste</button>
          <button style={{ ...styles.gorunumBtn, background: gorunum === 'grafik' ? 'var(--bg-card)' : 'transparent', color: gorunum === 'grafik' ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: gorunum === 'grafik' ? 'var(--shadow-sm)' : 'none' }} onClick={() => setGorunum('grafik')}>📊 Grafik</button>
        </div>
        <button style={styles.ekleBtn} onClick={() => setFormAcik(true)}>+ Yeni Yatırım Ekle</button>
      </div>
{duzenleModal && duzenleYatirim && (
  <div style={styles.modalOverlay}>
    <div style={{ ...styles.modal, width: mobil ? '95vw' : '420px' }}>
      <h3 style={styles.modalBaslik}>✏️ Yatırımı Düzenle</h3>

      <label style={styles.label}>Yatırım Adı</label>
      <input style={styles.input} value={duzenleYatirim.ad}
        onChange={e => setDuzenleYatirim({ ...duzenleYatirim, ad: e.target.value })} />

      <label style={styles.label}>Tür</label>
      <select style={styles.input} value={duzenleYatirim.tur}
        onChange={e => setDuzenleYatirim({ ...duzenleYatirim, tur: e.target.value })}>
        {turler.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <label style={styles.label}>Miktar / Adet</label>
      <input style={styles.input} type="number" value={duzenleYatirim.miktar}
        onChange={e => setDuzenleYatirim({ ...duzenleYatirim, miktar: e.target.value })} />

      <label style={styles.label}>Birim Alış Fiyatı ({pbSembol(duzenleYatirim.para_birimi)})</label>
      <input style={styles.input} type="number" value={duzenleYatirim.birim_maliyet}
        onChange={e => setDuzenleYatirim({ ...duzenleYatirim, birim_maliyet: e.target.value })} />

      <label style={styles.label}>Toplam Maliyet ({pbSembol(duzenleYatirim.para_birimi)})</label>
      <input style={styles.input} type="number" value={duzenleYatirim.maliyet}
        onChange={e => setDuzenleYatirim({ ...duzenleYatirim, maliyet: e.target.value })} />

      <label style={styles.label}>Güncel Birim Fiyat ({pbSembol(duzenleYatirim.para_birimi)})</label>
      <input style={styles.input} type="number"
        placeholder="Birim fiyat girersen güncel değer otomatik hesaplanır"
        value={duzenleYatirim.birim_fiyat}
        onChange={e => setDuzenleYatirim({ ...duzenleYatirim, birim_fiyat: e.target.value })} />

      <label style={styles.label}>Güncel Değer ({pbSembol(duzenleYatirim.para_birimi)})</label>
      <input style={styles.input} type="number"
        placeholder="Birim fiyat girilmezse buraya direkt yazabilirsin"
        value={duzenleYatirim.guncel_deger}
        onChange={e => setDuzenleYatirim({ ...duzenleYatirim, guncel_deger: e.target.value })} />

      {duzenleYatirim.miktar && duzenleYatirim.birim_fiyat && (
        <div style={styles.bilgiMesaj}>
          💡 Güncel değer: <strong>
            {pbSembol(duzenleYatirim.para_birimi)}{(parseFloat(duzenleYatirim.miktar) * parseFloat(duzenleYatirim.birim_fiyat)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </strong>
        </div>
      )}

      <label style={styles.label}>Hesap / Aracı Kurum</label>
      <select style={styles.input} value={duzenleYatirim.hesap_id || ''}
        onChange={e => setDuzenleYatirim({ ...duzenleYatirim, hesap_id: e.target.value })}>
        <option value="">Hesap seç</option>
        {hesaplar.map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
      </select>

      <div style={styles.modalBtnler}>
        <button style={styles.iptalBtn} onClick={() => { setDuzenleModal(false); setDuzenleYatirim(null) }}>İptal</button>
        <button style={styles.kaydetBtn} onClick={yatirimGuncelle} disabled={kaydediliyor}>
          {kaydediliyor ? 'Kaydediliyor...' : 'Güncelle'}
        </button>
      </div>
    </div>
  </div>
)}
      {satisFormAcik && satisYatirim && (
  <div style={styles.modalOverlay}>
    <div style={{ ...styles.modal, width: mobil ? '95vw' : '400px' }}>
      <h3 style={styles.modalBaslik}>📤 Satış Yap</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        {satisYatirim.ad} — Güncel Değer: {pbSembol(satisYatirim.para_birimi)}{parseFloat(satisYatirim.guncel_deger).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
        {parseFloat(satisYatirim.miktar) > 0 && ` · ${satisYatirim.miktar} adet`}
      </p>

      {parseFloat(satisYatirim.miktar) > 0 && (
        <>
          <label style={styles.label}>Satılan Miktar / Adet</label>
          <input style={styles.input} type="number"
            placeholder={`Max: ${satisYatirim.miktar} adet`}
            value={satis.miktar}
            onChange={e => setSatis({ ...satis, miktar: e.target.value })} />
        </>
      )}

      <label style={styles.label}>Satış Tutarı ({pbSembol(satisYatirim.para_birimi)})</label>
      <input style={styles.input} type="number" placeholder="Elde ettiğin tutar"
        value={satis.tutar}
        onChange={e => setSatis({ ...satis, tutar: e.target.value })} />

      <label style={styles.label}>Satış Tarihi</label>
      <input style={styles.input} type="date"
        value={satis.tarih}
        onChange={e => setSatis({ ...satis, tarih: e.target.value })} />

      <label style={styles.label}>Hesaba Aktar</label>
      <select style={styles.input} value={satis.hesap_id}
        onChange={e => setSatis({ ...satis, hesap_id: e.target.value })}>
        <option value="">Hesap seç</option>
        {hesaplar.map(h => (
          <option key={h.id} value={h.id}>
            {h.ad} (₺{parseFloat(h.bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 0 })})
          </option>
        ))}
      </select>

      {satis.tutar && satisYatirim.maliyet && (
        <div style={{ ...styles.bilgiMesaj, color: parseFloat(satis.tutar) >= parseFloat(satisYatirim.guncel_deger) ? '#0d9488' : '#ef4444',
          background: parseFloat(satis.tutar) >= parseFloat(satisYatirim.guncel_deger) ? 'rgba(13,148,136,0.06)' : 'rgba(239,68,68,0.06)',
          border: `1px solid ${parseFloat(satis.tutar) >= parseFloat(satisYatirim.guncel_deger) ? 'rgba(13,148,136,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
          {parseFloat(satis.tutar) >= parseFloat(satisYatirim.maliyet)
            ? `🟢 Kar: +${pbSembol(satisYatirim.para_birimi)}${(parseFloat(satis.tutar) - parseFloat(satisYatirim.maliyet)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
            : `🔴 Zarar: -${pbSembol(satisYatirim.para_birimi)}${(parseFloat(satisYatirim.maliyet) - parseFloat(satis.tutar)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
          }
        </div>
      )}

      <div style={styles.modalBtnler}>
        <button style={styles.iptalBtn} onClick={() => { setSatisFormAcik(false); setSatisYatirim(null) }}>İptal</button>
        <button style={{ ...styles.kaydetBtn, background: 'linear-gradient(135deg,#ef4444,#f97316)' }}
          onClick={satisYap} disabled={kaydediliyor}>
          {kaydediliyor ? 'İşleniyor...' : '📤 Satışı Onayla'}
        </button>
      </div>
    </div>
  </div>
)}

      {formAcik && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, width: mobil ? '95vw' : '420px' }}>
            <h3 style={styles.modalBaslik}>Yeni Yatırım Ekle</h3>

            <label style={styles.label}>Yatırım Hesabı / Aracı Kurum (isteğe bağlı)</label>
            <select style={styles.input} value={yeni.hesap_id}
              onChange={e => {
                const secili = hesaplar.find(h => h.id === e.target.value)
                setYeni({ ...yeni, hesap_id: e.target.value, para_birimi: secili?.para_birimi || yeni.para_birimi })
              }}>
              <option value="">Hesap seç</option>
              {hesaplar.map(h => (
                <option key={h.id} value={h.id}>{h.ad}</option>
              ))}
            </select>

            <label style={styles.label}>Yatırım Adı</label>
            <input style={styles.input} placeholder="örn. THYAO, BTC, USD, Altın"
              value={yeni.ad} onChange={e => setYeni({ ...yeni, ad: e.target.value })} />

            <label style={styles.label}>Tür</label>
            <select style={styles.input} value={yeni.tur}
              onChange={e => setYeni({ ...yeni, tur: e.target.value })}>
              {turler.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <label style={styles.label}>Para Birimi</label>
            <select style={styles.input} value={yeni.para_birimi}
              onChange={e => setYeni({ ...yeni, para_birimi: e.target.value })}>
              {paraBirimleri.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <label style={styles.label}>Miktar / Adet</label>
            <input style={styles.input} type="number" placeholder="örn. 100 adet, 0.5 BTC, 1000 USD"
              value={yeni.miktar} onChange={e => setYeni({ ...yeni, miktar: e.target.value })} />

            <label style={styles.label}>Birim Alış Fiyatı ({pbSembol(yeni.para_birimi)})</label>
            <input style={styles.input} type="number" placeholder="Adet başına ödediğin fiyat"
              value={yeni.birim_maliyet}
              onChange={e => setYeni({ ...yeni, birim_maliyet: e.target.value })} />

            <label style={styles.label}>Komisyon ({pbSembol(yeni.para_birimi)}) — 0 bırakabilirsin</label>
            <input style={styles.input} type="number" placeholder="0"
              value={yeni.komisyon}
              onChange={e => setYeni({ ...yeni, komisyon: e.target.value })} />

            {yeni.miktar && yeni.birim_maliyet && (
              <div style={styles.bilgiMesaj}>
                💡 Toplam maliyet: <strong>{pbSembol(yeni.para_birimi)}{((parseFloat(yeni.miktar) * parseFloat(yeni.birim_maliyet)) + (parseFloat(yeni.komisyon) || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong>
                {' · '}Güncel fiyat kayıt sırasında otomatik çekilecek
              </div>
            )}

<div style={styles.toggleSatir}>
  <span style={styles.toggleLabel}>Başka hesaptan para düşsün mü?</span>
  <div style={{ ...styles.toggle, background: yeni.hesaptan_duş ? '#0d9488' : 'var(--border)' }}
    onClick={() => setYeni({ ...yeni, hesaptan_duş: !yeni.hesaptan_duş, odeme_hesap_id: '' })}>
    <div style={{ ...styles.toggleTop, transform: yeni.hesaptan_duş ? 'translateX(20px)' : 'translateX(0)' }} />
  </div>
</div>

{yeni.hesaptan_duş && (
  <>
    <label style={styles.label}>Parayı Hangi Hesaptan Öde?</label>
    <select style={styles.input} value={yeni.odeme_hesap_id || ''}
      onChange={e => setYeni({ ...yeni, odeme_hesap_id: e.target.value })}>
      <option value="">Hesap seç</option>
      {hesaplar.map(h => (
        <option key={h.id} value={h.id}>
          {h.ad} (₺{parseFloat(h.bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 0 })})
        </option>
      ))}
    </select>
    {yeni.odeme_hesap_id && yeni.maliyet && (
      <div style={styles.bilgiMesaj}>
        💡 <strong>{hesaplar.find(h => h.id === yeni.odeme_hesap_id)?.ad}</strong> hesabından
        ₺{parseFloat(yeni.maliyet).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} düşecek.
      </div>
    )}
  </>
)}

            <div style={styles.modalBtnler}>
              <button style={styles.iptalBtn} onClick={() => setFormAcik(false)}>İptal</button>
              <button style={styles.kaydetBtn} onClick={yatirimEkle} disabled={kaydediliyor}>
                {kaydediliyor ? t('kaydediliyor') : t('kaydet')}
              </button>
            </div>
          </div>
        </div>
      )}

      {gorunum === 'grafik' && !yukleniyor && yatirimlar.length > 0 && (() => {
        const turGruplar = {}, hesapGruplar = {}
        const turDetailsMap = {}, hesapDetailsMap = {}
        for (const y of yatirimlar) {
          const kur = kurlar[y.para_birimi] || 1
          const deger = parseFloat(y.guncel_deger || 0) * kur
          const maliyet = parseFloat(y.maliyet || 0) * kur
          const kar = deger - maliyet
          const karPct = maliyet > 0 ? ((kar / maliyet) * 100).toFixed(1) : '0.0'
          const item = { ad: y.ad, deger, kar, karPct }
          // tur grupları
          turGruplar[y.tur] = (turGruplar[y.tur] || 0) + deger
          if (!turDetailsMap[y.tur]) turDetailsMap[y.tur] = []
          turDetailsMap[y.tur].push(item)
          // hesap grupları
          const ad = y.hesaplar?.ad || 'Hesapsız'
          hesapGruplar[ad] = (hesapGruplar[ad] || 0) + deger
          if (!hesapDetailsMap[ad]) hesapDetailsMap[ad] = []
          hesapDetailsMap[ad].push({ ...item, tur: y.tur })
        }
        const turData = Object.entries(turGruplar).map(([label, value]) => ({ label, value }))
        const hesapData = Object.entries(hesapGruplar).map(([label, value]) => ({ label, value }))
        return (
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {renderPieChart(turData, 'Yatırım Türüne Göre Dağılım', turDetailsMap, hoveredTur, setHoveredTur)}
            {renderPieChart(hesapData, 'Hesaba Göre Dağılım', hesapDetailsMap, hoveredHesap, setHoveredHesap)}
          </div>
        )
      })()}

      {gorunum === 'liste' && (yukleniyor ? (
        <div style={styles.yukleniyor}>{t('yukleniyor')}</div>
      ) : yatirimlar.length === 0 ? (
        <div style={styles.bos}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
          <p style={{ color: 'var(--text-muted)' }}>Henüz yatırım eklenmemiş.</p>
        </div>
      ) : (() => {
        const gruplar = {}
        for (const y of yatirimlar) {
          const ad = y.hesaplar?.ad || 'Hesapsız'
          if (!gruplar[ad]) gruplar[ad] = []
          gruplar[ad].push(y)
        }
        const renderKart = (y) => {
          const karZarar = parseFloat(y.guncel_deger) - parseFloat(y.maliyet)
          const getiri = parseFloat(y.maliyet) > 0 ? ((karZarar / parseFloat(y.maliyet)) * 100).toFixed(2) : 0
          return (
            <div key={y.id} style={{ ...styles.kart, borderLeft: `4px solid ${turRenk[y.tur] || '#a8a8b3'}`, flexDirection: mobil ? 'column' : 'row', alignItems: mobil ? 'stretch' : 'center', gap: mobil ? '12px' : '20px' }}>
              <div style={styles.kartSol}>
                <span style={styles.ikon}>{turIkon[y.tur] || '💼'}</span>
                <div>
                  <div style={styles.ad}>{y.ad}</div>
                  <div style={styles.tur}>{y.tur}{parseFloat(y.miktar) > 0 ? ` · ${y.miktar} adet` : ''}</div>
                </div>
              </div>
              <div style={mobil ? { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' } : { display: 'contents' }}>
                <div style={styles.kartOrta}><div style={styles.detayLabel}>Miktar</div><div style={styles.detayDeger}>{parseFloat(y.miktar) > 0 ? `${y.miktar} adet` : '—'}</div></div>
                <div style={styles.kartOrta}><div style={styles.detayLabel}>Birim Maliyet</div><div style={styles.detayDeger}>{y.birim_maliyet > 0 ? `${pbSembol(y.para_birimi)}${parseFloat(y.birim_maliyet).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—'}</div></div>
                <div style={styles.kartOrta}><div style={styles.detayLabel}>Güncel Fiyat</div><div style={styles.detayDeger}>{y.birim_fiyat > 0 && parseFloat(y.miktar) > 0 ? `${pbSembol(y.para_birimi)}${parseFloat(y.birim_fiyat).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—'}</div></div>
                <div style={styles.kartOrta}><div style={styles.detayLabel}>Toplam Maliyet</div><div style={styles.detayDeger}>{pbSembol(y.para_birimi)}{pm(y.maliyet)}</div></div>
                <div style={styles.kartOrta}><div style={styles.detayLabel}>Güncel Değer</div><div style={styles.detayDeger}>{pbSembol(y.para_birimi)}{pm(y.guncel_deger)}</div></div>
              </div>
              <div style={mobil ? { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } : { display: 'contents' }}>
                <div style={{ ...styles.kartSag, textAlign: mobil ? 'left' : 'right' }}>
                  <div style={{ color: karZarar >= 0 ? '#0d9488' : '#ef4444', fontSize: '18px', fontWeight: 'bold' }}>
                    {gizliMod ? `${pbSembol(y.para_birimi)} ****` : `${karZarar >= 0 ? '+' : ''}${pbSembol(y.para_birimi)}${karZarar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
                  </div>
                  <div style={{ color: karZarar >= 0 ? '#0d9488' : '#ef4444', fontSize: '13px' }}>
                    {gizliMod ? '***%' : `${getiri >= 0 ? '+' : ''}${getiri}%`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={styles.duzenleBtn} onClick={() => { setDuzenleYatirim(y); setDuzenleModal(true) }}>✏️</button>
                  <button style={styles.satisBtn} onClick={() => { setSatisYatirim(y); setSatis({ miktar: '', tutar: y.guncel_deger, hesap_id: '', tarih: new Date().toISOString().split('T')[0] }); setSatisFormAcik(true) }}>📤 Sat</button>
                  <button style={styles.silBtn} onClick={() => yatirimSil(y.id)}>🗑️</button>
                </div>
              </div>
            </div>
          )
        }
        return (
          <div style={styles.liste}>
            {Object.entries(gruplar).map(([hesapAdi, grup]) => {
              const acik = !kapaliGruplar.has(hesapAdi)
              const grupDeger = grup.reduce((s, y) => s + parseFloat(y.guncel_deger || 0), 0)
              return (
                <div key={hesapAdi}>
                  <div style={styles.grupBaslik} onClick={() => toggleGrup(hesapAdi)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>📂</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{hesapAdi}</span>
                      <span style={{ background: 'rgba(13,148,136,0.1)', color: '#0d9488', borderRadius: '20px', padding: '2px 10px', fontSize: '12px' }}>{grup.length} yatırım</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Toplam: {grupDeger.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{acik ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {acik && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      {grup.map(renderKart)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })())}
    </div>
  )
}

const styles = {
  ozetGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' },
  ozetKart: { background: 'var(--bg-card)', borderRadius: '14px', padding: '16px', textAlign: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' },
  ozetLabel: { color: 'var(--text-muted)', fontSize: '11px', marginBottom: '6px' },
  ozetDeger: { fontSize: '18px', fontWeight: 'bold' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  guncelleBtn: { padding: '10px 18px', background: 'rgba(14,165,233,0.08)', border: '1px solid #0ea5e9', borderRadius: '10px', color: '#0ea5e9', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  ekleBtn: { padding: '10px 20px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--bg-card)', borderRadius: '20px', padding: '28px', width: '420px', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)', boxSizing: 'border-box' },
  modalBaslik: { color: 'var(--text-primary)', fontSize: '18px', margin: '0 0 20px 0' },
  toggleSatir: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' },
  toggleLabel: { color: '#475569', fontSize: '14px' },
  toggle: { width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' },
  toggleTop: { position: 'absolute', top: '2px', left: '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'transform 0.3s' },
  bilgiMesaj: { background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: '10px', padding: '12px', color: '#0d9488', fontSize: '13px', marginBottom: '14px' },
  label: { color: '#475569', fontSize: '13px', display: 'block', marginBottom: '6px' },
  input: { width: '100%', padding: '11px 12px', marginBottom: '14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' },
  modalBtnler: { display: 'flex', gap: '12px', marginTop: '8px' },
  iptalBtn: { flex: 1, padding: '11px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer' },
  kaydetBtn: { flex: 1, padding: '11px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer' },
  yukleniyor: { color: 'var(--text-muted)', textAlign: 'center', padding: '48px' },
  bos: { textAlign: 'center', padding: '64px' },
  liste: { display: 'flex', flexDirection: 'column', gap: '12px' },
  kart: { display: 'flex', alignItems: 'center', gap: '20px', background: 'var(--bg-card)', borderRadius: '14px', padding: '16px 20px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' },
  kartSol: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1.5 },
  ikon: { fontSize: '24px' },
  ad: { color: 'var(--text-primary)', fontSize: '14px', fontWeight: 'bold' },
  tur: { color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' },
  hesapTag: { background: 'rgba(13,148,136,0.08)', color: '#0d9488', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' },
  kartOrta: { flex: 1, textAlign: 'center' },
  detayLabel: { color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' },
  detayDeger: { color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500' },
  duzenleBtn: { padding: '6px 10px', background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: '8px', color: '#0ea5e9', fontSize: '13px', cursor: 'pointer' },
  kartSag: { textAlign: 'right', minWidth: '120px' },
  satisBtn: { padding: '6px 14px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '8px', color: '#f97316', fontSize: '13px', cursor: 'pointer' },
  silBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.4 },
  grupBaslik: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', cursor: 'pointer', userSelect: 'none', fontSize: '14px' },
  gorunumBtn: { padding: '6px 14px', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' },
}

export default Yatirimlar