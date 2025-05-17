// js/main.js - 最小機能バージョン

// グローバル変数
let pdfDocs = [];
let globalPdfIndex = 0;
let globalPageCount = 0;
let totalPages = 0;

// 初期状態
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM読み込み完了、初期化開始...');
  
  // ファイル入力設定
  setupFileInput();
  
  // 操作ボタン設定
  setupButtons();
  
  // Service Worker設定
  setupServiceWorker();
  
  console.log('初期化完了');
});

// ファイル入力の設定
function setupFileInput() {
  const fileInput = document.getElementById('file-input');
  const addFileInput = document.getElementById('file-add-input');
  
  if (fileInput) {
    fileInput.addEventListener('click', function() {
      this.value = '';
    });
    
    fileInput.addEventListener('change', async function(e) {
      const label = document.querySelector('label[for="file-input"]');
      if (label) label.classList.add('disabled');
      try {
        // メインのPDF読み込み処理
        resetState();
        await processPdfFiles(e.target.files);
      } finally {
        if (label) label.classList.remove('disabled');
      }
    });
  }
  
  if (addFileInput) {
    addFileInput.addEventListener('click', function() {
      this.value = '';
    });
    
    addFileInput.addEventListener('change', async function(e) {
      try {
        // 追加ファイル処理
        await processPdfFiles(e.target.files, true);
      } finally {
        this.value = '';
      }
    });
  }
}

// 状態のリセット
function resetState() {
  globalPageCount = 0;
  totalPages = 0;
  pdfDocs = [];
  globalPdfIndex = 0;
  
  // プレビュー領域をクリア
  const previewArea = document.getElementById('pdf-preview-area');
  if (previewArea) previewArea.innerHTML = '';
}

// ボタン類の設定
function setupButtons() {
  // 各ボタンを取得
  const rotateBtn = document.getElementById('rotate-btn');
  const alignVertBtn = document.getElementById('align-vert-btn');
  const alignHorzBtn = document.getElementById('align-horz-btn');
  const removeCheckedBtn = document.getElementById('remove-checked-btn');
  const downloadLink = document.getElementById('download-link');
  
  // 初期状態では無効化
  [rotateBtn, alignVertBtn, alignHorzBtn, removeCheckedBtn].forEach(btn => {
    if (btn) btn.disabled = true;
  });
  
  // 各ボタンにイベントリスナーを設定
  if (rotateBtn) {
    rotateBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // チェックボックスで選択されたページを回転
      const selectedItems = document.querySelectorAll('.thumbnail-wrapper.selected');
      if (selectedItems.length === 0) {
        if (typeof M !== 'undefined' && M.toast) {
          M.toast({ html: 'Please select pages to rotate' });
        }
        return;
      }
      
      selectedItems.forEach(wrapper => {
        const canvas = wrapper.querySelector('canvas');
        if (canvas) {
          let rotate = parseInt(canvas.getAttribute('data-rotate') || '0');
          rotate = (rotate + 90) % 360;
          canvas.setAttribute('data-rotate', rotate.toString());
          canvas.style.transform = `rotate(${rotate}deg)`;
        }
      });
      
      if (typeof M !== 'undefined' && M.toast) {
        M.toast({ html: `Rotated ${selectedItems.length} pages` });
      }
    });
  }
  
  if (alignVertBtn) {
    alignVertBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // 選択されたページのみ縦向きに揃える
      let targetItems = document.querySelectorAll('.thumbnail-wrapper.selected canvas');
      if (targetItems.length === 0) {
        // 選択がなければすべてのページを対象に
        targetItems = document.querySelectorAll('#pdf-preview-area canvas');
      }
      
      targetItems.forEach(canvas => {
        if (canvas.width > canvas.height) {
          canvas.setAttribute('data-rotate', '90');
          canvas.style.transform = 'rotate(90deg)';
        } else {
          canvas.setAttribute('data-rotate', '0');
          canvas.style.transform = 'rotate(0deg)';
        }
      });
      
      if (typeof M !== 'undefined' && M.toast) {
        M.toast({ html: `${targetItems.length} pages aligned vertically` });
      }
    });
  }
  
  if (alignHorzBtn) {
    alignHorzBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // 選択されたページのみ横向きに揃える
      let targetItems = document.querySelectorAll('.thumbnail-wrapper.selected canvas');
      if (targetItems.length === 0) {
        // 選択がなければすべてのページを対象に
        targetItems = document.querySelectorAll('#pdf-preview-area canvas');
      }
      
      targetItems.forEach(canvas => {
        if (canvas.height > canvas.width) {
          canvas.setAttribute('data-rotate', '90');
          canvas.style.transform = 'rotate(90deg)';
        } else {
          canvas.setAttribute('data-rotate', '0');
          canvas.style.transform = 'rotate(0deg)';
        }
      });
      
      if (typeof M !== 'undefined' && M.toast) {
        M.toast({ html: `${targetItems.length} pages aligned horizontally` });
      }
    });
  }
  
  if (removeCheckedBtn) {
    removeCheckedBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const selectedItems = document.querySelectorAll('.thumbnail-wrapper.selected');
      if (selectedItems.length === 0) {
        if (typeof M !== 'undefined' && M.toast) {
          M.toast({ html: 'Please select pages to delete' });
        }
        return;
      }
      
      // 確認ダイアログ（オプション）
      if (selectedItems.length > 1) {
        if (!confirm(`${selectedItems.length} ページを削除しますか？`)) {
          return;
        }
      }
      
      selectedItems.forEach(wrapper => wrapper.remove());
      
      // ページ番号の更新
      updatePageNumbers();
      
      // 選択カウンターの更新
      updateSelectionCounter();
      
      if (typeof M !== 'undefined' && M.toast) {
        M.toast({ html: `${selectedItems.length} pages deleted` });
      }
    });
  }
  
  if (downloadLink) {
    downloadLink.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (this.classList.contains('disabled')) return;
      
      // マージ処理を開始
      downloadMergedPdf();
    });
  }
}

