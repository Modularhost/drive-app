import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDuF7p0X6N8IE19Bqt78LQAp805tMl84Ds",
  authDomain: "modular-app-16bd6.firebaseapp.com",
  projectId: "modular-app-16bd6",
  storageBucket: "modular-app-16bd6.firebasestorage.app",
  messagingSenderId: "1006327040835",
  appId: "1:1006327040835:web:b8b4f510da46514a3d3df6",
  measurementId: "G-GVKBWL9GT9"
};

let app;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (error) {
  console.error('Error al inicializar Firebase:', error);
  throw error;
}

const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(error => {
  console.error('Error al configurar persistencia:', error);
});

const crearNotaBtn = document.getElementById('crear-nota-btn');
const notaModal = document.getElementById('nota-modal');
const notaModalTitle = document.getElementById('nota-modal-title');
const notaTituloInput = document.getElementById('nota-titulo');
const notaContenidoInput = document.getElementById('nota-contenido');
const saveNotaBtn = document.getElementById('save-nota-btn');
const cancelNotaBtn = document.getElementById('cancel-nota-btn');
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.querySelector('.success-message');
const notasList = document.getElementById('notas-list');

let currentNotaId = null;

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : timestamp instanceof Date ? timestamp : null;
  if (!date || isNaN(date)) return 'Sin fecha';
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function getUserFullName() {
  const user = auth.currentUser;
  if (!user) throw new Error('No se encontró el usuario autenticado');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
  return userSnap.data().fullName || 'Usuario Desconocido';
}

