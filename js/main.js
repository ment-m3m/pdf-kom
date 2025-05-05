// js/main.js

(async () => {
  // PDF-LIBから必要な要素を取得
  const { PDFDocument, degrees } = PDFLib;

  // DOM要素取得
  const fileInput     = document.getElementById('file-input');
  const rotateBtn     = document.getElementById('rotate-btn');
  const alignVertBtn  = document.getElementById('align-vert-btn');
  const alignHorzBtn  = document.getElementById('align-horz-btn');
  const mergeBtn      = document.getElementById('merge-btn');
  const downloadLink  = document.getElementById('download-link');

  let pdfDocs = [];

  // 初期状態：操作ボタンを無効化
  [rotateBtn, alignVertBtn, alignHorzBtn, mergeBtn].forEach(btn => btn.disabled = true);

  // ファイル選択時の
fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  pdfDocs = [];

  const previewArea = document.getElementById('pdf-preview-area');
  previewArea.innerHTML = ''; // プレビュー領域を初期化

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    pdfDocs.push(pdfDoc);

    // PDF.jsで表示用の読み込み
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const loadedPdf = await loadingTask.promise;

    for (let pageNum = 1; pageNum <= loadedPdf.numPages; pageNum++) {
      const page = await loadedPdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      previewArea.appendChild(canvas);
    }
  }

  // ファイル読み込み完了後、操作ボタンを有効化
  [rotateBtn, alignVertBtn, alignHorzBtn, mergeBtn].forEach(btn => btn.disabled = false);
  M.toast({ html: `${files.length} ファイル読み込み完了` });
});
  // 個別回転（90度ずつ）
  rotateBtn.addEventListener('click', () => {
    pdfDocs.forEach(pdfDoc => {
      pdfDoc.getPages().forEach(page => {
        const currentRot = page.getRotation().angle;
        page.setRotation(degrees(currentRot + 90));
      });
    });
    M.toast({ html: '個別回転を適用しました' });
  });

  // 全て縦向きに揃える
  alignVertBtn.addEventListener('click', () => {
    pdfDocs.forEach(pdfDoc => {
      pdfDoc.getPages().forEach(page => {
        const { width, height } = page.getSize();
        if (width > height) {
          const currentRot = page.getRotation().angle;
          page.setRotation(degrees(currentRot + 90));
        }
      });
    });
    M.toast({ html: '全て縦向きに揃えました' });
  });

  // 全て横向きに揃える
  alignHorzBtn.addEventListener('click', () => {
    pdfDocs.forEach(pdfDoc => {
      pdfDoc.getPages().forEach(page => {
        const { width, height } = page.getSize();
        if (height > width) {
          const currentRot = page.getRotation().angle;
          page.setRotation(degrees(currentRot + 90));
        }
      });
    });
    M.toast({ html: '全て横向きに揃えました' });
  });

  // マージ実行
  mergeBtn.addEventListener('click', async () => {
    const mergedPdf = await PDFDocument.create();
    for (const pdfDoc of pdfDocs) {
      const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }
    const mergedBytes = await mergedPdf.save();
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });
    const url  = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.classList.remove('disabled');
    M.toast({ html: 'PDF マージ完了。ダウンロード可能です。' });
  });
})();
