import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useLang } from './LangContext'
import {
  Landmark, Wallet, CreditCard, TrendingUp, BriefcaseBusiness,
  Equal, UsersRound, Filter, SlidersHorizontal, ListFilter, Plus,
  Eye, EyeOff, Pencil, Trash2, GripVertical
} from 'lucide-react'

function Hesaplar({ session, mobil, gizliMod }) {
  const { t } = useLang()
  const pm = (val, opts = { minimumFractionDigits: 2, maximumFractionDigits: 2 }) =>
    gizliMod ? '****' : parseFloat(val || 0).toLocaleString('tr-TR', opts)
  const [hesaplar, setHesaplar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [formAcik, setFormAcik] = useState(false)
  const [yeniHesap, setYeniHesap] = useState({ ad: '', tur: 'Banka', bakiye: '', para_birimi: 'TRY', kesim_gunu: '', yatirim_hesabi: false })  
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [duzenleModal, setDuzenleModal] = useState(false)
  const [gizliHesaplar, setGizliHesaplar] = useState([])
const [siralamaAktif, setSiralamaAktif] = useState(false)
const [turFiltresi, setTurFiltresi] = useState('Tümü')
const [suruklenen, setSuruklenen] = useState(null)
  const [duzenleHesap, setDuzenleHesap] = useState(null)
  const [detayModal, setDetayModal] = useState(false)
const [detayHesap, setDetayHesap] = useState(null)
const [hesapYatirimlari, setHesapYatirimlari] = useState([])
const [, setTouchBaslangic] = useState(null)

  const hesapTurleri = ['Banka', 'Nakit', 'Kredi Kartı', 'Yatırım', 'Borç', 'Diğer']
  const paraBirimleri = ['TRY', 'USD', 'EUR', 'GBP', 'ALTIN']


  const turIkonlari = {
    'Banka': Landmark,
    'Nakit': Wallet,
    'Kredi Kartı': CreditCard,
    'Yatırım': TrendingUp,
    'Borç': CreditCard,
    'Diğer': BriefcaseBusiness
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
    .filter(h => h.tur === 'Borç' || (h.tur === 'Kredi Kartı' && parseFloat(h.bakiye || 0) < 0))
    .reduce((acc, h) => acc + Math.abs(parseFloat(h.bakiye || 0)) * (h.kur || 1), 0)
  const gorunenHesaplar = hesaplar.filter(h => turFiltresi === 'Tümü' || h.tur === turFiltresi)

  return (
    <div>
      {/* Üst Özet */}
      <div style={{ ...styles.ozetGrid, gridTemplateColumns: mobil ? 'repeat(2,1fr)' : 'repeat(4,1fr)' }}>
        <div style={styles.ozetKart}>
          <div style={styles.ozetIcon}>₺</div>
          <div style={styles.ozetDeger}>₺{pm(toplamTRY)}</div>
          <div style={styles.ozetLabel}>Toplam Varlık (TRY)</div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetIcon}>−</div>
          <div style={styles.ozetDeger}>₺{pm(toplamBorc)}</div>
          <div style={styles.ozetLabel}>Toplam Borç</div>
        </div>
        <div style={{ ...styles.ozetKart, ...styles.netKart }}>
          <div style={{ ...styles.ozetIcon, color: '#fff' }}><Equal size={18} /></div>
          <div style={{ ...styles.ozetDeger, color: '#fff' }}>
            ₺{pm(toplamTRY - toplamBorc)}
          </div>
          <div style={{ ...styles.ozetLabel, color: 'rgba(255,255,255,.76)' }}>Net Durum</div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetIcon}><UsersRound size={18} /></div>
          <div style={styles.ozetDeger}>{hesaplar.length}</div>
          <div style={styles.ozetLabel}>Hesap Sayısı</div>
        </div>
      </div>

      {/* Hesap Ekle Butonu */}
<div style={styles.toolbar}>
  <div style={styles.toolbarSol}>
    <span style={styles.toolbarLabel}>Hesap Tipi</span>
    <div style={styles.filterControl}><Filter size={14} />
      <select value={turFiltresi} onChange={e => setTurFiltresi(e.target.value)} style={styles.filterSelect}>
        <option value="Tümü">Filtre</option>
        {hesapTurleri.map(tur => <option key={tur} value={tur}>{tur}</option>)}
      </select>
    </div>
    <button
      title="Hesapları sırala"
      style={{ ...styles.toolIconBtn, color: siralamaAktif ? 'var(--primary)' : 'var(--text-secondary)' }}
      onClick={() => setSiralamaAktif(!siralamaAktif)}>
      {siralamaAktif ? <GripVertical size={17} /> : <SlidersHorizontal size={17} />}
    </button>
    <button title="Liste görünümü" style={styles.toolIconBtn}><ListFilter size={17} /></button>
    {gizliHesaplar.length > 0 && (
      <button
        title="Gizli hesapları göster" style={styles.toolIconBtn}
        onClick={() => { setGizliHesaplar([]); localStorage.removeItem('gizliHesaplar') }}>
        <Eye size={17} />
      </button>
    )}
  </div>
  <button style={styles.ekleBtn} onClick={() => setFormAcik(true)}><Plus size={16} /> Yeni Hesap Ekle</button>
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
            {parseFloat(detayHesap.bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        {hesapYatirimlari.length > 0 && (
          <div style={styles.detayOzetSatir}>
            <span style={styles.detayOzetLabel}>📈 Yatırım Değeri</span>
            <span style={{ color: '#0ea5e9', fontWeight: 'bold', fontSize: '16px' }}>
              ₺{hesapYatirimlari.reduce((a, y) => a + parseFloat(y.guncel_deger), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
        {hesapYatirimlari.length > 0 && (
          <div style={{ ...styles.detayOzetSatir, borderBottom: 'none', paddingBottom: 0 }}>
            <span style={styles.detayOzetLabel}>💎 Toplam Değer</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '18px' }}>
              ₺{(parseFloat(detayHesap.bakiye) + hesapYatirimlari.reduce((a, y) => a + parseFloat(y.guncel_deger), 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px' }}>₺{parseFloat(y.maliyet).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '100px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Güncel</div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px' }}>₺{parseFloat(y.guncel_deger).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '80px' }}>
                    <div style={{ color: karZarar >= 0 ? '#0d9488' : '#ef4444', fontSize: '13px', fontWeight: 'bold' }}>
                      {karZarar >= 0 ? '+' : ''}{getiri}%
                    </div>
                    <div style={{ color: karZarar >= 0 ? '#0d9488' : '#ef4444', fontSize: '12px' }}>
                      {karZarar >= 0 ? '+' : ''}₺{karZarar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        <div style={{ ...styles.toggle, background: duzenleHesap.yatirim_hesabi ? '#396f82' : 'var(--border)' }}
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
                style={{ ...styles.toggle, background: yeniHesap.yatirim_hesabi ? '#396f82' : 'var(--border)' }}
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
        <div style={{ ...styles.hesapGrid, gridTemplateColumns: mobil ? '1fr' : 'repeat(4,1fr)' }}>
          {gorunenHesaplar.map(hesap => {
            const TurIcon = turIkonlari[hesap.tur] || BriefcaseBusiness
            return (
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
    cursor: siralamaAktif ? 'grab' : 'pointer',
    opacity: suruklenen === hesap.id ? 0.5 : gizliHesaplar.includes(hesap.id) ? 0.3 : 1,
    transition: 'opacity 0.2s',
    display: gizliHesaplar.includes(hesap.id) && !siralamaAktif ? 'none' : undefined
  }}
  onClick={!siralamaAktif ? () => hesapDetayAc(hesap) : undefined}>
              <div style={styles.hesapUst}>
                <span style={styles.hesapIkon}><TurIcon size={17} /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={styles.hesapAd}>{hesap.ad}</div>
                </div>
                <div className="account-actions" style={styles.accountActions}>
                <button style={styles.gizleBtn} onClick={(e) => { e.stopPropagation(); hesapGizle(hesap.id) }}>
  {gizliHesaplar.includes(hesap.id) ? <Eye size={14} /> : <EyeOff size={14} />}
</button>
                <button style={styles.duzenleBtn} onClick={(e) => { e.stopPropagation(); setDuzenleHesap(hesap); setDuzenleModal(true) }}><Pencil size={14} /></button>
                <button style={styles.silBtn} onClick={(e) => { e.stopPropagation(); hesapSil(hesap.id) }}><Trash2 size={14} /></button>
                </div>
              </div>
<div style={styles.hesapAlt}>
<div style={styles.hesapTur}>{hesap.tur}</div>
<div style={{ ...styles.hesapBakiye, color: parseFloat(hesap.bakiye || 0) < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
  {gizliMod ? '****' : (
    (hesap.para_birimi === 'TRY' ? '₺' : hesap.para_birimi + ' ') +
    (hesap.yatirim_hesabi && hesap.yatirim_toplam > 0
      ? (parseFloat(hesap.bakiye) + hesap.yatirim_toplam).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : parseFloat(hesap.bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  )}
</div>
</div>
{hesap.para_birimi !== 'TRY' && (
  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
    ≈ ₺{gizliMod ? '****' : (hesap.bakiye_tl || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  </div>
)}
{hesap.yatirim_hesabi && hesap.yatirim_toplam > 0 && !gizliMod && (
  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
    {(() => {
      const s = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' }[hesap.para_birimi] || hesap.para_birimi + ' '
      return `Nakit: ${s}${parseFloat(hesap.bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + Yatırım: ${s}${hesap.yatirim_toplam.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    })()}
  </div>
)}
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

const styles = {
  ozetGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '22px' },
  ozetKart: { background: 'var(--bg-card)', borderRadius: '14px', padding: '20px', textAlign: 'left', boxShadow: 'none', border: '1px solid var(--border)', minHeight: '132px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  netKart: { background: 'linear-gradient(135deg, #6faeb3 0%, #2d6482 100%)', border: 'none', boxShadow: '0 10px 24px rgba(45,100,130,.18)' },
  ozetIcon: { color: 'var(--text-primary)', fontSize: '19px', fontWeight: '600', minHeight: '20px', marginBottom: '14px', display: 'flex', alignItems: 'center' },
  ozetLabel: { color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px', fontWeight: '500' },
  ozetDeger: { color: 'var(--text-primary)', fontSize: '21px', fontWeight: '750', letterSpacing: '-.025em' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px', flexWrap: 'wrap', padding: '10px 14px', minHeight: '62px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px' },
  toolbarSol: { display: 'flex', gap: '7px', alignItems: 'center', flexWrap: 'wrap' },
  toolbarLabel: { color: 'var(--text-primary)', fontSize: '12px', fontWeight: '550', marginRight: '4px' },
  filterControl: { display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 9px', borderRadius: '8px', background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-muted)' },
  filterSelect: { appearance: 'none', border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', paddingRight: '8px', cursor: 'pointer' },
  toolIconBtn: { width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' },
  ekleBtn: { padding: '10px 16px', background: '#2f5f77', border: 'none', borderRadius: '8px', color: '#ffffff', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.48)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '18px' },
  modal: { background: 'var(--surface)', borderRadius: '14px', padding: '24px', width: '400px', border: '1px solid var(--border)', boxSizing: 'border-box', boxShadow: '0 22px 60px rgba(15,23,42,.16)' },
  modalBaslik: { color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', margin: '0 0 20px 0', paddingBottom: '14px', borderBottom: '1px solid var(--border)' },
  modalBtnler: { display: 'flex', gap: '12px', marginTop: '8px' },
  label: { color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '550', display: 'block', marginBottom: '7px' },
  input: { width: '100%', minHeight: '42px', padding: '10px 12px', marginBottom: '14px', background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' },
  iptalBtn: { flex: 1, height: '42px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-secondary)', cursor: 'pointer' },
  kaydetBtn: { flex: 1, height: '42px', background: '#234f68', border: 'none', borderRadius: '9px', color: '#fff', fontWeight: '600', cursor: 'pointer' },
  yukleniyor: { color: 'var(--text-muted)', textAlign: 'center', padding: '48px' },
  bos: { textAlign: 'center', padding: '64px' },
  hesapGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' },
  hesapKart: { background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', boxShadow: '0 3px 10px rgba(15,23,42,.05)', border: '1px solid #ccd3db', minHeight: '112px' },
  hesapUst: { display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '18px', minHeight: '30px' },
  hesapIkon: { width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '8px', color: '#fff', background: '#789ca5' },
  hesapAd: { color: 'var(--text-primary)', fontSize: '14px', fontWeight: '650', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  hesapAlt: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '10px' },
  hesapTur: { color: 'var(--text-muted)', fontSize: '11px' },
  accountActions: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1px', opacity: 0, transition: 'opacity .16s ease' },
  silBtn: { width: '25px', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 },
  duzenleBtn: { width: '25px', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 },
  toggleSatir: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' },
  toggleLabel: { color: 'var(--text-secondary)', fontSize: '14px' },
  toggle: { width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' },
  toggleTop: { position: 'absolute', top: '2px', left: '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'transform 0.3s' },
  detayOzetKart: { background: 'var(--bg-input)', borderRadius: '12px', padding: '14px', marginBottom: '8px', border: '1px solid var(--border)' },
  detayOzetSatir: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' },
  detayOzetLabel: { color: 'var(--text-secondary)', fontSize: '14px' },
  gizleBtn: { width: '25px', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 },
  detayYatirimSatir: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' },
  hesapBakiye: { fontSize: '14px', fontWeight: '700', textAlign: 'right', whiteSpace: 'nowrap' },
}

export default Hesaplar               