// Service Workerの設定
function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => {
        reg.onupdatefound = () => {
          const newWorker = reg.installing;
          newWorker.onstatechange = () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              const msgBox = document.getElementById('update-message');
              if (msgBox) msgBox.style.display = 'block';
            }
          };
        };
      })
      .catch(err => console.error('Service Worker登録エラー:', err));
  }
}

// PDFファイルの処理
async function processPdfFiles(files, isAddition = false) {
  if (!files || files.length === 0) return;
  
  const previewArea = document.getElementById('pdf-preview-area');
  if (!previewArea) return;
  
  // ファイルの総ページ数を計算
  let addedPages = 0;
  for (const file of Array.from(files)) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      addedPages += pdf.numPages;
    } catch (error) {
      console.error(`ファイル計算エラー:`, error);
    }
  }
  
  // 総ページ数の更新
  totalPages += addedPages;
  console.log(`処理するページ数: ${addedPages}`);
  
  // 各ファイルを処理
  for (const file of Array.from(files)) {
    try {
      // PDFLib用のロード
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
      pdfDocs.push(pdfDoc);
      
      // PDF.js用のロード
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const loadedPdf = await loadingTask.promise;
      
      // 各ページを処理
      for (let pageNum = 1; pageNum <= loadedPdf.numPages; pageNum++) {
        // カウンターを増やす
        globalPageCount++;
        
        // ページのレンダリング
        const page = await loadedPdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.2 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // レンダリングを待つ
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;
        
        // データ属性を設定
        canvas.setAttribute('data-pdf-index', globalPdfIndex);
        canvas.setAttribute('data-page-index', pageNum - 1);
        canvas.setAttribute('data-rotate', '0');
        
        // サムネイル要素を作成
        const thumbnail = document.createElement('div');
        thumbnail.className = 'col s3 m3 l2 card thumbnail-wrapper';
        thumbnail.setAttribute('data-selected', 'false');
        
        // 画像部分
        const cardImage = document.createElement('div');
        cardImage.className = 'card-image';
        cardImage.appendChild(canvas);
        
        // ファイル名表示
        const fileNameDiv = document.createElement('div');
        fileNameDiv.className = 'file-name';
        fileNameDiv.textContent = `${file.name.substring(0, 15)}${file.name.length > 15 ? '...' : ''}`;
        fileNameDiv.style.fontSize = '10px';
        fileNameDiv.style.overflow = 'hidden';
        fileNameDiv.style.textOverflow = 'ellipsis';
        
        // ページ番号表示
        const pageNumberDiv = document.createElement('div');
        pageNumberDiv.className = 'page-number';
        pageNumberDiv.textContent = `${globalPageCount} / ${totalPages}`;
        
        // コンテンツ部分
        const cardContent = document.createElement('div');
        cardContent.className = 'card-content center-align';
        cardContent.appendChild(fileNameDiv);
        cardContent.appendChild(pageNumberDiv);
        
        // サムネイル要素を組み立て
        thumbnail.appendChild(cardImage);
        thumbnail.appendChild(cardContent);
        
        // サムネイル全体にクリックイベントを設定
        thumbnail.addEventListener('click', handleThumbnailClick);
        
        // キャンバス要素にも個別にクリックイベントを設定
        canvas.addEventListener('click', function(e) {
          e.stopPropagation(); // 親へのイベント伝播を停止
          // 親要素のクリックイベントを手動でトリガー
          // Ctrlキーなどの状態を保持するために新しいイベントを作成
          const newEvent = new MouseEvent('click', {
            bubbles: false,
            cancelable: true,
            view: window,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey
          });
          thumbnail.dispatchEvent(newEvent);
        });
        
        // DOMに追加
        previewArea.appendChild(thumbnail);
      }
      
      // インデックスを増やす
      globalPdfIndex++;
      
    } catch (error) {
      console.error(`ファイル処理エラー:`, error);
      if (typeof M !== 'undefined' && M.toast) {
        M.toast({ html: `Error processing file: ${file.name}` });
      }
    }
  }
  
  // ページ番号の更新
  updatePageNumbers();
  
  // ドラッグ＆ドロップを有効化
  enableDragDrop();
  
  // ボタンを有効化
  enableControls();
  
  // 完了メッセージ
  if (isAddition) {
    if (typeof M !== 'undefined' && M.toast) {
      M.toast({ html: `${files.length} file(s) added` });
    }
  }
}

