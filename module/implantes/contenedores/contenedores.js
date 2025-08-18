import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, startAfter, where, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(script);
    script.onerror = (e) => reject(new Error(`Error al cargar ${src}: ${e.type}`));
    document.head.appendChild(script);
  });
}

async function loadLibraries() {
  try {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
      throw new Error('jsPDF no se cargó correctamente.');
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    if (typeof doc.autoTable !== 'function') {
      throw new Error('El plugin autoTable no se cargó correctamente.');
    }
    return true;
  } catch (error) {
    console.error('Error al verificar las librerías de jsPDF:', error.message);
    alert('No se pudieron cargar las librerías necesarias para generar PDFs.');
    return false;
  }
}

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

const nombreContenedorInput = document.getElementById('nombre-contenedor');
const proveedorInput = document.getElementById('proveedor');
const registrarBtn = document.getElementById('registrar-btn');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const editNombreContenedorInput = document.getElementById('edit-nombre-contenedor');
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
const contenedoresTableBody = document.querySelector('#contenedores-table tbody');
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
let contenedores = [];
let currentEditId = null;
let filters = {};
let lastContenedorId = 0;
let expandedRows = new Set();
let referenciasCache = null;

function formatPrice(number) {
  if (!number && number !== 0) return '';
  return Number(number).toLocaleString('es-CL', { minimumFractionDigits: 0 });
}

function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/\./g, '');
  return parseInt(cleaned) || 0;
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

async function getUserFullName() {
  const user = auth.currentUser;
  if (!user) throw new Error('No se encontró el usuario autenticado');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
  return userSnap.data().fullName || 'Usuario Desconocido';
}

async function checkDuplicate(nombreContenedor, excludeDocId = null) {
  const contenedoresCollection = collection(db, 'contenedores');
  const nombreQuery = query(contenedoresCollection, where('nombreContenedor', '==', nombreContenedor));
  const nombreSnapshot = await getDocs(nombreQuery);
  if (!nombreSnapshot.empty) {
    const existingDoc = nombreSnapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isDuplicate: true, field: 'nombreContenedor', value: nombreContenedor };
  }
  return { isDuplicate: false };
}

