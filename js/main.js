// js/main.js
// main.js の冒頭などで要素を取得
const fileInput       = document.getElementById('file-input');
const openPdfLabel    = document.querySelector('label[for="file-input"]');

// 同じファイル選択でも必ず change を発火させる
fileInput.addEventListener('click', () => {
  fileInput.value = null;
});

// 既存の change リスナーをラップして無効化／有効化を実装
fileInput.addEventListener('change', async (e) => {
  // ────────────── ここから追加 ──────────────
  openPdfLabel.classList.add('disabled');
  // ────────────── ここまで追加 ──────────────

  try {
    // ────────────── 既存の読み込み処理 ──────────────
    await loadAndPreviewPDF(e.target.files);
    // ───────────────────────────────────────────────

  } finally {
    // ────────────── ここから追加 ──────────────
    openPdfLabel.classList.remove('disabled');
    // ────────────── ここまで追加 ──────────────
  }
});

(async () => {
  // PDF-LIBから必要な要素を取得
  const { PDFDocument, degrees } = PDFLib;

  // DOM要素取得
	const fileInput      = document.getElementById('file-input');
	const addFileInput   = document.getElementById('file-add-input');
	const rotateBtn      = document.getElementById('rotate-btn');
	const alignVertBtn   = document.getElementById('align-vert-btn');
	const alignHorzBtn   = document.getElementById('align-horz-btn');
	const downloadLink   = document.getElementById('download-link');
	let pdfDocs = [];
	let globalPdfIndex = 0; // ★ これを上に持ってくる！！
	let globalPageCount = 0;  // 全体ページ番号用
	let totalPages = 0;       // 総ページ数

  // 初期状態：操作ボタンを無効化
  [rotateBtn, alignVertBtn, alignHorzBtn].forEach(btn => btn.disabled = true);

  // ファイル選択時の処理
	fileInput.addEventListener('change', async (e) => {
		globalPageCount = 0;
		totalPages = 0;
		const files = Array.from(e.target.files);
		pdfDocs = [];
	
		// プレビュー領域クリア
		const previewArea = document.getElementById('pdf-preview-area');
		previewArea.innerHTML = '';
	
		// PDF読み込み＆プレビュー
		globalPdfIndex = 0;  // ★ PDFごとのインデックスを管理
		for (const file of files) {
			const arrayBuffer = await file.arrayBuffer();
			const pdfDoc = await PDFDocument.load(arrayBuffer);
			pdfDocs.push(pdfDoc);
		
			const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
			const loadedPdf = await loadingTask.promise;
			totalPages += loadedPdf.numPages;
		
			for (let pageNum = 1; pageNum <= loadedPdf.numPages; pageNum++) {
				globalPageCount++;
		
				const page = await loadedPdf.getPage(pageNum);
				const viewport = page.getViewport({ scale: 0.2 });
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				canvas.width = viewport.width;
				canvas.height = viewport.height;
				await page.render({ canvasContext: ctx, viewport }).promise;
		
				// ★ ページ情報をデータ属性として保持
				canvas.dataset.pdfIndex = globalPdfIndex;
				canvas.dataset.pageIndex = pageNum - 1;
		
				// チェック付きサムネイル
				const wrapper = document.createElement('div');
				wrapper.className = 'col s3 m3 l2 card thumbnail-wrapper';
		
				const label = document.createElement('label');
				label.className = 'checkbox-label';
				const checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.className = 'filled-in page-checkbox';
				const span = document.createElement('span');
				label.append(checkbox, span);
		
				const cardImage = document.createElement('div');
				cardImage.className = 'card-image';
				cardImage.append(label, canvas);
		
				const pageNumberDiv = document.createElement('div');
				pageNumberDiv.className = 'page-number';
				pageNumberDiv.textContent = `${globalPageCount} / ${totalPages}`;
		
				const cardContent = document.createElement('div');
				cardContent.className = 'card-content center-align';
				cardContent.appendChild(pageNumberDiv);
		
				wrapper.appendChild(cardImage);
				wrapper.appendChild(cardContent);
				previewArea.appendChild(wrapper);
			}
			globalPdfIndex++;
		}
			
		// 操作ボタン有効化
		[rotateBtn, alignVertBtn, alignHorzBtn].forEach(btn => btn.disabled = false);
		downloadLink.classList.remove('disabled');
	
		// 即マージしてダウンロードリンクを有効化
		fileInput.value = '';

	});
		// 個別回転（90度ずつ）
// 個別回転（チェックしたサムネイルだけ90度ずつ回転）
rotateBtn.addEventListener("click", () => {
  document.querySelectorAll(".thumbnail-wrapper").forEach(wrapper => {
    const checkbox = wrapper.querySelector(".page-checkbox");
    const canvas   = wrapper.querySelector("canvas");

    if (checkbox.checked) {
      // 前回の回転角度を取得し、90度プラス
      let rotate = parseInt(canvas.dataset.rotate || "0");
      rotate = (rotate + 90) % 360;
      canvas.dataset.rotate = rotate.toString();
      canvas.style.transform = `rotate(${rotate}deg)`;
    }
  });
});


alignVertBtn.addEventListener("click", () => {
  document.querySelectorAll("#pdf-preview-area canvas").forEach(canvas => {
       if (canvas.width > canvas.height) {
			     // 横長のものだけ 90° 回転 → 縦向きにする
			     canvas.dataset.rotate = "90";
			     canvas.style.transform = "rotate(90deg)";
			   } else {
			     // もともと縦長は回転なし
			     canvas.dataset.rotate = "0";
			     canvas.style.transform = "rotate(0deg)";
			   }
  });
});


  // 全て横向きに揃える
	alignHorzBtn.addEventListener("click", () => {
		document.querySelectorAll("#pdf-preview-area canvas").forEach(canvas => {
			// ページの元の向きを Canvas から判定
			if (canvas.height > canvas.width) {
				// portrait → landscape に回転
				canvas.dataset.rotate = "90";
				canvas.style.transform = "rotate(90deg)";
			} else {
				// もともと landscape → そのまま
				canvas.dataset.rotate = "0";
				canvas.style.transform = "rotate(0deg)";
			}
		});
	});
	
	const removeCheckedBtn = document.getElementById('remove-checked-btn');

// ページ番号を更新する関数
function updatePageNumbers() {
  // 表示されているすべてのサムネイル（削除されていないもの）を取得
  const thumbnails = document.querySelectorAll('.thumbnail-wrapper');
  
  // 総ページ数を計算（表示されているサムネイルの数）
  const visibleCount = thumbnails.length;
  
  // 各サムネイルのページ番号を更新
  let currentPageNumber = 1;
  
  thumbnails.forEach(wrapper => {
    // ページ番号表示要素を取得
    const pageNumberDiv = wrapper.querySelector('.page-number');
    
    // ページ番号を更新
    if (pageNumberDiv) {
      pageNumberDiv.textContent = `${currentPageNumber} / ${visibleCount}`;
      currentPageNumber++;
    }
  });
  
  // グローバル変数も更新（必要に応じて）
  totalPages = visibleCount;
  globalPageCount = visibleCount;
}

// 削除ボタンのイベントリスナーを修正
removeCheckedBtn.addEventListener('click', () => {
  const wrappers = document.querySelectorAll('.thumbnail-wrapper');
  wrappers.forEach(wrapper => {
    const checkbox = wrapper.querySelector('.page-checkbox');
    const canvas = wrapper.querySelector('canvas');
    if (checkbox.checked) {
      // 削除フラグを付けてからDOMを削除
      if (canvas) canvas.dataset.removed = 'true';
      wrapper.remove();
    }
  });
  
  // ページを削除した後にページ番号を更新
  updatePageNumbers();
  
  // 削除完了のメッセージを表示（オプション）
  if (typeof M !== 'undefined' && M.toast) {
    M.toast({ html: 'page deleted' });
  } else {
    console.log('page deleted');
  }
});
	
	

// 隠し input で選択された PDF をプレビュー・配列に追加
// ファイル追加時のコードも修正して、updatePageNumbers を呼び出す

// 元のファイル追加コード（addFileInput）を修正
addFileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  const previewArea = document.getElementById('pdf-preview-area');

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    pdfDocs.push(pdfDoc);
  
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const loadedPdf = await loadingTask.promise;
    totalPages += loadedPdf.numPages;
  
    for (let pageNum = 1; pageNum <= loadedPdf.numPages; pageNum++) {
      globalPageCount++;
  
      const page = await loadedPdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.2 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
  
      // ページ情報をデータ属性として保持
      canvas.dataset.pdfIndex = globalPdfIndex;
      canvas.dataset.pageIndex = pageNum - 1;
  
      // チェック付きサムネイル
      const wrapper = document.createElement('div');
			wrapper.className = 'col s3 m3 l2 card thumbnail-wrapper';
  
      const label = document.createElement('label');
      label.className = 'checkbox-label';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'filled-in page-checkbox';
      const span = document.createElement('span');
      label.append(checkbox, span);
  
      const cardImage = document.createElement('div');
      cardImage.className = 'card-image';
      cardImage.append(label, canvas);
  
      const pageNumberDiv = document.createElement('div');
      pageNumberDiv.className = 'page-number';
      // 一時的なページ番号を設定（後で updatePageNumbers で更新される）
      pageNumberDiv.textContent = `${globalPageCount} / ${totalPages}`;
  
      const cardContent = document.createElement('div');
      cardContent.className = 'card-content center-align';
      cardContent.appendChild(pageNumberDiv);
  
      wrapper.appendChild(cardImage);
      wrapper.appendChild(cardContent);
      previewArea.appendChild(wrapper);
    }
    globalPdfIndex++;
  }
  
  // ファイル追加後にページ番号を再計算
  updatePageNumbers();
  
  // 操作ボタン有効化（必要なら）
  [rotateBtn, alignVertBtn, alignHorzBtn].forEach(btn => btn.disabled = false);
  downloadLink.classList.remove('disabled');
  
  if (typeof M !== 'undefined' && M.toast) {
    M.toast({ html: `${files.length} file added` });
  } else {
    console.log(`${files.length} file added`);
  }

  // 次回選択時にも発火するようリセット
  addFileInput.value = '';
});

