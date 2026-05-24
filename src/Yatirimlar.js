import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function Yatirimlar({ session }) {
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
const [satis, setSatis] = useState({ miktar: '', tutar: '', hesap_id: '', tarih: new Date().toISOString().split('T')[0] })
const [yeni, setYeni] = useState({
  ad: '', tur: 'Hisse', miktar: '', birim_maliyet: '', komisyon: '0',
  guncel_deger: '', para_birimi: 'TRY', hesap_id: '', hesaptan_duş: false, odeme_hesap_id: ''
})

  const turler = ['Hisse', 'Kripto', 'Fon', 'Döviz', 'Altın', 'BES', 'Diğer']
  const paraBirimleri = ['TRY', 'USD', 'EUR', 'GBP']

  const turRenk = {
    'Hisse': '#4ecca3', 'Kripto': '#ffd93d', 'Fon': '#45b7d1',
    'Döviz': '#a78bfa', 'Altın': '#f59e0b', 'BES': '#34d399', 'Diğer': '#a8a8b3'
  }
  const turIkon = {
    'Hisse': '📊', 'Kripto': '₿', 'Fon': '📁',
    'Döviz': '💱', 'Altın': '🥇', 'BES': '🏛️', 'Diğer': '💼'
  }

  useEffect(() => {
    yatirimlariGetir()
    hesaplariGetir()
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

const fiyatlariGuncelle = async () => {
  setGuncelleniyor(true)
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch(
      `https://mkmejbkuvwhjqtowmvqu.supabase.co/functions/v1/update-prices`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    const result = await response.json()
    console.log('Güncellenen:', result.guncellenen)
    await yatirimlariGetir()
  } catch (e) {
    console.error('Güncelleme hatası:', e)
  }
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
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=try`)
        const d = await r.json()
        if (d[coinId]?.try) {
          birimFiyat = d[coinId].try
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
  const toplamMaliyet = yatirimlar.filter(y => y.para_birimi === 'TRY').reduce((a, y) => a + parseFloat(y.maliyet), 0)
  const toplamGuncel = yatirimlar.filter(y => y.para_birimi === 'TRY').reduce((a, y) => a + parseFloat(y.guncel_deger), 0)
  const toplamKarZarar = toplamGuncel - toplamMaliyet
  const toplamGetiri = toplamMaliyet > 0 ? ((toplamKarZarar / toplamMaliyet) * 100).toFixed(2) : 0

  return (
    <div>
      <div style={styles.ozetGrid}>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Toplam Maliyet</div>
          <div style={{ ...styles.ozetDeger, color: '#45b7d1' }}>₺{toplamMaliyet.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Güncel Değer</div>
          <div style={{ ...styles.ozetDeger, color: '#4ecca3' }}>₺{toplamGuncel.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Kar / Zarar</div>
          <div style={{ ...styles.ozetDeger, color: toplamKarZarar >= 0 ? '#4ecca3' : '#ff6b6b' }}>
            {toplamKarZarar >= 0 ? '+' : ''}₺{toplamKarZarar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Toplam Getiri</div>
          <div style={{ ...styles.ozetDeger, color: toplamGetiri >= 0 ? '#4ecca3' : '#ff6b6b' }}>
            {toplamGetiri >= 0 ? '+' : ''}{toplamGetiri}%
          </div>
        </div>
      </div>

      <div style={styles.toolbar}>
        <button style={styles.guncelleBtn} onClick={fiyatlariGuncelle} disabled={guncelleniyor}>
          {guncelleniyor ? '⏳ Güncelleniyor...' : '🔄 Fiyatları Güncelle'}
        </button>
        <button style={styles.ekleBtn} onClick={() => setFormAcik(true)}>+ Yeni Yatırım Ekle</button>
      </div>
{duzenleModal && duzenleYatirim && (
  <div style={styles.modalOverlay}>
    <div style={{ ...styles.modal, width: '420px' }}>
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

      <label style={styles.label}>Birim Alış Fiyatı (₺)</label>
      <input style={styles.input} type="number" value={duzenleYatirim.birim_maliyet}
        onChange={e => setDuzenleYatirim({ ...duzenleYatirim, birim_maliyet: e.target.value })} />

      <label style={styles.label}>Toplam Maliyet (₺)</label>
      <input style={styles.input} type="number" value={duzenleYatirim.maliyet}
        onChange={e => setDuzenleYatirim({ ...duzenleYatirim, maliyet: e.target.value })} />

      <label style={styles.label}>Güncel Birim Fiyat (₺)</label>
      <input style={styles.input} type="number"
        placeholder="Birim fiyat girersen güncel değer otomatik hesaplanır"
        value={duzenleYatirim.birim_fiyat}
        onChange={e => setDuzenleYatirim({ ...duzenleYatirim, birim_fiyat: e.target.value })} />

      <label style={styles.label}>Güncel Değer (₺)</label>
      <input style={styles.input} type="number"
        placeholder="Birim fiyat girilmezse buraya direkt yazabilirsin"
        value={duzenleYatirim.guncel_deger}
        onChange={e => setDuzenleYatirim({ ...duzenleYatirim, guncel_deger: e.target.value })} />

      {duzenleYatirim.miktar && duzenleYatirim.birim_fiyat && (
        <div style={styles.bilgiMesaj}>
          💡 Güncel değer: <strong>
            ₺{(parseFloat(duzenleYatirim.miktar) * parseFloat(duzenleYatirim.birim_fiyat)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
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
    <div style={{ ...styles.modal, width: '400px' }}>
      <h3 style={styles.modalBaslik}>📤 Satış Yap</h3>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '20px' }}>
        {satisYatirim.ad} — Güncel Değer: ₺{parseFloat(satisYatirim.guncel_deger).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
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

      <label style={styles.label}>Satış Tutarı (₺)</label>
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
        <div style={{ ...styles.bilgiMesaj, color: parseFloat(satis.tutar) >= parseFloat(satisYatirim.guncel_deger) ? '#4ecca3' : '#ff6b6b',
          background: parseFloat(satis.tutar) >= parseFloat(satisYatirim.guncel_deger) ? 'rgba(78,204,163,0.1)' : 'rgba(255,107,107,0.1)',
          border: `1px solid ${parseFloat(satis.tutar) >= parseFloat(satisYatirim.guncel_deger) ? 'rgba(78,204,163,0.3)' : 'rgba(255,107,107,0.3)'}` }}>
          {parseFloat(satis.tutar) >= parseFloat(satisYatirim.maliyet)
            ? `🟢 Kar: +₺${(parseFloat(satis.tutar) - parseFloat(satisYatirim.maliyet)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
            : `🔴 Zarar: -₺${(parseFloat(satisYatirim.maliyet) - parseFloat(satis.tutar)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
          }
        </div>
      )}

      <div style={styles.modalBtnler}>
        <button style={styles.iptalBtn} onClick={() => { setSatisFormAcik(false); setSatisYatirim(null) }}>İptal</button>
        <button style={{ ...styles.kaydetBtn, background: 'linear-gradient(135deg,#ff6b6b,#ff8c42)' }}
          onClick={satisYap} disabled={kaydediliyor}>
          {kaydediliyor ? 'İşleniyor...' : '📤 Satışı Onayla'}
        </button>
      </div>
    </div>
  </div>
)}

      {formAcik && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalBaslik}>Yeni Yatırım Ekle</h3>

            <label style={styles.label}>Yatırım Adı</label>
            <input style={styles.input} placeholder="örn. THYAO, BTC, USD, Altın"
              value={yeni.ad} onChange={e => setYeni({ ...yeni, ad: e.target.value })} />

            <label style={styles.label}>Tür</label>
            <select style={styles.input} value={yeni.tur}
              onChange={e => setYeni({ ...yeni, tur: e.target.value })}>
              {turler.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <label style={styles.label}>Miktar / Adet</label>
            <input style={styles.input} type="number" placeholder="örn. 100 adet, 0.5 BTC, 1000 USD"
              value={yeni.miktar} onChange={e => setYeni({ ...yeni, miktar: e.target.value })} />

<label style={styles.label}>Birim Alış Fiyatı (₺)</label>
<input style={styles.input} type="number" placeholder="Adet başına ödediğin fiyat"
  value={yeni.birim_maliyet}
  onChange={e => setYeni({ ...yeni, birim_maliyet: e.target.value })} />

<label style={styles.label}>Komisyon (₺) — 0 bırakabilirsin</label>
<input style={styles.input} type="number" placeholder="0"
  value={yeni.komisyon}
  onChange={e => setYeni({ ...yeni, komisyon: e.target.value })} />

{yeni.miktar && yeni.birim_maliyet && (
  <div style={styles.bilgiMesaj}>
    💡 Toplam maliyet: <strong>₺{((parseFloat(yeni.miktar) * parseFloat(yeni.birim_maliyet)) + (parseFloat(yeni.komisyon) || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong>
    {' · '}Güncel fiyat kayıt sırasında otomatik çekilecek
  </div>
)}

            <label style={styles.label}>Para Birimi</label>
            <select style={styles.input} value={yeni.para_birimi}
              onChange={e => setYeni({ ...yeni, para_birimi: e.target.value })}>
              {paraBirimleri.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

          <label style={styles.label}>Yatırım Hesabı / Aracı Kurum (isteğe bağlı)</label>
<select style={styles.input} value={yeni.hesap_id}
  onChange={e => setYeni({ ...yeni, hesap_id: e.target.value })}>
  <option value="">Hesap seç</option>
  {hesaplar.map(h => (
    <option key={h.id} value={h.id}>{h.ad}</option>
  ))}
</select>

<div style={styles.toggleSatir}>
  <span style={styles.toggleLabel}>Başka hesaptan para düşsün mü?</span>
  <div style={{ ...styles.toggle, background: yeni.hesaptan_duş ? '#4ecca3' : 'rgba(255,255,255,0.1)' }}
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
                {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {yukleniyor ? (
        <div style={styles.yukleniyor}>Yükleniyor...</div>
      ) : yatirimlar.length === 0 ? (
        <div style={styles.bos}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Henüz yatırım eklenmemiş.</p>
        </div>
      ) : (
        <div style={styles.liste}>
          {yatirimlar.map(y => {
            const karZarar = parseFloat(y.guncel_deger) - parseFloat(y.maliyet)
            const getiri = parseFloat(y.maliyet) > 0 ? ((karZarar / parseFloat(y.maliyet)) * 100).toFixed(2) : 0
            return (
              <div key={y.id} style={{ ...styles.kart, borderLeft: `4px solid ${turRenk[y.tur] || '#a8a8b3'}` }}>
                <div style={styles.kartSol}>
                  <span style={styles.ikon}>{turIkon[y.tur] || '💼'}</span>
                  <div>
                    <div style={styles.ad}>{y.ad}</div>
                    <div style={styles.tur}>
                      {y.tur}{parseFloat(y.miktar) > 0 ? ` · ${y.miktar} adet` : ''}
                      {y.hesaplar?.ad && (
                        <span style={styles.hesapTag}>📂 {y.hesaplar.ad}</span>
                      )}
                    </div>
                  </div>
                </div>
<div style={styles.kartOrta}>
  <div style={styles.detayLabel}>Miktar</div>
  <div style={styles.detayDeger}>{parseFloat(y.miktar) > 0 ? `${y.miktar} adet` : '—'}</div>
</div>
<div style={styles.kartOrta}>
  <div style={styles.detayLabel}>Birim Maliyet</div>
  <div style={styles.detayDeger}>
    {y.birim_maliyet > 0
      ? `₺${parseFloat(y.birim_maliyet).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
      : '—'}
  </div>
</div>
<div style={styles.kartOrta}>
  <div style={styles.detayLabel}>Güncel Fiyat</div>
  <div style={styles.detayDeger}>
    {y.birim_fiyat > 0 && parseFloat(y.miktar) > 0
      ? `₺${parseFloat(y.birim_fiyat).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
      : '—'}
  </div>
</div>
<div style={styles.kartOrta}>
  <div style={styles.detayLabel}>Toplam Maliyet</div>
  <div style={styles.detayDeger}>₺{parseFloat(y.maliyet).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
</div>
<div style={styles.kartOrta}>
  <div style={styles.detayLabel}>Güncel Değer</div>
  <div style={styles.detayDeger}>₺{parseFloat(y.guncel_deger).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
</div>
                <div style={styles.kartSag}>
                  <div style={{ color: karZarar >= 0 ? '#4ecca3' : '#ff6b6b', fontSize: '18px', fontWeight: 'bold' }}>
                    {karZarar >= 0 ? '+' : ''}₺{karZarar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ color: karZarar >= 0 ? '#4ecca3' : '#ff6b6b', fontSize: '13px' }}>
                    {getiri >= 0 ? '+' : ''}{getiri}%
                  </div>
                </div>
                <button style={styles.duzenleBtn} onClick={() => {
  setDuzenleYatirim(y)
  setDuzenleModal(true)
}}>✏️</button>
                <button style={styles.satisBtn} onClick={() => {
  setSatisYatirim(y)
  setSatis({ miktar: '', tutar: y.guncel_deger, hesap_id: '', tarih: new Date().toISOString().split('T')[0] })
  setSatisFormAcik(true)
}}>📤 Sat</button>
<button style={styles.silBtn} onClick={() => yatirimSil(y.id)}>🗑️</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  ozetGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' },
  ozetKart: { background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '20px', textAlign: 'center' },
  ozetLabel: { color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '8px' },
  ozetDeger: { fontSize: '20px', fontWeight: 'bold' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  guncelleBtn: { padding: '12px 20px', background: 'rgba(69,183,209,0.15)', border: '1px solid #45b7d1', borderRadius: '10px', color: '#45b7d1', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  ekleBtn: { padding: '12px 24px', background: 'linear-gradient(135deg,#4ecca3,#38b2ac)', border: 'none', borderRadius: '10px', color: '#0f172a', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#1e293b', borderRadius: '20px', padding: '32px', width: '420px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' },
  modalBaslik: { color: '#fff', fontSize: '18px', margin: '0 0 20px 0' },
  toggleSatir: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' },
  toggleLabel: { color: 'rgba(255,255,255,0.7)', fontSize: '14px' },
  toggle: { width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' },
  toggleTop: { position: 'absolute', top: '2px', left: '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'transform 0.3s' },
  bilgiMesaj: { background: 'rgba(78,204,163,0.1)', border: '1px solid rgba(78,204,163,0.3)', borderRadius: '10px', padding: '12px', color: '#4ecca3', fontSize: '13px', marginBottom: '14px' },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: '13px', display: 'block', marginBottom: '6px' },
  input: { width: '100%', padding: '12px', marginBottom: '14px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' },
  modalBtnler: { display: 'flex', gap: '12px', marginTop: '8px' },
  iptalBtn: { flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' },
  kaydetBtn: { flex: 1, padding: '12px', background: 'linear-gradient(135deg,#4ecca3,#38b2ac)', border: 'none', borderRadius: '10px', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer' },
  yukleniyor: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '48px' },
  bos: { textAlign: 'center', padding: '64px' },
  liste: { display: 'flex', flexDirection: 'column', gap: '12px' },
  kart: { display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' },
  kartSol: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1.5 },
  ikon: { fontSize: '28px' },
  ad: { color: '#fff', fontSize: '15px', fontWeight: 'bold' },
  tur: { color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' },
  hesapTag: { background: 'rgba(78,204,163,0.1)', color: '#4ecca3', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' },
  kartOrta: { flex: 1, textAlign: 'center' },
  detayLabel: { color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px' },
  detayDeger: { color: '#fff', fontSize: '14px', fontWeight: '500' },
  duzenleBtn: { padding: '6px 10px', background: 'rgba(69,183,209,0.15)', border: '1px solid rgba(69,183,209,0.3)', borderRadius: '8px', color: '#45b7d1', fontSize: '13px', cursor: 'pointer' },
  kartSag: { textAlign: 'right', minWidth: '120px' },
  satisBtn: { padding: '6px 14px', background: 'rgba(255,140,66,0.15)', border: '1px solid rgba(255,140,66,0.4)', borderRadius: '8px', color: '#ff8c42', fontSize: '13px', cursor: 'pointer' },
  silBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.4 },
}

export default Yatirimlar