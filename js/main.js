// js/main.js - 最小機能バージョン + 長押し選択機能

// グローバル変数
let pdfDocs = [];
let globalPdfIndex = 0;
let globalPageCount = 0;
let totalPages = 0;
let isSelectionMode = false; // 選択モードのフラグ
let longPressTimer; // 長押し検出用タイマー


// 初期状態
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM読み込み完了、初期化開始...');
  
  // ファイル入力設定
  setupFileInput();
  
  // 操作ボタン設定
  setupButtons();
  
  // Service Worker設定
  setupServiceWorker();
  
  // 選択モード終了のためのクリックイベント追加
  document.addEventListener('click', function(e) {
    if (isSelectionMode && 
        !e.target.closest('.thumbnail-wrapper') && 
        !e.target.closest('#selection-mode-indicator') &&
        !e.target.closest('.top-controls')) {
      deactivateSelectionMode();
    }
  });
  
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
    });
  }
  
  if (removeCheckedBtn) {
    removeCheckedBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const selectedItems = document.querySelectorAll('.thumbnail-wrapper.selected');
      if (selectedItems.length === 0) {
        return;
      }
      
      // 確認ダイアログなしで即時削除
      selectedItems.forEach(wrapper => wrapper.remove());
      
      // ページ番号の更新
      updatePageNumbers();
      
      // 選択カウンターの更新
      updateSelectionCounter();
      
      // 選択モードが有効で選択アイテムがなくなった場合は選択モードを終了
      if (isSelectionMode && document.querySelectorAll('.thumbnail-wrapper.selected').length === 0) {
        deactivateSelectionMode();
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
        
        // 長押し選択機能を追加
        setupLongPressSelection(thumbnail);
        
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
    }
  }
  
  // ページ番号の更新
  updatePageNumbers();
  
  // ドラッグ＆ドロップを有効化
  enableDragDrop();
  
  // ボタンを有効化
  enableControls();
	
}

// iPhoneの文字選択機能と競合しない長押し検出の実装
function setupLongPressSelection(element) {
  let touchStartTime = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  const LONG_PRESS_THRESHOLD = 500; // 長押し判定の閾値（ミリ秒）
  const MOVE_THRESHOLD = 10; // 移動判定の閾値（ピクセル）
  
  // タッチスタート
  element.addEventListener('touchstart', function(e) {
    // カードコンテンツ部分のタッチは無視
    if (e.target.closest('.card-content')) return;
    
    // 時間とタッチ位置を記録
    touchStartTime = Date.now();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    
    // 長押しタイマーをセット
    longPressTimer = setTimeout(() => {
      // 長押し判定
      const touchElement = document.elementFromPoint(touchStartX, touchStartY);
      if (touchElement && this.contains(touchElement)) {
        // 選択モードが未活性なら活性化
        if (!isSelectionMode) {
          activateSelectionMode();
        }
        
        // 振動フィードバック
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }
        
        // このアイテムを選択
        this.classList.add('selected');
        this.setAttribute('data-selected', 'true');
        updateSelectionCounter();
        
        // 長押しのビジュアルフィードバック
        this.classList.add('long-press');
        setTimeout(() => {
          this.classList.remove('long-press');
        }, 500);
      }
    }, LONG_PRESS_THRESHOLD);
  }, { passive: true });
  
  // タッチムーブ（スクロール検出）
  element.addEventListener('touchmove', function(e) {
    if (!longPressTimer) return;
    
    // 移動距離を計算
    const moveX = Math.abs(e.touches[0].clientX - touchStartX);
    const moveY = Math.abs(e.touches[0].clientY - touchStartY);
    
    // 閾値以上の移動があればキャンセル
    if (moveX > MOVE_THRESHOLD || moveY > MOVE_THRESHOLD) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }, { passive: true });
  
  // タッチエンド
  element.addEventListener('touchend', function(e) {
    // 長押しタイマーをクリア
    clearTimeout(longPressTimer);
    longPressTimer = null;
    
    // カードコンテンツ部分のタッチは無視
    if (e.target.closest('.card-content')) return;
    
    // 選択モード中のタップ
    if (isSelectionMode) {
      const touchDuration = Date.now() - touchStartTime;
      
      // 短いタップの場合のみ選択/解除を切り替え（長押しは除外）
      if (touchDuration < LONG_PRESS_THRESHOLD) {
        this.classList.toggle('selected');
        this.setAttribute('data-selected', this.classList.contains('selected') ? 'true' : 'false');
        updateSelectionCounter();
        e.preventDefault(); // デフォルトの動作を抑制
      }
    }
  });
  
  // タッチキャンセル
  element.addEventListener('touchcancel', function() {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  });
  
  // 標準の文字選択を無効化
  element.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
  });
  
  // コンテキストメニューを無効化
  element.addEventListener('contextmenu', function(e) {
    if (isSelectionMode) {
      e.preventDefault();
      return false;
    }
  });
}

