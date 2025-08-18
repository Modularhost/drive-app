import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, startAfter, where, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

const firebaseConfig = {
  apiKey: "AIzaSyDmAf-vi7PhzzQkPZh89q9p3Mz4vGGPtd0",
  authDomain: "modular-app-387da.firebaseapp.com",
  projectId: "modular-app-387da",
  storageBucket: "modular-app-387da.firebasestorage.app",
  messagingSenderId: "271561966774",
  appId: "1:271561966774:web:e197c00e2abd67b4f0d217",
  measurementId: "G-7YT6MMR47X"
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

const nombreInput = document.getElementById('nombre');
const areaClinicaSelect = document.getElementById('area-clinica');
const celularInput = document.getElementById('celular');
const telefonoInput = document.getElementById('telefono');
const correoInput = document.getElementById('correo');
const observacionInput = document.getElementById('observacion');
const registrarBtn = document.getElementById('registrar-btn');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const editNombreInput = document.getElementById('edit-nombre');
const editAreaClinicaSelect = document.getElementById('edit-area-clinica');
const editCelularInput = document.getElementById('edit-celular');
const editTelefonoInput = document.getElementById('edit-telefono');
const editCorreoInput = document.getElementById('edit-correo');
const editObservacionInput = document.getElementById('edit-observacion');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const ctsClinicoTableBody = document.querySelector('#cts-clinico-table tbody');
const tableContainer = document.getElementById('table-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const pageInfo = document.getElementById('page-info');
const totalRecords = document.getElementById('total-records');
const logModal = document.getElementById('log-modal');
const logContent = document.getElementById('log-content');
const closeLogBtn = document.getElementById('close-log-btn');

let currentPage = 1;
const recordsPerPage = 50;
let lastVisible = null;
let firstVisible = null;
let totalPages = 1;
let ctsClinicos = [];
let currentEditId = null;
let filters = {};
let lastCtsClinicoId = 0;
let areasClinicas = [];

async function getUserFullName() {
  const user = auth.currentUser;
  if (!user) throw new Error('No se encontró el usuario autenticado');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
  return userSnap.data().fullName || 'Usuario Desconocido';
}

async function checkDuplicate(nombre, areaClinicaId, excludeDocId = null) {
  const ctsClinicoCollection = collection(db, 'ctsClinico');
  const q = query(ctsClinicoCollection, where('nombre', '==', nombre), where('areaClinicaId', '==', areaClinicaId));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const existingDoc = snapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isDuplicate: true, field: 'nombre y área clínica', value: `${nombre} (Área Clínica ID: ${areaClinicaId})` };
  }
  return { isDuplicate: false };
}

async function getNextCtsClinicoId() {
  if (lastCtsClinicoId > 0) {
    lastCtsClinicoId++;
    return lastCtsClinicoId.toString().padStart(1, '0');
  }
  const ctsClinicoCollection = collection(db, 'ctsClinico');
  const q = query(ctsClinicoCollection, orderBy('id', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);
  let nextId = 1;
  if (!querySnapshot.empty) {
    const lastCtsClinico = querySnapshot.docs[0].data();
    nextId = (parseInt(lastCtsClinico.id) || 0) + 1;
  }
  lastCtsClinicoId = nextId;
  return nextId.toString().padStart(1, '0');
}

async function loadAreasClinicas() {
  try {
    const areasClinicasCollection = collection(db, 'areasClinicas');
    const querySnapshot = await getDocs(areasClinicasCollection);
    areasClinicas = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      areasClinicas.push({ id: doc.id, ...data });
    });
    populateAreaClinicaSelect(areaClinicaSelect);
    populateAreaClinicaSelect(editAreaClinicaSelect);
  } catch (err) {
    console.error('Error al cargar áreas clínicas:', err);
    showSuccessMessage('Error al cargar áreas clínicas: ' + err.message, false);
  }
}

function populateAreaClinicaSelect(selectElement) {
  if (!selectElement) return;
  selectElement.innerHTML = '<option value="">Seleccione un área clínica</option>';
  areasClinicas.forEach(area => {
    const option = document.createElement('option');
    option.value = area.id;
    option.textContent = area.nombreAreaClinica || 'Sin nombre';
    selectElement.appendChild(option);
  });
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email ? emailRegex.test(email) : true;
}

