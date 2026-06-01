// 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
//REACT_APP_GEMINI_KEY=AIzaSyBzrq_mGnNSnzPFqRRG9NUsgI9e7tWvWMU
import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

function ChatBot({ session, onIslemEklendi }) {
  const [acik, setAcik] = useState(false)
  const [mesajlar, setMesajlar] = useState([
    { rol: 'bot', metin: '👋 Merhaba! İşlem eklemek için yazabilirsiniz.\n\nÖrnek:\n• "İş bankasından 500 tl market"\n• "Maaş geldi 25000 tl"\n• "Garanti kartıyla 1200 tl ayakkabı"\n• "İş bankasından garantiye 3000 tl transfer"\n• "Yapı kredi yatırımdan 50 adet THYAO aldım 5000 tl"' }
  ])
  const [girdi, setGirdi] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [onay, setOnay] = useState(null)
  const [hesaplar, setHesaplar] = useState([])
  const mesajSonuRef = useRef(null)

  useEffect(() => {
    if (acik) hesaplariGetir()
  }, [acik])

  useEffect(() => {
    mesajSonuRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mesajlar])

  const hesaplariGetir = async () => {
    const { data } = await supabase
      .from('hesaplar')
      .select('id, ad, tur')
      .eq('user_id', session.user.id)
    if (data) setHesaplar(data)
  }

  const hesapBul = (aranan) => {
    if (!aranan) return null
    const arananKucuk = aranan.toLowerCase().trim()

    // 1. Tam eşleşme
    let hesap = hesaplar.find(h => h.ad.toLowerCase() === arananKucuk)
    if (hesap) return hesap

    // 2. Kredi kartı içermiyorsa banka hesabını tercih et
    const kartIceriyor = arananKucuk.includes('kart') || arananKucuk.includes('kredi')
    if (!kartIceriyor) {
      hesap = hesaplar.find(h =>
        !h.ad.toLowerCase().includes('kredi') &&
        !h.ad.toLowerCase().includes('kart') &&
        h.ad.toLowerCase().includes(arananKucuk)
      )
      if (hesap) return hesap
    }

    // 3. Genel eşleşme
    hesap = hesaplar.find(h =>
      h.ad.toLowerCase().includes(arananKucuk) ||
      arananKucuk.includes(h.ad.toLowerCase())
    )
    return hesap
  }

  const mesajGonder = async () => {
    if (!girdi.trim() || yukleniyor) return
    const kullaniciMesaj = girdi.trim()
    setGirdi('')
    setMesajlar(prev => [...prev, { rol: 'kullanici', metin: kullaniciMesaj }])
    setYukleniyor(true)

    try {
      const hesapListesi = hesaplar.map(h => `${h.ad} (${h.tur})`).join(', ')
      const bugun = new Date().toISOString().split('T')[0]

      const systemPrompt = `Sen bir Türk finans asistanısın. Kullanıcının yazdığı metni analiz edip işlem bilgilerini JSON formatında döndür. Sadece JSON döndür, başka hiçbir şey yazma, markdown kullanma.

Mevcut hesaplar: ${hesapListesi}
Bugünün tarihi: ${bugun}

Hesap eşleştirme kuralları:
- Kullanıcı "iş bankası" derse "İş Bankası" banka hesabını seç, kredi kartını değil
- Kullanıcı "kredi kartı" veya "kart" derse kredi kartı hesabını seç
- Kullanıcı "garanti" derse "Garanti" banka hesabını seç, kredi kartını değil
- Tam isim eşleşmesi önceliklidir

İşlem türü kuralları:
- Hisse, kripto, fon, döviz, altın alımı için tur="yatirim" kullan
- Maaş, kira geliri, faiz için tur="gelir" kullan
- Market, fatura, yemek gibi harcamalar için tur="gider" kullan
- Hesaplar arası para aktarımı için tur="transfer" kullan

Normal işlem (gelir/gider) için JSON formatı:
{
  "anlasilan": "kısa açıklama",
  "islem": {
    "hesap_adi": "hesap adı",
    "tutar": 500,
    "tur": "gider",
    "kategori": "Market",
    "aciklama": "market alışverişi",
    "tarih": "${bugun}"
  }
}

Transfer işlemi için JSON formatı:
{
  "anlasilan": "kısa açıklama",
  "islem": {
    "hesap_adi": "kaynak hesap adı",
    "hedef_hesap_adi": "hedef hesap adı",
    "tutar": 3000,
    "tur": "transfer",
    "aciklama": "transfer",
    "tarih": "${bugun}"
  }
    Transfer işlemi için JSON formatı — dikkat: hesap_adi PARA ÇIKAN hesap, hedef_hesap_adi PARA GIREN hesap:
{
  "anlasilan": "kısa açıklama",
  "islem": {
    "hesap_adi": "paranın ÇIKTIĞI kaynak hesap",
    "hedef_hesap_adi": "paranın GİRDİĞİ hedef hesap",
    "tutar": 3000,
    "tur": "transfer",
    "aciklama": "transfer",
    "tarih": "${bugun}"
  }
}


Örnek: "iş bankasından garantiye 3000 tl transfer" için:
- hesap_adi = "İş Bankası" (para çıkan)
- hedef_hesap_adi = "Garanti" (para giren)
}

Yatırım işlemi için JSON formatı:
{
  "anlasilan": "kısa açıklama",
  "islem": {
    "hesap_adi": "yatırım hesabı adı",
    "tutar": 5000,
    "tur": "yatirim",
    "aciklama": "THYAO",
    "yatirim_turu": "Hisse",
    "miktar": 50,
    "tarih": "${bugun}"
  }
    Yatırım işlemi kuralları:
- aciklama alanına sadece sembolü yaz: ETH, BTC, THYAO, Altın (miktar yazma)
- miktar alanına sayısal miktarı yaz: 1.1, 50, 100
- yatirim_turu: Kripto için "Kripto", hisse için "Hisse", altın için "Altın", fon için "Fon", döviz için "Döviz"
}

- Kredi kartı ödemesi, borç ödemesi için tur="borc_odeme" kullan
- Borç ödemesinde hesap_adi = paranın çıktığı banka hesabı, kart_adi = ödenen kredi kartı

Borç ödeme işlemi için JSON formatı:
{
  "anlasilan": "kısa açıklama",
  "islem": {
    "hesap_adi": "paranın çıktığı banka hesabı",
    "kart_adi": "ödenen kredi kartı hesabı",
    "tutar": 5000,
    "tur": "borc_odeme",
    "aciklama": "kredi kartı ödemesi",
    "tarih": "${bugun}"
  }
    - Kredi kartıyla yapılan alışveriş için tur="kk_alisveris" kullan
- Kredi kartı borcunu ödemek için tur="borc_odeme" kullan

KK alışveriş için JSON:
{
  "anlasilan": "...",
  "islem": {
    "hesap_adi": "kullanılan kredi kartı",
    "tutar": 5000,
    "tur": "kk_alisveris",
    "kategori": "Giyim",
    "aciklama": "ayakkabı",
    "taksitli": true,
    "taksit_sayisi": 3,
    "tarih": "${bugun}"
  }
}
}

Örnek: "iş bankasından garanti kredi kartına 5000 tl ödeme" için:
- hesap_adi = "İş Bankası" (para çıkan banka)
- kart_adi = "Garanti Bankası Kredi Kartı" (ödenen kart)
 

Kategori değerleri: Zaruri, Keyfi, Market, Fatura, Ulaşım, Sağlık, Eğlence, Giyim, Maaş, Borç Ödemesi, Diğer
Yatırım türü değerleri: Hisse, Kripto, Fon, Döviz, Altın, BES, Diğer

Anlamazsan: { "anlasilan": "açıklama", "islem": null }`

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer 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`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: kullaniciMesaj }
          ],
          temperature: 0.1,
          max_tokens: 500
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'API hatası')

      const yanitMetni = data.choices?.[0]?.message?.content || ''
      const temizMetin = yanitMetni.replace(/```json\n?|\n?```/g, '').trim()
      const yanit = JSON.parse(temizMetin)

      if (yanit.islem) {
        const hesap = hesapBul(yanit.islem.hesap_adi)
        setOnay({
          ...yanit.islem,
          hesap_id: hesap?.id || null,
          hesap_adi_gosterim: hesap?.ad || yanit.islem.hesap_adi,
          anlasilan: yanit.anlasilan
        })
        setMesajlar(prev => [...prev, {
          rol: 'bot',
          metin: `✅ Anladım: ${yanit.anlasilan}\n\nAşağıdaki işlemi onaylıyor musunuz?`
        }])
      } else {
        setMesajlar(prev => [...prev, {
          rol: 'bot',
          metin: `❓ ${yanit.anlasilan || 'Anlayamadım.'}\n\nDaha açık yazar mısınız?\nÖrnek: "İş bankasından 500 tl market"`
        }])
      }
    } catch (e) {
      console.error('Chatbot hatası:', e)
      setMesajlar(prev => [...prev, {
        rol: 'bot',
        metin: '❌ Bir hata oluştu: ' + e.message
      }])
    }

    setYukleniyor(false)
  }

  const islemOnayla = async () => {
    if (!onay?.hesap_id) {
      setMesajlar(prev => [...prev, {
        rol: 'bot',
        metin: '❌ Hesap bulunamadı. Hesap adını daha açık belirtin.\n\nMevcut hesaplar: ' + hesaplar.map(h => h.ad).join(', ')
      }])
      setOnay(null)
      return
    }

    if (onay.tur === 'transfer') {
      const hedefHesap = hesapBul(onay.hedef_hesap_adi)

      if (!hedefHesap) {
        setMesajlar(prev => [...prev, {
          rol: 'bot',
          metin: '❌ Hedef hesap bulunamadı.\n\nMevcut hesaplar: ' + hesaplar.map(h => h.ad).join(', ')
        }])
        setOnay(null)
        return
      }

      const { error: e1 } = await supabase.from('islemler').insert({
        user_id: session.user.id,
        hesap_id: onay.hesap_id,
        tarih: onay.tarih,
        tutar: parseFloat(onay.tutar),
        tur: 'gider',
        kategori: 'Hesaplar Arası Transfer',
        aciklama: `Transfer → ${hedefHesap.ad}`
      })

      const { error: e2 } = await supabase.from('islemler').insert({
        user_id: session.user.id,
        hesap_id: hedefHesap.id,
        tarih: onay.tarih,
        tutar: parseFloat(onay.tutar),
        tur: 'gelir',
        kategori: 'Hesaplar Arası Transfer',
        aciklama: `Transfer ← ${onay.hesap_adi_gosterim}`
      })

      if (!e1 && !e2) {
        setMesajlar(prev => [...prev, {
          rol: 'bot',
          metin: `🎉 Transfer tamamlandı!\n\n₺${parseFloat(onay.tutar).toLocaleString('tr-TR')}\n🏦 ${onay.hesap_adi_gosterim} → ${hedefHesap.ad}\n📅 ${onay.tarih}`
        }])
        setOnay(null)
        if (onIslemEklendi) onIslemEklendi()
      } else {
        setMesajlar(prev => [...prev, { rol: 'bot', metin: '❌ Transfer sırasında hata oluştu.' }])
      }

      } else if (onay.tur === 'kk_alisveris') {
  // İşlem olarak kaydet
  const { error } = await supabase.from('islemler').insert({
    user_id: session.user.id,
    hesap_id: onay.hesap_id,
    tarih: onay.tarih,
    tutar: parseFloat(onay.tutar),
    tur: 'gider',
    kategori: onay.kategori || 'Diğer',
    aciklama: onay.aciklama
  })

  // Borçlar tablosuna ekle
  if (!error) {
    if (onay.taksitli && onay.taksit_sayisi > 1) {
      // Taksitli borç
      const aylikTaksit = parseFloat(onay.tutar) / parseInt(onay.taksit_sayisi)
      
      // Kesim gününe göre son ödeme tarihi hesapla
      let sonOdeme = new Date(onay.tarih)
      sonOdeme.setMonth(sonOdeme.getMonth() + 1)
      sonOdeme.setDate(10)

      await supabase.from('borclar').insert({
        user_id: session.user.id,
        ad: `${onay.aciklama} (${onay.taksit_sayisi} taksit)`,
        tur: 'Kredi Kartı',
        banka: onay.hesap_adi_gosterim,
        toplam_borc: parseFloat(onay.tutar),
        kalan_borc: parseFloat(onay.tutar),
        aylik_taksit: aylikTaksit,
        minimum_odeme: aylikTaksit,
        taksit_sayisi: parseInt(onay.taksit_sayisi),
        odenen_taksit: 0,
        taksitli: true,
        son_odeme_tarihi: sonOdeme.toISOString().split('T')[0],
        aktif: true,
        odenen_tutar: 0
      })
    } else {
      // Taksitsiz — o ayın borcuna ekle
      const kartAdi = onay.hesap_adi_gosterim
      let sonOdeme = new Date(onay.tarih)
      sonOdeme.setMonth(sonOdeme.getMonth() + 1)
      sonOdeme.setDate(10)
      const borcAdi = `${kartAdi} - ${String(sonOdeme.getMonth() + 1).padStart(2, '0')}/${sonOdeme.getFullYear()}`

      const { data: mevcutBorc } = await supabase
        .from('borclar')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('ad', borcAdi)
        .eq('aktif', true)
        .single()

      if (mevcutBorc) {
        await supabase.from('borclar').update({
          kalan_borc: parseFloat(mevcutBorc.kalan_borc) + parseFloat(onay.tutar),
          toplam_borc: parseFloat(mevcutBorc.toplam_borc) + parseFloat(onay.tutar),
          minimum_odeme: parseFloat(mevcutBorc.minimum_odeme) + parseFloat(onay.tutar),
        }).eq('id', mevcutBorc.id)
      } else {
        await supabase.from('borclar').insert({
          user_id: session.user.id,
          ad: borcAdi,
          tur: 'Kredi Kartı',
          banka: kartAdi,
          toplam_borc: parseFloat(onay.tutar),
          kalan_borc: parseFloat(onay.tutar),
          minimum_odeme: parseFloat(onay.tutar),
          taksit_sayisi: 1,
          odenen_taksit: 0,
          taksitli: false,
          son_odeme_tarihi: sonOdeme.toISOString().split('T')[0],
          aktif: true,
          odened_tutar: 0,
          aylik_taksit: 0
        })
      }
    }

    setMesajlar(prev => [...prev, {
      rol: 'bot',
      metin: `🎉 Kaydedildi!\n\n💳 ${onay.aciklama} — ₺${parseFloat(onay.tutar).toLocaleString('tr-TR')}\n${onay.taksitli ? `📋 ${onay.taksit_sayisi} taksit (aylık ₺${(parseFloat(onay.tutar)/parseInt(onay.taksit_sayisi)).toLocaleString('tr-TR', {minimumFractionDigits: 0})})` : '💳 Tek çekim'}\n🏦 ${onay.hesap_adi_gosterim}\n📅 ${onay.tarih}`
    }])
    setOnay(null)
    if (onIslemEklendi) onIslemEklendi()
  } else {
    setMesajlar(prev => [...prev, { rol: 'bot', metin: '❌ Kayıt sırasında hata oluştu.' }])
  }
} else if (onay.tur === 'borc_odeme') {
  const kartHesap = hesapBul(onay.kart_adi)

  if (!kartHesap) {
    setMesajlar(prev => [...prev, {
      rol: 'bot',
      metin: '❌ Kredi kartı hesabı bulunamadı.\n\nMevcut hesaplar: ' + hesaplar.map(h => h.ad).join(', ')
    }])
    setOnay(null)
    return
  }

  // Banka hesabından para düş
  const { error: e1 } = await supabase.from('islemler').insert({
    user_id: session.user.id,
    hesap_id: onay.hesap_id,
    tarih: onay.tarih,
    tutar: parseFloat(onay.tutar),
    tur: 'gider',
    kategori: 'Borç Ödemesi',
    aciklama: `${kartHesap.ad} ödemesi`
  })

  // Kredi kartı borcunu düş
  const { error: e2 } = await supabase.from('islemler').insert({
    user_id: session.user.id,
    hesap_id: kartHesap.id,
    tarih: onay.tarih,
    tutar: parseFloat(onay.tutar),
    tur: 'gelir',
    kategori: 'Borç Ödemesi',
    aciklama: `Borç ödemesi ← ${onay.hesap_adi_gosterim}`
  })

  // Borçlar tablosunda aktif borcu güncelle
  const { data: borcData } = await supabase
    .from('borclar')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('aktif', true)
    .ilike('banka', `%${kartHesap.ad}%`)
    .order('son_odeme_tarihi', { ascending: true })
    .limit(1)

  if (borcData && borcData.length > 0) {
    const borc = borcData[0]
    const yeniKalan = Math.max(0, parseFloat(borc.kalan_borc) - parseFloat(onay.tutar))
    const yeniOdenen = (parseFloat(borc.odenen_tutar) || 0) + parseFloat(onay.tutar)
    await supabase.from('borclar').update({
      kalan_borc: yeniKalan,
      odenen_tutar: yeniOdenen,
      aktif: yeniKalan > 0
    }).eq('id', borc.id)
  }

  if (!e1 && !e2) {
    setMesajlar(prev => [...prev, {
      rol: 'bot',
      metin: `🎉 Borç ödemesi tamamlandı!\n\n₺${parseFloat(onay.tutar).toLocaleString('tr-TR')}\n🏦 ${onay.hesap_adi_gosterim} → ${kartHesap.ad}\n📅 ${onay.tarih}`
    }])
    setOnay(null)
    if (onIslemEklendi) onIslemEklendi()
  } else {
    setMesajlar(prev => [...prev, { rol: 'bot', metin: '❌ Ödeme sırasında hata oluştu.' }])
  }

    } else if (onay.tur === 'yatirim') {
      const { error } = await supabase.from('yatirimlar').insert({
        user_id: session.user.id,
        ad: onay.aciklama,
        tur: onay.yatirim_turu || 'Hisse',
        miktar: parseFloat(onay.miktar) || 0,
        maliyet: parseFloat(onay.tutar),
        guncel_deger: parseFloat(onay.tutar),
        birim_maliyet: onay.miktar > 0 ? parseFloat(onay.tutar) / parseFloat(onay.miktar) : parseFloat(onay.tutar),
        birim_fiyat: onay.miktar > 0 ? parseFloat(onay.tutar) / parseFloat(onay.miktar) : parseFloat(onay.tutar),
        para_birimi: 'TRY',
        hesap_id: onay.hesap_id
      })

      if (!error) {
        await supabase.from('islemler').insert({
          user_id: session.user.id,
          hesap_id: onay.hesap_id,
          tarih: onay.tarih,
          tutar: parseFloat(onay.tutar),
          tur: 'gider',
          kategori: 'Yatırım',
          aciklama: `${onay.aciklama} alımı`
        })
        setMesajlar(prev => [...prev, {
          rol: 'bot',
          metin: `🎉 Yatırım kaydedildi!\n\n📈 ${onay.aciklama} — ₺${parseFloat(onay.tutar).toLocaleString('tr-TR')}\n📅 ${onay.tarih}\n🏦 ${onay.hesap_adi_gosterim}`
        }])
        setOnay(null)
        if (onIslemEklendi) onIslemEklendi()
      } else {
        setMesajlar(prev => [...prev, { rol: 'bot', metin: '❌ Yatırım kaydı sırasında hata oluştu.' }])
      }

    } else {
      const { error } = await supabase.from('islemler').insert({
        user_id: session.user.id,
        hesap_id: onay.hesap_id,
        tarih: onay.tarih,
        tutar: parseFloat(onay.tutar),
        tur: onay.tur,
        kategori: onay.kategori,
        aciklama: onay.aciklama
      })

      if (!error) {
        setMesajlar(prev => [...prev, {
          rol: 'bot',
          metin: `🎉 Kaydedildi!\n\n${onay.tur === 'gelir' ? '+' : '-'}₺${parseFloat(onay.tutar).toLocaleString('tr-TR')} — ${onay.aciklama}\n📅 ${onay.tarih}\n🏦 ${onay.hesap_adi_gosterim}`
        }])
        setOnay(null)
        if (onIslemEklendi) onIslemEklendi()
      } else {
        setMesajlar(prev => [...prev, { rol: 'bot', metin: '❌ Kayıt sırasında hata oluştu.' }])
      }
    }
  }

  const islemReddet = () => {
    setOnay(null)
    setMesajlar(prev => [...prev, { rol: 'bot', metin: '↩️ İptal edildi. Tekrar yazabilirsiniz.' }])
  }

  const onayDetaylar = () => {
    if (!onay) return []

    if (onay.tur === 'kk_alisveris') {
  return [
    { label: 'Kart', deger: onay.hesap_adi_gosterim },
    { label: 'Tutar', deger: `-₺${parseFloat(onay.tutar).toLocaleString('tr-TR')}`, renk: '#ff6b6b' },
    { label: 'Kategori', deger: onay.kategori },
    { label: 'Açıklama', deger: onay.aciklama },
    { label: 'Taksit', deger: onay.taksitli ? `${onay.taksit_sayisi} taksit (aylık ₺${(parseFloat(onay.tutar)/parseInt(onay.taksit_sayisi)).toLocaleString('tr-TR', {minimumFractionDigits: 0})})` : 'Tek çekim' },
    { label: 'Tarih', deger: onay.tarih },
  ]
}

    if (onay.tur === 'transfer') {
      return [
        { label: 'Kaynak Hesap', deger: onay.hesap_adi_gosterim },
        { label: 'Hedef Hesap', deger: onay.hedef_hesap_adi || '?' },
        { label: 'Tutar', deger: `₺${parseFloat(onay.tutar).toLocaleString('tr-TR')}`, renk: '#45b7d1' },
        { label: 'Tarih', deger: onay.tarih },
      ]
    }

    if (onay.tur === 'borc_odeme') {
  return [
    { label: 'Kaynak Hesap', deger: onay.hesap_adi_gosterim },
    { label: 'Kredi Kartı', deger: onay.kart_adi || '?' },
    { label: 'Tutar', deger: `₺${parseFloat(onay.tutar).toLocaleString('tr-TR')}`, renk: '#ff6b6b' },
    { label: 'Tarih', deger: onay.tarih },
  ]
}
    if (onay.tur === 'yatirim') {
      return [
        { label: 'Hesap', deger: onay.hesap_adi_gosterim },
        { label: 'Yatırım Adı', deger: onay.aciklama },
        { label: 'Yatırım Türü', deger: onay.yatirim_turu || 'Hisse' },
        { label: 'Miktar', deger: onay.miktar ? `${onay.miktar} adet` : '—' },
        { label: 'Tutar', deger: `₺${parseFloat(onay.tutar).toLocaleString('tr-TR')}`, renk: '#ffd93d' },
        { label: 'Tarih', deger: onay.tarih },
      ]
    }
    return [
      { label: 'Hesap', deger: onay.hesap_adi_gosterim },
      { label: 'Tutar', deger: `${onay.tur === 'gelir' ? '+' : '-'}₺${parseFloat(onay.tutar).toLocaleString('tr-TR')}`, renk: onay.tur === 'gelir' ? '#4ecca3' : '#ff6b6b' },
      { label: 'Tür', deger: onay.tur },
      { label: 'Kategori', deger: onay.kategori },
      { label: 'Açıklama', deger: onay.aciklama },
      { label: 'Tarih', deger: onay.tarih },
    ]
  }

  return (
    <>
      <button style={styles.chatButon} onClick={() => setAcik(!acik)}>
        {acik ? '✕' : '💬'}
      </button>

      {acik && (
        <div style={styles.chatKutu}>
          <div style={styles.baslik}>
            <div style={styles.baslikSol}>
              <span style={{ fontSize: '20px' }}>🤖</span>
              <div>
                <div style={styles.baslikAd}>Finkod Asistan</div>
                <div style={styles.baslikAlt}>Groq AI ile çalışıyor</div>
              </div>
            </div>
            <button style={styles.kapat} onClick={() => setAcik(false)}>✕</button>
          </div>

          <div style={styles.mesajlar}>
            {mesajlar.map((m, i) => (
              <div key={i} style={{ ...styles.mesajSatir, justifyContent: m.rol === 'kullanici' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  ...styles.mesajBalon,
                  background: m.rol === 'kullanici' ? 'linear-gradient(135deg, #4ecca3, #38b2ac)' : '#1e293b',
                  color: m.rol === 'kullanici' ? '#0f172a' : '#fff',
                  borderRadius: m.rol === 'kullanici' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                }}>
                  {m.metin.split('\n').map((s, j) => (
                    <span key={j}>{s}{j < m.metin.split('\n').length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}

            {onay && (
              <div style={styles.onayKart}>
                <div style={styles.onayBaslik}>📋 İşlem Detayları</div>
                <div style={styles.onayDetay}>
                  {onayDetaylar().map((r, i) => (
                    <div key={i} style={styles.onayRow}>
                      <span style={styles.onayLabel}>{r.label}</span>
                      <span style={{ ...styles.onayDeger, color: r.renk || '#fff', fontWeight: r.renk ? 'bold' : 'normal' }}>{r.deger}</span>
                    </div>
                  ))}
                </div>
                <div style={styles.onayBtnler}>
                  <button style={styles.reddetBtn} onClick={islemReddet}>✕ İptal</button>
                  <button style={styles.onaylaBtn} onClick={islemOnayla}>✓ Onayla</button>
                </div>
              </div>
            )}

            {yukleniyor && (
              <div style={{ ...styles.mesajSatir, justifyContent: 'flex-start' }}>
                <div style={{ ...styles.mesajBalon, background: '#1e293b', color: '#fff' }}>
                  ⏳ Analiz ediliyor...
                </div>
              </div>
            )}
            <div ref={mesajSonuRef} />
          </div>

          <div style={styles.girisAlani}>
            <input
              style={styles.girisInput}
              placeholder="İşlem yazın..."
              value={girdi}
              onChange={e => setGirdi(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && mesajGonder()}
              disabled={yukleniyor}
            />
            <button style={styles.gonderBtn} onClick={mesajGonder} disabled={yukleniyor || !girdi.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const styles = {
  chatButon: { position: 'fixed', bottom: '24px', right: '24px', width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #4ecca3, #38b2ac)', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(78,204,163,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  chatKutu: { position: 'fixed', bottom: '90px', right: '24px', width: '360px', height: '520px', background: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  baslik: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'rgba(78,204,163,0.1)', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  baslikSol: { display: 'flex', alignItems: 'center', gap: '10px' },
  baslikAd: { color: '#fff', fontSize: '14px', fontWeight: 'bold' },
  baslikAlt: { color: 'rgba(255,255,255,0.4)', fontSize: '11px' },
  kapat: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '16px' },
  mesajlar: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  mesajSatir: { display: 'flex' },
  mesajBalon: { maxWidth: '80%', padding: '10px 14px', fontSize: '13px', lineHeight: '1.5' },
  onayKart: { background: '#1e293b', borderRadius: '12px', padding: '14px', border: '1px solid rgba(78,204,163,0.3)', margin: '4px 0' },
  onayBaslik: { color: '#4ecca3', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' },
  onayDetay: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' },
  onayRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  onayLabel: { color: 'rgba(255,255,255,0.4)', fontSize: '12px' },
  onayDeger: { color: '#fff', fontSize: '12px' },
  onayBtnler: { display: 'flex', gap: '8px' },
  reddetBtn: { flex: 1, padding: '8px', background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '8px', color: '#ff6b6b', cursor: 'pointer', fontSize: '13px' },
  onaylaBtn: { flex: 1, padding: '8px', background: 'linear-gradient(135deg,#4ecca3,#38b2ac)', border: 'none', borderRadius: '8px', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
  girisAlani: { display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#0f172a' },
  girisInput: { flex: 1, padding: '10px 14px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none' },
  gonderBtn: { width: '40px', height: '40px', background: 'linear-gradient(135deg,#4ecca3,#38b2ac)', border: 'none', borderRadius: '10px', color: '#0f172a', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' },
}

export default ChatBot