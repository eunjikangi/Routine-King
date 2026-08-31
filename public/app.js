const dialog = document.querySelector('#cycle-dialog');
const toast = document.querySelector('.toast');
document.querySelector('#add-cycle').addEventListener('click', () => dialog.showModal());
document.querySelector('.mobile-menu').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));

document.querySelectorAll('.suggestions button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelector('#cycle-name').value = `${button.textContent.trim()}를 관리해줘`;
  });
});

document.querySelectorAll('.complete').forEach(button => {
  button.addEventListener('click', () => {
    const card = button.closest('.cycle-card');
    button.textContent = '✓  오늘 완료했어요';
    button.disabled = true;
    card.style.opacity = '.65';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
  });
});

dialog.addEventListener('close', () => {
  if (dialog.returnValue === 'default' && document.querySelector('#cycle-name').value.trim()) {
    toast.textContent = '새 사이클을 만들었어요.';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
  }
});