// 選択モードの活性化
function activateSelectionMode() {
  isSelectionMode = true;
  document.body.classList.add('selection-mode');
  
  // 選択モードインジケーターの表示
  showSelectionModeIndicator();
  
  console.log('選択モード: ON');
}

// 選択モードの非活性化
function deactivateSelectionMode() {
  isSelectionMode = false;
  document.body.classList.remove('selection-mode');
  
  // 選択モードインジケーターの非表示
  hideSelectionModeIndicator();
  
  console.log('選択モード: OFF');
}

// 選択モードインジケーターの表示
function showSelectionModeIndicator() {
  // すでに存在する場合は何もしない
  if (document.getElementById('selection-mode-indicator')) return;
  
  // 選択モードのインジケーターを作成
  const indicator = document.createElement('div');
  indicator.id = 'selection-mode-indicator';
  indicator.className = 'selection-mode-indicator';
  
  // 選択カウンター
  const counter = document.createElement('span');
  counter.id = 'selection-counter';
  counter.textContent = '0 選択中';
  indicator.appendChild(counter);
  
  // 全選択ボタン
  const selectAllBtn = document.createElement('button');
  selectAllBtn.id = 'select-all';
  selectAllBtn.className = 'btn primary-bg white-text btn-small';
  selectAllBtn.textContent = '全選択';
  selectAllBtn.addEventListener('click', function() {
    document.querySelectorAll('.thumbnail-wrapper').forEach(item => {
      item.classList.add('selected');
      item.setAttribute('data-selected', 'true');
    });
    updateSelectionCounter();
  });
  indicator.appendChild(selectAllBtn);
  
  // 終了ボタン
  const exitBtn = document.createElement('button');
  exitBtn.id = 'exit-selection-mode';
  exitBtn.className = 'btn red darken-2 white-text btn-small';
  exitBtn.textContent = '選択終了';
  exitBtn.addEventListener('click', function() {
    // 選択モードを終了
    deactivateSelectionMode();
  });
  indicator.appendChild(exitBtn);
  
  // ボディに追加
  document.body.appendChild(indicator);
  
  // 初期選択数を表示
  updateSelectionCounter();
}

