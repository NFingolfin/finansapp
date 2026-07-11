import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useLang } from './LangContext'
import { kesimTarihiHesapla, sonOdemeHesapla, tarihStr, borcAdiOlustur } from './kkutils'
import { CreditCard, CalendarDays, CalendarCheck, Clock3, BarChart3, Plus, FileText, Landmark } from 'lucide-react'

function Borclar({ session, mobil, gizliMod }) {
  const { t } = useLang()
  const pm = (val, opts = { minimumFractionDigits: 2, maximumFractionDigits: 2 }) =>
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
  const [raporAcik, setRaporAcik] = useState(false)
  const [raporOffset, setRaporOffset] = useState(0)
  const [buAyOdenen, setBuAyOdenen] = useState(0)
const [yeni, setYeni] = useState({
  ad: '', tur: 'İhtiyaç Kredisi', toplam_borc: '', kalan_borc: '',
  minimum_odeme: '', son_odeme_tarihi: '', faiz_orani: '', banka: '', notlar: '',
  taksitli: false, taksit_sayisi: '', aylik_taksit: ''
})

  const turler = [ 'İhtiyaç Kredisi', 'Konut Kredisi', 'Taşıt Kredisi', 'Diğer']
  const localTarihStr = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const aySinirlari = (ayOffset = 0) => {
  const bugun = new Date()
  const baslangic = new Date(bugun.getFullYear(), bugun.getMonth() + ayOffset, 1)
  const sonrakiAyBaslangic = new Date(bugun.getFullYear(), bugun.getMonth() + ayOffset + 1, 1)

  return {
    basStr: localTarihStr(baslangic),
    sonrakiBasStr: localTarihStr(sonrakiAyBaslangic)
  }
}

const tarihAyIcindeMi = (tarih, ayOffset = 0) => {
  if (!tarih) return false

  const { basStr, sonrakiBasStr } = aySinirlari(ayOffset)

  return tarih >= basStr && tarih < sonrakiBasStr
}

const borcOdemeTutari = (borc) => {
  const kalanBorc = parseFloat(borc.kalan_borc || 0)
  const aylikTutar = parseFloat(
    borc.minimum_odeme ||
    borc.aylik_taksit ||
    kalanBorc ||
    0
  )

  if (kalanBorc <= 0) return 0
  if (aylikTutar <= 0) return kalanBorc

  return Math.min(aylikTutar, kalanBorc)
}

useEffect(() => {
  borclariGetir()
  kkHesaplariGetir()
  hesaplariGetir()
  buAyOdemeleriGetir()
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
      .select('id, ad, tur, bakiye, para_birimi')
      .eq('user_id', session.user.id)
    if (data) {
      const odemeHesaplari = data.filter(h => h.tur !== 'Borç' && !h.tur?.toLowerCase().includes('kredi'))
      setHesaplar(odemeHesaplari)
      if (odemeHesaplari.length > 0) setOdemeHesapId(odemeHesaplari[0].id)
    }
  }
  const buAyOdemeleriGetir = async () => {
  const { basStr, sonrakiBasStr } = aySinirlari(0)

  const { data, error } = await supabase
    .from('islemler')
    .select('tutar')
    .eq('user_id', session.user.id)
    .eq('tur', 'gider')
    .eq('kategori', 'Borç Ödemesi')
    .gte('tarih', basStr)
    .lt('tarih', sonrakiBasStr)

  if (!error && data) {
    const toplam = data.reduce(
      (sum, islem) => sum + parseFloat(islem.tutar || 0),
      0
    )

    setBuAyOdenen(toplam)
  }
}

  const aylikTaksitHesapla = (toplam, sayi) => {
    if (!toplam || !sayi || sayi <= 0) return ''
    return (parseFloat(toplam) / parseInt(sayi)).toFixed(2)
  }

  const borcEkle = async () => {

      if (yeni.tur === 'Kredi Kartı') {
    alert('Kredi kartı harcamalarını İşlemler ekranından eklemelisin.')
    return
  }
  if (yeni.tur === 'Kredi Kartı') {
    if (!yeni.banka || !yeni.toplam_borc) return
    setKaydediliyor(true)

    const kkHesap = kkHesaplar.find(h => h.ad === yeni.banka)
    if (!kkHesap) { setKaydediliyor(false); return }

    const kesimGunu = kkHesap.kesim_gunu || 1
    const kesimTarihi = kesimTarihiHesapla(new Date(), kesimGunu)
    const sonOdeme = sonOdemeHesapla(kesimTarihi)
    const sonOdemeStr = tarihStr(sonOdeme)

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
        taksitli: true, son_odeme_tarihi: sonOdemeStr,
        aktif: true, odenen_tutar: 0
      })
    } else {
      const borcAdi = borcAdiOlustur(yeni.banka, sonOdeme)
      const { data: mevcutBorc } = await supabase.from('borclar').select('*')
        .eq('user_id', session.user.id).eq('banka', yeni.banka)
        .eq('son_odeme_tarihi', sonOdemeStr).eq('taksitli', false).eq('aktif', true).maybeSingle()

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
          taksitli: false, son_odeme_tarihi: sonOdemeStr,
          aktif: true, odenen_tutar: 0, aylik_taksit: 0
        })
      }
    }

    setFormAcik(false)
    setYeni({ ad: '', tur: 'İhtiyaç Kredisi', toplam_borc: '', kalan_borc: '', minimum_odeme: '', son_odeme_tarihi: '', faiz_orani: '', banka: '', notlar: '', taksitli: false, taksit_sayisi: '' })
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
      setYeni({ ad: '', tur: 'İhtiyaç Kredisi', toplam_borc: '', kalan_borc: '', minimum_odeme: '', son_odeme_tarihi: '', faiz_orani: '', banka: '', notlar: '', taksitli: false, taksit_sayisi: '', aylik_taksit: '' })
      borclariGetir()
    }
    setKaydediliyor(false)
  }

