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

const nombreEmpresaInput = document.getElementById('nombre-empresa');
const rutEmpresaInput = document.getElementById('rut-empresa');
const registrarBtn = document.getElementById('registrar-btn');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const editNombreEmpresaInput = document.getElementById('edit-nombre-empresa');
const editRutEmpresaInput = document.getElementById('edit-rut-empresa');
const editEstadoActivo = document.getElementById('edit-estado-activo');
const editEstadoInactivo = document.getElementById('edit-estado-inactivo');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const empresasTableBody = document.querySelector('#empresas-table tbody');
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
let empresas = [];
let currentEditId = null;
let filters = Array(7).fill('');

async function getUserFullName() {
  const user = auth.currentUser;
  if (!user) throw new Error('No se encontró el usuario autenticado');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
  return userSnap.data().fullName || 'Usuario Desconocido';
}

async function checkDuplicate(nombreEmpresa, rutEmpresa, excludeDocId = null) {
  const empresasCollection = collection(db, 'empresas');
  const nombreQuery = query(empresasCollection, where('nombreEmpresa', '==', nombreEmpresa));
  const rutQuery = query(empresasCollection, where('rutEmpresa', '==', rutEmpresa));

  const [nombreSnapshot, rutSnapshot] = await Promise.all([getDocs(nombreQuery), getDocs(rutQuery)]);

  if (!nombreSnapshot.empty) {
    const existingDoc = nombreSnapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isDuplicate: true, field: 'nombreEmpresa', value: nombreEmpresa };
  }

  if (!rutSnapshot.empty) {
    const existingDoc = rutSnapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isDuplicate: true, field: 'rutEmpresa', value: rutEmpresa };
  }

  return { isDuplicate: false };
}

async function getNextEmpresaId() {
  const empresasCollection = collection(db, 'empresas');
  const q = query(empresasCollection, orderBy('empresaId', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);
  let nextId = 1;
  if (!querySnapshot.empty) {
    const lastEmpresa = querySnapshot.docs[0].data();
    const lastIdStr = lastEmpresa.empresaId;
    const lastIdNum = parseInt(lastIdStr, 10);
    if (!isNaN(lastIdNum)) {
      nextId = lastIdNum + 1;
    }
  }
  return nextId.toString().padStart(4, '0');
}

function validateRUT(rut) {
  const cleanRUT = rut.replace(/[^0-9kK-]/g, '');
  if (!/^\d{1,8}-[\dkK]$/.test(cleanRUT)) return false;
  const [number, dv] = cleanRUT.split('-');
  let sum = 0;
  let multiplier = 2;
  for (let i = number.length - 1; i >= 0; i--) {
    sum += parseInt(number[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const mod = 11 - (sum % 11);
  const computedDV = mod === 11 ? '0' : mod === 10 ? 'k' : mod.toString();
  return computedDV.toLowerCase() === dv.toLowerCase();
}

function showModal(modal, progressElement, percentage) {
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

function updateFilterIcons() {
  const filterIcons = document.querySelectorAll('.filter-icon');
  filterIcons.forEach(icon => {
    const columnIndex = parseInt(icon.getAttribute('data-column-index'));
    if (filters[columnIndex]) {
      icon.classList.add('filter-active');
    } else {
      icon.classList.remove('filter-active');
    }
  });
}

function createFilterContainer(columnIndex, th, icon) {
  const container = document.createElement('div');
  container.className = 'filter-container';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = filters[columnIndex] || '';
  input.placeholder = `Filtrar ${th.textContent.trim()}...`;
  container.appendChild(input);

  const thRect = th.getBoundingClientRect();
  const tableRect = document.querySelector('#empresas-table').getBoundingClientRect();
  const scrollContainer = tableContainer;

  const topPosition = thRect.bottom - tableRect.top + scrollContainer.scrollTop + 2;
  const leftPosition = thRect.left - tableRect.left + scrollContainer.scrollLeft;

  container.style.top = `${topPosition}px`;
  container.style.left = `${leftPosition}px`;
  container.style.width = `${Math.min(thRect.width - 12, 200)}px`;

  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      filters[columnIndex] = input.value.trim();
      renderTable();
    }, 300);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      filters[columnIndex] = input.value.trim();
      renderTable();
      closeAllFilters();
    } else if (e.key === 'Escape') {
      closeAllFilters();
    }
  });

  return container;
}

