import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { Target, CircleDollarSign, TrendingUp, CalendarDays, Plus, Trash2 } from 'lucide-react'

function Hedefler({ session, mobil, gizliMod }) {
  const pm = (val, opts = { minimumFractionDigits: 2, maximumFractionDigits: 2 }) =>
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

  const grid = '160px repeat(12, 75px) 100px 100px 80px 36px'
  const toplamHedef = hedefler.reduce((s, h) => s + parseFloat(h.hedef_tutar || 0), 0)
  const ilerlemeler = hedefler.map(h => {
    const mevcut = gerceklesenHesapla(h.kategori)
    const hedef = parseFloat(h.hedef_tutar || 0)
    return mevcut !== null && hedef > 0 ? Math.min(100, (mevcut / hedef) * 100) : 0
  })
  const ortalamaIlerleme = ilerlemeler.length ? ilerlemeler.reduce((s, v) => s + v, 0) / ilerlemeler.length : 0

  return (
    <div>
      <div style={{ ...styles.ozetGrid, gridTemplateColumns: mobil ? 'repeat(2,1fr)' : 'repeat(4,1fr)' }}>
        <div style={styles.ozetKart}><div style={styles.ozetIcon}><Target size={19}/></div><div style={styles.ozetLabel}>Aktif Hedef</div><div style={styles.ozetDeger}>{hedefler.length}</div></div>
        <div style={styles.ozetKart}><div style={styles.ozetIcon}><CircleDollarSign size={19}/></div><div style={styles.ozetLabel}>Toplam Hedef</div><div style={styles.ozetDeger}>₺{pm(toplamHedef)}</div></div>
        <div style={{ ...styles.ozetKart, ...styles.netKart }}><div style={{ ...styles.ozetIcon, ...styles.netIcon }}><TrendingUp size={19}/></div><div style={{ ...styles.ozetLabel, color: 'rgba(255,255,255,.76)' }}>Ortalama İlerleme</div><div style={{ ...styles.ozetDeger, color: '#fff' }}>%{ortalamaIlerleme.toFixed(1)}</div></div>
        <div style={styles.ozetKart}><div style={styles.ozetIcon}><CalendarDays size={19}/></div><div style={styles.ozetLabel}>Takip Yılı</div><div style={styles.ozetDeger}>{aktifYil}</div></div>
      </div>
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
        <button style={styles.ekleBtn} onClick={() => setFormAcik(true)}><Plus size={16}/> Hedef Ekle</button>
      </div>

      {/* Form Modal */}
      {formAcik && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, width: mobil ? '95vw' : '420px' }}>
            <h3 style={styles.modalBaslik}>Yeni Hedef — {aktifYil}</h3>

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
          <p style={{ color: 'var(--text-muted)' }}>{aktifYil} yılı için henüz hedef eklenmemiş.</p>
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
          {hedefler.map((hedef) => {
            const gerceklesen = gerceklesenHesapla(hedef.kategori)
            const hedefTutar = parseFloat(hedef.hedef_tutar)
            const oran = gerceklesen !== null ? Math.min(100, (gerceklesen / hedefTutar) * 100) : null
            return (
              <div key={hedef.id} style={{
                ...styles.satir,
                gridTemplateColumns: grid,
                background: 'transparent'
              }}>
                {/* Kategori */}
                <div style={styles.kategoriHucre}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 'bold' }}>{hedef.kategori}</div>
                  {hedef.aciklama && <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{hedef.aciklama}</div>}
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
                            background: 'var(--bg-card)',
                            border: `1px solid ${ayOran >= 100 ? '#0d9488' : ayOran >= 70 ? '#eab308' : 'var(--border)'}`,
                            borderRadius: '6px',
                            color: ayOran >= 100 ? '#0d9488' : ayOran >= 70 ? '#eab308' : 'var(--text-primary)',
                            fontSize: '12px'
                          }}
                          type="number"
                          value={ayDeger || ''}
                          placeholder="—"
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  ₺{pm(hedefTutar)}
                </div>

                {/* Güncel */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontWeight: '650', fontSize: '13px' }}>
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
                  <button style={styles.silBtn}
                    onClick={() => hedefSil(hedef.id)}><Trash2 size={14}/></button>
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
  ozetGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '22px' },
  ozetKart: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', minHeight: '132px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  netKart: { background: 'linear-gradient(135deg,#6faeb3 0%,#2d6482 100%)', border: 'none', boxShadow: '0 10px 24px rgba(45,100,130,.18)' },
  ozetIcon: { width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#285b70', background: 'var(--surface-soft)', border: '1px solid var(--border)', marginBottom: '12px' },
  netIcon: { background: 'rgba(255,255,255,.94)', border: 'none' },
  ozetLabel: { color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '7px', fontWeight: '550' },
  ozetDeger: { color: 'var(--text-primary)', fontSize: '22px', fontWeight: '750', letterSpacing: '-.025em' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', padding: '10px 14px', minHeight: '62px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px' },
  yilSecici: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  yilBtn: { padding: '8px 14px', background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' },
  yilBtnAktif: { background: '#234f68', border: '1px solid #234f68', color: '#fff', fontWeight: '650' },
  ekleBtn: { height: '38px', padding: '0 15px', background: '#234f68', border: 'none', borderRadius: '9px', color: '#fff', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.48)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '18px' },
  modal: { background: 'var(--surface)', borderRadius: '14px', padding: '24px', width: '420px', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 22px 60px rgba(15,23,42,.16)', boxSizing: 'border-box' },
  modalBaslik: { color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', margin: '0 0 20px 0', paddingBottom: '14px', borderBottom: '1px solid var(--border)' },
  label: { color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '550', display: 'block', marginBottom: '7px' },
  input: { width: '100%', minHeight: '42px', padding: '10px 12px', marginBottom: '14px', background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' },
  modalBtnler: { display: 'flex', gap: '12px', marginTop: '8px' },
  iptalBtn: { flex: 1, height: '42px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-secondary)', cursor: 'pointer' },
  kaydetBtn: { flex: 1, height: '42px', background: '#234f68', border: 'none', borderRadius: '9px', color: '#fff', fontWeight: '600', cursor: 'pointer' },
  yukleniyor: { color: 'var(--text-muted)', textAlign: 'center', padding: '48px' },
  bos: { textAlign: 'center', padding: '64px' },
  tabloWrapper: {
    background: 'var(--bg-card)',
    borderRadius: '14px',
    border: '1px solid var(--border)',
    overflowX: 'auto',
    width: '100%',
    boxShadow: 'none'
  },
  satir: {
    display: 'grid',
    padding: '10px 16px',
    borderBottom: '1px solid var(--border)',
    alignItems: 'center',
    minWidth: '1400px',
    background: 'transparent'
  },
  baslikSatir: { background: 'var(--surface-soft)', borderBottom: '1px solid var(--border)' },
  baslikHucre: { color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  kategoriHucre: { paddingRight: '8px' },
  silBtn: { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: .7 },
}

export default Hedefler
