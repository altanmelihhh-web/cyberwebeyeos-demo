/**
 * Page Info System - Her sayfa icin bilgi paneli
 * Sayfa basligindaki (i) butonuna tiklaninca modal acar
 */

const PAGE_INFO_DATA = {

  // ===================== DASHBOARD =====================
  'dashboard': {
    title: 'Dashboard',
    icon: 'fas fa-tachometer-alt',
    description: 'Portalin ana gosterge paneli. Backup durumu, sertifika ozeti, gorevler ve API durumlarini tek ekranda goruntuler.',
    sections: [
      {
        heading: 'Widget\'lar ve Veri Kaynaklari',
        type: 'table',
        headers: ['Widget', 'Veri Kaynagi', 'Guncelleme'],
        rows: [
          ['Backup Durumu', 'backup_receiver_prod.php + backup_receiver_test.php', 'Her 5 dakikada otomatik'],
          ['Sertifika Ozeti', 'get-certificates.php (45 gun icinde dolacaklar)', 'Sayfa yuklendiginde'],
          ['Isler (5 tab)', 'get-tasks.php + get-jira-issues.php', 'Tab degistiginde'],
          ['Faydali Linkler', 'get-links.php', 'Sayfa yuklendiginde'],
          ['API\'lerim (max 10)', 'dashboard-api-manager.php', 'Sayfa yuklendiginde'],
          ['IPAM Scanner', 'scan-api.php', 'Her 5 dakikada otomatik']
        ]
      },
      {
        heading: 'Ozellestirme (Admin)',
        type: 'list',
        items: [
          'Widget ekleme: URL, Not, Saat, Geri Sayim, Gorsel, Sayfa Kisayolu',
          'Surukle-birak ile widget siralamayi degistirme (SortableJS)',
          'Widget boyutlandirma: 1x1, 1x2, 1x1-tall, 1x2-tall',
          'Widget silme ve varsayilana donme',
          'Ayarlar localStorage\'da saklanir (tarayici bazli)'
        ]
      },
      {
        heading: 'Backup Durumu Karti Detay',
        type: 'list',
        items: [
          'Sunucu bazli: Ansible, Cyberwebeyeos VB, Örnek Müşteri A VB',
          'Ortam bazli: Cyberwebeyeos Prod/DRC, Örnek Müşteri A Prod/DRC (Production) + TestSite1, TestSite2, Örnek Müşteri Atest (Test)',
          'Whitelist durumu: Cyberwebeyeos ve Örnek Müşteri A entry sayilari',
          'Sorun sayisi: 0 = basarili, 1-2 = uyari, 3+ = kritik'
        ]
      }
    ]
  },

  // ===================== BACKUPLAR =====================
  'backuplar': {
    title: 'Network Backuplar',
    icon: 'fas fa-database',
    description: 'Ag cihazlari ve sistemlerin backup dosyalarini goruntule, indir ve izle. Dosyalar uzak backup sunucusundan (198.51.100.30) senkronize edilir.',
    sections: [
      {
        heading: 'Senkronizasyon Sureci',
        type: 'table',
        headers: ['Islem', 'Zamanlama', 'Aciklama'],
        rows: [
          ['Dosya Sync', 'Her gun 02:00', 'Uzak sunucudan yeni backup dosyalari cekilir (sync-backups.php)'],
          ['Eski Dosya Temizligi', 'Her gun 02:00', '15 gunden eski dosyalar silinir (cleanup_old_backups.php)'],
          ['JSON Export', 'Her 10 dakika', 'Backup envanteri JSON olarak export edilir (chatbot icin)'],
          ['Etiket Sync', '06:00 ve 18:00', 'Dosya yollarindan otomatik etiket olusturulur']
        ]
      },
      {
        heading: 'Izlenen Ortamlar',
        type: 'list',
        items: [
          'Production: Cyberwebeyeos Prod, Cyberwebeyeos DRC, Örnek Müşteri A Prod, Örnek Müşteri A DRC',
          'Test: TestSite1, TestSite2, Örnek Müşteri Atest',
          'Sunucular: Ansible, Cyberwebeyeos VB, Örnek Müşteri A CM',
          'Dosyalar: /uploads/backups/ altinda TestSite1/, Örnek Müşteri A/, TestSite2/ dizinlerinde'
        ]
      },
      {
        heading: 'Yapabilecekleriniz',
        type: 'list',
        items: [
          'Dizin agacinda gezinme ve filtreleme',
          'Dosya arama (isim, yol, kategori)',
          'Dosya onizleme (metin, gorsel) ve indirme',
          'Bugunun basarisiz backup\'larini goruntulem (kirmizi kart)',
          'Elle senkronizasyon tetikleme (admin)'
        ]
      },
      {
        heading: 'Durum Gostergeleri (Ust Kartlar)',
        type: 'list',
        items: [
          'Mor: Bugun alinan toplam backup sayisi',
          'Yesil: Basarili backup sayisi ve yuzdesi',
          'Kirmizi: Bos/basarisiz backuplar (tiklayinca detay)',
          'Mavi: Toplam boyut ve son 1 saatteki backup sayisi'
        ]
      }
    ]
  },

  // ===================== BACKUP MONITORING =====================
  'backup-monitoring': {
    title: 'Backup Monitoring',
    icon: 'fas fa-chart-line',
    description: 'Backup sisteminin detayli analitik ve izleme sayfasi. Sunucu bazli, ortam bazli dagilim ve gecmis trendleri gosterir.',
    sections: [
      {
        heading: 'Otomatik Guncelleme',
        type: 'info',
        text: 'Bu sayfa her 5 dakikada bir otomatik olarak guncellenir. Veriler backup_receiver_prod.php ve backup_receiver_test.php dosyalarindan cekilir.'
      },
      {
        heading: 'Sekmeler',
        type: 'table',
        headers: ['Sekme', 'Icerik'],
        rows: [
          ['Scope Details', 'Her ortam icin ayri backup durumu (Cyberwebeyeos Prod, DRC, Örnek Müşteri A Prod, DRC)'],
          ['Server Details', 'Sunucu bazli performans (Ansible, Cyberwebeyeos VB, Örnek Müşteri A CM)'],
          ['Whitelist Status', 'A10 load balancer whitelist sync durumu'],
          ['Failed Directories', 'Basarisiz veya eski backup olan dizinler'],
          ['Historical', '7 gunluk trend analizi (tenant filtreli)'],
          ['Log Files', 'Backup ve hata log dosyalari']
        ]
      },
      {
        heading: 'Sorun Algilama',
        type: 'list',
        items: [
          'Sorun sayisi 0: Tum backuplar basarili (yesil)',
          'Sorun sayisi 1-2: Uyari durumu (sari)',
          'Sorun sayisi 3+: Kritik durum (kirmizi)',
          'Basarisiz dizinler otomatik listelenir',
          '30 gunluk otomatik temizlik: eski durum dosyalari silinir'
        ]
      }
    ]
  },

  // ===================== SERTİFİKALAR =====================
  'sertifikalar': {
    title: 'Sertifika Yonetimi',
    icon: 'fas fa-certificate',
    description: 'SSL/TLS sertifikalarin yasam dongusunu izler. Suresi yaklasiyor, sorumlu atanmamis veya yenileme baslatilmamis sertifikalari uyarir. Otomatik 3 kademeli SSL sorgu zinciri ve gunluk cron ile kendiliginden guncellenir.',
    sections: [
      {
        heading: 'Durum Esikleri',
        type: 'table',
        headers: ['Durum', 'Kosul', 'Renk'],
        rows: [
          ['Aktif', '45 gunden fazla kaldi', 'Yesil'],
          ['Uyari', '45 gun veya daha az kaldi', 'Sari'],
          ['Kritik', '7 gun veya daha az kaldi', 'Kirmizi'],
          ['Suresi Dolmus', 'Bitis tarihi gecmis', 'Koyu Kirmizi']
        ]
      },
      {
        heading: 'Yasam Dongusu Takibi',
        type: 'list',
        items: [
          '45+ gun: Normal',
          '30-45 gun: Kayit sureci baslamali',
          '15-30 gun: CSR hazirligi yapilmali',
          '7-15 gun: Degisiklik tarihi yaklasiyor',
          '0-7 gun: Degisiklik haftasi!',
          'Sorumlu atanmamissa 30 gunde ozel uyari verilir'
        ]
      },
      {
        heading: 'Otomatik Guncelleme — 3 Kademeli Sorgu Zinciri',
        type: 'table',
        headers: ['Kademe', 'Kaynak', 'Aciklama'],
        rows: [
          ['1', 'Public', 'Certificate Transparency log sorgusu (crt.sh API). Hedef hosta TCP gerektirmez, public CA tarafindan imzali cert\'leri bulur.'],
          ['2', 'Lokal DNS', 'Bu sunucudan dogrudan TCP/443 SSL handshake (stream_socket + openssl CLI). Hem public hem internal hostlari kapsar.'],
          ['3', 'F5', 'F5 BIG-IP (Test/Prod/DRC) iControl REST API\'den subject/SAN eslesmesi ile cert listesi. Yalnizca yeni tarih mevcuttan ileri ise yazilir; geri gidis engellenir.']
        ]
      },
      {
        heading: 'Otomasyon',
        type: 'list',
        items: [
          'Cron: her gun sabah 08:00 (root, /var/log/portal-cert-update.log)',
          'Manuel tetikleme: SSL Durumlari sekmesinde "Tumunu Simdi Guncelle" butonu',
          'F5 cert listesi her caliştirmada API\'den canli cekilir, islem bitince bellekten dusurulur — diske yazilmaz',
          'Lock dosyasi (cert-update.lock) ile cron + manuel calistirma cakismasi engellenir',
          'Atomik yazma (.tmp + rename) ile yarim kalmis dosya riski yok',
          'Audit log: logs/certificate-updates.log icine her degisiklik (domain, kaynak, eski → yeni tarih) yazilir'
        ]
      },
      {
        heading: 'Yapabilecekleriniz',
        type: 'list',
        items: [
          'Yeni sertifika kaydi ekleme',
          'Mevcut sertifika bilgilerini duzenleme',
          'SSL sorgusu ile tarihleri otomatik guncelleme',
          'Toplu sertifika yuklemesi (CSV)',
          'Sertifika silme',
          'Servis tipi, durum ve metin ile filtreleme'
        ]
      },
      {
        heading: 'Sorumlu Kisiler',
        type: 'info',
        text: 'Sertifika sorumlusu olarak atanabilecek kisiler: Kullanıcı 1, Kullanıcı 2, Kullanıcı 3, Kullanıcı 4, Kullanıcı 5'
      },
      {
        heading: 'Bagimliliklar',
        type: 'table',
        headers: ['Bilesen', 'Acliklama'],
        rows: [
          ['certificates.json', 'Tum sertifika kayitlari (atomik yazma)'],
          ['ssl-certificate-utils.php', '3 kademeli sorgu mantigi + lock + audit'],
          ['includes/f5-certificate-fetcher.php', 'F5 iControl REST fetcher + subject/SAN matching (CA + expired filter, pagination, retry)'],
          ['f5-config.php', 'F5 Test/Prod/DRC host + jenkins.apiuser credential\'lari'],
          ['update-certificates.php', 'CLI/web entry point (--dry-run, --no-f5 flag\'leri)'],
          ['get-certificate-status.php', 'SSL Durumlari sekmesi icin JSON API'],
          ['Cron (root)', '0 8 * * * /usr/bin/php /var/www/portal/update-certificates.php']
        ]
      },
      {
        heading: 'Veri Saklama',
        type: 'info',
        text: 'Sertifika verileri certificates.json dosyasinda saklanir. F5\'ten cekilen liste her caliştirmada API\'den alinir, hicbir yere yazilmaz; islem bitince bellekten dusurulur. Tum ekleme/guncelleme islemleri denetim gunlugune kaydedilir.'
      }
    ]
  },

  // ===================== İŞLER =====================
  'isler': {
    title: 'Isler (Gorev Yonetimi)',
    icon: 'fas fa-tasks',
    description: 'Periyodik isler, CAB planlari, roadmap gorevleri ve Jira DYF issue\'lari tek bir sayfa uzerinden yonetilir.',
    sections: [
      {
        heading: 'Sekmeler',
        type: 'table',
        headers: ['Sekme', 'Veri Kaynagi', 'Aciklama'],
        rows: [
          ['Periyodik Isler', 'tasks.json (type: periodic)', 'Tekrarlayan gorevler. Tamamlaninca sonraki tarih otomatik olusur.'],
          ['CAB Planlanan', 'tasks.json (type: cab)', 'Change Advisory Board onay sureci gerektiren isler.'],
          ['Roadmap', 'tasks.json (type: roadmap)', 'Uzun vadeli proje ve planlama islemleri.'],
          ['Cyberwebeyeos DYF', 'PostgreSQL jira_issues (company: cyberwebeyeos)', 'Jira\'dan senkronize edilen Cyberwebeyeos DYF issue\'lari.'],
          ['Örnek Müşteri A DYF', 'PostgreSQL jira_issues (company: ornekMusteriA)', 'Jira\'dan senkronize edilen Örnek Müşteri A DYF issue\'lari.'],
          ['Gelismis Arama', 'Tum kaynaklar', 'Tum gorev ve DYF verileri uzerinde capraz arama.']
        ]
      },
      {
        heading: 'Periyodik Gorev Sistemi',
        type: 'list',
        items: [
          'Tekrarlayan gorev: Interval (1-30) + Birim (gun/hafta/ay) belirlenir',
          'Tamamlaninca otomatik olarak sonraki tarihe yeni gorev olusur',
          'E-posta bildirimi: Belirtilen gun once hatirlatma gonderir',
          'Takvim gorunumu: Ay bazli, gunlere tiklanarak gorevler gorulebilir'
        ]
      },
      {
        heading: 'Jira DYF Senkronizasyonu',
        type: 'table',
        headers: ['Bilgi', 'Deger'],
        rows: [
          ['Jira URL', 'https://jira.example.com'],
          ['Senkronizasyon Sikligi', 'Her 15 dakikada bir (cron)'],
          ['Cyberwebeyeos Issue Type', '11600'],
          ['Örnek Müşteri A Issue Type', '11601'],
          ['Log Dosyasi', '/logs/jira-sync.log']
        ]
      },
      {
        heading: 'DYF Durum Renkleri',
        type: 'table',
        headers: ['Renk', 'Durumlar'],
        rows: [
          ['Yesil (Tamamlandi)', 'Yapildi, Tamamlandi, Basarili, Done, Closed, Resolved'],
          ['Kirmizi (Iptal)', 'Iptal, Cancel, Reject, Reddedildi, Basarisiz, Failed'],
          ['Turuncu (Devam Ediyor)', 'Devam, Progress, Bekliyor, Onay, CAB, Pending, Open']
        ]
      }
    ]
  },

  // ===================== DÖKÜMANLAR =====================
  'dokumanlar': {
    title: 'Dokumanlar',
    icon: 'fas fa-folder-open',
    description: 'Dosya yukleme, klasorleme, onizleme ve yonetim. Dosyalar sunucu diskinde /uploads/ dizininde saklanir.',
    sections: [
      {
        heading: 'Desteklenen Onizleme Formatlari',
        type: 'table',
        headers: ['Format', 'Kutuphane'],
        rows: [
          ['PDF (.pdf)', 'pdf.min.js'],
          ['Word (.doc, .docx)', 'mammoth.min.js + docx-preview.min.js'],
          ['Excel (.xls, .xlsx, .csv)', 'xlsx.min.js'],
          ['Gorseller (.jpg, .png, .gif, .svg, .webp)', 'Native tarayici'],
          ['Metin (.txt, .html, .css, .js, .json, .xml, .log, .sh, .py)', 'Duz metin gosterim'],
          ['OneNote (.one)', 'Sunucu tarafinda PDF\'e cevirilir'],
          ['Diger formatlar', 'Sadece indirme (onizleme yok)']
        ]
      },
      {
        heading: 'Yapabilecekleriniz',
        type: 'list',
        items: [
          'Dosya yukleme (surukle-birak veya dosya secici)',
          'Klasor olusturma, duzenleme ve silme',
          'Dosyalari klasorler arasi tasima',
          'Dosya yeniden adlandirma',
          'Cop kutusuna tasima ve geri yukleme',
          'Cop kutusunu kalici olarak bosaltma (admin)',
          'Tum dosyalarda arama'
        ]
      },
      {
        heading: 'Depolama',
        type: 'info',
        text: 'Dosyalar /var/www/portal/uploads/ dizininde saklanir. Silinen dosyalar /uploads/.trash/ altina manifest.json ile tasinir. Dokuman metadata documents.json dosyasinda tutulur.'
      }
    ]
  },

  // ===================== BLACKLIST =====================
  'blacklist-yonetimi': {
    title: 'Blacklist Yonetimi',
    icon: 'fas fa-ban',
    description: 'Cyberwebeyeos ve Örnek Müşteri A icin IP blacklist/whitelist yonetimi. ~158.000 IP adresi izlenir. FortiGate VPN ve Ansible entegrasyonu vardir.',
    sections: [
      {
        heading: 'Sistem Yapisi',
        type: 'table',
        headers: ['Bilgi', 'Cyberwebeyeos', 'Örnek Müşteri A'],
        rows: [
          ['IP Sayisi', '~79.000', '~79.000'],
          ['Blacklist Dosyasi', 'cyberwebeyeosblacklist.txt', 'ornek-musteri-ablacklist.txt'],
          ['Whitelist Yontemi', 'Ansible + A10 LB', 'Ansible + CM'],
          ['Konum', '/var/www/blacklist/cyberwebeyeos/', '/var/www/blacklist/ornekMusteriA/']
        ]
      },
      {
        heading: 'Yapabilecekleriniz',
        type: 'list',
        items: [
          'IP adresi blacklist\'e ekleme (CIDR destekli)',
          'IP adresi blacklist\'ten cikarma',
          'Whitelist\'e IP ekleme/cikarma',
          'Yorum ve Jira URL ile aciklama ekleme',
          'Onay bekleyen IP\'leri yonetme'
        ]
      },
      {
        heading: 'Otomatik Islemler',
        type: 'table',
        headers: ['Islem', 'Zamanlama', 'Aciklama'],
        rows: [
          ['IP Listesi Guncelleme', 'Her 4 saatte bir', 'Cyberwebeyeos ve Örnek Müşteri A IP listeleri otomatik guncellenir'],
          ['Blacklist Backup', 'Gunluk 03:30', '7 gun saklama ile /blacklist_backups/ dizinine'],
          ['Izleme', 'Saatlik', 'IP sayisi 60.000 altina duserse veya %20 azalirsa alarm']
        ]
      },
      {
        heading: 'FortiGate VPN Entegrasyonu',
        type: 'info',
        text: '7 FortiGate cihazi ile entegre: cyberwebeyeos-test, cyberwebeyeos-prod, cyberwebeyeos-drc, ornek-musteri-a-test, ornek-musteri-a-prod, ornek-musteri-a-drc, testsite2-main. SSL VPN baglantilari izlenir.'
      }
    ]
  },

  // ===================== IPAM =====================
  'ipam': {
    title: 'IPAM - IP Adres Yonetimi',
    icon: 'fas fa-network-wired',
    description: 'NetBox entegrasyonu ile IP adresleri, prefix\'ler ve VLAN\'lar izlenir. Veriler NetBox API\'sinden cekilir ve lokal onbellekte saklanir.',
    sections: [
      {
        heading: 'Sekmeler',
        type: 'table',
        headers: ['Sekme', 'Gosterilen Veri'],
        rows: [
          ['IP Adresleri', 'IP, durum, son gorulme, DNS adi, sahip, aciklama, tenant, etiketler'],
          ['Prefix\'ler', 'Prefix CIDR, durum, kullanim yuzdesi, site, tenant, VLAN, aciklama'],
          ['VLAN\'lar', 'VLAN ID, ad, durum, site, tenant, rol, aciklama']
        ]
      },
      {
        heading: 'IP Durumlari',
        type: 'table',
        headers: ['Simge', 'Durum', 'Aciklama'],
        rows: [
          ['🟢', 'Active', 'Aktif ve erisilebilir'],
          ['🟡', 'Idle', 'Belirlenmis ama aktif degil'],
          ['💀', 'Zombie', '30+ gundur cevrimdisi'],
          ['🔒', 'Reserved', 'Rezerve edilmis'],
          ['⚠️', 'Deprecated', 'Kullanimdan kaldiriliyor'],
          ['⛔', 'Conflict', 'IP catismasi']
        ]
      },
      {
        heading: 'Entegrasyon',
        type: 'table',
        headers: ['Bilgi', 'Deger'],
        rows: [
          ['Kaynak', 'NetBox API (http://198.51.100.10/api)'],
          ['Onbellek', 'localStorage (tarayici bazli)'],
          ['Otomatik Tarama', 'Her 6 saatte bir (scheduled-scan.php)'],
          ['Veri Yukleme', 'Sayfa acildiginda arka planda baslar']
        ]
      }
    ]
  },

  // ===================== CİHAZLAR =====================
  'cihazlar': {
    title: 'Cihazlar',
    icon: 'fas fa-server',
    description: 'LibreNMS uzerinden izlenen ag cihazlarinin envanteri. Cihaz durumu, model, surum, uptime ve konum bilgileri gosterilir.',
    sections: [
      {
        heading: 'Gosterilen Bilgiler',
        type: 'list',
        items: [
          'Durum (online/offline), hostname, IP adresi',
          'Isletim sistemi, donanim/model, surum',
          'Konum, uptime, seri numarasi',
          'Son polling zamani, cihaz tipi'
        ]
      },
      {
        heading: 'Istatistik Kartlari',
        type: 'list',
        items: [
          'Toplam cihaz sayisi',
          'Online/aktif cihaz sayisi',
          'Offline/pasif cihaz sayisi',
          'Cihaz tipi dagilimi'
        ]
      },
      {
        heading: 'Entegrasyon',
        type: 'info',
        text: 'Veri kaynagi: LibreNMS API (http://198.51.100.11/api/v0). Coklu LibreNMS instance destegi vardir - ust dropdown\'dan instance degistirilebilir. Onbellek: 24 saat.'
      }
    ]
  },

  // ===================== HARİTALAR =====================
  'haritalar': {
    title: 'Haritalar',
    icon: 'fas fa-map',
    description: 'LibreNMS uzerinde tanimlanmis ag topoloji haritalari. Haritalar iframe ile canli olarak gosterilir.',
    sections: [
      {
        heading: 'Ozellikler',
        type: 'list',
        items: [
          'Grid gorunumde harita kartlari',
          'Harita secimi ile canli topoloji gorunumu',
          'Tam ekran modu (ekranin %98\'i)',
          'Harita yenileme (onbellek bypass)',
          'LibreNMS instance secimi'
        ]
      },
      {
        heading: 'Entegrasyon',
        type: 'info',
        text: 'Haritalar LibreNMS custom maps ozelliginden cekilir. get-librenms-maps.php dosyasi uzerinden veritabanindan harita listesi alinir.'
      }
    ]
  },

  // ===================== F5 OPERATIONS =====================
  'f5-operations': {
    title: 'F5 Operations',
    icon: 'fas fa-balance-scale',
    description: 'F5 BIG-IP yuk dengeleyici uzerinde node ve pool yonetimi. Tum islemler denetim gunlugune kaydedilir ve her sabah ozet mail olarak gonderilir.',
    sections: [
      {
        heading: 'Yapilabilecek Islemler',
        type: 'list',
        items: [
          'Node listeleme, ekleme, kaldirma',
          'Pool listeleme, member ekleme/cikarma',
          'Virtual server listeleme ve durum izleme',
          'Member drain/cordon (graceful shutdown)',
          'Force offline/online islemleri',
          'Ratio degisiklikleri (set_ratio_XX)',
          'Baglanti istatistikleri izleme'
        ]
      },
      {
        heading: 'F5 Ortamlari',
        type: 'table',
        headers: ['Ortam', 'Host', 'Kullanim'],
        rows: [
          ['TEST', 'https://198.51.100.20', 'Test/dev pool yonetimi'],
          ['PROD', 'https://198.51.100.83',    'Uretim trafigi'],
          ['DRC',  'https://198.51.100.84',    'Felaket kurtarma']
        ]
      },
      {
        heading: 'Gunluk Audit Ozet Maili',
        type: 'list',
        items: [
          'Her sabah 08:10 (cron)',
          'Son 24 saatte yapilan tum islemleri kurumsal HTML mailde ozetler',
          'Erisilebilirlik (enable/disable/force-offline) + Konfigurasyon (ratio) gruplari',
          'Tablolar: zaman, kullanici, ortam, islem, hedef (node/member), pool',
          'Anti-spam: hicbir islem yoksa "iyi haber" panelli ozet mail yine gonderilir',
          'Gonderici: PHPMailer + sendmail (sifre yenileme maili ile ayni patern)'
        ]
      },
      {
        heading: 'Bagimliliklar',
        type: 'table',
        headers: ['Bilesen', 'Aciklama'],
        rows: [
          ['f5-api.php',           'F5 iControl REST proxy + log_audit (PostgreSQL f5_audit_log)'],
          ['f5-config.php',        'TEST/PROD/DRC host + jenkins.apiuser credentialleri'],
          ['f5-audit-notify.php',  'Gunluk audit ozet mail script (--dry-run / --test / --hours)'],
          ['f5-audit-notify-settings.json', 'enabled, email_recipients, hours_window (yoksa varsayilan)'],
          ['logs/f5-audit-notify.log',  'Mail gonderim audit log'],
          ['/var/log/portal-f5-audit-notify.log', 'Cron stdout/stderr log'],
          ['Cron (root)',          '10 8 * * * /usr/bin/php /var/www/portal/f5-audit-notify.php'],
          ['Sistem',               'sendmail (postfix), PHPMailer (composer), curl, openssl, mbstring, pdo_pgsql']
        ]
      },
      {
        heading: 'Yetki',
        type: 'info',
        text: 'Sayfa: f5_operations izni veya admin rolu gerekli. Audit mail testi: yalnizca admin (?test=adres@x veya CLI --test=...).'
      },
      {
        heading: 'Izin Verilen Pool Gruplari',
        type: 'info',
        text: 'Cyberwebeyeos-Portal, Cyberwebeyeos-Payments, Cyberwebeyeos-Platform, Cyberwebeyeos-Auth, Ornek-Musteri-A-Web, Ornek-Musteri-A-Core - her biri 5-15 alt pool icerir.'
      }
    ]
  },

  // ===================== ALERTS =====================
  'alerts': {
    title: 'Alerts',
    icon: 'fas fa-bell',
    description: 'LibreNMS\'ten gelen aktif ve cozulmus ag alarmlari.',
    sections: [
      {
        heading: 'Veri Kaynagi ve Onbellek',
        type: 'table',
        headers: ['Bilgi', 'Deger'],
        rows: [
          ['Kaynak', 'LibreNMS API (alerts-api.php)'],
          ['Onbellek Suresi', '15 dakika'],
          ['Onbellek Konumu', '/cache/alerts/ dizini'],
          ['Aktif Alarmlar', 'state=1, kural bilgileri dahil'],
          ['Cozulmus Alarmlar', 'Son 50 adet, state=0']
        ]
      },
      {
        heading: 'Gosterilen Bilgiler',
        type: 'list',
        items: [
          'Alarm ID, cihaz adi, kural adi',
          'Alarm durumu (aktif/cozulmus)',
          'Zaman damgasi',
          'Kural aciklamasi',
          'LibreNMS instance secimi ile farkli sunuculardan alarm izleme'
        ]
      }
    ]
  },

  // ===================== RIPESTAT =====================
  'ripestat': {
    title: 'RipeStat',
    icon: 'fas fa-route',
    description: 'RIPE NCC RIPEstat servisinden ASN/IP/prefix bilgisi, BGP yol degisimleri (BGPlay) ve route collector (Looking Glass) verilerini sorgular. RIPEstat sayfalari iframe ile gomulmeye izin vermedigi icin veriler RIPEstat Data API ve resmi Widget API uzerinden dogrudan tarayicidan cekilir.',
    sections: [
      {
        heading: 'Sekmeler',
        type: 'list',
        items: [
          'Genel Bakis - ASN icin holder/duyurulan prefixler, IP/prefix icin ASN/blok/RPKI durumu ve geolokasyon',
          'BGPlay - RIPE\'in resmi BGPlay widget\'i ile secilen zaman araliginda BGP yol degisim animasyonu',
          'Looking Glass - Route collector (RRC) bazinda peer, AS path ve son guncelleme tablosu'
        ]
      },
      {
        heading: 'Veri Kaynagi',
        type: 'info',
        text: 'stat.ripe.net/data/* (Data API, CORS acik) ve stat.ripe.net/widget-api (BGPlay widget). Kurumsal ag/proxy bu adrese cikisi engelliyorsa sayfa hata mesaji gosterir.'
      }
    ]
  },

  // ===================== FAYDALI LİNKLER =====================
  'faydalilinkler': {
    title: 'Faydali Linkler',
    icon: 'fas fa-link',
    description: 'Kategorize edilmis hizli erisim linkleri. Ortam ve kategori bazinda filtrelenebilir.',
    sections: [
      {
        heading: 'Kategoriler',
        type: 'list',
        items: [
          'Portal - Portal ic linkleri',
          'Monitoring - Izleme sistem linkleri',
          'Sertifika - Sertifika yonetim linkleri',
          'Blacklist - Blacklist yonetim linkleri',
          'Kontrol - Kontrol mekanizma linkleri',
          'Destek - Destek ve yardim linkleri'
        ]
      },
      {
        heading: 'Ortam Filtresi',
        type: 'list',
        items: [
          'Public, Tum Ortamlar',
          'Cyberwebeyeos: Test, DRC, Prod',
          'Örnek Müşteri A: Test, Prod, DRC'
        ]
      },
      {
        heading: 'Gorunum',
        type: 'info',
        text: 'Grid (kart) ve List (tablo) gorunumu arasinda gecis yapilabilir. Linkler links.json dosyasinda saklanir.'
      }
    ]
  },

  // ===================== ARAÇLAR =====================
  'araclar': {
    title: 'Araclar & Otomasyon',
    icon: 'fas fa-tools',
    description: 'API endpoint yapilandirma, baglanti testi ve webhook/otomasyon kural yonetimi.',
    sections: [
      {
        heading: 'API Yonetimi',
        type: 'list',
        items: [
          'API endpoint ekleme (URL, kimlik dogrulama tipi, aciklama)',
          'API baglanti testi',
          'API duzenleme ve silme',
          'Kimlik dogrulama turleri: None, Bearer Token, API Key, Basic Auth',
          'Filtreleme: Durum, kimlik dogrulama tipi, test durumu'
        ]
      },
      {
        heading: 'Veri Saklama',
        type: 'info',
        text: 'API yapilandirmalari apis.json dosyasinda, dashboard secimi dashboard-apis.json dosyasinda saklanir.'
      }
    ]
  },

  // ===================== KULLANICILAR =====================
  'kullanicilar': {
    title: 'Kullanicilar',
    icon: 'fas fa-users',
    description: 'Kullanici hesap yonetimi. Ekleme, duzenleme, silme ve sayfa izinleri atama.',
    sections: [
      {
        heading: 'Roller',
        type: 'table',
        headers: ['Rol', 'Yetki'],
        rows: [
          ['Admin', 'Tum sayfalara erisim, kullanici yonetimi, sistem ayarlari'],
          ['Readonly', 'Salt okunur erisim, duzenleme yetkisi yok']
        ]
      },
      {
        heading: 'Ozellikler',
        type: 'list',
        items: [
          'Kullanici ekleme (gecici sifre ile, ilk giriste degistirme zorunlu)',
          'Sayfa bazli izin atama (her sayfa icin ayri yetki)',
          'Kullanici bilgilerini duzenleme',
          'Kullanici silme',
          'Sifre durumu takibi'
        ]
      },
      {
        heading: 'Veri Saklama',
        type: 'info',
        text: 'Kullanici bilgileri PostgreSQL users tablosunda saklanir. Sifreler hash\'lenerek saklanir (bcrypt). Son 5 sifre gecmisi tutulur.'
      }
    ]
  },

  // ===================== AUDIT LOG =====================
  'audit-log': {
    title: 'Denetim Gunlugu',
    icon: 'fas fa-history',
    description: 'Tum kullanici eylemlerinin kaydi. Dokuman, sertifika, kullanici, blacklist ve F5 islemleri dahil.',
    sections: [
      {
        heading: 'Kaydedilen Eylemler',
        type: 'list',
        items: [
          'Dokuman yukleme, silme, tasima, yeniden adlandirma',
          'Sertifika ekleme, duzenleme, silme',
          'Kullanici olusturma, duzenleme, silme',
          'Blacklist IP ekleme/cikarma',
          'F5 node/pool islemleri',
          'Giris denemeleri ve guvenlik olaylari',
          'Cop kutusu islemleri'
        ]
      },
      {
        heading: 'Filtreleme',
        type: 'list',
        items: [
          'Tarih araligi',
          'Kullanici adi',
          'Eylem tipi',
          'Kaynak (resource)',
          'Metin arama'
        ]
      },
      {
        heading: 'Saklama',
        type: 'info',
        text: 'Denetim kayitlari PostgreSQL audit_logs tablosunda saklanir. Saklama suresi: 90 gun (settings.json ile ayarlanabilir). Disa aktarma destegi vardir.'
      }
    ]
  },

  // ===================== GÜVENLİK DASHBOARD =====================
  'guvenlik-dashboard': {
    title: 'Guvenlik Dashboard (Admin)',
    icon: 'fas fa-shield-alt',
    description: 'Kilitli IP\'ler, kilitli kullanicilar ve aktif brute-force girisimleri izleme. Sadece admin erisebilir.',
    sections: [
      {
        heading: 'Gosterilen Bilgiler',
        type: 'list',
        items: [
          'Kilitli IP adresleri: IP, deneme sayisi, ilk/son deneme, kilit suresi, kalan sure',
          'Kilitli kullanicilar: Kullanici adi, email, deneme sayisi, kilit durumu',
          'Aktif brute-force girisimleri',
          'Hesap/IP kilidi acma butonu'
        ]
      },
      {
        heading: 'Otomatik Guncelleme',
        type: 'info',
        text: 'Bu sayfa her 30 saniyede bir otomatik guncellenir.'
      }
    ]
  },

  // ===================== GÜVENLİK POLİTİKALARI =====================
  'guvenlik-politikalari': {
    title: 'Guvenlik Politikalari (Admin)',
    icon: 'fas fa-lock',
    description: 'Sifre politikasi, oturum guvenligi ve gelismis sifre guclu kurallari yonetimi. Sadece admin erisebilir.',
    sections: [
      {
        heading: 'Ayarlanabilir Politikalar',
        type: 'list',
        items: [
          'Minimum sifre uzunlugu (8-16 karakter)',
          'Karakter gereksinimleri (buyuk harf, kucuk harf, rakam, ozel karakter)',
          'Sifre gecerlilik suresi (30-180 gun veya suresiz)',
          'Sifre gecmisi kisitlamasi',
          'Yaygin sifre engelleme',
          'Kullanici adinin sifrede kullanilmasini engelleme',
          'Sifre guc olcer (zxcvbn algoritmasi)'
        ]
      }
    ]
  },

  // ===================== AYARLAR =====================
  'ayarlar': {
    title: 'Sistem Ayarlari',
    icon: 'fas fa-cog',
    description: 'Portal geneli yapilandirma ayarlari. Bildirimler, guvenlik, sertifika, log ve entegrasyon ayarlari.',
    sections: [
      {
        heading: 'Ayar Kategorileri',
        type: 'table',
        headers: ['Sekme', 'Icerik'],
        rows: [
          ['Bildirim', 'E-posta bildirimleri (sertifika, gorev, sorun, sistem). Siklik: anlik/gunluk/haftalik'],
          ['Guvenlik', 'Oturum zaman asimi, giris deneme limiti, MFA, LDAP/SSO'],
          ['Sertifika', 'Yenileme hatirlatma suresi (gun)'],
          ['Log', 'Denetim gunlugu saklama suresi ve log seviyesi'],
          ['Entegrasyon', 'Ucuncu parti sistem baglantilari'],
          ['Arayuz', 'Tema, dil tercihleri'],
          ['Sirket', 'Organizasyon bilgileri']
        ]
      },
      {
        heading: 'Veri Saklama',
        type: 'info',
        text: 'Ayarlar settings.json dosyasinda ve PostgreSQL settings tablosunda saklanir. save-settings.php ile kaydedilir.'
      }
    ]
  }
};

