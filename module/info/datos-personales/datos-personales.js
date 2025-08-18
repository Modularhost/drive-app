import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';

const auth = getAuth();
const db = getFirestore();

const successModal = document.getElementById('success-modal');
const successMessage = successModal ? successModal.querySelector('.success-message') : null;
const successIcon = document.getElementById('success-icon');
const loadingModal = document.getElementById('loading-modal');
const closeModalButtons = document.querySelectorAll('.close-modal');

function showModal(type, message) {
  if (!successModal || !successIcon || !successMessage) {
    console.warn('Elementos de modal no encontrados');
    alert(message);
    return;
  }
  successModal.className = `modal ${type}`;
  successMessage.textContent = message;
  successIcon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
  successModal.style.display = 'flex';
  setTimeout(() => {
    successModal.style.display = 'none';
  }, 2000);
}

function toggleLoading(show) {
  if (loadingModal) {
    loadingModal.style.display = show ? 'flex' : 'none';
  }
}

function formatDateForDisplay(dateStr) {
  if (!dateStr) return 'Sin fecha';
  const date = new Date(dateStr);
  if (isNaN(date)) return 'Fecha inválida';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day}-${month}-${year}`;
}

function calculateAge(birthDateStr) {
  if (!birthDateStr) return 'Sin edad';
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate)) return 'Fecha inválida';
  const today = new Date('2025-07-04'); // Fecha actual proporcionada
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
    age--;
  }
  return `${age} años`;
}

function calculateDaysToBirthday(birthDateStr) {
  if (!birthDateStr) return 'Sin datos';
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate)) return 'Fecha inválida';
  const today = new Date('2025-07-04'); // Fecha actual proporcionada
  const currentYear = today.getUTCFullYear();
  let nextBirthday = new Date(currentYear, birthDate.getUTCMonth(), birthDate.getUTCDate());
  if (today > nextBirthday) {
    nextBirthday.setUTCFullYear(currentYear + 1);
  }
  const diffTime = nextBirthday - today;
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (totalDays === 0) return '¡Hoy es tu cumpleaños!';
  
  // Calcular meses y días
  let months = nextBirthday.getUTCMonth() - today.getUTCMonth();
  let days = nextBirthday.getUTCDate() - today.getUTCDate();
  if (days < 0) {
    months--;
    const tempDate = new Date(nextBirthday);
    tempDate.setUTCMonth(tempDate.getUTCMonth() - 1);
    days += new Date(tempDate.getUTCFullYear(), tempDate.getUTCMonth() + 1, 0).getUTCDate();
  }
  if (months < 0) {
    months += 12;
  }
  
  let result = '';
  if (months > 0) {
    result += `${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  if (days > 0) {
    result += `${months > 0 ? ' y ' : ''}${days} ${days === 1 ? 'día' : 'días'}`;
  }
  if (months === 0 && days === 0) {
    result = '¡Hoy es tu cumpleaños!';
  }
  result += ` (${totalDays} días en total)`;
  return result.trim();
}

function getZodiacSign(birthDateStr) {
  if (!birthDateStr) return 'Sin signo';
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate)) return 'Fecha inválida';
  const month = birthDate.getUTCMonth() + 1;
  const day = birthDate.getUTCDate();
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Tauro';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Géminis';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cáncer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Escorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagitario';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricornio';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Acuario';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Piscis';
  return 'Sin signo';
}

function getChineseZodiac(year) {
  if (!year || isNaN(year)) return 'Sin animal';
  const animals = ['Rata', 'Buey', 'Tigre', 'Conejo', 'Dragón', 'Serpiente', 'Caballo', 'Cabra', 'Mono', 'Gallo', 'Perro', 'Cerdo'];
  return animals[(year - 1924) % 12];
}

async function init() {
  const container = document.querySelector('.personal-data-container');
  if (!container) {
    console.error('Contenedor .personal-data-container no encontrado');
    return;
  }

  toggleLoading(true);

  try {
    const user = await new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, user => {
        unsubscribe();
        if (user) resolve(user);
        else reject(new Error('No hay usuario autenticado'));
      }, reject);
    });

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      showModal('error', 'No se encontró el documento del usuario.');
      container.innerHTML = '<p>Error: No se encontró el documento del usuario.</p>';
      toggleLoading(false);
      return;
    }

    const userData = userSnap.data();
    const birthDate = userData.birthDate;
    const birthYear = birthDate ? new Date(birthDate).getUTCFullYear() : null;

    document.getElementById('user-fullName').textContent = userData.fullName || 'Sin nombre';
    document.getElementById('user-rut').textContent = userData.rut || 'Sin RUT';
    document.getElementById('user-email').textContent = userData.email || 'Sin correo';
    document.getElementById('user-username').textContent = userData.username || 'Sin usuario';
    document.getElementById('user-gender').textContent = userData.gender || 'Sin género';
    document.getElementById('user-birthDate').textContent = formatDateForDisplay(birthDate);
    document.getElementById('user-age').textContent = calculateAge(birthDate);
    document.getElementById('user-daysToBirthday').textContent = calculateDaysToBirthday(birthDate);
    document.getElementById('user-zodiac').textContent = getZodiacSign(birthDate);
    document.getElementById('user-chineseZodiac').textContent = getChineseZodiac(birthYear);
    document.getElementById('user-role').textContent = userData.role || 'Sin rol';
    document.getElementById('user-icon').src = userData.gender === 'Hombre' ? 'img/icono-hombre.png' :
                                              userData.gender === 'Mujer' ? 'img/icono-mujer.png' :
                                              'img/icono-otro.png';

  } catch (error) {
    console.error('Error al cargar datos personales:', error);
    showModal('error', `Error al cargar datos: ${error.message}`);
    container.innerHTML = `<p>Error al cargar datos: ${error.message}</p>`;
  } finally {
    toggleLoading(false);
  }

  closeModalButtons.forEach(button => {
    button.addEventListener('click', () => {
      button.closest('.modal').style.display = 'none';
    });
  });

  window.addEventListener('moduleCleanup', () => {
    if (successModal) successModal.style.display = 'none';
    if (loadingModal) loadingModal.style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
}