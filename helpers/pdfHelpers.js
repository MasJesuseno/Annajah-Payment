const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../database');

async function getSettings(db) {
  const [rows] = await db.execute('SELECT `key`, `value` FROM pengaturan');
  const s = {};
  for (const row of rows) s[row.key] = row.value;
  
  // Override tahun_ajaran_aktif from master tahun_ajaran table if available
  try {
    const [taRows] = await db.execute(
      "SELECT tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1"
    );
    if (taRows[0]?.tahun_ajaran) {
      s.tahun_ajaran_aktif = taRows[0].tahun_ajaran;
    }
  } catch (e) {
    // Master table might not exist yet on first run
  }
  
  return s;
}

function formatRupiah(val) {
  return `Rp ${(val || 0).toLocaleString('id-ID')}`;
}

function terbilang(n) {
  if (n === 0) return '';
  const angka = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  if (n < 12) return angka[n];
  if (n < 20) return terbilang(n - 10) + ' Belas';
  if (n < 100) {
    const sisa = n % 10;
    return terbilang(Math.floor(n / 10)) + ' Puluh' + (sisa > 0 ? ' ' + terbilang(sisa) : '');
  }
  if (n < 200) return 'Seratus' + (n > 100 ? ' ' + terbilang(n - 100) : '');
  if (n < 1000) {
    const sisa = n % 100;
    return terbilang(Math.floor(n / 100)) + ' Ratus' + (sisa > 0 ? ' ' + terbilang(sisa) : '');
  }
  if (n < 2000) return 'Seribu' + (n > 1000 ? ' ' + terbilang(n - 1000) : '');
  if (n < 1000000) {
    const sisa = n % 1000;
    return terbilang(Math.floor(n / 1000)) + ' Ribu' + (sisa > 0 ? ' ' + terbilang(sisa) : '');
  }
  if (n < 1000000000) {
    const sisa = n % 1000000;
    return terbilang(Math.floor(n / 1000000)) + ' Juta' + (sisa > 0 ? ' ' + terbilang(sisa) : '');
  }
  return '';
}

function drawTable(doc, headers, rows, options = {}) {
  const { startX = 40, columnWidths, headerBg = '#15803D', fontSize = 8 } = options;
  const pageWidth = doc.page.width - 80;
  const colWidths = columnWidths || headers.map(() => pageWidth / headers.length);
  const rowHeight = 18;
  const headerHeight = 22;

  let currentY = doc.y;

  if (currentY + (rows.length + 1) * rowHeight > doc.page.height - 60) {
    doc.addPage();
    currentY = 40;
  }

  // Header
  doc.rect(startX, currentY, pageWidth, headerHeight).fill(headerBg);
  let xPos = startX;
  headers.forEach((header, i) => {
    doc.fillColor('#FFFFFF').fontSize(fontSize).font('Helvetica-Bold');
    doc.text(header, xPos + 4, currentY + 5, { width: colWidths[i] - 8, align: i === headers.length - 1 ? 'right' : 'left' });
    xPos += colWidths[i];
  });
  currentY += headerHeight;

  let rowNum = 0;
  for (const row of rows) {
    if (currentY + rowHeight > doc.page.height - 40) {
      doc.addPage();
      currentY = 40;
      doc.rect(startX, currentY, pageWidth, headerHeight).fill(headerBg);
      xPos = startX;
      headers.forEach((header, i) => {
        doc.fillColor('#FFFFFF').fontSize(fontSize).font('Helvetica-Bold');
        doc.text(header, xPos + 4, currentY + 5, { width: colWidths[i] - 8, align: i === headers.length - 1 ? 'right' : 'left' });
        xPos += colWidths[i];
      });
      currentY += headerHeight;
    }

    if (rowNum % 2 === 1) {
      doc.rect(startX, currentY, pageWidth, rowHeight).fill('#F0FDF4');
    }
    doc.rect(startX, currentY, pageWidth, rowHeight).fillOpacity(0).stroke('#E5E7EB');
    doc.fillOpacity(1); // Reset fill opacity agar teks tidak transparan

    xPos = startX;
    row.forEach((cell, i) => {
      doc.fillColor('#374151').fontSize(fontSize).font('Helvetica');
      const align = i === row.length - 1 ? 'right' : 'left';
      const text = cell !== null && cell !== undefined ? String(cell) : '';
      doc.text(text, xPos + 4, currentY + 4, { width: colWidths[i] - 8, align });
      xPos += colWidths[i];
    });
    currentY += rowHeight;
    rowNum++;
  }
  doc.y = currentY;
}

