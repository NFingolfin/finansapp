import { useState, useEffect } from 'react'
import { supabase } from './supabase'

/* ── Şifre güç hesaplama ── */
function sifreGucu(sifre) {
  let skor = 0
  if (sifre.length >= 6) skor++
  if (sifre.length >= 10) skor++
  if (/[A-Z]/.test(sifre) || /[0-9]/.test(sifre)) skor++
  if (/[^A-Za-z0-9]/.test(sifre)) skor++
  return skor
}
function sifreGucRenk(s) {
  const g = sifreGucu(s)
  if (g <= 1) return '#ff6b6b'
  if (g === 2) return '#ffd93d'
  if (g === 3) return '#4ecca3'
  return '#00ffaa'
}
function sifreGucLabel(s) {
  const g = sifreGucu(s)
  if (g <= 1) return 'Zayıf'
  if (g === 2) return 'Orta'
  if (g === 3) return 'İyi'
  return 'Güçlü'
}

/* ── Mesaj bileşeni ── */
function Mesaj({ tip, metin }) {
  return (
    <div style={{
      background: tip === 'basari' ? 'rgba(78,204,163,0.1)' : 'rgba(255,107,107,0.1)',
      border: `1px solid ${tip === 'basari' ? 'rgba(78,204,163,0.3)' : 'rgba(255,107,107,0.3)'}`,
      borderRadius: '10px', padding: '10px 14px',
      color: tip === 'basari' ? '#4ecca3' : '#ff9999',
      fontSize: '13px', marginBottom: '16px', lineHeight: 1.5,
    }}>
      {tip === 'basari' ? '✅ ' : '⚠️ '}{metin}
    </div>
  )
}

