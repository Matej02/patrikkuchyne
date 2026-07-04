(function () {
  'use strict';

  // ── Drag & drop upload with preview ────────────────────────────
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('photos');
  const preview = document.getElementById('dropzone-preview');

  if (dropzone && fileInput && preview) {
    ['dragenter', 'dragover'].forEach(evt => {
      dropzone.addEventListener(evt, e => {
        e.preventDefault();
        dropzone.classList.add('is-drag');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropzone.addEventListener(evt, e => {
        e.preventDefault();
        dropzone.classList.remove('is-drag');
      });
    });
    dropzone.addEventListener('drop', e => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        fileInput.files = dt.files;
        renderPreview(dt.files);
      }
    });
    fileInput.addEventListener('change', () => renderPreview(fileInput.files));

    function renderPreview(files) {
      preview.innerHTML = '';
      Array.from(files).slice(0, 30).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const url = URL.createObjectURL(file);
        const img = document.createElement('img');
        img.src = url;
        img.onload = () => URL.revokeObjectURL(url);
        preview.appendChild(img);
      });
    }
  }
})();

// ── Delete confirmation (photo cards) ───────────────────────────
function confirmDelete(id) {
  if (confirm('Opravdu smazat tuto fotku? Akce je nevratná.')) {
    document.getElementById('delete-' + id).submit();
  }
}