function validatePhone(phone) {
  if (!phone) return true;
  const phoneRegex = /^[\d\s]+$/;
  return phoneRegex.test(phone);
}

function cleanPhoneNumber(phone) {
  return phone ? phone.replace(/\s/g, '') : '';
}

function showModal(modal, progressElement, percentage = null) {
  if (!modal) return;
  modal.style.display = 'flex';
  if (progressElement && percentage !== null) {
    progressElement.textContent = `${percentage}%`;
  }
}

function hideModal(modal) {
  if (!modal) return;
  modal.style.display = 'none';
}

function showSuccessMessage(message, isSuccess = true) {
  if (!successModal || !successIcon || !successMessage) {
    console.warn('Elementos de éxito no encontrados');
    alert(message);
    return;
  }
  successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
  successIcon.className = `fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
  successMessage.textContent = message;
  showModal(successModal);
  setTimeout(() => hideModal(successModal), 2000);
}

async function loadCtsClinicos() {
  try {
    showModal(loadingModal, loadingProgress, 0);
    const ctsClinicoCollection = collection(db, 'ctsClinico');
    const countSnapshot = await getDocs(ctsClinicoCollection);
    const totalRecordsCount = countSnapshot.size;
    totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
    totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
    let q = query(ctsClinicoCollection, orderBy('id', 'asc'), limit(recordsPerPage));
    if (lastVisible && currentPage > 1) {
      q = query(ctsClinicoCollection, orderBy('id', 'asc'), startAfter(lastVisible), limit(recordsPerPage));
    }
    const querySnapshot = await getDocs(q);
    ctsClinicos = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      ctsClinicos.push({ docId: doc.id, ...data });
    });
    if (ctsClinicos.length > 0) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      firstVisible = querySnapshot.docs[0];
    }
    renderTable();
    updatePagination();
    tableContainer.style.display = 'block';
    hideModal(loadingModal);
  } catch (err) {
    console.error('Error al cargar contactos clínicos:', err);
    showSuccessMessage('Error al cargar contactos clínicos: ' + err.message, false);
    hideModal(loadingModal);
  }
}

if (successModal) {
  successModal.style.right = '20px';
  successModal.style.left = 'auto';
}

function renderTable() {
  let filteredCtsClinicos = [...ctsClinicos];
  Object.keys(filters).forEach(column => {
    if (filters[column]) {
      filteredCtsClinicos = filteredCtsClinicos.filter(ctsClinico => {
        let value = ctsClinico[column]?.toString().toLowerCase() || '';
        if (column === 'nombreAreaClinica') {
          const area = areasClinicas.find(ac => ac.id === ctsClinico.areaClinicaId);
          value = area ? area.nombreAreaClinica.toLowerCase() : '';
        }
        return value.includes(filters[column].toLowerCase());
      });
    }
  });
  ctsClinicoTableBody.innerHTML = '';
  filteredCtsClinicos.forEach(ctsClinico => {
    const fechaCreacion = ctsClinico.fechaCreacion && typeof ctsClinico.fechaCreacion.toDate === 'function'
      ? ctsClinico.fechaCreacion.toDate()
      : ctsClinico.fechaCreacion instanceof Date
        ? ctsClinico.fechaCreacion
        : null;
    const fechaDisplay = fechaCreacion && !isNaN(fechaCreacion)
      ? fechaCreacion.toLocaleString('es-ES')
      : 'Sin fecha';
    const areaClinica = areasClinicas.find(ac => ac.id === ctsClinico.areaClinicaId);
    const nombreAreaClinica = areaClinica ? areaClinica.nombreAreaClinica : 'Sin área clínica';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ctsClinico.id}</td>
      <td>
        <i class="fas fa-edit action-icon" data-id="${ctsClinico.docId}" title="Editar"></i>
        <i class="fas fa-trash action-icon" data-id="${ctsClinico.docId}" title="Eliminar"></i>
        <i class="fas fa-history action-icon" data-id="${ctsClinico.docId}" title="Historial"></i>
      </td>
      <td>${ctsClinico.nombre}</td>
      <td>${nombreAreaClinica}</td>
      <td>${ctsClinico.celularFormatted || ''}</td>
      <td>${ctsClinico.telefono || ''}</td>
      <td>${ctsClinico.correo || ''}</td>
      <td>${ctsClinico.observacion || ''}</td>
      <td>${fechaDisplay}</td>
      <td>${ctsClinico.usuario}</td>
    `;
    ctsClinicoTableBody.appendChild(tr);
  });

  document.querySelectorAll('.filter-icon').forEach(icon => {
    const column = icon.dataset.column;
    if (filters[column]) {
      icon.classList.remove('fa-filter');
      icon.classList.add('fa-filter-circle-xmark', 'active');
    } else {
      icon.classList.remove('fa-filter-circle-xmark', 'active');
      icon.classList.add('fa-filter');
    }
  });
}

