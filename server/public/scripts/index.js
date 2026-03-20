    function openModal(name) {
      document.getElementById(name + '-overlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeModal(name) {
      document.getElementById(name + '-overlay').classList.remove('open');
      document.body.style.overflow = '';
    }
    function handleOverlayClick(e, name) {
      if (e.target === document.getElementById(name + '-overlay')) closeModal(name);
    }
    function switchModal(from, to) {
      closeModal(from);
      setTimeout(() => openModal(to), 180);
    }
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeModal('login');
        closeModal('signup');
        document.body.style.overflow = '';
      }
  });

    const createAccSubmit = document.getElementById('create-account-submit');

    createAccSubmit.addEventListener('click', e=>{
        window.location.href = "home.html"});

    const loginAccSubmit = document.getElementById('login-account-submit');

    loginAccSubmit.addEventListener('click', e=>{
        window.location.href = "home.html"});