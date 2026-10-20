import type { SiteMessages } from '../messages';

const tr: SiteMessages = {
  meta: {
    title: 'TradeCanvas · Web için Canvas alım satım grafikleri',
    description:
      'TradeCanvas, Canvas 2D veya WebGL ile çizen, web için bir alım satım grafik kütüphanesidir: 18 grafik türü, 111 gösterge, 69 çizim aracı, canlı borsa akışları, grafik üzerinde emirler, replay ve backtest, 30 dilde. Sıfır bağımlılık, MIT.',
  },

  nav: {
    main: 'Ana menü',
    docs: 'Belgeler',
    examples: 'Örnekler',
    playground: 'Deneme alanı',
    changelog: 'Değişiklik günlüğü',
    audit: 'Denetim',
    business: 'Kurumsal',
    toLight: 'Açık temaya geç',
    toDark: 'Koyu temaya geç',
    github: 'GitHub’da TradeCanvas',
    sponsor: 'Sponsor ol',
    sponsorLabel: 'GitHub’da TradeCanvas’a sponsor ol',
    openMenu: 'Menüyü aç',
    closeMenu: 'Menüyü kapat',
    menu: 'Menü',
    language: 'Dil',
  },

  footer: {
    tagline: 'Web için alım satım grafikleri, Canvas 2D veya WebGL ile çizilir. Sıfır bağımlılık, MIT lisanslı.',
    library: 'Kütüphane',
    packages: 'Paketler',
    project: 'Proje',
    gettingStarted: 'Başlarken',
    apiReference: 'API referansı',
    examples: 'Örnekler',
    changelog: 'Değişiklik günlüğü',
    audit: 'Sistem denetimi',
    business: 'İşletmeler için',
    issues: 'Sorun bildirimleri',
    discussions: 'Tartışmalar',
    boGrid: 'bo-grid (veri tablosu)',
    builtWith: 'TradeCanvas ile yapıldı',
  },

  home: {
    release: 'WebGL oluşturucu, 30 dil',
    title: 'Alım satım uygulamaları için grafik motoru.',
    ledeHtml:
      'Mum grafiklerinden Renko’ya, 111 gösterge, 69 çizim aracı, canlı borsa akışları ve grafik üzerinde emirler. Canvas 2D veya WebGL ile, sıfır bağımlılıkla çizilir. Hazır <code>ChartWidget</code>’ı ekleyin ya da kendi arayüzünüzü headless <code>Chart</code> üzerine kurun.',
    getStarted: 'Başlayın',
    browseExamples: 'Örneklere göz atın',
    specsLabel: 'Temel rakamlar',
    specs: [
      'gösterge',
      'çizim aracı',
      'grafik türü',
      'widget dili',
      'bar, WebGL ile 60 fps’de',
      'üçüncü taraf çalışma zamanı bağımlılığı',
    ],
    tape: 'Binance’ten canlı fiyatlar',
    tapePause: 'Fiyatları duraklat',
    tapePlay: 'Fiyatları oynat',
    story: {
      eyebrow: 'İlk bakıştan gerçekleşen emre',
      title: 'Tüm işlem için tek grafik',
      subtitle: 'Dört canlı grafik, her biri kendi kısmında çalışıyor. Sürükleyin, yakınlaştırın, üzerlerine çizin.',
      chapters: [
        {
          title: 'Piyasayı okuyun',
          text: 'Mumların üzerinde bantlar, ortalamalar ve osilatörler, onların üstünde Fibonacci seviyeleri ve trend çizgileri; her birinin kendi ayarları ve alarmları var.',
          points: [
            '111 gösterge, biri diğerinin üzerinde, örneğin RSI’ın ortalaması',
            'Mıknatıs, gruplar ve geri almayla 69 çizim aracı',
            'Fiyatlar, çizgiler ve gösterge kesişimleri için alarmlar',
          ],
        },
        {
          title: 'Grafikte işlem yapın',
          text: 'Emirler, pozisyonlar ve braketleri fiyat ölçeğinde durur. Bir stopu taşımak için sürükleyin; kâğıt broker onları gerçekleştirir, böylece bağlanmadan önce kurabilirsiniz.',
          points: [
            'Sürükleyerek emir verin, zarar durdur ve kâr al çizgilerini sürükleyerek taşıyın',
            'Gerçekleşme işaretleri ve kâr-zarar grafikte',
            'Broker’ınız tek bir adaptörle bağlanır',
          ],
        },
        {
          title: 'Geçmişi yeniden oynatın',
          text: 'Geçmişte mum mum ilerleyin ya da kendi aksın: göstergeler, çizimler ve kâğıt emirler yeniden oynatılan fiyatı izler.',
          points: [
            'İstediğiniz başlangıç mumu, istediğiniz hız',
            'Her mum daha küçük mumlardan adım adım oluşabilir',
            'Replay sırasında kâğıt broker ile işlem yapın',
          ],
        },
        {
          title: 'Takılmadan ölçeklenin',
          text: 'Burada dört göstergeyle 200.000 bar kendi kendine kayıyor. Oluşturucuyu değiştirin ve kare süresini izleyin: WebGL ile mumları ve çizgileri GPU çizer.',
          points: [
            'WebGL ile 1.000.000 bar uzaklaştırılmış hâlde 60 fps’de',
            'WebGL olmayan yerde aynı görünümle Canvas 2D',
            'Yalnızca ekrandaki barlar çizilir',
          ],
        },
      ],
      frameTime: 'kare başına {ms} ms',
      panning: 'Siz devralana kadar kendi kendine kayar',
      renderer: 'Oluşturucu',
      replaying: 'Yeniden oynatılıyor',
    },
    trust: {
      label: 'Açık kaynak',
      downloads: 'ayda {n} npm indirmesi',
      license: '{n} lisanslı',
      dependencies: '{n} çalışma zamanı bağımlılığı',
      typescript: 'her API için {n} türleri',
    },
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
        text: 'ChartWidget; araç çubuğunu, çizim kenar çubuğunu, izleme listesini, alarmları, nesne ağacını, veri penceresini, tekrarı ve komut paletini (Ctrl+K) İngilizce ve Vietnamca’dan Çince, Japonca, Korece ve Arapça’ya kadar 30 dilde sunar.',
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
    widgetLook: 'Widget görünümü',
    widgetRenderer: 'Oluşturucu',
    idle: 'Canlı grafiği başlatmak için buraya kaydırın',
    metricHint: 'Süreyi ölçmek için sembolü veya zaman dilimini değiştirin',
    metricSwitch: '→ {label}: {ms} · {bars} bar',
    metricSetData: 'setData({bars} bar): {ms}',
    metricLook: "setUI('{name}'): {ms}",
    metricRenderer: '{name}: kaydırırken kare başına {ms}',
    metricRendererMissing: 'WebGL 2 yok: Canvas 2D ile çiziliyor',
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
      stat: '111 yerleşik',
      blurb:
        'Grafik üstü katmanlar ve paneller kütüphanenin kendi içinde hesaplanır, sıfır matematik bağımlılığı. Canlı tick’ler yalnızca oluşmakta olan barı yeniden hesaplar: 100k barda dört göstergeyle tick başına 0.001 ms.',
      tryThis: [
        'Göstergeler düğmesine (ya da Ctrl+K) basın ve 111 göstergeden herhangi birini arayın',
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
        'Alım ve satım işaretleri ile işlem, yeniden oynatma onlara ulaştığında görünür',
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
      title: '30 dil, sent altı fiyatlar',
      stat: 'i18n',
      blurb:
        'Widget’ın tamamı 30 dilde: menüler, ayarlar, çizim araçları, diyaloglar, sağdan sola Arapça, İbranice ve Farsça; sayılar da her dilin kendi biçiminde. PEPE 0.000004 civarında işlem görüyor: her etiket fiyat ölçeğinin hassasiyetini izler ve eksen sığacak şekilde genişler.',
      tryThis: [
        'Grafiğin üstünden bir dil seçin: 日本語, 한국어, 简体中文, Deutsch…',
        'Ctrl+P siz yazarken tüm Binance sembollerini adlarıyla birlikte arar',
        'Çevirileri görmek için Ayarlar’ı ya da çizim araçlarını açın',
        'İmleci gezdirin: artı imleç etiketi, dilin sayı biçiminde tam hassasiyeti korur',
      ],
    },
    looks: {
      title: 'Kendi görünümünüz',
      stat: '3 hazır ayar',
      blurb:
        'Widget’ın biçimleri ve boyutları token’lardır: köşeler, kontrol yükseklikleri, yazı tipi, kenarlıklar, gölgeler, seçili düğmenin nasıl göründüğü, kenara yaslanan ya da yüzen çubuklar. Studio, Terminal veya Capsule ile başlayın ve istediğinizi değiştirin; grafiğin fiyat etiketleri de aynı köşeleri alır.',
      tryThis: [
        'Grafiğin üstünden görünümü değiştirin: yerinde değişir, hiçbir şey yeniden kurulmaz',
        'Her görünümde Ayarlar’ı, bir menüyü ya da çizim araçlarını açın',
        'Capsule, araç çubuğunu ve çizim araçlarını adacıklar gibi yüzdürür; fiyat etiketleri hap biçimini alır',
        'Terminal sık ve köşelidir: büyük harfli etiketler ve seçili zaman diliminin altında bir çizgi',
      ],
    },
    overrides: {
      title: 'Stil geçersiz kılmaları',
      stat: '101 anahtar',
      blurb:
        'Grafiğin görünümünün herhangi bir parçası, temadan ayrı olarak anahtarla: her yöndeki ızgara, artı imleç, eksenler, paneller, açıklama, son fiyat, hacim ve her grafik türünün renkleri. Burada dikey ızgara kapalı, yatay ızgara noktalı, artı imleç düz ve MACD’nin sinyal çizgisi kendi ayırıcısı olan bir panelde kesik çizgili.',
      tryThis: [
        'Grafik türünü değiştirin: barlar ve Heikin-Ashi kendi renkleri yoksa mumların renklerini alır',
        'Sitenin temasını değiştirin: geçersiz kılınmayan her şey onu izler',
        'Ayarlar’ı açın: Stil sekmesi görünen grafik türünün renkleri dahil her anahtarı ayarlar; İşlem sekmesi emirlerin, işaretlerin ve bölgelerin renklerini ayarlar, siz seçene kadar Otomatik',
      ],
    },
    parts: {
      title: 'Sizin widget’ınız, sizin parçalarınız',
      stat: '112 anahtar',
      blurb:
        'Widget’ın her parçasının bir anahtarı var; siz kapatana dek açık ve çalışırken değiştirilebilir: bütün bir yetenek (uyarılar, ayarlar, kısayollar) ya da tek bir yer (bir araç çubuğu düğmesi, bir menü girişi, bir çizim aracı bölümü). Kendi düğmeleriniz, menüleriniz ve durum öğeleriniz widget’ın çubuklarına yerleşir. Burada yeniden oynatma, iki çizim bölümü ve veri indirme kapalı; araç çubuğunda bir anahtar menüsü var.',
      tryThis: [
        'Araç çubuğunda “features” menüsünü açıp parçaları kapatıp açın',
        'Çizim çubuğunun altındaki göz, araç çubuğunu ve durum çubuğunu gizler ve geri getirir (Alt+X)',
        'Bir çizime sağ tıklayın: son giriş sayfanın kendisine ait',
      ],
    },
    markets: {
      title: 'İzleme listeleri ve piyasa',
      stat: 'canlı fiyatlar',
      blurb:
        'Akıştan canlı fiyatlarla sembol listeleri, sembolün fiyatını, piyasanın durumunu ve günün rakamlarını gösteren bir panel ve tick grafikleri: her 100 işlemde bir bar.',
      tryThis: [
        'İzleme listesinin menüsünü açın: Memes’e geçin, kendi listenizi oluşturun, adını değiştirin',
        '+ ile bir sembol ekleyin, satırları sürükleyerek sıralayın ya da bir satırda Delete’e basın',
        'Her 100 işlemde bir bar için grafikte 100T yazın, geri dönmek için 1m yazın',
        'Alt kenarındaki yakınlaştırma ve kaydırma düğmeleri için fareyi grafiğin üzerine getirin',
      ],
    },
    bigdata: {
      title: '200 bin bar',
      stat: 'performans',
      blurb:
        'Dört göstergeyle iki yüz bin adet 1 dakikalık bar. Çizim yalnızca görünen barlara dokunur; daha büyük zaman dilimleri yerelde yeniden örneklenir, birkaç kareden uzun sürerse bir yükleme perdesinin arkasında.',
      tryThis: [
        'Grafiğin üstünde Canvas 2D ile WebGL arasında geçiş yapın: her geçiş kısa bir kaydırmayı ölçer',
        'WebGL açıkken grafik türünü Taban çizgisi, Kagi veya Point & Figure yapın: onlar da GPU ile çizilir',
        '1H’ye, 4H’ye ve tekrar 1m’ye geçin; süreler grafiğin altında görünür',
        'Sonuna kadar uzaklaştırın ve kaydırın: kare maliyeti sabit kalır',
        'Bir gösterge daha ekleyin ve geçiş süresini izleyin',
      ],
    },
    heatmap: {
      title: 'Likidite ısı haritası',
      stat: '240 × 80 hücre',
      blurb:
        'Her biri 80 fiyat seviyeli iki yüz kırk emir defteri anlık görüntüsü, mumların arkasında bir ısı haritası olarak: bekleyen miktar seviye seviye parlar, alışlar yeşil, satışlar kırmızı; uzun süre duran duvarlar öne çıkar. WebGL ile 19.200 hücreyi GPU barların altına çizer.',
      tryThis: [
        'Grafiğin üstünde Canvas 2D ile WebGL arasında geçiş yapın: her geçiş kısa bir kaydırmayı ölçer',
        'Parlak satırları arayın: zaman içinde tek bir fiyatta duran miktar duvarları',
        'Bir duvara yakınlaştırıp ileri geri kaydırın: hücreler barlarla birlikte hareket eder',
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

  engage: {
    click: 'Grafiği kullanmak için tıklayın',
    tap: 'Grafiği kullanmak için dokunun',
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
    drawnWith: '{renderer} ile çizildi',
    live: 'CANLI',
    offline: 'ÇEVRİMDIŞI',
    connecting: 'BAĞLANIYOR',
    hints: [
      ['Sürükle', 'kaydır'],
      ['Tıkla + kaydır', 'yakınlaştır'],
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
        blurb: 'Tek çağrıyla eksiksiz alım satım arayüzü: araç çubuğu, 69 çizim aracı, izleme listesi, alım satım, tekrar; 30 dilde.',
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

  audit: {
    metaTitle: 'Sistem denetimi — TradeCanvas',
    description:
      'TradeCanvas’ın ne yaptığı ve ne kadar hızlı olduğu: alana göre tüm yetenekler, tümleşik grafik biriminde kare süreleri, veri yolu, indirme boyutu, nasıl test edildiği ve bildiğimiz sınırlar.',
    eyebrow: 'Sistem denetimi',
    title: 'Ne yaptığı ve bunu ne kadar hızlı yaptığı.',
    ledeHtml:
      'Bu sayfadaki her şey <code>@tradecanvas/chart</code> {version} ile gelir. Kare süreleri, tümleşik grafikli (Intel UHD) bir dizüstü bilgisayarda Chrome’da ölçüldü; depodaki <code>node scripts/bench-render.mjs</code> aynı sahneleri sizin bilgisayarınızda çalıştırır.',
    numbersTitle: 'Rakamlarla',
    numbers: [
      'grafik türü',
      'yerleşik gösterge',
      'çizim aracı',
      'widget dili',
      'stil anahtarı',
      'açılıp kapatılabilen widget özelliği',
      'üçüncü taraf çalışma zamanı bağımlılığı',
      'birim testi',
    ],

    perfTitle: 'Kare süresi',
    perfLede: 'Kaydırırken bir kareyi çizme süresi. 16,7 ms, saniyede 60 kare demektir.',
    perfChart: 'Grafik',
    perfRatio: 'Piksel oranı',
    perf: [
      '1600×900, 500 mum + 4 gösterge',
      '1600×900, 200.000 bar uzaklaştırılmış + 4 gösterge',
      '1600×900, 1.000.000 bar uzaklaştırılmış + 4 gösterge',
      '1600×900, derinlik ısı haritası, 240 anlık görüntü × 80 seviye',
      'Altı grafik, her birinde 500 mum ve 2 gösterge',
      '2560×1400, 2.000 mum + 4 gösterge',
      '2560×1400, 2.000 mum + 4 gösterge',
      '2560×1400, 2.000 mum + 4 gösterge',
    ],
    perfNoteHtml:
      'Varsayılan Canvas 2D’dir. <code>renderer: \'webgl\'</code> (veya <code>\'auto\'</code>) grafik alanını WebGL 2 ile çizer; WebGL 2 yoksa ya da bağlamı kaybolursa Canvas 2D’ye geri döner.',

    dataTitle: 'Veri yolu',
    data: [
      '100.000 barda Bollinger Bantları, EMA, RSI ve MACD ile canlı tick',
      'Aynı dört göstergenin 100.000 barda baştan hesaplanması',
      '1.000.000 görünür noktalı bir çizgi, tek kare için örneği azaltılmış',
      'Üzerine gelince yeniden çizim (artı imleç, açıklama)',
      'Sembol veya zaman dilimi değişince yükleme perdesi ancak şu süreden sonra görünür:',
    ],

    sizeTitle: 'İndirme boyutu',
    sizeLede: 'Küçültülmüş ve gzip ile sıkıştırılmış, içe aktardığı her şeyle birlikte.',
    size: ['Chart, headless API', 'ChartWidget, eksiksiz arayüz', 'WebGL oluşturucu, ilk kullanımda yüklenir'],

    qualityTitle: 'Nasıl denetleniyor',
    quality: [
      'Yedi paketteki 3.000’den fazla birim testi her pull request’te CI’da çalışır.',
      'WebGL oluşturucu mumları Canvas 2D ile aynı cihaz piksellerine çizer; çizgiler ve dolgular yalnızca kenar yumuşatmalı birkaç kenar pikselinde farklılık gösterir.',
      'WebGL oluşturucu; Chromium, Firefox ve WebKit’te denetlendi. WebGL 2 yoksa ya da bağlamı kaybolursa grafik Canvas 2D ile devam eder.',
      'Belgelerdeki ve ajan becerisindeki kod örnekleri gerçek API’ye karşı tür denetiminden geçirilir.',
      'Grafikler ekran okuyucularla okunabilir ve klavyeyle kullanılabilir; widget Arapça, İbranice ve Farsçada sağdan sola akar.',
    ],

    catalogTitle: 'Yetenekler',
    catalogLede: 'Alana göre filtreleyin ya da ada veya API’ye göre arayın.',
    search: 'Yeteneklerde ara',
    searchPlaceholder: 'replay, webgl, alarm…',
    all: 'Tümü',
    count: '{shown} / {total}',
    colCapability: 'Yetenek',
    colArea: 'Alan',
    colDetail: 'Ayrıntılar ve API',
    areas: {
      chartTypes: 'Grafik türleri',
      rendering: 'Oluşturma',
      indicators: 'Göstergeler',
      drawings: 'Çizim araçları',
      scales: 'Ölçekler ve zaman',
      data: 'Veri ve gerçek zaman',
      trading: 'Alım satım',
      alerts: 'Alarmlar ve replay',
      workspace: 'Çalışma alanı',
      customization: 'Özelleştirme',
      access: 'Diller ve erişilebilirlik',
      developers: 'Geliştiriciler',
    },
    catalog: {
      chartTypes: [
        { name: 'Mumlar, OHLC barları, çizgi, alan, taban çizgisi, Heikin-Ashi, içi boş mumlar', detail: 'candlestick, bar, line, area, baseline, heikinAshi, hollowCandle' },
        { name: 'Renko, çizgi kırılımı, Kagi, nokta ve şekil, aralık barları', detail: 'Kutu boyutu veya ATR, kırılım için çizgi sayısı, yüzde ya da fiyat olarak dönüş, bar başına aralık' },
        { name: 'Hacim mumları, Equivolume, HLC alanı, basamaklı çizgi, işaretçili çizgi, yüksek-düşük', detail: 'Toplam 18 grafik türü' },
        { name: 'Ana seri gizli', detail: 'Yalnızca göstergeler ve çizimler kalır' },
      ],
      rendering: [
        { name: 'Canvas 2D veya WebGL 2', detail: "renderer: 'canvas' | 'webgl' | 'auto', setRenderer, rendererChange olayı" },
        { name: 'Uzaklaştırıldığında piksel sütunu başına tek aralık', detail: 'Bar başına bir pikselin altında gösterge çizgileri, bantları ve histogramları' },
        { name: 'Bir milyon bar akıcı biçimde kaydırılır', detail: 'Dört göstergeyle, 2 piksel oranında' },
        { name: 'GPU’da derinlik ısı haritası, hacim profili ve piyasa profili', detail: 'pushDepthSnapshot(book, time)' },
        { name: 'Bir sayfada birden çok WebGL grafiği', detail: 'En fazla 8 (setMaxWebGLCharts); geri kalanı Canvas 2D ile çizer; bağlam geri geldiğinde WebGL’e döner' },
        { name: 'Her ekran ölçeğinde keskin', detail: 'Mumlar, hacim ve çizimler %100, %125 ve %200’de cihaz piksellerine oturur' },
        { name: 'Üçüncü taraf çalışma zamanı bağımlılığı yok', detail: 'Kurulacak ya da denetlenecek başka bir şey yok' },
      ],
      indicators: [
        { name: '111 yerleşik gösterge', detail: 'Altı türde pivot noktaları, MA Cross, başka bir sembolle korelasyon' },
        { name: 'Fiyat kaynağı', detail: 'open, high, low, hl2, hlc3, ohlc4, hlcc4' },
        { name: 'Gösterge üzerinde gösterge', detail: 'Örneğin RSI’ın hareketli ortalaması, her tick’te güncellenir' },
        { name: 'Tek panelde birden çok gösterge, paneller arasında taşıma', detail: 'moveIndicatorToPane' },
        { name: 'Aynı göstergeden birden fazla', detail: 'Yan yana EMA 20 ve EMA 50' },
        { name: 'Seviyeler ve eşikler', detail: 'RSI 30/70, CCI ±100, düzenle birlikte kaydedilir' },
        { name: 'Eksende son değer', detail: 'Fiyat ekseninde ve her panelin ekseninde, çizginin renginde' },
        { name: 'Paneller daraltılır, büyütülür ve yeniden sıralanır', detail: 'Düzenle birlikte kaydedilir' },
        { name: 'Gösterge şablonları', detail: 'Girdiler, stil, seviyeler ve panel birlikte kaydedilip uygulanır' },
        { name: 'Her çizginin stili ve görünürlüğü', detail: 'Gizli bir çizgi ölçeği genişletmez; setIndicatorDefaults' },
        { name: 'Hacim deltası ve CVD', detail: 'Barlardan tahmin edilir' },
        { name: 'Gösterge değerlerini dışa aktarma', detail: 'CSV veya JSON, çizgi başına bir sütun' },
        { name: 'Canlı tick’lerde artımlı güncellemeler', detail: 'update() yalnızca oluşmakta olan barı yeniden hesaplar' },
      ],
      drawings: [
        { name: '69 çizim aracı', detail: 'Çizgiler, kanallar, Fibonacci, Gann, pitchfork’lar, Elliott dalgaları, formasyonlar, döngüler, projeksiyonlar' },
        { name: 'Her aracın kendi ayarları', detail: 'Stil, özellikler ve piyasanın fiyat ızgarasında koordinatlar' },
        { name: 'Uzun ve kısa pozisyonlar', detail: 'Risk:ödül, yüzde ya da para cinsinden riske göre miktar' },
        { name: 'Çizim üzerinde alarmlar', detail: 'Fiyat bir trend çizgisini veya kanalı çizildiği hâliyle kestiğinde, logaritmik ölçek dahil' },
        { name: 'Sıralama, gruplar ve şablonlar', detail: 'Öne getir, arkaya gönder, grupla, kilitle, gizle' },
        { name: 'Notlar, belirtme balonları, oklar, bayraklar, fırça, yol, eğri', detail: 'Serbest el ve çok noktalı çizim' },
        { name: 'Anchored VWAP ve sabit aralıklı hacim profili', detail: 'Grafiğin barlarını okur' },
        { name: 'Silgi, kutuyla yakınlaştırma, güçlü mıknatıs, klavye kısayolları', detail: 'Alt+T, Alt+H, Alt+J, Alt+V, Alt+C, Alt+F' },
      ],
      scales: [
        { name: 'Bir tarihe gitme; 1D’den All’a aralıklar', detail: 'Uzaklaştırma sınırı yok' },
        { name: 'Yaz saati uygulamasıyla IANA saat dilimleri', detail: 'Ya da borsanın kendi saat dilimi' },
        { name: 'Her zaman dilimi ve tick barları', detail: '7m, 90m, 2d akışın sunduklarından, 100T ise işlemlerinden oluşturulur' },
        { name: 'Sol ve sağ ölçekler; panel başına logaritmik, ters ve yüzde', detail: 'Bir katman ya da fiyat ölçeğinin kopyası için sol ölçek' },
        { name: 'Sembol karşılaştırma, spread ve oran', detail: 'Kendi ölçeğinde ya da panelinde, zamana göre eşleştirilir' },
        { name: 'Uzatılmış işlem saatleri', detail: 'Sembolün seans saatlerinden' },
        { name: 'Fiyat ve zaman biçimleri', detail: 'Fonksiyon olarak priceFormat ya da 1/32 gibi kesirler; timeFormatter' },
        { name: 'Sembolün ondalıklarında ve fiyat adımında ölçek', detail: 'pricePrecision, minTick: 10’ar 10’ar hareket eden bir hisse asla 21.705 göstermez' },
        { name: 'Yüksek ve düşük çizgileri, bid ve ask', detail: 'Bid ve ask, akışın tick’lerinden' },
        { name: 'Grafikte olay işaretleri', detail: 'signalMarkerHover, signalMarkerClick' },
      ],
      data: [
        { name: 'Hazır akışlar ve kendi akışınız', detail: 'Binance, Bybit, Coinbase, Kraken, mock; WebSocketAdapter, PollingAdapter' },
        { name: 'Sola kaydırırken eski geçmiş yüklenir', detail: 'fetchHistoryBefore' },
        { name: 'Ayrıntılı sembol arama', detail: 'searchSymbols, resolveSymbol: ondalıklar, fiyat adımı, seanslar, saat dilimi' },
        { name: 'Bağlandıktan sonra öğrenilen sembol bilgileri', detail: 'Adaptörün symbolInfo olayı' },
        { name: 'Piyasa derinliği merdiveni', detail: 'Fiyata göre bid ve ask miktarı; işlem için tıklayın' },
        { name: 'İzleme listeleri için canlı kotasyonlar', detail: 'subscribeQuotes, setQuotes, getQuote' },
        { name: 'Haberler ve piyasa durumu', detail: 'fetchNews; açılışa veya kapanışa geri sayım' },
      ],
      trading: [
        { name: 'Grafikte emirler ve pozisyonlar', detail: 'Değiştirmek için sürükleyin; çizgiden iptal edin, kapatın, ters çevirin' },
        { name: 'Gerçekleşme işaretleri', detail: 'executionFill içinde neden ve kâr ya da zarar' },
        { name: 'Emir formu', detail: 'Miktar, tür, zarar durdur ve kâr al, geçerlilik süresi, yazarken denetlenir' },
        { name: 'Hesap paneli', detail: 'Canlı kâr-zararıyla pozisyonlar, bekleyen emirler, gerçekleşmeler' },
        { name: 'Sinyaller ve işlem bölgeleri', detail: 'markers.*, tradeZones.* stil anahtarları' },
        { name: 'Backtest ve risk metrikleri', detail: '@tradecanvas/analytics: komisyon, kayma, Sharpe, Sortino, Calmar, düşüş' },
      ],
      alerts: [
        { name: 'Fiyat seviyesinin ötesinde alarmlar', detail: 'Çizginin çizgiyi kesmesi, N barda %N hareket, bar kapanışında, süre sonu ile' },
        { name: 'Daha ince adımlarla bar replay', detail: 'Büyük bir zaman dilimi küçük barlardan yeniden oynatılır' },
        { name: 'Replay üzerinde kâğıt işlem', detail: 'Emirler yeniden oynatılan fiyatlardan gerçekleşir' },
        { name: 'Grafik ızgarası boyunca replay', detail: 'Tüm grafikler eşzamanlı ilerler' },
        { name: 'Uygulamalar için replay', detail: 'startTime, hideHistory, duration, oynadıkça beliren işaretler, replayComplete' },
      ],
      workspace: [
        { name: 'Eşzamanlı widget ızgarası', detail: 'En fazla 6; sembol, zaman dilimi, artı imleç, zaman ve çizimler paylaşılır' },
        { name: 'Kendi depolamanızda adlandırılmış düzenler', detail: 'Kaydet, aç, yeniden adlandır, otomatik kaydet; sunucu için LayoutStorage' },
        { name: 'Her şey için geri al ve yinele', detail: 'Çizimler, göstergeler, ayarlar ve grafik türü; recordUndo' },
        { name: 'Alana göre bağlam menüleri', detail: 'Çizimler, grafik alanı, paneller, fiyat ekseni, zaman ekseni' },
        { name: 'İzleme listeleri', detail: 'Birden çok liste, sürükleyerek sıralanır' },
        { name: 'Ana uygulama için olaylar', detail: 'symbolChange, timeframeChange, ordersChange, executionFill, styleChange ve daha fazlası' },
      ],
      customization: [
        { name: 'Widget için üç görünüm', detail: 'Studio, Terminal, Capsule; ui ve setUI; --tcw-* CSS değişkenleri' },
        { name: 'Anahtar anahtar grafik görünümü', detail: 'Ana uygulama katmanı ve kullanıcı katmanında, 101 tipli anahtar üzerinde applyOverrides' },
        { name: 'Her anahtara ulaşan ayarlar', detail: 'Görüntülenen grafik türü için stil sekmesi, alım satım sekmesi' },
        { name: 'Açılıp kapatılabilen 112 özellik', detail: 'features, setFeatures, isFeatureOn; çalışırken değiştirilebilir' },
        { name: 'Widget’ta kendi parçalarınız', detail: 'Araç çubuğu düğmeleri ve açılır menüler, kenar çubuğu düğmeleri, durum öğeleri, yuvalar, menü öğeleri' },
        { name: 'Kendi kısayollarınız', detail: 'Klavye düzenine göre addHotkey' },
      ],
      access: [
        { name: 'Widget 30 dilde', detail: 'Arapça, İbranice ve Farsça sağdan sola' },
        { name: 'Ekran okuyucular ve klavye', detail: 'Grafik özeti, barlar tek tek okunur, iletişim kutuları klavyeyle' },
        { name: 'Belgeler altı dilde, bu site on dört dilde', detail: 'English, Tiếng Việt, 简体中文, 日本語, 한국어, Español' },
      ],
      developers: [
        { name: 'React, Vue ve Svelte bileşenleri', detail: 'Reaktif prop’lar: overrides, indicators, features' },
        { name: 'Eklentiler', detail: 'Göstergeler, çizim araçları, grafik türleri ve katmanlar; fiyat ızgarasına çizmek için overlayScale ve getPriceStep' },
        { name: 'Kodlama ajanları için belgeler', detail: 'llms.txt, llms-full.txt ve bir ajan becerisi' },
      ],
    },

    limitsTitle: 'Bilinen sınırlar',
    limits: [
      'WebGL daha fazla cihazda denenene kadar varsayılan oluşturucu Canvas 2D olarak kalır; WebGL’in Safari’de ve 5K ekranlardaki kare hızı henüz ölçülmedi.',
      '2560×1400 bir grafikte 2 piksel oranında, tümleşik grafik biriminde tarayıcının yalnızca birleştirme işi yaklaşık 23 ms sürer; bu yüzden orada WebGL kareleri ortalama 29 ms’dir.',
      'Tick zaman dilimleri, akışın döndürdüğü son işlemlerden oluşturulur; daha eski tick geçmişi yüklenemez.',
      'Hacim deltası ve CVD, her işlemin yönünden değil barlardan tahmin edilir.',
      'Bir sayfada aynı anda en fazla 8 grafik WebGL ile çizer; diğerleri Canvas 2D ile çizer.',
    ],
  },

  business: {
    metaTitle: 'İşletmeler için — TradeCanvas',
    description:
      'Ticari bir üründe TradeCanvas: MIT lisanslı, grafikte logo yok, kayıt yok, hiçbir yere veri gönderilmez. BT incelemesinin sorduğu sorular, kaynaklarıyla, ve ilk iş ortakları programı.',
    eyebrow: 'İşletmeler için',
    title: 'Alım satım grafiğiniz, kendi markanızla.',
    lede: 'TradeCanvas MIT lisanslıdır. Ticari bir ürüne koyun, değiştirin, kendiniz barındırın: müşterileriniz sizin markanızı görür, verileriniz de sizin sunucularınızda kalır.',
    ctaContact: 'Bizimle görüşün',
    ctaAudit: 'Sistem denetimini okuyun',

    freeTitle: 'Her kullanım için ücretsiz',
    free: [
      {
        title: 'Grafikte logo yok',
        body: 'TradeCanvas grafiğe ya da widget’a kendine ait hiçbir şey çizmez. MIT lisansı yalnızca metninin kodla birlikte kalmasını ister.',
      },
      {
        title: 'Hiçbir yere bir şey gönderilmez',
        body: 'Kütüphanede telemetri yoktur. Bağlantıyı yalnızca sizin başlattığınız bir veri adaptörü üzerinden açar: yerleşik borsa akışlarından biri ya da kendi akışınız.',
      },
      {
        title: 'Başvuru yok, onay yok',
        body: 'npm install yeterli; sistem denetimindeki her yetenek sizin, piyasa derinliği merdiveni, derinlik grafiği ve ısı haritası dahil.',
      },
      {
        title: 'Kaynak kodun tamamı',
        body: 'Okuyun, düzeltin, fork’layın. MIT kendi kodunuzdan hiçbir şey istemez: kod sizin kalır ve isterseniz kapalı kalır.',
      },
    ],

    reviewTitle: 'BT incelemesine hazır',
    reviewLede: 'Bir güvenlik ya da tedarikçi incelemesinin genellikle sorduğu sorular ve her yanıtın nerede doğrulanacağı.',
    reviewHtml: [
      'Üçüncü taraf çalışma zamanı bağımlılığı yok: grafik paketi yalnızca TradeCanvas’ın kendi core ve commons paketlerine bağlıdır.',
      '<code>eval</code> ve <code>new Function</code> kullanılmaz; bu yüzden <code>unsafe-eval</code> içermeyen bir Content Security Policy altında çalışır.',
      "Widget tek bir <code>&lt;style&gt;</code> öğesi ekler, bu yüzden bulunduğu sayfalarda <code>style-src 'unsafe-inline'</code> gerekir; headless <code>Chart</code> hiçbir şey eklemez.",
      'Güvenlik sorunları gizli olarak bildirilir ve bir hafta içinde yanıtlanır.',
      'Her pull request CI’da derlenir, tür denetiminden geçer ve test edilir: 3.000’den fazla birim testi.',
      'Sürümler bir geliştiricinin bilgisayarından değil, depodan GitHub Actions ile yayımlanır.',
      'Chrome 80+, Firefox 80+, Safari 14+ ve Edge 80+.',
      'Lisans: MIT, tek sayfa.',
    ],
    source: 'Kaynak',

    dataTitle: 'Verileriniz, sunucularınız',
    dataHtml:
      'Grafik, ona verdiğiniz barları, tick’leri ve emirleri çizer. Kendi arka ucunuzu bir <code>DataAdapter</code> ile ya da URL, geçmiş fonksiyonu ve mesaj ayrıştırıcısı verilmiş bir <code>WebSocketAdapter</code> ile bağlayın; emirler size ait bir yürütme adaptörü üzerinden gider. Realtime ve Trading belgeleri nasıl yapılacağını gösterir.',
    dataDocs: 'Realtime belgeleri',
    tradingDocs: 'Trading belgeleri',

    partnerTitle: 'İlk iş ortakları',
    partnerLede:
      'TradeCanvas’ı müşterilerine sunacak ilk aracı kurumları, alım satım platformlarını ve fintech ekiplerini arıyoruz.',
    partnerGetTitle: 'Size sunduklarımız',
    partnerGet: [
      'Veri akışınızı ve emirlerinizi bağlamada yardım',
      'Karşılaştığınız sorunlar önce çözülür',
      'Sırada ne geliştirileceği konusunda söz hakkı',
    ],
    partnerGiveTitle: 'Sizden istediklerimiz',
    partnerGive: ['Geliştirme sürecinde geri bildirim', 'Yayına geçtiğinizde sizi kullanıcı olarak anma izni'],
    partnerNote:
      'Yanıt süreleri sözleşmeyle güvence altına alınan ücretli destek, bir ana sürüm için uzun süreli destek ve size özel geliştirilen modüller daha sonra gelecek. Şimdi ihtiyacınız varsa bize söyleyin.',

    contactTitle: 'Bizimle görüşün',
    contactLede: 'Kim olduğunuzu, ne geliştirdiğinizi ve hangi piyasalar için olduğunu anlatın.',
    contactPublic: 'Kodla ilgili sorular en iyi herkese açık olarak, GitHub issues’ta sorulur.',

    faqTitle: 'Sorular',
    faq: [
      {
        q: 'TradeCanvas adını ya da logosunu göstermemiz gerekiyor mu?',
        a: 'Hayır. Lisans metnini kodla birlikte tutmanız yeterli, zaten node_modules içinde öyle duruyor; ekranda hiçbir şey görünmek zorunda değil.',
      },
      {
        q: 'Kendi kodumuzu yayımlamamız gerekiyor mu?',
        a: 'Hayır. MIT, çevresindeki koda hiçbir koşul koymaz.',
      },
      {
        q: 'Lisans bir gün aniden değişebilir mi?',
        a: 'Yayımlanmış her sürüm MIT’tir ve MIT olarak kalır: yayımlanmış bir sürümün lisansı geri alınamaz.',
      },
    ],
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
      styling: 'Görünüm',
      customization: 'Özelleştirme',
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