// 選択モードインジケーターの非表示
function hideSelectionModeIndicator() {
  const indicator = document.getElementById('selection-mode-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// 選択カウンターの更新
function updateSelectionCounter() {
  const selectedCount = document.querySelectorAll('.thumbnail-wrapper.selected').length;
  const counter = document.getElementById('selection-counter');
  
  if (counter) {
    counter.textContent = `${selectedCount} 選択中`;
  }
  
  console.log(`選択カウンター更新: ${selectedCount}件`);
}

// サムネイルクリックの処理
function handleThumbnailClick(e) {
  // カードコンテンツ部分のクリックは無視
  if (e.target.closest('.card-content')) {
    return;
  }
  
  // スマホの選択モード中は何もしない（タッチイベントで処理）
  if (isSelectionMode && ('ontouchstart' in window)) {
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
        // ドラッグできる要素を選択されたものだけに制限
        filter: '.thumbnail-wrapper:not(.selected)',
        preventOnFilter: true,
        
        // ドラッグ開始時
        onStart: function(evt) {
          // 選択されていない要素のドラッグを防止
          if (!evt.item.classList.contains('selected')) {
            evt.cancel();
            return;
          }
          
          // ドラッグ中は選択解除を防止
          evt.item.setAttribute('data-dragging', 'true');
          
          // 他の選択アイテムに視覚効果を適用
          document.querySelectorAll('.thumbnail-wrapper.selected').forEach(item => {
            if (item !== evt.item) {
              item.classList.add('drag-related');
            }
          });
        },
        
        // ドラッグ中
        onMove: function(evt) {
          // 選択されていない要素へのドラッグ中は視覚的にフィードバック
          if (!evt.dragged.classList.contains('selected')) {
            return false; // ドラッグをキャンセル
          }
          return true;
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

// PDFのマージとダウンロード
async function downloadMergedPdf() {
  try {
    const mergedPdf = await PDFLib.PDFDocument.create();
    const canvases = document.querySelectorAll('#pdf-preview-area canvas');
    
    if (canvases.length === 0) {
      alert('PDFファイルを開いてください');
      return;
    }
    
    // 常に全ページをダウンロード（選択されているかどうかに関わらず）
    const targetCanvases = canvases;
    
    let processedPages = 0;
    
    // プログレスバーの作成
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
    
    // PDFをBlobに変換
    const mergedBytes = await mergedPdf.save();
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });
    
    // プログレスバーを削除
    document.body.removeChild(progressContainer);
    
    // iOSかどうかを判定
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
      // iOSでは常に新しいタブでPDFを開く（共有メニューなし）
      openPDFInNewTab(blob);
    } else {
      // PCでの安全な方法（Data URLではなくBlobURLを使用）
      safeDownloadForPC(blob);
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

// PCでの安全なダウンロード処理（「安全でないダウンロード」警告を避ける）
function safeDownloadForPC(blob) {
  // Blob URLを使用
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'merged.pdf';
  
  // 「安全でないダウンロード」警告を回避するための属性設定
  // https以外のサイトでは機能しないことがあります
  link.setAttribute('target', '_self');
  link.setAttribute('rel', 'noopener noreferrer');
  
  // CORSヘッダーを回避するためにリンクを非表示にせず、クリックもしない
  link.style.position = 'fixed';
  link.style.opacity = '0';
  link.style.top = '10px';
  link.style.left = '10px';
  link.style.width = '1px';
  link.style.height = '1px';
  document.body.appendChild(link);
  
  // 一部のブラウザではユーザージェスチャーが必要なため直接クリックはしない
  // 代わりにユーザーに通知
  const notifyDiv = document.createElement('div');
  notifyDiv.style.position = 'fixed';
  notifyDiv.style.top = '50%';
  notifyDiv.style.left = '50%';
  notifyDiv.style.transform = 'translate(-50%, -50%)';
  notifyDiv.style.backgroundColor = 'rgba(33, 150, 243, 0.9)';
  notifyDiv.style.color = 'white';
  notifyDiv.style.padding = '15px 20px';
  notifyDiv.style.borderRadius = '10px';
  notifyDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
  notifyDiv.style.zIndex = '2000';
  notifyDiv.style.maxWidth = '80%';
  notifyDiv.style.textAlign = 'center';
  notifyDiv.innerHTML = 'PDFが準備できました！<br><span style="font-size:0.8em; opacity:0.8;">自動的にダウンロードが始まります...</span>';
  document.body.appendChild(notifyDiv);
  
  // 少し遅延してからダウンロードを開始
  setTimeout(() => {
    // ブラウザの挙動により自動クリックはブロックされる場合があるためシミュレーション
    link.dispatchEvent(new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    }));
    
    // 通知を消す
    setTimeout(() => {
      document.body.removeChild(notifyDiv);
    }, 2000);
    
    // クリーンアップ
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 3000);
  }, 500);
}

// PDFを新しいタブで開く
function openPDFInNewTab(blob) {
  // Blob URLを使用
  const url = URL.createObjectURL(blob);
  
  // タイトルにタイムスタンプを付けて、常に新しいタブで開くようにする
  const timestamp = new Date().getTime();
  const newWindow = window.open(url, `pdf_${timestamp}`);
  
  // 新しいタブがブロックされた場合のフォールバック
  if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
    // ポップアップがブロックされた可能性があるため、現在のウィンドウで開く
    window.location.href = url;
  }
  
  // URLを解放するタイミングを遅らせる
  // iOSではタブを開いた直後に解放すると表示されない場合がある
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 5000);  // 5秒後に解放
}

// PDFを新しいタブで開く
function openPDFInNewTab(blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  
  // 少し遅延してURLを解放
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}