import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import KategoriYonetimi from './KategoriYonetimi'
import { kesimTarihiHesapla, sonOdemeHesapla, tarihStr, borcAdiOlustur } from './kkutils'
import {
  ArrowUp, ArrowDown, Activity, CreditCard, Search, CalendarDays,
  SlidersHorizontal, Plus, ShoppingCart, Wallet, ArrowLeftRight,
  Trash2, ReceiptText, Pencil, Tags
} from 'lucide-react'

function Islemler({ session, mobil, gizliMod }) {
  const pm = (val, opts = { minimumFractionDigits: 2, maximumFractionDigits: 2 }) =>
    gizliMod ? '****' : parseFloat(val || 0).toLocaleString('tr-TR', opts)
  const [islemler, setIslemler] = useState([])
  const [hesaplar, setHesaplar] = useState([])
  const [kategorilerDB, setKategorilerDB] = useState([])
  const [kategoriYonetimiAcik, setKategoriYonetimiAcik] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [formAcik, setFormAcik] = useState(false)
  const [duzenlenenId, setDuzenlenenId] = useState(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [filtre, setFiltre] = useState('hepsi')
  const [aramaMetni, setAramaMetni] = useState('')
  const [siralamaAlani, setSiralamaAlani] = useState('tarih')
  const [siralamaYon, setSiralamaYon] = useState('desc')
  const [baslangicTarih, setBaslangicTarih] = useState('')
  const [bitisTarih, setBitisTarih] = useState('')
  const [seciliHesap, setSeciliHesap] = useState('')
  const [seciliAnaKategori, setSeciliAnaKategori] = useState('')
  const [seciliAltKategori, setSeciliAltKategori] = useState('')
  const [seciliDonem, setSeciliDonem] = useState(new Date().toISOString().slice(0, 7))
  const [filtreAcik, setFiltreAcik] = useState(false)
  const [yeni, setYeni] = useState({
    tarih: new Date().toISOString().split('T')[0],
    hesap_id: '',
    tutar: '',
    tur: 'gider',
    kategori: 'Zaruri',
    aciklama: '',
    taksitli: false,
    taksit_sayisi: '',
    kategori_id: '',
    ana_kategori_secim: ''
  })

  const turLabel = { gelir: 'Gelir', gider: 'Gider', transfer: 'Transfer', odeme: 'Ödeme' }

  useEffect(() => {
    islemleriGetir()
    hesaplariGetir()
    kategorileriGetir()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  try {
    const tutar = parseFloat(yeni.tutar)
    const seciliKategoriObj = kategorilerDB.find(k => k.id === yeni.kategori_id) || null
    const kategoriAlanlari = seciliKategoriObj ? {
      kategori_id: seciliKategoriObj.id,
      ana_kategori: seciliKategoriObj.ana_kategori,
      alt_kategori: seciliKategoriObj.alt_kategori || null,
      butce_grubu: seciliKategoriObj.butce_grubu || null
    } : { kategori_id: null, ana_kategori: null, alt_kategori: null, butce_grubu: null }

    if (duzenlenenId) {
      const mevcutIslem = islemler.find(i => i.id === duzenlenenId)
      const yetki = duzenlemeYetkisi(mevcutIslem)
      const guncelleme = {}
      const kategoriDegisti = (mevcutIslem?.kategori_id || '') !== (yeni.kategori_id || '')
      if (yetki.kategori && kategoriDegisti) Object.assign(guncelleme, kategoriAlanlari, {
        kategori: seciliKategoriObj?.tur === 'borc' ? 'Borç Ödemesi' : (seciliKategoriObj?.ana_kategori || null),
        is_borc_odeme: seciliKategoriObj?.tur === 'borc'
      })
      if (yetki.aciklama) guncelleme.aciklama = yeni.aciklama

      if (Object.keys(guncelleme).length === 0) {
        setFormAcik(false)
        setDuzenlenenId(null)
        return
      }

      const { error } = await supabase
        .from('islemler')
        .update(guncelleme)
        .eq('id', duzenlenenId)
        .eq('user_id', session.user.id)

      if (error) throw error
      setFormAcik(false)
      setDuzenlenenId(null)
      islemleriGetir()
      return
    }

    if (yeni.tur === 'transfer') {
      await supabase.from('islemler').insert({
        user_id: session.user.id,
        hesap_id: yeni.hesap_id,
        tarih: yeni.tarih,
        tutar,
        tur: 'gider',
        kategori: 'Hesaplar Arası Transfer',
        ...kategoriAlanlari,
        butce_grubu: 'Transfer',
        aciklama: yeni.aciklama || `Transfer → ${hesaplar.find(h => h.id === yeni.hedef_hesap_id)?.ad}`
      })

      await supabase.from('islemler').insert({
        user_id: session.user.id,
        hesap_id: yeni.hedef_hesap_id,
        tarih: yeni.tarih,
        tutar,
        tur: 'gelir',
        kategori: 'Hesaplar Arası Transfer',
        ...kategoriAlanlari,
        butce_grubu: 'Transfer',
        aciklama: yeni.aciklama || `Transfer ← ${hesaplar.find(h => h.id === yeni.hesap_id)?.ad}`
      })
    } else {
      const { data: yeniIslem, error: islemError } = await supabase
        .from('islemler')
        .insert({
          user_id: session.user.id,
          hesap_id: yeni.hesap_id,
          tarih: yeni.tarih,
          tutar,
          tur: yeni.tur,
          kategori: seciliKategoriObj?.tur === 'borc' ? 'Borç Ödemesi' : (seciliKategoriObj?.ana_kategori || null),
          ...kategoriAlanlari,
          aciklama: yeni.aciklama,
          is_borc_odeme: seciliKategoriObj?.tur === 'borc'
        })
        .select('id')
        .single()

      if (islemError) throw islemError

      if (yeni.tur === 'gider') {
        const seciliHesapObj = hesaplar.find(h => h.id === yeni.hesap_id)

        if (seciliHesapObj?.tur?.toLowerCase() === 'kredi kartı') {
          const kesimGunu = seciliHesapObj.kesim_gunu || 1
          const kesimTarihi = kesimTarihiHesapla(yeni.tarih, kesimGunu)
          const sonOdeme = sonOdemeHesapla(kesimTarihi)
          const sonOdemeStr = tarihStr(sonOdeme)
          const borcAdi = borcAdiOlustur(seciliHesapObj.ad, sonOdeme)

          let baglanacakBorcId = null

          if (yeni.taksitli && parseInt(yeni.taksit_sayisi) > 1) {
            const taksitSayisi = parseInt(yeni.taksit_sayisi)
            const aylikTaksit = tutar / taksitSayisi

            const { data: yeniBorc, error: borcError } = await supabase
              .from('borclar')
              .insert({
                user_id: session.user.id,
                ad: `${yeni.aciklama || seciliKategoriObj?.ana_kategori || 'Harcama'} (${taksitSayisi} taksit)`,
                tur: 'Kredi Kartı',
                banka: seciliHesapObj.ad,
                toplam_borc: tutar,
                kalan_borc: tutar,
                aylik_taksit: aylikTaksit,
                minimum_odeme: aylikTaksit,
                taksit_sayisi: taksitSayisi,
                odenen_taksit: 0,
                taksitli: true,
                son_odeme_tarihi: sonOdemeStr,
                aktif: true,
                odenen_tutar: 0
              })
              .select('id')
              .single()

            if (borcError) throw borcError

            baglanacakBorcId = yeniBorc?.id
          } else {
            const { data: mevcutBorc, error: mevcutBorcError } = await supabase
              .from('borclar')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('banka', seciliHesapObj.ad)
              .eq('son_odeme_tarihi', sonOdemeStr)
              .eq('taksitli', false)
              .eq('aktif', true)
              .maybeSingle()

            if (mevcutBorcError) throw mevcutBorcError

            if (mevcutBorc) {
              const { error: borcUpdateError } = await supabase
                .from('borclar')
                .update({
                  kalan_borc: parseFloat(mevcutBorc.kalan_borc || 0) + tutar,
                  toplam_borc: parseFloat(mevcutBorc.toplam_borc || 0) + tutar,
                  minimum_odeme: parseFloat(mevcutBorc.minimum_odeme || 0) + tutar
                })
                .eq('id', mevcutBorc.id)

              if (borcUpdateError) throw borcUpdateError

              baglanacakBorcId = mevcutBorc.id
            } else {
              const { data: yeniBorc, error: borcInsertError } = await supabase
                .from('borclar')
                .insert({
                  user_id: session.user.id,
                  ad: borcAdi,
                  tur: 'Kredi Kartı',
                  banka: seciliHesapObj.ad,
                  toplam_borc: tutar,
                  kalan_borc: tutar,
                  minimum_odeme: tutar,
                  taksit_sayisi: 1,
                  odenen_taksit: 0,
                  taksitli: false,
                  son_odeme_tarihi: sonOdemeStr,
                  aktif: true,
                  odenen_tutar: 0,
                  aylik_taksit: 0
                })
                .select('id')
                .single()

              if (borcInsertError) throw borcInsertError

              baglanacakBorcId = yeniBorc?.id
            }
          }

          if (baglanacakBorcId && yeniIslem?.id) {
            const { error: islemBaglaError } = await supabase
              .from('islemler')
              .update({
                borc_id: baglanacakBorcId
              })
              .eq('id', yeniIslem.id)

            if (islemBaglaError) throw islemBaglaError
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
      taksit_sayisi: '',
      kategori_id: '',
      ana_kategori_secim: ''
    })

    islemleriGetir()
  } catch (error) {
    console.error('İşlem eklenirken hata oluştu:', error)
    alert('İşlem eklenirken bir hata oluştu. Konsolu kontrol et.')
  } finally {
    setKaydediliyor(false)
  }
}

  const duzenlemeYetkisi = (islem) => {
    if (!islem) return { kategori: false, aciklama: false }
    const kategori = (islem.kategori || '').toLocaleLowerCase('tr-TR')
    const borcOdeme = islem.is_borc_odeme || kategori.includes('borç ödeme')
    if (borcOdeme) return { kategori: false, aciklama: false }
    const yalnizAciklama = kategori.includes('transfer') || kategori.includes('yatırım')
    return { kategori: !yalnizAciklama, aciklama: true }
  }

  const kategorileriGetir = async () => {
    const { data, error } = await supabase.from('kategoriler').select('*')
      .eq('user_id', session.user.id).order('ana_kategori')
    if (!error) setKategorilerDB(data || [])
  }

  const kategoriSecimListesi = (tur) => kategorilerDB.filter(k => {
    if (!k.aktif) return false
    if (tur === 'gider') return k.tur === 'gider' || (!duzenlenenId && k.tur === 'borc')
    return k.tur === tur
  })

  const anaKategoriSecenekleri = (tur) => [...new Set(kategoriSecimListesi(tur)
    .map(k => k.ana_kategori).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'tr'))

  const altKategoriSecenekleri = (tur, anaKategori) => kategoriSecimListesi(tur)
    .filter(k => k.ana_kategori === anaKategori)

  const anaKategoriSec = (anaKategori) => {
    const kayitlar = altKategoriSecenekleri(yeni.tur, anaKategori)
    const varsayilanKayit = kayitlar.find(k => !k.alt_kategori) || kayitlar[0]
    setYeni({ ...yeni, ana_kategori_secim: anaKategori, kategori_id: varsayilanKayit?.id || '' })
  }

  const islemDuzenleAc = (islem) => {
    setDuzenlenenId(islem.id)
    setYeni({
      tarih: islem.tarih,
      hesap_id: islem.hesap_id,
      hedef_hesap_id: '',
      tutar: String(islem.tutar),
      tur: islem.tur,
      kategori: islem.kategori || '',
      aciklama: islem.aciklama || '',
      taksitli: false,
      taksit_sayisi: '',
      kategori_id: islem.kategori_id || '',
      ana_kategori_secim: islem.ana_kategori || ''
    })
    setFormAcik(true)
  }

  const formuKapat = () => {
    setFormAcik(false)
    setDuzenlenenId(null)
  }

  const yeniIslemFormuAc = () => {
    setDuzenlenenId(null)
    setYeni({
      tarih: new Date().toISOString().split('T')[0],
      hesap_id: hesaplar[0]?.id || '',
      hedef_hesap_id: '',
      tutar: '', tur: 'gider', kategori: 'Zaruri', aciklama: '',
      taksitli: false, taksit_sayisi: '', kategori_id: '', ana_kategori_secim: ''
    })
    setFormAcik(true)
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
    const borcEtkisiniGeriAl = async (borc) => {
      if (!borc) return

      if (borc.taksitli) {
        await supabase
          .from('borclar')
          .delete()
          .eq('id', borc.id)

        return
      }

      const yeniToplam = Math.max(
        0,
        parseFloat(borc.toplam_borc || 0) - parseFloat(islem.tutar || 0)
      )

      const yeniKalan = Math.max(
        0,
        parseFloat(borc.kalan_borc || 0) - parseFloat(islem.tutar || 0)
      )

      const yeniMinimum = Math.max(
        0,
        parseFloat(borc.minimum_odeme || 0) - parseFloat(islem.tutar || 0)
      )

      if (yeniToplam <= 0) {
        await supabase
          .from('borclar')
          .delete()
          .eq('id', borc.id)
      } else {
        await supabase
          .from('borclar')
          .update({
            toplam_borc: yeniToplam,
            kalan_borc: yeniKalan,
            minimum_odeme: yeniMinimum
          })
          .eq('id', borc.id)
      }
    }

    if (islem.borc_id) {
      const { data: bagliBorc } = await supabase
        .from('borclar')
        .select('*')
        .eq('id', islem.borc_id)
        .maybeSingle()

      if (bagliBorc) {
        await borcEtkisiniGeriAl(bagliBorc)
      }
    } else if (islem.borc_id) {
  const { data: bagliBorc } = await supabase
    .from('borclar')
    .select('*')
    .eq('id', islem.borc_id)
    .maybeSingle()

  if (bagliBorc) {
    await borcEtkisiniGeriAl(bagliBorc)
  }
} else {
  console.warn(
    'Bu eski/legacy işlemde borc_id yok. Borç etkisi geri alınmadı:',
    islem.id
  )
}
  }
}

    await supabase.from('islemler').delete().eq('id', id)
    islemleriGetir()
  }

  // Filtreleme ve sıralama
  const transferIslemiMi = i =>
    i.butce_grubu === 'Transfer' || i.kategori === 'Hesaplar Arası Transfer'

  const filtreliIslemler = islemler
    .filter(i => !seciliDonem || i.tarih?.startsWith(seciliDonem))
    .filter(i => {
      if (filtre === 'hepsi') return true
      if (filtre === 'transfer') return transferIslemiMi(i)
      return i.tur === filtre && !transferIslemiMi(i)
    })
    .filter(i => !aramaMetni || 
      i.aciklama?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      i.kategori?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      i.ana_kategori?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      i.alt_kategori?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      i.hesaplar?.ad?.toLowerCase().includes(aramaMetni.toLowerCase())
    )
    .filter(i => !baslangicTarih || i.tarih >= baslangicTarih)
    .filter(i => !bitisTarih || i.tarih <= bitisTarih)
    .filter(i => !seciliHesap || i.hesap_id === seciliHesap)
    .filter(i => !seciliAnaKategori || (i.ana_kategori || i.kategori || 'Kategorisiz') === seciliAnaKategori)
    .filter(i => !seciliAltKategori || (i.alt_kategori || '') === seciliAltKategori)
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
    gelir: filtreliIslemler.filter(i => i.tur === 'gelir' && i.kategori !== 'Borç Ödemesi' && !transferIslemiMi(i)).reduce((a, i) => a + parseFloat(i.tutar), 0),
    gider: filtreliIslemler.filter(i => i.tur === 'gider' && i.kategori !== 'Borç Ödemesi' && !transferIslemiMi(i)).reduce((a, i) => a + parseFloat(i.tutar), 0),
    transfer: filtreliIslemler.filter(i => transferIslemiMi(i) && i.tur === 'gider').reduce((a, i) => a + parseFloat(i.tutar), 0),
    odeme: filtreliIslemler.filter(i => i.kategori === 'Borç Ödemesi' && i.tur === 'gider').reduce((a, i) => a + parseFloat(i.tutar), 0),
  }
  const net = araToplam.gelir - araToplam.gider

  // Tüm kategoriler
  const mevcutDonem = new Date().toISOString().slice(0, 7)
  const donemler = [...new Set([mevcutDonem, ...islemler.map(i => i.tarih?.slice(0, 7)).filter(Boolean)])].sort().reverse()
  const donemLabel = donem => {
    const [yil, ay] = donem.split('-').map(Number)
    return new Date(yil, ay - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
  }
  const tumAnaKategoriler = [...new Set(islemler.map(i => i.ana_kategori || i.kategori || 'Kategorisiz').filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'))
  const tumAltKategoriler = [...new Set(islemler
    .filter(i => !seciliAnaKategori || (i.ana_kategori || i.kategori || 'Kategorisiz') === seciliAnaKategori)
    .map(i => i.alt_kategori).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'))

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
    setSeciliAnaKategori('')
    setSeciliAltKategori('')
    setSeciliDonem(mevcutDonem)
  }

  const filtreAktif = filtre !== 'hepsi' || aramaMetni || baslangicTarih || bitisTarih || seciliHesap || seciliAnaKategori || seciliAltKategori || seciliDonem !== mevcutDonem
  const aktifDuzenleme = duzenlenenId ? islemler.find(i => i.id === duzenlenenId) : null
  const aktifDuzenlemeYetkisi = duzenlemeYetkisi(aktifDuzenleme)

  return (
    <div>
      {/* Ara Toplam Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: mobil ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '22px' }}>
        <div style={styles.ozetKart}>
          <div style={{ ...styles.ozetIcon, color: 'var(--success)' }}><ArrowUp size={20} /></div>
          <div style={styles.ozetLabel}>Toplam Gelir</div>
          <div style={{ ...styles.ozetDeger, color: 'var(--success)' }}>₺{pm(araToplam.gelir)}</div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetIcon}><ArrowDown size={20} /></div>
          <div style={styles.ozetLabel}>Toplam Gider</div>
          <div style={{ ...styles.ozetDeger, color: 'var(--text-primary)' }}>₺{pm(araToplam.gider)}</div>
        </div>
        <div style={{ ...styles.ozetKart, ...styles.netKart }}>
          <div style={{ ...styles.ozetIcon, ...styles.netIcon }}><Activity size={20} /></div>
          <div style={{ ...styles.ozetLabel, color: 'rgba(255,255,255,.76)' }}>Net Nakit Akışı</div>
          <div style={{ ...styles.ozetDeger, color: '#fff' }}>₺{pm(net)}</div>
        </div>
        <div style={styles.ozetKart}>
          <div style={styles.ozetIcon}><CreditCard size={20} /></div>
          <div style={styles.ozetLabel}>Borç Ödemeleri</div>
          <div style={{ ...styles.ozetDeger, color: 'var(--text-primary)' }}>₺{pm(araToplam.odeme)}</div>
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
            <div style={styles.donemSeciciWrap}>
              <CalendarDays size={14} />
              <span>Dönem</span>
              <select style={styles.donemSecici} value={seciliDonem} onChange={e => setSeciliDonem(e.target.value)}>
                <option value="">Tüm dönemler</option>
                {donemler.map(d => <option key={d} value={d}>{donemLabel(d)}</option>)}
              </select>
            </div>
            {mobil && <button style={{ ...styles.ekleBtn, minHeight: '40px', alignSelf: 'center' }} onClick={yeniIslemFormuAc}><Plus size={16} /> Yeni İşlem</button>}
          </div>
          <div style={styles.toolbarActions}>
            <div style={styles.searchWrap}><Search size={17} />
              <input style={styles.searchInput} placeholder="İşlem ara..." value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} />
            </div>
            <button style={{ ...styles.filtreToggleBtn, ...(filtreAcik || baslangicTarih || bitisTarih || seciliHesap || seciliAnaKategori || seciliAltKategori ? styles.filtreToggleBtnAktif : {}) }} onClick={() => setFiltreAcik(prev => !prev)}><SlidersHorizontal size={16} /> Filtreler</button>
            <button style={styles.filtreToggleBtn} onClick={() => setKategoriYonetimiAcik(true)}><Tags size={16} /> Kategori Yönetimi</button>
            {!mobil && <button style={styles.ekleBtn} onClick={yeniIslemFormuAc}><Plus size={17} /> Yeni İşlem</button>}
          </div>
        </div>

        {/* Arama + Tarih + Hesap + Kategori — masaüstünde her zaman, mobilde toggle ile */}
        {filtreAcik && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: mobil ? '1fr' : 'repeat(5,1fr)', gap: '8px', marginTop: '12px' }}>
              <label style={styles.filterField}><span>Başlangıç Tarihi</span><input style={styles.filterInput} type="date" value={baslangicTarih}
                onChange={e => setBaslangicTarih(e.target.value)} /></label>
              <label style={styles.filterField}><span>Bitiş Tarihi</span><input style={styles.filterInput} type="date" value={bitisTarih}
                onChange={e => setBitisTarih(e.target.value)} /></label>
              <select style={styles.filterInput} value={seciliHesap} onChange={e => setSeciliHesap(e.target.value)}>
                <option value="">Tüm Hesaplar</option>
                {hesaplar.map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
              </select>
              <select style={styles.filterInput} value={seciliAnaKategori} onChange={e => { setSeciliAnaKategori(e.target.value); setSeciliAltKategori('') }}>
                <option value="">Tüm Ana Kategoriler</option>
                {tumAnaKategoriler.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <select style={styles.filterInput} value={seciliAltKategori} onChange={e => setSeciliAltKategori(e.target.value)}>
                <option value="">Tüm Alt Kategoriler</option>
                {tumAltKategoriler.map(k => <option key={k} value={k}>{k}</option>)}
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
            <h3 style={styles.modalBaslik}>{duzenlenenId ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}</h3>

            {duzenlenenId && (
              <div style={styles.bilgiMesaj}>
                Tutar, tarih, hesap ve işlem türü finansal kayıtların tutarlılığı için kilitlidir.
                {!aktifDuzenlemeYetkisi.aciklama && !aktifDuzenlemeYetkisi.kategori && ' Bu borç ödemesi bağlı kayıtları etkilediği için salt okunur gösteriliyor.'}
              </div>
            )}

            <label style={styles.label}>İşlem Türü</label>
            <div style={styles.turSecici}>
              {(duzenlenenId ? ['gelir', 'gider'] : ['gelir', 'gider', 'transfer']).map(t => (
                <button key={t}
                  style={yeni.tur === t
                    ? { ...styles.turBtn, background: '#234f68', borderColor: '#234f68', color: '#fff' }
                    : styles.turBtn}
                  disabled={Boolean(duzenlenenId)}
                  onClick={() => setYeni({ ...yeni, tur: t, kategori: '', kategori_id: '', ana_kategori_secim: '' })}>
                  {turLabel[t]}
                </button>
              ))}
            </div>

            <label style={styles.label}>Tarih</label>
            <input style={styles.input} type="date" value={yeni.tarih}
              disabled={Boolean(duzenlenenId)}
              onChange={e => setYeni({ ...yeni, tarih: e.target.value })} />

            <label style={styles.label}>{yeni.tur === 'transfer' ? 'Kaynak Hesap' : 'Hesap'}</label>
            <select style={styles.input} value={yeni.hesap_id}
              disabled={Boolean(duzenlenenId)}
              onChange={e => setYeni({ ...yeni, hesap_id: e.target.value })}>
              {hesaplar.filter(h => !duzenlenenId || h.tur?.toLocaleLowerCase('tr-TR') !== 'kredi kartı').map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
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
              if (!duzenlenenId && sh?.tur?.toLowerCase() === 'kredi kartı' && yeni.tur === 'gider') {
                return (
                  <>
                    <div style={styles.bilgiMesaj}>
                      💳 Bu gider <strong>{sh.ad}</strong> kartının borcuna eklenecek.
                      {sh.kesim_gunu ? ` Kesim günü: ${sh.kesim_gunu}` : ''}
                    </div>
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
                          value={yeni.taksit_sayisi} onChange={e => setYeni({ ...yeni, taksit_sayisi: e.target.value })} />
                        {yeni.tutar && yeni.taksit_sayisi && (
                          <div style={styles.taksitBilgi}>
                            💡 Aylık taksit: <strong>₺{(parseFloat(yeni.tutar) / parseInt(yeni.taksit_sayisi)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
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
              disabled={Boolean(duzenlenenId)}
              onChange={e => setYeni({ ...yeni, tutar: e.target.value })} />

            <label style={styles.label}>Ana Kategori</label>
            {kategoriSecimListesi(yeni.tur).length === 0 && !duzenlenenId && (
              <div style={styles.kategoriUyari}>
                <span>Henüz bu işlem türüne ait kategori eklenmemiş. Kategorisiz devam edebilir veya kategori oluşturabilirsiniz.</span>
                <button onClick={() => setKategoriYonetimiAcik(true)}>+ Kategori Ekle</button>
              </div>
            )}
            <select style={styles.input} value={yeni.ana_kategori_secim || ''}
              disabled={Boolean(duzenlenenId) && !aktifDuzenlemeYetkisi.kategori}
              onChange={e => anaKategoriSec(e.target.value)}>
              <option value="">Kategorisiz</option>
              {anaKategoriSecenekleri(yeni.tur).map(ana => <option key={ana} value={ana}>{ana}</option>)}
            </select>

            {yeni.ana_kategori_secim && (
              <>
                <label style={styles.label}>Alt Kategori</label>
                <select style={styles.input} value={yeni.kategori_id || ''}
                  disabled={Boolean(duzenlenenId) && !aktifDuzenlemeYetkisi.kategori}
                  onChange={e => setYeni({ ...yeni, kategori_id: e.target.value })}>
                  {altKategoriSecenekleri(yeni.tur, yeni.ana_kategori_secim).some(k => !k.alt_kategori)
                    ? <option value={altKategoriSecenekleri(yeni.tur, yeni.ana_kategori_secim).find(k => !k.alt_kategori)?.id}>Alt kategorisiz</option>
                    : <option value="">Alt kategori seçin</option>}
                  {altKategoriSecenekleri(yeni.tur, yeni.ana_kategori_secim).filter(k => k.alt_kategori)
                    .map(k => <option key={k.id} value={k.id}>{k.alt_kategori}</option>)}
                </select>
              </>
            )}

            <label style={styles.label}>Açıklama (isteğe bağlı)</label>
            <input style={styles.input} placeholder="örn. Migros alışverişi" value={yeni.aciklama}
              disabled={Boolean(duzenlenenId) && !aktifDuzenlemeYetkisi.aciklama}
              onChange={e => setYeni({ ...yeni, aciklama: e.target.value })} />

            <div style={styles.modalBtnler}>
              <button style={styles.iptalBtn} onClick={formuKapat}>İptal</button>
              <button style={styles.kaydetBtn} onClick={islemEkle} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor...' : duzenlenenId && !aktifDuzenlemeYetkisi.aciklama && !aktifDuzenlemeYetkisi.kategori ? 'Kapat' : duzenlenenId ? 'Değişiklikleri Kaydet' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {kategoriYonetimiAcik && <KategoriYonetimi session={session} kategoriler={kategorilerDB}
        onKapat={() => setKategoriYonetimiAcik(false)} onDegisti={kategorileriGetir} />}

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
          <div style={styles.listeBaslik}>Son İşlemler</div>
          {!mobil && (
            <div style={styles.tabloBaslik}>
              <span>Ana Kategori</span><span>Alt Kategori</span><span>Açıklama</span><span>Hesap</span><span style={{ textAlign: 'right' }}>Tutar</span><span>Tarih</span><span />
            </div>
          )}
          {filtreliIslemler.map(islem => {
            const isBorcOdeme = islem.is_borc_odeme || islem.kategori === 'Borç Ödemesi'
            const IslemIcon = isBorcOdeme ? CreditCard : islem.tur === 'gelir' ? Wallet : islem.tur === 'transfer' ? ArrowLeftRight : islem.kategori === 'Market' ? ShoppingCart : ReceiptText
            const anaKategori = islem.ana_kategori || islem.kategori || 'Kategorisiz'
            const altKategori = islem.alt_kategori || '—'
            return (
              <div key={islem.id} className="transaction-row" style={{ ...styles.islemSatir, gridTemplateColumns: mobil ? '1fr auto' : '1.1fr 1.1fr 1.8fr 1fr 1fr .9fr 68px' }}>
                <div style={styles.islemBilgi}>
                  <div style={styles.islemIkon}><IslemIcon size={17} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.islemAciklama}>{mobil ? (islem.aciklama || anaKategori) : anaKategori}</div>
                    {mobil && <div style={styles.islemDetay}>{anaKategori}{islem.alt_kategori ? ` / ${islem.alt_kategori}` : ''} · {islem.hesaplar?.ad} · {islem.tarih}</div>}
                  </div>
                </div>
                {!mobil && <div style={styles.hucreMetin}>{altKategori}</div>}
                {!mobil && <div style={styles.hucreMetin}>{islem.aciklama || '—'}</div>}
                {!mobil && <div style={styles.hucreMetin}>{islem.hesaplar?.ad || '—'}</div>}
                <div style={{ ...styles.islemTutar, color: islem.tur === 'gelir' ? 'var(--success)' : 'var(--text-primary)' }}>
                  {gizliMod ? '₺ ****' : `${islem.tur === 'gelir' ? '+' : islem.tur === 'gider' ? '-' : ''}₺${parseFloat(islem.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </div>
                {!mobil && <div style={styles.hucreMetin}>{new Date(islem.tarih).toLocaleDateString('tr-TR')}</div>}
                <div style={styles.satirAksiyonlar}>
                  <button className="transaction-edit" aria-label="İşlemi düzenle" title="Düzenle" style={styles.duzenleBtn} onClick={() => islemDuzenleAc(islem)}><Pencil size={14} /></button>
                  <button className="transaction-delete" aria-label="İşlemi sil" title="Sil" style={styles.silBtn} onClick={() => islemSil(islem.id)}><Trash2 size={15} /></button>
                </div>
              </div>
            )
          })}
          <div style={styles.listeAlt}><span>{filtreliIslemler.length} sonuç gösteriliyor</span><span style={styles.sayfaNo}>1</span></div>
        </div>
      )}
    </div>
  )
}

const styles = {
  ozetKart: { background: 'var(--bg-card)', borderRadius: '14px', padding: '20px', textAlign: 'left', border: '1px solid var(--border)', boxShadow: 'none', minHeight: '132px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  netKart: { background: 'linear-gradient(135deg, #6faeb3 0%, #2d6482 100%)', border: 'none', boxShadow: '0 10px 24px rgba(45,100,130,.18)' },
  ozetIcon: { width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-primary)', marginBottom: '13px' },
  netIcon: { background: 'rgba(255,255,255,.94)', color: '#244f69', border: 'none' },
  ozetLabel: { color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '7px', fontWeight: '550' },
  ozetDeger: { fontSize: '22px', fontWeight: '750', letterSpacing: '-.025em' },
  ozetAlt: { color: 'var(--text-muted)', fontSize: '11px' },
  filtrePanel: { background: 'var(--bg-card)', borderRadius: '14px', padding: '10px 14px', marginBottom: '18px', border: '1px solid var(--border)', boxShadow: 'none' },
  filtreSatir: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
  filtreler: { display: 'flex', gap: '4px', flexWrap: 'wrap', alignSelf: 'stretch' },
  filtreBtn: { minHeight: '50px', padding: '0 14px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', borderRadius: 0, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' },
  donemSeciciWrap: { minHeight: '50px', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px', padding: '0 9px', borderLeft: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '12px' },
  donemSecici: { maxWidth: '145px', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600', outline: 'none', cursor: 'pointer' },
  toolbarActions: { display: 'flex', gap: '8px', alignItems: 'center', flex: '1 1 560px', justifyContent: 'flex-end' },
  searchWrap: { width: 'min(270px, 100%)', height: '40px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '9px', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-muted)', background: 'var(--surface)' },
  searchInput: { width: '100%', border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '13px' },
  filtreToggleBtn: { height: '40px', padding: '0 13px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '7px' },
  filtreToggleBtnAktif: { background: 'rgba(13,148,136,0.08)', border: '1px solid #0d9488', color: '#0d9488', fontWeight: '600' },
  filtreOzet: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', padding: '8px 12px', background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: '8px', color: '#0d9488', fontSize: '13px' },
  filtreBtnAktif: { background: 'transparent', borderBottom: '2px solid #2f667a', color: '#244f69', fontWeight: '650' },
  ekleBtn: { height: '40px', padding: '0 16px', background: '#234f68', border: 'none', borderRadius: '9px', color: '#fff', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap' },
  filterInput: { width: '100%', boxSizing: 'border-box', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' },
  filterField: { display: 'flex', flexDirection: 'column', gap: '5px', color: 'var(--text-muted)', fontSize: '10px' },
  siralamaBtn: { padding: '5px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' },
  siralamaBtnAktif: { background: 'rgba(78,204,163,0.1)', border: '1px solid #4ecca3', color: '#2a9d8f', fontWeight: 'bold' },
  temizleBtn: { padding: '5px 10px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '12px' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.48)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '18px' },
  modal: { background: 'var(--surface)', borderRadius: '14px', padding: '24px', width: '420px', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 22px 60px rgba(15,23,42,.16)' },
  modalBaslik: { color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', margin: '0 0 20px 0', paddingBottom: '14px', borderBottom: '1px solid var(--border)' },
  turSecici: { display: 'flex', gap: '8px', marginBottom: '16px' },
  turBtn: { flex: 1, padding: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' },
  bilgiMesaj: { background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '9px', padding: '12px', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '14px' },
  kategoriUyari: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#f6fafb', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '9px' },
  toggleSatir: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border)' },
  toggleLabel: { color: 'var(--text-secondary)', fontSize: '14px' },
  toggle: { width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' },
  toggleTop: { position: 'absolute', top: '2px', left: '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'transform 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  taksitBilgi: { background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '9px', padding: '12px', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '14px' },
  label: { color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '550', display: 'block', marginBottom: '7px' },
  input: { width: '100%', minHeight: '42px', padding: '10px 12px', marginBottom: '14px', background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' },
  modalBtnler: { display: 'flex', gap: '12px', marginTop: '8px' },
  iptalBtn: { flex: 1, height: '42px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-secondary)', cursor: 'pointer' },
  kaydetBtn: { flex: 1, height: '42px', background: '#234f68', border: 'none', borderRadius: '9px', color: '#fff', fontWeight: '600', cursor: 'pointer' },
  yukleniyor: { color: 'var(--text-muted)', textAlign: 'center', padding: '48px' },
  bos: { textAlign: 'center', padding: '64px' },
  liste: { display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', minHeight: '310px' },
  listeBaslik: { color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: '2px 8px 16px' },
  tabloBaslik: { display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1.8fr 1fr 1fr .9fr 68px', gap: '12px', padding: '0 10px 9px', color: 'var(--text-muted)', fontSize: '11px' },
  islemSatir: { display: 'grid', alignItems: 'center', gap: '12px', minHeight: '56px', padding: '7px 10px', borderRadius: '9px', transition: 'background .16s ease' },
  turBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  islemBilgi: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
  islemIkon: { width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--surface-soft)', border: '1px solid var(--border)', color: '#294a60' },
  islemAciklama: { color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  islemDetay: { color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' },
  hucreMetin: { color: 'var(--text-secondary)', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  islemTutar: { fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', textAlign: 'right' },
  satirAksiyonlar: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' },
  duzenleBtn: { width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderRadius: '7px', color: 'var(--primary)', cursor: 'pointer', opacity: .72, transition: 'opacity .16s ease, background .16s ease' },
  silBtn: { width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0, transition: 'opacity .16s ease' },
  listeAlt: { marginTop: 'auto', padding: '14px 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '11px' },
  sayfaNo: { width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: '#234f68', color: '#fff', fontWeight: '650' },
}

export default Islemler