async function loadNotas() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const notasQuery = query(collection(db, 'notas')); 
    const notasSnapshot = await getDocs(notasQuery);
    notasList.innerHTML = '';
    notasSnapshot.forEach(doc => {
      const nota = doc.data();
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="nota-title">${nota.usuario || 'Sin título'}</span> <!-- Usar usuario en lugar de titulo -->
        <div class="nota-dates">
          <span>Creado: ${formatDate(nota.fechaCreacion)}</span>
          ${nota.fechaModificacion ? `<span>Modificado: ${formatDate(nota.fechaModificacion)}</span>` : ''}
        </div>
        <div class="nota-actions">
          <i class="fas fa-edit" data-id="${doc.id}" title="Editar"></i>
          <i class="fas fa-trash" data-id="${doc.id}" title="Eliminar"></i>
        </div>
      `;
      notasList.appendChild(li);

      li.querySelector('.nota-title').addEventListener('click', () => openEditModal(doc.id, nota));
      li.querySelector('.fa-edit').addEventListener('click', () => openEditModal(doc.id, nota));
      li.querySelector('.fa-trash').addEventListener('click', () => openDeleteModal(doc.id));
    });
    if (notasSnapshot.empty) {
      notasList.innerHTML = '<li>No hay notas disponibles.</li>';
    }
  } catch (error) {
    console.error('Error al cargar notas:', error);
    showSuccessModal(`Error al cargar notas: ${error.message}`, true);
  }
}

function showModal(modal) {
  if (!modal) return;
  modal.style.display = 'flex';
}

function hideModal(modal) {
  if (!modal) return;
  modal.style.display = 'none';
}

function showSuccessModal(message, isError = false) {
  if (!successModal || !successIcon || !successMessage) {
    console.warn('Elementos de éxito no encontrados');
    alert(message);
    return;
  }
  successIcon.className = `fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}`;
  successMessage.textContent = message;
  successModal.classList.remove('success', 'error');
  successModal.classList.add(isError ? 'error' : 'success');
  showModal(successModal);
  setTimeout(() => hideModal(successModal), 2000);
}

function openEditModal(id = null, nota = null) {
  showModal(notaModal);
  if (nota) {
    notaModalTitle.textContent = 'Editar Nota';
    notaTituloInput.value = nota.usuario || ''; 
    notaContenidoInput.value = nota.contenido || '';
    currentNotaId = id;
  } else {
    notaModalTitle.textContent = 'Crear Nueva Nota';
    notaTituloInput.value = '';
    notaContenidoInput.value = '';
    currentNotaId = null;
  }
}

function openDeleteModal(id) {
  currentNotaId = id;
  showModal(deleteModal);
}

async function logAction(notaId, action, data = {}) {
  try {
    const fullName = await getUserFullName();
    await addDoc(collection(db, `notas/${notaId}/logs`), {
      action,
      details: JSON.stringify(data),
      timestamp: serverTimestamp(),
      user: fullName,
      uid: auth.currentUser.uid
    });
  } catch (error) {
    console.error('Error al registrar log:', error);
  }
}

async function saveNota() {
  const titulo = notaTituloInput.value.trim();
  const contenido = notaContenidoInput.value.trim();

  if (!titulo || !contenido) {
    showSuccessModal('Por favor, complete todos los campos.', true);
    return;
  }

  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');
    const fullName = await getUserFullName();

    if (currentNotaId) {
      const notaRef = doc(db, 'notas', currentNotaId);
      const updatedData = {
        usuario: titulo, 
        contenido,
        fechaModificacion: serverTimestamp(),
        usuario: fullName
      };
      await updateDoc(notaRef, updatedData);
      await logAction(currentNotaId, 'modified', updatedData);
      showSuccessModal('Nota actualizada exitosamente.');
    } else {
      const newNota = {
        uid: user.uid,
        usuario: titulo, 
        contenido,
        fechaCreacion: serverTimestamp(),
        fechaModificacion: null,
        usuario: fullName
      };
      const notaRef = await addDoc(collection(db, 'notas'), newNota);
      await logAction(notaRef.id, 'created', newNota);
      showSuccessModal('Nota creada exitosamente.');
    }

    await loadNotas();
    hideModal(notaModal);
    notaTituloInput.value = '';
    notaContenidoInput.value = '';
    currentNotaId = null;
  } catch (error) {
    console.error('Error al guardar nota:', error);
    showSuccessModal(`Error al guardar nota: ${error.message}`, true);
  }
}

async function deleteNota() {
  try {
    if (!currentNotaId) throw new Error('ID de nota no válido');
    const notaRef = doc(db, 'notas', currentNotaId);
    await logAction(currentNotaId, 'deleted', { notaId: currentNotaId });
    await deleteDoc(notaRef);
    showSuccessModal('Nota eliminada exitosamente.');
    await loadNotas();
    hideModal(deleteModal);
    currentNotaId = null;
  } catch (error) {
    console.error('Error al eliminar nota:', error);
    showSuccessModal(`Error al eliminar nota: ${error.message}`, true);
  }
}

async function init() {
  const container = document.querySelector('.notas-container');
  if (!container) {
    console.error('Contenedor .notas-container no encontrado');
    return;
  }

  try {
    const user = await new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          unsubscribe();
          resolve(user);
        } else {
          setTimeout(() => {
            if (auth.currentUser) {
              unsubscribe();
              resolve(auth.currentUser);
            } else {
              unsubscribe();
              resolve(null);
            }
          }, 2000);
        }
      }, (error) => {
        console.error('Error en onAuthStateChanged:', error);
        unsubscribe();
        reject(error);
      });
    });

    if (!user) {
      console.error('No hay usuario autenticado');
      container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión nuevamente.</p>';
      setTimeout(() => {
        window.location.href = 'main.html?error=auth-required';
      }, 2000);
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      console.error('Documento de usuario no encontrado');
      container.innerHTML = '<p>Error: Tu cuenta no está registrada en la base de datos. Contacta al administrador.</p>';
      return;
    }

    const userData = userDoc.data();
    const hasAccess = userData.role === 'Administrador' ||
      (userData.permissions && userData.permissions.includes('Apuntes:Notas'));
    if (!hasAccess) {
      console.error('Acceso denegado');
      container.innerHTML = '<p>Acceso denegado. No tienes permisos para acceder a este módulo.</p>';
      return;
    }

    await loadNotas();

    crearNotaBtn.addEventListener('click', () => openEditModal());
    cancelNotaBtn.addEventListener('click', () => {
      hideModal(notaModal);
      notaTituloInput.value = '';
      notaContenidoInput.value = '';
      currentNotaId = null;
    });
    saveNotaBtn.addEventListener('click', saveNota);
    confirmDeleteBtn.addEventListener('click', deleteNota);
    cancelDeleteBtn.addEventListener('click', () => {
      hideModal(deleteModal);
      currentNotaId = null;
    });

    window.addEventListener('moduleCleanup', () => {
      hideModal(notaModal);
      hideModal(deleteModal);
      hideModal(successModal);
    });
  } catch (error) {
    console.error('Error al inicializar el módulo:', error);
    container.innerHTML = `<p>Error al inicializar el módulo: ${error.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();

}
