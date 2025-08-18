import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, startAfter, where, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import * as XLSX from "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

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
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(error => console.error('Persistence error:', error));

const codigoInput = document.getElementById('codigo');
const nombrePaqueteInput = document.getElementById('nombre-paquete');
const proveedorInput = document.getElementById('proveedor');
const registrarBtn = document.getElementById('registrar-btn');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const editCodigoInput = document.getElementById('edit-codigo');
const editNombrePaqueteInput = document.getElementById('edit-nombre-paquete');
const editProveedorInput = document.getElementById('edit-proveedor');
const itemsContainer = document.getElementById('items-container');
const addItemBtn = document.getElementById('add-item-btn');
const editPrecioTotalInput = document.getElementById('edit-precio-total');
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
const paquetesTableBody = document.querySelector('#paquetes-table tbody');
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
let paquetes = [];
let currentEditId = null;
let filters = {};
let lastPaqueteId = 0;
let expandedRows = new Set();
let referenciasCache = null;

function formatPrice(number) {
  if (!number && number !== 0) return '';
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[^0-9]/g, '');
  return parseInt(cleaned) || 0;
}

async function getUserFullName() {
  const user = auth.currentUser;
  if (!user) throw new Error('No se encontró el usuario autenticado');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
  return userSnap.data().fullName || 'Usuario Desconocido';
}

async function checkDuplicate(nombrePaquete, codigo, excludeDocId = null) {
  const paquetesCollection = collection(db, 'paquetes');
  const nombreQuery = query(paquetesCollection, where('nombrePaquete', '==', nombrePaquete));
  const codigoQuery = query(paquetesCollection, where('codigo', '==', codigo));
  const [nombreSnapshot, codigoSnapshot] = await Promise.all([getDocs(nombreQuery), getDocs(codigoQuery)]);
  
  if (!nombreSnapshot.empty) {
    const existingDoc = nombreSnapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isDuplicate: true, field: 'nombrePaquete', value: nombrePaquete };
  }
  
  if (!codigoSnapshot.empty) {
    const existingDoc = codigoSnapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isDuplicate: true, field: 'codigo', value: codigo };
  }
  
  return { isDuplicate: false };
}

