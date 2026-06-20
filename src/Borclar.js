import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useLang } from './LangContext'

function Borclar({ session, mobil, gizliMod }) {
  const { t } = useLang()
  const pm = (val, opts = { minimumFractionDigits: 2 }) =>
    gizliMod ? '****' : parseFloat(val || 0).toLocaleString('tr-TR', opts)
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
  const [kkHesaplar, setKkHesaplar] = useState([])
  const [yeni, setYeni] = useState({
    ad: '', tur: 'Kredi Kartı', toplam_borc: '', kalan_borc: '',
    minimum_odeme: '', son_odeme_tarihi: '', faiz_orani: '', banka: '', notlar: '',
    taksitli: false, taksit_sayisi: '', aylik_taksit: ''
  })

  const turler = ['Kredi Kartı', 'İhtiyaç Kredisi', 'Konut Kredisi', 'Taşıt Kredisi', 'Diğer']
  const turRenk = {
    'Kredi Kartı': '#ef4444', 'İhtiyaç Kredisi': '#f97316',
    'Konut Kredisi': '#a78bfa', 'Taşıt Kredisi': '#0ea5e9', 'Diğer': '#94a3b8'
  }
  const turIkon = {
    'Kredi Kartı': '💳', 'İhtiyaç Kredisi': '💰',
    'Konut Kredisi': '🏠', 'Taşıt Kredisi': '🚗', 'Diğer': '📋'
  }

useEffect(() => { 
  borclariGetir()
  kkHesaplariGetir()
}, []) // eslint-disable-line react-hooks/exhaustive-deps

  const borclariGetir = async () => {
    setYukleniyor(true)
    const { data, error } = await supabase
      .from('borclar').select('*').eq('user_id', session.user.id)
      .eq('aktif', true).order('son_odeme_tarihi', { ascending: true })
    if (!error) setBorclar(data)
    setYukleniyor(false)
  }

  const kkHesaplariGetir = async () => {
  const { data } = await supabase
    .from('hesaplar')
    .select('id, ad, tur, kesim_gunu')
    .eq('user_id', session.user.id)
    .ilike('tur', '%kredi%')
  if (data) setKkHesaplar(data)
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
  if (yeni.tur === 'Kredi Kartı') {
    if (!yeni.banka || !yeni.toplam_borc) return
    setKaydediliyor(true)

    const kkHesap = kkHesaplar.find(h => h.ad === yeni.banka)
    if (!kkHesap) { setKaydediliyor(false); return }

    const kesimGunu = kkHesap.kesim_gunu || 1
    let donemBitis = new Date()
    donemBitis.setDate(kesimGunu)
    if (new Date().getDate() > kesimGunu) donemBitis.setMonth(donemBitis.getMonth() + 1)
    let sonOdeme = new Date(donemBitis)
    sonOdeme.setDate(sonOdeme.getDate() + 10)

    // Gider işlemi ekle
    await supabase.from('islemler').insert({
      user_id: session.user.id,
      hesap_id: kkHesap.id,
      tarih: new Date().toISOString().split('T')[0],
      tutar: parseFloat(yeni.toplam_borc),
      tur: 'gider',
      kategori: 'Diğer',
      aciklama: yeni.ad || 'Kredi kartı harcaması'
    })

    // Borç kaydı ekle
    if (yeni.taksitli && parseInt(yeni.taksit_sayisi) > 1) {
      const aylikTaksit = parseFloat(yeni.toplam_borc) / parseInt(yeni.taksit_sayisi)
      await supabase.from('borclar').insert({
        user_id: session.user.id,
        ad: `${yeni.ad || 'Harcama'} (${yeni.taksit_sayisi} taksit)`,
        tur: 'Kredi Kartı', banka: yeni.banka,
        toplam_borc: parseFloat(yeni.toplam_borc),
        kalan_borc: parseFloat(yeni.toplam_borc),
        aylik_taksit: aylikTaksit, minimum_odeme: aylikTaksit,
        taksit_sayisi: parseInt(yeni.taksit_sayisi), odenen_taksit: 0,
        taksitli: true, son_odeme_tarihi: sonOdeme.toISOString().split('T')[0],
        aktif: true, odenen_tutar: 0
      })
    } else {
      const borcAdi = `${yeni.banka} - ${String(donemBitis.getMonth() + 1).padStart(2, '0')}/${donemBitis.getFullYear()}`
      const { data: mevcutBorc } = await supabase.from('borclar').select('*')
        .eq('user_id', session.user.id).eq('ad', borcAdi).eq('aktif', true).single()

      if (mevcutBorc) {
        await supabase.from('borclar').update({
          kalan_borc: parseFloat(mevcutBorc.kalan_borc) + parseFloat(yeni.toplam_borc),
          toplam_borc: parseFloat(mevcutBorc.toplam_borc) + parseFloat(yeni.toplam_borc),
          minimum_odeme: parseFloat(mevcutBorc.minimum_odeme) + parseFloat(yeni.toplam_borc),
        }).eq('id', mevcutBorc.id)
      } else {
        await supabase.from('borclar').insert({
          user_id: session.user.id, ad: borcAdi, tur: 'Kredi Kartı', banka: yeni.banka,
          toplam_borc: parseFloat(yeni.toplam_borc), kalan_borc: parseFloat(yeni.toplam_borc),
          minimum_odeme: parseFloat(yeni.toplam_borc), taksit_sayisi: 1, odenen_taksit: 0,
          taksitli: false, son_odeme_tarihi: sonOdeme.toISOString().split('T')[0],
          aktif: true, odenen_tutar: 0, aylik_taksit: 0
        })
      }
    }

    setFormAcik(false)
    setYeni({ ad: '', tur: 'Kredi Kartı', toplam_borc: '', kalan_borc: '', minimum_odeme: '', son_odeme_tarihi: '', faiz_orani: '', banka: '', notlar: '', taksitli: false, taksit_sayisi: '' })
    borclariGetir()
    setKaydediliyor(false)
    return
  }

  // Diğer borç türleri — mevcut kod devam eder

    
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

    // Kredi kartı borcuysa otomatik gider işlemi oluştur
if (!error && yeni.tur === 'Kredi Kartı' && yeni.banka) {
  const kkHesap = kkHesaplar.find(h => h.ad === yeni.banka)
  if (kkHesap) {
    await supabase.from('islemler').insert({
      user_id: session.user.id,
      hesap_id: kkHesap.id,
      tarih: yeni.son_odeme_tarihi || new Date().toISOString().split('T')[0],
      tutar: parseFloat(yeni.kalan_borc) || parseFloat(yeni.toplam_borc),
      tur: 'gider',
      kategori: 'Borç Ödemesi',
      aciklama: yeni.ad
    })
  }
}

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
    if (f === null) return '#94a3b8'
    if (f < 0) return '#ef4444'
    if (f <= 3) return '#ef4444'
    if (f <= 7) return '#f97316'
    if (f <= 14) return '#eab308'
    return '#0d9488'
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
      <div style={{ ...styles.ozetGrid, gridTemplateColumns: mobil ? 'repeat(2,1fr)' : 'repeat(4,1fr)' }}>
        <div style={{ ...styles.ozetKart, borderTop: '3px solid #ef4444' }}>
          <div style={styles.ozetIcon}>💳</div>
          <div style={{ ...styles.ozetDeger, color: '#ef4444' }}>₺{pm(toplamKalan)}</div>
          <div style={styles.ozetLabel}>Toplam Kalan Borç</div>
        </div>
        <div style={{ ...styles.ozetKart, borderTop: '3px solid #f97316' }}>
          <div style={styles.ozetIcon}>📅</div>
          <div style={{ ...styles.ozetDeger, color: '#f97316' }}>₺{pm(toplamAylik)}</div>
          <div style={styles.ozetLabel}>Aylık Toplam Ödeme</div>
        </div>
        <div style={{ ...styles.ozetKart, borderTop: '3px solid #eab308' }}>
          <div style={styles.ozetIcon}>🗓️</div>
          <div style={{ ...styles.ozetDeger, color: '#eab308' }}>₺{pm(buAyOdeme)}</div>
          <div style={styles.ozetLabel}>Bu Ay Ödenecek</div>
        </div>
        <div style={{ ...styles.ozetKart, borderTop: `3px solid ${kritikBorclar > 0 ? '#ef4444' : '#0d9488'}` }}>
          <div style={styles.ozetIcon}>{kritikBorclar > 0 ? '⚠️' : '✅'}</div>
          <div style={{ ...styles.ozetDeger, color: kritikBorclar > 0 ? '#ef4444' : '#0d9488' }}>{kritikBorclar}</div>
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
          <div style={{ ...styles.modal, width: mobil ? '95vw' : '360px' }}>
            <h3 style={styles.modalBaslik}>💳 Ödeme Yap</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
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

      <label style={styles.label}>Tür</label>
      <select style={styles.input} value={yeni.tur}
        onChange={e => setYeni({ ...yeni, tur: e.target.value, banka: '', ad: '' })}>
        {turler.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      {yeni.tur === 'Kredi Kartı' ? (
        <>
          <label style={styles.label}>Kredi Kartı Seç</label>
          <select style={styles.input} value={yeni.banka}
            onChange={e => setYeni({ ...yeni, banka: e.target.value })}>
            <option value="">Kart seç</option>
            {kkHesaplar.map(h => (
              <option key={h.id} value={h.ad}>{h.ad}</option>
            ))}
          </select>
          {kkHesaplar.length === 0 && (
            <div style={{ color: '#ff6b6b', fontSize: '12px', marginBottom: '14px' }}>
              ⚠️ Henüz kredi kartı hesabı eklenmemiş.
            </div>
          )}

          <label style={styles.label}>Tutar (₺)</label>
          <input style={styles.input} type="number" placeholder="0.00"
            value={yeni.toplam_borc}
            onChange={e => setYeni({ ...yeni, toplam_borc: e.target.value, kalan_borc: e.target.value })} />

          <label style={styles.label}>Açıklama</label>
          <input style={styles.input} placeholder="örn. Ayakkabı, Market alışverişi"
            value={yeni.ad} onChange={e => setYeni({ ...yeni, ad: e.target.value })} />

          <div style={styles.toggleSatir}>
            <span style={styles.toggleLabel}>Taksitli mi?</span>
            <div style={{ ...styles.toggle, background: yeni.taksitli ? '#4ecca3' : 'rgba(255,255,255,0.1)' }}
              onClick={() => setYeni({ ...yeni, taksitli: !yeni.taksitli, taksit_sayisi: '' })}>
              <div style={{ ...styles.toggleTop, transform: yeni.taksitli ? 'translateX(20px)' : 'translateX(0)' }} />
            </div>
          </div>

          {yeni.taksitli && (
            <>
              <label style={styles.label}>Taksit Sayısı</label>
              <input style={styles.input} type="number" placeholder="örn. 3, 6, 12"
                value={yeni.taksit_sayisi}
                onChange={e => setYeni({ ...yeni, taksit_sayisi: e.target.value })} />
              {yeni.toplam_borc && yeni.taksit_sayisi && (
                <div style={styles.taksitBilgi}>
                  💡 Aylık taksit: <strong>₺{(parseFloat(yeni.toplam_borc) / parseInt(yeni.taksit_sayisi)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <label style={styles.label}>Borç Adı</label>
          <input style={styles.input} placeholder="örn. Konut Kredisi, İhtiyaç Kredisi"
            value={yeni.ad} onChange={e => setYeni({ ...yeni, ad: e.target.value })} />

          <label style={styles.label}>Banka / Kurum</label>
          <input style={styles.input} placeholder="örn. Ziraat, Garanti"
            value={yeni.banka} onChange={e => setYeni({ ...yeni, banka: e.target.value })} />

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

          <label style={styles.label}>Son Ödeme Tarihi</label>
          <input style={styles.input} type="date"
            value={yeni.son_odeme_tarihi} onChange={e => setYeni({ ...yeni, son_odeme_tarihi: e.target.value })} />

          <label style={styles.label}>Notlar (isteğe bağlı)</label>
          <input style={styles.input} placeholder="örn. 12 taksit, otomatik ödeme aktif"
            value={yeni.notlar} onChange={e => setYeni({ ...yeni, notlar: e.target.value })} />
        </>
      )}

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
        <div style={styles.yukleniyor}>{t('yukleniyor')}</div>
      ) : borclar.length === 0 ? (
        <div style={styles.bos}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Hiç borcun yok, harika!</p>
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
      <div style={{ ...styles.grupOzet, flexWrap: mobil ? 'wrap' : 'nowrap', gap: mobil ? '12px' : '32px' }}>
        <div style={styles.grupOzetKutu}>
          <div style={styles.tutarLabel}>Toplam Kalan Borç</div>
          <div style={{ ...styles.tutarDeger, color: '#ef4444' }}>₺{pm(toplamKalanKart)}</div>
        </div>
        <div style={styles.grupOzetKutu}>
          <div style={styles.tutarLabel}>Bu Ay Ödenecek</div>
          <div style={{ ...styles.tutarDeger, color: '#eab308' }}>₺{pm(buAyKart)}
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
            <div key={borc.id} style={{ ...styles.altBorcSatir, flexDirection: mobil ? 'column' : 'row', alignItems: mobil ? 'flex-start' : 'center' }}>
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
                <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '15px' }}>
                  ₺{pm(borc.kalan_borc)}
                </div>
                {borc.taksitli && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    aylık ₺{pm(borc.aylik_taksit)}
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
                    <div style={{ ...styles.tutarDeger, color: '#ef4444' }}>₺{pm(borc.kalan_borc)}</div>
                  </div>
                  {borc.toplam_borc > 0 && (
                    <div style={styles.tutarKutu}>
                      <div style={styles.tutarLabel}>Toplam Borç</div>
                      <div style={styles.tutarDeger}>₺{pm(borc.toplam_borc)}</div>
                    </div>
                  )}
                  <div style={styles.tutarKutu}>
                    <div style={styles.tutarLabel}>{borc.taksitli ? 'Aylık Taksit' : 'Min. Ödeme'}</div>
                    <div style={{ ...styles.tutarDeger, color: '#eab308' }}>
                      ₺{pm(borc.taksitli ? borc.aylik_taksit : borc.minimum_odeme || 0)}
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
  ozetGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' },
  ozetKart: { background: 'var(--bg-card)', borderRadius: '14px', padding: '16px', textAlign: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' },
  ozetIcon: { fontSize: '20px', marginBottom: '6px' },
  ozetDeger: { fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' },
  ozetLabel: { color: 'var(--text-muted)', fontSize: '11px' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  filtreler: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  filtreBtn: { padding: '7px 14px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' },
  filtreBtnAktif: { background: 'rgba(239,68,68,0.08)', border: '1px solid #ef4444', color: '#ef4444' },
  ekleBtn: { padding: '10px 20px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--bg-card)', borderRadius: '20px', padding: '28px', width: '480px', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)', boxSizing: 'border-box' },
  modalBaslik: { color: 'var(--text-primary)', fontSize: '18px', margin: '0 0 16px 0' },
  toggleSatir: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' },
  toggleLabel: { color: '#475569', fontSize: '14px' },
  toggle: { width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' },
  toggleTop: { position: 'absolute', top: '2px', left: '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'transform 0.3s' },
  taksitBilgi: { background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: '10px', padding: '12px', color: '#0d9488', fontSize: '14px', marginBottom: '14px' },
  hizliButonlar: { display: 'flex', gap: '8px', marginBottom: '16px' },
  hizliBtn: { flex: 1, padding: '8px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' },
  ikiliBolum: { display: 'flex', gap: '12px' },
  label: { color: '#475569', fontSize: '13px', display: 'block', marginBottom: '6px' },
  input: { width: '100%', padding: '11px 12px', marginBottom: '14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' },
  modalBtnler: { display: 'flex', gap: '12px', marginTop: '8px' },
  iptalBtn: { flex: 1, padding: '11px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer' },
  kaydetBtn: { flex: 1, padding: '11px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer' },
  yukleniyor: { color: 'var(--text-muted)', textAlign: 'center', padding: '48px' },
  bos: { textAlign: 'center', padding: '64px' },
  liste: { display: 'flex', flexDirection: 'column', gap: '16px' },
  grupKart: { background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid #fee2e2', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  grupBaslik: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'rgba(239,68,68,0.04)', borderBottom: '1px solid #fee2e2' },
  grupSol: { display: 'flex', alignItems: 'center', gap: '12px' },
  grupAd: { color: 'var(--text-primary)', fontSize: '15px', fontWeight: 'bold' },
  grupAlt: { color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' },
  grupSag: { display: 'flex', gap: '8px' },
  grupOzet: { display: 'flex', gap: '32px', padding: '14px 20px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-light)' },
  grupOzetKutu: {},
  altBorclar: { padding: '10px 20px' },
  altBorcSatir: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-light)' },
  altBorcSol: { flex: 1 },
  altBorcAd: { color: 'var(--text-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
  altBorcNot: { color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' },
  altBorcSag: { textAlign: 'right', minWidth: '120px' },
  altBorcBtnler: { display: 'flex', gap: '6px' },
  odemeBtn: { padding: '6px 12px', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.25)', borderRadius: '8px', color: '#0d9488', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' },
  silBtnKucuk: { padding: '6px 10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '12px', cursor: 'pointer' },
  borcKart: { background: 'var(--bg-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  borcUst: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  borcSolUst: { display: 'flex', alignItems: 'center', gap: '12px' },
  borcAd: { color: 'var(--text-primary)', fontSize: '15px', fontWeight: 'bold' },
  borcBanka: { color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' },
  taksitTag: { background: 'rgba(13,148,136,0.08)', color: '#0d9488', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' },
  borcSagUst: { display: 'flex', gap: '8px', alignItems: 'center' },
  vadeBadge: { padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' },
  tutarlar: { display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' },
  tutarKutu: { minWidth: '100px' },
  tutarLabel: { color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' },
  tutarDeger: { color: 'var(--text-primary)', fontSize: '15px', fontWeight: 'bold' },
  ilerlemeContainer: { marginBottom: '16px' },
  ilerlemeUst: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  ilerlemeLabel: { color: 'var(--text-muted)', fontSize: '12px' },
  ilerlemeYuzde: { color: '#0d9488', fontSize: '12px' },
  ilerlemeBar: { height: '6px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' },
  ilerlemeDolu: { height: '100%', background: 'linear-gradient(90deg,#0d9488,#0ea5e9)', borderRadius: '3px' },
  notlar: { color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', padding: '10px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)' },
  borcBtnler: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  toplamOdemeBtn: { padding: '10px 18px', background: 'linear-gradient(135deg,#ef4444,#f97316)', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' },
  kapatBtn: { padding: '8px 16px', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.25)', borderRadius: '8px', color: '#0d9488', fontSize: '13px', cursor: 'pointer' },
  silBtn: { padding: '8px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '13px', cursor: 'pointer' },
}

export default Borclar