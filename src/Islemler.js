    import { useState, useEffect } from 'react'
    import { supabase } from './supabase'

    function Islemler({ session, mobil }) {
    const [islemler, setIslemler] = useState([])
    const [hesaplar, setHesaplar] = useState([])
    const [yukleniyor, setYukleniyor] = useState(true)
    const [formAcik, setFormAcik] = useState(false)
    const [kaydediliyor, setKaydediliyor] = useState(false)
    const [filtre, setFiltre] = useState('hepsi')
    const [yeni, setYeni] = useState({
  tarih: new Date().toISOString().split('T')[0],
  hesap_id: '',
  hedef_hesap_id: '',
  tutar: '',
  tur: 'gider',
  kategori: 'Zaruri',
  aciklama: '',
  taksitli: false,
  taksit_sayisi: ''
})

    const kategoriler = {
        gider: ['Zaruri', 'Keyfi', 'Fatura', 'Market', 'Ulaşım', 'Sağlık', 'Eğlence', 'Giyim', 'Diğer'],
        gelir: ['Maaş', 'Freelance', 'Kira Geliri', 'Yatırım Getirisi', 'Diğer'],
        transfer: ['Hesaplar Arası Transfer']
    }

    const turRenk = {
        gelir: '#4ecca3',
        gider: '#ff6b6b',
        transfer: '#45b7d1'
    }

    const turLabel = {
        gelir: 'Gelir',
        gider: 'Gider',
        transfer: 'Transfer'
    }

    useEffect(() => {
        islemleriGetir()
        hesaplariGetir()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const islemleriGetir = async () => {
        setYukleniyor(true)
        const { data, error } = await supabase
        .from('islemler')
        .select('*, hesaplar(ad)')
        .eq('user_id', session.user.id)
        .order('tarih', { ascending: false })
        .limit(100)
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
    // Kaynak hesaptan düş
    await supabase.from('islemler').insert({
      user_id: session.user.id,
      hesap_id: yeni.hesap_id,
      tarih: yeni.tarih,
      tutar: parseFloat(yeni.tutar),
      tur: 'gider',
      kategori: 'Hesaplar Arası Transfer',
      aciklama: yeni.aciklama || `Transfer → ${hesaplar.find(h => h.id === yeni.hedef_hesap_id)?.ad}`
    })
    // Hedef hesaba ekle
    await supabase.from('islemler').insert({
      user_id: session.user.id,
      hesap_id: yeni.hedef_hesap_id,
      tarih: yeni.tarih,
      tutar: parseFloat(yeni.tutar),
      tur: 'gelir',
      kategori: 'Hesaplar Arası Transfer',
      aciklama: yeni.aciklama || `Transfer ← ${hesaplar.find(h => h.id === yeni.hesap_id)?.ad}`
    })
  } else {
    await supabase.from('islemler').insert({
      user_id: session.user.id,
      hesap_id: yeni.hesap_id,
      tarih: yeni.tarih,
      tutar: parseFloat(yeni.tutar),
      tur: yeni.tur,
      kategori: yeni.kategori,
      aciklama: yeni.aciklama
    })

    // Kredi kartı + gider + taksitli ise borç tablosuna ekle
// Kredi kartı + gider ise borç tablosuna ekle
if (yeni.tur === 'gider') {
  const seciliHesap = hesaplar.find(h => h.id === yeni.hesap_id)
  if (seciliHesap?.tur?.toLowerCase() === 'kredi kartı') {

    if (yeni.taksitli && parseInt(yeni.taksit_sayisi) > 1) {
      // Taksitli borç
      const aylikTaksit = parseFloat(yeni.tutar) / parseInt(yeni.taksit_sayisi)
      let ilkTaksitTarih = new Date(yeni.tarih)
      const kesimGunu = seciliHesap.kesim_gunu || 1
      ilkTaksitTarih.setDate(kesimGunu)
      if (ilkTaksitTarih <= new Date(yeni.tarih)) {
        ilkTaksitTarih.setMonth(ilkTaksitTarih.getMonth() + 1)
      }
      ilkTaksitTarih.setDate(ilkTaksitTarih.getDate() + 10)

      await supabase.from('borclar').insert({
        user_id: session.user.id,
        ad: `${yeni.aciklama || yeni.kategori} (${yeni.taksit_sayisi} taksit)`,
        tur: 'Kredi Kartı',
        banka: seciliHesap.ad,
        toplam_borc: parseFloat(yeni.tutar),
        kalan_borc: parseFloat(yeni.tutar),
        aylik_taksit: aylikTaksit,
        minimum_odeme: aylikTaksit,
        taksit_sayisi: parseInt(yeni.taksit_sayisi),
        odenen_taksit: 0,
        taksitli: true,
        son_odeme_tarihi: ilkTaksitTarih.toISOString().split('T')[0],
        aktif: true,
        odenen_tutar: 0
      })
    } else {
      // Taksitsiz borç — o ayın borcuna ekle
      const kesimGunu = seciliHesap.kesim_gunu || 1
      let donemBitis = new Date(yeni.tarih)
      donemBitis.setDate(kesimGunu)
      if (new Date(yeni.tarih).getDate() > kesimGunu) {
        donemBitis.setMonth(donemBitis.getMonth() + 1)
      }
      let sonOdeme = new Date(donemBitis)
      sonOdeme.setDate(sonOdeme.getDate() + 10)

      const borcAdi = `${seciliHesap.ad} - ${String(donemBitis.getMonth() + 1).padStart(2, '0')}/${donemBitis.getFullYear()}`

      // Aynı ay için kayıt var mı kontrol et
      const { data: mevcutBorc } = await supabase
        .from('borclar')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('ad', borcAdi)
        .eq('aktif', true)
        .single()

      if (mevcutBorc) {
        // Varsa üstüne ekle
        await supabase.from('borclar').update({
          kalan_borc: parseFloat(mevcutBorc.kalan_borc) + parseFloat(yeni.tutar),
          toplam_borc: parseFloat(mevcutBorc.toplam_borc) + parseFloat(yeni.tutar),
          minimum_odeme: parseFloat(mevcutBorc.minimum_odeme) + parseFloat(yeni.tutar),
        }).eq('id', mevcutBorc.id)
      } else {
        // Yoksa yeni kayıt oluştur
        await supabase.from('borclar').insert({
          user_id: session.user.id,
          ad: borcAdi,
          tur: 'Kredi Kartı',
          banka: seciliHesap.ad,
          toplam_borc: parseFloat(yeni.tutar),
          kalan_borc: parseFloat(yeni.tutar),
          minimum_odeme: parseFloat(yeni.tutar),
          taksit_sayisi: 1,
          odenen_taksit: 0,
          taksitli: false,
          son_odeme_tarihi: sonOdeme.toISOString().split('T')[0],
          aktif: true,
          odenen_tutar: 0,
          aylik_taksit: 0
        })
      }
    }
  }
}
  }

  setFormAcik(false)
  setYeni({
    tarih: new Date().toISOString().split('T')[0],
    hesap_id: hesaplar[0]?.id || '',
    hedef_hesap_id: '',
    tutar: '',
    tur: 'gider',
    kategori: 'Zaruri',
    aciklama: '',
    taksitli: false,
    taksit_sayisi: ''
  })
  islemleriGetir()
  setKaydediliyor(false)
}

    const islemSil = async (id) => {
        if (!window.confirm('Bu işlemi silmek istediğine emin misin?')) return
        await supabase.from('islemler').delete().eq('id', id)
        islemleriGetir()
    }

    const filtreliIslemler = filtre === 'hepsi'
        ? islemler
        : islemler.filter(i => i.tur === filtre)

    const toplamGelir = islemler.filter(i => i.tur === 'gelir').reduce((a, i) => a + parseFloat(i.tutar), 0)
    const toplamGider = islemler.filter(i => i.tur === 'gider').reduce((a, i) => a + parseFloat(i.tutar), 0)
    

    return (
        <div>
        {/* Üst Özet */}
        <div style={{ ...styles.ozetGrid, gridTemplateColumns: mobil ? 'repeat(2,1fr)' : 'repeat(4,1fr)' }}>
            <div style={styles.ozetKart}>
            <div style={styles.ozetLabel}>Toplam Gelir</div>
            <div style={{ ...styles.ozetDeger, color: '#4ecca3' }}>₺{toplamGelir.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div style={styles.ozetKart}>
            <div style={styles.ozetLabel}>Toplam Gider</div>
            <div style={{ ...styles.ozetDeger, color: '#ff6b6b' }}>₺{toplamGider.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div style={styles.ozetKart}>
            <div style={styles.ozetLabel}>Net</div>
            <div style={{ ...styles.ozetDeger, color: (toplamGelir - toplamGider) >= 0 ? '#4ecca3' : '#ff6b6b' }}>
                ₺{(toplamGelir - toplamGider).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
            </div>
           
        </div>

        {/* Toolbar */}
        <div style={styles.toolbar}>
            <div style={{ ...styles.filtreler, overflowX: mobil ? 'auto' : 'visible', flexWrap: mobil ? 'nowrap' : 'wrap', paddingBottom: mobil ? '4px' : '0' }}>
            {['hepsi', 'gelir', 'gider', 'transfer'].map(f => (
                <button
                key={f}
                style={filtre === f ? { ...styles.filtreBtn, ...styles.filtreBtnAktif } : styles.filtreBtn}
                onClick={() => setFiltre(f)}
                >
                {f === 'hepsi' ? 'Tümü' : turLabel[f]}
                </button>
            ))}
            </div>
            <button style={styles.ekleBtn} onClick={() => setFormAcik(true)}>+ Yeni İşlem Ekle</button>
        </div>

        {/* Form Modal */}
        {formAcik && (
            <div style={styles.modalOverlay}>
            <div style={{ ...styles.modal, width: mobil ? '95vw' : '420px' }}>
                <h3 style={styles.modalBaslik}>Yeni İşlem Ekle</h3>

                <label style={styles.label}>İşlem Türü</label>
                <div style={{ ...styles.turSecici, display: 'grid', gridTemplateColumns: mobil ? '1fr 1fr' : 'repeat(3,1fr)' }}>
                {['gelir', 'gider', 'transfer'].map(t => (
                    <button
                    key={t}
                    style={yeni.tur === t
                        ? { ...styles.turBtn, background: turRenk[t], color: '#0f172a' }
                        : styles.turBtn}
                    onClick={() => setYeni({ ...yeni, tur: t, kategori: kategoriler[t][0] })}
                    >
                    {turLabel[t]}
                    </button>
                ))}
                </div>

                <label style={styles.label}>Tarih</label>
                <input
                style={styles.input}
                type="date"
                value={yeni.tarih}
                onChange={e => setYeni({ ...yeni, tarih: e.target.value })}
                />

<label style={styles.label}>{yeni.tur === 'transfer' ? 'Kaynak Hesap' : 'Hesap'}</label>
<select
  style={styles.input}
  value={yeni.hesap_id}
  onChange={e => setYeni({ ...yeni, hesap_id: e.target.value })}
>
  {hesaplar.map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
</select>

{yeni.tur === 'transfer' && (
  <>
    <label style={styles.label}>Hedef Hesap</label>
    <select
      style={styles.input}
      value={yeni.hedef_hesap_id}
      onChange={e => setYeni({ ...yeni, hedef_hesap_id: e.target.value })}
    >
      <option value="">Hedef hesap seç</option>
      {hesaplar
        .filter(h => h.id !== yeni.hesap_id)
        .map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
    </select>
  </>
)}

    {(() => {
    const seciliHesap = hesaplar.find(h => h.id === yeni.hesap_id)
    if (seciliHesap?.tur?.toLowerCase() === 'kredi kartı' && yeni.tur === 'gider') {
        return (
        <>
            <div style={styles.bilgiMesaj}>
            💳 Bu gider <strong>{seciliHesap.ad}</strong> kartının borcuna eklenecek.
            {seciliHesap.kesim_gunu ? ` Kesim günü: ${seciliHesap.kesim_gunu}` : ''}
            </div>
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
                <input
                style={styles.input}
                type="number"
                placeholder="örn. 3, 6, 12"
                value={yeni.taksit_sayisi}
                onChange={e => setYeni({ ...yeni, taksit_sayisi: e.target.value })}
                />
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
                <input
                style={styles.input}
                type="number"
                placeholder="0.00"
                value={yeni.tutar}
                onChange={e => setYeni({ ...yeni, tutar: e.target.value })}
                />

                <label style={styles.label}>Kategori</label>
                <select
                style={styles.input}
                value={yeni.kategori}
                onChange={e => setYeni({ ...yeni, kategori: e.target.value })}
                >
                {(kategoriler[yeni.tur] || []).map(k => <option key={k} value={k}>{k}</option>)}
                </select>

                <label style={styles.label}>Açıklama (isteğe bağlı)</label>
                <input
                style={styles.input}
                placeholder="örn. Migros alışverişi"
                value={yeni.aciklama}
                onChange={e => setYeni({ ...yeni, aciklama: e.target.value })}
                />

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
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>Henüz işlem yok.</p>
            </div>
        ) : (
            <div style={styles.liste}>
            {filtreliIslemler.map(islem => (
                <div key={islem.id} style={styles.islemSatir}>
                <div style={{ ...styles.turBadge, background: turRenk[islem.tur] + '22', color: turRenk[islem.tur] }}>
                    {turLabel[islem.tur]}
                </div>
                <div style={styles.islemBilgi}>
                    <div style={styles.islemAciklama}>{islem.aciklama || islem.kategori}</div>
                    <div style={styles.islemDetay}>
                    {islem.tarih} · {islem.hesaplar?.ad} · {islem.kategori}
                    </div>
                </div>
                <div style={{ ...styles.islemTutar, color: islem.tur === 'gelir' ? '#4ecca3' : islem.tur === 'gider' ? '#ff6b6b' : '#ffd93d' }}>
                    {islem.tur === 'gelir' ? '+' : '-'}₺{parseFloat(islem.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
                <button style={styles.silBtn} onClick={() => islemSil(islem.id)}>🗑️</button>
                </div>
            ))}
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
    filtreler: { display: 'flex', gap: '8px' },
    filtreBtn: { padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px' },
    filtreBtnAktif: { background: 'rgba(78,204,163,0.15)', border: '1px solid #4ecca3', color: '#4ecca3' },
    ekleBtn: { padding: '12px 24px', background: 'linear-gradient(135deg,#4ecca3,#38b2ac)', border: 'none', borderRadius: '10px', color: '#0f172a', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: '#1e293b', borderRadius: '20px', padding: '32px', width: '420px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' },
    modalBaslik: { color: '#fff', fontSize: '18px', margin: '0 0 20px 0' },
    turSecici: { display: 'flex', gap: '8px', marginBottom: '16px' },
    turBtn: { flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px' },
    label: { color: 'rgba(255,255,255,0.6)', fontSize: '13px', display: 'block', marginBottom: '6px' },
    input: { width: '100%', padding: '12px', marginBottom: '14px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' },
    modalBtnler: { display: 'flex', gap: '12px', marginTop: '8px' },
    iptalBtn: { flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' },
    kaydetBtn: { flex: 1, padding: '12px', background: 'linear-gradient(135deg,#4ecca3,#38b2ac)', border: 'none', borderRadius: '10px', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer' },
    yukleniyor: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '48px' },
    bos: { textAlign: 'center', padding: '64px' },
    liste: { display: 'flex', flexDirection: 'column', gap: '8px' },
    islemSatir: { display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' },
    turBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' },
    islemBilgi: { flex: 1 },
    islemAciklama: { color: '#fff', fontSize: '14px', fontWeight: '500' },
    islemDetay: { color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' },
    islemTutar: { fontSize: '16px', fontWeight: 'bold', whiteSpace: 'nowrap' },
    silBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.4 },
    bilgiMesaj: { 
    background: 'rgba(78,204,163,0.1)', 
    border: '1px solid rgba(78,204,163,0.3)', 
    borderRadius: '10px', 
    padding: '12px', 
    color: '#4ecca3', 
    fontSize: '13px', 
    marginBottom: '14px' },
    toggleSatir: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' },
    toggleLabel: { color: 'rgba(43, 40, 40, 0.7)', fontSize: '14px' },
    toggle: { width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' },
    toggleTop: { position: 'absolute', top: '2px', left: '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'transform 0.3s' },
    taksitBilgi: { background: 'rgba(78,204,163,0.1)', border: '1px solid rgba(78,204,163,0.3)', borderRadius: '10px', padding: '12px', color: '#4ecca3', fontSize: '14px', marginBottom: '14px' },
    }
    

    export default Islemler