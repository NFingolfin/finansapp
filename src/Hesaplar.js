import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useLang } from './LangContext'

function Hesaplar({ session, mobil, gizliMod }) {
  const { t } = useLang()
  const pm = (val, opts = { minimumFractionDigits: 2 }) =>
    gizliMod ? '****' : parseFloat(val || 0).toLocaleString('tr-TR', opts)
  const [hesaplar, setHesaplar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [formAcik, setFormAcik] = useState(false)
  const [yeniHesap, setYeniHesap] = useState({ ad: '', tur: 'Banka', bakiye: '', para_birimi: 'TRY', kesim_gunu: '', yatirim_hesabi: false })  
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [duzenleModal, setDuzenleModal] = useState(false)
  const [gizliHesaplar, setGizliHesaplar] = useState([])
const [siralamaAktif, setSiralamaAktif] = useState(false)
const [suruklenen, setSuruklenen] = useState(null)
  const [duzenleHesap, setDuzenleHesap] = useState(null)
  const [detayModal, setDetayModal] = useState(false)
const [detayHesap, setDetayHesap] = useState(null)
const [hesapYatirimlari, setHesapYatirimlari] = useState([])
const [touchBaslangic, setTouchBaslangic] = useState(null)

  const hesapTurleri = ['Banka', 'Nakit', 'Kredi Kartı', 'Yatırım', 'Borç', 'Diğer']
  const paraBirimleri = ['TRY', 'USD', 'EUR', 'GBP', 'ALTIN']


  const turRenkleri = {
    'Banka': '#0d9488',
    'Nakit': '#eab308',
    'Kredi Kartı': '#ef4444',
    'Yatırım': '#0ea5e9',
    'Borç': '#f97316',
    'Diğer': '#94a3b8'
  }

  const turIkonlari = {
    'Banka': '🏦',
    'Nakit': '💵',
    'Kredi Kartı': '💳',
    'Yatırım': '📈',
    'Borç': '📋',
    'Diğer': '💼'
  }

  useEffect(() => {
  const kayitliGizli = JSON.parse(localStorage.getItem('gizliHesaplar') || '[]')
  setGizliHesaplar(kayitliGizli)
}, [])

const hesapGizle = (id) => {
  const yeni = gizliHesaplar.includes(id)
    ? gizliHesaplar.filter(h => h !== id)
    : [...gizliHesaplar, id]
  setGizliHesaplar(yeni)
  localStorage.setItem('gizliHesaplar', JSON.stringify(yeni))
}

const handleDragStart = (e, hesapId) => {
  setSuruklenen(hesapId)
  e.dataTransfer.effectAllowed = 'move'
}

const handleDragOver = (e) => {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}

const handleDrop = async (e, hedefId) => {
  e.preventDefault()
  if (!suruklenen || suruklenen === hedefId) return

  const yeniSira = [...hesaplar]
  const kaynakIndex = yeniSira.findIndex(h => h.id === suruklenen)
  const hedefIndex = yeniSira.findIndex(h => h.id === hedefId)
  const [alinan] = yeniSira.splice(kaynakIndex, 1)
  yeniSira.splice(hedefIndex, 0, alinan)
  setHesaplar(yeniSira)
  setSuruklenen(null)

  // Supabase'e sırayı kaydet
  for (let i = 0; i < yeniSira.length; i++) {
    await supabase.from('hesaplar')
      .update({ sira_no: i })
      .eq('id', yeniSira[i].id)
  }
}
const handleTouchStart = (e, hesapId) => {
  if (!siralamaAktif) return
  setTouchBaslangic(hesapId)
  setSuruklenen(hesapId)
}

const handleTouchEnd = async (e) => {
  if (!siralamaAktif || !suruklenen) return
  
  const touch = e.changedTouches[0]
  const element = document.elementFromPoint(touch.clientX, touch.clientY)
  const hedefKart = element?.closest('[data-hesap-id]')
  const hedefId = hedefKart?.getAttribute('data-hesap-id')
  
  if (hedefId && hedefId !== suruklenen) {
    const yeniSira = [...hesaplar]
    const kaynakIndex = yeniSira.findIndex(h => h.id === suruklenen)
    const hedefIndex = yeniSira.findIndex(h => h.id === hedefId)
    const [alinan] = yeniSira.splice(kaynakIndex, 1)
    yeniSira.splice(hedefIndex, 0, alinan)
    setHesaplar(yeniSira)

    for (let i = 0; i < yeniSira.length; i++) {
      await supabase.from('hesaplar')
        .update({ sira_no: i })
        .eq('id', yeniSira[i].id)
    }
  }
  
  setSuruklenen(null)
  setTouchBaslangic(null)
}

  useEffect(() => {
    hesaplariGetir()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps


const hesaplariGetir = async () => {
  setYukleniyor(true)
  const { data, error } = await supabase
    .from('hesaplar')
    .select('*')
    .eq('user_id', session.user.id)
    .order('sira_no', { ascending: true })

  if (!error && data) {
    const { data: yatirimData } = await supabase
      .from('yatirimlar')
      .select('hesap_id, guncel_deger')
      .eq('user_id', session.user.id)

    // Güncel döviz kurlarını çek
    let kurlar = { USD: 1, EUR: 1, GBP: 1 }
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      const dovizData = await res.json()
      const usdTry = dovizData.rates?.TRY || 1
      kurlar = {
        USD: usdTry,
        EUR: usdTry / dovizData.rates?.EUR,
        GBP: usdTry / dovizData.rates?.GBP,
      }
    } catch (e) {
      console.error('Kur çekme hatası:', e)
    }

    const hesaplarlaYatirim = data.map(hesap => {
      const baglıYatirimlar = (yatirimData || []).filter(y => y.hesap_id === hesap.id)
      const yatirimToplam = baglıYatirimlar.reduce((a, y) => a + parseFloat(y.guncel_deger), 0)
      
      // TL karşılığını hesapla
      const kur = hesap.para_birimi !== 'TRY' ? (kurlar[hesap.para_birimi] || 1) : 1
      const bakiyeTL = parseFloat(hesap.bakiye) * kur

      return { ...hesap, yatirim_toplam: yatirimToplam, bakiye_tl: bakiyeTL, kur }
    })

    setHesaplar(hesaplarlaYatirim)
  }
  setYukleniyor(false)
}



  const hesapEkle = async () => {
    if (!yeniHesap.ad || yeniHesap.bakiye === '') return
    setKaydediliyor(true)
const { error } = await supabase.from('hesaplar').insert({
  user_id: session.user.id,
  ad: yeniHesap.ad,
  tur: yeniHesap.tur,
  bakiye: parseFloat(yeniHesap.bakiye),
  para_birimi: yeniHesap.para_birimi,
  kesim_gunu: yeniHesap.tur === 'Kredi Kartı' ? parseInt(yeniHesap.kesim_gunu) || 1 : null,
  yatirim_hesabi: yeniHesap.yatirim_hesabi
})

    if (!error) {
      setFormAcik(false)
      setYeniHesap({ ad: '', tur: 'Banka', bakiye: '', para_birimi: 'TRY' })
      hesaplariGetir()
    }
    setKaydediliyor(false)
  }

  const hesapSil = async (id) => {
    if (!window.confirm('Bu hesabı silmek istediğine emin misin?')) return
    await supabase.from('hesaplar').delete().eq('id', id)
    hesaplariGetir()
  }
  const hesapGuncelle = async () => {
  if (!duzenleHesap.ad) return
  setKaydediliyor(true)
  const { error } = await supabase.from('hesaplar').update({
    ad: duzenleHesap.ad,
    tur: duzenleHesap.tur,
    bakiye: parseFloat(duzenleHesap.bakiye),
    para_birimi: duzenleHesap.para_birimi,
    kesim_gunu: duzenleHesap.tur === 'Kredi Kartı' ? parseInt(duzenleHesap.kesim_gunu) || 1 : null,
     yatirim_hesabi: duzenleHesap.yatirim_hesabi || false
  }).eq('id', duzenleHesap.id)
  if (!error) {
    setDuzenleModal(false)
    setDuzenleHesap(null)
    hesaplariGetir()
  }
  setKaydediliyor(false)
}
const hesapDetayAc = async (hesap) => {
  setDetayHesap(hesap)
  setDetayModal(true)
  const { data } = await supabase
    .from('yatirimlar')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('hesap_id', hesap.id)
  setHesapYatirimlari(data || [])
}

const toplamTRY = hesaplar
  .filter(h => h.tur !== 'Borç')
  .reduce((acc, h) => {
    const kur = h.kur || 1
    const bakiyeTL = parseFloat(h.bakiye || 0) * kur
    const yatirimTL = (h.yatirim_toplam || 0) * kur
    return acc + bakiyeTL + yatirimTL
  }, 0)

  const toplamBorc = hesaplar
    .filter(h => h.tur === 'Borç')
    .reduce((acc, h) => acc + parseFloat(h.bakiye || 0) * (h.kur || 1), 0)

  return (
    <div>
      {/* Üst Özet */}
      <div style={{ ...styles.ozetGrid, gridTemplateColumns: mobil ? 'repeat(2,1fr)' : 'repeat(4,1fr)' }}>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Toplam Varlık (TRY)</div>
          <div style={{ ...styles.ozetDeger, color: '#0d9488' }}>₺{pm(toplamTRY)}</div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Toplam Borç</div>
          <div style={{ ...styles.ozetDeger, color: '#ef4444' }}>₺{pm(toplamBorc)}</div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Net Durum</div>
          <div style={{ ...styles.ozetDeger, color: (toplamTRY - toplamBorc) >= 0 ? '#0d9488' : '#ef4444' }}>
            ₺{pm(toplamTRY - toplamBorc)}
          </div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Hesap Sayısı</div>
          <div style={{ ...styles.ozetDeger, color: '#0ea5e9' }}>{hesaplar.length}</div>
        </div>
      </div>

      {/* Hesap Ekle Butonu */}
<div style={styles.toolbar}>
  <div style={{ display: 'flex', gap: '10px' }}>
    <button
      style={{ ...styles.ekleBtn, background: siralamaAktif ? 'rgba(13,148,136,0.12)' : 'var(--bg-subtle)', border: siralamaAktif ? '1px solid #0d9488' : '1px solid var(--border)', color: siralamaAktif ? '#0d9488' : 'var(--text-secondary)' }}
      onClick={() => setSiralamaAktif(!siralamaAktif)}>
      {siralamaAktif ? '✅ Sıralamayı Bitir' : '↕️ Sırala'}
    </button>
    {gizliHesaplar.length > 0 && (
      <button
        style={{ ...styles.ekleBtn, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        onClick={() => { setGizliHesaplar([]); localStorage.removeItem('gizliHesaplar') }}>
        👁️ Tümünü Göster ({gizliHesaplar.length})
      </button>
    )}
  </div>
  <button style={styles.ekleBtn} onClick={() => setFormAcik(true)}>+ Yeni Hesap Ekle</button>
</div>

{detayModal && detayHesap && (
  <div style={styles.modalOverlay}>
    <div style={{ ...styles.modal, width: mobil ? '95vw' : '560px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', margin: 0 }}>
          📂 {detayHesap.ad}
        </h3>
        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}
          onClick={() => setDetayModal(false)}>✕</button>
      </div>

      {/* Nakit Bakiye */}
      <div style={styles.detayOzetKart}>
        <div style={styles.detayOzetSatir}>
          <span style={styles.detayOzetLabel}>💵 Nakit Bakiye</span>
          <span style={{ color: '#0d9488', fontWeight: 'bold', fontSize: '16px' }}>
            {detayHesap.para_birimi === 'TRY' ? '₺' : detayHesap.para_birimi + ' '}
            {parseFloat(detayHesap.bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        {hesapYatirimlari.length > 0 && (
          <div style={styles.detayOzetSatir}>
            <span style={styles.detayOzetLabel}>📈 Yatırım Değeri</span>
            <span style={{ color: '#0ea5e9', fontWeight: 'bold', fontSize: '16px' }}>
              ₺{hesapYatirimlari.reduce((a, y) => a + parseFloat(y.guncel_deger), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        {hesapYatirimlari.length > 0 && (
          <div style={{ ...styles.detayOzetSatir, borderBottom: 'none', paddingBottom: 0 }}>
            <span style={styles.detayOzetLabel}>💎 Toplam Değer</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '18px' }}>
              ₺{(parseFloat(detayHesap.bakiye) + hesapYatirimlari.reduce((a, y) => a + parseFloat(y.guncel_deger), 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* Yatırımlar Listesi */}
      {hesapYatirimlari.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
          Bu hesaba bağlı yatırım yok
        </div>
      ) : (
        <>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '20px 0 12px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Yatırımlar
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {hesapYatirimlari.map(y => {
              const karZarar = parseFloat(y.guncel_deger) - parseFloat(y.maliyet)
              const getiri = parseFloat(y.maliyet) > 0 ? ((karZarar / parseFloat(y.maliyet)) * 100).toFixed(1) : 0
              const turRenk = {
                'Hisse': '#0d9488', 'Kripto': '#eab308', 'Fon': '#0ea5e9',
                'Döviz': '#a78bfa', 'Altın': '#f59e0b', 'BES': '#34d399', 'Diğer': '#94a3b8'
              }
              return (
                <div key={y.id} style={styles.detayYatirimSatir}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: turRenk[y.tur] || '#a8a8b3', flexShrink: 0 }} />
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>{y.ad}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {y.tur}{parseFloat(y.miktar) > 0 ? ` · ${y.miktar} adet` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '100px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Maliyet</div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px' }}>₺{parseFloat(y.maliyet).toLocaleString('tr-TR', { minimumFractionDigits: 0 })}</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '100px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Güncel</div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px' }}>₺{parseFloat(y.guncel_deger).toLocaleString('tr-TR', { minimumFractionDigits: 0 })}</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '80px' }}>
                    <div style={{ color: karZarar >= 0 ? '#0d9488' : '#ef4444', fontSize: '13px', fontWeight: 'bold' }}>
                      {karZarar >= 0 ? '+' : ''}{getiri}%
                    </div>
                    <div style={{ color: karZarar >= 0 ? '#0d9488' : '#ef4444', fontSize: '12px' }}>
                      {karZarar >= 0 ? '+' : ''}₺{karZarar.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  </div>
)}
{duzenleModal && duzenleHesap && (
  <div style={styles.modalOverlay}>
    <div style={{ ...styles.modal, width: mobil ? '95vw' : '400px' }}>
      <h3 style={styles.modalBaslik}>Hesabı Düzenle</h3>

      <label style={styles.label}>Hesap Adı</label>
      <input style={styles.input} placeholder="Hesap adı"
        value={duzenleHesap.ad}
        onChange={e => setDuzenleHesap({ ...duzenleHesap, ad: e.target.value })} />

      <label style={styles.label}>Hesap Türü</label>
      <select style={styles.input} value={duzenleHesap.tur}
        onChange={e => setDuzenleHesap({ ...duzenleHesap, tur: e.target.value })}>
        {hesapTurleri.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <label style={styles.label}>Güncel Bakiye</label>
      <input style={styles.input} type="number" placeholder="0.00"
        value={duzenleHesap.bakiye}
        onChange={e => setDuzenleHesap({ ...duzenleHesap, bakiye: e.target.value })} />

      <div style={styles.toggleSatir}>
        <span style={styles.toggleLabel}>Yatırım Hesabı mı?</span>
        <div style={{ ...styles.toggle, background: duzenleHesap.yatirim_hesabi ? '#0d9488' : 'var(--border)' }}
          onClick={() => setDuzenleHesap({ ...duzenleHesap, yatirim_hesabi: !duzenleHesap.yatirim_hesabi })}>
          <div style={{ ...styles.toggleTop, transform: duzenleHesap.yatirim_hesabi ? 'translateX(20px)' : 'translateX(0)' }} />
        </div>
      </div>

      <label style={styles.label}>Para Birimi</label>
      <select style={styles.input} value={duzenleHesap.para_birimi}
        onChange={e => setDuzenleHesap({ ...duzenleHesap, para_birimi: e.target.value })}>
        {paraBirimleri.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      {duzenleHesap.tur === 'Kredi Kartı' && (
        <>
          <label style={styles.label}>Hesap Kesim Günü</label>
          <input style={styles.input} type="number" placeholder="örn. 15"
            min="1" max="31"
            value={duzenleHesap.kesim_gunu || ''}
            onChange={e => setDuzenleHesap({ ...duzenleHesap, kesim_gunu: e.target.value })} />
        </>
      )}

      <div style={styles.modalBtnler}>
        <button style={styles.iptalBtn} onClick={() => { setDuzenleModal(false); setDuzenleHesap(null) }}>İptal</button>
        <button style={styles.kaydetBtn} onClick={hesapGuncelle} disabled={kaydediliyor}>
          {kaydediliyor ? 'Kaydediliyor...' : 'Güncelle'}
        </button>
      </div>
    </div>
  </div>
)}


      {/* Form Modal */}
      {formAcik && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, width: mobil ? '95vw' : '400px' }}>
            <h3 style={styles.modalBaslik}>Yeni Hesap Ekle</h3>

            <label style={styles.label}>Hesap Adı</label>
            <input
              style={styles.input}
              placeholder="örn. Yapı Kredi, Nakit"
              value={yeniHesap.ad}
              onChange={e => setYeniHesap({ ...yeniHesap, ad: e.target.value })}
            />

            <label style={styles.label}>Hesap Türü</label>
            <select
              style={styles.input}
              value={yeniHesap.tur}
              onChange={e => setYeniHesap({ ...yeniHesap, tur: e.target.value })}
            >
              {hesapTurleri.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <label style={styles.label}>Güncel Bakiye</label>
            <input
              style={styles.input}
              type="number"
              placeholder="0.00"
              value={yeniHesap.bakiye}
              onChange={e => setYeniHesap({ ...yeniHesap, bakiye: e.target.value })}
            />

            <label style={styles.label}>Para Birimi</label>
            <select
              style={styles.input}
              value={yeniHesap.para_birimi}
              onChange={e => setYeniHesap({ ...yeniHesap, para_birimi: e.target.value })}
            >
              {paraBirimleri.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {yeniHesap.tur === 'Kredi Kartı' && (
              <>
                <label style={styles.label}>Hesap Kesim Günü</label>
                <input
                  style={styles.input}
                  type="number"
                  placeholder="örn. 15 (ayın 15'i)"
                  min="1"
                  max="31"
                  value={yeniHesap.kesim_gunu}
                  onChange={e => setYeniHesap({ ...yeniHesap, kesim_gunu: e.target.value })}
                />
              </>
            )}

            <div style={styles.toggleSatir}>
              <span style={styles.toggleLabel}>Yatırım Hesabı mı?</span>
              <div
                style={{ ...styles.toggle, background: yeniHesap.yatirim_hesabi ? '#0d9488' : 'var(--border)' }}
                onClick={() => setYeniHesap({ ...yeniHesap, yatirim_hesabi: !yeniHesap.yatirim_hesabi })}
              >
                <div style={{ ...styles.toggleTop, transform: yeniHesap.yatirim_hesabi ? 'translateX(20px)' : 'translateX(0)' }} />
              </div>
            </div>

            <div style={styles.modalBtnler}>
              <button style={styles.iptalBtn} onClick={() => setFormAcik(false)}>İptal</button>
              <button style={styles.kaydetBtn} onClick={hesapEkle} disabled={kaydediliyor}>
                {kaydediliyor ? t('kaydediliyor') : t('kaydet')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hesap Listesi */}
      {yukleniyor ? (
        <div style={styles.yukleniyor}>{t('yukleniyor')}</div>
      ) : hesaplar.length === 0 ? (
        <div style={styles.bos}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏦</div>
          <p style={{ color: 'var(--text-muted)' }}>Henüz hesap eklenmemiş. İlk hesabını ekle!</p>
        </div>
      ) : (
        <div style={{ ...styles.hesapGrid, gridTemplateColumns: mobil ? '1fr' : 'repeat(3,1fr)' }}>
          {hesaplar.map(hesap => (
<div
  key={hesap.id}
  data-hesap-id={hesap.id}
  draggable={siralamaAktif}
  onDragStart={siralamaAktif ? (e) => handleDragStart(e, hesap.id) : undefined}
  onDragOver={siralamaAktif ? handleDragOver : undefined}
  onDrop={siralamaAktif ? (e) => handleDrop(e, hesap.id) : undefined}
  onTouchStart={siralamaAktif ? (e) => handleTouchStart(e, hesap.id) : undefined}
  onTouchEnd={siralamaAktif ? handleTouchEnd : undefined}
  style={{
    ...styles.hesapKart,
    borderLeft: `4px solid ${turRenkleri[hesap.tur] || '#a8a8b3'}`,
    cursor: siralamaAktif ? 'grab' : 'pointer',
    opacity: suruklenen === hesap.id ? 0.5 : gizliHesaplar.includes(hesap.id) ? 0.3 : 1,
    transition: 'opacity 0.2s',
    display: gizliHesaplar.includes(hesap.id) && !siralamaAktif ? 'none' : undefined
  }}
  onClick={!siralamaAktif ? () => hesapDetayAc(hesap) : undefined}>
              <div style={styles.hesapUst}>
                <span style={styles.hesapIkon}>{turIkonlari[hesap.tur] || '💼'}</span>
                <div>
                  <div style={styles.hesapAd}>{hesap.ad}</div>
                  <div style={styles.hesapTur}>{hesap.tur}</div>
                  {hesap.yatirim_hesabi && (
                <span style={{ background: 'rgba(13,148,136,0.1)', color: '#0d9488', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', marginLeft: '6px' }}>
                 📈 Yatırım Hesabı
                 </span>
                      )}
                </div>
                <button style={styles.gizleBtn} onClick={(e) => { e.stopPropagation(); hesapGizle(hesap.id) }}>
  {gizliHesaplar.includes(hesap.id) ? '👁️' : '🙈'}
</button>
                <button style={styles.duzenleBtn} onClick={() => { setDuzenleHesap(hesap); setDuzenleModal(true) }}>✏️</button>
                <button style={styles.silBtn} onClick={() => hesapSil(hesap.id)}>🗑️</button>
              </div>
<div style={{ ...styles.hesapBakiye, color: turRenkleri[hesap.tur] || '#0f172a' }}>
  {gizliMod ? '****' : (
    (hesap.para_birimi === 'TRY' ? '₺' : hesap.para_birimi + ' ') +
    (hesap.yatirim_hesabi && hesap.yatirim_toplam > 0
      ? (parseFloat(hesap.bakiye) + hesap.yatirim_toplam).toLocaleString('tr-TR', { minimumFractionDigits: 2 })
      : parseFloat(hesap.bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 2 }))
  )}
</div>
{hesap.para_birimi !== 'TRY' && (
  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
    ≈ ₺{gizliMod ? '****' : (hesap.bakiye_tl || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
  </div>
)}
{hesap.yatirim_hesabi && hesap.yatirim_toplam > 0 && !gizliMod && (
  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
    {(() => {
      const s = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' }[hesap.para_birimi] || hesap.para_birimi + ' '
      return `Nakit: ${s}${parseFloat(hesap.bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 0 })} + Yatırım: ${s}${hesap.yatirim_toplam.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`
    })()}
  </div>
)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  ozetGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' },
  ozetKart: { background: 'var(--bg-card)', borderRadius: '14px', padding: '16px', textAlign: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' },
  ozetLabel: { color: 'var(--text-muted)', fontSize: '11px', marginBottom: '6px' },
  ozetDeger: { fontSize: '18px', fontWeight: 'bold' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '8px', flexWrap: 'wrap' },
  ekleBtn: { padding: '10px 20px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--bg-card)', borderRadius: '20px', padding: '28px', width: '400px', border: '1px solid var(--border)', boxSizing: 'border-box', boxShadow: 'var(--shadow-md)' },
  modalBaslik: { color: 'var(--text-primary)', fontSize: '18px', margin: '0 0 20px 0' },
  modalBtnler: { display: 'flex', gap: '12px', marginTop: '8px' },
  label: { color: 'var(--text-secondary)', fontSize: '13px', display: 'block', marginBottom: '6px' },
  input: { width: '100%', padding: '11px 12px', marginBottom: '14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' },
  iptalBtn: { flex: 1, padding: '11px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer' },
  kaydetBtn: { flex: 1, padding: '11px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer' },
  yukleniyor: { color: 'var(--text-muted)', textAlign: 'center', padding: '48px' },
  bos: { textAlign: 'center', padding: '64px' },
  hesapGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px' },
  hesapKart: { background: 'var(--bg-card)', borderRadius: '14px', padding: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' },
  hesapUst: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  hesapIkon: { fontSize: '24px' },
  hesapAd: { color: 'var(--text-primary)', fontSize: '14px', fontWeight: 'bold' },
  hesapTur: { color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' },
  silBtn: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', opacity: 0.4 },
  duzenleBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', opacity: 0.4, marginRight: '4px' },
  toggleSatir: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' },
  toggleLabel: { color: 'var(--text-secondary)', fontSize: '14px' },
  toggle: { width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' },
  toggleTop: { position: 'absolute', top: '2px', left: '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'transform 0.3s' },
  detayOzetKart: { background: 'var(--bg-input)', borderRadius: '12px', padding: '14px', marginBottom: '8px', border: '1px solid var(--border)' },
  detayOzetSatir: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' },
  detayOzetLabel: { color: 'var(--text-secondary)', fontSize: '14px' },
  gizleBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.4, marginRight: '4px' },
  detayYatirimSatir: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' },
  hesapBakiye: { fontSize: '18px', fontWeight: 'bold' },
}

export default Hesaplar               