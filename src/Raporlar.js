import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'

function Raporlar({ session, mobil }) {
  const [islemler, setIslemler] = useState([])
  const [yatirimlar, setYatirimlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [seciliAy, setSeciliAy] = useState(() => {
    const bugun = new Date()
    return `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    verileriGetir()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const verileriGetir = async () => {
    setYukleniyor(true)
    const [{ data: islemData }, { data: yatirimData }] = await Promise.all([
      supabase.from('islemler').select('*').eq('user_id', session.user.id).order('tarih', { ascending: false }),
      supabase.from('yatirimlar').select('*').eq('user_id', session.user.id)
    ])
    if (islemData) setIslemler(islemData)
    if (yatirimData) setYatirimlar(yatirimData)
    setYukleniyor(false)
  }

  // Son 6 ayı üret (seçilen ay dahil)
  const son6Ay = () => {
    const aylar = []
    const [yil, ay] = seciliAy.split('-').map(Number)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(yil, ay - 1 - i, 1)
      aylar.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })
      })
    }
    return aylar
  }

  // Aylık gelir/gider grafiği verisi
  const aylikGrafikVerisi = son6Ay().map(({ key, label }) => {
    const ayIslemleri = islemler.filter(i => i.tarih?.startsWith(key))
    const gelir = ayIslemleri.filter(i => i.tur === 'gelir').reduce((a, i) => a + parseFloat(i.tutar), 0)
    const gider = ayIslemleri.filter(i => i.tur === 'gider').reduce((a, i) => a + parseFloat(i.tutar), 0)
    return { ay: label, Gelir: Math.round(gelir), Gider: Math.round(gider), Net: Math.round(gelir - gider) }
  })

  // Seçilen aya ait işlemler
  const seciliAyIslemleri = islemler.filter(i => i.tarih?.startsWith(seciliAy))
  const ayGelir = seciliAyIslemleri.filter(i => i.tur === 'gelir').reduce((a, i) => a + parseFloat(i.tutar), 0)
  const ayGider = seciliAyIslemleri.filter(i => i.tur === 'gider').reduce((a, i) => a + parseFloat(i.tutar), 0)
  const ayNet = ayGelir - ayGider
  const tasarrufOrani = ayGelir > 0 ? ((ayNet / ayGelir) * 100).toFixed(1) : 0

  // Kategori dağılımı (sadece giderler)
  const kategoriMap = {}
  seciliAyIslemleri.filter(i => i.tur === 'gider' && i.kategori !== 'Hesaplar Arası Transfer').forEach(i => {
    const kat = i.kategori || 'Diğer'
    kategoriMap[kat] = (kategoriMap[kat] || 0) + parseFloat(i.tutar)
  })
  const kategoriVerisi = Object.entries(kategoriMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: Math.round(value) }))

  const KATEGORI_RENK = [
    '#4ecca3', '#45b7d1', '#ffd93d', '#ff6b6b', '#a78bfa',
    '#f59e0b', '#34d399', '#f87171', '#60a5fa', '#c084fc'
  ]

  // Yatırım performans özeti
  const toplamMaliyet = yatirimlar.reduce((a, y) => {
    if (y.para_birimi !== 'TRY') return a
    return a + parseFloat(y.miktar) * parseFloat(y.birim_maliyet)
  }, 0)
  const toplamGuncelDeger = yatirimlar.filter(y => y.para_birimi === 'TRY').reduce((a, y) => a + parseFloat(y.guncel_deger), 0)
  const toplamKarZarar = toplamGuncelDeger - toplamMaliyet
  const yatirimGetirisi = toplamMaliyet > 0 ? ((toplamKarZarar / toplamMaliyet) * 100).toFixed(2) : 0

  const yatirimTurGrubu = {}
  yatirimlar.filter(y => y.para_birimi === 'TRY').forEach(y => {
    const tur = y.tur || 'Diğer'
    yatirimTurGrubu[tur] = (yatirimTurGrubu[tur] || 0) + parseFloat(y.guncel_deger)
  })
  const yatirimGrafikVerisi = Object.entries(yatirimTurGrubu)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: Math.round(value) }))

  // Ay seçici için seçenekler (son 24 ay)
  const aySecenekleri = () => {
    const secenekler = []
    const bugun = new Date()
    for (let i = 0; i < 24; i++) {
      const d = new Date(bugun.getFullYear(), bugun.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
      secenekler.push({ key, label })
    }
    return secenekler
  }

  const formatTL = (v) => `₺${Number(v).toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={styles.tooltip}>
        <div style={styles.tooltipBaslik}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, fontSize: '13px' }}>
            {p.name}: {formatTL(p.value)}
          </div>
        ))}
      </div>
    )
  }

  if (yukleniyor) return <div style={styles.yukleniyor}>Yükleniyor...</div>

  return (
    <div>
      {/* Ay Seçici */}
      <div style={{ ...styles.aySecici, flexWrap: mobil ? 'wrap' : 'nowrap' }}>
        <span style={styles.aySeciciLabel}>Rapor dönemi:</span>
        <select
          style={styles.aySelect}
          value={seciliAy}
          onChange={e => setSeciliAy(e.target.value)}
        >
          {aySecenekleri().map(a => (
            <option key={a.key} value={a.key}>{a.label}</option>
          ))}
        </select>
        <span style={styles.aySeciciAlt}>(Grafik: seçilen aya dahil son 6 ay)</span>
      </div>

      {/* Üst Özet Kartları */}
      <div style={{ ...styles.ozetGrid, gridTemplateColumns: mobil ? 'repeat(2,1fr)' : 'repeat(4,1fr)' }}>
        <OzetKart baslik="Aylık Gelir" deger={formatTL(ayGelir)} renk="#4ecca3" icon="💰" />
        <OzetKart baslik="Aylık Gider" deger={formatTL(ayGider)} renk="#ff6b6b" icon="💸" />
        <OzetKart baslik="Net Akış" deger={formatTL(ayNet)} renk={ayNet >= 0 ? '#4ecca3' : '#ff6b6b'} icon="⚖️" />
        <OzetKart baslik="Tasarruf Oranı" deger={`%${tasarrufOrani}`} renk={tasarrufOrani >= 20 ? '#4ecca3' : tasarrufOrani >= 0 ? '#ffd93d' : '#ff6b6b'} icon="🏦" />
      </div>

      {/* Aylık Gelir/Gider Grafiği */}
      <div style={styles.grafPanel}>
        <h3 style={styles.panelBaslik}>Son 6 Ay — Gelir & Gider Karşılaştırması</h3>
        {aylikGrafikVerisi.every(d => d.Gelir === 0 && d.Gider === 0) ? (
          <div style={styles.bosGraf}>Bu dönemde işlem bulunamadı.</div>
        ) : (
          <ResponsiveContainer width="100%" height={mobil ? 200 : 280}>
            <BarChart data={aylikGrafikVerisi} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="ay" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `₺${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }} />
              <Bar dataKey="Gelir" fill="#4ecca3" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gider" fill="#ff6b6b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Net" fill="#45b7d1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Alt Grid */}
      <div style={{ ...styles.altGrid, gridTemplateColumns: mobil ? '1fr' : '1fr 1fr' }}>
        {/* Kategori Dağılımı */}
        <div style={styles.grafPanel}>
          <h3 style={styles.panelBaslik}>
            Harcama Kategorileri —{' '}
            {new Date(seciliAy + '-01').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
          </h3>
          {kategoriVerisi.length === 0 ? (
            <div style={styles.bosGraf}>Bu ay gider işlemi yok.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={kategoriVerisi}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {kategoriVerisi.map((_, i) => (
                      <Cell key={i} fill={KATEGORI_RENK[i % KATEGORI_RENK.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatTL(v)} contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={styles.kategoriListe}>
                {kategoriVerisi.map((k, i) => (
                  <div key={i} style={styles.kategoriSatir}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: KATEGORI_RENK[i % KATEGORI_RENK.length] }} />
                      <span style={styles.kategoriAd}>{k.name}</span>
                    </div>
                    <div style={styles.kategoriSag}>
                      <span style={styles.kategoriTutar}>{formatTL(k.value)}</span>
                      <span style={styles.kategoriYuzde}>
                        %{ayGider > 0 ? ((k.value / ayGider) * 100).toFixed(0) : 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Yatırım Performansı */}
        <div style={styles.grafPanel}>
          <h3 style={styles.panelBaslik}>Yatırım Performansı</h3>
          {yatirimlar.length === 0 ? (
            <div style={styles.bosGraf}>Henüz yatırım kaydı yok.</div>
          ) : (
            <>
              <div style={styles.yatirimOzetGrid}>
                <div style={styles.yatirimOzetKart}>
                  <div style={styles.yatirimOzetLabel}>Toplam Maliyet</div>
                  <div style={{ ...styles.yatirimOzetDeger, color: '#45b7d1' }}>{formatTL(toplamMaliyet)}</div>
                </div>
                <div style={styles.yatirimOzetKart}>
                  <div style={styles.yatirimOzetLabel}>Güncel Değer</div>
                  <div style={{ ...styles.yatirimOzetDeger, color: '#4ecca3' }}>{formatTL(toplamGuncelDeger)}</div>
                </div>
                <div style={styles.yatirimOzetKart}>
                  <div style={styles.yatirimOzetLabel}>Kâr / Zarar</div>
                  <div style={{ ...styles.yatirimOzetDeger, color: toplamKarZarar >= 0 ? '#4ecca3' : '#ff6b6b' }}>
                    {toplamKarZarar >= 0 ? '+' : ''}{formatTL(toplamKarZarar)}
                  </div>
                </div>
                <div style={styles.yatirimOzetKart}>
                  <div style={styles.yatirimOzetLabel}>Getiri %</div>
                  <div style={{ ...styles.yatirimOzetDeger, color: yatirimGetirisi >= 0 ? '#4ecca3' : '#ff6b6b' }}>
                    {yatirimGetirisi >= 0 ? '+' : ''}{yatirimGetirisi}%
                  </div>
                </div>
              </div>

              {yatirimGrafikVerisi.length > 0 && (
                <>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '12px' }}>Türe göre dağılım (TL varlıklar)</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={yatirimGrafikVerisi} layout="vertical" barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
                      <XAxis type="number" tickFormatter={v => `₺${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} width={55} />
                      <Tooltip formatter={(v) => formatTL(v)} contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {yatirimGrafikVerisi.map((_, i) => (
                          <Cell key={i} fill={KATEGORI_RENK[i % KATEGORI_RENK.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}

              {/* Yatırım Detay Listesi */}
              <div style={{ marginTop: '16px' }}>
                {yatirimlar.map(y => {
                  if (y.para_birimi !== 'TRY') return null
                  const maliyet = parseFloat(y.miktar) * parseFloat(y.birim_maliyet)
                  const guncel = parseFloat(y.guncel_deger)
                  const kz = guncel - maliyet
                  const kzYuzde = maliyet > 0 ? ((kz / maliyet) * 100).toFixed(1) : 0
                  return (
                    <div key={y.id} style={styles.yatirimSatir}>
                      <div style={styles.yatirimAd}>{y.ad}</div>
                      <div style={styles.yatirimTur}>{y.tur}</div>
                      <div style={{ color: kz >= 0 ? '#4ecca3' : '#ff6b6b', fontSize: '13px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold' }}>{formatTL(guncel)}</div>
                        <div style={{ fontSize: '11px' }}>{kz >= 0 ? '+' : ''}{kzYuzde}%</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function OzetKart({ baslik, deger, renk, icon }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', borderTop: `3px solid ${renk}`, textAlign: 'center' }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ color: renk, fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>{deger}</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{baslik}</div>
    </div>
  )
}

const styles = {
  yukleniyor: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '80px' },
  aySecici: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '12px 20px', marginBottom: '24px'
  },
  aySeciciLabel: { color: 'rgba(255,255,255,0.6)', fontSize: '14px', whiteSpace: 'nowrap' },
  aySelect: {
    background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '14px', cursor: 'pointer'
  },
  aySeciciAlt: { color: 'rgba(255,255,255,0.3)', fontSize: '12px' },
  ozetGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '20px' },
  grafPanel: { background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px', marginBottom: '20px' },
  panelBaslik: { color: '#fff', fontSize: '15px', margin: '0 0 20px 0', fontWeight: '600' },
  bosGraf: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px', fontSize: '14px' },
  altGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  tooltip: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px' },
  tooltipBaslik: { color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '6px' },
  kategoriListe: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' },
  kategoriSatir: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  kategoriAd: { color: 'rgba(255,255,255,0.7)', fontSize: '13px' },
  kategoriSag: { display: 'flex', gap: '12px', alignItems: 'center' },
  kategoriTutar: { color: '#fff', fontSize: '13px', fontWeight: '500' },
  kategoriYuzde: { color: 'rgba(255,255,255,0.4)', fontSize: '12px', minWidth: '32px', textAlign: 'right' },
  yatirimOzetGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' },
  yatirimOzetKart: { background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px', textAlign: 'center' },
  yatirimOzetLabel: { color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '6px' },
  yatirimOzetDeger: { fontSize: '16px', fontWeight: 'bold' },
  yatirimSatir: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  yatirimAd: { color: '#fff', fontSize: '13px', fontWeight: '500', flex: 1 },
  yatirimTur: { color: 'rgba(255,255,255,0.4)', fontSize: '11px', minWidth: '50px' },
}

export default Raporlar
