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