// サムネイルクリックの処理
function handleThumbnailClick(e) {
  // カードコンテンツ部分のクリックは無視
  if (e.target.closest('.card-content')) {
    return;
  }
  
  // Ctrlキーチェック
  const isMultiSelect = e.ctrlKey || e.metaKey;
  console.log(`クリックイベント - 複数選択モード: ${isMultiSelect}`);
  
  // 現在の選択状態
  const isSelected = this.classList.contains('selected');
  
  // 複数選択モードでない場合は他の選択をクリア
  if (!isMultiSelect) {
    document.querySelectorAll('.thumbnail-wrapper.selected').forEach(item => {
      if (item !== this) {
        item.classList.remove('selected');
        item.setAttribute('data-selected', 'false');
      }
    });
  }
  
  // このアイテムの選択状態を切り替え
  if (isSelected) {
    this.classList.remove('selected');
    this.setAttribute('data-selected', 'false');
    console.log('選択解除');
  } else {
    this.classList.add('selected');
    this.setAttribute('data-selected', 'true');
    console.log('選択');
  }
  
  // 選択要素数を表示
  const selectedCount = document.querySelectorAll('.thumbnail-wrapper.selected').length;
  console.log(`現在の選択数: ${selectedCount}`);
  
  // イベント伝播を止める
  e.stopPropagation();
}

