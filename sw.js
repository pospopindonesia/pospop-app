const CACHE_NAME = 'poppop-pos-v2'; // Ubah versi ini jika Anda mengupdate HTML/CSS/JS
const ASSETS_TO_CACHE = [
  'https://pospopindonesia.github.io/pospop-app/',
  'https://pospopindonesia.github.io/pospop-app/index.html',
  'https://pospopindonesia.github.io/pospop-app/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://popprint.id/wp-content/uploads/2026/01/2ppkasir-02.svg'
  // Jika nanti Anda memiliki file icon .png (192x192 & 512x512), tambahkan juga ke sini
];

// 1. Install Service Worker & Simpan Aset Statis
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching Shell Assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Bersihkan Cache Lama saat Versi Baru Aktif
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Menghapus Cache Lama:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Memaksa SW baru langsung aktif
  );
});

// 3. Strategi: Stale-While-Revalidate (Cepat & Selalu Update)
self.addEventListener('fetch', (event) => {
  // --- FILTER REQUEST UNTUK MENCEGAH ERROR ---
  
  // A. Abaikan request ke Google Apps Script (karena cross-origin/dynamic)
  if (event.request.url.includes('script.google.com')) return;
  
  // B. KRITIS: Service Worker hanya bisa menyimpan request GET.
  // Jika ini adalah POST (misal simpan data transaksi), lewati cache.
  if (event.request.method !== 'GET') return;
  
  // C. Hanya proses URL HTTP/HTTPS (mengabaikan chrome-extension:// dll)
  if (!event.request.url.startsWith('http')) return;

  // --- PROSES CACHE ---
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Simpan salinan terbaru ke cache secara dinamis
        caches.open(CACHE_NAME).then((cache) => {
          // Clone response sebelum disimpan ke cache
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      }).catch((error) => {
        console.warn('Fetch gagal, menggunakan mode offline', error);
        // Di sini Anda bisa mereturn halaman "offline.html" kustom jika mau
      });

      // Kembalikan cache segera (jika ada), sambil menunggu update dari network di background
      return cachedResponse || fetchPromise;
    })
  );
});
