import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const { data: yatirimlar } = await supabase
      .from('yatirimlar')
      .select('*')
      .eq('user_id', user.id)

    const sonuclar = []

    for (const y of yatirimlar || []) {
      try {
        let yeniDeger = null
        let yeniBirimFiyat = null
        const miktar = parseFloat(y.miktar) || 0

        if (y.tur === 'Hisse') {
          const sembol = `${y.ad.toUpperCase()}.IS`
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sembol}?interval=1d&range=1d`
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
          const data = await res.json()
          const fiyat = data?.chart?.result?.[0]?.meta?.regularMarketPrice
          if (fiyat && miktar > 0) {
            yeniBirimFiyat = fiyat
            yeniDeger = fiyat * miktar
          }

        } else if (y.tur === 'Kripto') {
          const sembolMap: Record<string, string> = {
            'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana',
            'XRP': 'ripple', 'ADA': 'cardano', 'DOGE': 'dogecoin'
          }
          const coinId = sembolMap[y.ad.toUpperCase()]
          if (coinId) {
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=try`)
            const data = await res.json()
            const fiyat = data[coinId]?.try
            if (fiyat && miktar > 0) {
              yeniBirimFiyat = fiyat
              yeniDeger = fiyat * miktar
            }
          }

        } else if (y.tur === 'Döviz') {
          const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
          const data = await res.json()
          const usdTry = data.rates?.TRY || 0
          const dovizMap: Record<string, number> = {
            'USD': usdTry,
            'EUR': usdTry / data.rates?.EUR,
            'GBP': usdTry / data.rates?.GBP,
          }
          const fiyat = dovizMap[y.ad.toUpperCase()]
          if (fiyat && miktar > 0) {
            yeniBirimFiyat = fiyat
            yeniDeger = fiyat * miktar
          }

        } else if (y.tur === 'Altın') {
          const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
          const data = await res.json()
          const usdTry = data.rates?.TRY || 0
          const alRes = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          })
          const alData = await alRes.json()
          const onsUsd = alData?.chart?.result?.[0]?.meta?.regularMarketPrice
          if (onsUsd && miktar > 0) {
            yeniBirimFiyat = (onsUsd * usdTry) / 31.1035
            yeniDeger = yeniBirimFiyat * miktar
          }
        }

        if (yeniDeger && yeniBirimFiyat) {
          await supabase.from('yatirimlar').update({
            guncel_deger: yeniDeger,
            birim_fiyat: yeniBirimFiyat
          }).eq('id', y.id)
          sonuclar.push({ ad: y.ad, birim_fiyat: yeniBirimFiyat, guncel_deger: yeniDeger })
        }

      } catch (e) {
        console.error(`${y.ad} fiyatı alınamadı:`, e)
      }
    }

    return new Response(JSON.stringify({ basarili: true, guncellenen: sonuclar }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})