// ページ番号の更新
function updatePageNumbers() {
  const thumbnails = document.querySelectorAll('.thumbnail-wrapper');
  const count = thumbnails.length;
  
  let num = 1;
  thumbnails.forEach(wrapper => {
    const pageNumberDiv = wrapper.querySelector('.page-number');
    if (pageNumberDiv) {
      pageNumberDiv.textContent = `${num} / ${count}`;
      num++;
    }
  });
  
  // グローバル変数の更新
  totalPages = count;
  globalPageCount = count;
}

// ドラッグ＆ドロップの有効化
function enableDragDrop() {
  const previewArea = document.getElementById('pdf-preview-area');
  if (!previewArea) return;
  
  // 既存のインスタンスを破棄
  if (previewArea.sortable) {
    try {
      previewArea.sortable.destroy();
    } catch (e) {
      console.error('Sortable破棄エラー:', e);
    }
  }
  
  // 新しいインスタンスを作成
  if (typeof Sortable !== 'undefined') {
    try {
      previewArea.sortable = Sortable.create(previewArea, {
        animation: 150,
        draggable: '.thumbnail-wrapper',
        handle: '.card-image',
        // ドラッグ開始時
        onStart: function(evt) {
          // ドラッグ中は選択解除を防止（ドラッグ操作が選択操作と競合するため）
          evt.item.setAttribute('data-dragging', 'true');
          
          // チェックボックスが選択されているアイテムだけに視覚効果を適用
          if (evt.item.classList.contains('selected')) {
            const selectedItems = document.querySelectorAll('.thumbnail-wrapper.selected');
            selectedItems.forEach(item => {
              if (item !== evt.item) {
                item.classList.add('drag-related');
              }
            });
          }
        },
        // ドラッグ終了時
        onEnd: function(evt) {
          // フラグを解除
          evt.item.removeAttribute('data-dragging');
          
          // 視覚効果をクリア
          document.querySelectorAll('.drag-related').forEach(item => {
            item.classList.remove('drag-related');
          });
          
          // 複数選択アイテムの並べ替え処理
          if (evt.item.classList.contains('selected')) {
            const selectedItems = Array.from(document.querySelectorAll('.thumbnail-wrapper.selected'));
            
            // 複数選択されている場合のみ処理
            if (selectedItems.length > 1) {
              console.log(`複数選択アイテム (${selectedItems.length}件) の並べ替え処理`);
              
              // ドラッグしたアイテム以外の選択アイテム
              const otherSelectedItems = selectedItems.filter(item => item !== evt.item);
              
              // 挿入位置の計算
              const newIndex = Array.from(previewArea.children).indexOf(evt.item);
              let insertPos = newIndex + 1; // ドラッグしたアイテムの次から挿入開始
              
              // 元の相対順序を保持するためにソート
              const oldOrder = Array.from(previewArea.children);
              otherSelectedItems.sort((a, b) => {
                return oldOrder.indexOf(a) - oldOrder.indexOf(b);
              });
              
              // アイテムを移動
              otherSelectedItems.forEach(item => {
                const currentIndex = Array.from(previewArea.children).indexOf(item);
                
                // 現在位置が挿入位置より前の場合、挿入位置を調整
                if (currentIndex < insertPos) {
                  insertPos--;
                }
                
                // 現在の位置から削除
                item.parentNode.removeChild(item);
                
                // 新しい位置に挿入
                if (insertPos >= previewArea.children.length) {
                  previewArea.appendChild(item);
                } else {
                  previewArea.insertBefore(item, previewArea.children[insertPos]);
                }
                
                // 挿入位置を更新
                insertPos++;
              });
              
              console.log('複数選択アイテムの並べ替えが完了しました');
            }
          }
          
          // ページ番号を更新
          updatePageNumbers();
          
          if (typeof M !== 'undefined' && M.toast) {
            M.toast({ html: 'Order updated' });
          }
        }
      });
      
      console.log('Sortable初期化完了');
    } catch (e) {
      console.error('Sortable初期化エラー:', e);
    }
  } else {
    console.warn('Sortableライブラリが見つかりません');
  }
}

