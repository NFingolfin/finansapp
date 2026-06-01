import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function Hedefler({ session, mobil, gizliMod }) {
  const pm = (val, opts = { minimumFractionDigits: 0 }) =>
    gizliMod ? '****' : parseFloat(val || 0).toLocaleString('tr-TR', opts)
  const [hedefler, setHedefler] = useState([])
  const [takip, setTakip] = useState([])
  const [hesaplar, setHesaplar] = useState([])
  const [yatirimlar, setYatirimlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [formAcik, setFormAcik] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [aktifYil, setAktifYil] = useState(new Date().getFullYear())
  const [yeni, setYeni] = useState({ kategori: 'Hisse', hedef_tutar: '', para_birimi: 'TRY', aciklama: '' })

  const kategoriler = ['Hisse', 'Kripto', 'Fon', 'Döviz', 'Altın', 'BES', 'Nakit', 'Toplam Varlık', 'Net Varlık', 'Diğer']
  const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
  const buAy = new Date().getMonth() + 1
  const buYil = new Date().getFullYear()
  const yillar = [buYil - 2, buYil - 1, buYil, buYil + 1]

  const turRenk = {
    'Hisse': '#0d9488', 'Kripto': '#eab308', 'Fon': '#0ea5e9',
    'Döviz': '#a78bfa', 'Altın': '#f59e0b', 'BES': '#34d399',
    'Nakit': '#0d9488', 'Toplam Varlık': '#0d9488', 'Net Varlık': '#0ea5e9', 'Diğer': '#94a3b8'
  }

  useEffect(() => { verileriGetir() }, [aktifYil]) // eslint-disable-line react-hooks/exhaustive-deps

const verileriGetir = async () => {
  setYukleniyor(true)
  const [hedefRes, takipRes, hesapRes, yatirimRes] = await Promise.all([
    supabase.from('hedefler').select('*').eq('user_id', session.user.id).eq('yil', aktifYil).order('created_at'),
    supabase.from('hedef_takip').select('*').eq('user_id', session.user.id).eq('yil', aktifYil),
    supabase.from('hesaplar').select('*').eq('user_id', session.user.id),
    supabase.from('yatirimlar').select('*').eq('user_id', session.user.id),
  ])

  const hedeflerData = hedefRes.data || []
  const takipData = takipRes.data || []
  const hesaplarData = hesapRes.data || []
  const yatirimlarData = yatirimRes.data || []

  if (hesaplarData) setHesaplar(hesaplarData)
  if (yatirimlarData) setYatirimlar(yatirimlarData)

  // Cari ay ve yıl için otomatik doldur
  if (aktifYil === buYil) {
    for (const hedef of hedeflerData) {
      const mevcutTakip = takipData.find(t => t.hedef_id === hedef.id && t.ay === buAy)
      
      // Güncel değeri hesapla
      let guncelDeger = null
      const toplamNakit = hesaplarData.filter(h => h.tur !== 'Kredi Kartı' && h.para_birimi === 'TRY').reduce((a, h) => a + parseFloat(h.bakiye), 0)
      const toplamYatirim = yatirimlarData.filter(y => y.para_birimi === 'TRY').reduce((a, y) => a + parseFloat(y.guncel_deger), 0)

      switch (hedef.kategori) {
        case 'Hisse': guncelDeger = yatirimlarData.filter(y => y.tur === 'Hisse').reduce((a, y) => a + parseFloat(y.guncel_deger), 0); break
        case 'Kripto': guncelDeger = yatirimlarData.filter(y => y.tur === 'Kripto').reduce((a, y) => a + parseFloat(y.guncel_deger), 0); break
        case 'Fon': guncelDeger = yatirimlarData.filter(y => y.tur === 'Fon').reduce((a, y) => a + parseFloat(y.guncel_deger), 0); break
        case 'Döviz': guncelDeger = yatirimlarData.filter(y => y.tur === 'Döviz').reduce((a, y) => a + parseFloat(y.guncel_deger), 0); break
        case 'Altın': guncelDeger = yatirimlarData.filter(y => y.tur === 'Altın').reduce((a, y) => a + parseFloat(y.guncel_deger), 0); break
        case 'BES': guncelDeger = yatirimlarData.filter(y => y.tur === 'BES').reduce((a, y) => a + parseFloat(y.guncel_deger), 0); break
        case 'Nakit': guncelDeger = toplamNakit; break
        case 'Toplam Varlık': guncelDeger = toplamNakit + toplamYatirim; break
        case 'Net Varlık': guncelDeger = toplamNakit + toplamYatirim; break
        default: guncelDeger = null
      }

if (guncelDeger !== null) {
  if (!mevcutTakip) {
    // Sadece kayıt yoksa ekle
    await supabase.from('hedef_takip').insert({
      user_id: session.user.id,
      hedef_id: hedef.id,
      yil: aktifYil,
      ay: buAy,
      gerceklesen: guncelDeger
    })
  }
  // Mevcut kayıt varsa dokunma, kullanıcının girdiğini koru
}
    }

    // Takip verisini tekrar çek
    const { data: yeniTakip } = await supabase.from('hedef_takip').select('*').eq('user_id', session.user.id).eq('yil', aktifYil)
    setTakip(yeniTakip || [])
  } else {
    setTakip(takipData)
  }

  setHedefler(hedeflerData)
  setYukleniyor(false)
}

  const hedefEkle = async () => {
    if (!yeni.hedef_tutar) return
    setKaydediliyor(true)
    await supabase.from('hedefler').insert({
      user_id: session.user.id,
      yil: aktifYil,
      kategori: yeni.kategori,
      hedef_tutar: parseFloat(yeni.hedef_tutar),
      para_birimi: yeni.para_birimi,
      aciklama: yeni.aciklama
    })
    setFormAcik(false)
    setYeni({ kategori: 'Hisse', hedef_tutar: '', para_birimi: 'TRY', aciklama: '' })
    verileriGetir()
    setKaydediliyor(false)
  }

  const hedefSil = async (id) => {
    if (!window.confirm('Bu hedefi silmek istediğine emin misin?')) return
    await supabase.from('hedefler').delete().eq('id', id)
    verileriGetir()
  }

  const gerceklesenHesapla = (kategori) => {
    if (aktifYil !== buYil) return null
    const toplamNakit = hesaplar.filter(h => h.tur !== 'Kredi Kartı' && h.para_birimi === 'TRY').reduce((a, h) => a + parseFloat(h.bakiye), 0)
    const toplamYatirim = yatirimlar.filter(y => y.para_birimi === 'TRY').reduce((a, y) => a + parseFloat(y.guncel_deger), 0)
    switch (kategori) {
      case 'Hisse': return yatirimlar.filter(y => y.tur === 'Hisse').reduce((a, y) => a + parseFloat(y.guncel_deger), 0)
      case 'Kripto': return yatirimlar.filter(y => y.tur === 'Kripto').reduce((a, y) => a + parseFloat(y.guncel_deger), 0)
      case 'Fon': return yatirimlar.filter(y => y.tur === 'Fon').reduce((a, y) => a + parseFloat(y.guncel_deger), 0)
      case 'Döviz': return yatirimlar.filter(y => y.tur === 'Döviz').reduce((a, y) => a + parseFloat(y.guncel_deger), 0)
      case 'Altın': return yatirimlar.filter(y => y.tur === 'Altın').reduce((a, y) => a + parseFloat(y.guncel_deger), 0)
      case 'BES': return yatirimlar.filter(y => y.tur === 'BES').reduce((a, y) => a + parseFloat(y.guncel_deger), 0)
      case 'Nakit': return toplamNakit
      case 'Toplam Varlık': return toplamNakit + toplamYatirim
      case 'Net Varlık': return toplamNakit + toplamYatirim
      default: return null
    }
  }

  const ayTakipGetir = (hedefId, ay) => {
    return parseFloat(takip.find(t => t.hedef_id === hedefId && t.ay === ay)?.gerceklesen || 0)
  }

 const ayTakipGuncelle = async (hedefId, ay, deger) => {
  const mevcut = takip.find(t => t.hedef_id === hedefId && t.ay === ay)
  if (mevcut) {
    await supabase.from('hedef_takip').update({ 
      gerceklesen: parseFloat(deger) || 0 
    }).eq('id', mevcut.id)
  } else {
    await supabase.from('hedef_takip').insert({
      user_id: session.user.id, 
      hedef_id: hedefId, 
      yil: aktifYil, 
      ay, 
      gerceklesen: parseFloat(deger) || 0
    })
  }
  // Sadece takip verisini güncelle, verileriGetir çağırma
  const { data: yeniTakip } = await supabase
    .from('hedef_takip')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('yil', aktifYil)
  setTakip(yeniTakip || [])
}

  const grid = '160px repeat(12, 75px) 100px 100px 80px 36px'

  return (
    <div>
      {/* Yıl Seçici + Ekle */}
      <div style={{ ...styles.toolbar, flexWrap: mobil ? 'wrap' : 'nowrap', gap: '12px' }}>
        <div style={{ ...styles.yilSecici, flexWrap: 'wrap' }}>
          {yillar.map(y => (
            <button key={y}
              style={aktifYil === y ? { ...styles.yilBtn, ...styles.yilBtnAktif } : styles.yilBtn}
              onClick={() => setAktifYil(y)}>{y}
            </button>
          ))}
        </div>
        <button style={styles.ekleBtn} onClick={() => setFormAcik(true)}>+ Hedef Ekle</button>
      </div>

      {/* Form Modal */}
      {formAcik && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, width: mobil ? '95vw' : '420px' }}>
            <h3 style={styles.modalBaslik}>🎯 Yeni Hedef — {aktifYil}</h3>

            <label style={styles.label}>Kategori</label>
            <select style={styles.input} value={yeni.kategori}
              onChange={e => setYeni({ ...yeni, kategori: e.target.value })}>
              {kategoriler.map(k => <option key={k} value={k}>{k}</option>)}
            </select>

            <label style={styles.label}>Hedef Tutar</label>
            <input style={styles.input} type="number" placeholder="örn. 100000"
              value={yeni.hedef_tutar} onChange={e => setYeni({ ...yeni, hedef_tutar: e.target.value })} />

            <label style={styles.label}>Para Birimi</label>
            <select style={styles.input} value={yeni.para_birimi}
              onChange={e => setYeni({ ...yeni, para_birimi: e.target.value })}>
              {['TRY', 'USD', 'EUR'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <label style={styles.label}>Açıklama (isteğe bağlı)</label>
            <input style={styles.input} placeholder="örn. Yıl sonu hisse hedefi"
              value={yeni.aciklama} onChange={e => setYeni({ ...yeni, aciklama: e.target.value })} />

            <div style={styles.modalBtnler}>
              <button style={styles.iptalBtn} onClick={() => setFormAcik(false)}>İptal</button>
              <button style={styles.kaydetBtn} onClick={hedefEkle} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {yukleniyor ? (
        <div style={styles.yukleniyor}>Yükleniyor...</div>
      ) : hedefler.length === 0 ? (
        <div style={styles.bos}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <p style={{ color: '#94a3b8' }}>{aktifYil} yılı için henüz hedef eklenmemiş.</p>
        </div>
      ) : (
        <div style={{ ...styles.tabloWrapper, fontSize: mobil ? '11px' : undefined }}>
          {/* Başlık Satırı */}
          <div style={{ ...styles.satir, ...styles.baslikSatir, gridTemplateColumns: grid }}>
            <div style={styles.baslikHucre}>Kategori</div>
            {aylar.map((ay, i) => (
              <div key={i} style={{
                ...styles.baslikHucre, textAlign: 'center',
                color: aktifYil === buYil && i + 1 === buAy ? '#0d9488' : '#94a3b8',
                background: aktifYil === buYil && i + 1 === buAy ? 'rgba(13,148,136,0.08)' : 'transparent',
                borderRadius: '6px'
              }}>{ay}</div>
            ))}
            <div style={{ ...styles.baslikHucre, textAlign: 'center' }}>Hedef</div>
            <div style={{ ...styles.baslikHucre, textAlign: 'center' }}>Güncel</div>
            <div style={{ ...styles.baslikHucre, textAlign: 'center' }}>Oran</div>
            <div />
          </div>

          {/* Hedef Satırları */}
          {hedefler.map((hedef, idx) => {
            const gerceklesen = gerceklesenHesapla(hedef.kategori)
            const hedefTutar = parseFloat(hedef.hedef_tutar)
            const oran = gerceklesen !== null ? Math.min(100, (gerceklesen / hedefTutar) * 100) : null
            const renk = turRenk[hedef.kategori] || '#a8a8b3'

            return (
              <div key={hedef.id} style={{
                ...styles.satir,
                gridTemplateColumns: grid,
                borderLeft: `3px solid ${renk}`,
                background: idx % 2 === 0 ? '#fafafa' : 'transparent'
              }}>
                {/* Kategori */}
                <div style={styles.kategoriHucre}>
                  <div style={{ color: '#0f172a', fontSize: '13px', fontWeight: 'bold' }}>{hedef.kategori}</div>
                  {hedef.aciklama && <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>{hedef.aciklama}</div>}
                </div>

                {/* Aylık Inputlar */}
                {aylar.map((_, i) => {
                  const ay = i + 1
                  const ayDeger = ayTakipGetir(hedef.id, ay)
                  const gecmisAy = aktifYil < buYil || (aktifYil === buYil && ay <= buAy)
                  const aktifAy = aktifYil === buYil && ay === buAy
                  const ayOran = hedefTutar > 0 ? (ayDeger / hedefTutar) * 100 : 0

                  return (
                    <div key={ay} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: aktifAy ? 'rgba(13,148,136,0.04)' : 'transparent', padding: '2px'
                    }}>
                      {gecmisAy ? (
                        <input
                          style={{
                            width: mobil ? '55px' : '62px', padding: '4px 4px', textAlign: 'center',
                            background: '#ffffff',
                            border: `1px solid ${ayOran >= 100 ? '#0d9488' : ayOran >= 70 ? '#eab308' : '#e2e8f0'}`,
                            borderRadius: '6px',
                            color: ayOran >= 100 ? '#0d9488' : ayOran >= 70 ? '#eab308' : '#0f172a',
                            fontSize: '12px'
                          }}
                          type="number"
                          value={ayDeger || ''}
                          placeholder="—"
                          onBlur={e => ayTakipGuncelle(hedef.id, ay, e.target.value)}
onChange={e => {
  const yeniTakip = [...takip]
  const idx = yeniTakip.findIndex(t => t.hedef_id === hedef.id && t.ay === ay)
  if (idx >= 0) {
    yeniTakip[idx] = { ...yeniTakip[idx], gerceklesen: e.target.value }
  } else {
    yeniTakip.push({ 
      hedef_id: hedef.id, 
      ay, 
      yil: aktifYil,
      user_id: session.user.id,
      gerceklesen: e.target.value 
    })
  }
  setTakip(yeniTakip)
}}
onBlur={async e => {
  const deger = e.target.value
  const mevcut = takip.find(t => t.hedef_id === hedef.id && t.ay === ay)
  if (mevcut?.id) {
    await supabase.from('hedef_takip')
      .update({ gerceklesen: parseFloat(deger) || 0 })
      .eq('id', mevcut.id)
  } else {
    await supabase.from('hedef_takip').insert({
      user_id: session.user.id,
      hedef_id: hedef.id,
      yil: aktifYil,
      ay,
      gerceklesen: parseFloat(deger) || 0
    })
    // Yeni kaydın id'sini al
    const { data } = await supabase
      .from('hedef_takip')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('hedef_id', hedef.id)
      .eq('ay', ay)
      .single()
    if (data) {
      setTakip(prev => {
        const yeni = prev.filter(t => !(t.hedef_id === hedef.id && t.ay === ay))
        return [...yeni, data]
      })
    }
  }
}}
                        />
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>
                      )}
                    </div>
                  )
                })}

                {/* Hedef Tutarı */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>
                  ₺{pm(hedefTutar)}
                </div>

                {/* Güncel */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: renk, fontWeight: 'bold', fontSize: '13px' }}>
                  {gerceklesen !== null ? `₺${pm(gerceklesen)}` : '—'}
                </div>

                {/* Oran */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px',
                  color: oran === null ? '#94a3b8' : oran >= 100 ? '#0d9488' : oran >= 70 ? '#eab308' : '#ef4444'
                }}>
                  {oran !== null ? `%${oran.toFixed(1)}` : '—'}
                </div>

                {/* Sil */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.4 }}
                    onClick={() => hedefSil(hedef.id)}>🗑️</button>
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
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  yilSecici: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  yilBtn: { padding: '9px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#64748b', cursor: 'pointer', fontSize: '14px' },
  yilBtnAktif: { background: 'rgba(13,148,136,0.1)', border: '1px solid #0d9488', color: '#0d9488', fontWeight: 'bold' },
  ekleBtn: { padding: '10px 20px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#ffffff', borderRadius: '20px', padding: '28px', width: '420px', border: '1px solid #e2e8f0', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', boxSizing: 'border-box' },
  modalBaslik: { color: '#0f172a', fontSize: '18px', margin: '0 0 20px 0' },
  label: { color: '#475569', fontSize: '13px', display: 'block', marginBottom: '6px' },
  input: { width: '100%', padding: '11px 12px', marginBottom: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#0f172a', fontSize: '14px', boxSizing: 'border-box' },
  modalBtnler: { display: 'flex', gap: '12px', marginTop: '8px' },
  iptalBtn: { flex: 1, padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#64748b', cursor: 'pointer' },
  kaydetBtn: { flex: 1, padding: '11px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer' },
  yukleniyor: { color: '#94a3b8', textAlign: 'center', padding: '48px' },
  bos: { textAlign: 'center', padding: '64px' },
  tabloWrapper: {
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    overflowX: 'auto',
    width: '100%',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
  },
  satir: {
    display: 'grid',
    padding: '10px 16px',
    borderBottom: '1px solid #f1f5f9',
    alignItems: 'center',
    minWidth: '1400px',
    background: 'transparent'
  },
  baslikSatir: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  baslikHucre: { color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  kategoriHucre: { paddingRight: '8px' },
}

export default Hedefler