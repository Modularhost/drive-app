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

const crearBlocBtn = document.getElementById('crear-bloc-btn');
const blocModal = document.getElementById('bloc-modal');
const blocModalTitle = document.getElementById('bloc-modal-title');
const blocTituloInput = document.getElementById('bloc-titulo');
const blocContenidoInput = document.getElementById('bloc-contenido');
const saveBlocBtn = document.getElementById('save-bloc-btn');
const cancelBlocBtn = document.getElementById('cancel-bloc-btn');
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.querySelector('.success-message');
const blocList = document.getElementById('bloc-list');

let currentBlocId = null;

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

async function loadBlocs() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');

    const blocsQuery = query(collection(db, 'blocs')); // Eliminado filtro uid
    const blocsSnapshot = await getDocs(blocsQuery);
    console.log(`Blocs encontrados: ${blocsSnapshot.size}`);
    blocList.innerHTML = '';
    blocsSnapshot.forEach(doc => {
      console.log(`Documento bloc ${doc.id}:`, doc.data());
      const bloc = doc.data();
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="bloc-title">${bloc.usuario || 'Sin título'}</span> <!-- Usar usuario en lugar de titulo -->
        <div class="bloc-dates">
          <span>Creado: ${formatDate(bloc.fechaCreacion)}</span>
          ${bloc.fechaModificacion ? `<span>Modificado: ${formatDate(bloc.fechaModificacion)}</span>` : ''}
        </div>
        <div class="bloc-actions">
          <i class="fas fa-edit" data-id="${doc.id}" title="Editar"></i>
          <i class="fas fa-trash" data-id="${doc.id}" title="Eliminar"></i>
        </div>
      `;
      blocList.appendChild(li);

      li.querySelector('.bloc-title').addEventListener('click', () => openEditModal(doc.id, bloc));
      li.querySelector('.fa-edit').addEventListener('click', () => openEditModal(doc.id, bloc));
      li.querySelector('.fa-trash').addEventListener('click', () => openDeleteModal(doc.id));
    });
    if (blocsSnapshot.empty) {
      console.log('No se encontraron blocs');
      blocList.innerHTML = '<li>No hay blocs disponibles.</li>';
    }
  } catch (error) {
    console.error('Error al cargar blocs:', error);
    showSuccessModal(`Error al cargar blocs: ${error.message}`, true);
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

function openEditModal(id = null, bloc = null) {
  showModal(blocModal);
  if (bloc) {
    blocModalTitle.textContent = 'Editar Entrada';
    blocTituloInput.value = bloc.usuario || ''; // Usar usuario en lugar de titulo
    blocContenidoInput.value = bloc.contenido || '';
    currentBlocId = id;
  } else {
    blocModalTitle.textContent = 'Crear Nueva Entrada';
    blocTituloInput.value = '';
    blocContenidoInput.value = '';
    currentBlocId = null;
  }
}

function openDeleteModal(id) {
  currentBlocId = id;
  showModal(deleteModal);
}

async function logAction(blocId, action, data = {}) {
  try {
    const fullName = await getUserFullName();
    await addDoc(collection(db, `blocs/${blocId}/logs`), {
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

async function saveBloc() {
  const titulo = blocTituloInput.value.trim();
  const contenido = blocContenidoInput.value.trim();

  if (!titulo || !contenido) {
    showSuccessModal('Por favor, complete todos los campos.', true);
    return;
  }

  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');
    const fullName = await getUserFullName();

    if (currentBlocId) {
      // Editar entrada existente
      const blocRef = doc(db, 'blocs', currentBlocId);
      const updatedData = {
        usuario: titulo, // Guardar como usuario en lugar de titulo
        contenido,
        fechaModificacion: serverTimestamp(),
        usuario: fullName
      };
      await updateDoc(blocRef, updatedData);
      await logAction(currentBlocId, 'modified', updatedData);
      showSuccessModal('Entrada actualizada exitosamente.');
    } else {
      // Crear nueva entrada
      const newBloc = {
        uid: user.uid,
        usuario: titulo, // Guardar como usuario
        contenido,
        fechaCreacion: serverTimestamp(),
        fechaModificacion: null,
        usuario: fullName
      };
      const blocRef = await addDoc(collection(db, 'blocs'), newBloc);
      await logAction(blocRef.id, 'created', newBloc);
      showSuccessModal('Entrada creada exitosamente.');
    }

    await loadBlocs();
    hideModal(blocModal);
    blocTituloInput.value = '';
    blocContenidoInput.value = '';
    currentBlocId = null;
  } catch (error) {
    console.error('Error al guardar entrada:', error);
    showSuccessModal(`Error al guardar entrada: ${error.message}`, true);
  }
}

async function deleteBloc() {
  try {
    if (!currentBlocId) throw new Error('ID de entrada no válido');
    const blocRef = doc(db, 'blocs', currentBlocId);
    await logAction(currentBlocId, 'deleted', { blocId: currentBlocId });
    await deleteDoc(blocRef);
    showSuccessModal('Entrada eliminada exitosamente.');
    await loadBlocs();
    hideModal(deleteModal);
    currentBlocId = null;
  } catch (error) {
    console.error('Error al eliminar entrada:', error);
    showSuccessModal(`Error al eliminar entrada: ${error.message}`, true);
  }
}

async function init() {
  const container = document.querySelector('.bloc-container');
  if (!container) {
    console.error('Contenedor .bloc-container no encontrado');
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
      (userData.permissions && userData.permissions.includes('Apuntes:Bloc'));
    if (!hasAccess) {
      console.error('Acceso denegado');
      container.innerHTML = '<p>Acceso denegado. No tienes permisos para acceder a este módulo.</p>';
      return;
    }

    await loadBlocs();

    crearBlocBtn.addEventListener('click', () => openEditModal());
    cancelBlocBtn.addEventListener('click', () => {
      hideModal(blocModal);
      blocTituloInput.value = '';
      blocContenidoInput.value = '';
      currentBlocId = null;
    });
    saveBlocBtn.addEventListener('click', saveBloc);
    confirmDeleteBtn.addEventListener('click', deleteBloc);
    cancelDeleteBtn.addEventListener('click', () => {
      hideModal(deleteModal);
      currentBlocId = null;
    });

    window.addEventListener('moduleCleanup', () => {
      hideModal(blocModal);
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