// コントロール類の有効化
function enableControls() {
  const rotateBtn = document.getElementById('rotate-btn');
  const alignVertBtn = document.getElementById('align-vert-btn');
  const alignHorzBtn = document.getElementById('align-horz-btn');
  const removeCheckedBtn = document.getElementById('remove-checked-btn');
  const downloadLink = document.getElementById('download-link');
  
  [rotateBtn, alignVertBtn, alignHorzBtn, removeCheckedBtn].forEach(btn => {
    if (btn) btn.disabled = false;
  });
  
  if (downloadLink) downloadLink.classList.remove('disabled');
}

// 選択ページの回転
function rotateSelectedPages(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  const selectedItems = document.querySelectorAll('.thumbnail-wrapper.selected');
  if (selectedItems.length === 0) {
    if (typeof M !== 'undefined' && M.toast) {
      M.toast({ html: 'Please select pages to rotate' });
    }
    return;
  }
  
  selectedItems.forEach(wrapper => {
    const canvas = wrapper.querySelector('canvas');
    if (canvas) {
      let rotate = parseInt(canvas.getAttribute('data-rotate') || '0');
      rotate = (rotate + 90) % 360;
      canvas.setAttribute('data-rotate', rotate.toString());
      canvas.style.transform = `rotate(${rotate}deg)`;
    }
  });
  
  if (typeof M !== 'undefined' && M.toast) {
    M.toast({ html: `Rotated ${selectedItems.length} pages` });
  }
}

// 全ページを縦向きに
function alignPagesVertical(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  document.querySelectorAll('#pdf-preview-area canvas').forEach(canvas => {
    if (canvas.width > canvas.height) {
      canvas.setAttribute('data-rotate', '90');
      canvas.style.transform = 'rotate(90deg)';
    } else {
      canvas.setAttribute('data-rotate', '0');
      canvas.style.transform = 'rotate(0deg)';
    }
  });
  
  if (typeof M !== 'undefined' && M.toast) {
    M.toast({ html: 'All pages aligned vertically' });
  }
}

// 全ページを横向きに
function alignPagesHorizontal(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  document.querySelectorAll('#pdf-preview-area canvas').forEach(canvas => {
    if (canvas.height > canvas.width) {
      canvas.setAttribute('data-rotate', '90');
      canvas.style.transform = 'rotate(90deg)';
    } else {
      canvas.setAttribute('data-rotate', '0');
      canvas.style.transform = 'rotate(0deg)';
    }
  });
  
  if (typeof M !== 'undefined' && M.toast) {
    M.toast({ html: 'All pages aligned horizontally' });
  }
}

// 選択ページの削除
function deleteSelectedPages(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  const selectedItems = document.querySelectorAll('.thumbnail-wrapper.selected');
  if (selectedItems.length === 0) {
    if (typeof M !== 'undefined' && M.toast) {
      M.toast({ html: 'Please select pages to delete' });
    }
    return;
  }
  
  selectedItems.forEach(wrapper => wrapper.remove());
  
  // ページ番号の更新
  updatePageNumbers();
  
  if (typeof M !== 'undefined' && M.toast) {
    M.toast({ html: `${selectedItems.length} pages deleted` });
  }
}

