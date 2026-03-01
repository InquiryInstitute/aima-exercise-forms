(function () {
  const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;
  const exercises = window.__EXERCISES__ || [];
  const listEl = document.getElementById('exercise-list');
  const placeholder = document.getElementById('placeholder');
  const form = document.getElementById('form');
  const questionTitle = document.getElementById('question-title');
  const questionBody = document.getElementById('question-body');
  const answerText = document.getElementById('answer-text');
  const saveBtn = document.getElementById('save-btn');

  if (!listEl || !placeholder || !form || !questionTitle || !questionBody || !answerText || !saveBtn) return;

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function simpleMarkdownToHtml(md) {
    if (!md) return '';
    let s = escapeHtml(md);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  let currentPath = null;

  exercises.forEach(function (ex) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = ex.title || ex.relativePath;
    a.dataset.path = ex.path;
    a.dataset.index = String(exercises.indexOf(ex));
    a.addEventListener('click', function (e) {
      e.preventDefault();
      const idx = parseInt(a.dataset.index, 10);
      const ex = exercises[idx];
      if (!ex) return;
      currentPath = ex.path;
      placeholder.style.display = 'none';
      form.style.display = 'block';
      questionTitle.textContent = ex.title || ex.relativePath;
      questionBody.innerHTML = ex.questionText
        ? simpleMarkdownToHtml(ex.questionText)
        : '<p class="muted">No question in file.</p>';
      answerText.value = ex.answerText || '';
      answerText.focus();
    });
    li.appendChild(a);
    listEl.appendChild(li);
  });

  if (!exercises.length) {
    listEl.innerHTML = '<li class="muted">No exercise files found. Add files under exercises/ with <!-- question --> and <!-- answer --> blocks.</li>';
  }

  function sendSave() {
    if (!currentPath || !vscode) return;
    vscode.postMessage({
      type: 'save',
      path: currentPath,
      answerText: answerText.value,
    });
  }

  saveBtn.addEventListener('click', sendSave);
  answerText.addEventListener('blur', function () {
    if (currentPath && answerText.value) sendSave();
  });
})();