async function getNextContenedorId() {
  if (lastContenedorId > 0) {
    lastContenedorId++;
    return lastContenedorId.toString().padStart(1, '0');
  }
  const contenedoresCollection = collection(db, 'contenedores');
  const q = query(contenedoresCollection, orderBy('contenedorId', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);
  let nextId = 1;
  if (!querySnapshot.empty) {
    const lastContenedor = querySnapshot.docs[0].data();
    nextId = (parseInt(lastContenedor.contenedorId) || 0) + 1;
  }
  lastContenedorId = nextId;
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

function addItemRow(item = { referencia: '', descripcion: '', ideal: '', cantidad: '', precio: '' }) {
  const div = document.createElement('div');
  div.className = 'item-row';
  div.innerHTML = `
    <div class="input-with-icon">
      <input type="text" name="item-referencia" class="input item-referencia" placeholder="Referencia" value="${item.referencia || ''}" autocomplete="off">
      <i class="fas fa-list icon-list"></i>
      <ul class="suggestions-list"></ul>
    </div>
    <input type="text" name="item-descripcion" class="item-descripcion" placeholder="Descripción" value="${item.descripcion || ''}" readonly autocomplete="off">
    <input type="number" name="item-ideal" class="item-ideal" placeholder="Ideal" min="0" step="1" value="${item.ideal || ''}" autocomplete="off">
    <input type="number" name="item-cantidad" class="item-cantidad" placeholder="Cantidad" min="1" step="1" value="${item.cantidad || 1}" autocomplete="off">
    <input type="text" name="item-precio" class="item-precio" placeholder="Precio" value="${formatPrice(item.precio) || ''}" readonly autocomplete="off">
    <button type="button" class="remove-item-btn"><i class="fas fa-trash"></i></button>
  `;
  itemsContainer.appendChild(div);

  const removeButton = div.querySelector('.remove-item-btn');
  if (removeButton) {
    removeButton.addEventListener('click', () => {
      div.remove();
      updatePrecioTotal();
    });
  } else {
    console.error('Error: No se encontró el botón .remove-item-btn en el item-row');
  }

  setupReferenciaAutocomplete(div);

  const cantidadInput = div.querySelector('.item-cantidad');
  const precioInput = div.querySelector('.item-precio');
  const idealInput = div.querySelector('.item-ideal');

  if (cantidadInput) {
    cantidadInput.addEventListener('input', updatePrecioTotal);
  } else {
    console.error('Error: No se encontró el input .item-cantidad en el item-row');
  }
  if (precioInput) {
    precioInput.addEventListener('input', (e) => {
      const value = e.target.value.replace(/\./g, '');
      if (/^\d*$/.test(value)) {
        e.target.value = formatPrice(parseInt(value) || 0);
      } else {
        e.target.value = '';
      }
      updatePrecioTotal();
    });
  } else {
    console.error('Error: No se encontró el input .item-precio en el item-row');
  }
  if (idealInput) {
    idealInput.addEventListener('input', updatePrecioTotal);
  } else {
    console.error('Error: No se encontró el input .item-ideal en el item-row');
  }

  updatePrecioTotal();
}

function updatePrecioTotal() {
  let total = 0;
  const rows = itemsContainer.querySelectorAll('.item-row');
  rows.forEach(row => {
    const cantidadInput = row.querySelector('.item-cantidad');
    const precioInput = row.querySelector('.item-precio');

    if (!cantidadInput || !precioInput) {
      console.error('Error: No se encontraron los inputs .item-cantidad o .item-precio en una fila', row);
      return;
    }

    const cantidad = parseInt(cantidadInput.value) || 0;
    const precio = parsePrice(precioInput.value);
    total += cantidad * precio;
  });
  editPrecioTotalInput.value = formatPrice(total);
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
  const suggestionsList = row.querySelector('.suggestions-list');
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
  let filteredReferencias = showAll || inputValue ? referencias : [];
  filteredReferencias = filteredReferencias.filter(ref => ref.toLowerCase().includes(inputValue.toLowerCase()));
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
    updatePrecioTotal();
  } catch (error) {
    showSuccessMessage('Error al buscar referencia: ' + error.message, false);
  }
}

async function loadContenedores() {
  try {
    showModal(loadingModal, loadingProgress, 0);
    const contenedoresCollection = collection(db, 'contenedores');
    const countSnapshot = await getDocs(contenedoresCollection);
    const totalRecordsCount = countSnapshot.size;
    totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
    totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
    let q = query(contenedoresCollection, orderBy('contenedorId', 'asc'), limit(recordsPerPage));
    if (lastVisible && currentPage > 1) {
      q = query(contenedoresCollection, orderBy('contenedorId', 'asc'), startAfter(lastVisible), limit(recordsPerPage));
    }
    const querySnapshot = await getDocs(q);
    contenedores = [];
    const referencias = await loadReferencias();
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const updatedItems = data.items.map(item => updateItemFromReferencia(item, referencias));
      contenedores.push({
        docId: docSnapshot.id,
        ...data,
        items: updatedItems,
        numItems: updatedItems.length
      });
    });
    if (contenedores.length > 0) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      firstVisible = querySnapshot.docs[0];
    }
    renderTable();
    updatePagination();
    tableContainer.style.display = 'block';
  } catch (error) {
    showSuccessMessage('Error al cargar contenedores: ' + error.message, false);
  } finally {
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

function generatePDF(contenedorId) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showSuccessMessage('Error: Las librerías de jsPDF no se han cargado correctamente.', false);
    return;
  }
  const contenedor = contenedores.find(c => c.docId === contenedorId);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  if (typeof doc.autoTable !== 'function') {
    showSuccessMessage('Error: El plugin autoTable no está disponible.', false);
    return;
  }

  const currentDate = new Date();
  const formattedDate = formatDate(currentDate);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(26, 60, 52);
  doc.text(contenedor.nombreContenedor.toUpperCase(), 105, 15, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 51, 51);
  doc.text(`Fecha de Revisión: ${formattedDate}`, 105, 20, { align: 'center' });

  const tableData = contenedor.items.map(item => [
    item.referencia || 'N/A',
    item.descripcion || 'N/A',
    item.ideal.toString() || '0',
    item.cantidad.toString() || '0'
  ]);

  doc.autoTable({
    head: [['Referencia', 'Descripción', 'Ideal', 'Cantidad']],
    body: tableData,
    startY: 25,
    margin: { top: 10, left: 10, right: 10, bottom: 10 },
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 1.2,
      textColor: [51, 51, 51],
      lineColor: [74, 85, 104],
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: [226, 232, 240],
      textColor: [26, 60, 52],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'left',
      textTransform: 'uppercase'
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    tableLineColor: [74, 85, 104],
    tableLineWidth: 0.5
  });

  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}

