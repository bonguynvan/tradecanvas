import type { SiteMessages } from '../messages';

const tr: SiteMessages = {
  meta: {
    title: 'TradeCanvas · Web için Canvas alım satım grafikleri',
    description:
      'TradeCanvas, Canvas2D tabanlı bir alım satım grafiği kütüphanesidir: 17 grafik türü, 85 gösterge, 69 çizim aracı, canlı borsa akışları, grafik üzerinde emirler, tekrar ve geriye dönük test. Sıfır bağımlılık, MIT.',
  },

  nav: {
    main: 'Ana menü',
    docs: 'Belgeler',
    examples: 'Örnekler',
    playground: 'Deneme alanı',
    changelog: 'Değişiklik günlüğü',
    toLight: 'Açık temaya geç',
    toDark: 'Koyu temaya geç',
    github: 'GitHub’da TradeCanvas',
    openMenu: 'Menüyü aç',
    closeMenu: 'Menüyü kapat',
    menu: 'Menü',
    language: 'Dil',
  },

  footer: {
    tagline: 'Web için Canvas2D alım satım grafikleri. Sıfır bağımlılık, MIT lisanslı.',
    library: 'Kütüphane',
    packages: 'Paketler',
    project: 'Proje',
    gettingStarted: 'Başlarken',
    apiReference: 'API referansı',
    examples: 'Örnekler',
    changelog: 'Değişiklik günlüğü',
    issues: 'Sorun bildirimleri',
    boGrid: 'bo-grid (veri tablosu)',
    builtWith: 'TradeCanvas ile yapıldı',
  },

  home: {
    release: 'iki katmanlı canvas çizimi, serbest kaydırma',
    title: 'Alım satım uygulamaları için grafik motoru.',
    ledeHtml:
      'Mum grafiklerinden Renko’ya, 85 gösterge, 69 çizim aracı, canlı borsa akışları ve grafik üzerinde emirler. Canvas2D ile, sıfır bağımlılıkla çizilir. Hazır <code>ChartWidget</code>’ı ekleyin ya da kendi arayüzünüzü headless <code>Chart</code> üzerine kurun.',
    getStarted: 'Başlayın',
    browseExamples: 'Örneklere göz atın',
    specsLabel: 'Temel rakamlar',
    specs: [
      'grafik türü',
      'gösterge',
      'çizim aracı',
      'çalışma zamanı bağımlılığı',
      'gzip, headless çekirdek',
      'üzerine gelme karesi, 100k bar',
    ],
    hood: {
      eyebrow: 'Kaputun altında',
      title: 'Ölçülmüş, belgelenmiş, genişletmeye açık',
      subtitleHtml: 'Özellik Laboratuvarı’nın arkasındaki motor. Aşağıdaki her rakam <code>pnpm bench</code> ile yeniden üretilebilir.',
      frameBudget: 'Kare bütçesi',
      perf: [
        '100k barda 4 göstergeyle canlı tick',
        'sembol değişiminden sonra tam yeniden hesaplama, 100k bar',
        'LTTB ile örnek azaltma, 100k → 1600 nokta',
        'üzerine gelme karesi, 500’den 100k bara kadar sabit',
      ],
      perfFoot: 'Üst üste iki canvas: üzerine gelindiğinde yalnızca ince üst katman yeniden çizilir. Her çizici yalnızca ekrandaki barları dolaşır.',
      gestures: 'Hareketler',
      gestureList: [
        ['Sürükle', 'kaydır, son barın ötesine de'],
        ['Kaydırma', 'imleç etrafında yakınlaştır'],
        ['İki parmakla sıkıştır', 'dokunmatik ekranda yakınlaştır'],
        ['Sağa sürükle', 'ilerledikçe eski barlar yüklenir'],
        ['Ekseni sürükle', 'ekseni ölçekle'],
        ['Ctrl + sürükle', 'çizimleri seç'],
        ['Shift + sürükle', 'ölç'],
        ['Alt + tıkla', 'bilgi kutusunu sabitle'],
      ],
    },
    capabilities: [
      {
        label: 'Widget',
        title: 'Tek çağrıyla eksiksiz alım satım arayüzü',
        text: 'ChartWidget; araç çubuğunu, çizim kenar çubuğunu, izleme listesini, alarmları, nesne ağacını, veri penceresini, tekrarı ve komut paletini (Ctrl+K) İngilizce ve Vietnamca’dan Çince, Japonca ve Korece’ye kadar 14 dilde sunar.',
      },
      {
        label: 'Veri',
        title: 'Her türlü piyasa akışı',
        text: 'Binance, Coinbase, Bybit ve Kraken adaptörleri yerleşik; diğer her şey için WebSocketAdapter ve PollingAdapter. Geriye kaydırdıkça eski barlar yüklenir; bağlantı kendiliğinden yeniden kurulur ve geçersiz kalan sembol değişimleri atlanır.',
      },
      {
        label: 'Alım satım',
        title: 'Grafik üzerinde emirler',
        text: 'Demo broker içeren ExecutionAdapter, sürükleyerek emir oluşturma, braket emirleri, sürüklenebilir zarar durdur ve kâr al çizgileri, webhook’lara giden alarmlar ve masaüstü bildirimleri.',
      },
      {
        label: 'Framework’ler',
        title: 'React, Vue ve Svelte',
        text: '@tradecanvas/react, /vue ve /svelte aynı motoru reaktif, tipli prop’larla sarar. Tam Chart örneği her zaman tek bir ref uzağınızda.',
      },
      {
        label: 'Eklentiler',
        title: 'Her katmanı genişletin',
        text: 'Artımlı update() destekli özel göstergeleri, çizim araçlarını, grafik türlerini ve katmanları global olarak ya da grafik bazında kaydedin.',
      },
      {
        label: 'Analitik',
        title: 'Grafiğin yanında geriye dönük testler',
        text: 'Monte Carlo bantlarına sahip, bar bar ilerleyen bir Backtester ve ana iş parçacığını serbest bırakan bir Web Worker gösterge hattı.',
      },
    ],
    quickstart: {
      eyebrow: 'Hızlı başlangıç',
      title: 'Aynı grafik, beş farklı yol',
      subtitle: 'Eksiksiz widget, bir framework bileşeni ya da headless motor. Hepsi aynı çiziciyi paylaşır.',
      tabs: 'Hızlı başlangıç seçeneği',
    },
    closing: {
      title: 'Uygulamanıza bugün canlı bir grafik ekleyin.',
      readDocs: 'Belgeleri okuyun',
      star: 'GitHub’da yıldız verin',
    },
  },

  lab: {
    eyebrow: 'Özellik Laboratuvarı',
    title: 'Her özellik, canlı bir grafikte.',
    subtitleHtml:
      'Bir sahne seçin. Her sahne eksiksiz <code>ChartWidget</code>’ı tek bir alanın çalıştığını gösteren bir durumda açar; sonrası size kalmış: sürükleyin, çizin, değiştirin.',
    scenes: 'Özellik sahneleri',
    widgetLanguage: 'Widget dili',
    idle: 'Canlı grafiği başlatmak için buraya kaydırın',
    metricHint: 'Süreyi ölçmek için sembolü veya zaman dilimini değiştirin',
    metricSwitch: '→ {label}: {ms} · {bars} bar',
    metricSetData: 'setData({bars} bar): {ms}',
    tryThis: 'Bunu deneyin',
  },

  scenes: {
    drawings: {
      title: 'Çizim araçları',
      stat: '69 araç',
      blurb:
        'Kendi seviyelerinizi kullanabildiğiniz Fibonacci ve Gann araçları, Elliott dalgaları, harmonik formasyonlar, notlar ve fırçalar. Bir çizime çift tıklamak ayarlarını, sağ tıklamak menüsünü açar; alarmlar trend çizgilerini izler, Uzun/Kısa pozisyon aracı pozisyon büyüklüğünü hesaplar.',
      tryThis: [
        'Fibonacci düzeltmesine çift tıklayın ve seviyelerini düzenleyin',
        'Bir çizime sağ tıklayın: bir öne getirin, gruplayın ya da alarm ekleyin',
        'Fırçayı ya da yol aracını seçin; Enter bir yolu bitirir',
      ],
    },
    indicators: {
      title: 'Göstergeler',
      stat: '85 yerleşik',
      blurb:
        'Grafik üstü katmanlar ve paneller kütüphanenin kendi içinde hesaplanır, sıfır matematik bağımlılığı. Canlı tick’ler yalnızca oluşmakta olan barı yeniden hesaplar: 100k barda dört göstergeyle tick başına 0.001 ms.',
      tryThis: [
        'Göstergeler düğmesine (ya da Ctrl+K) basın ve 85 göstergeden herhangi birini arayın',
        'Açıklamadaki bir gösterge adına tıklayın: parametreler, renkler ve seviyeler',
        'Bir hareketli ortalamanın kaynağını başka bir göstergenin çizgisi yapın',
        'Panelleri yeniden boyutlandırmak için aralarındaki çizgiyi sürükleyin; bir panelin sağ üstündeki düğmeler onu taşır, daraltır veya büyütür',
        'Açıklama satırındaki ⋯, göstergeyi üstteki ya da alttaki panele veya kendine ait bir panele taşır',
        'Göstergeler menüsü → Göstergeleri şablon olarak kaydet…; Ctrl+Z gösterge değişikliklerini de geri alır',
        'Zaman dilimini değiştirmek için grafikte bir sayı yazın (4, sonra h, Enter); Alt+T trend çizgisini seçer',
      ],
    },
    trading: {
      title: 'Alım satım',
      stat: 'demo broker',
      blurb:
        'Grafikten yönettiğiniz emirler ve pozisyonlar: stopları ve hedefleri sürükleyin, çizgi üzerinden iptal edin, kapatın ya da ters çevirin; her gerçekleşen işlem kendi barında işaretlenir. Grafiğin altında bir emir formu ve bir hesap paneli bulunur; hepsi bir ExecutionAdapter üzerinden yönlendirilir, burada pakete dahil demo broker.',
      tryThis: [
        'Açık uzun pozisyonda ⇅ ile pozisyonu ters çevirin ya da × ile kapatın; gerçekleşen işlem kendi barında bir işaret olarak görünür',
        'Fiyatın altına sağ tıklayın: o fiyattan limit alış, stop satış ya da yeni emir',
        'Grafiğin altındaki hesap paneli pozisyonları K/Z’leriyle birlikte, emirleri ve geçmişi listeler',
        'Açık uzun pozisyonun SL / TP çizgilerini sürükleyin; broker onları günceller',
        'Fiyat ekseninin yanındaki + düğmesi o fiyata bir alarm, emir ya da çizgi eklemeyi sunar',
      ],
    },
    workspace: {
      title: 'Çalışma alanı',
      stat: 'çoklu grafik',
      blurb:
        'Yan yana iki grafik, artı imleçle bağlı; dilerseniz sembol, zaman dilimi, zaman ve çizimlerle de. Tüm çalışma alanını adlandırılmış bir düzen olarak kaydedin ve istediğiniz zaman ona geri dönün.',
      tryThis: [
        'Bir grafiğin üzerinde gezinin: diğeri aynı zamanı gösterir',
        'Eşitle çubuğunda Zaman dilimi seçeneğini açın, ardından bir grafiğin zaman dilimini değiştirin',
        'Çubukta dört grafik seçin; Sembol eşitlenmişken yeni grafikler etkin grafiğin sembolüyle açılır',
        'Düzen ▾ → Farklı kaydet…, bir şeyi değiştirin, sonra düzeni yeniden açın (Ctrl+S kaydeder)',
      ],
    },
    navigation: {
      title: 'Aralıklar ve düzenler',
      stat: '1D … Tümü',
      blurb:
        'Bir aralığa ya da tarihe atlayın, fiyat ölçeğini ters çevirin, kullandığınız zaman dilimlerini sabitleyin, aynı göstergeyi birkaç kez ekleyin; hepsini kayıtlı bir düzenden geri yükleyin.',
      tryThis: [
        'Grafiğin altında 1M, 3M veya 6M’ye tıklayın; Alt+G bir tarihe gider',
        'Alt+I fiyat ölçeğini ters çevirir; logaritmik ölçek Ayarlar’da',
        'Ayarlar → Saat dilimi: New York ya da Tokyo’yu seçin; eksen, gün ayrımları ve YTD de ona uyar, yaz saati dahil',
        'Ayarlar → Ölçek → Sol fiyat ölçeği; bir EMA’nın Stil sekmesi onu bu ölçeğe taşıyabilir',
        'Zaman dilimi düğmelerinin yanındaki ▾ menüsünde bir zaman dilimini yıldızlayın',
        'Art arda birkaç çizgi çizmek için sol araç çubuğundaki ↻ düğmesini açın; Ctrl+C / Ctrl+V onları kopyalar',
      ],
    },
    history: {
      title: 'Geçmişe kaydırın',
      stat: 'sayfalı geçmiş',
      blurb:
        'En eski bara doğru sürükledikçe eski barlar sayfa sayfa yüklenir ve ekrandakiler yerinde kalır. Yüklenen her bar sığana kadar uzaklaştırın: bar başına bir pikselin altında mumlar piksel sütunu başına birleşir, böylece binlerce bar okunaklı kalır.',
      tryThis: [
        'Grafiği sağa sürükleyin: soldaki bir etiket eski barların yüklendiğini gösterir',
        'Uzaklaştırmak için kaydırın; birkaç yüz barın ötesine, bar başına çeyrek piksele kadar',
        'Şimdiye kadar yüklenen her şeyi sığdırmak için grafiğin altındaki Tümü’ne tıklayın',
        '▾ zaman dilimi menüsüne 7 veya 90 yazın: Binance’te ikisi de yok, bu yüzden grafik onları 1m ve 30m barlardan oluşturur',
      ],
    },
    replay: {
      title: 'Bar tekrarı',
      stat: 'kaydırıcı',
      blurb:
        'Sonucu önceden bilmeden grafik okuma pratiği yapmak için geçmişte bar bar ilerleyin. Tekrar sırasında canlı veri bekletilir; fiyat ölçeği her adıma uyar.',
      tryThis: [
        'Oynat’a basın ya da Shift+→ / Shift+← ile birer bar ilerleyin',
        'İmleci oraya taşımak için açılmış herhangi bir bara tıklayın',
        '“Gerçek zamana dön” canlı seriye geri getirir',
        'Her barın oluşumunu izlemek için tekrar çubuğunda daha küçük bir Adım (15m) seçin',
      ],
    },
    compare: {
      title: 'Karşılaştırma, fark, oran',
      stat: 'semboller',
      blurb:
        'BTC’nin yanında kendi fiyat ölçeğinde ETH ve bir panelde BTC ÷ ETH. Diğer semboller grafikle zamana göre hizalanır; fark ya da oran, her gösterge gibi açıklama, değer etiketleri ve alarmlar alır. Ekrandaki en yüksek tepe ve en düşük dip işaretlenir.',
      tryThis: [
        'Nesne ağacını açın ve Karşılaştır’ın yanındaki + düğmesine basın: önce bir sembol, ardından biçimini seçin',
        'Yüzde ölçeği için oran paneline sağ tıklayın',
        'Grafiğe sağ tıklayın: Verileri dışa aktar (CSV) tüm gösterge çizgilerini de içerir',
        'Zaman dilimini değiştirin: diğer sembolün barları yeniden alınır',
      ],
    },
    bonds: {
      title: '1/32’lik tahviller',
      stat: 'biçimler',
      blurb:
        '1/32’lik ve yarım 1/32’lik kesirlerle fiyatlanan bir tahvil (110’165, 110 ve 16½/32 demektir), yüksek-düşük barlarda. Grafikteki her fiyat (eksen, artı imleç, açıklama, emirler, çizimler) aynı biçimde okunur ve eksen çizgileri tam kesirlere denk gelir.',
      tryThis: [
        'İmleci gezdirin: artı imleç ve açıklama 1/32’lik kesirlerle okunur',
        'Ayarlar → Görünüm → yalnızca normal seans için Uzatılmış işlem saatleri seçeneğini kapatın',
        'Renko ya da Kagi’ye geçin ve kutu boyutunu ya da dönüşü Ayarlar’da belirleyin',
        'Yatay bir çizgi çizin: etiketi de 1/32’lik kesirlerle okunur',
      ],
    },
    subcent: {
      title: '14 dil, sent altı fiyatlar',
      stat: 'i18n',
      blurb:
        'Widget’ın tamamı 14 dilde: menüler, ayarlar, çizim araçları, diyaloglar; sayılar da her dilin kendi biçiminde. PEPE 0.000004 civarında işlem görüyor: her etiket fiyat ölçeğinin hassasiyetini izler ve eksen sığacak şekilde genişler.',
      tryThis: [
        'Grafiğin üstünden bir dil seçin: 日本語, 한국어, 简体中文, Deutsch…',
        'Ctrl+P siz yazarken tüm Binance sembollerini adlarıyla birlikte arar',
        'Çevirileri görmek için Ayarlar’ı ya da çizim araçlarını açın',
        'İmleci gezdirin: artı imleç etiketi, dilin sayı biçiminde tam hassasiyeti korur',
      ],
    },
    bigdata: {
      title: '200 bin bar',
      stat: 'performans',
      blurb:
        'Dört göstergeyle iki yüz bin adet 1 dakikalık bar. Çizim yalnızca görünen barlara dokunur; daha büyük zaman dilimleri yerelde yeniden örneklenir, birkaç kareden uzun sürerse bir yükleme perdesinin arkasında.',
      tryThis: [
        '1H’ye, 4H’ye ve tekrar 1m’ye geçin; süreler grafiğin altında görünür',
        'Sonuna kadar uzaklaştırın ve kaydırın: kare maliyeti sabit kalır',
        'Bir gösterge daha ekleyin ve geçiş süresini izleyin',
      ],
    },
    switching: {
      title: 'Yavaş ağda geçiş',
      stat: '+1.2 s gecikme',
      blurb:
        'Buradaki her geçmiş isteği 1.2 s geciktirilir. Önceki grafik ekranda kalır ve ancak bir geçiş 200 ms’den uzun sürerse perdelenir; hızlı tıklamalarda eski bir yanıt asla kazanmaz.',
      tryThis: [
        'Birkaç sembole hızlıca tıklayın; yalnızca sonuncusu yüklenir',
        'Zaman dilimini değiştirin ve perdenin belirip kaybolmasını izleyin',
        'Göstergeler sahnesiyle karşılaştırın: hızlı geçişler hiç yanıp sönmez',
      ],
    },
  },

  gallery: {
    eyebrow: 'Grafik türleri',
    title: 'Her grafik türü, sayfada canlı',
    subtitleHtml:
      'Her kutu gerçek bir <code>Chart</code> örneğidir, resim değil. Kaydırmak için sürükleyin, yakınlaştırmak için tekerleği çevirin, artı imleç için üzerine gelin; her kutu kendi başına yanıt verir.',
    tiles: {
      candlestick: { name: 'Mum', tag: 'OHLC' },
      heikinAshi: { name: 'Heikin-Ashi', tag: 'Trend' },
      area: { name: 'Alan', tag: 'Kapanış' },
      baseline: { name: 'Taban çizgisi', tag: 'Üstü / altı' },
      bar: { name: 'OHLC barları', tag: 'Klasik' },
      stepLine: { name: 'Basamaklı çizgi', tag: 'Kesikli' },
    },
  },

  finance: {
    eyebrow: 'Finans grafikleri',
    title: 'Mum grafiklerinin ötesinde',
    subtitle: 'Portföyler ve KPI’lar için sparkline’lar, sermaye eğrileri, emir defteri derinliği, sektör ısı haritaları, şelale grafikleri ve kadranlar.',
    portfolio: 'Portföy performansı',
    depth: 'Emir defteri derinliği',
    heatmap: 'Kripto piyasası ısı haritası',
    pnl: 'K/Z dağılımı',
    fearGreed: 'Korku ve Açgözlülük Endeksi',
    waterfall: {
      start: 'Başlangıç',
      btcLong: 'BTC uzun',
      ethShort: 'ETH kısa',
      solLong: 'SOL uzun',
      fees: 'Komisyonlar',
      end: 'Bitiş',
    },
    zones: {
      extremeFear: 'Aşırı korku',
      fear: 'Korku',
      neutral: 'Nötr',
      greed: 'Açgözlülük',
      extremeGreed: 'Aşırı açgözlülük',
    },
  },

  terminal: {
    symbol: 'Sembol',
    timeframe: 'Zaman dilimi',
    chartType: 'Grafik türü',
    types: {
      candlestick: 'Mum',
      heikinAshi: 'Heikin-Ashi',
      area: 'Alan',
      bar: 'Bar',
      baseline: 'Taban çizgisi',
    },
    unavailable: 'Canlı akış kullanılamıyor: {error}',
    live: 'CANLI',
    offline: 'ÇEVRİMDIŞI',
    connecting: 'BAĞLANIYOR',
    hints: [
      ['Sürükle', 'kaydır'],
      ['Kaydırma', 'yakınlaştır'],
      ['Ekseni sürükle', 'ölçekle'],
    ],
  },

  copy: {
    copy: 'KOPYALA',
    copied: 'KOPYALANDI',
    copiedAnnouncement: 'Panoya kopyalandı',
    copyLabel: 'Kopyala: {label}',
    copyCode: 'Kodu kopyala',
    codeSample: 'Kod örneği',
    packageManager: 'Paket yöneticisi',
    copyInstall: 'Kurulum komutunu kopyala',
  },

  examples: {
    metaTitle: 'Örnekler · TradeCanvas',
    description: 'Vanilla JS, React, Vue, Svelte, ChartWidget ve finans panoları için canlı StackBlitz örnekleri.',
    eyebrow: 'Örnekler · StackBlitz',
    title: 'Örnekler',
    subtitleHtml:
      'Tek tıkla fork’layabileceğiniz canlı sanal alanlar. Her biri en son 1.x paketleri bağlanmış olarak StackBlitz’de açılır. Hiç kurulum yapmadan özellikleri denemek için ana sayfadaki <a href="{lab}">Özellik Laboratuvarı</a>’nı kullanın.',
    open: '{title} örneğini StackBlitz’de aç',
    items: {
      vanilla: {
        title: 'Vanilla JS',
        blurb: 'Headless Chart: canlı Binance akışı, Bollinger + RSI ve kendi arayüzünüzde çizim araçları.',
      },
      widget: {
        title: 'ChartWidget',
        blurb: 'Tek çağrıyla eksiksiz alım satım arayüzü: araç çubuğu, 69 çizim aracı, izleme listesi, alım satım, tekrar; 14 dilde.',
      },
      react: {
        title: 'React',
        blurb: '@tradecanvas/react — reaktif, tipli prop’lar; alttaki Chart’a bir ref ile erişim.',
      },
      vue: {
        title: 'Vue 3',
        blurb: '@tradecanvas/vue — script setup, reaktif prop’lar, @ready ile gelen Chart.',
      },
      svelte: {
        title: 'Svelte 5',
        blurb: '@tradecanvas/svelte — rune’lar, reaktif prop’lar, bind:chart.',
      },
      finance: {
        title: 'Finans panosu',
        blurb: 'Sparkline, kadran, ısı haritası, derinlik ve sermaye eğrisi çizicileri tek bir düzende.',
      },
    },
  },

  playground: {
    metaTitle: 'Deneme alanı · TradeCanvas',
    description: 'StackBlitz’de etkileşimli bir TradeCanvas sanal alanını fork’layın ve kodlamaya başlayın.',
    eyebrow: 'Deneme alanı · StackBlitz',
    title: 'Deneme alanı',
    subtitle: 'StackBlitz’de düzenlenebilir bir sanal alan; ChartWidget canlı Binance verisine zaten bağlı.',
    launch: 'Deneme alanını aç',
    more: 'Daha fazla örnek',
    insideTitle: 'İçinde neler var',
    insideHtml:
      'Tek dosyalı minimal bir Vite + TypeScript projesi: <code>src/main.ts</code>, <code>ChartWidget</code>’ı yerleştirir ve bir <code>BinanceAdapter</code> bağlar.',
  },

  changelog: {
    metaTitle: 'Değişiklik günlüğü — TradeCanvas',
    description: 'Her TradeCanvas sürümünün sürüm notları.',
    englishOnly: 'Sürüm notları İngilizce yazılmıştır.',
  },

  backtest: {
    title: 'Canlı backtest — SMA(10/30) kesişimi',
    subtitle: '365 günlük sentetik fiyat verisi, 10 bin $ başlangıç sermayesi, %0,05 komisyon, %0,03 kayma.',
    play: 'Oynat',
    pause: 'Duraklat',
    replay: 'Tekrar oynat',
    end: 'Son',
    running: 'Backtest çalışıyor…',
    failed: 'Hata: {error}',
    bar: 'Bar {index}/{total}',
    totalReturn: 'Toplam getiri',
    maxDrawdown: 'Maks. düşüş',
    winRate: 'Kazanma oranı',
    profitFactor: 'Kâr faktörü',
    trades: 'İşlemler',
  },

  error: {
    notFound: 'Sayfa bulunamadı',
    notFoundText: 'Bu sayfa yok ya da taşındı.',
    other: 'Bir şeyler ters gitti',
    otherText: 'Sayfa gösterilemedi. Yeniden deneyin ya da ana sayfadan başlayın.',
    home: 'Ana sayfaya dön',
    docs: 'Belgeleri aç',
  },

  docs: {
    titleSuffix: 'TradeCanvas belgeleri',
    navLabel: 'Belgelerde gezinme',
    groups: {
      start: 'Başlarken',
      chart: 'Grafik',
      trading: 'Alım satım',
    },
    pages: {
      'getting-started': 'Başlarken',
      frameworks: 'Framework’ler',
      embed: 'Gömülebilir Widget',
      api: 'API Referansı',
      'chart-types': 'Grafik Türleri',
      indicators: 'Göstergeler',
      'drawing-tools': 'Çizim Araçları',
      plugins: 'Eklentiler',
      performance: 'Performans',
      trading: 'Alım Satım Katmanı',
      finance: 'Finans Grafikleri',
      realtime: 'Gerçek Zaman ve Tekrar',
      analytics: 'Analitik',
    },
    notTranslated: 'Bu sayfa henüz {language} diline çevrilmedi, bu yüzden İngilizce gösteriliyor.',
  },
};

export default tr;