/* ── Ana bileşen ── */
function Hesabim({ session, onProfilGuncellendi, mobil }) {
  const [ad, setAd] = useState('')
  const [soyad, setSoyad] = useState('')
  const [mevcutSifre, setMevcutSifre] = useState('')
  const [yeniSifre, setYeniSifre] = useState('')
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('')

  const [profilYukleniyor, setProfilYukleniyor] = useState(true)
  const [profilKaydediliyor, setProfilKaydediliyor] = useState(false)
  const [sifreKaydediliyor, setSifreKaydediliyor] = useState(false)
  const [profilMesaj, setProfilMesaj] = useState(null)
  const [sifreMesaj, setSifreMesaj] = useState(null)

  useEffect(() => { profilGetir() }, [])

  const profilGetir = async () => {
    setProfilYukleniyor(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('ad, soyad')
      .eq('id', session.user.id)
      .single()

    if (data) {
      setAd(data.ad || '')
      setSoyad(data.soyad || '')
    } else if (error?.code === 'PGRST116') {
      // Satır yok → boş kayıt oluştur
      await supabase.from('profiles').upsert(
        { id: session.user.id, ad: '', soyad: '' },
        { onConflict: 'id' }
      )
    }
    setProfilYukleniyor(false)
  }

  /* Profil güncelle — upsert kullanılıyor (satır yoksa oluşturur, varsa günceller) */
  const profilGuncelle = async () => {
    if (!ad.trim()) { setProfilMesaj({ tip: 'hata', metin: 'Ad alanı boş olamaz.' }); return }
    setProfilKaydediliyor(true); setProfilMesaj(null)

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        ad: ad.trim(),
        soyad: soyad.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (error) {
      setProfilMesaj({ tip: 'hata', metin: 'Hata: ' + error.message })
    } else {
      setProfilMesaj({ tip: 'basari', metin: 'Profil bilgileri başarıyla güncellendi.' })
      onProfilGuncellendi?.()   // Dashboard sidebar'ı yenile
    }
    setProfilKaydediliyor(false)
  }

  /* Şifre güncelle */
  const sifreGuncelle = async () => {
    if (!mevcutSifre || !yeniSifre || !yeniSifreTekrar) {
      setSifreMesaj({ tip: 'hata', metin: 'Tüm şifre alanları doldurulmalı.' }); return
    }
    if (yeniSifre !== yeniSifreTekrar) {
      setSifreMesaj({ tip: 'hata', metin: 'Yeni şifreler eşleşmiyor.' }); return
    }
    if (yeniSifre.length < 6) {
      setSifreMesaj({ tip: 'hata', metin: 'Yeni şifre en az 6 karakter olmalı.' }); return
    }
    setSifreKaydediliyor(true); setSifreMesaj(null)

    // Mevcut şifre doğrulama
    const { error: girisHata } = await supabase.auth.signInWithPassword({
      email: session.user.email, password: mevcutSifre,
    })
    if (girisHata) {
      setSifreMesaj({ tip: 'hata', metin: 'Mevcut şifre yanlış.' })
      setSifreKaydediliyor(false); return
    }

    // Yeni şifre uygula
    const { error } = await supabase.auth.updateUser({ password: yeniSifre })
    if (error) {
      setSifreMesaj({ tip: 'hata', metin: 'Hata: ' + error.message })
    } else {
      setSifreMesaj({ tip: 'basari', metin: 'Şifre başarıyla güncellendi.' })
      setMevcutSifre(''); setYeniSifre(''); setYeniSifreTekrar('')
    }
    setSifreKaydediliyor(false)
  }

  if (profilYukleniyor) return <div style={s.yukleniyor}>Yükleniyor...</div>

  return (
    <div style={{ ...s.sayfa, padding: mobil ? '0 2px' : undefined }}>

      {/* ── Kullanıcı bilgi kartı ── */}
      <div style={{ ...s.kullaniciBanner, padding: mobil ? '16px' : '24px 28px' }}>
        <div style={s.avatarDaire}>
          {ad ? ad.charAt(0).toUpperCase() : session.user.email.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={s.bannerAd}>
            {ad ? `${ad} ${soyad}`.trim() : '—'}
          </div>
          <div style={s.bannerEmail}>{session.user.email}</div>
          <div style={s.bannerBadge}>Aktif Hesap</div>
        </div>
      </div>

      {/* ── Profil Bilgileri ── */}
      <div style={{ ...s.panel, padding: mobil ? '18px 16px' : '28px' }}>
        <div style={s.panelHeader}>
          <div style={s.panelIkon}>👤</div>
          <div>
            <h2 style={s.panelBaslik}>Profil Bilgileri</h2>
            <p style={s.panelAlt}>Ad ve soyadını güncel tut</p>
          </div>
        </div>

        {/* E-posta (salt okunur) */}
        <div style={s.epostaKutu}>
          <span style={s.epostaLabel}>E-posta</span>
          <span style={s.epostaText}>{session.user.email}</span>
          <span style={s.epostaBadge}>Değiştirilemez</span>
        </div>

        <div style={{ ...s.ikiliGrid, gridTemplateColumns: mobil ? '1fr' : '1fr 1fr' }}>
          <div>
            <label style={s.label}>Ad</label>
            <input style={s.input} type="text" placeholder="Adınız"
              value={ad} onChange={e => setAd(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Soyad</label>
            <input style={s.input} type="text" placeholder="Soyadınız"
              value={soyad} onChange={e => setSoyad(e.target.value)} />
          </div>
        </div>

        {profilMesaj && <Mesaj tip={profilMesaj.tip} metin={profilMesaj.metin} />}

        <button
          style={profilKaydediliyor ? s.btnDisabled : s.btn}
          onClick={profilGuncelle}
          disabled={profilKaydediliyor}
        >
          {profilKaydediliyor ? '⏳ Kaydediliyor...' : '💾  Profili Kaydet'}
        </button>
      </div>

      {/* ── Şifre Değiştir ── */}
      <div style={{ ...s.panel, padding: mobil ? '18px 16px' : '28px' }}>
        <div style={s.panelHeader}>
          <div style={s.panelIkon}>🔐</div>
          <div>
            <h2 style={s.panelBaslik}>Şifre Değiştir</h2>
            <p style={s.panelAlt}>Güvenliğin için güçlü bir şifre kullan</p>
          </div>
        </div>

        <label style={s.label}>Mevcut Şifre</label>
        <input
          style={{ ...s.input, marginBottom: '18px' }}
          type="password" placeholder="••••••••"
          value={mevcutSifre}
          onChange={e => setMevcutSifre(e.target.value)}
          autoComplete="current-password"
        />

        <div style={{ ...s.ikiliGrid, gridTemplateColumns: mobil ? '1fr' : '1fr 1fr' }}>
          <div>
            <label style={s.label}>Yeni Şifre</label>
            <input style={s.input} type="password" placeholder="En az 6 karakter"
              value={yeniSifre}
              onChange={e => setYeniSifre(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label style={s.label}>Yeni Şifre Tekrar</label>
            <input style={s.input} type="password" placeholder="••••••••"
              value={yeniSifreTekrar}
              onChange={e => setYeniSifreTekrar(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        {/* Şifre gücü göstergesi */}
        {yeniSifre && (
          <div style={s.gucSatir}>
            <span style={s.gucLabel}>Şifre gücü:</span>
            <div style={s.gucBarlar}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  ...s.gucBar,
                  background: sifreGucu(yeniSifre) >= i
                    ? sifreGucRenk(yeniSifre)
                    : 'rgba(255,255,255,0.1)',
                }} />
              ))}
            </div>
            <span style={{ color: sifreGucRenk(yeniSifre), fontSize: '12px', fontWeight: 600 }}>
              {sifreGucLabel(yeniSifre)}
            </span>
          </div>
        )}

        {/* Eşleşme kontrolü */}
        {yeniSifreTekrar && yeniSifre !== yeniSifreTekrar && (
          <div style={s.eslesmeUyari}>⚠️ Şifreler eşleşmiyor</div>
        )}
        {yeniSifreTekrar && yeniSifre === yeniSifreTekrar && yeniSifre.length >= 6 && (
          <div style={s.eslesmeOk}>✅ Şifreler eşleşiyor</div>
        )}

        {sifreMesaj && <Mesaj tip={sifreMesaj.tip} metin={sifreMesaj.metin} />}

        <button
          style={sifreKaydediliyor ? s.btnDisabled : s.btn}
          onClick={sifreGuncelle}
          disabled={sifreKaydediliyor}
        >
          {sifreKaydediliyor ? '⏳ Güncelleniyor...' : '🔑  Şifreyi Güncelle'}
        </button>
      </div>

    </div>
  )
}

const s = {
  sayfa: { maxWidth: '720px' },
  yukleniyor: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '60px' },

  /* Kullanıcı banner */
  kullaniciBanner: {
    display: 'flex', alignItems: 'center', gap: '20px',
    background: 'linear-gradient(135deg, rgba(78,204,163,0.12), rgba(56,178,172,0.06))',
    border: '1px solid rgba(78,204,163,0.2)',
    borderRadius: '18px', padding: '24px 28px', marginBottom: '24px',
  },
  avatarDaire: {
    width: 58, height: 58, borderRadius: '50%',
    background: 'linear-gradient(135deg, #4ecca3, #38b2ac)',
    color: '#0a0f1e', fontSize: '24px', fontWeight: '800',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, boxShadow: '0 4px 16px rgba(78,204,163,0.35)',
  },
  bannerAd: { color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '2px' },
  bannerEmail: { color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginBottom: '8px' },
  bannerBadge: {
    display: 'inline-block',
    background: 'rgba(78,204,163,0.15)', border: '1px solid rgba(78,204,163,0.3)',
    borderRadius: '20px', padding: '2px 10px',
    color: '#4ecca3', fontSize: '11px', fontWeight: '600',
  },

  /* Panel */
  panel: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '18px', padding: '28px',
    marginBottom: '20px',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', gap: '16px',
    paddingBottom: '20px', marginBottom: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  panelIkon: {
    width: 46, height: 46,
    background: 'rgba(78,204,163,0.1)', border: '1px solid rgba(78,204,163,0.2)',
    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '20px', flexShrink: 0,
  },
  panelBaslik: { color: '#fff', fontSize: '16px', fontWeight: '700', margin: '0 0 3px 0' },
  panelAlt: { color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 },

  /* E-posta kutusu */
  epostaKutu: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '11px', padding: '11px 16px', marginBottom: '18px',
  },
  epostaLabel: { color: 'rgba(255,255,255,0.35)', fontSize: '12px', minWidth: 52 },
  epostaText: { color: 'rgba(255,255,255,0.65)', fontSize: '13px', flex: 1 },
  epostaBadge: {
    background: 'rgba(255,255,255,0.06)', borderRadius: '6px',
    padding: '2px 8px', color: 'rgba(255,255,255,0.3)', fontSize: '10px',
  },

  /* Form */
  ikiliGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '4px' },
  label: {
    display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11px',
    fontWeight: '600', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '7px',
  },
  input: {
    width: '100%', padding: '12px 14px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '11px', color: '#fff', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', marginBottom: '14px',
  },

  /* Şifre güç */
  gucSatir: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  gucLabel: { color: 'rgba(255,255,255,0.4)', fontSize: '12px', whiteSpace: 'nowrap' },
  gucBarlar: { display: 'flex', gap: '4px' },
  gucBar: { width: 30, height: 4, borderRadius: 2, transition: 'background 0.3s' },

  eslesmeUyari: { color: '#ff9999', fontSize: '12px', marginBottom: '12px' },
  eslesmeOk: { color: '#4ecca3', fontSize: '12px', marginBottom: '12px' },

  /* Buton */
  btn: {
    padding: '13px 28px',
    background: 'linear-gradient(135deg, #4ecca3, #38b2ac)',
    border: 'none', borderRadius: '11px',
    color: '#0a0f1e', fontSize: '14px', fontWeight: '700',
    cursor: 'pointer', boxShadow: '0 4px 16px rgba(78,204,163,0.28)',
  },
  btnDisabled: {
    padding: '13px 28px',
    background: 'rgba(78,204,163,0.25)', border: 'none', borderRadius: '11px',
    color: 'rgba(10,15,30,0.5)', fontSize: '14px', fontWeight: '700', cursor: 'not-allowed',
  },
}

export default Hesabim