// 同様に、元のファイル選択コード（fileInput）も修正




// ===== 変更後 end =====
// ▼ PDFダウンロード時に「マージ＋ダウンロード」を実行
// ▼ PDFダウンロード時に「マージ＋ダウンロード」を実行
// ダウンロードリンクのイベントハンドラを修正
// ダウンロードリンクのイベントハンドラを修正
downloadLink.addEventListener('click', async (e) => {
  e.preventDefault();
  if (downloadLink.classList.contains('disabled')) return;
  
  try {
    // デバッグ情報
    console.log('ダウンロード開始: PDFドキュメント数=', pdfDocs.length);
    
    const mergedPdf = await PDFDocument.create();
    const canvases = document.querySelectorAll('#pdf-preview-area canvas');
    
    // プレビューにあるキャンバス要素の数を確認
    console.log('処理するキャンバス要素数:', canvases.length);
    
    let processedPages = 0;
    
    for (const canvas of canvases) {
      // 削除マークがついているものはスキップ
      if (canvas.dataset.removed === 'true') {
        console.log('削除済みページをスキップ');
        continue;
      }
      
      // データ属性の値を取得
      const pdfIndex = parseInt(canvas.dataset.pdfIndex);
      const pageIndex = parseInt(canvas.dataset.pageIndex);
      
      console.log(`処理中: PDF=${pdfIndex}, Page=${pageIndex}`);
      
      // 配列の範囲チェック
      if (pdfIndex < 0 || pdfIndex >= pdfDocs.length) {
        console.error(`無効なPDFインデックス: ${pdfIndex}`);
        continue;
      }
      
      const pdfDoc = pdfDocs[pdfIndex];
      if (!pdfDoc) {
        console.error(`PDFドキュメント取得失敗: index=${pdfIndex}`);
        continue;
      }
      
      try {
        // 対象ページを1枚だけコピー
        const [copiedPage] = await mergedPdf.copyPages(pdfDoc, [pageIndex]);
        
        // PDF-LIBではgetPage()ではなくgetPages()[]を使用
        // 回転処理（元の角度 + UI指定角度）
        const pages = pdfDoc.getPages();
        const origPage = pages[pageIndex];
        if (!origPage) {
          console.error(`ページが見つかりません: PDF=${pdfIndex}, Page=${pageIndex}`);
          continue;
        }
        
        const origAngle = origPage.getRotation().angle;
        const previewAngle = parseInt(canvas.dataset.rotate || '0', 10);
        const totalAngle = (origAngle + previewAngle) % 360;
        
        copiedPage.setRotation(degrees(totalAngle));
        mergedPdf.addPage(copiedPage);
        processedPages++;
      } catch (pageError) {
        console.error(`ページ処理エラー: PDF=${pdfIndex}, Page=${pageIndex}`, pageError);
      }
    }
    
    console.log(`合計 ${processedPages} ページを処理しました`);
    
    if (processedPages === 0) {
      alert('open PDFs');
      return;
    }
    
    const mergedBytes = await mergedPdf.save();
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });
    
    // ダウンロード処理
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('download finished');
  } catch (error) {
    console.error('failed to download:', error);
    alert('please check the console:');
  }
});
})();
