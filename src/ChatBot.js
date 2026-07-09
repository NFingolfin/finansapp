import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { kesimTarihiHesapla, sonOdemeHesapla, tarihStr, borcAdiOlustur } from './kkutils'

function ChatBot({ session, onIslemEklendi }) {
  const [acik, setAcik] = useState(false)
  const [mesajlar, setMesajlar] = useState([
    {
      rol: 'bot',
      metin: '👋 Merhaba! İşlem eklemek için yazabilirsiniz.\n\nÖrnek:\n• "İş bankasından 500 tl market"\n• "Maaş geldi 25000 tl"\n• "Garanti kartıyla 1200 tl ayakkabı 3 taksit"\n• "İş bankasından garantiye 3000 tl transfer"\n• "Yapı kredi yatırımdan 50 adet THYAO aldım 5000 tl"\n• "İş bankasından garanti kartına 8000 tl ödeme"'
    }
  ])
  const [girdi, setGirdi] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [onay, setOnay] = useState(null)
  const [hesaplar, setHesaplar] = useState([])
  const mesajSonuRef = useRef(null)
  // Sohbet geçmişi — AI'a önceki konuşmayı da gönderiyoruz
  const gecmisRef = useRef([])

  useEffect(() => {
    if (acik) hesaplariGetir()
  }, [acik]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mesajSonuRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mesajlar])

  const hesaplariGetir = async () => {
    const { data } = await supabase
      .from('hesaplar')
      .select('id, ad, tur, bakiye, para_birimi, kesim_gunu, yatirim_hesabi')
      .eq('user_id', session.user.id)
    if (data) setHesaplar(data)
  }

  // Hesap adından hesap objesini bul (kısmi eşleşme destekli)
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

    // 3. Genel kısmi eşleşme
    hesap = hesaplar.find(h =>
      h.ad.toLowerCase().includes(arananKucuk) ||
      arananKucuk.includes(h.ad.toLowerCase())
    )
    return hesap
  }

  // JSON yanıtını güvenli biçimde parse et
  const jsonParse = (metin) => {
    // Önce ```json blokları temizle
    let temiz = metin.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

    // Metinden ilk JSON objesini çıkar (model bazen açıklama ekler)
    const jsonMatch = temiz.match(/\{[\s\S]*\}/)
    if (jsonMatch) temiz = jsonMatch[0]

    return JSON.parse(temiz)
  }

  const tarihGoster = (tarih) => {
    if (!tarih) return '—'
    if (typeof tarih === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tarih)) {
      const [yil, ay, gun] = tarih.split('-').map(Number)
      return new Date(yil, ay - 1, gun).toLocaleDateString('tr-TR')
    }
    const parsed = new Date(tarih)
    return Number.isNaN(parsed.getTime()) ? tarih : parsed.toLocaleDateString('tr-TR')
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

      // ── TEMİZ VE DOĞRU YAPILANDIRILMIŞ SYSTEM PROMPT ──
      const systemPrompt = `Sen bir Türk finans asistanısın. Kullanıcının yazdığı metni analiz edip işlem bilgilerini JSON formatında döndür.
SADECE JSON döndür. Başka hiçbir açıklama, not veya markdown kullanma.

Mevcut hesaplar: ${hesapListesi}
Bugünün tarihi: ${bugun}

=== HESAP EŞLEŞTİRME ===
- "iş bankası" veya "iş bk" → banka hesabı (kredi kartı değil)
- "kart" veya "kredi" içeriyorsa → kredi kartı hesabını seç
- "garanti" → banka hesabı (kredi kartı değil)
- Tam isim eşleşmesi kısmi eşleşmeye göre önceliklidir

=== İŞLEM TÜRLERİ ===
- "gelir"     : Maaş, kira, faiz, temettü, freelance gibi gelirler
- "gider"     : Market, fatura, yemek, ulaşım, kira gideri gibi nakit harcamalar
- "transfer"  : İki hesap arası para hareketi
- "kk_alisveris" : Kredi kartıyla yapılan alışveriş (borcu kartın üstüne yüklenir)
- "borc_odeme"   : Kredi kartı borcunu banka hesabından ödemek
- "borc_ekle"    : Kredi, kişisel borç veya taksitli borç kaydı oluşturmak
- "yatirim"   : Hisse, kripto, fon, döviz, altın alımı

=== KATEGORİLER ===
Zaruri, Keyfi, Market, Fatura, Ulaşım, Sağlık, Eğlence, Giyim, Maaş, Kira, Borç Ödemesi, Yatırım, Diğer

=== JSON FORMAT 1 — Gelir / Gider ===
{"anlasilan":"kısa açıklama","islem":{"hesap_adi":"hesap adı","tutar":500,"tur":"gider","kategori":"Market","aciklama":"market alışverişi","tarih":"${bugun}"}}

=== JSON FORMAT 2 — Transfer ===
hesap_adi = paranın ÇIKTIĞI hesap, hedef_hesap_adi = paranın GİRDİĞİ hesap
{"anlasilan":"kısa açıklama","islem":{"hesap_adi":"kaynak hesap","hedef_hesap_adi":"hedef hesap","tutar":3000,"tur":"transfer","aciklama":"transfer","tarih":"${bugun}"}}

=== JSON FORMAT 3 — KK Alışveriş ===
Taksitli değilse taksitli=false, taksit_sayisi=1 yaz.
{"anlasilan":"kısa açıklama","islem":{"hesap_adi":"kart adı","tutar":1200,"tur":"kk_alisveris","kategori":"Giyim","aciklama":"ayakkabı","taksitli":false,"taksit_sayisi":1,"tarih":"${bugun}"}}

=== JSON FORMAT 4 — Borç Ödeme ===
hesap_adi = parayı ödeyen banka hesabı, kart_adi = borcun ödendiği kredi kartı
{"anlasilan":"kısa açıklama","islem":{"hesap_adi":"banka hesabı","kart_adi":"kredi kartı adı","tutar":5000,"tur":"borc_odeme","aciklama":"kredi kartı ödemesi","tarih":"${bugun}"}}

=== JSON FORMAT 5 — Borç Ekle ===
Kullanıcı "borç aldım", "kredi çektim", "12 taksit borcum var" diyorsa borc_ekle kullan. Kredi kartı alışverişi değilse kk_alisveris kullanma.
borc_turu değerleri: İhtiyaç Kredisi, Konut Kredisi, Taşıt Kredisi, Diğer
{"anlasilan":"kısa açıklama","islem":{"tur":"borc_ekle","ad":"ihtiyaç kredisi","borc_turu":"İhtiyaç Kredisi","banka":"banka adı","toplam_borc":120000,"kalan_borc":120000,"taksitli":true,"taksit_sayisi":12,"aylik_taksit":10000,"minimum_odeme":10000,"son_odeme_tarihi":"${bugun}","aciklama":"ihtiyaç kredisi"}}

=== JSON FORMAT 6 — Yatırım ===
aciklama = sadece sembol (THYAO, BTC, Altın), miktar = adet sayısı. tutar = toplam ödenen tutar. birim_maliyet biliniyorsa yaz, bilinmiyorsa boş bırakma; tutar/miktar hesapla. komisyon yoksa 0 yaz. para_birimi TRY, USD, EUR veya GBP olabilir.
yatirim_turu değerleri: Hisse, Kripto, Fon, Döviz, Altın, BES, Diğer
{"anlasilan":"kısa açıklama","islem":{"hesap_adi":"yatırım hesabı","tutar":5000,"tur":"yatirim","aciklama":"THYAO","yatirim_turu":"Hisse","miktar":50,"birim_maliyet":100,"komisyon":0,"para_birimi":"TRY","tarih":"${bugun}"}}

=== ANLAMAZSAN ===
{"anlasilan":"ne anlamadığını kısa açıkla","islem":null}`

      // Sohbet geçmişini AI'a gönder (max son 6 mesaj)
      const gecmis = gecmisRef.current.slice(-6)

      const { data, error } = await supabase.functions.invoke('chatbot', {
        body: {
          messages: [
            { role: 'system', content: systemPrompt },
            ...gecmis,
            { role: 'user', content: kullaniciMesaj }
          ]
        }
      })

      if (error) throw new Error(error.message || 'Chatbot servisine ulaşılamadı.')

      const yanitMetni = data?.content || ''
      if (!yanitMetni) throw new Error(data?.error || 'AI yanıtı boş döndü.')

      // Geçmişe ekle
      gecmisRef.current = [
        ...gecmisRef.current,
        { role: 'user', content: kullaniciMesaj },
        { role: 'assistant', content: yanitMetni }
      ]

      let yanit
      try {
        yanit = jsonParse(yanitMetni)
      } catch {
        throw new Error('AI yanıtı JSON formatında değil. Lütfen tekrar deneyin.')
      }

      if (yanit.islem) {
        const hesap = hesapBul(yanit.islem.hesap_adi)
        // Transfer için hedef hesabı da resolve et
        const hedefHesap = yanit.islem.hedef_hesap_adi
          ? hesapBul(yanit.islem.hedef_hesap_adi)
          : null

        setOnay({
          ...yanit.islem,
          hesap_id: hesap?.id || null,
          hesap_adi_gosterim: hesap?.ad || yanit.islem.hesap_adi,
          // Transfer hedef hesabını resolve edilmiş haliyle sakla
          hedef_hesap_id: hedefHesap?.id || null,
          hedef_hesap_adi_gosterim: hedefHesap?.ad || yanit.islem.hedef_hesap_adi,
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
        metin: '❌ Hata: ' + (e.message || 'Bilinmeyen hata')
      }])
    }

    setYukleniyor(false)
  }

  const islemOnayla = async () => {
    if (onay?.tur !== 'borc_ekle' && !onay?.hesap_id) {
      setMesajlar(prev => [...prev, {
        rol: 'bot',
        metin: '❌ Hesap bulunamadı. Hesap adını daha açık belirtin.\n\nMevcut hesaplar: ' +
          hesaplar.map(h => h.ad).join(', ')
      }])
      setOnay(null)
      return
    }

    // ── Borç Ekle ──
    if (onay.tur === 'borc_ekle') {
      const toplamBorc = parseFloat(onay.toplam_borc || onay.tutar)
      const taksitSayisi = parseInt(onay.taksit_sayisi) || 1
      const taksitli = Boolean(onay.taksitli || taksitSayisi > 1)
      const aylikTaksit = taksitli
        ? (parseFloat(onay.aylik_taksit) || (toplamBorc / taksitSayisi))
        : 0
      const minimumOdeme = parseFloat(onay.minimum_odeme) || aylikTaksit || 0

      const { error } = await supabase.from('borclar').insert({
        user_id: session.user.id,
        ad: onay.aciklama || onay.ad || 'Borç',
        tur: onay.borc_turu || 'İhtiyaç Kredisi',
        banka: onay.banka || '',
        notlar: onay.notlar || '',
        faiz_orani: parseFloat(onay.faiz_orani) || 0,
        son_odeme_tarihi: onay.son_odeme_tarihi || onay.tarih || null,
        aktif: true,
        taksitli,
        odenen_tutar: 0,
        toplam_borc: toplamBorc,
        kalan_borc: parseFloat(onay.kalan_borc) || toplamBorc,
        minimum_odeme: minimumOdeme,
        taksit_sayisi: taksitSayisi,
        odenen_taksit: 0,
        aylik_taksit: aylikTaksit
      })

      if (!error) {
        setMesajlar(prev => [...prev, {
          rol: 'bot',
          metin: `🎉 Borç kaydedildi!\n\n${onay.aciklama || onay.ad || 'Borç'} — ₺${toplamBorc.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }])
        setOnay(null)
        if (onIslemEklendi) onIslemEklendi()
      } else {
        setMesajlar(prev => [...prev, { rol: 'bot', metin: '❌ Borç kaydı sırasında hata oluştu.' }])
      }

    // ── Transfer ──
    } else if (onay.tur === 'transfer') {
      // Önce resolve edilmiş id'yi dene, olmazsa isimle tekrar bul
      const hedefHesap = onay.hedef_hesap_id
        ? hesaplar.find(h => h.id === onay.hedef_hesap_id)
        : hesapBul(onay.hedef_hesap_adi)

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
          metin: `🎉 Transfer tamamlandı!\n\n₺${parseFloat(onay.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n🏦 ${onay.hesap_adi_gosterim} → ${hedefHesap.ad}\n📅 ${tarihGoster(onay.tarih)}`
        }])
        setOnay(null)
        if (onIslemEklendi) onIslemEklendi()
      } else {
        setMesajlar(prev => [...prev, { rol: 'bot', metin: '❌ Transfer sırasında hata oluştu.' }])
      }

    // ── KK Alışveriş ──
    } else if (onay.tur === 'kk_alisveris') {
      const { data: yeniIslem, error } = await supabase.from('islemler').insert({
        user_id: session.user.id,
        hesap_id: onay.hesap_id,
        tarih: onay.tarih,
        tutar: parseFloat(onay.tutar),
        tur: 'gider',
        kategori: onay.kategori || 'Diğer',
        aciklama: onay.aciklama
      }).select('id').single()

      if (!error) {
        const kartAdi = onay.hesap_adi_gosterim
        const kartHesap = hesaplar.find(h => h.id === onay.hesap_id)
        const tutar = parseFloat(onay.tutar)
        const kesimGunu = kartHesap?.kesim_gunu || 1
        const kesimTarihi = kesimTarihiHesapla(onay.tarih, kesimGunu)
        const sonOdeme = sonOdemeHesapla(kesimTarihi)
        const sonOdemeStr = tarihStr(sonOdeme)
        let baglanacakBorcId = null
        if (onay.taksitli && parseInt(onay.taksit_sayisi) > 1) {
          // Taksitli borç
          const aylikTaksit = tutar / parseInt(onay.taksit_sayisi)

          const { data: yeniBorc } = await supabase.from('borclar').insert({
            user_id: session.user.id,
            ad: `${onay.aciklama} (${onay.taksit_sayisi} taksit)`,
            tur: 'Kredi Kartı',
            banka: kartAdi,
            toplam_borc: tutar,
            kalan_borc: tutar,
            aylik_taksit: aylikTaksit,
            minimum_odeme: aylikTaksit,
            taksit_sayisi: parseInt(onay.taksit_sayisi),
            odenen_taksit: 0,
            taksitli: true,
            son_odeme_tarihi: sonOdemeStr,
            aktif: true,
            odenen_tutar: 0  // ✅ düzeltildi (odened → odenen)
          }).select('id').single()
          baglanacakBorcId = yeniBorc?.id
        } else {
          // Taksitsiz — o ayın borcuna ekle
          const borcAdi = borcAdiOlustur(kartAdi, sonOdeme)

          const { data: mevcutBorc } = await supabase
            .from('borclar')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('banka', kartAdi)
            .eq('son_odeme_tarihi', sonOdemeStr)
            .eq('taksitli', false)
            .eq('aktif', true)
            .maybeSingle()

          if (mevcutBorc) {
            await supabase.from('borclar').update({
              kalan_borc: parseFloat(mevcutBorc.kalan_borc || 0) + tutar,
              toplam_borc: parseFloat(mevcutBorc.toplam_borc || 0) + tutar,
              minimum_odeme: parseFloat(mevcutBorc.minimum_odeme || 0) + tutar,
            }).eq('id', mevcutBorc.id)
            baglanacakBorcId = mevcutBorc.id
          } else {
            const { data: yeniBorc } = await supabase.from('borclar').insert({
              user_id: session.user.id,
              ad: borcAdi,
              tur: 'Kredi Kartı',
              banka: kartAdi,
              toplam_borc: tutar,
              kalan_borc: tutar,
              minimum_odeme: tutar,
              taksit_sayisi: 1,
              odenen_taksit: 0,
              taksitli: false,
              son_odeme_tarihi: sonOdemeStr,
              aktif: true,
              odenen_tutar: 0,  // ✅ düzeltildi
              aylik_taksit: 0
            }).select('id').single()
            baglanacakBorcId = yeniBorc?.id
          }
        }

        if (baglanacakBorcId && yeniIslem?.id) {
          await supabase.from('islemler')
            .update({ borc_id: baglanacakBorcId })
            .eq('id', yeniIslem.id)
        }

        setMesajlar(prev => [...prev, {
          rol: 'bot',
          metin: `🎉 Kaydedildi!\n\n💳 ${onay.aciklama} — ₺${parseFloat(onay.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n${
            onay.taksitli && parseInt(onay.taksit_sayisi) > 1
              ? `📋 ${onay.taksit_sayisi} taksit (aylık ₺${(parseFloat(onay.tutar) / parseInt(onay.taksit_sayisi)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
              : '💳 Tek çekim'
          }\n🏦 ${kartAdi}\n📅 ${tarihGoster(onay.tarih)}`
        }])
        setOnay(null)
        if (onIslemEklendi) onIslemEklendi()
      } else {
        setMesajlar(prev => [...prev, { rol: 'bot', metin: '❌ Kayıt sırasında hata oluştu.' }])
      }

    // ── Borç Ödeme ──
    } else if (onay.tur === 'borc_odeme') {
      const kartHesap = onay.hedef_hesap_id
        ? hesaplar.find(h => h.id === onay.hedef_hesap_id)
        : hesapBul(onay.kart_adi)

      if (!kartHesap) {
        setMesajlar(prev => [...prev, {
          rol: 'bot',
          metin: '❌ Kredi kartı hesabı bulunamadı.\n\nMevcut hesaplar: ' + hesaplar.map(h => h.ad).join(', ')
        }])
        setOnay(null)
        return
      }

      const odemeTutari = parseFloat(onay.tutar)
      const { data: kaynakVeri } = await supabase
        .from('hesaplar')
        .select('bakiye')
        .eq('id', onay.hesap_id)
        .maybeSingle()
      const { data: kartVeri } = await supabase
        .from('hesaplar')
        .select('bakiye')
        .eq('id', kartHesap.id)
        .maybeSingle()
      const kaynakBakiye = parseFloat(kaynakVeri?.bakiye || 0)
      const kartBakiye = parseFloat(kartVeri?.bakiye || 0)

      // Banka hesabından gider
      const { error: e1 } = await supabase.from('islemler').insert({
        user_id: session.user.id,
        hesap_id: onay.hesap_id,
        tarih: onay.tarih,
        tutar: odemeTutari,
        tur: 'gider',
        kategori: 'Borç Ödemesi',
        aciklama: `${kartHesap.ad} ödemesi`,
        is_borc_odeme: true,
        borc_id: null
      })

      // Kredi kartına gelir (borç azalması)
      const { data: kartOdemeIslem, error: e2 } = await supabase.from('islemler').insert({
        user_id: session.user.id,
        hesap_id: kartHesap.id,
        tarih: onay.tarih,
        tutar: odemeTutari,
        tur: 'gelir',
        kategori: 'Borç Ödemesi',
        aciklama: `Borç ödemesi ← ${onay.hesap_adi_gosterim}`,
        is_borc_odeme: false
      }).select('id').single()

      // Borçlar tablosunda aktif borcu düş
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
        const odenecek = odemeTutari
        const yeniKalan = Math.max(0, parseFloat(borc.kalan_borc) - odenecek)
        const yeniOdenen = (parseFloat(borc.odenen_tutar) || 0) + odenecek
        const bitti = yeniKalan <= 0

        const guncelleme = { kalan_borc: yeniKalan, odenen_tutar: yeniOdenen, aktif: !bitti }

        if (borc.taksitli && borc.aylik_taksit) {
          const odenenTaksit = Math.floor(yeniOdenen / parseFloat(borc.aylik_taksit))
          guncelleme.odenen_taksit = Math.min(odenenTaksit, borc.taksit_sayisi)
          if (!bitti && borc.son_odeme_tarihi) {
            const t = new Date(borc.son_odeme_tarihi)
            t.setMonth(t.getMonth() + 1)
            guncelleme.son_odeme_tarihi = t.toISOString().split('T')[0]
          }
        }

        await supabase.from('borclar').update(guncelleme).eq('id', borc.id)
        if (kartOdemeIslem?.id) {
          await supabase.from('islemler')
            .update({ borc_id: borc.id })
            .eq('id', kartOdemeIslem.id)
        }
      }

      // Kaynak hesap bakiyesinden düş
      await supabase.from('hesaplar')
        .update({ bakiye: kaynakBakiye - odemeTutari })
        .eq('id', onay.hesap_id)
      await supabase.from('hesaplar')
        .update({ bakiye: kartBakiye + odemeTutari })
        .eq('id', kartHesap.id)

      if (!e1 && !e2) {
        setMesajlar(prev => [...prev, {
          rol: 'bot',
          metin: `🎉 Borç ödemesi tamamlandı!\n\n₺${parseFloat(onay.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n🏦 ${onay.hesap_adi_gosterim} → ${kartHesap.ad}\n📅 ${tarihGoster(onay.tarih)}`
        }])
        setOnay(null)
        if (onIslemEklendi) onIslemEklendi()
      } else {
        setMesajlar(prev => [...prev, { rol: 'bot', metin: '❌ Ödeme sırasında hata oluştu.' }])
      }

    // ── Yatırım ──
    } else if (onay.tur === 'yatirim') {
      const miktar = parseFloat(onay.miktar) || 1
      const toplamMaliyet = parseFloat(onay.tutar)
      const komisyon = parseFloat(onay.komisyon) || 0
      const yatirimHesap = hesaplar.find(h => h.id === onay.hesap_id)
      const paraBirimi = onay.para_birimi || yatirimHesap?.para_birimi || 'TRY'
      const birimMaliyet = parseFloat(onay.birim_maliyet) || ((toplamMaliyet - komisyon) / miktar)
      const birimFiyat = parseFloat(onay.birim_fiyat) || birimMaliyet
      const guncelDeger = parseFloat(onay.guncel_deger) || (birimFiyat * miktar)
      const { error } = await supabase.from('yatirimlar').insert({
        user_id: session.user.id,
        ad: onay.aciklama,
        tur: onay.yatirim_turu || 'Hisse',
        miktar: miktar,
        birim_maliyet: birimMaliyet,
        komisyon: komisyon,
        maliyet: toplamMaliyet,
        guncel_deger: guncelDeger,
        birim_fiyat: birimFiyat,
        para_birimi: paraBirimi,
        hesap_id: onay.hesap_id
      })

      if (!error) {
        await supabase.from('islemler').insert({
          user_id: session.user.id,
          hesap_id: onay.hesap_id,
          tarih: onay.tarih,
          tutar: toplamMaliyet,
          tur: 'gider',
          kategori: 'Yatırım',
          aciklama: `${onay.aciklama} alımı (${miktar} adet)`
        })
        if (yatirimHesap) {
          await supabase.from('hesaplar')
            .update({ bakiye: parseFloat(yatirimHesap.bakiye || 0) - toplamMaliyet })
            .eq('id', yatirimHesap.id)
        }
        setMesajlar(prev => [...prev, {
          rol: 'bot',
          metin: `🎉 Yatırım kaydedildi!\n\n📈 ${onay.aciklama}${miktar ? ` (${miktar} adet)` : ''} — ₺${parseFloat(onay.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n📅 ${tarihGoster(onay.tarih)}\n🏦 ${onay.hesap_adi_gosterim}`
        }])
        setOnay(null)
        if (onIslemEklendi) onIslemEklendi()
      } else {
        setMesajlar(prev => [...prev, { rol: 'bot', metin: '❌ Yatırım kaydı sırasında hata oluştu.' }])
      }

    // ── Gelir / Gider ──
    } else {
      const { error } = await supabase.from('islemler').insert({
        user_id: session.user.id,
        hesap_id: onay.hesap_id,
        tarih: onay.tarih,
        tutar: parseFloat(onay.tutar),
        tur: onay.tur,
        kategori: onay.kategori || 'Diğer',
        aciklama: onay.aciklama
      })

      if (!error) {
        setMesajlar(prev => [...prev, {
          rol: 'bot',
          metin: `🎉 Kaydedildi!\n\n${onay.tur === 'gelir' ? '+' : '-'}₺${parseFloat(onay.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — ${onay.aciklama}\n📅 ${tarihGoster(onay.tarih)}\n🏦 ${onay.hesap_adi_gosterim}`
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

    if (onay.tur === 'borc_ekle') {
      return [
        { label: 'Borç Adı', deger: onay.aciklama || onay.ad || 'Borç' },
        { label: 'Borç Türü', deger: onay.borc_turu || 'İhtiyaç Kredisi' },
        { label: 'Banka', deger: onay.banka || '—' },
        { label: 'Toplam Borç', deger: `₺${parseFloat(onay.toplam_borc || onay.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, renk: '#ff6b6b' },
        { label: 'Taksit', deger: onay.taksitli || parseInt(onay.taksit_sayisi) > 1 ? `${onay.taksit_sayisi || 1} taksit` : 'Taksitsiz' },
        { label: 'Son Ödeme', deger: tarihGoster(onay.son_odeme_tarihi || onay.tarih) },
      ]
    }

    if (onay.tur === 'kk_alisveris') {
      return [
        { label: 'Kart', deger: onay.hesap_adi_gosterim },
        { label: 'Tutar', deger: `-₺${parseFloat(onay.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, renk: '#ff6b6b' },
        { label: 'Kategori', deger: onay.kategori || 'Diğer' },
        { label: 'Açıklama', deger: onay.aciklama },
        {
          label: 'Taksit',
          deger: onay.taksitli && parseInt(onay.taksit_sayisi) > 1
            ? `${onay.taksit_sayisi} taksit (aylık ₺${(parseFloat(onay.tutar) / parseInt(onay.taksit_sayisi)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
            : 'Tek çekim'
        },
        { label: 'Tarih', deger: tarihGoster(onay.tarih) },
      ]
    }

    if (onay.tur === 'transfer') {
      return [
        { label: 'Kaynak Hesap', deger: onay.hesap_adi_gosterim },
        // ✅ Resolve edilmiş hedef hesap adı gösteriliyor
        { label: 'Hedef Hesap', deger: onay.hedef_hesap_adi_gosterim || onay.hedef_hesap_adi || '?' },
        { label: 'Tutar', deger: `₺${parseFloat(onay.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, renk: '#45b7d1' },
        { label: 'Tarih', deger: tarihGoster(onay.tarih) },
      ]
    }

    if (onay.tur === 'borc_odeme') {
      return [
        { label: 'Kaynak Hesap', deger: onay.hesap_adi_gosterim },
        { label: 'Kredi Kartı', deger: onay.kart_adi || '?' },
        { label: 'Tutar', deger: `-₺${parseFloat(onay.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, renk: '#ff6b6b' },
        { label: 'Tarih', deger: tarihGoster(onay.tarih) },
      ]
    }

    if (onay.tur === 'yatirim') {
      return [
        { label: 'Hesap', deger: onay.hesap_adi_gosterim },
        { label: 'Yatırım Adı', deger: onay.aciklama },
        { label: 'Yatırım Türü', deger: onay.yatirim_turu || 'Hisse' },
        { label: 'Miktar', deger: onay.miktar ? `${onay.miktar} adet` : '—' },
        { label: 'Birim Maliyet', deger: onay.birim_maliyet ? `${onay.para_birimi || 'TRY'} ${parseFloat(onay.birim_maliyet).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Otomatik' },
        { label: 'Komisyon', deger: `${onay.para_birimi || 'TRY'} ${(parseFloat(onay.komisyon) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Para Birimi', deger: onay.para_birimi || 'TRY' },
        { label: 'Tutar', deger: `₺${parseFloat(onay.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, renk: '#ffd93d' },
        { label: 'Tarih', deger: tarihGoster(onay.tarih) },
      ]
    }

    return [
      { label: 'Hesap', deger: onay.hesap_adi_gosterim },
      {
        label: 'Tutar',
        deger: `${onay.tur === 'gelir' ? '+' : '-'}₺${parseFloat(onay.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        renk: onay.tur === 'gelir' ? '#4ecca3' : '#ff6b6b'
      },
      { label: 'Tür', deger: onay.tur === 'gelir' ? 'Gelir' : 'Gider' },
      { label: 'Kategori', deger: onay.kategori || '—' },
      { label: 'Açıklama', deger: onay.aciklama || '—' },
      { label: 'Tarih', deger: tarihGoster(onay.tarih) },
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
              <div style={styles.baslikAd}>Finkod Asistan</div>
            </div>
            <button style={styles.kapat} onClick={() => setAcik(false)}>✕</button>
          </div>

          <div style={styles.mesajlar}>
            {mesajlar.map((m, i) => (
              <div key={i} style={{ ...styles.mesajSatir, justifyContent: m.rol === 'kullanici' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  ...styles.mesajBalon,
                  background: m.rol === 'kullanici' ? 'linear-gradient(135deg, #4ecca3, #38b2ac)' : '#1e293b',
                  color: m.rol === 'kullanici' ? '#0f172a' : '#f1f5f9',
                  borderRadius: m.rol === 'kullanici' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                }}>
                  {m.metin.split('\n').map((s, j, arr) => (
                    <span key={j}>{s}{j < arr.length - 1 && <br />}</span>
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
                      <span style={{ ...styles.onayDeger, color: r.renk || '#f1f5f9', fontWeight: r.renk ? 'bold' : 'normal' }}>
                        {r.deger}
                      </span>
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
                <div style={{ ...styles.mesajBalon, background: '#1e293b', color: '#f1f5f9' }}>
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
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && mesajGonder()} // ✅ onKeyPress yerine onKeyDown
              disabled={yukleniyor}
            />
            <button
              style={{ ...styles.gonderBtn, opacity: yukleniyor || !girdi.trim() ? 0.4 : 1 }}
              onClick={mesajGonder}
              disabled={yukleniyor || !girdi.trim()}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const styles = {
  chatButon: {
    position: 'fixed', bottom: '24px', right: '24px',
    width: '56px', height: '56px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #4ecca3, #38b2ac)',
    border: 'none', fontSize: '24px', cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(78,204,163,0.4)',
    zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  chatKutu: {
    position: 'fixed', bottom: '90px', right: '24px',
    width: '360px', height: '540px',
    background: '#0f172a', borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    zIndex: 2000, display: 'flex', flexDirection: 'column', overflow: 'hidden'
  },
  baslik: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px',
    background: 'rgba(78,204,163,0.1)',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  baslikSol: { display: 'flex', alignItems: 'center', gap: '10px' },
  baslikAd: { color: '#fff', fontSize: '14px', fontWeight: 'bold' },
  kapat: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '16px' },
  mesajlar: { flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' },
  mesajSatir: { display: 'flex' },
  mesajBalon: { maxWidth: '82%', padding: '10px 14px', fontSize: '13px', lineHeight: '1.5', borderRadius: '18px' },
  onayKart: {
    background: '#1e293b', borderRadius: '12px', padding: '14px',
    border: '1px solid rgba(78,204,163,0.3)', margin: '2px 0'
  },
  onayBaslik: { color: '#4ecca3', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' },
  onayDetay: { display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '12px' },
  onayRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' },
  onayLabel: { color: 'rgba(255,255,255,0.45)', fontSize: '12px', flexShrink: 0 },
  onayDeger: { color: '#f1f5f9', fontSize: '12px', textAlign: 'right' },
  onayBtnler: { display: 'flex', gap: '8px' },
  reddetBtn: {
    flex: 1, padding: '8px',
    background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.3)',
    borderRadius: '8px', color: '#ff6b6b', cursor: 'pointer', fontSize: '13px'
  },
  onaylaBtn: {
    flex: 1, padding: '8px',
    background: 'linear-gradient(135deg,#4ecca3,#38b2ac)', border: 'none',
    borderRadius: '8px', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px'
  },
  girisAlani: {
    display: 'flex', gap: '8px', padding: '12px 14px',
    borderTop: '1px solid rgba(255,255,255,0.08)', background: '#0f172a'
  },
  girisInput: {
    flex: 1, padding: '10px 14px',
    background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none'
  },
  gonderBtn: {
    width: '40px', height: '40px',
    background: 'linear-gradient(135deg,#4ecca3,#38b2ac)', border: 'none',
    borderRadius: '10px', color: '#0f172a', fontSize: '16px',
    cursor: 'pointer', fontWeight: 'bold', transition: 'opacity 0.2s'
  },
}

export default ChatBot
