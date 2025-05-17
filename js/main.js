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

// メイン処理
(() => {
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

				       // ファイル名を表示（オプション）
        const fileNameDiv = document.createElement('div');
        fileNameDiv.className = 'file-name';
        fileNameDiv.textContent = `${file.name.substring(0, 15)}${file.name.length > 15 ? '...' : ''}`;
        fileNameDiv.style.fontSize = '10px';
        fileNameDiv.style.overflow = 'hidden';
        fileNameDiv.style.textOverflow = 'ellipsis';

        const pageNumberDiv = document.createElement('div');
        pageNumberDiv.className = 'page-number';
        pageNumberDiv.textContent = `${globalPageCount} / ${totalPages}`;
    
		    const cardContent = document.createElement('div');
        cardContent.className = 'card-content center-align';
        cardContent.appendChild(fileNameDiv); // ファイル名追加
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
    
				const fileNameDiv = document.createElement('div');
				fileNameDiv.className = 'file-name';
				fileNameDiv.textContent = `${file.name.substring(0, 15)}${file.name.length > 15 ? '...' : ''}`;
				fileNameDiv.style.fontSize = '10px';
				fileNameDiv.style.overflow = 'hidden';
				fileNameDiv.style.textOverflow = 'ellipsis';

				const cardContent = document.createElement('div');
				cardContent.className = 'card-content center-align';
				cardContent.appendChild(fileNameDiv);  // ← ファイル名を追加
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

  // ここから修正したドラッグドロップ実装
  (function() {
    // ドラッグ中の要素を保持する変数
    let draggedElements = []; // 複数要素対応のため配列に変更
    let draggedPrimaryElement = null; // ドラッグの主要要素
    let dragCounter = {}; // ドラッグ要素ごとのカウンターを管理するオブジェクト

    // ページ読み込み後と新しいPDF追加後に実行する関数
    function initDragDrop() {
      console.log('改良版ドラッグドロップを初期化しています');
      
      // プレビューエリアを取得
      const previewArea = document.getElementById('pdf-preview-area');
      if (!previewArea) {
        console.log('プレビューエリアが見つかりません');
        return;
      }
      
      // すべてのサムネイルを取得
      const thumbnailWrappers = Array.from(previewArea.querySelectorAll('.thumbnail-wrapper'));
      if (thumbnailWrappers.length === 0) {
        console.log('サムネイルが見つかりません');
        return;
      }
      
      console.log(`${thumbnailWrappers.length}個のサムネイルを処理します`);
      
      // 念のためイベントリスナーを削除（重複登録防止）
      thumbnailWrappers.forEach(wrapper => {
        wrapper.removeEventListener('dragstart', handleDragStart);
        wrapper.removeEventListener('dragover', handleDragOver);
        wrapper.removeEventListener('dragenter', handleDragEnter);
        wrapper.removeEventListener('dragleave', handleDragLeave);
        wrapper.removeEventListener('drop', handleDrop);
        wrapper.removeEventListener('dragend', handleDragEnd);
      });
      
      // 各サムネイルにドラッグ属性とイベントを設定
      thumbnailWrappers.forEach((wrapper, index) => {
        // data-index属性を設定
        wrapper.setAttribute('data-index', index.toString());
        
        // ドラッグ可能に設定
        wrapper.setAttribute('draggable', 'true');
        
        // イベントリスナーを追加（関数を外部定義して参照）
        wrapper.addEventListener('dragstart', handleDragStart);
        wrapper.addEventListener('dragover', handleDragOver);
        wrapper.addEventListener('dragenter', handleDragEnter);
        wrapper.addEventListener('dragleave', handleDragLeave);
        wrapper.addEventListener('drop', handleDrop);
        wrapper.addEventListener('dragend', handleDragEnd);
      });
      
      // スタイルを追加
      addDragDropStyles();
      
      console.log('ドラッグドロップの設定が完了しました');
    }
    
    // ドラッグ開始時の処理
    function handleDragStart(e) {
      e.stopPropagation();
      
      // ドラッグ要素をリセット
      draggedElements = [];
      draggedPrimaryElement = this;
      
      // チェックされているページを確認
      const checkedPages = document.querySelectorAll('.page-checkbox:checked');
      
      // チェックされたページがある場合は、それらをドラッグ対象とする
      if (checkedPages.length > 0) {
        // チェックされているサムネイルをすべて取得
        checkedPages.forEach(checkbox => {
          const wrapper = checkbox.closest('.thumbnail-wrapper');
          if (wrapper) {
            draggedElements.push(wrapper);
          }
        });
      } else {
        // チェックされたページがない場合は、ドラッグ元のみを対象とする
        draggedElements.push(this);
      }
      
      // ドラッグ中の要素にスタイルを適用
      draggedElements.forEach(element => {
        element.classList.add('being-dragged');
        element.style.opacity = '0.6';
      });
      
      // データ転送を設定（主要な要素のインデックスを格納）
      e.dataTransfer.effectAllowed = 'move';
      
      // ドラッグ要素のインデックスを文字列として結合
      const indices = draggedElements.map(el => el.getAttribute('data-index')).join(',');
      e.dataTransfer.setData('text/plain', indices);
      
      // ドラッグ時の表示画像を設定（透明画像）
      if (draggedElements.length > 1) {
        // 複数ページの場合、カスタムのドラッグ画像を作成
        try {
          const dragIcon = document.createElement('div');
          dragIcon.textContent = `${draggedElements.length} pages`;
          dragIcon.style.background = '#0a1d4d';
          dragIcon.style.color = 'white';
          dragIcon.style.padding = '5px 10px';
          dragIcon.style.borderRadius = '3px';
          dragIcon.style.position = 'absolute';
          dragIcon.style.top = '-1000px';
          document.body.appendChild(dragIcon);
          
          e.dataTransfer.setDragImage(dragIcon, 0, 0);
          
          // 一定時間後に削除
          setTimeout(() => document.body.removeChild(dragIcon), 0);
        } catch (err) {
          console.error('ドラッグ画像設定エラー:', err);
        }
      }
      
      return true;
    }
    
    // ドラッグオーバー時の処理
    function handleDragOver(e) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      
      // 明示的にfalseを返すことで、ドラッグオーバーイベントを処理したことを示す
      return false;
    }
    
    // ドラッグエンター時の処理（ドロップターゲットへの進入）
    function handleDragEnter(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // ドラッグ元と異なる場合のみ視覚効果を適用
      if (!draggedElements.includes(this)) {
        // カウンターを初期化（存在しない場合）
        if (!dragCounter[this.dataset.index]) {
          dragCounter[this.dataset.index] = 0;
        }
        
        // カウンターをインクリメント
        dragCounter[this.dataset.index]++;
        
        // 最初の進入時のみクラスを追加
        if (dragCounter[this.dataset.index] === 1) {
          this.classList.add('drag-over');
        }
      }
    }
    
    // ドラッグリーブ時の処理（ドロップターゲットからの離脱）
    function handleDragLeave(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // ドラッグ元と異なる場合のみ処理
      if (!draggedElements.includes(this)) {
        // カウンターをデクリメント
        dragCounter[this.dataset.index]--;
        
        // カウンターが0になった場合にのみクラスを削除
        if (dragCounter[this.dataset.index] === 0) {
          this.classList.remove('drag-over');
        }
      }
    }
    
    // ドロップ時の処理
    function handleDrop(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // 視覚効果をクリア
      this.classList.remove('drag-over');
      
      // ドラッグ元がドロップ先に含まれていなければ処理
      if (!draggedElements.includes(this)) {
        try {
          // ドラッグ元のインデックスを取得
          const sourceIndicesStr = e.dataTransfer.getData('text/plain');
          const sourceIndices = sourceIndicesStr.split(',').map(Number);
          
          // ドロップ先のインデックス
          const targetIndex = parseInt(this.getAttribute('data-index'));
          
          // 移動するすべての要素を一旦取得して配列に格納
          const previewArea = document.getElementById('pdf-preview-area');
          const elementsToMove = [];
          
          // ソースインデックスに対応する要素を取得（降順でソート）
          sourceIndices.sort((a, b) => a - b)
            .forEach(index => {
              const element = document.querySelector(`.thumbnail-wrapper[data-index="${index}"]`);
              if (element) {
                elementsToMove.push(element);
              }
            });
          
          // ドロップ先の要素を取得
          const targetElement = document.querySelector(`.thumbnail-wrapper[data-index="${targetIndex}"]`);
          
          // 移動する要素がすべて取得できているか確認
          if (elementsToMove.length === sourceIndices.length && targetElement) {
            console.log(`${elementsToMove.length}ページを移動: 位置${targetIndex}へ`);
            
            // 移動元の平均インデックスを計算
            const avgSourceIndex = sourceIndices.reduce((a, b) => a + b, 0) / sourceIndices.length;
            
            // 移動元が移動先より前か後ろかを判定
            const movingForward = avgSourceIndex < targetIndex;
            
            // 複数要素を実際に移動する（古いインデックスは無視して新しい位置に直接挿入）
            elementsToMove.forEach(element => {
              // 一旦DOMから削除
              if (element.parentNode) {
                element.parentNode.removeChild(element);
              }
            });
            
            // 移動方向に基づいて要素を挿入
            if (movingForward) {
              // 要素を後方に移動するとき：ターゲットの次に挿入
              const nextSibling = targetElement.nextSibling;
              if (nextSibling) {
                // 順番を維持するために逆順で挿入
                for (let i = elementsToMove.length - 1; i >= 0; i--) {
                  previewArea.insertBefore(elementsToMove[i], nextSibling);
                }
              } else {
                // 末尾に追加
                elementsToMove.forEach(element => {
                  previewArea.appendChild(element);
                });
              }
            } else {
              // 要素を前方に移動するとき：ターゲットの前に挿入
              elementsToMove.forEach(element => {
                previewArea.insertBefore(element, targetElement);
              });
            }
            
            // インデックスとページ番号を更新
            updateIndices();
            updatePageNumbers();
            
            // 変更を通知
            if (typeof M !== 'undefined' && M.toast) {
              M.toast({ html: `${elementsToMove.length}ページの順序を変更しました` });
            }
          }
        } catch (error) {
          console.error('ドロップ処理エラー:', error);
        }
      }
      
      // ドラッグカウンターをリセット
      dragCounter = {};
      
      return false;
    }
    
    // ドラッグ終了時の処理
    function handleDragEnd(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // 視覚効果をリセット
      draggedElements.forEach(element => {
        element.classList.remove('being-dragged');
        element.style.opacity = '1';
      });
      
      // すべてのドラッグオーバー効果をクリア
      document.querySelectorAll('.drag-over').forEach(element => {
        element.classList.remove('drag-over');
      });
      
      // ドラッグ関連変数をリセット
      draggedElements = [];
      draggedPrimaryElement = null;
      dragCounter = {};
      
      return false;
    }
    
    // インデックスを更新する関数
    function updateIndices() {
      const thumbnails = document.querySelectorAll('.thumbnail-wrapper');
      thumbnails.forEach((thumbnail, index) => {
        thumbnail.setAttribute('data-index', index.toString());
      });
    }
    
    // スタイルを追加する関数
    function addDragDropStyles() {
      const styleId = 'enhanced-drag-styles';
      
      // 既存のスタイルは削除しない（競合を避けるため）
      if (!document.getElementById(styleId)) {
        const styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = `
        /* ドラッグ可能な要素 */
        .thumbnail-wrapper {
          cursor: grab;
          transition: all 0.2s ease-in-out;
          user-select: none;
        }
        
        /* ドラッグ中の要素 */
        .being-dragged {
          outline: 2px solid #1565C0;
          z-index: 1000;
        }
        
        /* ドラッグオーバー時の要素（点線ボーダーを強調） */
        .drag-over {
          border: 3px dashed #0a1d4d !important;
          background-color: rgba(10, 29, 77, 0.1);
          transform: scale(1.03);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        
        /* チェック状態の要素にも特別なスタイルを適用 */
        .thumbnail-wrapper .page-checkbox:checked + span {
          background-color: rgba(10, 29, 77, 0.05);
        }
        
        /* サムネイルホバー時のスタイル */
        .thumbnail-wrapper:hover {
          transform: translateY(-2px);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        `;
        document.head.appendChild(styleElement);
      }
    }
    
    // PDFファイル読み込み後のイベントフック
    function setupPdfLoadEvents() {
      // ファイル選択イベント（メイン）
      const fileInput = document.getElementById('file-input');
      if (fileInput) {
        fileInput.addEventListener('change', function() {
          // 読み込み完了後に実行するため遅延（長めに設定）
          setTimeout(initDragDrop, 1500);
        });
      }
      
      // ファイル追加イベント
      const addFileInput = document.getElementById('file-add-input');
      if (addFileInput) {
        addFileInput.addEventListener('change', function() {
          // 読み込み完了後に実行するため遅延（長めに設定）
          setTimeout(initDragDrop, 1500);
        });
      }
      
      // 全選択ボタンの追加（オプション）
      const controlsContainer = document.querySelector('.controls-container') || document.getElementById('controls');
      if (controlsContainer && !document.getElementById('select-all-btn')) {
        const selectAllBtn = document.createElement('button');
        selectAllBtn.id = 'select-all-btn';
        selectAllBtn.className = 'btn blue darken-4 waves-effect waves-light';
        selectAllBtn.innerHTML = '<i class="material-icons left">select_all</i> 全選択';
        selectAllBtn.addEventListener('click', toggleSelectAll);
        
        // 既存のボタンの近くに配置
        const removeCheckedBtn = document.getElementById('remove-checked-btn');
        if (removeCheckedBtn && removeCheckedBtn.parentNode) {
          removeCheckedBtn.parentNode.insertBefore(selectAllBtn, removeCheckedBtn);
        } else {
          controlsContainer.appendChild(selectAllBtn);
        }
      }
    }
    
    // 全選択/解除をトグルする関数
    let allSelected = false;
    function toggleSelectAll() {
      const checkboxes = document.querySelectorAll('.page-checkbox');
      allSelected = !allSelected;
      
      checkboxes.forEach(checkbox => {
        checkbox.checked = allSelected;
      });
      
      // トースト通知
      if (typeof M !== 'undefined' && M.toast) {
        M.toast({ html: allSelected ? '全ページを選択しました' : '選択を解除しました' });
      }
      
      // ボタンテキストの更新
      const selectAllBtn = document.getElementById('select-all-btn');
      if (selectAllBtn) {
        selectAllBtn.innerHTML = allSelected ? 
          '<i class="material-icons left">clear_all</i> 選択解除' : 
          '<i class="material-icons left">select_all</i> 全選択';
      }
    }
    
    // ドラッグドロップの設定が有効かどうかを確認する関数
    function checkDragDropEnabled() {
      const thumbnails = document.querySelectorAll('.thumbnail-wrapper[draggable="true"]');
      return thumbnails.length > 0;
    }
    
    // 定期的にドラッグドロップ設定を確認して再適用する
    function ensureDragDropWorking() {
      // PDFが読み込まれているが、ドラッグドロップが有効でない場合は初期化
      const previewArea = document.getElementById('pdf-preview-area');
      const hasThumbnails = previewArea && previewArea.querySelectorAll('.thumbnail-wrapper').length > 0;
      
      if (hasThumbnails && !checkDragDropEnabled()) {
        console.log('ドラッグドロップが無効になっています。再初期化します。');
        initDragDrop();
      }
    }
    
    // ページ読み込み完了時に実行
    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOMContentLoaded - ドラッグドロップ初期化開始');
      
      // PDFファイル読み込みイベントを設定
      setupPdfLoadEvents();
      
      // 既にPDFが表示されている場合は即実行
      setTimeout(initDragDrop, 800);
      
      // 定期的にドラッグドロップ設定を確認（5秒ごと）
      setInterval(ensureDragDropWorking, 5000);
    });
    
    // すでにDOMが読み込まれている場合は即実行
    if (document.readyState !== 'loading') {
      console.log('DOM already loaded - ドラッグドロップ即時初期化');
      setupPdfLoadEvents();
      setTimeout(initDragDrop, 800);
      
      // 定期的にドラッグドロップ設定を確認（5秒ごと）
      setInterval(ensureDragDropWorking, 5000);
    }
  })(); // ここでドラッグドロップの即時実行関数を終了

})(); // ここでメイン処理の即時実行関数を終了

// ユーティリティ関数や非同期PDFロード処理
async function loadAndPreviewPDF(files) {
  console.log('PDFファイルを読み込みます...');
  // ...元の処理...
  setTimeout(initDragDrop, 500); // 追加（500ms程度でOK）
}
