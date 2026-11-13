// TZCO Receipts. Images live in the images/ folder: images/logo.png (receipt header and PDF) and
// images/watermark.png (faint background). Replace either file to change the picture.
// For the logo to appear in the PDF, open the page through a local server such as VS Code Live Server.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var fmt = function (n) { return 'TSh ' + Math.round(n).toLocaleString('en-US'); };
  var plain = function (n) { return Math.round(n).toLocaleString('en-US'); };
  var num = function (s) { var v = parseFloat(String(s == null ? '' : s).replace(/[^\d.]/g, '')); return isFinite(v) ? v : 0; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function showDate(iso) { var p = String(iso).split('-'); return p.length === 3 ? parseInt(p[2], 10) + ' ' + MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0] : iso; }
  function saved() { return store.get('tzco_receipts2', []); }
  function nextNo() {
    var m = 0;
    saved().forEach(function (r) { var x = /(\d+)$/.exec(r.no || ''); if (x) m = Math.max(m, parseInt(x[1], 10)); });
    return 'TZC-' + String(m + 1).padStart(4, '0');
  }

  var sample = true;
  var items = [
    { desc: 'Business cards (100 pcs)', qty: '1', price: '25000' },
    { desc: 'T-shirt printing, custom logo', qty: '10', price: '12000' },
    { desc: 'Banner 2m x 1m', qty: '1', price: '35000' }
  ];
  var biz = store.get('tzco_biz2', null) || { name: 'TZCO Printing & Design', loc: 'Arusha, Tanzania', phone: '', web: 'Tzcoonrenda.com' };
  var products = store.get('tzco_products', {});
  var dl = null;

  var IMG = { logo: 'images/logo.png', watermark: 'images/watermark.png' };
  var imgData = { logo: null, watermark: null };
  function loadImg(key) {
    var im = new Image();
    im.onload = function () {
      var url = null;
      try {
        var cv = document.createElement('canvas');
        cv.width = im.naturalWidth; cv.height = im.naturalHeight;
        cv.getContext('2d').drawImage(im, 0, 0);
        url = cv.toDataURL('image/png');
      } catch (e) { url = null; }
      imgData[key] = { url: url, w: im.naturalWidth, h: im.naturalHeight };
    };
    im.src = IMG[key];
  }
  loadImg('logo');
  loadImg('watermark');

  function drawProducts() {
    $('prodList').innerHTML = Object.keys(products).map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('');
  }

  function drawItems() {
    $('items').innerHTML = items.map(function (it, i) {
      return '<div class="item" data-i="' + i + '">' +
        '<div class="f full"><label for="d' + i + '">Product or service name</label><input id="d' + i + '" data-k="desc" list="prodList" value="' + esc(it.desc) + '" placeholder="e.g. Business cards (100 pcs)" autocomplete="off"></div>' +
        '<div class="f"><label for="q' + i + '">Qty</label><input id="q' + i + '" data-k="qty" inputmode="numeric" value="' + esc(it.qty) + '"></div>' +
        '<div class="f"><label for="p' + i + '">Unit price (TSh)</label><input id="p' + i + '" data-k="price" inputmode="numeric" value="' + esc(it.price) + '"></div>' +
        '<button type="button" class="icon-btn" data-rm="' + i + '" aria-label="Remove product ' + (i + 1) + '">&times;</button>' +
        '<div class="line-total" id="lt' + i + '"></div></div>';
    }).join('');
  }

  function calc() {
    var sub = 0;
    items.forEach(function (it) { sub += num(it.qty) * num(it.price); });
    var disc = Math.min(num($('disc').value), sub);
    var total = sub - disc;
    var paid = num($('paid').value);
    return { sub: sub, disc: disc, total: total, paid: paid, balance: total - paid };
  }

  function state() {
    return {
      no: $('no').value.trim(), date: $('date').value, cust: $('cust').value.trim(), custPhone: $('custPhone').value.trim(),
      items: items.map(function (x) { return { desc: x.desc, qty: x.qty, price: x.price }; }),
      disc: $('disc').value, paid: $('paid').value, method: $('method').value, ref: $('ref').value.trim(),
      by: $('by').value.trim(), note: $('note').value.trim()
    };
  }

  function visibleItems() {
    return items.filter(function (it) { return it.desc.trim() || num(it.qty) * num(it.price) > 0; });
  }

  function contactLine() { return [biz.loc, biz.phone, biz.web].filter(Boolean).join('  |  '); }

  function waNumber(p) {
    var d = String(p || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.charAt(0) === '0' && d.length === 10) return '255' + d.slice(1);
    if (d.length === 9) return '255' + d;
    return d.length >= 11 ? d : '';
  }

  function render() {
    items.forEach(function (it, i) {
      var el = $('lt' + i);
      if (el) el.textContent = '= ' + fmt(num(it.qty) * num(it.price));
    });
    var c = calc(), s = state();
    $('rNo').textContent = s.no || '-';
    $('rDate').textContent = showDate(s.date);
    $('rContact').innerHTML = esc(contactLine() || biz.name || '');
    var rows = visibleItems().map(function (it, i) {
      var q = num(it.qty), p = num(it.price);
      return '<tr><td class="n">' + (i + 1) + '</td><td>' + esc(it.desc || '-') + '</td><td class="n">' + q + '</td><td class="n">' + plain(p) + '</td><td class="n">' + plain(q * p) + '</td></tr>';
    }).join('');
    var totals = '<div><span>Subtotal</span><span>' + fmt(c.sub) + '</span></div>';
    if (c.disc > 0) totals += '<div><span>Discount</span><span>- ' + fmt(c.disc) + '</span></div>';
    totals += '<div class="big"><span>TOTAL</span><span>' + fmt(c.total) + '</span></div>';
    totals += '<div><span>Amount paid</span><span>' + fmt(c.paid) + '</span></div>';
    var stamp = '';
    if (c.total > 0 && c.balance > 0) {
      totals += '<div><b>Balance due</b><b style="font-family:var(--font-mono)">' + fmt(c.balance) + '</b></div>';
      stamp = '<span class="stamp warn">BALANCE DUE</span>';
    } else if (c.total > 0) {
      if (c.balance < 0) totals += '<div><span>Change</span><span>' + fmt(-c.balance) + '</span></div>';
      stamp = '<span class="stamp good">PAID IN FULL</span>';
    }
    var pay = '<p><b>' + esc(s.method) + '</b></p>' + (s.ref ? '<p class="s">Ref: ' + esc(s.ref) + '</p>' : '');
    $('rBody').innerHTML =
      '<div class="r-parties"><div><h3>Billed to</h3><p><b>' + esc(s.cust || '-') + '</b></p>' + (s.custPhone ? '<p class="s">' + esc(s.custPhone) + '</p>' : '') + '</div>' +
      '<div><h3>Payment</h3>' + pay + '</div></div>' +
      '<table class="r-items"><colgroup><col class="c-i"><col><col class="c-q"><col class="c-p"><col class="c-t"></colgroup><thead><tr><th class="n">#</th><th>Product / Service</th><th class="n">Qty</th><th class="n">Unit (TSh)</th><th class="n">Amount</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="r-sum"><div>' + stamp + (s.note ? '<p class="r-note" style="margin-top:12px"><b>Note:</b> ' + esc(s.note) + '</p>' : '') + '</div><div class="r-totals">' + totals + '</div></div>' +
      '<div class="r-sign"><div class="nm">' + esc(s.by) + '</div><span>Received by</span></div>' +
      '<footer class="r-foot"><b>CREATIVITY &bull; QUALITY &bull; SERVICE</b><span>Thank you for choosing ' + esc(biz.name || 'us') + '.</span></footer>';
    var n = waNumber(s.custPhone);
    $('wa').href = 'https://wa.me/' + n + '?text=' + encodeURIComponent(receiptText());
  }

  function receiptText() {
    var s = state(), c = calc(), L = [];
    L.push('*' + (biz.name || 'Receipt').toUpperCase() + '*');
    var contact = [biz.loc, biz.phone].filter(Boolean).join(' | ');
    if (contact) L.push(contact);
    if (biz.web) L.push(biz.web);
    L.push('------------------------');
    L.push('*RECEIPT NO. ' + (s.no || '-') + '*');
    L.push('Date: ' + showDate(s.date));
    L.push('Customer: ' + (s.cust || '-'));
    L.push('');
    visibleItems().forEach(function (it, i) {
      var q = num(it.qty), p = num(it.price);
      L.push((i + 1) + '. ' + (it.desc || '-') + ': ' + q + ' x ' + plain(p) + ' = ' + plain(q * p));
    });
    L.push('------------------------');
    L.push('Subtotal: ' + fmt(c.sub));
    if (c.disc > 0) L.push('Discount: ' + fmt(c.disc));
    L.push('*TOTAL: ' + fmt(c.total) + '*');
    L.push('Amount paid: ' + fmt(c.paid));
    if (c.total > 0 && c.balance > 0) L.push('*Balance due: ' + fmt(c.balance) + '*');
    else if (c.balance < 0) L.push('Change: ' + fmt(-c.balance));
    L.push('Payment method: ' + s.method + (s.ref ? ' (Ref ' + s.ref + ')' : ''));
    if (s.by) L.push('Received by: ' + s.by);
    if (s.note) L.push('Note: ' + s.note);
    L.push('');
    L.push('Thank you for choosing ' + (biz.name || 'us') + '!');
    return L.join('\n');
  }

  /* ---------- PDF ---------- */
  function buildPdf() {
    var J = window.jspdf.jsPDF, doc = new J({ unit: 'mm', format: 'a4' });
    var W = 210, H = 297, M = 16, R = W - M;
    var s = state(), c = calc();
    var navy = [15, 76, 138], blue = [27, 143, 196], green = [46, 158, 79], gold = [242, 194, 48];
    var ink = [20, 23, 31], mut = [91, 98, 112], lineC = [215, 219, 226], zebra = [244, 247, 250];
    var rows = visibleItems();
    var y;

    function wm() {
      var d = imgData.watermark;
      if (!d || !d.url) return;
      try {
        var ww = 150, wh = ww * d.h / d.w;
        doc.setGState(new doc.GState({ opacity: 0.08 }));
        doc.addImage(d.url, 'PNG', (W - ww) / 2, (H - wh) / 2 + 8, ww, wh);
        doc.setGState(new doc.GState({ opacity: 1 }));
      } catch (e) {}
    }
    function bar() {
      doc.setFillColor(navy[0], navy[1], navy[2]); doc.rect(0, 0, W * 0.5, 4, 'F');
      doc.setFillColor(blue[0], blue[1], blue[2]); doc.rect(W * 0.5, 0, W * 0.26, 4, 'F');
      doc.setFillColor(green[0], green[1], green[2]); doc.rect(W * 0.76, 0, W * 0.16, 4, 'F');
      doc.setFillColor(gold[0], gold[1], gold[2]); doc.rect(W * 0.92, 0, W * 0.08, 4, 'F');
    }
    function txt(t, x, yy, o) { doc.text(String(t), x, yy, o || {}); }
    function label(t, x, yy) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(mut[0], mut[1], mut[2]);
      txt(t, x, yy);
    }

    wm(); bar();
    var lg = imgData.logo;
    if (lg && lg.url) {
      try {
        var lw = 62, lh = lw * lg.h / lg.w;
        if (lh > 30) { lh = 30; lw = lh * lg.w / lg.h; }
        doc.addImage(lg.url, 'PNG', M, 12, lw, lh);
      } catch (e) {}
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(navy[0], navy[1], navy[2]);
    txt('RECEIPT', R, 24, { align: 'right' });
    doc.setFontSize(10); doc.setTextColor(ink[0], ink[1], ink[2]);
    txt('No. ' + (s.no || '-'), R, 31, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setTextColor(mut[0], mut[1], mut[2]);
    txt('Date: ' + showDate(s.date), R, 37, { align: 'right' });

    doc.setFontSize(8.5);
    var cl = doc.splitTextToSize(contactLine(), W - 2 * M);
    txt(cl, M, 45);
    y = 45 + cl.length * 4 + 2;
    doc.setDrawColor(lineC[0], lineC[1], lineC[2]); doc.setLineWidth(0.3); doc.line(M, y, R, y);
    y += 8;

    label('BILLED TO', M, y); label('PAYMENT', W / 2 + 4, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(ink[0], ink[1], ink[2]);
    var cn = doc.splitTextToSize(s.cust || '-', 80);
    txt(cn, M, y + 6);
    var ly = y + 6 + cn.length * 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(mut[0], mut[1], mut[2]);
    if (s.custPhone) { txt(s.custPhone, M, ly); ly += 5; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(ink[0], ink[1], ink[2]);
    txt(s.method, W / 2 + 4, y + 6);
    var ry = y + 11;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(mut[0], mut[1], mut[2]);
    if (s.ref) { txt('Ref: ' + s.ref, W / 2 + 4, ry); ry += 5; }
    y = Math.max(ly, ry) + 6;

    var xI = M + 3, xP = M + 12, xQ = R - 66, xU = R - 36, xA = R - 3, pw = xQ - 12 - xP;
    function tableHead() {
      doc.setFillColor(navy[0], navy[1], navy[2]); doc.rect(M, y, R - M, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
      txt('#', xI, y + 5.4); txt('PRODUCT / SERVICE', xP, y + 5.4);
      txt('QTY', xQ, y + 5.4, { align: 'right' }); txt('UNIT (TSh)', xU, y + 5.4, { align: 'right' }); txt('AMOUNT (TSh)', xA, y + 5.4, { align: 'right' });
      y += 8;
    }
    tableHead();
    rows.forEach(function (it, i) {
      var q = num(it.qty), p = num(it.price);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      var lines = doc.splitTextToSize(it.desc || '-', pw);
      var h = Math.max(8, lines.length * 4.8 + 3.6);
      if (y + h > H - 32) { doc.addPage(); wm(); bar(); y = 16; tableHead(); }
      if (i % 2 === 1) { doc.setFillColor(zebra[0], zebra[1], zebra[2]); doc.rect(M, y, R - M, h, 'F'); }
      doc.setTextColor(ink[0], ink[1], ink[2]);
      txt(i + 1, xI, y + 5.4);
      txt(lines, xP, y + 5.4);
      txt(q, xQ, y + 5.4, { align: 'right' });
      txt(plain(p), xU, y + 5.4, { align: 'right' });
      txt(plain(q * p), xA, y + 5.4, { align: 'right' });
      y += h;
    });
    doc.setDrawColor(lineC[0], lineC[1], lineC[2]); doc.line(M, y, R, y);
    y += 8;

    if (y > H - 86) { doc.addPage(); wm(); bar(); y = 20; }
    var top = y, tx = R - 82;
    function trow(l, v, bold) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(10); doc.setTextColor(ink[0], ink[1], ink[2]);
      txt(l, tx + 3, y + 5); txt(v, R - 3, y + 5, { align: 'right' }); y += 8;
    }
    trow('Subtotal', fmt(c.sub));
    if (c.disc > 0) trow('Discount', '- ' + fmt(c.disc));
    doc.setFillColor(navy[0], navy[1], navy[2]); doc.rect(tx, y, 82, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
    txt('TOTAL', tx + 3, y + 6); txt(fmt(c.total), R - 3, y + 6, { align: 'right' }); y += 11;
    trow('Amount paid', fmt(c.paid));
    var badge = null;
    if (c.total > 0 && c.balance > 0) { trow('Balance due', fmt(c.balance), true); badge = { t: 'BALANCE DUE', col: [161, 92, 0] }; }
    else if (c.total > 0) { if (c.balance < 0) trow('Change', fmt(-c.balance)); badge = { t: 'PAID IN FULL', col: [15, 123, 75] }; }
    var by = top;
    if (badge) {
      doc.setDrawColor(badge.col[0], badge.col[1], badge.col[2]); doc.setLineWidth(0.8);
      doc.roundedRect(M, top + 1, 46, 12, 1.5, 1.5, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(badge.col[0], badge.col[1], badge.col[2]);
      txt(badge.t, M + 23, top + 8.8, { align: 'center' });
      by = top + 18;
    }
    if (s.note) {
      label('NOTE', M, by + 2);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(ink[0], ink[1], ink[2]);
      var nl = doc.splitTextToSize(s.note, 84);
      txt(nl, M, by + 8);
      by += 8 + nl.length * 4.6;
    }
    y = Math.max(y, by) + 14;
    if (y > H - 44) { doc.addPage(); wm(); bar(); y = 30; }
    doc.setDrawColor(ink[0], ink[1], ink[2]); doc.setLineWidth(0.3); doc.line(M, y + 8, M + 64, y + 8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(ink[0], ink[1], ink[2]);
    if (s.by) txt(s.by, M, y + 6);
    label('RECEIVED BY', M, y + 13);

    var pages = doc.getNumberOfPages();
    for (var p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setDrawColor(lineC[0], lineC[1], lineC[2]); doc.setLineWidth(0.3); doc.line(M, H - 22, R, H - 22);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(navy[0], navy[1], navy[2]);
      txt('CREATIVITY  •  QUALITY  •  SERVICE', W / 2, H - 16, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(mut[0], mut[1], mut[2]);
      txt('Thank you for choosing ' + (biz.name || 'us') + '.' + (pages > 1 ? '   Page ' + p + ' of ' + pages : ''), W / 2, H - 11, { align: 'center' });
    }
    return doc.output('blob');
  }

  /* ---------- UI helpers ---------- */
  var statusTimer;
  function say(msg) {
    $('status').textContent = msg;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { $('status').textContent = ''; }, 6000);
  }

  function setState(s) {
    $('no').value = s.no || '';
    $('date').value = s.date || today();
    $('cust').value = s.cust || '';
    $('custPhone').value = s.custPhone || '';
    items = (s.items && s.items.length ? s.items : [{ desc: '', qty: '1', price: '' }]).map(function (x) { return { desc: x.desc || '', qty: x.qty || '1', price: x.price || '' }; });
    $('disc').value = s.disc || '0';
    $('paid').value = s.paid || '';
    $('method').value = s.method || 'Cash';
    $('ref').value = s.ref || '';
    $('by').value = s.by || '';
    $('note').value = s.note || '';
    drawItems();
    render();
  }

  function drawHist() {
    var list = saved();
    if (!list.length) {
      $('hist').innerHTML = '<p class="note">No saved receipts yet. Saving a receipt, creating its PDF or sending it on WhatsApp keeps a record here.</p>';
      return;
    }
    $('hist').innerHTML = list.map(function (r, i) {
      var t = 0;
      (r.items || []).forEach(function (it) { t += num(it.qty) * num(it.price); });
      t = Math.max(0, t - num(r.disc));
      return '<div class="hist-item"><div class="t"><b>' + esc(r.no) + '</b><span>' + esc(r.cust || 'No name') + ' &middot; ' + esc(showDate(r.date)) + ' &middot; ' + fmt(t) + '</span></div>' +
        '<div class="a"><button type="button" data-open="' + i + '">Open</button><button type="button" data-del="' + i + '">Delete</button></div></div>';
    }).join('');
  }

  function commit() {
    if (sample) return;
    var s = state();
    if (!s.no) return;
    var list = saved().filter(function (r) { return r.no !== s.no; });
    list.unshift(s);
    store.set('tzco_receipts2', list.slice(0, 50));
    s.items.forEach(function (it) { if (it.desc.trim() && num(it.price) > 0) products[it.desc.trim()] = it.price; });
    store.set('tzco_products', products);
    drawProducts();
    drawHist();
  }

  function leaveSample() { sample = false; $('sampleNote').hidden = true; }

  /* ---------- events ---------- */
  $('form').addEventListener('input', function (e) {
    var t = e.target;
    leaveSample();
    if (t.dataset && t.dataset.k) {
      var row = t.closest('.item');
      if (row) items[+row.dataset.i][t.dataset.k] = t.value;
    }
    if (t.id === 'bName') biz.name = t.value;
    if (t.id === 'bLoc') biz.loc = t.value;
    if (t.id === 'bPhone') biz.phone = t.value;
    if (t.id === 'bWeb') biz.web = t.value;
    if (/^b(Name|Loc|Phone|Web)$/.test(t.id)) store.set('tzco_biz2', biz);
    render();
  });
  $('form').addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.k === 'desc') {
      var row = t.closest('.item'), i = +row.dataset.i, name = t.value.trim();
      if (products[name] && !num(items[i].price)) {
        items[i].price = products[name];
        $('p' + i).value = products[name];
      }
    }
    render();
  });

  $('items').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rm]');
    if (!b) return;
    leaveSample();
    items.splice(+b.dataset.rm, 1);
    if (!items.length) items.push({ desc: '', qty: '1', price: '' });
    drawItems();
    render();
  });

  $('addItem').addEventListener('click', function () {
    leaveSample();
    items.push({ desc: '', qty: '1', price: '' });
    drawItems();
    render();
    var last = $('d' + (items.length - 1));
    if (last) last.focus();
  });

  $('pdf').addEventListener('click', function () {
    if (!dl) { say('Saving a PDF is not available in this view. Take a screenshot of the receipt instead.'); return; }
    if (!window.jspdf) { say('The PDF tool did not load. Check your connection and reload the page.'); return; }
    var blob;
    try { blob = buildPdf(); } catch (err) { say('The PDF could not be built. Please try again.'); return; }
    commit();
    var name = 'Receipt-' + (state().no || 'draft').replace(/[^\w\-]+/g, '-') + '.pdf';
    dl.save({ filename: name, data: blob }).then(function () {
      say('PDF ready. Open it to share on WhatsApp.');
    }, function (err) {
      if (err && err.code === 'declined') return;
      say('The PDF could not be saved (' + ((err && err.code) || 'error') + ').');
    });
  });

  $('wa').addEventListener('click', function () { commit(); });

  $('copy').addEventListener('click', function () {
    var text = receiptText();
    var fb = $('fallback');
    commit();
    function manual() {
      fb.style.display = 'block';
      fb.value = text;
      fb.focus();
      fb.select();
      say('Text selected. Copy it by hand, then paste it into WhatsApp.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        fb.style.display = 'none';
        say('Receipt text copied. Paste it into WhatsApp.');
      }, manual);
    } else { manual(); }
  });

  $('save').addEventListener('click', function () {
    if (sample) { say('This is sample data. Select "New receipt" first.'); return; }
    var s = state();
    if (!s.no) { say('Enter a receipt number first.'); return; }
    commit();
    say('Receipt ' + s.no + ' saved.');
  });

  $('fresh').addEventListener('click', function () {
    leaveSample();
    $('fallback').style.display = 'none';
    setState({ no: nextNo(), date: today(), items: [{ desc: '', qty: '1', price: '' }], disc: '0', method: 'Cash' });
    $('cust').focus();
  });

  $('hist').addEventListener('click', function (e) {
    var list = saved();
    var o = e.target.closest('[data-open]');
    if (o) { leaveSample(); setState(list[+o.dataset.open]); window.scrollTo(0, 0); return; }
    var d = e.target.closest('[data-del]');
    if (d) {
      if (d.dataset.sure) {
        list.splice(+d.dataset.del, 1);
        store.set('tzco_receipts2', list);
        drawHist();
      } else {
        d.dataset.sure = '1';
        d.textContent = 'Sure?';
      }
    }
  });

  /* ---------- start ---------- */
  $('bName').value = biz.name || '';
  $('bLoc').value = biz.loc || '';
  $('bPhone').value = biz.phone || '';
  $('bWeb').value = biz.web || '';
  drawProducts();
  setState({ no: nextNo(), date: today(), cust: 'Sample customer', items: items, disc: '0', paid: '100000', method: 'M-Pesa' });
  drawHist();

  if (window.claude && window.claude.use) {
    window.claude.use('downloads').then(function (d) {
      dl = d;
      if (!dl) { $('pdf').hidden = true; $('pdfNote').textContent = 'PDF saving is not available in this view. Take a screenshot of the receipt, or use Send on WhatsApp for a text version.'; }
    }, function () {});
  } else {
    dl = {
      save: function (o) {
        var file = null;
        try { file = new File([o.data], o.filename, { type: 'application/pdf' }); } catch (e) {}
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          return navigator.share({ files: [file], title: o.filename }).then(function () { return { status: 'saved' }; }, function (e) {
            return Promise.reject({ code: e && e.name === 'AbortError' ? 'declined' : 'unavailable' });
          });
        }
        var url = URL.createObjectURL(o.data);
        var a = document.createElement('a');
        a.href = url; a.download = o.filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        return Promise.resolve({ status: 'saved' });
      }
    };
  }
})();