// ===================== MODAL RENDER FONKSİYONU =====================

function showPageInfo(pageId) {
  const info = PAGE_INFO_DATA[pageId];
  if (!info) return;

  let html = '';
  html += '<div class="page-info-header">';
  html += '<i class="' + info.icon + '" style="font-size: 1.5rem; margin-right: 12px; color: #3b82f6;"></i>';
  html += '<div>';
  html += '<h3 style="margin: 0; font-size: 1.2rem;">' + info.title + '</h3>';
  html += '<p style="margin: 4px 0 0; color: #94a3b8; font-size: 0.9rem;">' + info.description + '</p>';
  html += '</div></div>';

  info.sections.forEach(function(section) {
    html += '<div class="page-info-section">';
    html += '<h4 class="page-info-section-title">' + section.heading + '</h4>';

    if (section.type === 'info') {
      html += '<div class="page-info-box">' + section.text + '</div>';
    }
    else if (section.type === 'list') {
      html += '<ul class="page-info-list">';
      section.items.forEach(function(item) {
        html += '<li>' + item + '</li>';
      });
      html += '</ul>';
    }
    else if (section.type === 'table') {
      html += '<div class="page-info-table-wrap"><table class="page-info-table">';
      html += '<thead><tr>';
      section.headers.forEach(function(h) {
        html += '<th>' + h + '</th>';
      });
      html += '</tr></thead><tbody>';
      section.rows.forEach(function(row) {
        html += '<tr>';
        row.forEach(function(cell) {
          html += '<td>' + cell + '</td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    }

    html += '</div>';
  });

  var body = document.getElementById('page-info-modal-body');
  var title = document.getElementById('page-info-modal-title');
  if (body) body.innerHTML = html;
  if (title) title.textContent = info.title + ' - Bilgi';
  openModal('page-info-modal');
}

// Sayfa yuklendiginde info butonlarini ekle
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.page-info-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var pageId = this.getAttribute('data-page-info');
      if (pageId) showPageInfo(pageId);
    });
  });
});
