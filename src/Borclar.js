import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function Borclar({ session }) {
  const [borclar, setBorclar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [formAcik, setFormAcik] = useState(false)
  const [odemeFormAcik, setOdemeFormAcik] = useState(null)
  const [odemeFormTutar, setOdemeFormTutar] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hesaplar, setHesaplar] = useState([])
  const [odemeHesapId, setOdemeHesapId] = useState('')
  const [acikGruplar, setAcikGruplar] = useState({})
  const [filtre, setFiltre] = useState('hepsi')
  const [yeni, setYeni] = useState({
    ad: '', tur: 'Kredi Kartı', toplam_borc: '', kalan_borc: '',
    minimum_odeme: '', son_odeme_tarihi: '', faiz_orani: '', banka: '', notlar: '',
    taksitli: false, taksit_sayisi: '', aylik_taksit: ''
  })

  const turler = ['Kredi Kartı', 'İhtiyaç Kredisi', 'Konut Kredisi', 'Taşıt Kredisi', 'Diğer']
  const turRenk = {
    'Kredi Kartı': '#ff6b6b', 'İhtiyaç Kredisi': '#ff8c42',
    'Konut Kredisi': '#a78bfa', 'Taşıt Kredisi': '#45b7d1', 'Diğer': '#a8a8b3'
  }
  const turIkon = {
    'Kredi Kartı': '💳', 'İhtiyaç Kredisi': '💰',
    'Konut Kredisi': '🏠', 'Taşıt Kredisi': '🚗', 'Diğer': '📋'
  }

  useEffect(() => {
  borclariGetir()
  hesaplariGetir()
}, [])

  const borclariGetir = async () => {
    setYukleniyor(true)
    const { data, error } = await supabase
      .from('borclar').select('*').eq('user_id', session.user.id)
      .eq('aktif', true).order('son_odeme_tarihi', { ascending: true })
    if (!error) setBorclar(data)
    setYukleniyor(false)
  }
  const hesaplariGetir = async () => {
  const { data } = await supabase
    .from('hesaplar')
    .select('id, ad, tur')
    .eq('user_id', session.user.id)
  if (data) {
    setHesaplar(data)
    if (data.length > 0) setOdemeHesapId(data[0].id)
  }
}

  const aylikTaksitHesapla = (toplam, sayi) => {
    if (!toplam || !sayi || sayi <= 0) return ''
    return (parseFloat(toplam) / parseInt(sayi)).toFixed(2)
  }

  const borcEkle = async () => {
    if (!yeni.ad || (!yeni.kalan_borc && !yeni.toplam_borc)) return
    setKaydediliyor(true)
    let kayit = {
      user_id: session.user.id,
      ad: yeni.ad, tur: yeni.tur, banka: yeni.banka, notlar: yeni.notlar,
      faiz_orani: parseFloat(yeni.faiz_orani) || 0,
      son_odeme_tarihi: yeni.son_odeme_tarihi || null,
      aktif: true, taksitli: yeni.taksitli, odenen_tutar: 0
    }
    if (yeni.taksitli) {
      const aylik = parseFloat(aylikTaksitHesapla(yeni.toplam_borc, yeni.taksit_sayisi))
      kayit.toplam_borc = parseFloat(yeni.toplam_borc)
      kayit.kalan_borc = parseFloat(yeni.toplam_borc)
      kayit.taksit_sayisi = parseInt(yeni.taksit_sayisi)
      kayit.odenen_taksit = 0
      kayit.aylik_taksit = aylik
      kayit.minimum_odeme = aylik
    } else {
      kayit.toplam_borc = parseFloat(yeni.toplam_borc) || 0
      kayit.kalan_borc = parseFloat(yeni.kalan_borc) || parseFloat(yeni.toplam_borc) || 0
      kayit.minimum_odeme = parseFloat(yeni.minimum_odeme) || 0
      kayit.taksit_sayisi = 1
      kayit.odenen_taksit = 0
      kayit.aylik_taksit = 0
    }
    const { error } = await supabase.from('borclar').insert(kayit)
    if (!error) {
      setFormAcik(false)
      setYeni({ ad: '', tur: 'Kredi Kartı', toplam_borc: '', kalan_borc: '', minimum_odeme: '', son_odeme_tarihi: '', faiz_orani: '', banka: '', notlar: '', taksitli: false, taksit_sayisi: '', aylik_taksit: '' })
      borclariGetir()
    }
    setKaydediliyor(false)
  }

const odemeYap = async (borc) => {
  const tutar = parseFloat(odemeFormTutar)
  if (!tutar || tutar <= 0) return
  if (!odemeHesapId) return
  setKaydediliyor(true)

  // Grup ödemesi ise her borcu güncelle
  if (borc._grup) {
    for (const tekBorc of borc._kartBorclar) {
      const taksitTutar = parseFloat(tekBorc.minimum_odeme || tekBorc.aylik_taksit || 0)
      if (taksitTutar <= 0) continue

      const yeniOdenen = (parseFloat(tekBorc.odenen_tutar) || 0) + taksitTutar
      const yeniKalan = Math.max(0, parseFloat(tekBorc.kalan_borc) - taksitTutar)
      const bitti = yeniKalan <= 0

      let guncelleme = { odenen_tutar: yeniOdenen, kalan_borc: yeniKalan, aktif: !bitti }

      if (tekBorc.taksitli) {
        const odenenTaksit = Math.floor(yeniOdenen / parseFloat(tekBorc.aylik_taksit))
        guncelleme.odenen_taksit = Math.min(odenenTaksit, tekBorc.taksit_sayisi)
        if (!bitti && tekBorc.son_odeme_tarihi) {
          const t = new Date(tekBorc.son_odeme_tarihi)
          t.setMonth(t.getMonth() + 1)
          guncelleme.son_odeme_tarihi = t.toISOString().split('T')[0]
        }
      }
      await supabase.from('borclar').update(guncelleme).eq('id', tekBorc.id)
    }

    // Tek seferde toplam işlem ekle
    await supabase.from('islemler').insert({
      user_id: session.user.id,
      hesap_id: odemeHesapId,
      tarih: new Date().toISOString().split('T')[0],
      tutar: tutar,
      tur: 'gider',
      kategori: 'Borç Ödemesi',
      aciklama: `${borc.ad} — aylık ödeme`
    })

    setOdemeFormAcik(null)
    setOdemeFormTutar('')
    borclariGetir()
    setKaydediliyor(false)
    return
  }

  // Tekil ödeme — mevcut kod
  const yeniOdenen = (parseFloat(borc.odenen_tutar) || 0) + tutar
  const yeniKalan = Math.max(0, parseFloat(borc.kalan_borc) - tutar)
  const bitti = yeniKalan <= 0

  let guncelleme = { odenen_tutar: yeniOdenen, kalan_borc: yeniKalan, aktif: !bitti }

  if (borc.taksitli) {
    const odenenTaksit = Math.floor(yeniOdenen / parseFloat(borc.aylik_taksit))
    guncelleme.odenen_taksit = Math.min(odenenTaksit, borc.taksit_sayisi)
    if (!bitti && borc.son_odeme_tarihi) {
      const t = new Date(borc.son_odeme_tarihi)
      t.setMonth(t.getMonth() + 1)
      guncelleme.son_odeme_tarihi = t.toISOString().split('T')[0]
    }
  }

  await supabase.from('borclar').update(guncelleme).eq('id', borc.id)

  await supabase.from('islemler').insert({
    user_id: session.user.id,
    hesap_id: odemeHesapId,
    tarih: new Date().toISOString().split('T')[0],
    tutar: tutar,
    tur: 'gider',
    kategori: 'Borç Ödemesi',
    aciklama: `${borc.ad} - borç ödemesi`
  })

  setOdemeFormAcik(null)
  setOdemeFormTutar('')
  borclariGetir()
  setKaydediliyor(false)
}

  const borcKapat = async (id) => {
    if (!window.confirm('Bu borcu kapatılmış olarak işaretlemek istiyor musun?')) return
    await supabase.from('borclar').update({ aktif: false }).eq('id', id)
    borclariGetir()
  }

  const borcSil = async (id) => {
    if (!window.confirm('Bu borcu silmek istediğine emin misin?')) return
    await supabase.from('borclar').delete().eq('id', id)
    borclariGetir()
  }

  const bugun = new Date()

  // Kredi kartlarını bankaya göre grupla
  const gruplar = {}
  const diger = []

  borclar.forEach(borc => {
    if (borc.tur === 'Kredi Kartı') {
      const key = borc.banka || borc.ad
      if (!gruplar[key]) gruplar[key] = []
      gruplar[key].push(borc)
    } else {
      diger.push(borc)
    }
  })

  const toplamKalan = borclar.reduce((a, b) => a + parseFloat(b.kalan_borc), 0)
  const toplamAylik = borclar.reduce((a, b) => a + parseFloat(b.minimum_odeme || b.aylik_taksit || 0), 0)
  const kritikBorclar = borclar.filter(b => {
    if (!b.son_odeme_tarihi) return false
    const fark = Math.ceil((new Date(b.son_odeme_tarihi) - bugun) / (1000 * 60 * 60 * 24))
    return fark <= 7 && fark >= 0
  }).length

  const buAyOdeme = borclar.filter(b => {
    if (!b.son_odeme_tarihi) return false
    const t = new Date(b.son_odeme_tarihi)
    return t.getMonth() === bugun.getMonth() && t.getFullYear() === bugun.getFullYear()
  }).reduce((a, b) => a + parseFloat(b.minimum_odeme || b.aylik_taksit || 0), 0)

  const gunFarki = (tarih) => {
    if (!tarih) return null
    return Math.ceil((new Date(tarih) - bugun) / (1000 * 60 * 60 * 24))
  }
  const odemeRengi = (tarih) => {
    const f = gunFarki(tarih)
    if (f === null) return 'rgba(255,255,255,0.4)'
    if (f < 0) return '#ff6b6b'
    if (f <= 3) return '#ff6b6b'
    if (f <= 7) return '#ff8c42'
    if (f <= 14) return '#ffd93d'
    return '#4ecca3'
  }
  const odemeLabel = (tarih) => {
    const f = gunFarki(tarih)
    if (f === null) return '—'
    if (f < 0) return `${Math.abs(f)} gün geçti!`
    if (f === 0) return 'Bugün!'
    if (f === 1) return 'Yarın!'
    return `${f} gün kaldı`
  }

  return (
    <div>
      {/* Üst Özet */}
      <div style={styles.ozetGrid}>
        <div style={{ ...styles.ozetKart, borderTop: '3px solid #ff6b6b' }}>
          <div style={styles.ozetIcon}>💳</div>
          <div style={{ ...styles.ozetDeger, color: '#ff6b6b' }}>₺{toplamKalan.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
          <div style={styles.ozetLabel}>Toplam Kalan Borç</div>
        </div>
        <div style={{ ...styles.ozetKart, borderTop: '3px solid #ff8c42' }}>
          <div style={styles.ozetIcon}>📅</div>
          <div style={{ ...styles.ozetDeger, color: '#ff8c42' }}>₺{toplamAylik.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
          <div style={styles.ozetLabel}>Aylık Toplam Ödeme</div>
        </div>
        <div style={{ ...styles.ozetKart, borderTop: '3px solid #ffd93d' }}>
          <div style={styles.ozetIcon}>🗓️</div>
          <div style={{ ...styles.ozetDeger, color: '#ffd93d' }}>₺{buAyOdeme.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
          <div style={styles.ozetLabel}>Bu Ay Ödenecek</div>
        </div>
        <div style={{ ...styles.ozetKart, borderTop: `3px solid ${kritikBorclar > 0 ? '#ff6b6b' : '#4ecca3'}` }}>
          <div style={styles.ozetIcon}>{kritikBorclar > 0 ? '⚠️' : '✅'}</div>
          <div style={{ ...styles.ozetDeger, color: kritikBorclar > 0 ? '#ff6b6b' : '#4ecca3' }}>{kritikBorclar}</div>
          <div style={styles.ozetLabel}>7 Günde Vadesi Gelen</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.filtreler}>
          <button style={filtre === 'hepsi' ? { ...styles.filtreBtn, ...styles.filtreBtnAktif } : styles.filtreBtn}
            onClick={() => setFiltre('hepsi')}>Tümü ({borclar.length})</button>
          <button style={filtre === 'kredi' ? { ...styles.filtreBtn, ...styles.filtreBtnAktif } : styles.filtreBtn}
            onClick={() => setFiltre('kredi')}>💳 Kredi Kartları ({Object.keys(gruplar).length})</button>
          <button style={filtre === 'diger' ? { ...styles.filtreBtn, ...styles.filtreBtnAktif } : styles.filtreBtn}
            onClick={() => setFiltre('diger')}>📋 Diğer ({diger.length})</button>
        </div>
        <button style={styles.ekleBtn} onClick={() => setFormAcik(true)}>+ Yeni Borç Ekle</button>
      </div>

      {/* Ödeme Formu Modal */}
      {odemeFormAcik && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, width: '360px' }}>
            <h3 style={styles.modalBaslik}>💳 Ödeme Yap</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '20px' }}>
              {odemeFormAcik.ad} — Kalan: ₺{parseFloat(odemeFormAcik.kalan_borc).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>

            {odemeFormAcik.taksitli && (
              <div style={styles.taksitBilgi}>
                💡 Aylık taksit tutarı: <strong>₺{parseFloat(odemeFormAcik.aylik_taksit).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong>
              </div>
            )}
            <label style={styles.label}>Hangi Hesaptan?</label>
            <select
             style={styles.input}
                value={odemeHesapId}
                 onChange={e => setOdemeHesapId(e.target.value)}
>
                      {hesaplar.map(h => (
                      <option key={h.id} value={h.id}>{h.ad}</option>
                         ))}
            </select>

            <label style={styles.label}>Ödenen Tutar (₺)</label>
            <input
              style={styles.input}
              type="number"
              placeholder="Ne kadar ödedin?"
              value={odemeFormTutar}
              onChange={e => setOdemeFormTutar(e.target.value)}
              autoFocus
            />

            <div style={styles.hizliButonlar}>
              {odemeFormAcik.taksitli && (
                <button style={styles.hizliBtn}
                  onClick={() => setOdemeFormTutar(parseFloat(odemeFormAcik.aylik_taksit).toString())}>
                  1 Taksit
                </button>
              )}
              <button style={styles.hizliBtn}
                onClick={() => setOdemeFormTutar(parseFloat(odemeFormAcik.minimum_odeme || odemeFormAcik.aylik_taksit || 0).toString())}>
                Min. Ödeme
              </button>
              <button style={styles.hizliBtn}
                onClick={() => setOdemeFormTutar(parseFloat(odemeFormAcik.kalan_borc).toString())}>
                Tamamı
              </button>
            </div>

            <div style={styles.modalBtnler}>
              <button style={styles.iptalBtn} onClick={() => { setOdemeFormAcik(null); setOdemeFormTutar('') }}>İptal</button>
              <button style={styles.kaydetBtn} onClick={() => odemeYap(odemeFormAcik)} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : '✅ Ödemeyi Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Borç Ekle Formu */}
      {formAcik && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalBaslik}>Yeni Borç Ekle</h3>

            <label style={styles.label}>Borç Adı</label>
            <input style={styles.input} placeholder="örn. Yapı Kredi Platinum, Konut Kredisi"
              value={yeni.ad} onChange={e => setYeni({ ...yeni, ad: e.target.value })} />

            <label style={styles.label}>Tür</label>
            <select style={styles.input} value={yeni.tur}
              onChange={e => setYeni({ ...yeni, tur: e.target.value })}>
              {turler.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <label style={styles.label}>Banka / Kurum</label>
            <input style={styles.input} placeholder="örn. Yapı Kredi, Garanti, Ziraat"
              value={yeni.banka} onChange={e => setYeni({ ...yeni, banka: e.target.value })} />

            <div style={styles.toggleSatir}>
              <span style={styles.toggleLabel}>Taksitli Harcama mı?</span>
              <div style={{ ...styles.toggle, background: yeni.taksitli ? '#4ecca3' : 'rgba(255,255,255,0.1)' }}
                onClick={() => setYeni({ ...yeni, taksitli: !yeni.taksitli, taksit_sayisi: '' })}>
                <div style={{ ...styles.toggleTop, transform: yeni.taksitli ? 'translateX(20px)' : 'translateX(0)' }} />
              </div>
            </div>

            {yeni.taksitli ? (
              <>
                <label style={styles.label}>Toplam Tutar (₺)</label>
                <input style={styles.input} type="number" placeholder="Toplam harcama tutarı"
                  value={yeni.toplam_borc} onChange={e => {
                    const t = e.target.value
                    setYeni({ ...yeni, toplam_borc: t, aylik_taksit: aylikTaksitHesapla(t, yeni.taksit_sayisi) })
                  }} />
                <label style={styles.label}>Taksit Sayısı</label>
                <input style={styles.input} type="number" placeholder="örn. 12, 24, 36"
                  value={yeni.taksit_sayisi} onChange={e => {
                    const s = e.target.value
                    setYeni({ ...yeni, taksit_sayisi: s, aylik_taksit: aylikTaksitHesapla(yeni.toplam_borc, s) })
                  }} />
                {yeni.aylik_taksit && (
                  <div style={styles.taksitBilgi}>
                    💡 Aylık taksit: <strong>₺{parseFloat(yeni.aylik_taksit).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={styles.ikiliBolum}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Toplam Borç (₺)</label>
                    <input style={styles.input} type="number" placeholder="0.00"
                      value={yeni.toplam_borc} onChange={e => setYeni({ ...yeni, toplam_borc: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Kalan Borç (₺)</label>
                    <input style={styles.input} type="number" placeholder="0.00"
                      value={yeni.kalan_borc} onChange={e => setYeni({ ...yeni, kalan_borc: e.target.value })} />
                  </div>
                </div>
                <div style={styles.ikiliBolum}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Min. Ödeme (₺)</label>
                    <input style={styles.input} type="number" placeholder="0.00"
                      value={yeni.minimum_odeme} onChange={e => setYeni({ ...yeni, minimum_odeme: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Faiz Oranı (%)</label>
                    <input style={styles.input} type="number" placeholder="0.00"
                      value={yeni.faiz_orani} onChange={e => setYeni({ ...yeni, faiz_orani: e.target.value })} />
                  </div>
                </div>
              </>
            )}

            <label style={styles.label}>{yeni.taksitli ? 'İlk Taksit Tarihi' : 'Son Ödeme Tarihi'}</label>
            <input style={styles.input} type="date"
              value={yeni.son_odeme_tarihi} onChange={e => setYeni({ ...yeni, son_odeme_tarihi: e.target.value })} />

            <label style={styles.label}>Notlar (isteğe bağlı)</label>
            <input style={styles.input} placeholder="örn. TV alımı, otomatik ödeme aktif"
              value={yeni.notlar} onChange={e => setYeni({ ...yeni, notlar: e.target.value })} />

            <div style={styles.modalBtnler}>
              <button style={styles.iptalBtn} onClick={() => setFormAcik(false)}>İptal</button>
              <button style={styles.kaydetBtn} onClick={borcEkle} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Borç Listesi */}
      {yukleniyor ? (
        <div style={styles.yukleniyor}>Yükleniyor...</div>
      ) : borclar.length === 0 ? (
        <div style={styles.bos}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px' }}>Hiç borcun yok, harika!</p>
        </div>
      ) : (
        <div style={styles.liste}>

{/* Kredi Kartı Grupları */}
{(filtre === 'hepsi' || filtre === 'kredi') && Object.entries(gruplar).map(([kartAdi, kartBorclar]) => {
  const toplamKalanKart = kartBorclar.reduce((a, b) => a + parseFloat(b.kalan_borc), 0)
  const buAyKart = kartBorclar.reduce((a, b) => a + parseFloat(b.minimum_odeme || b.aylik_taksit || 0), 0)
  const enYakinTarih = kartBorclar.filter(b => b.son_odeme_tarihi).sort((a, b) => new Date(a.son_odeme_tarihi) - new Date(b.son_odeme_tarihi))[0]?.son_odeme_tarihi
  const renk = odemeRengi(enYakinTarih)
  const acik = acikGruplar[kartAdi] || false

  return (
    <div key={kartAdi} style={styles.grupKart}>
      {/* Kart Başlığı — tıklanınca açılır */}
      <div style={{ ...styles.grupBaslik, cursor: 'pointer' }}
        onClick={() => setAcikGruplar(prev => ({ ...prev, [kartAdi]: !acik }))}>
        <div style={styles.grupSol}>
          <span style={{ fontSize: '28px' }}>💳</span>
          <div>
            <div style={styles.grupAd}>{kartAdi}</div>
            <div style={styles.grupAlt}>{kartBorclar.length} işlem · {acik ? '▲ Kapat' : '▼ Detaylar'}</div>
          </div>
        </div>
        <div style={styles.grupSag}>
          {enYakinTarih && (
            <div style={{ ...styles.vadeBadge, background: renk + '22', color: renk, border: `1px solid ${renk}44` }}>
              ⏰ {odemeLabel(enYakinTarih)}
            </div>
          )}
        </div>
      </div>

      {/* Kart Özet — her zaman görünür */}
      <div style={styles.grupOzet}>
        <div style={styles.grupOzetKutu}>
          <div style={styles.tutarLabel}>Toplam Kalan Borç</div>
          <div style={{ ...styles.tutarDeger, color: '#ff6b6b' }}>
            ₺{toplamKalanKart.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={styles.grupOzetKutu}>
          <div style={styles.tutarLabel}>Bu Ay Ödenecek</div>
          <div style={{ ...styles.tutarDeger, color: '#ffd93d' }}>
            ₺{buAyKart.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        {enYakinTarih && (
          <div style={styles.grupOzetKutu}>
            <div style={styles.tutarLabel}>Son Ödeme</div>
            <div style={{ ...styles.tutarDeger, color: renk }}>
              {new Date(enYakinTarih).toLocaleDateString('tr-TR')}
            </div>
          </div>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button style={styles.toplamOdemeBtn}
            onClick={(e) => {
              e.stopPropagation()
              setOdemeFormAcik({ 
                id: 'grup_' + kartAdi, 
                ad: kartAdi + ' — Tüm Borçlar', 
                kalan_borc: toplamKalanKart, 
                minimum_odeme: buAyKart,
                taksitli: false,
                _grup: true,
                _kartBorclar: kartBorclar
              })
              setOdemeFormTutar(buAyKart.toString())
            }}>
            💳 Bu Ayı Öde (₺{buAyKart.toLocaleString('tr-TR', { minimumFractionDigits: 0 })})
          </button>
        </div>
      </div>

      {/* Accordion — açıksa göster */}
      {acik && (
        <div style={styles.altBorclar}>
          {kartBorclar.map(borc => (
            <div key={borc.id} style={styles.altBorcSatir}>
              <div style={styles.altBorcSol}>
                <div style={styles.altBorcAd}>
                  {borc.ad}
                  {borc.taksitli && (
                    <span style={styles.taksitTag}>
                      {borc.odenen_taksit || 0}/{borc.taksit_sayisi} taksit
                    </span>
                  )}
                </div>
                {borc.notlar && <div style={styles.altBorcNot}>📝 {borc.notlar}</div>}
                {borc.taksitli && (
                  <div style={styles.altBorcNot}>
                    Aylık: ₺{parseFloat(borc.aylik_taksit).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} · 
                    Kalan: {borc.taksit_sayisi - (borc.odenen_taksit || 0)} taksit
                  </div>
                )}
              </div>
              <div style={styles.altBorcSag}>
                <div style={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: '15px' }}>
                  ₺{parseFloat(borc.kalan_borc).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
                {borc.taksitli && (
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                    aylık ₺{parseFloat(borc.aylik_taksit).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
              <div style={styles.altBorcBtnler}>
                <button style={styles.odemeBtn}
                  onClick={() => { setOdemeFormAcik(borc); setOdemeFormTutar('') }}>
                  💳 Ödeme
                </button>
                <button style={styles.silBtnKucuk} onClick={() => borcSil(borc.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})}

          {/* Diğer Borçlar */}
          {(filtre === 'hepsi' || filtre === 'diger') && diger.map(borc => {
            const renk = odemeRengi(borc.son_odeme_tarihi)
            const ilerleme = borc.taksitli
              ? ((borc.odenen_taksit || 0) / borc.taksit_sayisi) * 100
              : borc.toplam_borc > 0 ? Math.min(100, ((borc.toplam_borc - borc.kalan_borc) / borc.toplam_borc) * 100) : 0

            return (
              <div key={borc.id} style={{ ...styles.borcKart, borderLeft: `4px solid ${turRenk[borc.tur] || '#a8a8b3'}` }}>
                <div style={styles.borcUst}>
                  <div style={styles.borcSolUst}>
                    <span style={{ fontSize: '28px' }}>{turIkon[borc.tur] || '📋'}</span>
                    <div>
                      <div style={styles.borcAd}>{borc.ad}</div>
                      <div style={styles.borcBanka}>{borc.banka || borc.tur}
                        {borc.taksitli && <span style={styles.taksitTag}>{borc.odenen_taksit || 0}/{borc.taksit_sayisi} taksit</span>}
                      </div>
                    </div>
                  </div>
                  <div style={styles.borcSagUst}>
                    {borc.son_odeme_tarihi && (
                      <div style={{ ...styles.vadeBadge, background: renk + '22', color: renk, border: `1px solid ${renk}44` }}>
                        ⏰ {odemeLabel(borc.son_odeme_tarihi)}
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.tutarlar}>
                  <div style={styles.tutarKutu}>
                    <div style={styles.tutarLabel}>Kalan Borç</div>
                    <div style={{ ...styles.tutarDeger, color: '#ff6b6b' }}>
                      ₺{parseFloat(borc.kalan_borc).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  {borc.toplam_borc > 0 && (
                    <div style={styles.tutarKutu}>
                      <div style={styles.tutarLabel}>Toplam Borç</div>
                      <div style={styles.tutarDeger}>₺{parseFloat(borc.toplam_borc).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                    </div>
                  )}
                  <div style={styles.tutarKutu}>
                    <div style={styles.tutarLabel}>{borc.taksitli ? 'Aylık Taksit' : 'Min. Ödeme'}</div>
                    <div style={{ ...styles.tutarDeger, color: '#ffd93d' }}>
                      ₺{parseFloat(borc.taksitli ? borc.aylik_taksit : borc.minimum_odeme || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  {borc.son_odeme_tarihi && (
                    <div style={styles.tutarKutu}>
                      <div style={styles.tutarLabel}>Son Ödeme</div>
                      <div style={{ ...styles.tutarDeger, color: renk }}>
                        {new Date(borc.son_odeme_tarihi).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  )}
                </div>

                {borc.toplam_borc > 0 && (
                  <div style={styles.ilerlemeContainer}>
                    <div style={styles.ilerlemeUst}>
                      <span style={styles.ilerlemeLabel}>
                        {borc.taksitli ? `${borc.odenen_taksit || 0}/${borc.taksit_sayisi} taksit ödendi` : 'Ödeme İlerlemesi'}
                      </span>
                      <span style={styles.ilerlemeYuzde}>%{ilerleme.toFixed(0)} tamamlandı</span>
                    </div>
                    <div style={styles.ilerlemeBar}>
                      <div style={{ ...styles.ilerlemeDolu, width: `${ilerleme}%` }} />
                    </div>
                  </div>
                )}

                {borc.notlar && <div style={styles.notlar}>📝 {borc.notlar}</div>}

                <div style={styles.borcBtnler}>
                  <button style={styles.odemeBtn} onClick={() => { setOdemeFormAcik(borc); setOdemeFormTutar('') }}>
                    💳 Ödeme Yap
                  </button>
                  <button style={styles.kapatBtn} onClick={() => borcKapat(borc.id)}>✅ Kapat</button>
                  <button style={styles.silBtn} onClick={() => borcSil(borc.id)}>🗑️ Sil</button>
                </div>
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
  ozetIcon: { fontSize: '24px', marginBottom: '8px' },
  ozetDeger: { fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' },
  ozetLabel: { color: 'rgba(255,255,255,0.4)', fontSize: '12px' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  filtreler: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  filtreBtn: { padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px' },
  filtreBtnAktif: { background: 'rgba(255,107,107,0.15)', border: '1px solid #ff6b6b', color: '#ff6b6b' },
  ekleBtn: { padding: '12px 24px', background: 'linear-gradient(135deg,#ff6b6b,#ff8c42)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#1e293b', borderRadius: '20px', padding: '32px', width: '480px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' },
  modalBaslik: { color: '#fff', fontSize: '18px', margin: '0 0 16px 0' },
  toggleSatir: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' },
  toggleLabel: { color: 'rgba(255,255,255,0.7)', fontSize: '14px' },
  toggle: { width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' },
  toggleTop: { position: 'absolute', top: '2px', left: '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'transform 0.3s' },
  taksitBilgi: { background: 'rgba(78,204,163,0.1)', border: '1px solid rgba(78,204,163,0.3)', borderRadius: '10px', padding: '12px', color: '#4ecca3', fontSize: '14px', marginBottom: '14px' },
  hizliButonlar: { display: 'flex', gap: '8px', marginBottom: '16px' },
  hizliBtn: { flex: 1, padding: '8px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '13px' },
  ikiliBolum: { display: 'flex', gap: '12px' },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: '13px', display: 'block', marginBottom: '6px' },
  input: { width: '100%', padding: '12px', marginBottom: '14px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' },
  modalBtnler: { display: 'flex', gap: '12px', marginTop: '8px' },
  iptalBtn: { flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' },
  kaydetBtn: { flex: 1, padding: '12px', background: 'linear-gradient(135deg,#ff6b6b,#ff8c42)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' },
  yukleniyor: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '48px' },
  bos: { textAlign: 'center', padding: '64px' },
  liste: { display: 'flex', flexDirection: 'column', gap: '16px' },
  grupKart: { background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,107,107,0.2)', overflow: 'hidden' },
  grupBaslik: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', background: 'rgba(255,107,107,0.08)', borderBottom: '1px solid rgba(255,107,107,0.15)' },
  grupSol: { display: 'flex', alignItems: 'center', gap: '12px' },
  grupAd: { color: '#fff', fontSize: '16px', fontWeight: 'bold' },
  grupAlt: { color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' },
  grupSag: { display: 'flex', gap: '8px' },
  grupOzet: { display: 'flex', gap: '32px', padding: '16px 24px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  grupOzetKutu: {},
  altBorclar: { padding: '12px 24px' },
  altBorcSatir: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  altBorcSol: { flex: 1 },
  altBorcAd: { color: 'rgba(255,255,255,0.8)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
  altBorcNot: { color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '2px' },
  altBorcSag: { textAlign: 'right', minWidth: '120px' },
  altBorcBtnler: { display: 'flex', gap: '6px' },
  odemeBtn: { padding: '6px 12px', background: 'rgba(78,204,163,0.15)', border: '1px solid rgba(78,204,163,0.3)', borderRadius: '8px', color: '#4ecca3', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' },
  silBtnKucuk: { padding: '6px 10px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: '8px', color: '#ff6b6b', fontSize: '12px', cursor: 'pointer' },
  borcKart: { background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.07)' },
  borcUst: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  borcSolUst: { display: 'flex', alignItems: 'center', gap: '12px' },
  borcAd: { color: '#fff', fontSize: '16px', fontWeight: 'bold' },
  borcBanka: { color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' },
  taksitTag: { background: 'rgba(78,204,163,0.15)', color: '#4ecca3', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' },
  borcSagUst: { display: 'flex', gap: '8px', alignItems: 'center' },
  vadeBadge: { padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' },
  tutarlar: { display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' },
  tutarKutu: { minWidth: '120px' },
  tutarLabel: { color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px' },
  tutarDeger: { color: '#fff', fontSize: '16px', fontWeight: 'bold' },
  ilerlemeContainer: { marginBottom: '16px' },
  ilerlemeUst: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  ilerlemeLabel: { color: 'rgba(255,255,255,0.4)', fontSize: '12px' },
  ilerlemeYuzde: { color: '#4ecca3', fontSize: '12px' },
  ilerlemeBar: { height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' },
  ilerlemeDolu: { height: '100%', background: 'linear-gradient(90deg,#4ecca3,#38b2ac)', borderRadius: '3px' },
  notlar: { color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '16px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' },
  borcBtnler: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  toplamOdemeBtn: { padding: '10px 18px', background: 'linear-gradient(135deg,#ff6b6b,#ff8c42)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' },
  kapatBtn: { padding: '8px 16px', background: 'rgba(78,204,163,0.1)', border: '1px solid rgba(78,204,163,0.3)', borderRadius: '8px', color: '#4ecca3', fontSize: '13px', cursor: 'pointer' },
  silBtn: { padding: '8px 16px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: '8px', color: '#ff6b6b', fontSize: '13px', cursor: 'pointer' },
}

export default Borclar