function renderTable() {
  contenedoresTableBody.innerHTML = '';
  let filteredContenedores = [...contenedores];
  Object.keys(filters).forEach(column => {
    if (filters[column]) {
      filteredContenedores = filteredContenedores.filter(contenedor => {
        let value;
        if (column === 'precioTotal') {
          value = formatPrice(contenedor[column]) || '';
        } else {
          value = contenedor[column]?.toString()?.toLowerCase() || '';
        }
        return value.includes(filters[column].toLowerCase());
      });
    }
  });

  filteredContenedores.forEach(contenedor => {
    const fechaCreacion = contenedor.fechaCreacion && typeof contenedor.fechaCreacion.toDate === 'function'
      ? contenedor.fechaCreacion.toDate()
      : contenedor.fechaCreacion instanceof Date
        ? contenedor.fechaCreacion
        : null;
    const fechaDisplay = fechaCreacion && !isNaN(fechaCreacion)
      ? fechaCreacion.toLocaleString('es-ES')
      : 'Sin fecha';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${contenedor.contenedorId || 'N/A'}</td>
      <td>
        <i class="fas fa-edit action-icon" data-id="${contenedor.docId}" title="Editar"></i>
        <i class="fas fa-trash action-icon" data-id="${contenedor.docId}" title="Eliminar"></i>
        <i class="fas fa-history action-icon" data-id="${contenedor.docId}" title="Historial"></i>
        <i class="fas fa-file-pdf action-icon" data-id="${contenedor.docId}" title="Ver PDF"></i>
      </td>
      <td><span class="nombre-contenedor" data-id="${contenedor.docId}">${contenedor.nombreContenedor}</span></td>
      <td>${contenedor.proveedor || 'N/A'}</td>
      <td>${contenedor.numItems || 0}</td>
      <td>$${formatPrice(contenedor.precioTotal)}</td>
      <td>${contenedor.estado || 'Activo'}</td>
      <td>${fechaDisplay}</td>
      <td>${contenedor.usuario || 'N/A'}</td>
    `;
    contenedoresTableBody.appendChild(tr);

    if (expandedRows.has(contenedor.docId)) {
      const detailRow = document.createElement('tr');
      detailRow.className = 'item-details';
      detailRow.style.display = 'table-row';
      detailRow.innerHTML = `
        <td colspan="9">
          <table>
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Descripción</th>
                <th>Ideal</th>
                <th>Cantidad</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              ${contenedor.items.length > 0 ? contenedor.items.map(item => `
                <tr>
                  <td>${item.referencia || 'N/A'}</td>
                  <td>${item.descripcion || 'N/A'}</td>
                  <td>${item.ideal || '0'}</td>
                  <td>${item.cantidad || '0'}</td>
                  <td>$${formatPrice(item.precio) || '0'}</td>
                </tr>
              `).join('') : '<tr><td colspan="5">No hay ítems registrados</td></tr>'}
            </tbody>
          </table>
        </td>
      `;
      contenedoresTableBody.appendChild(detailRow);
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

async function loadLogs(contenedorId) {
  try {
    const logsCollection = collection(db, 'contenedores', contenedorId, 'logs');
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

function openEditModal(contenedor) {
  currentEditId = contenedor.docId;
  editNombreContenedorInput.value = contenedor.nombreContenedor || '';
  editProveedorInput.value = contenedor.proveedor || '';
  editPrecioTotalInput.value = formatPrice(contenedor.precioTotal) || '';
  editEstadoActivo.checked = contenedor.estado === 'Activo';
  editEstadoInactivo.checked = contenedor.estado === 'Inactivo';
  itemsContainer.innerHTML = '';

  const validItems = contenedor.items.filter(item =>
    item &&
    (item.referencia || item.descripcion) &&
    typeof item.cantidad !== 'undefined' &&
    typeof item.precio !== 'undefined'
  );
  validItems.forEach(item => addItemRow(item));

  if (validItems.length === 0) addItemRow();

  showModal(editModal);
}

async function exportToExcel() {
  const exportData = contenedores.map(contenedor => ({
    ID: contenedor.contenedorId || 'N/A',
    'Nombre del Contenedor': contenedor.nombreContenedor || 'N/A',
    Proveedor: contenedor.proveedor || 'N/A',
    'N° Ítems': contenedor.numItems || 0,
    'Precio Total': formatPrice(contenedor.precioTotal || 0),
    Estado: contenedor.estado || 'Activo',
    'Fecha de Creación': contenedor.fechaCreacion && typeof contenedor.fechaCreacion.toDate === 'function'
      ? contenedor.fechaCreacion.toDate().toLocaleString('es-ES')
      : contenedor.fechaCreacion instanceof Date
        ? contenedor.fechaCreacion.toLocaleString('es-ES')
        : 'Sin fecha',
    usuario: contenedor.usuario || 'N/A',
    Ítems: contenedor.items.length > 0
      ? contenedor.items.map(item => `Ref: ${item.referencia || 'N/A'}, Desc: ${item.descripcion || 'N/A'}, Ideal: ${item.ideal || '0'}, Cant: ${item.cantidad || 0}, Precio: $${formatPrice(item.precio || 0)}`).join('; ')
      : 'No hay ítems'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contenedores');
  XLSX.writeFile(workbook, 'Contenedores.xlsx');
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
    const contenedoresCollection = collection(db, 'contenedores');
    const querySnapshot = await getDocs(contenedoresCollection);
    const batch = writeBatch(db);
    let updatedCount = 0;

    querySnapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const updatedItems = data.items.map(item => updateItemFromReferencia(item, referencias));
      if (JSON.stringify(data.items) !== JSON.stringify(updatedItems)) {
        batch.update(docSnapshot.ref, { items: updatedItems });
        const logRef = doc(db, 'contenedores', docSnapshot.id, 'logs', `log_${Date.now()}`);
        batch.set(logRef, {
          action: 'modified',
          details: `Contenedor "${data.nombreContenedor}" actualizado desde referencias`,
          timestamp: new Date(),
          usuario: 'Sistema Automático',
          uid: 'system'
        });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      await loadContenedores();
      showSuccessMessage(`Se actualizaron ${updatedCount} contenedores desde la colección de referencias`);
    }
  } catch (error) {
    showSuccessMessage('Error al actualizar contenedores desde referencias: ' + error.message, false);
  }
}

async function init() {
  const librariesLoaded = await loadLibraries();

  const container = document.querySelector('.contenedores-container');
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
      const hasAccess = userData.role === 'Administrador' || (userData.permissions && userData.permissions.includes('Implantes:Contenedores'));
      if (!hasAccess) {
        container.innerHTML = '<p>Acceso no autorizado. No tienes permisos para acceder a este módulo.</p>';
        return;
      }
      await setupProveedorAutocomplete('proveedor', 'proveedor-suggestions');
      await setupProveedorAutocomplete('edit-proveedor', 'edit-proveedor-suggestions');
      await loadContenedores();
      await updateAllRecordsFromReferencias();

      if (!librariesLoaded) {
        console.warn('La funcionalidad de PDF no estará disponible debido a errores en las librerías.');
      }

      registrarBtn.addEventListener('click', async () => {
        const nombreContenedor = nombreContenedorInput.value.trim();
        const proveedor = proveedorInput.value.trim();
        if (!nombreContenedor || !proveedor) {
          showSuccessMessage('Por favor, completa todos los campos', false);
          return;
        }

        try {
          showModal(registerModal, registerProgress, 0);
          const duplicateCheck = await checkDuplicate(nombreContenedor);
          if (duplicateCheck.isDuplicate) {
            showSuccessMessage(`Error: Ya existe un contenedor con el nombre "${duplicateCheck.value}"`, false);
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
          const contenedorId = await getNextContenedorId();
          const fechaCreacion = new Date();

          const contenedorRef = doc(collection(db, 'contenedores'));
          const contenedorData = {
            contenedorId,
            nombreContenedor,
            proveedor,
            items: [],
            precioTotal: 0,
            estado: 'Activo',
            fechaCreacion,
            usuario: fullName,
            uid: user.uid
          };

          const batch = writeBatch(db);
          batch.set(contenedorRef, contenedorData);
          const logRef = doc(collection(db, 'contenedores', contenedorRef.id, 'logs'));
          batch.set(logRef, {
            action: 'created',
            details: `Contenedor "${nombreContenedor}" creado`,
            timestamp: new Date(),
            usuario: fullName,
            uid: user.uid
          });

          await batch.commit();
          showModal(registerModal, registerProgress, 100);
          setTimeout(() => {
            hideModal(registerModal);
            showSuccessMessage('Contenedor registrado exitosamente');
            nombreContenedorInput.value = '';
            proveedorInput.value = '';
            contenedores.push({ docId: contenedorRef.id, ...contenedorData, numItems: 0 });
            renderTable();
          }, 300);
        } catch (error) {
          showSuccessMessage('Error al registrar el contenedor: ' + error.message, false);
          hideModal(registerModal);
        }
      });

      addItemBtn.addEventListener('click', () => addItemRow());

      saveEditBtn.addEventListener('click', async () => {
        const nombreContenedor = editNombreContenedorInput.value.trim();
        const proveedor = editProveedorInput.value.trim();
        const items = Array.from(itemsContainer.querySelectorAll('.item-row')).map(row => ({
          referencia: row.querySelector('.item-referencia').value.trim(),
          descripcion: row.querySelector('.item-descripcion').value.trim(),
          ideal: parseInt(row.querySelector('.item-ideal').value) || 0,
          cantidad: parseInt(row.querySelector('.item-cantidad').value) || 1,
          precio: parsePrice(row.querySelector('.item-precio').value)
        })).filter(item => item.referencia && item.descripcion && item.cantidad > 0 && item.precio >= 0);
        const precioTotal = parsePrice(editPrecioTotalInput.value);

        if (!nombreContenedor || !proveedor || items.length === 0 || precioTotal < 0) {
          showSuccessMessage('Por favor, completa todos los campos correctamente', false);
          return;
        }

        try {
          const duplicateCheck = await checkDuplicate(nombreContenedor, currentEditId);
          if (duplicateCheck.isDuplicate) {
            showSuccessMessage(`Error: Ya existe un contenedor con el nombre "${duplicateCheck.value}"`, false);
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
          const contenedorRef = doc(db, 'contenedores', currentEditId);
          const currentContenedor = contenedores.find(p => p.docId === currentEditId);
          const contenedorData = {
            contenedorId: currentContenedor.contenedorId,
            nombreContenedor,
            proveedor,
            items,
            precioTotal,
            estado: editEstadoActivo.checked ? 'Activo' : 'Inactivo',
            usuario: fullName,
            uid: user.uid,
            fechaCreacion: currentContenedor.fechaCreacion
          };

          const batch = writeBatch(db);
          batch.set(contenedorRef, contenedorData);
          const logRef = doc(collection(db, 'contenedores', currentEditId, 'logs'));
          batch.set(logRef, {
            action: 'modified',
            details: `Contenedor "${nombreContenedor}" modificado`,
            timestamp: new Date(),
            usuario: fullName,
            uid: user.uid
          });

          await batch.commit();
          showSuccessMessage('Contenedor actualizado exitosamente');
          hideModal(editModal);
          const index = contenedores.findIndex(p => p.docId === currentEditId);
          contenedores[index] = { docId: currentEditId, ...contenedorData, numItems: items.length };
          renderTable();
        } catch (error) {
          showSuccessMessage('Error al actualizar contenedor: ' + error.message, false);
        }
      });

      cancelEditBtn.addEventListener('click', () => {
        hideModal(editModal);
        itemsContainer.innerHTML = '';
      });

      contenedoresTableBody.addEventListener('click', async e => {
        const id = e.target.dataset.id;
        if (!id) return;

        if (e.target.classList.contains('fa-edit')) {
          const contenedor = contenedores.find(p => p.docId === id);
          if (contenedor) openEditModal(contenedor);
        } else if (e.target.classList.contains('fa-trash')) {
          const contenedor = contenedores.find(p => p.docId === id);
          if (contenedor) {
            deleteMessage.textContent = `¿Estás seguro de que deseas eliminar el contenedor "${contenedor.nombreContenedor}"?`;
            showModal(deleteModal);
            confirmDeleteBtn.onclick = async () => {
              try {
                const user = auth.currentUser;
                if (!user) throw new Error('Usuario no autenticado');
                const fullName = await getUserFullName();
                const batch = writeBatch(db);
                batch.delete(doc(db, 'contenedores', id));
                const logRef = doc(collection(db, 'contenedores', id, 'logs'));
                batch.set(logRef, {
                  action: 'deleted',
                  details: `Contenedor "${contenedor.nombreContenedor}" eliminado`,
                  timestamp: new Date(),
                  usuario: fullName,
                  uid: user.uid
                });
                await batch.commit();
                showSuccessMessage('Contenedor eliminado exitosamente');
                hideModal(deleteModal);
                contenedores = contenedores.filter(p => p.docId !== id);
                renderTable();
                updatePagination();
              } catch (error) {
                showSuccessMessage('Error al eliminar contenedor: ' + error.message, false);
                hideModal(deleteModal);
              }
            };
            cancelDeleteBtn.onclick = () => hideModal(deleteModal);
          }
        } else if (e.target.classList.contains('fa-history')) {
          await loadLogs(id);
        } else if (e.target.classList.contains('fa-file-pdf')) {
          generatePDF(id);
        } else if (e.target.classList.contains('nombre-contenedor')) {
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
          await loadContenedores();
        }
      });

      nextBtn.addEventListener('click', async () => {
        if (currentPage < totalPages) {
          currentPage++;
          await loadContenedores();
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
          inputContainer.style.left = `${e.target.offsetLeft}px`;
          inputContainer.style.top = `${e.target.offsetTop + e.target.offsetHeight}px`;
          const input = document.createElement('input');
          input.type = 'text';
          input.placeholder = `Filtrar por ${column}`;
          input.addEventListener('input', () => {
            filters[column] = input.value.trim();
            renderTable();
          });
          inputContainer.appendChild(input);
          e.target.parentElement.appendChild(inputContainer);
          input.focus();
          document.addEventListener('click', function closeFilter(e) {
            if (!inputContainer.contains(e.target) && !e.target.classList.contains('filter-icon')) {
              inputContainer.remove();
              document.removeEventListener('click', closeFilter);
            }
          });
        });
      });

      document.addEventListener('moduleCleanup', () => {
        contenedores = [];
        currentPage = 1;
        lastVisible = null;
        firstVisible = null;
        totalPages = 1;
        filters = {};
        lastContenedorId = 0;
        expandedRows.clear();
        referenciasCache = null;
      });

      editModal.addEventListener('click', e => {
        if (e.target === editModal) hideModal(editModal);
      });

      deleteModal.addEventListener('click', e => {
        if (e.target === deleteModal) hideModal(deleteModal);
      });

      logModal.addEventListener('click', e => {
        if (e.target === logModal) hideModal(logModal);
      });

      registerModal.addEventListener('click', e => {
        if (e.target === registerModal) hideModal(registerModal);
      });

      successModal.addEventListener('click', e => {
        if (e.target === successModal) hideModal(successModal);
      });

      loadingModal.addEventListener('click', e => {
        if (e.target === loadingModal) hideModal(loadingModal);
      });

      window.addEventListener('beforeunload', () => {
        const event = new CustomEvent('moduleCleanup');
        document.dispatchEvent(event);
      });
    } catch (error) {
      container.innerHTML = `<p>Error al inicializar el módulo: ${error.message}</p>`;
    }
  });
}

init();