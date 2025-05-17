// js/main.js - 完全書き換え版
// main.js の冒頭などで要素を取得
const fileInput = document.getElementById('file-input');
const openPdfLabel = document.querySelector('label[for="file-input"]');

// グローバル関数としてページ番号更新関数を定義
window.updatePageNumbers = function() {
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
  if (typeof totalPages !== 'undefined') totalPages = visibleCount;
  if (typeof globalPageCount !== 'undefined') globalPageCount = visibleCount;
};

// 同じファイル選択でも必ず change を発火させる
fileInput.addEventListener('click', () => {
  fileInput.value = null;
});

// 既存の change リスナーをラップして無効化／有効化を実装
fileInput.addEventListener('change', async (e) => {
  openPdfLabel.classList.add('disabled');

  try {
    await loadAndPreviewPDF(e.target.files);
  } finally {
    openPdfLabel.classList.remove('disabled');
  }
});

// メイン処理
(() => {
  // PDF-LIBから必要な要素を取得
  const { PDFDocument, degrees } = PDFLib;

  // DOM要素取得
  const fileInput = document.getElementById('file-input');
  const addFileInput = document.getElementById('file-add-input');
  const rotateBtn = document.getElementById('rotate-btn');
  const alignVertBtn = document.getElementById('align-vert-btn');
  const alignHorzBtn = document.getElementById('align-horz-btn');
  const downloadLink = document.getElementById('download-link');
  const removeCheckedBtn = document.getElementById('remove-checked-btn');
  
  let pdfDocs = [];
  let globalPdfIndex = 0;
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
        // 重要: サムネイルのクリックイベントを完全に無効化
        wrapper.onclick = (e) => {
          // チェックボックス・ラベル以外のクリックはすべて無視
          if (!e.target.classList.contains('page-checkbox') && 
              !e.target.closest('.checkbox-label')) {
            e.stopPropagation();
            e.preventDefault();
            return false;
          }
        };
    
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'filled-in page-checkbox';
        // チェックボックスのchangeイベントを設定
        checkbox.onchange = function() {
          if (this.checked) {
            wrapper.classList.add('selected');
          } else {
            wrapper.classList.remove('selected');
          }
        };
        
        const span = document.createElement('span');
        label.append(checkbox, span);
    
        const cardImage = document.createElement('div');
        cardImage.className = 'card-image';
        // card-imageのクリックイベントも無効化
        cardImage.onclick = (e) => {
          if (!e.target.classList.contains('page-checkbox') && 
              !e.target.closest('.checkbox-label')) {
            e.stopPropagation();
            e.preventDefault();
            return false;
          }
        };
        cardImage.append(label, canvas);

        // ファイル名を表示
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
    
    // Sortableを初期化
    initSortable();
  });

  // 個別回転（チェックしたサムネイルだけ90度ずつ回転）
  rotateBtn.addEventListener("click", () => {
    document.querySelectorAll(".thumbnail-wrapper").forEach(wrapper => {
      const checkbox = wrapper.querySelector(".page-checkbox");
      const canvas = wrapper.querySelector("canvas");

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
  
  // 削除ボタンのイベントリスナー
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
    
    // 削除完了のメッセージを表示
    if (typeof M !== 'undefined' && M.toast) {
      M.toast({ html: 'page deleted' });
    } else {
      console.log('page deleted');
    }
  });
  
  // 元のファイル追加コード（addFileInput）
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
        // 重要: サムネイルのクリックイベントを無効化
        wrapper.onclick = (e) => {
          if (!e.target.classList.contains('page-checkbox') && 
              !e.target.closest('.checkbox-label')) {
            e.stopPropagation();
            e.preventDefault();
            return false;
          }
        };
    
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'filled-in page-checkbox';
        // チェックボックスのchangeイベントを設定
        checkbox.onchange = function() {
          if (this.checked) {
            wrapper.classList.add('selected');
          } else {
            wrapper.classList.remove('selected');
          }
        };
        
        const span = document.createElement('span');
        label.append(checkbox, span);
    
        const cardImage = document.createElement('div');
        cardImage.className = 'card-image';
        // card-imageのクリックイベントも無効化
        cardImage.onclick = (e) => {
          if (!e.target.classList.contains('page-checkbox') && 
              !e.target.closest('.checkbox-label')) {
            e.stopPropagation();
            e.preventDefault();
            return false;
          }
        };
        cardImage.append(label, canvas);
    
        const pageNumberDiv = document.createElement('div');
        pageNumberDiv.className = 'page-number';
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
    
    // ファイル追加後もSortableを再初期化
    initSortable();
  });

  // PDFダウンロード処理
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
})(); // ここでメイン処理の即時実行関数を終了

// ===== Service Workerの更新チェックと通知 =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => {
      reg.onupdatefound = () => {
        const newWorker = reg.installing;
        newWorker.onstatechange = () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateMessage(); // ← 通知表示の関数
          }
        };
      };
    });
}

