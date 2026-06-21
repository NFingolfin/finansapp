import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useLang } from './LangContext'

function Islemler({ session, mobil, gizliMod }) {
  const { t } = useLang()
  const pm = (val, opts = { minimumFractionDigits: 2 }) =>
    gizliMod ? '****' : parseFloat(val || 0).toLocaleString('tr-TR', opts)
  const [islemler, setIslemler] = useState([])
  const [hesaplar, setHesaplar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [formAcik, setFormAcik] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [filtre, setFiltre] = useState('hepsi')
  const [aramaMetni, setAramaMetni] = useState('')
  const [siralamaAlani, setSiralamaAlani] = useState('tarih')
  const [siralamaYon, setSiralamaYon] = useState('desc')
  const [baslangicTarih, setBaslangicTarih] = useState('')
  const [bitisTarih, setBitisTarih] = useState('')
  const [seciliHesap, setSeciliHesap] = useState('')
  const [seciliKategori, setSeciliKategori] = useState('')
  const [filtreAcik, setFiltreAcik] = useState(false)
  const [yeni, setYeni] = useState({
    tarih: new Date().toISOString().split('T')[0],
    hesap_id: '',
    tutar: '',
    tur: 'gider',
    kategori: 'Zaruri',
    aciklama: '',
    taksitli: false,
    taksit_sayisi: ''
  })

  const kategoriler = {
    gider: ['Zaruri', 'Keyfi', 'Fatura', 'Market', 'Ulaşım', 'Sağlık', 'Eğlence', 'Giyim', 'Borç Ödemesi', 'Diğer'],
    gelir: ['Maaş', 'Freelance', 'Kira Geliri', 'Yatırım Getirisi', 'Diğer'],
    transfer: ['Hesaplar Arası Transfer'],
  }

  const turRenk = { gelir: '#4ecca3', gider: '#ff6b6b', transfer: '#45b7d1', odeme: '#f97316' }
  const turLabel = { gelir: 'Gelir', gider: 'Gider', transfer: 'Transfer', odeme: 'Ödeme' }

  useEffect(() => {
    islemleriGetir()
    hesaplariGetir()
  }, [])

  const islemleriGetir = async () => {
    setYukleniyor(true)
    const { data, error } = await supabase
      .from('islemler')
      .select('*, hesaplar(ad)')
      .eq('user_id', session.user.id)
      .order('tarih', { ascending: false })
      .limit(500)
    if (!error) setIslemler(data)
    setYukleniyor(false)
  }

  const hesaplariGetir = async () => {
    const { data } = await supabase
      .from('hesaplar')
      .select('id, ad, tur, kesim_gunu')
      .eq('user_id', session.user.id)
    if (data) {
      setHesaplar(data)
      if (data.length > 0) setYeni(prev => ({ ...prev, hesap_id: data[0].id }))
    }
  }

  const islemEkle = async () => {
    if (!yeni.tutar || !yeni.hesap_id || !yeni.tarih) return
    if (yeni.tur === 'transfer' && !yeni.hedef_hesap_id) return
    setKaydediliyor(true)

    if (yeni.tur === 'transfer') {
      await supabase.from('islemler').insert({
        user_id: session.user.id, hesap_id: yeni.hesap_id, tarih: yeni.tarih,
        tutar: parseFloat(yeni.tutar), tur: 'gider', kategori: 'Hesaplar Arası Transfer',
        aciklama: yeni.aciklama || `Transfer → ${hesaplar.find(h => h.id === yeni.hedef_hesap_id)?.ad}`
      })
      await supabase.from('islemler').insert({
        user_id: session.user.id, hesap_id: yeni.hedef_hesap_id, tarih: yeni.tarih,
        tutar: parseFloat(yeni.tutar), tur: 'gelir', kategori: 'Hesaplar Arası Transfer',
        aciklama: yeni.aciklama || `Transfer ← ${hesaplar.find(h => h.id === yeni.hesap_id)?.ad}`
      })
    } else {
      await supabase.from('islemler').insert({
        user_id: session.user.id, hesap_id: yeni.hesap_id, tarih: yeni.tarih,
        tutar: parseFloat(yeni.tutar), tur: yeni.tur, kategori: yeni.kategori, aciklama: yeni.aciklama
      })

      if (yeni.tur === 'gider') {
        const seciliHesapObj = hesaplar.find(h => h.id === yeni.hesap_id)
        if (seciliHesapObj?.tur?.toLowerCase() === 'kredi kartı') {
          const kesimGunu = seciliHesapObj.kesim_gunu || 1
          let donemBitis = new Date(yeni.tarih)
          donemBitis.setDate(kesimGunu)
          if (new Date(yeni.tarih).getDate() > kesimGunu) donemBitis.setMonth(donemBitis.getMonth() + 1)
          let sonOdeme = new Date(donemBitis)
          sonOdeme.setDate(sonOdeme.getDate() + 10)
          const borcAdi = `${seciliHesapObj.ad} - ${String(donemBitis.getMonth() + 1).padStart(2, '0')}/${donemBitis.getFullYear()}`

          if (yeni.taksitli && parseInt(yeni.taksit_sayisi) > 1) {
            const aylikTaksit = parseFloat(yeni.tutar) / parseInt(yeni.taksit_sayisi)
            await supabase.from('borclar').insert({
              user_id: session.user.id,
              ad: `${yeni.aciklama || yeni.kategori} (${yeni.taksit_sayisi} taksit)`,
              tur: 'Kredi Kartı', banka: seciliHesapObj.ad,
              toplam_borc: parseFloat(yeni.tutar), kalan_borc: parseFloat(yeni.tutar),
              aylik_taksit: aylikTaksit, minimum_odeme: aylikTaksit,
              taksit_sayisi: parseInt(yeni.taksit_sayisi), odenen_taksit: 0,
              taksitli: true, son_odeme_tarihi: sonOdeme.toISOString().split('T')[0],
              aktif: true, odenen_tutar: 0
            })
          } else {
            const { data: mevcutBorc } = await supabase.from('borclar').select('*')
              .eq('user_id', session.user.id).eq('ad', borcAdi).eq('aktif', true).single()
            if (mevcutBorc) {
              await supabase.from('borclar').update({
                kalan_borc: parseFloat(mevcutBorc.kalan_borc) + parseFloat(yeni.tutar),
                toplam_borc: parseFloat(mevcutBorc.toplam_borc) + parseFloat(yeni.tutar),
                minimum_odeme: parseFloat(mevcutBorc.minimum_odeme) + parseFloat(yeni.tutar),
              }).eq('id', mevcutBorc.id)
            } else {
              await supabase.from('borclar').insert({
                user_id: session.user.id, ad: borcAdi, tur: 'Kredi Kartı', banka: seciliHesapObj.ad,
                toplam_borc: parseFloat(yeni.tutar), kalan_borc: parseFloat(yeni.tutar),
                minimum_odeme: parseFloat(yeni.tutar), taksit_sayisi: 1, odenen_taksit: 0,
                taksitli: false, son_odeme_tarihi: sonOdeme.toISOString().split('T')[0],
                aktif: true, odenen_tutar: 0, aylik_taksit: 0
              })
            }
          }
        }
      }
    }

    setFormAcik(false)
    setYeni({
      tarih: new Date().toISOString().split('T')[0], hesap_id: hesaplar[0]?.id || '',
      hedef_hesap_id: '', tutar: '', tur: 'gider', kategori: 'Zaruri', aciklama: '', taksitli: false, taksit_sayisi: ''
    })
    islemleriGetir()
    setKaydediliyor(false)
  }

  const islemSil = async (id) => {
    if (!window.confirm('Bu işlemi silmek istediğine emin misin?')) return

    const islem = islemler.find(i => i.id === id)

    // Borç Ödemesi silme: borcları geri al + eşli kaydı sil
    if (islem?.kategori === 'Borç Ödemesi') {
      // Eşli kaydı bul (aynı tarih+tutar+kategori, farklı hesap)
      const esliKayit = islemler.find(i =>
        i.id !== id &&
        i.kategori === 'Borç Ödemesi' &&
        i.tarih === islem.tarih &&
        parseFloat(i.tutar) === parseFloat(islem.tutar) &&
        i.hesap_id !== islem.hesap_id
      )

      const aciklama = islem.aciklama || esliKayit?.aciklama || ''

      if (aciklama.includes('Tüm Borçlar')) {
        // Grup ödemesi: kartAdını çıkar ve o kartın tüm borçlarını geri al
        const kartAdi = aciklama.split(' — ')[0].trim()
        const { data: kartBorclar } = await supabase.from('borclar')
          .select('*').eq('user_id', session.user.id).eq('banka', kartAdi)
        for (const b of (kartBorclar || [])) {
          const taksitTutar = parseFloat(b.minimum_odeme || b.aylik_taksit || 0)
          if (taksitTutar <= 0) continue
          const yeniOdenen = Math.max(0, (parseFloat(b.odenen_tutar) || 0) - taksitTutar)
          const yeniKalan = Math.min(parseFloat(b.toplam_borc || 0), parseFloat(b.kalan_borc || 0) + taksitTutar)
          const guncelleme = { odenen_tutar: yeniOdenen, kalan_borc: yeniKalan, aktif: true }
          if (b.taksitli && b.aylik_taksit) {
            guncelleme.odenen_taksit = Math.max(0, (b.odenen_taksit || 0) - 1)
            if (b.son_odeme_tarihi) {
              const t = new Date(b.son_odeme_tarihi)
              t.setMonth(t.getMonth() - 1)
              guncelleme.son_odeme_tarihi = t.toISOString().split('T')[0]
            }
          }
          await supabase.from('borclar').update(guncelleme).eq('id', b.id)
        }
      } else {
        // Tekil ödeme: borç adını çıkar
        const borcAdi = aciklama
          .replace(' - borç ödemesi', '')
          .replace(' - ödeme alındı', '')
          .replace(/\s*—\s*ödeme alındı$/, '')
          .replace(/\s*—\s*aylık ödeme$/, '')
          .trim()
        if (borcAdi) {
          const { data: hedefBorc } = await supabase.from('borclar').select('*')
            .eq('user_id', session.user.id).eq('ad', borcAdi).maybeSingle()
          if (hedefBorc) {
            const yeniOdenen = Math.max(0, (parseFloat(hedefBorc.odenen_tutar) || 0) - parseFloat(islem.tutar))
            const yeniKalan = Math.min(parseFloat(hedefBorc.toplam_borc || 0), parseFloat(hedefBorc.kalan_borc || 0) + parseFloat(islem.tutar))
            const guncelleme = { odenen_tutar: yeniOdenen, kalan_borc: yeniKalan, aktif: yeniKalan > 0 }
            if (hedefBorc.taksitli && hedefBorc.aylik_taksit) {
              guncelleme.odenen_taksit = Math.max(0, (hedefBorc.odenen_taksit || 0) - 1)
              if (hedefBorc.son_odeme_tarihi) {
                const t = new Date(hedefBorc.son_odeme_tarihi)
                t.setMonth(t.getMonth() - 1)
                guncelleme.son_odeme_tarihi = t.toISOString().split('T')[0]
              }
            }
            await supabase.from('borclar').update(guncelleme).eq('id', hedefBorc.id)
          }
        }
      }

      // Eşli kaydı sil (banka gideri veya KK geliri)
      if (esliKayit) {
        await supabase.from('islemler').delete().eq('id', esliKayit.id)
      }
      await supabase.from('islemler').delete().eq('id', id)
      islemleriGetir()
      return
    }

    if (islem?.tur === 'gider') {
      const hesap = hesaplar.find(h => h.id === islem.hesap_id)
      if (hesap?.tur?.toLowerCase() === 'kredi kartı') {
        // Hangi borç dönemine ait olduğunu hesapla
        const kesimGunu = hesap.kesim_gunu || 1
        const islemTarih = new Date(islem.tarih)
        let donemBitis = new Date(islem.tarih)
        donemBitis.setDate(kesimGunu)
        if (islemTarih.getDate() > kesimGunu) donemBitis.setMonth(donemBitis.getMonth() + 1)
        const borcAdi = `${hesap.ad} - ${String(donemBitis.getMonth() + 1).padStart(2, '0')}/${donemBitis.getFullYear()}`

        // Önce aylık birikim borcunu ara
        const { data: aggrBorc } = await supabase.from('borclar').select('*')
          .eq('user_id', session.user.id).eq('ad', borcAdi).eq('aktif', true).maybeSingle()

        if (aggrBorc) {
          const yeniToplam = Math.max(0, parseFloat(aggrBorc.toplam_borc) - parseFloat(islem.tutar))
          const yeniKalan = Math.max(0, parseFloat(aggrBorc.kalan_borc) - parseFloat(islem.tutar))
          const yeniMin = Math.max(0, parseFloat(aggrBorc.minimum_odeme) - parseFloat(islem.tutar))
          if (yeniToplam <= 0) {
            await supabase.from('borclar').delete().eq('id', aggrBorc.id)
          } else {
            await supabase.from('borclar').update({
              kalan_borc: yeniKalan, toplam_borc: yeniToplam, minimum_odeme: yeniMin
            }).eq('id', aggrBorc.id)
          }
        } else {
          // Taksitli borcu bul (toplam_borc = islem tutarı, aynı kart)
          const { data: taksiBorclar } = await supabase.from('borclar').select('*')
            .eq('user_id', session.user.id)
            .eq('banka', hesap.ad)
            .eq('toplam_borc', parseFloat(islem.tutar))
            .eq('taksitli', true)
            .eq('aktif', true)
          if (taksiBorclar?.length > 0) {
            await supabase.from('borclar').delete().eq('id', taksiBorclar[0].id)
          }
        }
      }
    }

    await supabase.from('islemler').delete().eq('id', id)
    islemleriGetir()
  }

  // Filtreleme ve sıralama
  const filtreliIslemler = islemler
    .filter(i => filtre === 'hepsi' || i.tur === filtre)
    .filter(i => !aramaMetni || 
      i.aciklama?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      i.kategori?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      i.hesaplar?.ad?.toLowerCase().includes(aramaMetni.toLowerCase())
    )
    .filter(i => !baslangicTarih || i.tarih >= baslangicTarih)
    .filter(i => !bitisTarih || i.tarih <= bitisTarih)
    .filter(i => !seciliHesap || i.hesap_id === seciliHesap)
    .filter(i => !seciliKategori || i.kategori === seciliKategori)
    .sort((a, b) => {
      let aVal, bVal
      if (siralamaAlani === 'tarih') { aVal = a.tarih; bVal = b.tarih }
      else if (siralamaAlani === 'tutar') { aVal = parseFloat(a.tutar); bVal = parseFloat(b.tutar) }
      else if (siralamaAlani === 'aciklama') { aVal = a.aciklama || ''; bVal = b.aciklama || '' }
      else if (siralamaAlani === 'tur') { aVal = a.tur; bVal = b.tur }
      if (siralamaYon === 'asc') return aVal > bVal ? 1 : -1
      return aVal < bVal ? 1 : -1
    })

  // Ara toplamlar — "Borç Ödemesi" gider/gelir sayılmaz, ayrı gösterilir
  const araToplam = {
    gelir: filtreliIslemler.filter(i => i.tur === 'gelir' && i.kategori !== 'Borç Ödemesi').reduce((a, i) => a + parseFloat(i.tutar), 0),
    gider: filtreliIslemler.filter(i => i.tur === 'gider' && i.kategori !== 'Borç Ödemesi').reduce((a, i) => a + parseFloat(i.tutar), 0),
    transfer: filtreliIslemler.filter(i => i.tur === 'transfer').reduce((a, i) => a + parseFloat(i.tutar), 0),
    odeme: filtreliIslemler.filter(i => i.kategori === 'Borç Ödemesi' && i.tur === 'gider').reduce((a, i) => a + parseFloat(i.tutar), 0),
  }
  const net = araToplam.gelir - araToplam.gider

  // Tüm kategoriler
  const tumKategoriler = [...new Set(islemler.map(i => i.kategori).filter(Boolean))]

  const siralamaToggle = (alan) => {
    if (siralamaAlani === alan) setSiralamaYon(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSiralamaAlani(alan); setSiralamaYon('desc') }
  }

  const siralamaIkon = (alan) => {
    if (siralamaAlani !== alan) return '↕'
    return siralamaYon === 'asc' ? '↑' : '↓'
  }

  const filtreTemizle = () => {
    setFiltre('hepsi')
    setAramaMetni('')
    setBaslangicTarih('')
    setBitisTarih('')
    setSeciliHesap('')
    setSeciliKategori('')
  }

  const filtreAktif = filtre !== 'hepsi' || aramaMetni || baslangicTarih || bitisTarih || seciliHesap || seciliKategori

  return (
    <div>
      {/* Ara Toplam Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: mobil ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Toplam Gelir</div>
          <div style={{ ...styles.ozetDeger, color: '#4ecca3' }}>₺{pm(araToplam.gelir)}</div>
          <div style={styles.ozetAlt}>{filtreliIslemler.filter(i => i.tur === 'gelir').length} işlem</div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Toplam Gider</div>
          <div style={{ ...styles.ozetDeger, color: '#ff6b6b' }}>₺{pm(araToplam.gider)}</div>
          <div style={styles.ozetAlt}>{filtreliIslemler.filter(i => i.tur === 'gider').length} işlem</div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Net</div>
          <div style={{ ...styles.ozetDeger, color: net >= 0 ? '#4ecca3' : '#ff6b6b' }}>₺{pm(net)}</div>
          <div style={styles.ozetAlt}>{filtreliIslemler.length} işlem</div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetLabel}>Borç Ödemeleri</div>
          <div style={{ ...styles.ozetDeger, color: '#f97316' }}>₺{pm(araToplam.odeme)}</div>
          <div style={styles.ozetAlt}>{filtreliIslemler.filter(i => i.kategori === 'Borç Ödemesi').length} işlem</div>
        </div>
      </div>

      {/* Filtre Paneli */}
      <div style={styles.filtrePanel}>
        {/* Tür Filtreleri + Ekle + Mobil Toggle */}
        <div style={styles.filtreSatir}>
          <div style={styles.filtreler}>
            {['hepsi', 'gelir', 'gider', 'transfer'].map(f => (
              <button key={f}
                style={filtre === f ? { ...styles.filtreBtn, ...styles.filtreBtnAktif } : styles.filtreBtn}
                onClick={() => setFiltre(f)}>
                {f === 'hepsi' ? 'Tümü' : turLabel[f]}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {mobil && (
              <button
                style={{
                  ...styles.filtreToggleBtn,
                  ...(filtreAcik || filtreAktif ? styles.filtreToggleBtnAktif : {})
                }}
                onClick={() => setFiltreAcik(prev => !prev)}
              >
                {filtreAcik ? '✕ Kapat' : `🔽 Filtrele${filtreAktif ? ` (${filtreliIslemler.length})` : ''}`}
              </button>
            )}
            <button style={styles.ekleBtn} onClick={() => setFormAcik(true)}>+ Ekle</button>
          </div>
        </div>

        {/* Arama + Tarih + Hesap + Kategori — masaüstünde her zaman, mobilde toggle ile */}
        {(!mobil || filtreAcik) && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: mobil ? '1fr' : '2fr 1fr 1fr 1fr 1fr', gap: '8px', marginTop: '10px' }}>
              <input
                style={styles.filterInput}
                placeholder="🔍 Açıklama, kategori veya hesap ara..."
                value={aramaMetni}
                onChange={e => setAramaMetni(e.target.value)}
              />
              <input style={styles.filterInput} type="date" value={baslangicTarih}
                onChange={e => setBaslangicTarih(e.target.value)} placeholder="Başlangıç" />
              <input style={styles.filterInput} type="date" value={bitisTarih}
                onChange={e => setBitisTarih(e.target.value)} placeholder="Bitiş" />
              <select style={styles.filterInput} value={seciliHesap} onChange={e => setSeciliHesap(e.target.value)}>
                <option value="">Tüm Hesaplar</option>
                {hesaplar.map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
              </select>
              <select style={styles.filterInput} value={seciliKategori} onChange={e => setSeciliKategori(e.target.value)}>
                <option value="">Tüm Kategoriler</option>
                {tumKategoriler.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            {/* Sıralama + Temizle + Sonuç Sayısı */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Sırala:</span>
              {[
                { alan: 'tarih', label: 'Tarih' },
                { alan: 'tutar', label: 'Tutar' },
                { alan: 'tur', label: 'Tür' },
                { alan: 'aciklama', label: 'Açıklama' },
              ].map(s => (
                <button key={s.alan}
                  style={siralamaAlani === s.alan ? { ...styles.siralamaBtn, ...styles.siralamaBtnAktif } : styles.siralamaBtn}
                  onClick={() => siralamaToggle(s.alan)}>
                  {s.label} {siralamaIkon(s.alan)}
                </button>
              ))}
              {filtreAktif && (
                <button style={styles.temizleBtn} onClick={() => { filtreTemizle(); setFiltreAcik(false) }}>
                  ✕ Temizle
                </button>
              )}
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '12px' }}>
                {filtreliIslemler.length} sonuç
              </span>
            </div>
          </>
        )}

        {/* Mobilde kapalıyken aktif filtre özeti */}
        {mobil && !filtreAcik && filtreAktif && (
          <div style={styles.filtreOzet}>
            <span>🔍 Filtre aktif · {filtreliIslemler.length} sonuç</span>
            <button style={styles.temizleBtn} onClick={filtreTemizle}>✕ Temizle</button>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {formAcik && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalBaslik}>Yeni İşlem Ekle</h3>

            <label style={styles.label}>İşlem Türü</label>
            <div style={styles.turSecici}>
              {['gelir', 'gider', 'transfer'].map(t => (
                <button key={t}
                  style={yeni.tur === t
                    ? { ...styles.turBtn, background: turRenk[t], color: '#fff' }
                    : styles.turBtn}
                  onClick={() => setYeni({ ...yeni, tur: t, kategori: kategoriler[t]?.[0] || '' })}>
                  {turLabel[t]}
                </button>
              ))}
            </div>

            <label style={styles.label}>Tarih</label>
            <input style={styles.input} type="date" value={yeni.tarih}
              onChange={e => setYeni({ ...yeni, tarih: e.target.value })} />

            <label style={styles.label}>{yeni.tur === 'transfer' ? 'Kaynak Hesap' : 'Hesap'}</label>
            <select style={styles.input} value={yeni.hesap_id}
              onChange={e => setYeni({ ...yeni, hesap_id: e.target.value })}>
              {hesaplar.map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
            </select>

            {yeni.tur === 'transfer' && (
              <>
                <label style={styles.label}>Hedef Hesap</label>
                <select style={styles.input} value={yeni.hedef_hesap_id || ''}
                  onChange={e => setYeni({ ...yeni, hedef_hesap_id: e.target.value })}>
                  <option value="">Hedef hesap seç</option>
                  {hesaplar.filter(h => h.id !== yeni.hesap_id).map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
                </select>
              </>
            )}

            {(() => {
              const sh = hesaplar.find(h => h.id === yeni.hesap_id)
              if (sh?.tur?.toLowerCase() === 'kredi kartı' && yeni.tur === 'gider') {
                return (
                  <>
                    <div style={styles.bilgiMesaj}>
                      💳 Bu gider <strong>{sh.ad}</strong> kartının borcuna eklenecek.
                      {sh.kesim_gunu ? ` Kesim günü: ${sh.kesim_gunu}` : ''}
                    </div>
                    <div style={styles.toggleSatir}>
                      <span style={styles.toggleLabel}>Taksitli mi?</span>
                      <div style={{ ...styles.toggle, background: yeni.taksitli ? '#4ecca3' : 'var(--border)' }}
                        onClick={() => setYeni({ ...yeni, taksitli: !yeni.taksitli, taksit_sayisi: '' })}>
                        <div style={{ ...styles.toggleTop, transform: yeni.taksitli ? 'translateX(20px)' : 'translateX(0)' }} />
                      </div>
                    </div>
                    {yeni.taksitli && (
                      <>
                        <label style={styles.label}>Taksit Sayısı</label>
                        <input style={styles.input} type="number" placeholder="örn. 3, 6, 12"
                          value={yeni.taksit_sayisi} onChange={e => setYeni({ ...yeni, taksit_sayisi: e.target.value })} />
                        {yeni.tutar && yeni.taksit_sayisi && (
                          <div style={styles.taksitBilgi}>
                            💡 Aylık taksit: <strong>₺{(parseFloat(yeni.tutar) / parseInt(yeni.taksit_sayisi)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )
              }
              return null
            })()}

            <label style={styles.label}>Tutar (₺)</label>
            <input style={styles.input} type="number" placeholder="0.00" value={yeni.tutar}
              onChange={e => setYeni({ ...yeni, tutar: e.target.value })} />

            {yeni.tur !== 'transfer' && (
              <>
                <label style={styles.label}>Kategori</label>
                <select style={styles.input} value={yeni.kategori}
                  onChange={e => setYeni({ ...yeni, kategori: e.target.value })}>
                  {(kategoriler[yeni.tur] || []).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </>
            )}

            <label style={styles.label}>Açıklama (isteğe bağlı)</label>
            <input style={styles.input} placeholder="örn. Migros alışverişi" value={yeni.aciklama}
              onChange={e => setYeni({ ...yeni, aciklama: e.target.value })} />

            <div style={styles.modalBtnler}>
              <button style={styles.iptalBtn} onClick={() => setFormAcik(false)}>İptal</button>
              <button style={styles.kaydetBtn} onClick={islemEkle} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* İşlem Listesi */}
      {yukleniyor ? (
        <div style={styles.yukleniyor}>Yükleniyor...</div>
      ) : filtreliIslemler.length === 0 ? (
        <div style={styles.bos}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💸</div>
          <p style={{ color: 'var(--text-muted)' }}>
            {filtreAktif ? 'Filtreyle eşleşen işlem bulunamadı.' : 'Henüz işlem yok.'}
          </p>
        </div>
      ) : (
        <div style={styles.liste}>
          {filtreliIslemler.map(islem => {
            const isBorcOdeme = islem.kategori === 'Borç Ödemesi'
            const gorselTur = isBorcOdeme ? 'odeme' : islem.tur
            const renk = turRenk[gorselTur] || '#a8a8b3'
            return (
              <div key={islem.id} style={styles.islemSatir}>
                <div style={{ ...styles.turBadge, background: renk + '22', color: renk }}>
                  {turLabel[gorselTur] || islem.tur}
                </div>
                <div style={styles.islemBilgi}>
                  <div style={styles.islemAciklama}>{islem.aciklama || islem.kategori}</div>
                  <div style={styles.islemDetay}>
                    {islem.tarih} · {islem.hesaplar?.ad} · {islem.kategori}
                  </div>
                </div>
                <div style={{ ...styles.islemTutar, color: isBorcOdeme ? '#f97316' : islem.tur === 'gelir' ? '#4ecca3' : islem.tur === 'gider' ? '#ff6b6b' : '#45b7d1' }}>
                  {gizliMod ? '₺ ****' : `${islem.tur === 'gelir' ? '+' : islem.tur === 'gider' ? '-' : ''}₺${parseFloat(islem.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
                </div>
                <button style={styles.silBtn} onClick={() => islemSil(islem.id)}>🗑️</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  ozetKart: { background: 'var(--bg-card)', borderRadius: '12px', padding: '14px', textAlign: 'center', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  ozetLabel: { color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' },
  ozetDeger: { fontSize: '18px', fontWeight: 'bold', marginBottom: '2px' },
  ozetAlt: { color: 'var(--text-muted)', fontSize: '11px' },
  filtrePanel: { background: 'var(--bg-card)', borderRadius: '14px', padding: '14px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  filtreSatir: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
  filtreler: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  filtreBtn: { padding: '7px 14px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' },
  filtreToggleBtn: { padding: '8px 14px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' },
  filtreToggleBtnAktif: { background: 'rgba(13,148,136,0.08)', border: '1px solid #0d9488', color: '#0d9488', fontWeight: '600' },
  filtreOzet: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', padding: '8px 12px', background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: '8px', color: '#0d9488', fontSize: '13px' },
  filtreBtnAktif: { background: 'rgba(78,204,163,0.15)', border: '1px solid #4ecca3', color: '#2a9d8f', fontWeight: 'bold' },
  ekleBtn: { padding: '10px 20px', background: 'linear-gradient(135deg,#4ecca3,#38b2ac)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  filterInput: { padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' },
  siralamaBtn: { padding: '5px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' },
  siralamaBtnAktif: { background: 'rgba(78,204,163,0.1)', border: '1px solid #4ecca3', color: '#2a9d8f', fontWeight: 'bold' },
  temizleBtn: { padding: '5px 10px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '6px', color: '#ff6b6b', cursor: 'pointer', fontSize: '12px' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--bg-card)', borderRadius: '20px', padding: '28px', width: '420px', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)' },
  modalBaslik: { color: 'var(--text-primary)', fontSize: '18px', margin: '0 0 20px 0' },
  turSecici: { display: 'flex', gap: '8px', marginBottom: '16px' },
  turBtn: { flex: 1, padding: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' },
  bilgiMesaj: { background: 'rgba(78,204,163,0.1)', border: '1px solid rgba(78,204,163,0.3)', borderRadius: '10px', padding: '12px', color: '#2a9d8f', fontSize: '13px', marginBottom: '14px' },
  toggleSatir: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border)' },
  toggleLabel: { color: 'var(--text-secondary)', fontSize: '14px' },
  toggle: { width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' },
  toggleTop: { position: 'absolute', top: '2px', left: '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'transform 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  taksitBilgi: { background: 'rgba(78,204,163,0.1)', border: '1px solid rgba(78,204,163,0.3)', borderRadius: '10px', padding: '12px', color: '#2a9d8f', fontSize: '14px', marginBottom: '14px' },
  label: { color: 'var(--text-secondary)', fontSize: '13px', display: 'block', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', marginBottom: '14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' },
  modalBtnler: { display: 'flex', gap: '12px', marginTop: '8px' },
  iptalBtn: { flex: 1, padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer' },
  kaydetBtn: { flex: 1, padding: '12px', background: 'linear-gradient(135deg,#4ecca3,#38b2ac)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' },
  yukleniyor: { color: 'var(--text-muted)', textAlign: 'center', padding: '48px' },
  bos: { textAlign: 'center', padding: '64px' },
  liste: { display: 'flex', flexDirection: 'column', gap: '8px' },
  islemSatir: { display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', borderRadius: '12px', padding: '14px 16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' },
  turBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  islemBilgi: { flex: 1, minWidth: 0 },
  islemAciklama: { color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  islemDetay: { color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' },
  islemTutar: { fontSize: '15px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  silBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', opacity: 0.4 },
}

export default Islemler