function writeHeader(doc, pengaturan, judul, subtitle) {
  const sekolah = pengaturan.nama_sekolah || 'SMA Annajah';
  const alamatLengkap = [
    pengaturan.alamat_sekolah,
    pengaturan.kota,
    pengaturan.provinsi,
  ].filter(Boolean).join(', ');

  const logoPath = pengaturan.logo;
  const pageCenter = doc.page.width / 2;
  const marginLeft = 40;
  const marginRight = 40;
  const pageWidth = doc.page.width - marginLeft - marginRight;

  let hasLogo = false;
  let logoWidth = 0;
  let logoHeight = 0;

  // ─── Coba gambar logo jika ada ───
  if (logoPath) {
    const fullPath = path.join(__dirname, '..', logoPath.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) {
      try {
        const img = doc.openImage(fullPath);
        const maxW = 50, maxH = 50;
        const scale = Math.min(maxW / img.width, maxH / img.height);
        logoWidth = img.width * scale;
        logoHeight = img.height * scale;
        doc.image(fullPath, marginLeft, doc.y, { width: logoWidth, height: logoHeight });
        hasLogo = true;
      } catch (e) {
        // Abaikan error, lanjut tanpa logo
      }
    }
  }

  // ─── Posisi teks ───
  const textX = hasLogo ? marginLeft + logoWidth + 10 : marginLeft;
  const textWidth = hasLogo ? pageWidth - logoWidth - 10 : pageWidth;
  const textAlign = hasLogo ? 'left' : 'center';
  const startY = doc.y;

  // Nama Sekolah
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#15803D');
  doc.text(sekolah, textX, startY, { width: textWidth, align: textAlign });

  // NPSN & Alamat
  const infoParts = [];
  if (pengaturan.npsn) infoParts.push(`NPSN: ${pengaturan.npsn}`);
  if (alamatLengkap) infoParts.push(alamatLengkap);
  if (infoParts.length > 0) {
    doc.fontSize(7.5).fillColor('#6B7280').font('Helvetica');
    doc.text(infoParts.join('  |  '), textX, doc.y, { width: textWidth, align: textAlign });
  }

  // Kontak
  const kontakParts = [];
  if (pengaturan.no_telp) kontakParts.push(`Telp: ${pengaturan.no_telp}`);
  if (pengaturan.email) kontakParts.push(`Email: ${pengaturan.email}`);
  if (pengaturan.website) kontakParts.push(pengaturan.website);
  if (kontakParts.length > 0) {
    doc.fontSize(7).fillColor('#9CA3AF').font('Helvetica');
    doc.text(kontakParts.join('  |  '), textX, doc.y, { width: textWidth, align: textAlign });
  }

  // Sesuaikan Y agar tidak tumpang tindih dengan logo
  const textEndY = doc.y;
  const logoEndY = startY + logoHeight + 4;
  doc.y = Math.max(textEndY, logoEndY);

  doc.moveDown(0.5);

  // Judul Laporan
  doc.fontSize(12).fillColor('#374151').text(judul, { align: 'center' });
  if (subtitle) {
    doc.fontSize(9).fillColor('#6B7280').text(subtitle, { align: 'center' });
  }

  // Garis pemisah
  doc.moveDown(0.5);
  const lineY = doc.y;
  doc.moveTo(marginLeft, lineY).lineTo(doc.page.width - marginRight, lineY).stroke('#15803D');
  doc.y = lineY + 6;

  // Tanggal cetak
  doc.fontSize(8).fillColor('#9CA3AF').font('Helvetica');
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'right' });
  doc.moveDown(0.5);
}

function writeGrandTotal(doc, label, value, pageWidth) {
  doc.moveDown(0.5);
  const gtY = doc.y;
  doc.rect(40, gtY, pageWidth, 24).fill('#15803D');
  doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
  doc.text(label, 44, gtY + 6, { width: pageWidth * 0.4 });
  doc.text(value, 44 + pageWidth * 0.6, gtY + 6, { width: pageWidth * 0.35, align: 'right' });
  doc.y = gtY + 30;
}