const odemeYap = async (borc) => {
  if (kaydediliyor) return
  setKaydediliyor(true)
  const tutar = parseFloat(odemeFormTutar)
  if (!tutar || tutar <= 0) { setKaydediliyor(false); return }
  if (!odemeHesapId) { setKaydediliyor(false); return }

  if (borc._grup) {
    // 1. Bakiyeleri EN BAŞTA oku (herhangi bir yazma işleminden önce)
    const { data: kaynakVeri } = await supabase.from('hesaplar').select('bakiye').eq('id', odemeHesapId).maybeSingle()
    const kaynakBakiye = parseFloat(kaynakVeri?.bakiye || 0)

    const kartBanka = borc._kartBorclar?.[0]?.banka
    const kkHesap = kkHesaplar.find(h => h.ad === kartBanka)
    let kkBakiye = null
    if (kkHesap) {
      const { data: kkVeri } = await supabase.from('hesaplar').select('bakiye').eq('id', kkHesap.id).maybeSingle()
      kkBakiye = parseFloat(kkVeri?.bakiye || 0)
    }

    // 2. Borçları güncelle
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

    // 3. Kaynak bankaya gider işlemi (silinince trigger otomatik geri alır)
await supabase.from('islemler').insert({
  user_id: session.user.id,
  hesap_id: odemeHesapId,
  tarih: new Date().toISOString().split('T')[0],
  tutar: tutar,
  tur: 'gider',
  kategori: 'Borç Ödemesi',
  aciklama: `${borc.ad} — aylık ödeme`,
  is_borc_odeme: true,
  borc_id: null
})

    // KK hesabına gelir işlemi (silinince trigger otomatik geri alır)
    if (kkHesap) {
// KK hesabına gelir işlemi
if (kkHesap) {
  await supabase.from('islemler').insert({
    user_id: session.user.id,
    hesap_id: kkHesap.id,
    tarih: new Date().toISOString().split('T')[0],
    tutar: tutar,
    tur: 'gelir',
    kategori: 'Borç Ödemesi',
    aciklama: `${borc.ad} — ödeme alındı`,
    is_borc_odeme: false,
    borc_id: borc.id
  })
}
    }

    // 4. Bakiyeleri manuel güncelle (trigger yoksa çalışır, varsa aynı değeri yazar)
    await supabase.from('hesaplar').update({ bakiye: kaynakBakiye - tutar }).eq('id', odemeHesapId)
    if (kkHesap && kkBakiye !== null) {
      await supabase.from('hesaplar').update({ bakiye: kkBakiye + tutar }).eq('id', kkHesap.id)
    }

    setOdemeFormAcik(null)
    setOdemeFormTutar('')
    borclariGetir()
    hesaplariGetir()
    buAyOdemeleriGetir()
    setKaydediliyor(false)
    return
  }

  // Tekil ödeme
  // 1. Bakiyeleri EN BAŞTA oku
  const { data: kaynakVeriTekil } = await supabase.from('hesaplar').select('bakiye').eq('id', odemeHesapId).maybeSingle()
  const kaynakBakiyeTekil = parseFloat(kaynakVeriTekil?.bakiye || 0)

  let kkHesapTekil = null
  let kkBakiyeTekil = null
  if (borc.tur === 'Kredi Kartı' && borc.banka) {
    kkHesapTekil = kkHesaplar.find(h => h.ad === borc.banka)
    if (kkHesapTekil) {
      const { data: kkVeriTekil } = await supabase.from('hesaplar').select('bakiye').eq('id', kkHesapTekil.id).maybeSingle()
      kkBakiyeTekil = parseFloat(kkVeriTekil?.bakiye || 0)
    }
  }

  // 2. Borcu güncelle
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

  // 3. Kaynak bankaya gider işlemi (silinince trigger otomatik geri alır)
await supabase.from('islemler').insert({
  user_id: session.user.id,
  hesap_id: odemeHesapId,
  tarih: new Date().toISOString().split('T')[0],
  tutar: tutar,
  tur: 'gider',
  kategori: 'Borç Ödemesi',
  aciklama: `${borc.ad} — aylık ödeme`,
  is_borc_odeme: true,
  borc_id: null
})

  // KK borcuysa KK hesabına gelir işlemi (silinince trigger otomatik geri alır)
  if (kkHesapTekil) {
// KK borcuysa KK hesabına gelir işlemi
if (kkHesapTekil) {
  await supabase.from('islemler').insert({
    user_id: session.user.id,
    hesap_id: kkHesapTekil.id,
    tarih: new Date().toISOString().split('T')[0],
    tutar: tutar,
    tur: 'gelir',
    kategori: 'Borç Ödemesi',
    aciklama: `${borc.ad} — ödeme alındı`,
    is_borc_odeme: false,
    borc_id: borc.id
  })
}
  }

  // 4. Bakiyeleri manuel güncelle (trigger yoksa çalışır, varsa aynı değeri yazar)
  await supabase.from('hesaplar').update({ bakiye: kaynakBakiyeTekil - tutar }).eq('id', odemeHesapId)
  if (kkHesapTekil && kkBakiyeTekil !== null) {
    await supabase.from('hesaplar').update({ bakiye: kkBakiyeTekil + tutar }).eq('id', kkHesapTekil.id)
  }

  setOdemeFormAcik(null)
  setOdemeFormTutar('')
  borclariGetir()
  hesaplariGetir()
  buAyOdemeleriGetir()
  setKaydediliyor(false)
}

  const borcKapat = async (id) => {
    if (!window.confirm('Bu borcu kapatılmış olarak işaretlemek istiyor musun?')) return
    await supabase.from('borclar').update({ aktif: false }).eq('id', id)
    borclariGetir()
  }

  const borcSil = async (id) => {
  const borc = borclar.find(b => b.id === id)

  if (!borc) return

  if (borc.tur === 'Kredi Kartı') {
    alert('Kredi kartı borçları Borçlar ekranından silinmez. İlgili harcamayı İşlemler ekranından silmelisin.')
    return
  }

  if (!window.confirm('Bu borcu silmek istediğine emin misin? Bu işlem sadece borç kaydını siler, geçmiş ödeme işlemlerini silmez.')) return

  await supabase
    .from('borclar')
    .delete()
    .eq('id', id)

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

const toplamKalan = borclar.reduce(
  (a, b) => a + parseFloat(b.kalan_borc || 0),
  0
)

const buAyOdenecek = borclar
  .filter(b => tarihAyIcindeMi(b.son_odeme_tarihi, 0))
  .reduce((a, b) => a + borcOdemeTutari(b), 0)

const gelecekAyOdenecek = borclar
  .filter(b => tarihAyIcindeMi(b.son_odeme_tarihi, 1))
  .reduce((a, b) => a + borcOdemeTutari(b), 0)

const kritikBorclar = borclar.filter(b => {
  if (!b.son_odeme_tarihi) return false
  const fark = Math.ceil((new Date(b.son_odeme_tarihi) - bugun) / (1000 * 60 * 60 * 24))
  return fark <= 7 && fark >= 0
}).length

  const gunFarki = (tarih) => {
    if (!tarih) return null
    return Math.ceil((new Date(tarih) - bugun) / (1000 * 60 * 60 * 24))
  }
  const odemeRengi = (tarih) => {
    const f = gunFarki(tarih)
    if (f === null) return '#94a3b8'
    if (f < 0) return '#ef4444'
    if (f <= 3) return '#ef4444'
    if (f <= 7) return 'var(--warning)'
    return '#285b70'
  }
  const odemeLabel = (tarih) => {
    const f = gunFarki(tarih)
    if (f === null) return '—'
    if (f < 0) return `${Math.abs(f)} gün geçti!`
    if (f === 0) return 'Bugün!'
    if (f === 1) return 'Yarın!'
    return `${f} gün kaldı`
  }

  const raporAylariOlustur = () => {
    const today = new Date()
    const aylar = []
    for (let i = 0; i < 13; i++) {
      aylar.push(new Date(today.getFullYear(), today.getMonth() + raporOffset + i, 1))
    }
    return aylar
  }

  const aylikBorcOdeme = (borc, ay) => {
    if (!borc.son_odeme_tarihi || parseFloat(borc.kalan_borc) <= 0) return 0
    const odemeD = new Date(borc.son_odeme_tarihi)
    const targetD = new Date(ay.getFullYear(), ay.getMonth(), 1)
    const odemeBaslangic = new Date(odemeD.getFullYear(), odemeD.getMonth(), 1)
    if (borc.taksitli) {
      const diff = (targetD.getFullYear() - odemeBaslangic.getFullYear()) * 12 +
                   (targetD.getMonth() - odemeBaslangic.getMonth())
      const kalan = (borc.taksit_sayisi || 1) - (borc.odenen_taksit || 0)
      if (diff >= 0 && diff < kalan) return parseFloat(borc.aylik_taksit || 0)
    } else {
      if (targetD.getTime() === odemeBaslangic.getTime()) {
        return parseFloat(borc.minimum_odeme || borc.aylik_taksit || borc.kalan_borc || 0)
      }
    }
    return 0
  }

  const raporKolonlariOlustur = () => {
    const kolonlar = []
    const kkBankalar = {}
    borclar.filter(b => b.tur === 'Kredi Kartı').forEach(b => {
      const key = b.banka || b.ad
      if (!kkBankalar[key]) kkBankalar[key] = { label: key, borclar: [] }
      kkBankalar[key].borclar.push(b)
    })
    Object.values(kkBankalar).forEach(g => kolonlar.push(g))
    borclar.filter(b => b.tur !== 'Kredi Kartı').forEach(b => {
      kolonlar.push({ label: `${b.ad}${b.banka ? ` (${b.banka})` : ''}`, borclar: [b] })
    })
    return kolonlar
  }

  return (
    <div>
      {/* Üst Özet */}
      <div style={{ ...styles.ozetGrid, gridTemplateColumns: mobil ? 'repeat(2,1fr)' : 'repeat(4,1fr)' }}>
        <div style={styles.ozetKart}>
          <div style={styles.ozetIcon}><CreditCard size={20} /></div>
          <div style={styles.ozetLabel}>Toplam Kalan Borç</div>
          <div style={styles.ozetDeger}>₺{pm(toplamKalan)}</div>
        </div>
<div style={styles.ozetKart}>
  <div style={styles.ozetIcon}><CalendarDays size={20} /></div>
  <div style={styles.ozetLabel}>Gelecek Ay Ödenecek</div>
  <div style={styles.ozetDeger}>
    ₺{pm(gelecekAyOdenecek)}
  </div>
</div>

<div style={{ ...styles.ozetKart, ...styles.netKart }}>
  <div style={{ ...styles.ozetIcon, ...styles.netIcon }}><CalendarCheck size={20} /></div>

  <div style={styles.ozetCiftSatir}>
    <div>
      <div style={{ ...styles.ozetDegerKucuk, color: '#fff' }}>
        ₺{pm(buAyOdenecek)}
      </div>
      <div style={{ ...styles.ozetLabel, color: 'rgba(255,255,255,.76)' }}>Bu Ay Ödenecek</div>
    </div>

    <div style={styles.ozetAyirici} />

    <div>
      <div style={{ ...styles.ozetDegerKucuk, color: '#fff' }}>
        ₺{pm(buAyOdenen)}
      </div>
      <div style={{ ...styles.ozetLabel, color: 'rgba(255,255,255,.76)' }}>Bu Ay Ödenen</div>
    </div>
  </div>
</div>
        <div style={styles.ozetKart}>
          <div style={{ ...styles.ozetIcon, color: kritikBorclar > 0 ? 'var(--danger)' : '#285b70' }}><Clock3 size={20} /></div>
          <div style={styles.ozetLabel}>7 Günde Vadesi Gelen</div>
          <div style={{ ...styles.ozetDeger, color: kritikBorclar > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{kritikBorclar}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.filtreler}>
          <button style={filtre === 'hepsi' ? { ...styles.filtreBtn, ...styles.filtreBtnAktif } : styles.filtreBtn}
            onClick={() => setFiltre('hepsi')}>Tümü ({borclar.length})</button>
          <button style={filtre === 'kredi' ? { ...styles.filtreBtn, ...styles.filtreBtnAktif } : styles.filtreBtn}
            onClick={() => setFiltre('kredi')}><CreditCard size={15} /> Kredi Kartları ({Object.keys(gruplar).length})</button>
          <button style={filtre === 'diger' ? { ...styles.filtreBtn, ...styles.filtreBtnAktif } : styles.filtreBtn}
            onClick={() => setFiltre('diger')}><FileText size={15} /> Diğer ({diger.length})</button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={styles.raporBtn} onClick={() => setRaporAcik(true)}><BarChart3 size={16} /> Mali Tablo</button>
          <button style={styles.ekleBtn} onClick={() => setFormAcik(true)}><Plus size={17} /> Kredi / Borç Ekle</button>
        </div>
      </div>

      {/* Mali Tablo Rapor Modal */}
      {raporAcik && (() => {
        const aylar = raporAylariOlustur()
        const kolonlar = raporKolonlariOlustur()
        const bugunBaslangic = new Date(bugun.getFullYear(), bugun.getMonth(), 1)
        return (
          <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setRaporAcik(false)}>
            <div style={{ ...styles.modal, width: mobil ? '99vw' : '94vw', maxWidth: '1400px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ ...styles.modalBaslik, margin: 0 }}>Mali Tablo — Ödeme Takvimi</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button style={styles.navBtn} onClick={() => setRaporOffset(p => p - 6)}>◀ -6 Ay</button>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    {aylar[0].toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })} — {aylar[aylar.length - 1].toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })}
                  </span>
                  <button style={styles.navBtn} onClick={() => setRaporOffset(p => p + 6)}>+6 Ay ▶</button>
                  {raporOffset !== 0 && (
                    <button style={{ ...styles.navBtn, color: '#285b70', border: '1px solid #b9cbd4' }} onClick={() => setRaporOffset(0)}>Bugüne Dön</button>
                  )}
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', padding: '4px 8px', lineHeight: 1 }} onClick={() => setRaporAcik(false)}>✕</button>
                </div>
              </div>
              <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${180 + kolonlar.length * 140 + 130}px` }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-card)' }}>
                      <th style={styles.thAy}>Ay</th>
                      {kolonlar.map(k => (
                        <th key={k.label} style={styles.thKolon} title={k.label}>
                          {k.label.length > 18 ? k.label.substring(0, 16) + '…' : k.label}
                        </th>
                      ))}
                      <th style={{ ...styles.thKolon, color: 'var(--text-primary)', borderLeft: '2px solid var(--border)' }}>Toplam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aylar.map(ay => {
                      const ayBaslangic = new Date(ay.getFullYear(), ay.getMonth(), 1)
                      const isCurrentMonth = ayBaslangic.getTime() === bugunBaslangic.getTime()
                      const isPast = ayBaslangic < bugunBaslangic
                      let rowTotal = 0
                      const cells = kolonlar.map(k => {
                        const amount = k.borclar.reduce((s, b) => s + aylikBorcOdeme(b, ay), 0)
                        rowTotal += amount
                        return { key: k.label, amount }
                      })
                      return (
                        <tr key={ay.toISOString()} style={{
                          background: isCurrentMonth ? 'rgba(40,91,112,.06)' : 'transparent',
                          borderLeft: isCurrentMonth ? '3px solid #396f82' : '3px solid transparent'
                        }}>
                          <td style={{ ...styles.tdAy, color: isCurrentMonth ? '#285b70' : isPast ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: isCurrentMonth ? '700' : '400' }}>
                            {ay.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                            {isCurrentMonth && <span style={{ fontSize: '10px', marginLeft: '6px', background: '#285b70', color: '#fff', borderRadius: '4px', padding: '1px 5px' }}>Bu ay</span>}
                          </td>
                          {cells.map(c => (
                            <td key={c.key} style={{ ...styles.tdTutar, color: isPast ? 'var(--text-muted)' : c.amount > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {c.amount > 0 ? `₺${c.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                            </td>
                          ))}
                          <td style={{ ...styles.tdTutar, fontWeight: '700', color: isPast ? 'var(--text-muted)' : rowTotal > 0 ? 'var(--text-primary)' : 'var(--text-muted)', borderLeft: '2px solid var(--border)' }}>
                            {rowTotal > 0 ? `₺${rowTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                    <tr style={{ borderTop: '2px solid var(--border)', background: 'rgba(0,0,0,0.03)' }}>
                      <td style={{ ...styles.tdAy, fontWeight: '700', color: 'var(--text-primary)' }}>Toplam</td>
                      {kolonlar.map(k => {
                        const total = aylar.reduce((sum, ay) => sum + k.borclar.reduce((s, b) => s + aylikBorcOdeme(b, ay), 0), 0)
                        return (
                          <td key={k.label} style={{ ...styles.tdTutar, fontWeight: '700', color: total > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {total > 0 ? `₺${total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </td>
                        )
                      })}
                      <td style={{ ...styles.tdTutar, fontWeight: '700', color: 'var(--text-primary)', borderLeft: '2px solid var(--border)' }}>
                        ₺{kolonlar.reduce((sum, k) => sum + aylar.reduce((s, ay) => s + k.borclar.reduce((bs, b) => bs + aylikBorcOdeme(b, ay), 0), 0), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {kolonlar.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Aktif borç bulunamadı.</p>
              )}
            </div>
          </div>
        )
      })()}

      {/* Ödeme Formu Modal */}
      {odemeFormAcik && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, width: mobil ? '95vw' : '360px' }}>
            <h3 style={styles.modalBaslik}>Ödeme Yap</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
              {odemeFormAcik.ad} — Kalan: ₺{parseFloat(odemeFormAcik.kalan_borc).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>

            {odemeFormAcik.taksitli && (
              <div style={styles.taksitBilgi}>
                💡 Aylık taksit tutarı: <strong>₺{parseFloat(odemeFormAcik.aylik_taksit).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
            )}
            <label style={styles.label}>Hangi Hesaptan?</label>
            <select
             style={styles.input}
                value={odemeHesapId}
                 onChange={e => setOdemeHesapId(e.target.value)}
>
                      {hesaplar.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.ad} {!gizliMod ? `(${parseFloat(h.bakiye || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${h.para_birimi || '₺'})` : ''}
                        </option>
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
                {kaydediliyor ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Borç Ekle Formu */}
{formAcik && (
  <div style={styles.modalOverlay}>
    <div style={styles.modal}>
      <h3 style={styles.modalBaslik}>Yeni Kredi / Borç Ekle</h3>

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
            <div style={{ ...styles.toggle, background: yeni.taksitli ? '#396f82' : 'var(--border)' }}
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
                  💡 Aylık taksit: <strong>₺{(parseFloat(yeni.toplam_borc) / parseInt(yeni.taksit_sayisi)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
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

          <label style={styles.label}>Toplam Borç (₺)</label>
          <input style={styles.input} type="number" placeholder="0.00"
            value={yeni.toplam_borc} onChange={e => setYeni({ ...yeni, toplam_borc: e.target.value, kalan_borc: e.target.value })} />

          <div style={styles.toggleSatir}>
            <span style={styles.toggleLabel}>Taksitli mi?</span>
            <div style={{ ...styles.toggle, background: yeni.taksitli ? '#396f82' : 'var(--border)' }}
              onClick={() => setYeni({ ...yeni, taksitli: !yeni.taksitli, taksit_sayisi: '', minimum_odeme: '' })}>
              <div style={{ ...styles.toggleTop, transform: yeni.taksitli ? 'translateX(20px)' : 'translateX(0)' }} />
            </div>
          </div>

          {yeni.taksitli ? (
            <>
              <label style={styles.label}>Taksit Sayısı</label>
              <input style={styles.input} type="number" placeholder="örn. 12, 24, 36"
                value={yeni.taksit_sayisi}
                onChange={e => setYeni({ ...yeni, taksit_sayisi: e.target.value })} />

              {yeni.toplam_borc && yeni.taksit_sayisi && parseInt(yeni.taksit_sayisi) > 0 && (
                <div style={styles.taksitBilgi}>
                  💡 Aylık taksit: <strong>₺{(parseFloat(yeni.toplam_borc) / parseInt(yeni.taksit_sayisi)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  {' · '}{yeni.taksit_sayisi} ay
                </div>
              )}

              <div style={styles.ikiliBolum}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>İlk Ödeme Tarihi</label>
                  <input style={styles.input} type="date"
                    value={yeni.son_odeme_tarihi} onChange={e => setYeni({ ...yeni, son_odeme_tarihi: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Faiz Oranı (%)</label>
                  <input style={styles.input} type="number" placeholder="0.00"
                    value={yeni.faiz_orani} onChange={e => setYeni({ ...yeni, faiz_orani: e.target.value })} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={styles.ikiliBolum}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Kalan Borç (₺)</label>
                  <input style={styles.input} type="number" placeholder="0.00"
                    value={yeni.kalan_borc} onChange={e => setYeni({ ...yeni, kalan_borc: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Min. Ödeme (₺)</label>
                  <input style={styles.input} type="number" placeholder="0.00"
                    value={yeni.minimum_odeme} onChange={e => setYeni({ ...yeni, minimum_odeme: e.target.value })} />
                </div>
              </div>

              <div style={styles.ikiliBolum}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Faiz Oranı (%)</label>
                  <input style={styles.input} type="number" placeholder="0.00"
                    value={yeni.faiz_orani} onChange={e => setYeni({ ...yeni, faiz_orani: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Son Ödeme Tarihi</label>
                  <input style={styles.input} type="date"
                    value={yeni.son_odeme_tarihi} onChange={e => setYeni({ ...yeni, son_odeme_tarihi: e.target.value })} />
                </div>
              </div>
            </>
          )}

          <label style={styles.label}>Notlar (isteğe bağlı)</label>
          <input style={styles.input} placeholder="örn. otomatik ödeme aktif, değişken faizli"
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
          <div style={{ color: 'var(--success)', marginBottom: '16px' }}><CalendarCheck size={38} /></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Hiç borcun yok, harika!</p>
        </div>
      ) : (
        <div style={styles.liste}>

{/* Kredi Kartı Grupları */}
{(filtre === 'hepsi' || filtre === 'kredi') && Object.entries(gruplar).map(([kartAdi, kartBorclar]) => {
const toplamKalanKart = kartBorclar.reduce(
  (a, b) => a + parseFloat(b.kalan_borc || 0),
  0
)

// Bu ay ödenecek kart borcu:
// son ödeme tarihi bu takvim ayının içinde olan borç satırlarıdır.
// Gelecek ayın ekstresi bu rakama dahil edilmez.
const buAyKartBorclari = kartBorclar.filter(
  b => tarihAyIcindeMi(b.son_odeme_tarihi, 0)
)

const buAyKart = buAyKartBorclari.reduce(
  (a, b) => a + borcOdemeTutari(b),
  0
)
  const enYakinTarih = kartBorclar.filter(b => b.son_odeme_tarihi).sort((a, b) => new Date(a.son_odeme_tarihi) - new Date(b.son_odeme_tarihi))[0]?.son_odeme_tarihi
  const renk = odemeRengi(enYakinTarih)
  const acik = acikGruplar[kartAdi] || false

  return (
    <div key={kartAdi} style={styles.grupKart}>
      {/* Kart Başlığı — tıklanınca açılır */}
      <div style={{ ...styles.grupBaslik, cursor: 'pointer' }}
        onClick={() => setAcikGruplar(prev => ({ ...prev, [kartAdi]: !acik }))}>
        <div style={styles.grupSol}>
          <span style={styles.kartIkon}><CreditCard size={24} /></span>
          <div>
            <div style={styles.grupAd}>{kartAdi}</div>
            <div style={styles.grupAlt}>{kartBorclar.length} işlem · {acik ? '▲ Kapat' : '▼ Detaylar'}</div>
          </div>
        </div>
        <div style={styles.grupSag}>
          {enYakinTarih && (
            <div style={{ ...styles.vadeBadge, background: renk + '22', color: renk, border: `1px solid ${renk}44` }}>
              {odemeLabel(enYakinTarih)}
            </div>
          )}
        </div>
      </div>

      {/* Kart Özet — her zaman görünür */}
      <div style={{ ...styles.grupOzet, flexWrap: mobil ? 'wrap' : 'nowrap', gap: mobil ? '12px' : '32px' }}>
        <div style={styles.grupOzetKutu}>
          <div style={styles.tutarLabel}>Toplam Kalan Borç</div>
          <div style={styles.tutarDeger}>₺{pm(toplamKalanKart)}</div>
        </div>
        <div style={styles.grupOzetKutu}>
          <div style={styles.tutarLabel}>Bu Ay Ödenecek</div>
          <div style={styles.tutarDeger}>₺{pm(buAyKart)}
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
  {buAyKart > 0 ? (
    <button
      style={styles.toplamOdemeBtn}
      onClick={(e) => {
        e.stopPropagation()

        setOdemeFormAcik({
          id: 'grup_' + kartAdi,
          ad: kartAdi + ' — Bu Dönem Borcu',
          kalan_borc: buAyKart,
          minimum_odeme: buAyKart,
          taksitli: false,
          _grup: true,
          _kartBorclar: buAyKartBorclari
        })

        setOdemeFormTutar(buAyKart.toString())
      }}
    >
      Bu Ayı Öde (₺{buAyKart.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
    </button>
  ) : (
    <span style={styles.odemeYokEtiket}>Bu ay ödeme yok</span>
  )}
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
                {borc.notlar && <div style={styles.altBorcNot}>{borc.notlar}</div>}
                {borc.taksitli && (
                  <div style={styles.altBorcNot}>
                    Aylık: ₺{parseFloat(borc.aylik_taksit).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · 
                    Kalan: {borc.taksit_sayisi - (borc.odenen_taksit || 0)} taksit
                  </div>
                )}
              </div>
              <div style={styles.altBorcSag}>
                <div style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '15px' }}>
                  ₺{pm(borc.kalan_borc)}
                </div>
                {borc.taksitli && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    aylık ₺{pm(borc.aylik_taksit)}
                  </div>
                )}
              </div>
                <div style={styles.altBorcBtnler}>
                       <button
                           style={styles.odemeBtn}
                            onClick={() => {
                               setOdemeFormAcik(borc)
                                    setOdemeFormTutar('')
                                                     }}
  >
 Ödeme
  </button>

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
              <div key={borc.id} style={styles.borcKart}>
                <div style={styles.borcUst}>
                  <div style={styles.borcSolUst}>
                    <span style={styles.kartIkon}><Landmark size={24} /></span>
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
                        {odemeLabel(borc.son_odeme_tarihi)}
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.tutarlar}>
                  <div style={styles.tutarKutu}>
                    <div style={styles.tutarLabel}>Kalan Borç</div>
                    <div style={styles.tutarDeger}>₺{pm(borc.kalan_borc)}</div>
                  </div>
                  {borc.toplam_borc > 0 && (
                    <div style={styles.tutarKutu}>
                      <div style={styles.tutarLabel}>Toplam Borç</div>
                      <div style={styles.tutarDeger}>₺{pm(borc.toplam_borc)}</div>
                    </div>
                  )}
                  <div style={styles.tutarKutu}>
                    <div style={styles.tutarLabel}>{borc.taksitli ? 'Aylık Taksit' : 'Min. Ödeme'}</div>
                    <div style={styles.tutarDeger}>
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

                {borc.notlar && <div style={styles.notlar}>{borc.notlar}</div>}

                <div style={styles.borcBtnler}>
                  <button style={styles.odemeBtn} onClick={() => { setOdemeFormAcik(borc); setOdemeFormTutar('') }}>
                    Ödeme Yap
                  </button>
                  <button style={styles.kapatBtn} onClick={() => borcKapat(borc.id)}>Kapat</button>
                  <button style={styles.silBtn} onClick={() => borcSil(borc.id)}>Sil</button>
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
  ozetKart: { background: 'var(--bg-card)', borderRadius: '14px', padding: '20px', textAlign: 'left', boxShadow: 'none', border: '1px solid var(--border)', minHeight: '132px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  netKart: { background: 'linear-gradient(135deg,#6faeb3 0%,#2d6482 100%)', border: 'none', boxShadow: '0 10px 24px rgba(45,100,130,.18)' },
  ozetIcon: { width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', color: '#285b70', background: 'var(--surface-soft)', border: '1px solid var(--border)' },
  netIcon: { background: 'rgba(255,255,255,.94)', border: 'none', color: '#285b70' },
  ozetDeger: { fontSize: '22px', fontWeight: '750', marginTop: '7px', letterSpacing: '-.02em' },
ozetCiftSatir: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '18px', marginTop: '9px' },
ozetDegerKucuk: { fontSize: '15px', fontWeight: 'bold', marginBottom: '4px' },
ozetAyirici: { width: '1px', height: '34px', background: 'rgba(255,255,255,.28)' },
ozetLabel: { color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '550' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', padding: '0 10px', minHeight: '64px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', flexWrap: 'wrap', gap: '12px', boxShadow: 'none' },
  filtreler: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  filtreBtn: { minHeight: '62px', padding: '0 14px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', borderRadius: '0', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px' },
  filtreBtnAktif: { background: 'transparent', borderBottom: '2px solid #2f667a', color: '#244f69', fontWeight: '650' },
  ekleBtn: { height: '40px', padding: '0 16px', background: '#234f68', border: 'none', borderRadius: '9px', color: '#fff', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' },
  raporBtn: { height: '40px', padding: '0 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '9px', color: '#285b70', fontWeight: '600', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '7px' },
  navBtn: { padding: '6px 12px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' },
  thAy: { padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', borderBottom: '2px solid var(--border)', minWidth: '160px', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 5 },
  thKolon: { padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', borderBottom: '2px solid var(--border)', minWidth: '130px', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 5 },
  tdAy: { padding: '10px 14px', whiteSpace: 'nowrap', fontSize: '13px', borderBottom: '1px solid var(--border-light)' },
  tdTutar: { padding: '10px 12px', textAlign: 'right', fontSize: '13px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-light)' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.48)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '18px' },
  modal: { background: 'var(--surface)', borderRadius: '14px', padding: '24px', width: '480px', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 22px 60px rgba(15,23,42,.16)', boxSizing: 'border-box' },
  modalBaslik: { color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', margin: '0 0 20px 0', paddingBottom: '14px', borderBottom: '1px solid var(--border)' },
  toggleSatir: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' },
  toggleLabel: { color: '#475569', fontSize: '14px' },
  toggle: { width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' },
  toggleTop: { position: 'absolute', top: '2px', left: '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'transform 0.3s' },
  taksitBilgi: { background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '14px' },
  hizliButonlar: { display: 'flex', gap: '8px', marginBottom: '16px' },
  hizliBtn: { flex: 1, padding: '8px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' },
  ikiliBolum: { display: 'flex', gap: '12px' },
  label: { color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '550', display: 'block', marginBottom: '7px' },
  input: { width: '100%', minHeight: '42px', padding: '10px 12px', marginBottom: '14px', background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' },
  modalBtnler: { display: 'flex', gap: '12px', marginTop: '8px' },
  iptalBtn: { flex: 1, height: '42px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-secondary)', cursor: 'pointer' },
  kaydetBtn: { flex: 1, height: '42px', background: '#234f68', border: 'none', borderRadius: '9px', color: '#fff', fontWeight: '600', cursor: 'pointer' },
  yukleniyor: { color: 'var(--text-muted)', textAlign: 'center', padding: '48px' },
  bos: { textAlign: 'center', padding: '64px' },
  liste: { display: 'flex', flexDirection: 'column', gap: '16px' },
  grupKart: { background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'none' },
  grupBaslik: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '19px 22px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' },
  kartIkon: { width: '40px', height: '40px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-soft)', border: '1px solid var(--border)', color: '#285b70' },
  grupSol: { display: 'flex', alignItems: 'center', gap: '12px' },
  grupAd: { color: 'var(--text-primary)', fontSize: '15px', fontWeight: 'bold' },
  grupAlt: { color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' },
  grupSag: { display: 'flex', gap: '8px' },
  grupOzet: { display: 'flex', gap: '36px', padding: '17px 22px', background: 'var(--surface-soft)', borderBottom: '1px solid var(--border)' },
  grupOzetKutu: {},
  altBorclar: { padding: '10px 20px' },
  altBorcSatir: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-light)' },
  altBorcSol: { flex: 1 },
  altBorcAd: { color: 'var(--text-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
  altBorcNot: { color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' },
  altBorcSag: { textAlign: 'right', minWidth: '120px' },
  altBorcBtnler: { display: 'flex', gap: '6px' },
  odemeBtn: { padding: '7px 13px', background: 'var(--surface)', border: '1px solid #b9cbd4', borderRadius: '8px', color: '#285b70', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' },
  silBtnKucuk: { padding: '6px 10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '12px', cursor: 'pointer' },
  borcKart: { background: 'var(--bg-card)', borderRadius: '14px', padding: '22px', border: '1px solid var(--border)', boxShadow: 'none' },
  borcUst: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  borcSolUst: { display: 'flex', alignItems: 'center', gap: '12px' },
  borcAd: { color: 'var(--text-primary)', fontSize: '15px', fontWeight: 'bold' },
  borcBanka: { color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' },
  taksitTag: { background: 'var(--surface-soft)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', border: '1px solid var(--border)' },
  borcSagUst: { display: 'flex', gap: '8px', alignItems: 'center' },
  vadeBadge: { padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' },
  tutarlar: { display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' },
  tutarKutu: { minWidth: '100px' },
  tutarLabel: { color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' },
  tutarDeger: { color: 'var(--text-primary)', fontSize: '15px', fontWeight: 'bold' },
  ilerlemeContainer: { marginBottom: '16px' },
  ilerlemeUst: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  ilerlemeLabel: { color: 'var(--text-muted)', fontSize: '12px' },
  ilerlemeYuzde: { color: 'var(--text-muted)', fontSize: '12px' },
  ilerlemeBar: { height: '6px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' },
  ilerlemeDolu: { height: '100%', background: '#396f82', borderRadius: '3px' },
  notlar: { color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', padding: '10px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)' },
  borcBtnler: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  toplamOdemeBtn: { padding: '9px 16px', background: 'var(--surface)', border: '1px solid #b9cbd4', borderRadius: '9px', color: '#285b70', fontWeight: '650', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' },
  odemeYokEtiket: { display: 'inline-block', padding: '8px 12px', color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' },
  kapatBtn: { padding: '8px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' },
  silBtn: { padding: '8px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' },
}

export default Borclar