function closeAllFilters() {
  document.querySelectorAll('.filter-container').forEach(container => {
    container.remove();
  });
}

async function loadEmpresas() {
  try {
    showModal(loadingModal, loadingProgress, 0);
    const empresasCollection = collection(db, 'empresas');
    const countSnapshot = await getDocs(empresasCollection);
    const totalRecordsCount = countSnapshot.size;
    totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
    totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
    let q = query(empresasCollection, orderBy('empresaId', 'asc'), limit(recordsPerPage));
    if (lastVisible && currentPage > 1) {
      q = query(empresasCollection, orderBy('empresaId', 'asc'), startAfter(lastVisible), limit(recordsPerPage));
    }
    const querySnapshot = await getDocs(q);
    empresas = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      empresas.push({ docId: doc.id, ...data });
    });
    if (empresas.length > 0) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      firstVisible = querySnapshot.docs[0];
    }
    renderTable();
    updatePagination();
    tableContainer.style.display = 'block';
    hideModal(loadingModal);
  } catch (error) {
    console.error('Error al cargar empresas:', error);
    showSuccessMessage('Error al cargar empresas: ' + error.message, false);
    hideModal(loadingModal);
  }
}

document.getElementById('success-modal').style.right = '20px';
document.getElementById('success-modal').style.left = 'auto';