function updatePagination() {
  if (!pageInfo) return;
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

async function loadLogs(ctsClinicoId) {
  try {
    const logsCollection = collection(db, 'ctsClinico', ctsClinicoId, 'logs');
    const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'));
    const logsSnapshot = await getDocs(logsQuery);
    logContent.innerHTML = '';
    if (logsSnapshot.empty) {
      logContent.innerHTML = '<p>No hay registros de cambios.</p>';
    } else {
      logsSnapshot.forEach(doc => {
        const data = doc.data();
        const timestamp = data.timestamp && typeof data.timestamp.toDate === 'function'
          ? data.timestamp.toDate()
          : data.timestamp instanceof Date
            ? data.timestamp
            : null;
        const fechaDisplay = timestamp && !isNaN(timestamp)
          ? timestamp.toLocaleString('es-ES')
          : 'Sin fecha';
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
          <strong>${data.action === 'created' ? 'Creado' : data.action === 'modified' ? 'Modificado' : 'Eliminado'}</strong>: 
          ${data.details}<br>
          <small>Fecha: ${fechaDisplay} | Usuario: ${data.user}</small>
        `;
        logContent.appendChild(logEntry);
      });
    }
    showModal(logModal);
  } catch (err) {
    console.error('Error al cargar historial:', err);
    showSuccessMessage('Error al cargar historial: ' + err.message, false);
  }
}

async function init() {
  const container = document.querySelector('.cts-clinico-container');
  if (!container) {
    console.error('Contenedor .cts-clinico-container no encontrado');
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
      (userData.permissions && userData.permissions.includes('Prestaciones:CtsClinico'));
    if (!hasAccess) {
      console.error('Acceso denegado');
      container.innerHTML = '<p>Acceso denegado. No tienes permisos para acceder a este módulo.</p>';
      return;
    }

    await loadAreasClinicas();
    await loadCtsClinicos();

    registrarBtn.addEventListener('click', async () => {
      const nombre = nombreInput.value.trim();
      const areaClinicaId = areaClinicaSelect.value;
      const celular = celularInput.value.trim();
      const telefono = telefonoInput.value.trim();
      const correo = correoInput.value.trim();
      const observacion = observacionInput.value.trim();

      if (!nombre) {
        showSuccessMessage('Por favor, complete el campo Nombre', false);
        return;
      }
      if (!areaClinicaId) {
        showSuccessMessage('Por favor, seleccione una Área Clínica', false);
        return;
      }
      if (!validateEmail(correo)) {
        showSuccessMessage('Por favor, ingrese un correo válido', false);
        return;
      }
      if (!validatePhone(celular)) {
        showSuccessMessage('Por favor, ingrese un celular válido (solo dígitos y espacios)', false);
        return;
      }
      if (!validatePhone(telefono)) {
        showSuccessMessage('Por favor, ingrese un teléfono válido (solo dígitos y espacios)', false);
        return;
      }

      try {
        showModal(registerModal, registerProgress, 0);
        const duplicateCheck = await checkDuplicate(nombre, areaClinicaId);
        if (duplicateCheck.isDuplicate) {
          showSuccessMessage(`Error: Ya existe un contacto con ${duplicateCheck.value}`, false);
          hideModal(registerModal);
          return;
        }
        const fullName = await getUserFullName();
        const ctsClinicoId = await getNextCtsClinicoId();
        const fechaCreacion = new Date();
        const ctsClinicoRef = doc(collection(db, 'ctsClinico'));
        const areaClinica = areasClinicas.find(ac => ac.id === areaClinicaId);
        if (!areaClinica) {
          showSuccessMessage('Error: Área clínica seleccionada no encontrada', false);
          hideModal(registerModal);
          return;
        }
        const nombreAreaClinica = areaClinica.nombreAreaClinica || 'Sin nombre';
        const cleanedCelular = cleanPhoneNumber(celular);
        const cleanedTelefono = cleanPhoneNumber(telefono);
        const celularFormatted = celular;
        const ctsData = {
          id: ctsClinicoId,
          nombre,
          areaClinicaId,
          nombreAreaClinica,
          celular: cleanedCelular,
          celularFormatted,
          telefono: cleanedTelefono,
          correo,
          observacion,
          fechaCreacion,
          usuario: fullName,
          uid: user.uid
        };
        const batch = writeBatch(db);
        batch.set(ctsClinicoRef, ctsData);
        const logRef = doc(collection(db, 'ctsClinico', ctsClinicoRef.id, 'logs'));
        batch.set(logRef, {
          action: 'created',
          details: `Contacto clínico "${nombre}" creado`,
          timestamp: new Date(),
          user: fullName,
          uid: user.uid
        });
        await batch.commit();
        showModal(registerModal, registerProgress, 100);
        setTimeout(() => {
          hideModal(registerModal);
          showSuccessMessage('Contacto clínico registrado exitosamente');
          nombreInput.value = '';
          areaClinicaSelect.value = '';
          celularInput.value = '';
          telefonoInput.value = '';
          correoInput.value = '';
          observacionInput.value = '';
          ctsClinicos.push({ docId: ctsClinicoRef.id, ...ctsData });
          renderTable();
        }, 300);
      } catch (err) {
        console.error('Error al registrar contacto clínico:', err);
        showSuccessMessage('Error al registrar contacto clínico: ' + err.message, false);
        hideModal(registerModal);
      }
    });

    saveEditBtn.addEventListener('click', async () => {
      const nombre = editNombreInput.value.trim();
      const areaClinicaId = editAreaClinicaSelect.value;
      const celular = editCelularInput.value.trim();
      const telefono = editTelefonoInput.value.trim();
      const correo = editCorreoInput.value.trim();
      const observacion = editObservacionInput.value.trim();

      if (!nombre) {
        showSuccessMessage('Por favor, complete el campo Nombre', false);
        return;
      }
      if (!areaClinicaId) {
        showSuccessMessage('Por favor, seleccione una Área Clínica', false);
        return;
      }
      if (!validateEmail(correo)) {
        showSuccessMessage('Por favor, ingrese un correo válido', false);
        return;
      }
      if (!validatePhone(celular)) {
        showSuccessMessage('Por favor, ingrese un celular válido (solo dígitos y espacios)', false);
        return;
      }
      if (!validatePhone(telefono)) {
        showSuccessMessage('Por favor, ingrese un teléfono válido (solo dígitos y espacios)', false);
        return;
      }

      try {
        const duplicateCheck = await checkDuplicate(nombre, areaClinicaId, currentEditId);
        if (duplicateCheck.isDuplicate) {
          showSuccessMessage(`Error: Ya existe un contacto con ${duplicateCheck.value}`, false);
          return;
        }
        const ctsClinicoRef = doc(db, 'ctsClinico', currentEditId);
        const ctsClinicoSnap = await getDoc(ctsClinicoRef);
        const oldData = ctsClinicoSnap.data();
        const fullName = await getUserFullName();
        const areaClinica = areasClinicas.find(ac => ac.id === areaClinicaId);
        if (!areaClinica) {
          showSuccessMessage('Error: Área clínica seleccionada no encontrada', false);
          return;
        }
        const nombreAreaClinica = areaClinica.nombreAreaClinica || 'Sin nombre';
        const cleanedCelular = cleanPhoneNumber(celular);
        const cleanedTelefono = cleanPhoneNumber(telefono);
        const celularFormatted = celular;
        const changes = [];
        if (oldData.nombre !== nombre) changes.push(`Nombre cambiado de "${oldData.nombre}" a "${nombre}"`);
        if (oldData.areaClinicaId !== areaClinicaId) changes.push(`Área clínica cambiada a "${nombreAreaClinica}"`);
        if (oldData.celular !== cleanedCelular) changes.push(`Celular cambiado de "${oldData.celularFormatted || ''}" a "${celularFormatted || ''}"`);
        if (oldData.telefono !== cleanedTelefono) changes.push(`Teléfono cambiado de "${oldData.telefono || ''}" a "${cleanedTelefono || ''}"`);
        if (oldData.correo !== correo) changes.push(`Correo cambiado de "${oldData.correo || ''}" a "${correo || ''}"`);
        if (oldData.observacion !== observacion) changes.push(`Observación cambiada de "${oldData.observacion || ''}" a "${observacion || ''}"`);
        const batch = writeBatch(db);
        batch.update(ctsClinicoRef, {
          nombre,
          areaClinicaId,
          nombreAreaClinica,
          celular: cleanedCelular,
          celularFormatted,
          telefono: cleanedTelefono,
          correo,
          observacion,
          usuario: fullName,
          fechaActualizacion: new Date()
        });
        if (changes.length > 0) {
          const logRef = doc(collection(db, 'ctsClinico', currentEditId, 'logs'));
          batch.set(logRef, {
            action: 'modified',
            details: changes.join('; '),
            timestamp: new Date(),
            user: fullName,
            uid: auth.currentUser.uid
          });
        }
        await batch.commit();
        hideModal(editModal);
        showSuccessMessage('Contacto clínico actualizado exitosamente');
        const index = ctsClinicos.findIndex(cts => cts.docId === currentEditId);
        if (index !== -1) {
          ctsClinicos[index] = {
            ...ctsClinicos[index],
            nombre,
            areaClinicaId,
            nombreAreaClinica,
            celular: cleanedCelular,
            celularFormatted,
            telefono: cleanedTelefono,
            correo,
            observacion,
            usuario: fullName,
            fechaActualizacion: new Date()
          };
          renderTable();
        }
      } catch (err) {
        console.error('Error al actualizar contacto:', err);
        showSuccessMessage('Error al actualizar contacto: ' + err.message, false);
      }
    });

    cancelEditBtn.addEventListener('click', () => {
      hideModal(editModal);
    });

    confirmDeleteBtn.addEventListener('click', async () => {
      const id = confirmDeleteBtn.dataset.id;
      try {
        const ctsClinicoRef = doc(db, 'ctsClinico', id);
        const ctsClinicoSnap = await getDoc(ctsClinicoRef);
        const ctsData = ctsClinicoSnap.data();
        const fullName = await getUserFullName();
        const batch = writeBatch(db);
        batch.delete(ctsClinicoRef);
        const logRef = doc(collection(db, 'ctsClinico', id, 'logs'));
        batch.set(logRef, {
          action: 'deleted',
          details: `Contacto clínico "${ctsData.nombre}" eliminado`,
          timestamp: new Date(),
          user: fullName,
          uid: auth.currentUser.uid
        });
        await batch.commit();
        hideModal(deleteModal);
        showSuccessMessage('Contacto clínico eliminado exitosamente');
        ctsClinicos = ctsClinicos.filter(cts => cts.docId !== id);
        renderTable();
        totalRecords.textContent = `Total de registros: ${ctsClinicos.length}`;
        totalPages = Math.ceil(ctsClinicos.length / recordsPerPage);
        updatePagination();
      } catch (err) {
        console.error('Error al eliminar contacto:', err);
        showSuccessMessage('Error al eliminar contacto: ' + err.message, false);
      }
    });

    cancelDeleteBtn.addEventListener('click', () => {
      hideModal(deleteModal);
    });

    ctsClinicoTableBody.addEventListener('click', e => {
      const id = e.target.dataset.id;
      const ctsClinico = ctsClinicos.find(cts => cts.docId === id);
      if (!ctsClinico) return;
      if (e.target.classList.contains('fa-edit')) {
        openEditModal(ctsClinico);
      } else if (e.target.classList.contains('fa-trash')) {
        openDeleteModal(ctsClinico);
      } else if (e.target.classList.contains('fa-history')) {
        loadLogs(ctsClinico.docId);
      }
    });

    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        lastVisible = firstVisible;
        loadCtsClinicos();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadCtsClinicos();
      }
    });

    exportExcelBtn.addEventListener('click', () => {
      const data = ctsClinicos.map(cts => {
        const fechaCreacion = cts.fechaCreacion && typeof cts.fechaCreacion.toDate === 'function'
          ? cts.fechaCreacion.toDate()
          : cts.fechaCreacion instanceof Date
            ? cts.fechaCreacion
            : null;
        const area = areasClinicas.find(ac => ac.id === cts.areaClinicaId);
        const nombreAreaClinica = area ? area.nombreAreaClinica : 'Sin área clínica';
        return {
          ID: cts.id,
          Nombre: cts.nombre,
          'Área Clínica': nombreAreaClinica,
          Celular: cts.celularFormatted || '',
          Teléfono: cts.telefono || '',
          Correo: cts.correo || '',
          Observación: cts.observacion || '',
          'Fecha de Creación': fechaCreacion && !isNaN(fechaCreacion)
            ? fechaCreacion.toLocaleString('es-ES')
            : 'Sin fecha',
          Usuario: cts.usuario
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'CtsClinico');
      XLSX.writeFile(workbook, 'cts-clinico.xlsx');
    });

    document.querySelectorAll('.filter-icon').forEach(icon => {
      icon.addEventListener('click', e => {
        const column = e.target.dataset.column;
        if (column === 'acciones') return;

        if (e.target.classList.contains('fa-filter-circle-xmark')) {
          delete filters[column];
          renderTable();
          return;
        }

        document.querySelectorAll('.filter-input-container').forEach(input => input.remove());
        const container = document.createElement('div');
        container.className = 'filter-input-container';
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Filtrar por ${column}`;
        input.value = filters[column] || '';
        input.addEventListener('input', () => {
          const value = input.value.trim();
          if (value) {
            filters[column] = value;
          } else {
            delete filters[column];
          }
          renderTable();
        });
        container.appendChild(input);
        e.target.parentElement.appendChild(container);
        input.focus();
      });
    });

    document.addEventListener('click', e => {
      if (!e.target.classList.contains('fa-filter') && !e.target.classList.contains('fa-filter-circle-xmark') && !e.target.closest('.filter-input-container')) {
        document.querySelectorAll('.filter-input-container').forEach(input => input.remove());
      }
    });

    closeLogBtn.addEventListener('click', () => {
      hideModal(logModal);
    });
  } catch (err) {
    console.error('Error al verificar permisos:', err);
    container.innerHTML = `<p>Error al verificar permisos: ${err.message}</p>`;
  }
}

function openEditModal(ctsClinico) {
  currentEditId = ctsClinico.docId;
  editNombreInput.value = ctsClinico.nombre;
  editAreaClinicaSelect.value = ctsClinico.areaClinicaId || '';
  editCelularInput.value = ctsClinico.celularFormatted || '';
  editTelefonoInput.value = ctsClinico.telefono || '';
  editCorreoInput.value = ctsClinico.correo || '';
  editObservacionInput.value = ctsClinico.observacion || '';
  showModal(editModal);
}

function openDeleteModal(ctsClinico) {
  deleteMessage.textContent = `¿Estás seguro de que deseas eliminar el contacto clínico "${ctsClinico.nombre}" (ID: ${ctsClinico.id})?`;
  confirmDeleteBtn.dataset.id = ctsClinico.docId;
  showModal(deleteModal);
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
}