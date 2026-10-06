import type { SiteMessages } from '../messages';

const id: SiteMessages = {
  meta: {
    title: 'TradeCanvas · Grafik trading berbasis Canvas untuk web',
    description:
      'TradeCanvas adalah pustaka grafik trading untuk web, digambar dengan Canvas 2D atau WebGL: 18 jenis grafik, 111 indikator, 69 alat gambar, feed bursa langsung, order di grafik, replay dan backtesting, dalam 30 bahasa. Tanpa dependensi, MIT.',
  },

  nav: {
    main: 'Menu utama',
    docs: 'Dokumentasi',
    examples: 'Contoh',
    playground: 'Playground',
    changelog: 'Catatan perubahan',
    toLight: 'Beralih ke tema terang',
    toDark: 'Beralih ke tema gelap',
    github: 'TradeCanvas di GitHub',
    openMenu: 'Buka menu',
    closeMenu: 'Tutup menu',
    menu: 'Menu',
    language: 'Bahasa',
  },

  footer: {
    tagline: 'Grafik trading untuk web, digambar dengan Canvas 2D atau WebGL. Tanpa dependensi, berlisensi MIT.',
    library: 'Pustaka',
    packages: 'Paket',
    project: 'Proyek',
    gettingStarted: 'Memulai',
    apiReference: 'Referensi API',
    examples: 'Contoh',
    changelog: 'Catatan perubahan',
    issues: 'Laporan masalah',
    boGrid: 'bo-grid (tabel data)',
    builtWith: 'Dibuat dengan TradeCanvas',
  },

  home: {
    release: 'perender WebGL, 30 bahasa',
    title: 'Mesin grafik untuk aplikasi trading.',
    ledeHtml:
      'Dari candlestick hingga Renko, 111 indikator, 69 alat gambar, feed bursa langsung, dan order di grafik. Digambar dengan Canvas 2D atau WebGL, tanpa dependensi. Pasang <code>ChartWidget</code> yang lengkap, atau bangun UI Anda sendiri di atas <code>Chart</code> yang headless.',
    getStarted: 'Mulai',
    browseExamples: 'Lihat contoh',
    specsLabel: 'Angka kunci',
    specs: [
      'indikator',
      'alat gambar',
      'jenis grafik',
      'bahasa widget',
      'bar pada 60 fps dengan WebGL',
      'dependensi runtime',
    ],
    tape: 'Harga langsung dari Binance',
    tapePause: 'Jeda harga',
    tapePlay: 'Putar harga',
    story: {
      eyebrow: 'Dari pandangan pertama hingga order terisi',
      title: 'Satu grafik untuk seluruh trade',
      subtitle: 'Empat grafik langsung, masing-masing mengerjakan bagiannya. Seret, zoom, dan gambar di atasnya.',
      chapters: [
        {
          title: 'Membaca pasar',
          text: 'Band, rata-rata, dan osilator di atas bar, level Fibonacci dan garis tren di atasnya, masing-masing dengan pengaturan dan peringatannya sendiri.',
          points: [
            '111 indikator, satu di atas yang lain, seperti rata-rata dari RSI',
            '69 alat gambar dengan magnet, grup, dan undo',
            'Peringatan pada harga, garis, dan persilangan indikator',
          ],
        },
        {
          title: 'Trading di grafik',
          text: 'Order, posisi, dan bracket-nya ada di skala harga. Seret stop untuk memindahkannya; broker paper mengisinya, jadi Anda bisa membangun sebelum terhubung.',
          points: [
            'Seret untuk memasang order, seret stop-loss dan take-profit untuk memindahkannya',
            'Tanda eksekusi serta untung dan rugi di grafik',
            'Broker Anda tersambung lewat satu adapter',
          ],
        },
        {
          title: 'Memutar ulang masa lalu',
          text: 'Telusuri riwayat bar demi bar atau biarkan berjalan: indikator, gambar, dan order paper mengikuti harga yang diputar ulang.',
          points: [
            'Bar awal mana pun, kecepatan berapa pun',
            'Setiap bar dapat terbentuk langkah demi langkah dari bar yang lebih halus',
            'Trading saat replay dengan broker paper',
          ],
        },
        {
          title: 'Skala tanpa tersendat',
          text: 'Di sini 200.000 bar dengan empat indikator, bergeser sendiri. Ganti perender dan lihat waktu per frame: dengan WebGL, GPU menggambar bar dan garis.',
          points: [
            '1.000.000 bar diperkecil pada 60 fps dengan WebGL',
            'Canvas 2D bila WebGL tidak ada, dengan tampilan yang sama',
            'Hanya bar di layar yang digambar',
          ],
        },
      ],
      frameTime: '{ms} ms per frame',
      panning: 'Bergeser sendiri sampai Anda mengambil alih',
      renderer: 'Perender',
      replaying: 'Memutar ulang',
    },
    trust: {
      label: 'Sumber terbuka',
      downloads: '{n} unduhan npm per bulan',
      license: 'lisensi {n}',
      dependencies: '{n} dependensi runtime',
      typescript: 'tipe {n} untuk setiap API',
    },
    hood: {
      eyebrow: 'Di balik layar',
      title: 'Terukur, terdokumentasi, siap Anda kembangkan',
      subtitleHtml: 'Mesin di balik Lab Fitur. Setiap angka di bawah dapat direproduksi dengan <code>pnpm bench</code>.',
      frameBudget: 'Anggaran frame',
      perf: [
        'tick langsung dengan 4 indikator pada 100k bar',
        'hitung ulang penuh setelah ganti simbol, 100k bar',
        'downsample LTTB, 100k → 1600 titik',
        'frame hover, tetap datar dari 500 hingga 100k bar',
      ],
      perfFoot: 'Dua kanvas bertumpuk: hover hanya menggambar ulang lapisan tipis di atas. Setiap renderer hanya menelusuri bar yang ada di layar.',
      gestures: 'Gestur',
      gestureList: [
        ['Seret', 'geser, juga melewati bar terakhir'],
        ['Gulir', 'perbesar/perkecil di sekitar kursor'],
        ['Cubit', 'perbesar/perkecil di layar sentuh'],
        ['Seret ke kanan', 'bar lama dimuat seiring Anda menggeser'],
        ['Seret sumbu', 'skalakan sumbu'],
        ['Ctrl + seret', 'pilih gambar'],
        ['Shift + seret', 'ukur'],
        ['Alt + klik', 'sematkan tooltip'],
      ],
    },
    capabilities: [
      {
        label: 'Widget',
        title: 'Satu panggilan, UI trading lengkap',
        text: 'ChartWidget menghadirkan bilah alat, panel samping menggambar, daftar pantauan, peringatan, pohon objek, jendela data, putar ulang, dan palet perintah (Ctrl+K), dalam 30 bahasa, dari bahasa Inggris dan Vietnam hingga Tionghoa, Jepang, Korea, dan Arab.',
      },
      {
        label: 'Data',
        title: 'Feed pasar apa pun',
        text: 'Adaptor Binance, Coinbase, Bybit, dan Kraken sudah tersedia; WebSocketAdapter dan PollingAdapter untuk sumber lainnya. Bar lama dimuat saat Anda menggulir mundur; koneksi tersambung ulang dengan sendirinya, dan pergantian simbol yang sudah usang dibuang.',
      },
      {
        label: 'Trading',
        title: 'Order di grafik',
        text: 'ExecutionAdapter dengan broker simulasi, pembuatan order dengan menyeret, order bracket, garis stop-loss dan take-profit yang bisa diseret, peringatan ke webhook, dan notifikasi desktop.',
      },
      {
        label: 'Framework',
        title: 'React, Vue, dan Svelte',
        text: '@tradecanvas/react, /vue, dan /svelte membungkus mesin yang sama dengan props reaktif dan bertipe. Instans Chart yang lengkap tetap bisa dijangkau lewat satu ref.',
      },
      {
        label: 'Plugin',
        title: 'Perluas setiap lapisan',
        text: 'Daftarkan indikator kustom dengan update() inkremental, alat gambar, jenis grafik, dan overlay, secara global atau per grafik.',
      },
      {
        label: 'Analitik',
        title: 'Backtest di samping grafik',
        text: 'Backtester bar demi bar dengan pita Monte Carlo dan pipeline indikator di Web Worker yang menjaga thread utama tetap lega.',
      },
    ],
    quickstart: {
      eyebrow: 'Mulai cepat',
      title: 'Grafik yang sama, lima cara memulai',
      subtitle: 'Widget lengkap, komponen framework, atau mesin headless. Semuanya memakai renderer yang sama.',
      tabs: 'Varian mulai cepat',
    },
    closing: {
      title: 'Pasang grafik langsung di aplikasi Anda hari ini.',
      readDocs: 'Baca dokumentasi',
      star: 'Beri bintang di GitHub',
    },
  },

  lab: {
    eyebrow: 'Lab Fitur',
    title: 'Setiap fitur, di grafik langsung.',
    subtitleHtml:
      'Pilih sebuah skenario. Masing-masing menjalankan <code>ChartWidget</code> lengkap dalam kondisi yang menampilkan satu area sedang bekerja — setelah itu, silakan seret, gambar, dan ganti sesuka Anda.',
    scenes: 'Skenario fitur',
    widgetLanguage: 'Bahasa widget',
    widgetLook: 'Tampilan widget',
    widgetRenderer: 'Perender',
    idle: 'Gulir hingga terlihat untuk memulai grafik langsung',
    metricHint: 'Ganti simbol atau kerangka waktu untuk mengukur waktunya',
    metricSwitch: '→ {label}: {ms} · {bars} bar',
    metricSetData: 'setData({bars} bar): {ms}',
    metricLook: "setUI('{name}'): {ms}",
    metricRenderer: '{name}: {ms} per frame saat menggeser',
    metricRendererMissing: 'WebGL 2 tidak tersedia: menggambar dengan Canvas 2D',
    tryThis: 'Coba ini',
  },

  scenes: {
    drawings: {
      title: 'Alat gambar',
      stat: '69 alat',
      blurb:
        'Alat Fibonacci dan Gann dengan level buatan sendiri, gelombang Elliott, pola harmonik, catatan, dan kuas. Klik ganda pada gambar untuk membuka pengaturannya, klik kanan untuk menunya; peringatan mengikuti garis tren, dan alat posisi long/short menghitung ukuran posisi.',
      tryThis: [
        'Klik ganda pada Fibonacci retracement lalu ubah levelnya',
        'Klik kanan sebuah gambar: bawa maju, kelompokkan, atau tambahkan peringatan',
        'Pilih kuas atau alat jalur; Enter mengakhiri sebuah jalur',
      ],
    },
    indicators: {
      title: 'Indikator',
      stat: '111 bawaan',
      blurb:
        'Overlay dan panel dihitung sendiri oleh pustaka, tanpa dependensi matematika. Tick langsung hanya menghitung ulang bar yang sedang terbentuk — 0.001 ms per tick dengan empat indikator pada 100k bar.',
      tryThis: [
        'Tekan tombol Indikator (atau Ctrl+K) dan cari salah satu dari 111 indikator',
        'Klik nama indikator di legenda: parameter, warna, dan level',
        'Atur Sumber sebuah moving average ke garis indikator lain',
        'Seret garis di antara panel untuk mengubah ukurannya; tombol di kanan atas panel memindahkan, menciutkan, atau memaksimalkannya',
        '⋯ pada baris legenda memindahkan indikator ke panel di atas atau di bawah, atau ke panel tersendiri',
        'Menu Indikator → Simpan indikator sebagai templat…; Ctrl+Z juga mengurungkan perubahan indikator',
        'Ketik angka di grafik (4, lalu h, Enter) untuk mengganti kerangka waktu; Alt+T memilih garis tren',
      ],
    },
    trading: {
      title: 'Trading',
      stat: 'broker simulasi',
      blurb:
        'Order dan posisi yang Anda kelola langsung dari grafik: seret stop dan target; batalkan, tutup, atau balik posisi dari garisnya; dan lihat setiap eksekusi ditandai pada bar-nya. Tiket order dan panel akun ada di bawah grafik; semuanya diteruskan lewat ExecutionAdapter — di sini memakai broker simulasi bawaan.',
      tryThis: [
        'Tekan ⇅ pada posisi long yang terbuka untuk membaliknya, atau × untuk menutupnya — eksekusinya tampil sebagai tanda pada bar-nya',
        'Klik kanan di bawah harga: beli limit, jual stop, atau order baru di harga itu',
        'Panel akun di bawah grafik menampilkan posisi beserta P&L-nya, order, dan riwayat',
        'Seret garis SL / TP pada posisi long yang terbuka — broker akan memperbaruinya',
        'Tanda + di samping sumbu harga menawarkan peringatan, order, atau garis di harga tersebut',
      ],
    },
    workspace: {
      title: 'Ruang kerja',
      stat: 'multi-grafik',
      blurb:
        'Dua grafik berdampingan, terhubung lewat crosshair — atau lewat simbol, kerangka waktu, waktu, dan gambar sesuai pilihan Anda. Simpan seluruh ruang kerja sebagai tata letak bernama dan buka lagi kapan saja.',
      tryThis: [
        'Arahkan kursor ke satu grafik: grafik lainnya menunjukkan waktu yang sama',
        'Aktifkan Kerangka waktu di bilah Sinkronkan, lalu ubah kerangka waktu salah satu grafik',
        'Pilih empat grafik di bilah; saat Simbol disinkronkan, grafik baru terbuka dengan simbol grafik yang aktif',
        'Tata letak ▾ → Simpan sebagai…, ubah sesuatu, lalu buka lagi tata letaknya (Ctrl+S untuk menyimpan)',
      ],
    },
    navigation: {
      title: 'Rentang & tata letak',
      stat: '1D … Semua',
      blurb:
        'Lompat ke suatu rentang atau tanggal, balik skala harga, sematkan kerangka waktu yang Anda pakai, jalankan indikator yang sama beberapa kali — lalu pulihkan semuanya dari tata letak yang tersimpan.',
      tryThis: [
        'Klik 1M, 3M, atau 6M di bawah grafik; Alt+G untuk ke tanggal tertentu',
        'Alt+I membalik skala harga; skala logaritmik ada di Pengaturan',
        'Pengaturan → Zona waktu: pilih New York atau Tokyo — sumbu, pemisah hari, dan YTD ikut menyesuaikan, termasuk waktu musim panas',
        'Pengaturan → Skala → Skala harga kiri; tab Gaya pada EMA bisa memindahkannya ke skala itu',
        'Beri bintang pada kerangka waktu di menu ▾ di samping tombol kerangka waktu',
        'Aktifkan tombol ↻ di bilah alat kiri untuk menggambar beberapa garis berturut-turut; Ctrl+C / Ctrl+V menyalinnya',
      ],
    },
    history: {
      title: 'Gulir ke masa lalu',
      stat: 'riwayat per halaman',
      blurb:
        'Bar lama dimuat halaman demi halaman saat Anda menyeret ke arah bar terlama, dan apa yang ada di layar tidak bergeser. Perkecil sampai semua bar yang dimuat muat di layar: di bawah satu piksel per bar, candle digabung per kolom piksel, sehingga ribuan bar tetap terbaca.',
      tryThis: [
        'Seret grafik ke kanan: label di kiri menunjukkan bar lama sedang dimuat',
        'Gulir untuk memperkecil, melewati beberapa ratus bar hingga seperempat piksel per bar',
        'Klik Semua di bawah grafik untuk menampilkan semua yang sudah dimuat',
        'Ketik 7 atau 90 di menu kerangka waktu ▾: Binance tidak menyediakan keduanya, jadi grafik menyusunnya dari bar 1m dan 30m',
      ],
    },
    replay: {
      title: 'Putar ulang bar',
      stat: 'penggeser',
      blurb:
        'Telusuri riwayat bar demi bar untuk berlatih membaca grafik tanpa tahu kelanjutannya. Data langsung ditahan selama putar ulang; skala harga menyesuaikan setiap langkah.',
      tryThis: [
        'Tekan putar, atau maju satu bar demi satu bar dengan Shift+→ / Shift+←',
        'Klik bar mana pun yang sudah terbuka untuk memindahkan kursor ke sana',
        '“Kembali ke waktu nyata” mengembalikan ke seri langsung',
        'Pilih Langkah yang lebih kecil di bilah putar ulang (15m) untuk melihat setiap bar terbentuk',
      ],
    },
    compare: {
      title: 'Bandingkan, selisih, rasio',
      stat: 'simbol',
      blurb:
        'ETH pada skala harga tersendiri di samping BTC, dan BTC ÷ ETH di sebuah panel. Simbol lain diselaraskan dengan grafik menurut waktu; selisih atau rasio punya legenda, label nilai, dan peringatan seperti indikator lainnya. Harga tertinggi dan terendah di layar ditandai.',
      tryThis: [
        'Buka pohon objek dan tekan + di samping Bandingkan: pilih simbol, lalu caranya',
        'Klik kanan panel rasio untuk skala persentase',
        'Klik kanan grafik: Ekspor data (CSV) ikut menyertakan setiap garis indikator',
        'Ganti kerangka waktu: bar simbol lain diambil ulang',
      ],
    },
    bonds: {
      title: 'Obligasi dalam 1/32',
      stat: 'format',
      blurb:
        'Sebuah obligasi yang dikuotasikan dalam 1/32 dan setengah 1/32 (110’165 berarti 110 dan 16½ per 32) pada bar tertinggi-terendah. Setiap harga di grafik — sumbu, crosshair, legenda, order, gambar — tampil dengan cara yang sama, dan tanda sumbu jatuh tepat pada pecahan bulat.',
      tryThis: [
        'Arahkan kursor: crosshair dan legenda tampil dalam 1/32',
        'Pengaturan → Tampilan → matikan Jam perdagangan diperpanjang untuk sesi reguler saja',
        'Beralih ke Renko atau Kagi dan atur ukuran kotak atau pembalikan di Pengaturan',
        'Gambar garis horizontal: labelnya juga tampil dalam 1/32',
      ],
    },
    subcent: {
      title: '30 bahasa, harga di bawah satu sen',
      stat: 'i18n',
      blurb:
        'Seluruh widget dalam 30 bahasa — menu, pengaturan, alat gambar, dialog, bahasa Arab, Ibrani, dan Persia dari kanan ke kiri — dengan angka dalam format masing-masing bahasa. PEPE diperdagangkan di sekitar 0.000004: setiap label mengikuti presisi skala harga, dan sumbu melebar agar semuanya muat.',
      tryThis: [
        'Pilih bahasa di atas grafik: 日本語, 한국어, 简体中文, Deutsch…',
        'Ctrl+P mencari semua simbol Binance, lengkap dengan nama, saat Anda mengetik',
        'Buka Pengaturan atau alat gambar untuk melihat terjemahannya',
        'Arahkan kursor: label crosshair mempertahankan presisi penuh dalam format angka bahasa tersebut',
      ],
    },
    looks: {
      title: 'Tampilan Anda sendiri',
      stat: '3 preset',
      blurb:
        'Bentuk dan ukuran widget adalah token: sudut, tinggi kontrol, tipografi, garis tepi, bayangan, cara tombol terpilih ditampilkan, bilah yang menempel atau melayang. Mulai dari Studio, Terminal, atau Capsule lalu ubah sesuka Anda; label harga di grafik ikut memakai sudut yang sama.',
      tryThis: [
        'Ganti tampilan di atas grafik: berubah di tempat, tanpa membangun ulang apa pun',
        'Buka Pengaturan, sebuah menu, atau alat gambar di setiap tampilan',
        'Capsule membuat bilah alat dan alat gambar melayang seperti pulau, dengan label harga berbentuk pil',
        'Terminal padat dan bersudut siku: label berhuruf kapital, dan garis di bawah kerangka waktu yang dipilih',
      ],
    },
    overrides: {
      title: 'Override gaya',
      stat: '89 kunci',
      blurb:
        'Bagian mana pun dari tampilan grafik lewat kunci, terpisah dari tema: grid di tiap arah, crosshair, sumbu, panel, legenda, harga terakhir, volume, dan warna tiap jenis grafik. Di sini grid vertikal dimatikan, grid horizontal bertitik, crosshair garis penuh, dan garis sinyal MACD putus-putus di panel dengan pemisahnya sendiri.',
      tryThis: [
        'Ganti jenis grafik: bar dan Heikin-Ashi memakai warna candle kalau tidak punya warna sendiri',
        'Ganti tema situs: yang tidak di-override mengikutinya',
        'Buka Pengaturan dan pilih warna: masuk ke lapisan pengguna, disimpan bersama temanya',
      ],
    },
    parts: {
      title: 'Widget Anda, bagian pilihan Anda',
      stat: '112 sakelar',
      blurb:
        'Setiap bagian widget punya sakelar, menyala sampai Anda mematikannya dan bisa diubah saat berjalan: satu kemampuan utuh (peringatan, pengaturan, pintasan) atau satu tempat (tombol toolbar, entri menu, kelompok alat gambar). Tombol, menu, dan item status milik Anda sendiri duduk di bilah-bilah widget. Di sini replay, dua kelompok alat gambar, dan unduhan data dimatikan, dan toolbar membawa menu sakelar.',
      tryThis: [
        'Buka “features” di toolbar lalu matikan dan nyalakan bagian-bagiannya',
        'Ikon mata di bawah bilah gambar menyembunyikan toolbar dan bilah status, lalu menampilkannya lagi',
        'Klik kanan sebuah gambar: entri terakhir milik halaman itu sendiri',
      ],
    },
    markets: {
      title: 'Daftar pantauan dan pasar',
      stat: 'harga langsung',
      blurb:
        'Daftar simbol dengan harga langsung dari feed, panel berisi harga simbol, status pasar dan angka hari ini, serta grafik tick: satu bar per 100 transaksi.',
      tryThis: [
        'Buka menu daftar pantauan: beralih ke Memes, buat daftar Anda sendiri, lalu ganti namanya',
        'Tambah simbol dengan +, seret baris untuk mengurutkan ulang, atau tekan Delete pada salah satunya',
        'Ketik 100T di grafik untuk satu bar per 100 transaksi, lalu 1m untuk kembali',
        'Arahkan kursor ke grafik untuk melihat tombol zoom dan gulir di bagian bawahnya',
      ],
    },
    bigdata: {
      title: '200 ribu bar',
      stat: 'performa',
      blurb:
        'Dua ratus ribu bar 1 menit dengan empat indikator. Rendering hanya menyentuh bar yang terlihat; kerangka waktu yang lebih besar di-resample secara lokal, di balik selubung pemuatan jika butuh lebih dari beberapa frame.',
      tryThis: [
        'Beralih antara Canvas 2D dan WebGL di atas grafik: tiap peralihan mengukur geseran singkat',
        'Dengan WebGL aktif, ganti jenis grafik ke Garis dasar, Kagi, atau Point & Figure: semuanya juga digambar GPU',
        'Ganti ke 1H, 4H, lalu kembali ke 1m — waktunya muncul di bawah grafik',
        'Perkecil sepenuhnya lalu geser: biaya per frame tetap datar',
        'Tambahkan satu indikator lagi dan perhatikan waktu pergantiannya',
      ],
    },
    heatmap: {
      title: 'Heatmap likuiditas',
      stat: '240 × 80 sel',
      blurb:
        'Dua ratus empat puluh snapshot order book, masing-masing 80 level harga, menjadi heatmap di belakang candle: volume antrean menyala per level, bid hijau dan ask merah, dan dinding yang bertahan lama tampak menonjol. Dengan WebGL, 19.200 sel digambar GPU di bawah bar.',
      tryThis: [
        'Beralih antara Canvas 2D dan WebGL di atas grafik: tiap peralihan mengukur geseran singkat',
        'Cari baris yang terang: dinding volume yang bertahan di satu harga dari waktu ke waktu',
        'Perbesar satu dinding lalu geser bolak-balik: sel-selnya mengikuti bar',
      ],
    },
    switching: {
      title: 'Ganti di jaringan lambat',
      stat: '+1.2 s latensi',
      blurb:
        'Setiap permintaan riwayat di sini ditunda 1.2 s. Grafik sebelumnya tetap di layar dan baru diselubungi jika pergantian butuh lebih dari 200 ms; klik cepat tidak akan pernah membuat respons usang menang.',
      tryThis: [
        'Klik beberapa simbol dengan cepat — hanya yang terakhir yang tampil',
        'Ganti kerangka waktu dan lihat selubungnya muncul lalu menghilang',
        'Bandingkan dengan skenario Indikator: pergantian cepat tidak pernah berkedip',
      ],
    },
  },

  gallery: {
    eyebrow: 'Jenis grafik',
    title: 'Setiap jenis grafik, langsung di halaman',
    subtitleHtml:
      'Setiap petak adalah instans <code>Chart</code> sungguhan, bukan gambar. Seret untuk menggeser, gulir untuk zoom, dan arahkan kursor untuk crosshair; setiap petak merespons sendiri-sendiri.',
    tiles: {
      candlestick: { name: 'Candlestick', tag: 'OHLC' },
      heikinAshi: { name: 'Heikin-Ashi', tag: 'Tren' },
      area: { name: 'Area', tag: 'Penutupan' },
      baseline: { name: 'Garis dasar', tag: 'Di atas / di bawah' },
      bar: { name: 'Bar OHLC', tag: 'Klasik' },
      stepLine: { name: 'Garis bertingkat', tag: 'Diskret' },
    },
  },

  finance: {
    eyebrow: 'Grafik keuangan',
    title: 'Lebih dari sekadar candlestick',
    subtitle: 'Sparkline, kurva ekuitas, kedalaman buku order, peta panas sektor, grafik air terjun, dan meteran untuk portofolio dan KPI.',
    portfolio: 'Kinerja portofolio',
    depth: 'Kedalaman buku order',
    heatmap: 'Peta panas pasar kripto',
    pnl: 'Atribusi laba/rugi',
    fearGreed: 'Indeks Ketakutan & Keserakahan',
    waterfall: {
      start: 'Awal',
      btcLong: 'BTC long',
      ethShort: 'ETH short',
      solLong: 'SOL long',
      fees: 'Biaya',
      end: 'Akhir',
    },
    zones: {
      extremeFear: 'Takut ekstrem',
      fear: 'Takut',
      neutral: 'Netral',
      greed: 'Serakah',
      extremeGreed: 'Serakah ekstrem',
    },
  },

  engage: {
    click: 'Klik untuk memakai grafik',
    tap: 'Ketuk untuk memakai grafik',
  },

  terminal: {
    symbol: 'Simbol',
    timeframe: 'Kerangka waktu',
    chartType: 'Jenis grafik',
    types: {
      candlestick: 'Candle',
      heikinAshi: 'Heikin-Ashi',
      area: 'Area',
      bar: 'Bar',
      baseline: 'Garis dasar',
    },
    unavailable: 'Feed langsung tidak tersedia: {error}',
    drawnWith: 'Digambar dengan {renderer}',
    live: 'LANGSUNG',
    offline: 'TERPUTUS',
    connecting: 'MENYAMBUNG',
    hints: [
      ['Seret', 'geser'],
      ['Klik + gulir', 'zoom'],
      ['Seret sumbu', 'skala'],
    ],
  },

  copy: {
    copy: 'SALIN',
    copied: 'TERSALIN',
    copiedAnnouncement: 'Disalin ke papan klip',
    copyLabel: 'Salin {label}',
    copyCode: 'Salin kode',
    codeSample: 'Contoh kode',
    packageManager: 'Manajer paket',
    copyInstall: 'Salin perintah instalasi',
  },

  examples: {
    metaTitle: 'Contoh · TradeCanvas',
    description: 'Contoh StackBlitz langsung untuk vanilla JS, React, Vue, Svelte, ChartWidget, dan dasbor keuangan.',
    eyebrow: 'Contoh · StackBlitz',
    title: 'Contoh',
    subtitleHtml:
      'Sandbox langsung yang bisa Anda fork dalam satu klik. Masing-masing terbuka di StackBlitz dengan paket 1.x terbaru yang sudah terpasang. Untuk mencoba fitur tanpa persiapan apa pun, gunakan <a href="{lab}">Lab Fitur</a> di beranda.',
    open: 'Buka {title} di StackBlitz',
    items: {
      vanilla: {
        title: 'Vanilla JS',
        blurb: 'Chart headless: stream Binance langsung, Bollinger + RSI, dan alat gambar di UI Anda sendiri.',
      },
      widget: {
        title: 'ChartWidget',
        blurb: 'UI trading lengkap dalam satu panggilan: bilah alat, 69 alat gambar, daftar pantauan, trading, putar ulang, dalam 30 bahasa.',
      },
      react: {
        title: 'React',
        blurb: '@tradecanvas/react — props reaktif dan bertipe, Chart di baliknya lewat ref.',
      },
      vue: {
        title: 'Vue 3',
        blurb: '@tradecanvas/vue — script setup, props reaktif, Chart dari @ready.',
      },
      svelte: {
        title: 'Svelte 5',
        blurb: '@tradecanvas/svelte — rune, props reaktif, bind:chart.',
      },
      finance: {
        title: 'Dasbor keuangan',
        blurb: 'Renderer sparkline, meteran, peta panas, kedalaman, dan kurva ekuitas dalam satu tata letak.',
      },
    },
  },

  playground: {
    metaTitle: 'Playground · TradeCanvas',
    description: 'Fork sandbox TradeCanvas yang interaktif di StackBlitz dan mulai bereksperimen.',
    eyebrow: 'Playground · StackBlitz',
    title: 'Playground',
    subtitle: 'Sandbox yang bisa diedit di StackBlitz, dengan ChartWidget yang sudah terhubung ke data Binance langsung.',
    launch: 'Buka playground',
    more: 'Contoh lainnya',
    insideTitle: 'Apa isinya',
    insideHtml:
      'Proyek Vite + TypeScript minimal dengan satu file, <code>src/main.ts</code>, yang memasang <code>ChartWidget</code> dan menghubungkan <code>BinanceAdapter</code>.',
  },

  changelog: {
    metaTitle: 'Catatan perubahan — TradeCanvas',
    description: 'Catatan rilis untuk setiap versi TradeCanvas.',
    englishOnly: 'Catatan rilis ditulis dalam bahasa Inggris.',
  },

  backtest: {
    title: 'Backtest langsung — persilangan SMA(10/30)',
    subtitle: '365 hari data harga sintetis, modal awal $10k, komisi 0,05%, slippage 0,03%.',
    play: 'Putar',
    pause: 'Jeda',
    replay: 'Putar ulang',
    end: 'Akhir',
    running: 'Menjalankan backtest…',
    failed: 'Gagal: {error}',
    bar: 'Bar {index}/{total}',
    totalReturn: 'Total imbal hasil',
    maxDrawdown: 'DD maks.',
    winRate: 'Rasio menang',
    profitFactor: 'Faktor profit',
    trades: 'Transaksi',
  },

  error: {
    notFound: 'Halaman tidak ditemukan',
    notFoundText: 'Halaman ini tidak ada atau sudah dipindahkan.',
    other: 'Terjadi kesalahan',
    otherText: 'Halaman tidak dapat ditampilkan. Coba lagi, atau mulai dari beranda.',
    home: 'Kembali ke beranda',
    docs: 'Buka dokumentasi',
  },

  docs: {
    titleSuffix: 'Dokumentasi TradeCanvas',
    navLabel: 'Navigasi dokumentasi',
    groups: {
      start: 'Memulai',
      chart: 'Grafik',
      trading: 'Trading',
    },
    pages: {
      'getting-started': 'Memulai',
      frameworks: 'Framework',
      embed: 'Widget Tertanam',
      api: 'Referensi API',
      styling: 'Tampilan',
      customization: 'Kustomisasi',
      'chart-types': 'Jenis Grafik',
      indicators: 'Indikator',
      'drawing-tools': 'Alat Gambar',
      plugins: 'Plugin',
      performance: 'Performa',
      trading: 'Overlay Trading',
      finance: 'Grafik Keuangan',
      realtime: 'Realtime & Putar Ulang',
      analytics: 'Analitik',
    },
    notTranslated: 'Halaman ini belum diterjemahkan, jadi ditampilkan dalam bahasa Inggris.',
  },
};

export default id;