function writeSignatureImage(doc, ttdPath, maxW) {
  if (!ttdPath) return false;
  const fullPath = path.join(__dirname, '..', ttdPath.replace(/^\//, ''));
  if (!fs.existsSync(fullPath)) return false;
  try {
    const img = doc.openImage(fullPath);
    const scale = Math.min(maxW || 80, 50) / img.width;
    const w = img.width * scale;
    const h = img.height * scale;
    doc.image(fullPath, doc.x, doc.y - h + 4, { width: w, height: h });
    return true;
  } catch (e) { return false; }
}

function writeSignature(doc, pengaturan) {
  const leftX = 60;
  const rightX = doc.page.width - 160;

  const tampilkanKepsek = pengaturan.tampilkan_ttd_kepala_sekolah !== '0';
  const tampilkanBendahara = pengaturan.tampilkan_ttd_bendahara !== '0';

  doc.fontSize(9).fillColor('#374151').font('Helvetica');
  doc.text('Mengetahui,', leftX + 30, doc.y);
  doc.text('Hormat Kami,', rightX + 30, doc.y);

  // ─── Kiri: Kepala Sekolah ───
  if (tampilkanKepsek) {
    doc.x = leftX;
    const ttdKepala = writeSignatureImage(doc, pengaturan.ttd_kepala_sekolah, 80);
    if (!ttdKepala) {
      doc.moveDown(4);
      doc.text(`( ${pengaturan.kepala_sekolah || '________'} )`, leftX, doc.y, { align: 'center', width: 120 });
    }
  } else {
    // Fallback: hanya teks jika gambar tidak ditampilkan
    const afterTtdY = doc.y + 30;
    doc.moveDown(4);
    doc.text(`( ${pengaturan.kepala_sekolah || '________'} )`, leftX, doc.y, { align: 'center', width: 120 });
  }

  // ─── Kanan: Bendahara ───
  if (tampilkanBendahara) {
    doc.x = rightX;
    const ttdBendahara = writeSignatureImage(doc, pengaturan.ttd_bendahara, 80);
    if (!ttdBendahara) {
      doc.moveDown(4);
      doc.text(`( ${pengaturan.bendahara || '________'} )`, rightX, doc.y, { align: 'center', width: 120 });
    }
  } else {
    doc.moveDown(4);
    doc.text(`( ${pengaturan.bendahara || '________'} )`, rightX, doc.y, { align: 'center', width: 120 });
  }

  doc.moveDown(0.3);
  doc.fontSize(8).fillColor('#6B7280').font('Helvetica');
  doc.text('Kepala Sekolah', leftX, doc.y, { align: 'center', width: 120 });
  doc.text('Tata Usaha', rightX, doc.y, { align: 'center', width: 120 });
}

function writePpdbSignature(doc, pengaturan) {
  const centerX = (doc.page.width - 200) / 2;

  // Naikkan 4 baris ke atas
  doc.y = doc.y - 44;

  doc.fontSize(9).fillColor('#374151').font('Helvetica');
  doc.text('Mengetahui,', centerX, doc.y, { align: 'center', width: 200 });

  // ─── Nama Ketua Panitia PPDB (selalu ditampilkan) ───
  doc.moveDown(8);
  doc.fontSize(9).fillColor('#374151').font('Helvetica-Bold');
  doc.text(pengaturan.ketua_panitia_ppdb || '___________________', centerX, doc.y, { align: 'center', width: 200 });

  // ─── Tanda tangan digital (jika diupload & ditampilkan) ───
  const tampilkanTtd = pengaturan.tampilkan_ttd_ketua_panitia_ppdb !== '0';
  if (tampilkanTtd && pengaturan.ttd_ketua_panitia_ppdb) {
    doc.x = centerX + 75; // center image (50px) in 200px area
    const saveY = doc.y;
    doc.y = doc.y - 33; // naik 3 baris supaya tidak bertumpuk dengan label
    writeSignatureImage(doc, pengaturan.ttd_ketua_panitia_ppdb, 100);
    doc.y = saveY; // kembalikan untuk posisi label
  }

  doc.moveDown(1.5);
  doc.fontSize(8).fillColor('#6B7280').font('Helvetica');
  doc.text('Ketua Panitia PPDB', centerX, doc.y, { align: 'center', width: 200 });
}

function getDailyDate() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

module.exports = {
  getSettings,
  formatRupiah,
  terbilang,
  drawTable,
  writeHeader,
  writeGrandTotal,
  writeSignature,
  writePpdbSignature,
  getDailyDate,
};