async function getNextPaqueteId() {
  if (lastPaqueteId > 0) {
    lastPaqueteId++;
    return lastPaqueteId.toString().padStart(1, '0');
  }
  const paquetesCollection = collection(db, 'paquetes');
  const q = query(paquetesCollection, orderBy('paqueteId', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);
  let nextId = 1;
  if (!querySnapshot.empty) {
    const lastPaquete = querySnapshot.docs[0].data();
    nextId = (parseInt(lastPaquete.paqueteId) || 0) + 1;
  }
  lastPaqueteId = nextId;
  return nextId.toString().padStart(1, '0');
}

function showModal(modal, progressElement, percentage) {
  if (modal) {
    modal.style.display = 'flex';
    if (progressElement) {
      progressElement.textContent = `${percentage}%`;
    }
  }
}

function hideModal(modal) {
  if (modal) {
    modal.style.display = 'none';
  }
}

function showSuccessMessage(message, isSuccess = true) {
  if (!successModal || !successIcon || !successMessage) {
    alert(message);
    return;
  }
  successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
  const modalContent = successModal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.className = `modal-content success-message-container ${isSuccess ? 'success' : 'error'}`;
  }
  successIcon.className = `fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
  successMessage.textContent = message;
  showModal(successModal);
  setTimeout(() => hideModal(successModal), 2000);
}

function addItemRow(item = { referencia: '', descripcion: '', cantidad: '', precio: '' }) {
  const div = document.createElement('div');
  div.className = 'item-row';
  div.innerHTML = `
    <div class="input-with-icon">
      <input type="text" class="item-referencia" placeholder="Referencia" value="${item.referencia}" autocomplete="off">
      <i class="fas fa-list icon-list"></i>
      <ul class="suggestions-list item-referencia-suggestions"></ul>
    </div>
    <input type="text" class="item-descripcion" placeholder="Descripción" value="${item.descripcion}" readonly autocomplete="off">
    <input type="number" class="item-cantidad" placeholder="Cantidad" min="1" step="1" value="${item.cantidad || 1}" autocomplete="off">
    <input type="text" class="item-precio" placeholder="Precio" value="${formatPrice(item.precio)}" readonly autocomplete="off">
    <button class="remove-item-btn"><i class="fas fa-trash"></i></button>
  `;
  itemsContainer.appendChild(div);
  setupReferenciaAutocomplete(div);
  div.querySelector('.remove-item-btn').addEventListener('click', () => div.remove());
}

async function loadReferencias() {
  if (referenciasCache) return referenciasCache;
  try {
    const referenciasCollection = collection(db, 'referencias');
    const q = query(referenciasCollection, where('estado', '==', 'Activo'));
    const querySnapshot = await getDocs(q);
    referenciasCache = querySnapshot.docs.map(doc => doc.data());
    return referenciasCache;
  } catch (error) {
    showSuccessMessage('Error al cargar referencias: ' + error.message, false);
    return [];
  }
}

async function setupReferenciaAutocomplete(row) {
  const input = row.querySelector('.item-referencia');
  const suggestionsList = row.querySelector('.item-referencia-suggestions');
  const icon = row.querySelector('.icon-list');
  if (!input || !suggestionsList || !icon) return;

  const updateSuggestions = async () => {
    const proveedor = editProveedorInput.value.trim();
    const referencias = await loadReferencias();
    const referenciasFiltradas = referencias
      .filter(r => !proveedor || r.proveedor === proveedor)
      .map(r => r.referencia);

    input.addEventListener('input', () => filterAndRenderReferenciaSuggestions(input, suggestionsList, referenciasFiltradas, false));
    input.addEventListener('focus', () => {
      if (input.value.trim()) filterAndRenderReferenciaSuggestions(input, suggestionsList, referenciasFiltradas, false);
    });
    icon.addEventListener('click', () => filterAndRenderReferenciaSuggestions(input, suggestionsList, referenciasFiltradas, true));
  };

  await updateSuggestions();
  editProveedorInput.addEventListener('change', updateSuggestions);

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestionsList.contains(e.target) && !icon.contains(e.target)) {
      suggestionsList.innerHTML = '';
      suggestionsList.style.display = 'none';
    }
  });

  input.addEventListener('change', () => updateItemFieldsFromReferencia(input, row));
}

function filterAndRenderReferenciaSuggestions(input, suggestionsList, referencias, showAll = false) {
  suggestionsList.innerHTML = '';
  const inputValue = input.value.trim();
  let filteredReferencias = showAll || !inputValue ? referencias : referencias.filter(ref => ref.toLowerCase().includes(inputValue.toLowerCase()));
  if (filteredReferencias.length === 0 && !showAll) {
    suggestionsList.style.display = 'none';
    return;
  }
  filteredReferencias.forEach(ref => {
    const li = document.createElement('li');
    li.textContent = ref;
    li.addEventListener('click', () => {
      input.value = ref;
      suggestionsList.innerHTML = '';
      suggestionsList.style.display = 'none';
      updateItemFieldsFromReferencia(input, input.closest('.item-row'));
    });
    suggestionsList.appendChild(li);
  });
  suggestionsList.style.display = filteredReferencias.length > 0 ? 'block' : 'none';
}

async function updateItemFieldsFromReferencia(input, row) {
  try {
    const referencia = input.value.trim();
    const referencias = await loadReferencias();
    const referenciaData = referencias.find(r => r.referencia === referencia);
    const descripcionInput = row.querySelector('.item-descripcion');
    const precioInput = row.querySelector('.item-precio');
    if (referenciaData) {
      descripcionInput.value = referenciaData.descripcion || '';
      precioInput.value = formatPrice(referenciaData.precio) || '';
      descripcionInput.setAttribute('readonly', 'true');
      precioInput.setAttribute('readonly', 'true');
    } else {
      descripcionInput.value = '';
      precioInput.value = '';
      descripcionInput.removeAttribute('readonly');
      precioInput.removeAttribute('readonly');
    }
  } catch (error) {
    showSuccessMessage('Error al buscar referencia: ' + error.message, false);
  }
}

async function loadPaquetes() {
  try {
    showModal(loadingModal, loadingProgress, 0);
    const paquetesCollection = collection(db, 'paquetes');
    const countSnapshot = await getDocs(paquetesCollection);
    const totalRecordsCount = countSnapshot.size;
    totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
    totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
    let q = query(paquetesCollection, orderBy('paqueteId', 'asc'), limit(recordsPerPage));
    if (lastVisible && currentPage > 1) {
      q = query(paquetesCollection, orderBy('paqueteId', 'asc'), startAfter(lastVisible), limit(recordsPerPage));
    }
    const querySnapshot = await getDocs(q);
    paquetes = [];
    const referencias = await loadReferencias();
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const updatedItems = data.items.map(item => updateItemFromReferencia(item, referencias));
      paquetes.push({
        docId: docSnapshot.id,
        ...data,
        items: updatedItems,
        numItems: updatedItems.length
      });
    });
    if (paquetes.length > 0) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      firstVisible = querySnapshot.docs[0];
    }
    renderTable();
    updatePagination();
    tableContainer.style.display = 'block';
    hideModal(loadingModal);
  } catch (error) {
    showSuccessMessage('Error al cargar paquetes: ' + error.message, false);
    hideModal(loadingModal);
  }
}

function updateItemFromReferencia(item, referencias) {
  const referenciaData = referencias.find(r => r.referencia === item.referencia);
  if (referenciaData) {
    return {
      ...item,
      descripcion: referenciaData.descripcion || item.descripcion,
      precio: referenciaData.precio || item.precio
    };
  }
  return item;
}

function renderTable() {
  paquetesTableBody.innerHTML = '';
  let filteredPaquetes = [...paquetes];
  Object.keys(filters).forEach(column => {
    if (filters[column]) {
      filteredPaquetes = filteredPaquetes.filter(paquete => {
        const value = paquete[column]?.toString()?.toLowerCase() || '';
        return value.includes(filters[column].toLowerCase());
      });
    }
  });

  filteredPaquetes.forEach(paquete => {
    const fechaCreacion = paquete.fechaCreacion && typeof paquete.fechaCreacion.toDate === 'function'
      ? paquete.fechaCreacion.toDate()
      : paquete.fechaCreacion instanceof Date
      ? paquete.fechaCreacion
      : null;
    const fechaDisplay = fechaCreacion && !isNaN(fechaCreacion)
      ? fechaCreacion.toLocaleString('es-ES')
      : 'Sin fecha';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${paquete.paqueteId || 'N/A'}</td>
      <td>
        <i class="fas fa-edit action-icon" data-id="${paquete.docId}" title="Editar"></i>
        <i class="fas fa-trash action-icon" data-id="${paquete.docId}" title="Eliminar"></i>
        <i class="fas fa-history action-icon" data-id="${paquete.docId}" title="Historial"></i>
      </td>
      <td>${paquete.codigo || 'N/A'}</td>
      <td><span class="nombre-paquete" data-id="${paquete.docId}">${paquete.nombrePaquete}</span></td>
      <td>${paquete.proveedor || 'N/A'}</td>
      <td>${paquete.numItems || 0}</td>
      <td>$${formatPrice(paquete.precioTotal)}</td>
      <td>${paquete.estado || 'Activo'}</td>
      <td>${fechaDisplay}</td>
      <td>${paquete.usuario || 'N/A'}</td>
    `;
    paquetesTableBody.appendChild(tr);

    if (expandedRows.has(paquete.docId)) {
      const detailRow = document.createElement('tr');
      detailRow.className = 'item-details';
      detailRow.style.display = 'table-row';
      detailRow.innerHTML = `
        <td colspan="10">
          <table>
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              ${paquete.items.length > 0 ? paquete.items.map(item => `
                <tr>
                  <td>${item.referencia || 'N/A'}</td>
                  <td>${item.descripcion || 'N/A'}</td>
                  <td>${item.cantidad || '0'}</td>
                  <td>$${formatPrice(item.precio) || '0'}</td>
                </tr>
              `).join('') : '<tr><td colspan="4">No hay ítems registrados</td></tr>'}
            </tbody>
          </table>
        </td>
      `;
      paquetesTableBody.appendChild(detailRow);
    }
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
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

async function loadLogs(paqueteId) {
  try {
    const logsCollection = collection(db, 'paquetes', paqueteId, 'logs');
    const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'));
    const logsSnapshot = await getDocs(logsQuery);
    logContent.innerHTML = '';
    if (logsSnapshot.empty) {
      logContent.innerHTML = '<p>No hay registros de cambios.</p>';
    } else {
      logsSnapshot.forEach(docSnapshot => {
        const data = docSnapshot.data();
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
          ${data.details || 'Sin detalles'}<br>
          <small>Fecha: ${fechaDisplay} | usuario: ${data.usuario || 'N/A'}</small>
        `;
        logContent.appendChild(logEntry);
      });
    }
    showModal(logModal);
  } catch (error) {
    showSuccessMessage('Error al cargar historial: ' + error.message, false);
  }
}

function openEditModal(paquete) {
  currentEditId = paquete.docId;
  editCodigoInput.value = paquete.codigo || '';
  editNombrePaqueteInput.value = paquete.nombrePaquete || '';
  editProveedorInput.value = paquete.proveedor || '';
  editPrecioTotalInput.value = formatPrice(paquete.precioTotal) || '';
  editEstadoActivo.checked = paquete.estado === 'Activo';
  editEstadoInactivo.checked = paquete.estado === 'Inactivo';
  itemsContainer.innerHTML = '';
  paquete.items.forEach(item => addItemRow(item));
  if (paquete.items.length === 0) addItemRow();
  showModal(editModal);
}

async function exportToExcel() {
  const exportData = paquetes.map(paquete => ({
    ID: paquete.paqueteId || 'N/A',
    Código: paquete.codigo || 'N/A',
    'Nombre del Paquete': paquete.nombrePaquete || 'N/A',
    Proveedor: paquete.proveedor || 'N/A',
    'N° Ítems': paquete.numItems || 0,
    'Precio Total': formatPrice(paquete.precioTotal || 0),
    Estado: paquete.estado || 'Activo',
    'Fecha de Creación': paquete.fechaCreacion && typeof paquete.fechaCreacion.toDate === 'function'
      ? paquete.fechaCreacion.toDate().toLocaleString('es-ES')
      : paquete.fechaCreacion instanceof Date
      ? paquete.fechaCreacion.toLocaleString('es-ES')
      : 'Sin fecha',
    usuario: paquete.usuario || 'N/A',
    Ítems: paquete.items.length > 0
      ? paquete.items.map(item => `Ref: ${item.referencia || 'N/A'}, Desc: ${item.descripcion || 'N/A'}, Cant: ${item.cantidad || 0}, Precio: $${formatPrice(item.precio || 0)}`).join('; ')
      : 'No hay ítems'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Paquetes');
  XLSX.writeFile(workbook, 'Paquetes_Quirúrgicos.xlsx');
}

async function loadEmpresas() {
  try {
    const empresasCollection = collection(db, 'empresas');
    const querySnapshot = await getDocs(empresasCollection);
    const empresas = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.nombreEmpresa && data.estado === 'Activo') {
        empresas.push(data.nombreEmpresa);
      }
    });
    return empresas.sort();
  } catch (error) {
    showSuccessMessage('Error al cargar empresas: ' + error.message, false);
    return [];
  }
}

function filterAndRenderSuggestions(input, suggestionsList, empresas, showAll = false) {
  suggestionsList.innerHTML = '';
  const inputValue = input.value.trim();
  let filteredEmpresas = showAll || !inputValue ? empresas : empresas.filter(emp => emp.toLowerCase().includes(inputValue.toLowerCase()));
  if (filteredEmpresas.length === 0 && !showAll) {
    suggestionsList.style.display = 'none';
    return;
  }
  filteredEmpresas.forEach(emp => {
    const li = document.createElement('li');
    li.textContent = emp;
    li.addEventListener('click', () => {
      input.value = emp;
      suggestionsList.innerHTML = '';
      suggestionsList.style.display = 'none';
    });
    suggestionsList.appendChild(li);
  });
  suggestionsList.style.display = filteredEmpresas.length > 0 ? 'block' : 'none';
}

async function setupProveedorAutocomplete(inputId, suggestionsListId) {
  const input = document.getElementById(inputId);
  const suggestionsList = document.getElementById(suggestionsListId);
  const icon = input.parentElement.querySelector('.icon-list');
  if (!input || !suggestionsList || !icon) return;

  const empresas = await loadEmpresas();
  input.addEventListener('input', () => filterAndRenderSuggestions(input, suggestionsList, empresas, false));
  input.addEventListener('focus', () => {
    if (input.value.trim()) filterAndRenderSuggestions(input, suggestionsList, empresas, false);
  });
  icon.addEventListener('click', () => filterAndRenderSuggestions(input, suggestionsList, empresas, true));
  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !suggestionsList.contains(e.target) && !icon.contains(e.target)) {
      suggestionsList.innerHTML = '';
      suggestionsList.style.display = 'none';
    }
  });
}

async function updateAllRecordsFromReferencias() {
  try {
    const referencias = await loadReferencias();
    const paquetesCollection = collection(db, 'paquetes');
    const querySnapshot = await getDocs(paquetesCollection);
    const batch = writeBatch(db);
    let updatedCount = 0;

    querySnapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const updatedItems = data.items.map(item => updateItemFromReferencia(item, referencias));
      if (JSON.stringify(data.items) !== JSON.stringify(updatedItems)) {
        batch.update(docSnapshot.ref, { items: updatedItems });
        const logRef = doc(db, 'paquetes', docSnapshot.id, 'logs', `log_${Date.now()}`);
        batch.set(logRef, {
          action: 'modified',
          details: `Paquete "${data.nombrePaquete}" actualizado desde referencias`,
          timestamp: new Date(),
          usuario: 'Sistema Automático',
          uid: 'system'
        });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      await loadPaquetes();
      showSuccessMessage(`Se actualizaron ${updatedCount} paquetes desde la colección de referencias`);
    }
  } catch (error) {
    showSuccessMessage('Error al actualizar paquetes desde referencias: ' + error.message, false);
  }
}

async function init() {
  const container = document.querySelector('.paquetization-container');
  if (!container) return;

  onAuthStateChanged(auth, async user => {
    if (!user) {
      container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión nuevamente.</p>';
      setTimeout(() => window.location.href = 'index.html?error=auth-required', 2000);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        container.innerHTML = '<p>Error: Tu cuenta no está registrada en la base de datos. Contacta al administrador.</p>';
        return;
      }

      const userData = userDoc.data();
      const hasAccess = userData.role === 'Administrador' || (userData.permissions && userData.permissions.includes('Implantes:Paquetización'));
      if (!hasAccess) {
        container.innerHTML = '<p>Acceso no autorizado. No tienes permisos para acceder a este módulo.</p>';
        return;
      }

      await setupProveedorAutocomplete('proveedor', 'proveedor-suggestions');
      await setupProveedorAutocomplete('edit-proveedor', 'edit-proveedor-suggestions');
      await loadPaquetes();
      await updateAllRecordsFromReferencias();

      registrarBtn.addEventListener('click', async () => {
        const codigo = codigoInput.value.trim();
        const nombrePaquete = nombrePaqueteInput.value.trim();
        const proveedor = proveedorInput.value.trim();
        if (!codigo || !nombrePaquete || !proveedor) {
          showSuccessMessage('Por favor, completa todos los campos', false);
          return;
        }

        try {
          showModal(registerModal, registerProgress, 0);
          const duplicateCheck = await checkDuplicate(nombrePaquete, codigo);
          if (duplicateCheck.isDuplicate) {
            showSuccessMessage(`Error: Ya existe un paquete con el ${duplicateCheck.field === 'nombrePaquete' ? 'nombre' : 'código'} "${duplicateCheck.value}"`, false);
            hideModal(registerModal);
            return;
          }

          const empresas = await loadEmpresas();
          if (!empresas.includes(proveedor)) {
            showSuccessMessage('Error: El proveedor ingresado no está registrado o no está activo', false);
            hideModal(registerModal);
            return;
          }

          const user = auth.currentUser;
          if (!user) throw new Error('Usuario no autenticado');
          const fullName = await getUserFullName();
          const paqueteId = await getNextPaqueteId();
          const fechaCreacion = new Date();

          const paqueteRef = doc(collection(db, 'paquetes'));
          const paqueteData = {
            paqueteId,
            codigo,
            nombrePaquete,
            proveedor,
            items: [],
            precioTotal: 0,
            estado: 'Activo',
            fechaCreacion,
            usuario: fullName,
            uid: user.uid
          };

          const batch = writeBatch(db);
          batch.set(paqueteRef, paqueteData);
          const logRef = doc(collection(db, 'paquetes', paqueteRef.id, 'logs'));
          batch.set(logRef, {
            action: 'created',
            details: `Paquete "${nombrePaquete}" creado`,
            timestamp: new Date(),
            usuario: fullName,
            uid: user.uid
          });

          await batch.commit();
          showModal(registerModal, registerProgress, 100);
          setTimeout(() => {
            hideModal(registerModal);
            showSuccessMessage('Paquete registrado exitosamente');
            codigoInput.value = '';
            nombrePaqueteInput.value = '';
            proveedorInput.value = '';
            paquetes.push({ docId: paqueteRef.id, ...paqueteData, numItems: 0 });
            renderTable();
          }, 300);
        } catch (error) {
          showSuccessMessage('Error al registrar el paquete: ' + error.message, false);
          hideModal(registerModal);
        }
      });

      addItemBtn.addEventListener('click', () => addItemRow());

      saveEditBtn.addEventListener('click', async () => {
        const codigo = editCodigoInput.value.trim();
        const nombrePaquete = editNombrePaqueteInput.value.trim();
        const proveedor = editProveedorInput.value.trim();
        const items = Array.from(itemsContainer.querySelectorAll('.item-row')).map(row => ({
          referencia: row.querySelector('.item-referencia').value.trim(),
          descripcion: row.querySelector('.item-descripcion').value.trim(),
          cantidad: parseInt(row.querySelector('.item-cantidad').value) || 1,
          precio: parsePrice(row.querySelector('.item-precio').value)
        })).filter(item => item.referencia && item.descripcion && item.cantidad > 0 && item.precio >= 0);
        const precioTotal = parsePrice(editPrecioTotalInput.value);

        if (!codigo || !nombrePaquete || !proveedor || items.length === 0 || precioTotal < 0) {
          showSuccessMessage('Por favor, completa todos los campos correctamente', false);
          return;
        }

        try {
          const duplicateCheck = await checkDuplicate(nombrePaquete, codigo, currentEditId);
          if (duplicateCheck.isDuplicate) {
            showSuccessMessage(`Error: Ya existe un paquete con el ${duplicateCheck.field === 'nombrePaquete' ? 'nombre' : 'código'} "${duplicateCheck.value}"`, false);
            return;
          }

          const empresas = await loadEmpresas();
          if (!empresas.includes(proveedor)) {
            showSuccessMessage('Error: El proveedor no está registrado o no está activo', false);
            return;
          }

          const user = auth.currentUser;
          if (!user) throw new Error('Usuario no autenticado');
          const fullName = await getUserFullName();
          const paqueteRef = doc(db, 'paquetes', currentEditId);
          const currentPaquete = paquetes.find(p => p.docId === currentEditId);
          const paqueteData = {
            paqueteId: currentPaquete.paqueteId,
            codigo,
            nombrePaquete,
            proveedor,
            items,
            precioTotal,
            estado: editEstadoActivo.checked ? 'Activo' : 'Inactivo',
            usuario: fullName,
            uid: user.uid,
            fechaCreacion: currentPaquete.fechaCreacion
          };

          const batch = writeBatch(db);
          batch.set(paqueteRef, paqueteData);
          const logRef = doc(collection(db, 'paquetes', currentEditId, 'logs'));
          batch.set(logRef, {
            action: 'modified',
            details: `Paquete "${nombrePaquete}" modificado`,
            timestamp: new Date(),
            usuario: fullName,
            uid: user.uid
          });

          await batch.commit();
          showSuccessMessage('Paquete actualizado exitosamente');
          hideModal(editModal);
          const index = paquetes.findIndex(p => p.docId === currentEditId);
          paquetes[index] = { docId: currentEditId, ...paqueteData, numItems: items.length };
          renderTable();
        } catch (error) {
          showSuccessMessage('Error al actualizar paquete: ' + error.message, false);
        }
      });

      cancelEditBtn.addEventListener('click', () => {
        hideModal(editModal);
        itemsContainer.innerHTML = '';
      });

      paquetesTableBody.addEventListener('click', async e => {
        const id = e.target.dataset.id;
        if (!id) return;

        if (e.target.classList.contains('fa-edit')) {
          const paquete = paquetes.find(p => p.docId === id);
          if (paquete) openEditModal(paquete);
        } else if (e.target.classList.contains('fa-trash')) {
          const paquete = paquetes.find(p => p.docId === id);
          if (paquete) {
            deleteMessage.textContent = `¿Estás seguro de que deseas eliminar el paquete "${paquete.nombrePaquete}"?`;
            showModal(deleteModal);
            confirmDeleteBtn.onclick = async () => {
              try {
                const user = auth.currentUser;
                if (!user) throw new Error('Usuario no autenticado');
                const fullName = await getUserFullName();
                const batch = writeBatch(db);
                batch.delete(doc(db, 'paquetes', id));
                const logRef = doc(collection(db, 'paquetes', id, 'logs'));
                batch.set(logRef, {
                  action: 'deleted',
                  details: `Paquete "${paquete.nombrePaquete}" eliminado`,
                  timestamp: new Date(),
                  usuario: fullName,
                  uid: user.uid
                });
                await batch.commit();
                showSuccessMessage('Paquete eliminado exitosamente');
                hideModal(deleteModal);
                paquetes = paquetes.filter(p => p.docId !== id);
                renderTable();
                updatePagination();
              } catch (error) {
                showSuccessMessage('Error al eliminar paquete: ' + error.message, false);
                hideModal(deleteModal);
              }
            };
            cancelDeleteBtn.onclick = () => hideModal(deleteModal);
          }
        } else if (e.target.classList.contains('fa-history')) {
          await loadLogs(id);
        } else if (e.target.classList.contains('nombre-paquete')) {
          if (expandedRows.has(id)) {
            expandedRows.delete(id);
          } else {
            expandedRows.add(id);
          }
          renderTable();
        }
      });

      prevBtn.addEventListener('click', async () => {
        if (currentPage > 1) {
          currentPage--;
          await loadPaquetes();
        }
      });

      nextBtn.addEventListener('click', async () => {
        if (currentPage < totalPages) {
          currentPage++;
          await loadPaquetes();
        }
      });

      exportExcelBtn.addEventListener('click', exportToExcel);

      closeLogBtn.addEventListener('click', () => hideModal(logModal));

      document.querySelectorAll('.filter-icon').forEach(icon => {
        icon.addEventListener('click', e => {
          const column = icon.dataset.column;
          if (filters[column]) {
            delete filters[column];
            renderTable();
            return;
          }
          const existingInput = document.querySelector('.filter-input-container');
          if (existingInput) existingInput.remove();
          const inputContainer = document.createElement('div');
          inputContainer.className = 'filter-input-container';
          inputContainer.innerHTML = `<input type="text" placeholder="Filtrar por ${column}" autocomplete="off">`;
          e.target.parentElement.appendChild(inputContainer);
          const input = inputContainer.querySelector('input');
          input.focus();
          input.addEventListener('input', ev => {
            filters[column] = ev.target.value;
            renderTable();
          });
          input.addEventListener('blur', () => {
            if (!input.value) {
              delete filters[column];
              renderTable();
              inputContainer.remove();
            }
          });
        });
      });
    } catch (error) {
      console.error('Error en init:', error);
      container.innerHTML = `<p>Error al iniciar: ${error.message}</p>`;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (successModal) {
    successModal.style.right = '20px';
    successModal.style.left = 'auto';
  }
  init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
}