// PDFのマージとダウンロード
async function downloadMergedPdf() {
  try {
    const mergedPdf = await PDFLib.PDFDocument.create();
    const canvases = document.querySelectorAll('#pdf-preview-area canvas');
    
    if (canvases.length === 0) {
      alert('PDFファイルを開いてください');
      return;
    }
    
    // 選択されたページのみを対象にするオプション
    const selectedItems = document.querySelectorAll('.thumbnail-wrapper.selected');
    let targetCanvases = canvases;
    
    // 選択があれば選択されたページのみを対象に
    if (selectedItems.length > 0) {
      targetCanvases = Array.from(selectedItems).map(item => item.querySelector('canvas')).filter(canvas => canvas);
      
      // ユーザーに確認（オプション）
      if (targetCanvases.length !== canvases.length) {
        if (confirm(`選択された ${targetCanvases.length} ページのみをダウンロードしますか？\n「キャンセル」を押すと全 ${canvases.length} ページがダウンロードされます。`)) {
          console.log(`選択された ${targetCanvases.length} ページのみをダウンロード`);
        } else {
          targetCanvases = canvases;
          console.log(`全 ${canvases.length} ページをダウンロード`);
        }
      }
    }
    
    let processedPages = 0;
    
    // プログレスバーの作成（オプション）
    const progressContainer = document.createElement('div');
    progressContainer.style.position = 'fixed';
    progressContainer.style.top = '50%';
    progressContainer.style.left = '50%';
    progressContainer.style.transform = 'translate(-50%, -50%)';
    progressContainer.style.backgroundColor = 'white';
    progressContainer.style.padding = '20px';
    progressContainer.style.borderRadius = '10px';
    progressContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
    progressContainer.style.zIndex = '1000';
    progressContainer.style.textAlign = 'center';
    
    const progressText = document.createElement('div');
    progressText.textContent = 'PDF生成中...';
    progressContainer.appendChild(progressText);
    
    const progressBar = document.createElement('div');
    progressBar.style.width = '300px';
    progressBar.style.height = '10px';
    progressBar.style.backgroundColor = '#eee';
    progressBar.style.borderRadius = '5px';
    progressBar.style.marginTop = '10px';
    progressContainer.appendChild(progressBar);
    
    const progressFill = document.createElement('div');
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.backgroundColor = '#2196F3';
    progressFill.style.borderRadius = '5px';
    progressFill.style.transition = 'width 0.2s';
    progressBar.appendChild(progressFill);
    
    document.body.appendChild(progressContainer);
    
    // 各ページを処理
    for (let i = 0; i < targetCanvases.length; i++) {
      const canvas = targetCanvases[i];
      
      // プログレスバーの更新
      progressFill.style.width = `${Math.round((i / targetCanvases.length) * 100)}%`;
      progressText.textContent = `PDF生成中... ${i + 1}/${targetCanvases.length}`;
      
      try {
        const pdfIndex = parseInt(canvas.getAttribute('data-pdf-index'));
        const pageIndex = parseInt(canvas.getAttribute('data-page-index'));
        
        if (isNaN(pdfIndex) || isNaN(pageIndex)) continue;
        if (pdfIndex < 0 || pdfIndex >= pdfDocs.length) continue;
        
        const pdfDoc = pdfDocs[pdfIndex];
        if (!pdfDoc) continue;
        
        const pages = pdfDoc.getPages();
        if (pageIndex < 0 || pageIndex >= pages.length) continue;
        
        const origPage = pages[pageIndex];
        const [copiedPage] = await mergedPdf.copyPages(pdfDoc, [pageIndex]);
        
        const origAngle = origPage.getRotation().angle;
        const previewAngle = parseInt(canvas.getAttribute('data-rotate') || '0');
        const totalAngle = (origAngle + previewAngle) % 360;
        
        copiedPage.setRotation(PDFLib.degrees(totalAngle));
        mergedPdf.addPage(copiedPage);
        processedPages++;
      } catch (error) {
        console.error('ページ処理エラー:', error);
      }
    }
    
    // プログレスバーの更新
    progressFill.style.width = '100%';
    progressText.textContent = 'ダウンロードの準備中...';
    
    if (processedPages === 0) {
      document.body.removeChild(progressContainer);
      alert('処理できるページがありません');
      return;
    }
    
    const mergedBytes = await mergedPdf.save();
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // プログレスバーを削除
    document.body.removeChild(progressContainer);
    
    if (typeof M !== 'undefined' && M.toast) {
      M.toast({ html: `Downloaded ${processedPages} pages` });
    } else {
      alert('ダウンロード完了');
    }
  } catch (error) {
    console.error('マージ処理エラー:', error);
    
    // エラー時にプログレスバーを削除
    const progressContainer = document.querySelector('div[style*="position: fixed"][style*="top: 50%"]');
    if (progressContainer) {
      document.body.removeChild(progressContainer);
    }
    
    alert('エラーが発生しました。コンソールをご確認ください。');
  }
}