function renderTable() {
  let filteredEmpresas = [...empresas];
  filteredEmpresas = filteredEmpresas.filter(empresa => {
    const rowData = [
      empresa.empresaId || '',
      '', // Acciones
      empresa.nombreEmpresa || '',
      empresa.rutEmpresa || '',
      empresa.estado || 'Activo',
      empresa.fechaCreacion && typeof empresa.fechaCreacion.toDate === 'function'
        ? empresa.fechaCreacion.toDate().toLocaleString('es-ES')
        : empresa.fechaCreacion instanceof Date
          ? empresa.fechaCreacion.toLocaleString('es-ES')
          : 'Sin fecha',
      empresa.usuario || ''
    ];
    return filters.every((filterValue, index) => {
      if (!filterValue || index === 1) return true;
      return rowData[index]?.toString().toLowerCase().includes(filterValue.toLowerCase());
    });
  });

  empresasTableBody.innerHTML = '';
  filteredEmpresas.forEach(empresa => {
    const fechaCreacion = empresa.fechaCreacion && typeof empresa.fechaCreacion.toDate === 'function'
      ? empresa.fechaCreacion.toDate()
      : empresa.fechaCreacion instanceof Date
        ? empresa.fechaCreacion
        : null;
    const fechaDisplay = fechaCreacion && !isNaN(fechaCreacion)
      ? fechaCreacion.toLocaleString('es-ES')
      : 'Sin fecha';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${empresa.empresaId}</td>
      <td>
        <i class="fas fa-edit action-icon" data-id="${empresa.docId}" title="Editar"></i>
        <i class="fas fa-trash action-icon" data-id="${empresa.docId}" title="Eliminar"></i>
        <i class="fas fa-eye action-icon" data-id="${empresa.docId}" title="Ver"></i>
        <i class="fas fa-history action-icon" data-id="${empresa.docId}" title="Historial"></i>
      </td>
      <td>${empresa.nombreEmpresa}</td>
      <td>${empresa.rutEmpresa}</td>
      <td>${empresa.estado || 'Activo'}</td>
      <td>${fechaDisplay}</td>
      <td>${empresa.usuario}</td>
    `;
    empresasTableBody.appendChild(tr);
  });

  updateFilterIcons();

  const filterIcons = document.querySelectorAll('.filter-icon');
  filterIcons.forEach((icon, index) => {
    icon.removeEventListener('click', icon._clickHandler);
    icon._clickHandler = (e) => {
      e.stopPropagation();
      const columnIndex = parseInt(icon.getAttribute('data-column-index'));
      if (columnIndex === 1) return;
      const th = icon.parentElement;

      closeAllFilters();

      const container = createFilterContainer(columnIndex, th, icon);
      tableContainer.appendChild(container);
      container.style.display = 'block';
      container.querySelector('input').focus();
    };
    icon.addEventListener('click', icon._clickHandler);
  });

  document.removeEventListener('click', document._clickHandler);
  document._clickHandler = (e) => {
    if (!e.target.closest('.filter-container') && !e.target.classList.contains('filter-icon')) {
      closeAllFilters();
    }
  };
  document.addEventListener('click', document._clickHandler);
}

function updatePagination() {
  if (!pageInfo) return;
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

async function loadLogs(empresaId) {
  try {
    const logsCollection = collection(db, 'empresas', empresaId, 'logs');
    const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'));
    const logsSnapshot = await getDocs(logsQuery);
    logContent.innerHTML = '';
    if (logsSnapshot.empty) {
      logContent.innerHTML = '<p>No hay registros de cambios.</p>';
    } else {
      logsSnapshot.forEach((doc) => {
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
  } catch (error) {
    console.error('Error al cargar logs:', error);
    showSuccessMessage('Error al cargar historial: ' + error.message, false);
  }
}

async function init() {
  const container = document.querySelector('.empresas-container');
  if (!container) {
    console.error('Contenedor .empresas-container no encontrado');
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
      (userData.permissions && userData.permissions.includes('Prestaciones:Empresas'));
    if (!hasAccess) {
      console.error('Acceso denegado');
      container.innerHTML = '<p>Acceso denegado. No tienes permisos para acceder a este módulo.</p>';
      return;
    }

    await loadEmpresas();

    registrarBtn.addEventListener('click', async () => {
      const nombreEmpresa = nombreEmpresaInput.value.trim();
      const rutEmpresa = rutEmpresaInput.value.trim();

      if (!nombreEmpresa || !rutEmpresa) {
        showSuccessMessage('Por favor, complete todos los campos', false);
        return;
      }

      if (!validateRUT(rutEmpresa)) {
        showSuccessMessage('RUT inválido', false);
        return;
      }

      try {
        showModal(registerModal, registerProgress, 0);

        const duplicateCheck = await checkDuplicate(nombreEmpresa, rutEmpresa);
        if (duplicateCheck.isDuplicate) {
          showSuccessMessage(`Error: Ya existe una empresa con ${duplicateCheck.field === 'nombreEmpresa' ? 'el nombre' : 'el RUT'} "${duplicateCheck.value}"`, false);
          hideModal(registerModal);
          return;
        }

        const fullName = await getUserFullName();
        const empresaId = await getNextEmpresaId();
        const fechaCreacion = new Date();

        const empresaRef = doc(collection(db, 'empresas'));
        const empresaData = {
          empresaId,
          nombreEmpresa,
          rutEmpresa,
          estado: 'Activo',
          fechaCreacion,
          usuario: fullName,
          uid: user.uid
        };
        const batch = writeBatch(db);
        batch.set(empresaRef, empresaData);
        const logRef = doc(collection(db, 'empresas', empresaRef.id, 'logs'));
        batch.set(logRef, {
          action: 'created',
          details: `Empresa "${nombreEmpresa}" creada con ID "${empresaId}"`,
          timestamp: new Date(),
          user: fullName,
          uid: user.uid
        });

        await batch.commit();

        showModal(registerModal, registerProgress, 100);
        setTimeout(() => {
          hideModal(registerModal);
          showSuccessMessage('Empresa registrada exitosamente');
          nombreEmpresaInput.value = '';
          rutEmpresaInput.value = '';
          empresas.push({ docId: empresaRef.id, ...empresaData });
          renderTable();
        }, 300);
      } catch (error) {
        console.error('Error al registrar empresa:', error);
        showSuccessMessage('Error al registrar empresa: ' + error.message, false);
        hideModal(registerModal);
      }
    });

    saveEditBtn.addEventListener('click', async () => {
      const nombreEmpresa = editNombreEmpresaInput.value.trim();
      const rutEmpresa = editRutEmpresaInput.value.trim();
      const estado = editEstadoActivo.checked ? 'Activo' : 'Inactivo';

      if (!nombreEmpresa || !rutEmpresa) {
        showSuccessMessage('Por favor, complete todos los campos', false);
        return;
      }

      if (!validateRUT(rutEmpresa)) {
        showSuccessMessage('RUT inválido', false);
        return;
      }

      try {
        const duplicateCheck = await checkDuplicate(nombreEmpresa, rutEmpresa, currentEditId);
        if (duplicateCheck.isDuplicate) {
          showSuccessMessage(`Error: Ya existe una empresa con ${duplicateCheck.field === 'nombreEmpresa' ? 'el nombre' : 'el RUT'} "${duplicateCheck.value}"`, false);
          return;
        }

        const empresaRef = doc(db, 'empresas', currentEditId);
        const empresaSnap = await getDoc(empresaRef);
        const oldData = empresaSnap.data();

        const changes = [];
        if (oldData.nombreEmpresa !== nombreEmpresa) {
          changes.push(`Nombre cambiado de "${oldData.nombreEmpresa}" a "${nombreEmpresa}"`);
        }
        if (oldData.rutEmpresa !== rutEmpresa) {
          changes.push(`RUT cambiado de "${oldData.rutEmpresa}" a "${rutEmpresa}"`);
        }
        if (oldData.estado !== estado) {
          changes.push(`Estado cambiado de "${oldData.estado}" a "${estado}"`);
        }

        const fullName = await getUserFullName();

        const batch = writeBatch(db);
        batch.update(empresaRef, {
          nombreEmpresa,
          rutEmpresa,
          estado,
          usuario: fullName,
          fechaActualizacion: new Date()
        });

        if (changes.length > 0) {
          const logRef = doc(collection(db, 'empresas', currentEditId, 'logs'));
          batch.set(logRef, {
            action: 'modified',
            details: changes.join('; '),
            timestamp: new Date(),
            user: fullName,
            uid: user.uid
          });
        }

        await batch.commit();

        hideModal(editModal);
        showSuccessMessage('Empresa actualizada exitosamente');

        const index = empresas.findIndex(emp => emp.docId === currentEditId);
        if (index !== -1) {
          empresas[index] = { ...empresas[index], nombreEmpresa, rutEmpresa, estado, usuario: fullName, fechaActualizacion: new Date() };
          renderTable();
        }
      } catch (error) {
        console.error('Error al actualizar empresa:', error);
        showSuccessMessage('Error al actualizar empresa: ' + error.message, false);
      }
    });

    cancelEditBtn.addEventListener('click', () => {
      hideModal(editModal);
    });

    confirmDeleteBtn.addEventListener('click', async () => {
      const id = confirmDeleteBtn.dataset.id;
      try {
        const empresaRef = doc(db, 'empresas', id);
        const fullName = await getUserFullName();
        const batch = writeBatch(db);
        batch.delete(empresaRef);
        const logRef = doc(collection(db, 'empresas', id, 'logs'));
        batch.set(logRef, {
          action: 'deleted',
          details: `Empresa eliminada`,
          timestamp: new Date(),
          user: fullName,
          uid: user.uid
        });
        await batch.commit();
        hideModal(deleteModal);
        showSuccessMessage('Empresa eliminada exitosamente');
        empresas = empresas.filter(emp => emp.docId !== id);
        renderTable();
        totalRecords.textContent = `Total de registros: ${empresas.length}`;
        totalPages = Math.ceil(empresas.length / recordsPerPage);
        updatePagination();
      } catch (error) {
        console.error('Error al eliminar empresa:', error);
        showSuccessMessage('Error al eliminar empresa: ' + error.message, false);
      }
    });

    cancelDeleteBtn.addEventListener('click', () => {
      hideModal(deleteModal);
    });

    empresasTableBody.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const empresa = empresas.find(emp => emp.docId === id);
      if (!empresa) return;

      if (e.target.classList.contains('fa-edit')) {
        openEditModal(empresa);
      } else if (e.target.classList.contains('fa-trash')) {
        openDeleteModal(empresa);
      } else if (e.target.classList.contains('fa-eye')) {
        const fechaCreacion = empresa.fechaCreacion && typeof empresa.fechaCreacion.toDate === 'function'
          ? empresa.fechaCreacion.toDate()
          : empresa.fechaCreacion instanceof Date
            ? empresa.fechaCreacion
            : null;
        const fechaDisplay = fechaCreacion && !isNaN(fechaCreacion)
          ? fechaCreacion.toLocaleString('es-ES')
          : 'Sin fecha';
        showSuccessMessage(`Detalles de la empresa:\nID: ${empresa.empresaId}\nNombre: ${empresa.nombreEmpresa}\nRUT: ${empresa.rutEmpresa}\nEstado: ${empresa.estado || 'Activo'}\nCreada: ${fechaDisplay}\nUsuario: ${empresa.usuario}`);
      } else if (e.target.classList.contains('fa-history')) {
        loadLogs(empresa.docId);
      }
    });

    closeLogBtn.addEventListener('click', () => {
      hideModal(logModal);
    });

    document.querySelectorAll('.close-modal').forEach(button => {
      button.addEventListener('click', () => {
        const modal = button.closest('.modal');
        if (modal) {
          hideModal(modal);
        }
      });
    });

    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        lastVisible = firstVisible;
        loadEmpresas();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadEmpresas();
      }
    });

    exportExcelBtn.addEventListener('click', () => {
      const data = empresas.map(empresa => {
        const fechaCreacion = empresa.fechaCreacion && typeof empresa.fechaCreacion.toDate === 'function'
          ? empresa.fechaCreacion.toDate()
          : empresa.fechaCreacion instanceof Date
            ? empresa.fechaCreacion
            : null;
        return {
          ID: empresa.empresaId,
          'Nombre de la Empresa': empresa.nombreEmpresa,
          'RUT de la Empresa': empresa.rutEmpresa,
          'Estado': empresa.estado || 'Activo',
          'Fecha de Creación': fechaCreacion && !isNaN(fechaCreacion)
            ? fechaCreacion.toLocaleString('es-ES')
            : 'Sin fecha',
          Usuario: empresa.usuario
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Empresas');
      XLSX.write(workbook, 'empresas.xlsx');
    });

  } catch (error) {
    console.error('Error en init:', error);
    container.innerHTML = `<p>Error al verificar permisos: ${error.message}</p>`;
  }
}

function openEditModal(empresa) {
  if (!editModal) return;
  currentEditId = empresa.docId;
  editNombreEmpresaInput.value = empresa.nombreEmpresa;
  editRutEmpresaInput.value = empresa.rutEmpresa;
  editEstadoActivo.checked = (empresa.estado || 'Activo') === 'Activo';
  editEstadoInactivo.checked = (empresa.estado || 'Activo') === 'Inactivo';
  showModal(editModal);
}

function openDeleteModal(empresa) {
  if (!deleteMessage) return;
  deleteMessage.textContent = `¿Estás seguro de que deseas eliminar la empresa "${empresa.nombreEmpresa}" (ID: ${empresa.empresaId})?`;
  confirmDeleteBtn.dataset.id = empresa.docId;
  showModal(deleteModal);
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => init(), 1);
}