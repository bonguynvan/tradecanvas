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
    audit: 'Audit',
    business: 'Bisnis',
    toLight: 'Beralih ke tema terang',
    toDark: 'Beralih ke tema gelap',
    github: 'TradeCanvas di GitHub',
    sponsor: 'Sponsori',
    sponsorLabel: 'Sponsori TradeCanvas di GitHub',
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
    audit: 'Audit sistem',
    business: 'Untuk bisnis',
    issues: 'Laporan masalah',
    discussions: 'Diskusi',
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
      'dependensi runtime pihak ketiga',
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
        'Tanda beli, jual, dan transaksinya baru muncul saat replay mencapainya',
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
    vnmarket: {
      title: 'Pasar Vietnam',
      stat: 'HOSE · VN30F',
      blurb:
        'HOSE dan kontrak berjangka VN30 sebagaimana bursanya menjalankannya: harga dalam fraksi 10, 50, atau 100 dong menurut rentang harga, harga batas atas, batas bawah, dan harga acuan hari itu, lot berisi 100 saham, sesi perdagangan dalam zona waktu Vietnam, serta warna papan harga.',
      tryThis: [
        'Klik kanan grafik: harga yang ditawarkan selalu tepat di fraksi harga, 50 dong untuk HPG',
        'Buka order baru dari panel akun: dimulai dari 100 saham, dan harga di atas batas atas ditolak',
        'Beralih ke FPT (fraksi 100 dong) atau ke kontrak VN30F (mulai pukul 08.45)',
        'Garis ungu, sian, dan kuning adalah batas atas, batas bawah, dan harga acuan',
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
      stat: '101 kunci',
      blurb:
        'Bagian mana pun dari tampilan grafik lewat kunci, terpisah dari tema: grid di tiap arah, crosshair, sumbu, panel, legenda, harga terakhir, volume, dan warna tiap jenis grafik. Di sini grid vertikal dimatikan, grid horizontal bertitik, crosshair garis penuh, dan garis sinyal MACD putus-putus di panel dengan pemisahnya sendiri.',
      tryThis: [
        'Ganti jenis grafik: bar dan Heikin-Ashi memakai warna candle kalau tidak punya warna sendiri',
        'Ganti tema situs: yang tidak di-override mengikutinya',
        'Buka Settings: tab Gaya mengatur setiap kunci, termasuk warna jenis chart yang tampil; tab Trading mengatur warna order, penanda, dan zona, Otomatis sampai Anda memilih satu',
      ],
    },
    parts: {
      title: 'Widget Anda, bagian pilihan Anda',
      stat: '112 sakelar',
      blurb:
        'Setiap bagian widget punya sakelar, menyala sampai Anda mematikannya dan bisa diubah saat berjalan: satu kemampuan utuh (peringatan, pengaturan, pintasan) atau satu tempat (tombol toolbar, entri menu, kelompok alat gambar). Tombol, menu, dan item status milik Anda sendiri duduk di bilah-bilah widget. Di sini replay, dua kelompok alat gambar, dan unduhan data dimatikan, dan toolbar membawa menu sakelar.',
      tryThis: [
        'Buka “features” di toolbar lalu matikan dan nyalakan bagian-bagiannya',
        'Ikon mata di bawah bilah gambar menyembunyikan toolbar dan bilah status, lalu menampilkannya lagi (Alt+X)',
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
    subtitle: 'Sparkline, kurva ekuitas, kedalaman buku order, peta pasar per sektor, grafik air terjun, meteran, grafik batang, donat, sebar, histogram, kalender, dan matriks korelasi untuk portofolio dan KPI.',
    portfolio: 'Kinerja portofolio',
    depth: 'Kedalaman buku order',
    heatmap: 'Peta panas pasar kripto',
    pnl: 'Atribusi laba/rugi',
    fearGreed: 'Indeks Ketakutan & Keserakahan',
    flows: 'Beli bersih asing, miliar dong',
    flowSeries: 'Bersih',
    allocation: 'Alokasi portofolio',
    allocationTotal: 'Total',
    assets: { stocks: 'Saham', bonds: 'Obligasi', cash: 'Kas', gold: 'Emas' },
    riskReturn: 'Bank: risiko dan imbal hasil',
    banks: 'Bank',
    volatility: 'Volatilitas',
    yearReturn: 'Imbal hasil setahun',
    returns: 'Imbal hasil harian',
    mean: 'Rata-rata',
    var: 'VaR 95%',
    calendar: 'Perubahan harian per sesi',
    sectorMap: 'Peta pasar per sektor',
    sectors: { banks: 'Perbankan', realEstate: 'Properti', steel: 'Baja', retail: 'Ritel', energy: 'Energi', tech: 'Teknologi' },
    correlation: 'Saham bank: korelasi imbal hasil harian',
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

  audit: {
    metaTitle: 'Audit sistem — TradeCanvas',
    description:
      'Apa yang dilakukan TradeCanvas dan seberapa cepat: setiap kemampuan per area, waktu frame pada grafis terintegrasi, jalur data, ukuran unduhan, cara pengujiannya, dan batasan yang kami ketahui.',
    eyebrow: 'Audit sistem',
    title: 'Apa yang dikerjakannya, dan seberapa cepat.',
    ledeHtml:
      'Semua yang ada di halaman ini tersedia di <code>@tradecanvas/chart</code> {version}. Waktu frame diukur di Chrome pada laptop dengan grafis terintegrasi (Intel UHD); <code>node scripts/bench-render.mjs</code> di repositori menjalankan adegan yang sama di perangkat Anda.',
    numbersTitle: 'Dalam angka',
    numbers: [
      'jenis grafik',
      'indikator bawaan',
      'alat gambar',
      'bahasa widget',
      'kunci gaya',
      'sakelar fitur widget',
      'dependensi runtime pihak ketiga',
      'uji unit',
    ],

    perfTitle: 'Waktu frame',
    perfLede: 'Waktu untuk menggambar satu frame saat menggeser. 16,7 ms berarti 60 frame per detik.',
    perfChart: 'Grafik',
    perfRatio: 'Rasio piksel',
    perf: [
      '1600×900, 500 candle + 4 indikator',
      '1600×900, diperkecil hingga 200.000 bar + 4 indikator',
      '1600×900, diperkecil hingga 1.000.000 bar + 4 indikator',
      '1600×900, heatmap kedalaman, 240 snapshot × 80 level',
      'Enam grafik, masing-masing 500 candle dan 2 indikator',
      '2560×1400, 2.000 candle + 4 indikator',
      '2560×1400, 2.000 candle + 4 indikator',
      '2560×1400, 2.000 candle + 4 indikator',
    ],
    perfNoteHtml:
      'Canvas 2D adalah bawaannya. <code>renderer: \'webgl\'</code> (atau <code>\'auto\'</code>) menggambar area plot dengan WebGL 2 dan kembali ke Canvas 2D bila WebGL 2 tidak tersedia atau konteksnya hilang.',

    dataTitle: 'Jalur data',
    data: [
      'Tick langsung dengan Bollinger Bands, EMA, RSI, dan MACD pada 100.000 bar',
      'Empat indikator yang sama dihitung ulang penuh pada 100.000 bar',
      'Garis berisi 1.000.000 titik yang terlihat, di-downsample untuk satu frame',
      'Gambar ulang saat hover (crosshair, legenda)',
      'Pergantian simbol atau kerangka waktu baru menampilkan tirai pemuatan setelah',
    ],

    sizeTitle: 'Ukuran unduhan',
    sizeLede: 'Diminifikasi dan di-gzip, beserta semua yang diimpornya.',
    size: ['Chart, API headless', 'ChartWidget, antarmuka lengkap', 'Perender WebGL, dimuat saat pertama dipakai'],

    qualityTitle: 'Cara pemeriksaannya',
    quality: [
      'Lebih dari 3.000 uji unit di tujuh paket berjalan di CI pada setiap pull request.',
      'Perender WebGL menggambar candle pada piksel perangkat yang sama dengan Canvas 2D; garis dan isian hanya berbeda pada beberapa piksel tepi yang di-antialias.',
      'Perender WebGL telah diperiksa di Chromium, Firefox, dan WebKit. Tanpa WebGL 2, atau saat konteksnya hilang, grafik tetap berjalan dengan Canvas 2D.',
      'Contoh kode di dokumentasi dan di skill agen diperiksa tipenya terhadap API yang sebenarnya.',
      'Grafik dapat dibacakan oleh pembaca layar dan dioperasikan dengan keyboard; widget berjalan dari kanan ke kiri dalam bahasa Arab, Ibrani, dan Persia.',
    ],

    catalogTitle: 'Kemampuan',
    catalogLede: 'Saring berdasarkan area, atau cari berdasarkan nama atau API.',
    search: 'Cari kemampuan',
    searchPlaceholder: 'replay, webgl, peringatan…',
    all: 'Semua',
    count: '{shown} dari {total}',
    colCapability: 'Kemampuan',
    colArea: 'Area',
    colDetail: 'Detail dan API',
    areas: {
      chartTypes: 'Jenis grafik',
      rendering: 'Rendering',
      indicators: 'Indikator',
      drawings: 'Alat gambar',
      scales: 'Skala dan waktu',
      data: 'Data dan realtime',
      trading: 'Trading',
      alerts: 'Peringatan dan replay',
      workspace: 'Ruang kerja',
      customization: 'Kustomisasi',
      access: 'Bahasa dan aksesibilitas',
      developers: 'Pengembang',
    },
    catalog: {
      chartTypes: [
        { name: 'Candle, bar OHLC, garis, area, baseline, Heikin-Ashi, candle berongga', detail: 'candlestick, bar, line, area, baseline, heikinAshi, hollowCandle' },
        { name: 'Renko, line break, Kagi, point & figure, range bar', detail: 'Ukuran kotak atau ATR, jumlah garis untuk break, pembalikan dalam persen atau harga, rentang per bar' },
        { name: 'Candle volume, Equivolume, area HLC, garis tangga, garis dengan penanda, high-low', detail: 'Total 18 jenis grafik' },
        { name: 'Seri utama disembunyikan', detail: 'Hanya indikator dan gambar yang tetap tampil' },
        { name: 'Grafik untuk dasbor', detail: 'Batang (berkelompok, bertumpuk, mendatar), donat dan pai, sebar dan gelembung, histogram, kalender, matriks korelasi, peta per sektor, sparkline, meteran, peta panas dan treemap, air terjun, kedalaman, kurva ekuitas' },
      ],
      rendering: [
        { name: 'Canvas 2D atau WebGL 2', detail: "renderer: 'canvas' | 'webgl' | 'auto', setRenderer, event rendererChange" },
        { name: 'Satu rentang per kolom piksel saat diperkecil', detail: 'Garis, band, dan histogram indikator di bawah satu piksel per bar' },
        { name: 'Sejuta bar digeser dengan mulus', detail: 'Dengan empat indikator, pada rasio piksel 2' },
        { name: 'Heatmap kedalaman, profil volume, dan market profile di GPU', detail: 'pushDepthSnapshot(book, time)' },
        { name: 'Beberapa grafik WebGL dalam satu halaman', detail: 'Hingga 8 (setMaxWebGLCharts); sisanya digambar dengan Canvas 2D; kembali ke WebGL saat konteksnya pulih' },
        { name: 'Tajam di skala layar mana pun', detail: 'Candle, volume, dan gambar tepat di piksel perangkat pada 100%, 125%, dan 200%' },
        { name: 'Tanpa dependensi runtime pihak ketiga', detail: 'Tidak ada lagi yang perlu dipasang atau diaudit' },
      ],
      indicators: [
        { name: '111 indikator bawaan', detail: 'Pivot point dalam enam jenis, MA Cross, korelasi dengan simbol lain' },
        { name: 'Sumber harga', detail: 'open, high, low, hl2, hlc3, ohlc4, hlcc4' },
        { name: 'Indikator di atas indikator', detail: 'Misalnya rata-rata bergerak dari RSI, diperbarui di setiap tick' },
        { name: 'Beberapa indikator dalam satu panel, dipindahkan antarpanel', detail: 'moveIndicatorToPane' },
        { name: 'Beberapa indikator yang sama', detail: 'EMA 20 dan EMA 50 berdampingan' },
        { name: 'Level dan ambang', detail: 'RSI 30/70, CCI ±100, disimpan bersama tata letak' },
        { name: 'Nilai terakhir di sumbu', detail: 'Di sumbu harga dan sumbu tiap panel, dengan warna garisnya' },
        { name: 'Panel diciutkan, dimaksimalkan, dan diurutkan ulang', detail: 'Disimpan bersama tata letak' },
        { name: 'Templat indikator', detail: 'Input, gaya, level, dan panel disimpan dan diterapkan bersama' },
        { name: 'Gaya dan visibilitas setiap garis', detail: 'Garis yang tersembunyi tidak meregangkan skala; setIndicatorDefaults' },
        { name: 'Volume delta dan CVD', detail: 'Diperkirakan dari bar' },
        { name: 'Ekspor nilai indikator', detail: 'CSV atau JSON, satu kolom per garis' },
        { name: 'Pembaruan inkremental pada tick langsung', detail: 'update() hanya menghitung ulang bar yang sedang terbentuk' },
      ],
      drawings: [
        { name: '69 alat gambar', detail: 'Garis, kanal, Fibonacci, Gann, pitchfork, gelombang Elliott, pola, siklus, proyeksi' },
        { name: 'Pengaturan khusus setiap alat', detail: 'Gaya, properti, dan koordinat pada kisi harga pasar' },
        { name: 'Posisi long dan short', detail: 'Risk:reward, kuantitas dari risiko dalam persen atau uang' },
        { name: 'Peringatan pada gambar', detail: 'Saat harga melintasi garis tren atau kanal sesuai gambarnya, termasuk pada skala log' },
        { name: 'Urutan, grup, dan templat', detail: 'Bawa ke depan, kirim ke belakang, kelompokkan, kunci, sembunyikan' },
        { name: 'Catatan, callout, panah, bendera, kuas, path, kurva', detail: 'Menggambar bebas dan multi-titik' },
        { name: 'Anchored VWAP dan profil volume rentang tetap', detail: 'Membaca bar grafik' },
        { name: 'Penghapus, kotak zoom, magnet kuat, pintasan keyboard', detail: 'Alt+T, Alt+H, Alt+J, Alt+V, Alt+C, Alt+F' },
      ],
      scales: [
        { name: 'Lompat ke tanggal; rentang 1D hingga All', detail: 'Tanpa batas perkecil' },
        { name: 'Zona waktu IANA dengan waktu musim panas', detail: 'Atau zona waktu bursa itu sendiri' },
        { name: 'Kerangka waktu apa pun, dan bar tick', detail: '7m, 90m, 2d dibangun dari data yang disajikan feed; 100T dari transaksinya' },
        { name: 'Skala kiri dan kanan; log, terbalik, dan persen per panel', detail: 'Skala kiri untuk overlay atau salinan skala harga' },
        { name: 'Bandingkan simbol, spread, dan rasio', detail: 'Pada skala atau panelnya sendiri, dicocokkan menurut waktu' },
        { name: 'Jam perdagangan diperpanjang', detail: 'Dari jam sesi simbol' },
        { name: 'Format harga dan waktu', detail: 'priceFormat sebagai fungsi atau pecahan seperti 1/32; timeFormatter' },
        { name: 'Skala mengikuti desimal dan langkah harga simbol', detail: 'pricePrecision, minTick: saham yang bergerak per 10 tidak pernah menampilkan 21.705' },
        { name: 'Garis tertinggi dan terendah, bid dan ask', detail: 'Bid dan ask dari tick feed' },
        { name: 'Tanda peristiwa di grafik', detail: 'signalMarkerHover, signalMarkerClick' },
      ],
      data: [
        { name: 'Feed siap pakai dan feed Anda sendiri', detail: 'Binance, Bybit, Coinbase, Kraken, mock; WebSocketAdapter, PollingAdapter' },
        { name: 'Riwayat lama dimuat saat menggulir ke kiri', detail: 'fetchHistoryBefore' },
        { name: 'Pencarian simbol dengan detail', detail: 'searchSymbols, resolveSymbol: desimal, langkah harga, sesi, zona waktu' },
        { name: 'Detail simbol yang diketahui setelah terhubung', detail: 'Event symbolInfo dari adaptor' },
        { name: 'Tangga depth-of-market', detail: 'Ukuran bid dan ask per harga; klik untuk trading' },
        { name: 'Kuotasi langsung untuk daftar pantauan', detail: 'subscribeQuotes, setQuotes, getQuote' },
        { name: 'Berita dan status pasar', detail: 'fetchNews; hitung mundur ke pembukaan atau penutupan' },
        { name: 'Aturan bursa', detail: 'setMarket: fraksi harga per rentang harga, batas atas dan batas bawah harian, lot, sesi; HOSE, HNX, UPCoM, dan kontrak berjangka VN30' },
      ],
      trading: [
        { name: 'Order dan posisi di grafik', detail: 'Seret untuk mengubah; batalkan, tutup, dan balik dari garisnya' },
        { name: 'Tanda eksekusi', detail: 'Alasan serta untung atau rugi di executionFill' },
        { name: 'Tiket order', detail: 'Kuantitas, tipe, stop-loss dan take-profit, masa berlaku, diperiksa saat Anda mengetik; fraksi harga, batas atas, batas bawah, dan lot bursa' },
        { name: 'Panel akun', detail: 'Posisi dengan untung dan rugi langsung, order aktif, eksekusi' },
        { name: 'Sinyal dan zona trading', detail: 'Kunci gaya markers.*, tradeZones.*' },
        { name: 'Backtesting dan metrik risiko', detail: '@tradecanvas/analytics: komisi, slippage, Sharpe, Sortino, Calmar, drawdown' },
      ],
      alerts: [
        { name: 'Peringatan lebih dari sekadar level harga', detail: 'Garis memotong garis, pergerakan N% dalam N bar, saat bar tutup, dengan masa berlaku' },
        { name: 'Replay bar dengan langkah lebih halus', detail: 'Kerangka waktu besar diputar ulang dari bar yang lebih kecil' },
        { name: 'Paper trading saat replay', detail: 'Order terisi pada harga yang diputar ulang' },
        { name: 'Replay di seluruh grid grafik', detail: 'Semua grafik tetap selaras' },
        { name: 'Replay untuk aplikasi', detail: 'startTime, hideHistory, duration, tanda yang muncul seiring pemutaran, replayComplete' },
      ],
      workspace: [
        { name: 'Grid widget yang tersinkron', detail: 'Hingga 6, berbagi simbol, kerangka waktu, crosshair, waktu, dan gambar' },
        { name: 'Tata letak bernama di penyimpanan Anda sendiri', detail: 'Simpan, buka, ganti nama, simpan otomatis; LayoutStorage untuk server' },
        { name: 'Undo dan redo untuk semuanya', detail: 'Gambar, indikator, pengaturan, dan jenis grafik; recordUndo' },
        { name: 'Menu konteks per area', detail: 'Gambar, area plot, panel, sumbu harga, sumbu waktu' },
        { name: 'Daftar pantauan', detail: 'Beberapa daftar, diurutkan dengan menyeret' },
        { name: 'Event untuk aplikasi host', detail: 'symbolChange, timeframeChange, ordersChange, executionFill, styleChange, dan lainnya' },
      ],
      customization: [
        { name: 'Tiga tampilan widget', detail: 'Studio, Terminal, Capsule; ui dan setUI; variabel CSS --tcw-*' },
        { name: 'Tampilan grafik per kunci', detail: 'applyOverrides atas 101 kunci bertipe, pada lapisan host dan lapisan pengguna' },
        { name: 'Pengaturan yang menjangkau setiap kunci', detail: 'Tab gaya untuk jenis grafik yang sedang tampil, tab trading' },
        { name: '112 sakelar fitur', detail: 'features, setFeatures, isFeatureOn; dapat diubah saat berjalan' },
        { name: 'Komponen Anda sendiri di widget', detail: 'Tombol dan dropdown bilah alat, tombol panel samping, item status, slot, item menu' },
        { name: 'Pintasan Anda sendiri', detail: 'addHotkey sesuai tata letak keyboard' },
      ],
      access: [
        { name: 'Widget dalam 30 bahasa', detail: 'Arab, Ibrani, dan Persia dari kanan ke kiri' },
        { name: 'Pembaca layar dan keyboard', detail: 'Ringkasan grafik, bar dibacakan satu per satu, dialog lewat keyboard' },
        { name: 'Dokumentasi dalam enam bahasa, situs ini dalam empat belas', detail: 'English, Tiếng Việt, 简体中文, 日本語, 한국어, Español' },
      ],
      developers: [
        { name: 'Komponen React, Vue, dan Svelte', detail: 'Props reaktif: overrides, indicators, features' },
        { name: 'Plugin', detail: 'Indikator, alat gambar, jenis grafik, dan overlay; overlayScale dan getPriceStep untuk menggambar di kisi harga' },
        { name: 'Dokumentasi untuk agen coding', detail: 'llms.txt, llms-full.txt, dan skill agen' },
      ],
    },

    limitsTitle: 'Batasan yang diketahui',
    limits: [
      'Canvas 2D tetap menjadi perender bawaan sampai WebGL dicoba di lebih banyak perangkat; frame rate WebGL di Safari dan di layar 5K belum diukur.',
      'Pada rasio piksel 2 di grafik 2560×1400, compositing browser saja memakan sekitar 23 ms pada grafis terintegrasi, sehingga frame WebGL di sana rata-rata 29 ms.',
      'Kerangka waktu tick dibangun dari transaksi terbaru yang dikembalikan feed; riwayat tick yang lebih lama tidak bisa dimuat.',
      'Volume delta dan CVD diperkirakan dari bar, bukan dari sisi setiap transaksi.',
      'Paling banyak 8 grafik dalam satu halaman yang menggambar dengan WebGL sekaligus; sisanya menggambar dengan Canvas 2D.',
    ],
  },

  business: {
    metaTitle: 'Untuk bisnis — TradeCanvas',
    description:
      'TradeCanvas dalam produk komersial: lisensi MIT, tanpa logo di grafik, tanpa pendaftaran, tidak ada yang dikirim ke mana pun. Hal-hal yang ditanyakan tinjauan TI, lengkap dengan sumbernya, serta program mitra pertama.',
    eyebrow: 'Untuk bisnis',
    title: 'Grafik trading Anda, dengan merek Anda sendiri.',
    lede: 'TradeCanvas berlisensi MIT. Pakai di produk komersial, ubah sesuai kebutuhan, host sendiri: pelanggan Anda melihat merek Anda, dan data Anda tetap di server Anda.',
    ctaContact: 'Hubungi kami',
    ctaAudit: 'Baca audit sistem',

    freeTitle: 'Gratis, untuk penggunaan apa pun',
    free: [
      {
        title: 'Tanpa logo di grafik',
        body: 'Tidak ada apa pun dari TradeCanvas yang digambar di grafik atau di widget. Lisensi MIT hanya meminta agar teksnya tetap menyertai kode.',
      },
      {
        title: 'Tidak ada yang dikirim ke mana pun',
        body: 'Pustaka ini tidak memiliki telemetri. Koneksi hanya dibuka lewat adapter data yang Anda jalankan: salah satu feed bursa bawaan, atau milik Anda sendiri.',
      },
      {
        title: 'Tanpa pengajuan, tanpa persetujuan',
        body: 'Cukup npm install, dan semua kemampuan dalam audit sistem menjadi milik Anda, termasuk tangga depth-of-market, grafik kedalaman, dan heatmap.',
      },
      {
        title: 'Seluruh kode sumber',
        body: 'Baca, perbaiki, fork. MIT tidak menuntut apa pun dari kode Anda sendiri: kode itu tetap milik Anda dan tetap tertutup jika Anda menginginkannya.',
      },
    ],

    reviewTitle: 'Siap untuk tinjauan TI',
    reviewLede: 'Hal-hal yang biasanya ditanyakan dalam tinjauan keamanan atau tinjauan vendor, dan tempat memeriksa setiap jawabannya.',
    reviewHtml: [
      'Tanpa dependensi runtime pihak ketiga: paket chart hanya bergantung pada core dan commons milik TradeCanvas sendiri.',
      'Tanpa <code>eval</code> dan tanpa <code>new Function</code>, sehingga berjalan di bawah Content Security Policy tanpa <code>unsafe-eval</code>.',
      "Widget menambahkan satu elemen <code>&lt;style&gt;</code>, sehingga halamannya memerlukan <code>style-src 'unsafe-inline'</code>; <code>Chart</code> headless tidak menambahkan apa pun.",
      'Masalah keamanan dilaporkan secara privat dan ditanggapi dalam satu minggu.',
      'Setiap pull request di-build, diperiksa tipenya, dan diuji di CI: lebih dari 3.000 uji unit.',
      'Rilis diterbitkan oleh GitHub Actions dari repositori, bukan dari mesin seorang developer.',
      'Chrome 80+, Firefox 80+, Safari 14+, dan Edge 80+.',
      'Lisensinya: MIT, satu halaman.',
    ],
    source: 'Sumber',

    dataTitle: 'Data Anda, server Anda',
    dataHtml:
      'Grafik menggambar bar, tick, dan order yang Anda berikan. Hubungkan backend Anda sendiri dengan <code>DataAdapter</code>, atau <code>WebSocketAdapter</code> yang diberi URL, fungsi riwayat, dan parser pesan; order dikirim melalui execution adapter milik Anda. Dokumentasi Realtime dan Trading menunjukkan caranya.',
    dataDocs: 'Dokumentasi Realtime',
    tradingDocs: 'Dokumentasi Trading',

    partnerTitle: 'Mitra pertama',
    partnerLede:
      'Kami mencari broker, platform trading, dan tim fintech pertama yang menghadirkan TradeCanvas kepada pelanggan mereka.',
    partnerGetTitle: 'Yang Anda dapatkan',
    partnerGet: [
      'Bantuan menghubungkan feed data dan order Anda',
      'Masalah yang Anda temui diperbaiki lebih dulu',
      'Suara dalam menentukan apa yang dibangun berikutnya',
    ],
    partnerGiveTitle: 'Yang kami minta',
    partnerGive: ['Masukan selama Anda membangun', 'Izin menyebut Anda sebagai pengguna setelah produk Anda live'],
    partnerNote:
      'Dukungan berbayar, dengan waktu respons yang dijamin kontrak, dukungan jangka panjang untuk satu versi mayor, dan modul yang dibuat khusus untuk Anda, menyusul nanti. Jika Anda membutuhkannya sekarang, beri tahu kami.',

    contactTitle: 'Hubungi kami',
    contactLede: 'Ceritakan siapa Anda, apa yang sedang Anda bangun, dan untuk pasar mana.',
    contactPublic: 'Pertanyaan tentang kode sebaiknya diajukan secara publik, di GitHub issues.',

    faqTitle: 'Pertanyaan',
    faq: [
      {
        q: 'Apakah kami harus menampilkan nama atau logo TradeCanvas?',
        a: 'Tidak. Cukup simpan teks lisensi bersama kode, seperti yang sudah ada di node_modules; tidak ada yang harus tampil di layar.',
      },
      {
        q: 'Apakah kami harus memublikasikan kode kami sendiri?',
        a: 'Tidak. MIT tidak memberi syarat apa pun pada kode di sekitarnya.',
      },
      {
        q: 'Bisakah lisensinya berubah sewaktu-waktu?',
        a: 'Setiap versi yang sudah dirilis berlisensi MIT dan tetap MIT: lisensi sebuah rilis yang sudah diterbitkan tidak dapat ditarik kembali.',
      },
    ],
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
