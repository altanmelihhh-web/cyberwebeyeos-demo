# Cyberwebeyeos — canlı demo

Gerçek uygulamanın izole, sentetik bir veritabanına bağlı halde çalıştırılıp sayfaların ve
API cevaplarının donmuş bir anlık görüntüsü. Arka uç yoktur: GET istekleri `_api/` altındaki
yakalanmış JSON dosyalarından (`assets/js/demo-shim.js`), yazma işlemleri devre dışı
(birkaç işlem "simüle edildi" döner).

**Tüm veriler sentetiktir:** IP'ler RFC 5737 / 10.64.x / 10.128.x dokümantasyon-test aralıklarından,
şirket, müşteri ve kişi adları uydurmadır.

## Modüller
Dashboard, IPAM, İşler (DYF/CAB/Jira), Dokümanlar, Sertifikalar, Backup'lar + Backup izleme,
Cihazlar, Haritalar (LibreNMS), FireScope (firewall/switch/router denetimi), Faydalı linkler,
RIPEstat, Blacklist yönetimi, Netwatch, Cihaz yaşam döngüsü, F5 Operations / Admin,
WAF IP whitelist, Wireshark / F5 / FortiGate / Network CLI hub'ları, Reputation, Zabbix,
Alerts, Audit log, FW audit log, Güvenlik dashboard/politikaları, Kullanıcılar, Ayarlar, Hakkında.

## Mobil
Arayüz 390 px (telefon) ve 820 px (tablet) genişlikte yatay kaydırma olmadan çalışır; kenar
çubuğu hamburger menüyle açılıp kapanır.

## Dış bağımlılık
Hub'lar, Blacklist, Netwatch, F5 Admin Operations ve blockharbor-demo gibi alt uygulamalar
iframe ile dış GitHub Pages adreslerinden yüklenir (`apps/` altındaki kopyalar hariç).

## Örnek dosyalar ve bağlantılar
Dokümanlar bölümünde JPEG ağ topolojisi, DOCX operasyon prosedürü, CSV cihaz envanteri,
PDF güvenlik politikası, TXT bakım listesi ve JSON adres planı bulunur. Önizleme ve indirme
aynı gerçek dosyayı kullanır (`assets/documents/`). Backup önizlemeleri ve indirmeleri de
seçilen cihaza ait sentetik CFG dosyalarını kullanır (`assets/backups/`).
Faydalı Linkler resmi ürün ve dokümantasyon sayfalarını açar. Sunucu gerektiren hesap
işlemleri, olmayan PHP sayfalarına gitmek yerine demo açıklaması gösterir.

Tarayıcı kontrolü: `CWE_PUPPETEER=/path/to/puppeteer-core node tests/demo-files.browser.cjs [base-url]`.
Chrome yolu isteğe bağlı `CWE_CHROME` ile değiştirilebilir. Kontrol gerçek önizlemeleri,
indirilen dosyaları ve 390/820/1440/1920 px sayfa düzenini doğrular.

F5 Operations ortam seçimi TEST/PROD/DRC için ayrı sentetik node, adres ve pool adları
gösterir; ortam değişince eski seçimler ve izleme zamanlayıcıları temizlenir.
Firewall Audit Log arama, cihaz, kullanıcı, işlem, config path, tarih ve oturum filtrelerini
birlikte uygular. Sayfalama ve CSV/Excel indirme de aynı filtrelenmiş kayıtları kullanır.
Bu akışların kontrolü: `CWE_PUPPETEER=/path/to/puppeteer-core node tests/demo-operations.browser.cjs [base-url]`.

## Lisans ve veri
Lisans: Tüm hakları saklıdır © 2026 Cyberwebeyeos — demo yalnız tanıtım amaçlıdır; kaynak kod özeldir.
Veri: tamamı sentetik; gerçek cihaz, kişi, adres veya kural içermez.