// 更新通知を表示する関数
function showUpdateMessage() {
  const msgBox = document.getElementById('update-message');
  if (msgBox) msgBox.style.display = 'block';
}

// 非同期PDFロード処理
async function loadAndPreviewPDF(files) {
  console.log('PDFファイルを読み込みます...');
  // ファイル読み込み完了後にSortableを初期化
  setTimeout(initSortable, 1000);
}

// ファイル読み込み完了後、PDFサムネイルが表示されたらSortableを初期化
function initSortable() {
  const previewArea = document.getElementById('pdf-preview-area');
  if (!previewArea) return;
  
  console.log('Sortable動的初期化を実行');
  
  // 既存のSortableインスタンスを破棄（もし存在すれば）
  if (previewArea.sortableInstance) {
    try {
      previewArea.sortableInstance.destroy();
    } catch (e) {
      console.warn("既存のSortableインスタンス破棄中にエラー:", e);
    }
  }
  
  // 最初に全てのサムネイル要素にイベント処理を追加する
  // これにより、Sortableライブラリによる選択が起きないようになる
  document.querySelectorAll('.thumbnail-wrapper').forEach(wrapper => {
    // すべてのクリックイベントリスナーをクリア
    const newWrapper = wrapper.cloneNode(true);
    wrapper.parentNode.replaceChild(newWrapper, wrapper);
    
    // 新しいwrapperにイベント設定
    newWrapper.addEventListener('click', function(e) {
      // チェックボックス・ラベル以外のクリックはすべて無視
      if (!e.target.classList.contains('page-checkbox') && 
          !e.target.closest('.checkbox-label')) {
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
    }, true);
    
    // 新しいチェックボックス要素にイベント設定
    const checkbox = newWrapper.querySelector('.page-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', function() {
        // チェック状態に応じてselectedクラスを切り替え
        if (this.checked) {
          newWrapper.classList.add('selected');
        } else {
          newWrapper.classList.remove('selected');
        }
      });
      
      checkbox.addEventListener('click', function(e) {
        // クリックイベントの伝播を防止
        e.stopPropagation();
      }, true);
    }
  });
  
  // 新しいSortableインスタンスを作成
  previewArea.sortableInstance = Sortable.create(previewArea, {
    animation: 150,
    draggable: '.thumbnail-wrapper',
    handle: '.card-image', // ドラッグハンドルを指定
    delayOnTouchOnly: true, // モバイルでの長押しでドラッグ開始
    delay: 300, // 長押し時間（ミリ秒）
    // 重要: MultiDragは完全に無効化
    multiDrag: false,
    // イベントフィルタ（チェックボックス周辺は無視）
    filter: '.page-checkbox, .checkbox-label, span',
    preventOnFilter: false,
    onEnd: function() {
      // ドラッグ終了時にページ番号を更新
      window.updatePageNumbers();
      if (typeof M !== 'undefined') {
        M.toast({ html: 'Sıralama güncellendi' });
      }
    }
  });
  
  // デフォルトの選択クラスを無効化
  document.querySelectorAll('.selected').forEach(el => {
    if (!el.querySelector('.page-checkbox:checked')) {
      el.classList.remove('selected');
    }
  });
  
  // さらにクリック無効化のイベントリスナーを追加
  // これはページロード後に複数回呼ばれる可能性があるため注意
  disableCanvasClicks();
  
  console.log('Sortable初期化完了');
}

// canvasのクリックイベントを無効化する関数
function disableCanvasClicks() {
  // canvas要素のクリックを完全に無効化
  document.querySelectorAll('#pdf-preview-area canvas').forEach(canvas => {
    // 既存のイベントリスナーを削除（クローン置換）
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);
    
    // キャプチャフェーズでクリックを無効化
    newCanvas.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      return false;
    }, true);
    
    // バブリングフェーズでも無効化
    newCanvas.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      return false;
    }, false);
  });
  
  // card-image要素にも同様の処理
  document.querySelectorAll('.card-image').forEach(cardImage => {
    cardImage.addEventListener('click', function(e) {
      // チェックボックス以外のクリックはすべて無効化
      if (!e.target.classList.contains('page-checkbox') && 
          !e.target.closest('.checkbox-label')) {
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
    }, true);
  });
}

// ページロード後に更新検知を追加
document.addEventListener('DOMContentLoaded', () => {
  // Service Worker 更新検知
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(reg => {
        reg.onupdatefound = () => {
          const newWorker = reg.installing;
          newWorker.onstatechange = () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showPwaUpdateBanner();
            }
          };
        };
      });
  }

  function showPwaUpdateBanner() {
    const banner = document.createElement('div');
    banner.id = 'pwa-update';
    banner.innerHTML = `
      <div style="
        position:fixed; bottom:0; left:0; right:0;
        background:#333; color:#fff; text-align:center;
        padding:12px; font-size:16px;
      ">
        新しいバージョンがあります。アプリを一度閉じて再度起動してください。
      </div>`;
    document.body.appendChild(banner);
  }
  
  // クリック無効化を初期状態でも適用
  disableCanvasClicks();
});