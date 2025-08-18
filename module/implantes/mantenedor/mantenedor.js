import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, startAfter, where, getDoc, writeBatch, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import * as XLSX from 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

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
  throw error;
}

const auth = getAuth(app);
const db = getFirestore(app);

async function configurePersistence() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    throw error;
  }
}

async function normalizeData() {
  const mantenedorRef = collection(db, 'mantenedor');
  const snapshot = await getDocs(mantenedorRef);
  const batch = writeBatch(db);
  let changesMade = false;

  snapshot.forEach(docSnapshot => {
    const data = docSnapshot.data();
    let updates = {};
    if (data.referencia && typeof data.referencia === 'string') {
      const trimmedReferencia = data.referencia.trim();
      if (trimmedReferencia !== data.referencia) {
        updates.referencia = trimmedReferencia;
        changesMade = true;
      }
      if (!data.referenciaLowerCase || data.referenciaLowerCase !== trimmedReferencia.toLowerCase()) {
        updates.referenciaLowerCase = trimmedReferencia.toLowerCase();
        changesMade = true;
      }
    }
    if (data.proveedor && typeof data.proveedor === 'string') {
      const trimmedProveedor = data.proveedor.trim();
      if (trimmedProveedor !== data.proveedor) {
        updates.proveedor = trimmedProveedor;
        changesMade = true;
      }
      if (!data.proveedorLowerCase || data.proveedorLowerCase !== trimmedProveedor.toLowerCase()) {
        updates.proveedorLowerCase = trimmedProveedor.toLowerCase();
        changesMade = true;
      }
    }
    if (data.descripcion && typeof data.descripcion === 'string') {
      const trimmedDescripcion = data.descripcion.trim();
      if (trimmedDescripcion !== data.descripcion) {
        updates.descripcion = trimmedDescripcion;
        changesMade = true;
      }
      if (!data.descripcionLowerCase || data.descripcionLowerCase !== trimmedDescripcion.toLowerCase()) {
        updates.descripcionLowerCase = trimmedDescripcion.toLowerCase();
        changesMade = true;
      }
    }
    if (data.codigo && typeof data.codigo === 'string') {
      const trimmedCodigo = data.codigo.trim();
      if (trimmedCodigo !== data.codigo) {
        updates.codigo = trimmedCodigo;
        changesMade = true;
      }
      if (!data.codigoLowerCase || data.codigoLowerCase !== trimmedCodigo.toLowerCase()) {
        updates.codigoLowerCase = trimmedCodigo.toLowerCase();
        changesMade = true;
      }
    }
    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, 'mantenedor', docSnapshot.id), updates);
    }
  });

  if (changesMade) {
    try {
      await batch.commit();
    } catch (error) {
      throw error;
    }
  }
}

const referenciaInput = document.getElementById('referencia');
const codigoInput = document.getElementById('codigo');
const descripcionInput = document.getElementById('descripcion');
const precioInput = document.getElementById('precio');
const proveedorInput = document.getElementById('proveedor');
const registrarBtn = document.getElementById('registrar-btn');
const referenciaSuggestions = document.getElementById('referencia-suggestions');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const deliveryModal = document.getElementById('delivery-modal');
const deliveryDetails = document.getElementById('delivery-details');
const deliveryQuantity = document.getElementById('delivery-quantity');
const confirmDeliveryBtn = document.getElementById('confirm-delivery-btn');
const cancelDeliveryBtn = document.getElementById('cancel-delivery-btn');
const mantenedorTableBody = document.querySelector('#mantenedor-table-body');
const tableContainer = document.getElementById('table-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const pageInfo = document.getElementById('page-info');
const totalRecords = document.getElementById('total-records');
const logModal = document.getElementById('log-modal');
const logContent = document.getElementById('log-content');
const closeLogBtn = document.getElementById('close-log-btn');
const totalSumElement = document.getElementById('total-sum');
const clearFiltersBtn = document.getElementById('clear-filters-btn');

let currentPage = 1;
const recordsPerPage = 50;
let lastVisible = null;
let firstVisible = null;
let totalPages = 1;
let mantenedores = [];
let allMantenedores = [];
let currentEditId = null;
let filters = {};
let lastMantenedorId = 0;
let expandedRows = new Set();
let referenciasCache = null;
let scanner = null;

function formatPrice(number) {
  if (!number && number !== 0) return '';
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[^0-9]/g, '');
  return parseInt(cleaned) || 0;
}

function formatDate(dateObj) {
  if (!dateObj) return 'N/A';
  if (typeof dateObj.toDate === 'function') {
    const date = dateObj.toDate();
    return date && !isNaN(date) ? date.toLocaleDateString('es-ES') : 'N/A';
  }
  if (dateObj instanceof Date && !isNaN(dateObj)) {
    return dateObj.toLocaleDateString('es-ES');
  }
  const parsedDate = new Date(dateObj);
  return parsedDate && !isNaN(parsedDate) ? parsedDate.toLocaleDateString('es-ES') : 'N/A';
}

function formatDateTime(dateObj) {
  if (!dateObj) return 'N/A';
  if (typeof dateObj.toDate === 'function') {
    const date = dateObj.toDate();
    return date && !isNaN(date) ? date.toLocaleString('es-ES') : 'N/A';
  }
  if (dateObj instanceof Date && !isNaN(dateObj)) {
    return dateObj.toLocaleString('es-ES');
  }
  const parsedDate = new Date(dateObj);
  return parsedDate && !isNaN(parsedDate) ? parsedDate.toLocaleString('es-ES') : 'N/A';
}

async function getUserFullName() {
  const user = auth.currentUser;
  if (!user) throw new Error('No se encontró el usuario autenticado');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
  return userSnap.data().fullName || 'Usuario Desconocido';
}

async function checkDuplicate(referencia, excludeDocId = null) {
  const mantenedoresCollection = collection(db, 'mantenedor');
  const refQuery = query(mantenedoresCollection, where('referenciaLowerCase', '==', referencia.trim().toLowerCase()));
  const querySnapshot = await getDocs(refQuery);
  if (!querySnapshot.empty) {
    const existingDoc = querySnapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isExists: true, field: 'referencia', value: referencia };
  }
  return { isExists: false };
}

async function getNextMantenedorId() {
  if (lastMantenedorId > 0) {
    lastMantenedorId++;
    return lastMantenedorId.toString().padStart(6, '0');
  }
  const mantenedoresCollection = collection(db, 'mantenedor');
  const queryRef = query(mantenedoresCollection, orderBy('mantenedorId', 'desc'), limit(1));
  const querySnapshot = await getDocs(queryRef);
  let nextId = 1;
  if (!querySnapshot.empty) {
    const lastMantenedor = querySnapshot.docs[0].data();
    nextId = parseInt(lastMantenedor.mantenedorId || 0) + 1;
  }
  lastMantenedorId = nextId;
  return nextId.toString().padStart(6, '0');
}

async function getNextTransitoId() {
  const transitoCollection = collection(db, 'transito');
  const queryRef = query(transitoCollection, orderBy('transitoId', 'desc'), limit(1));
  const querySnapshot = await getDocs(queryRef);
  let nextId = 1;
  if (!querySnapshot.empty) {
    const lastTransito = querySnapshot.docs[0].data();
    nextId = parseInt(lastTransito.transitoId || 0) + 1;
  }
  return nextId.toString().padStart(6, '0');
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
  setTimeout(() => hideModal(successModal), 7000);
}

function addItemRow(item = { lote: '', fechaVencimiento: '', cantidad: 0, entregado: false }, container) {
  if (!container) {
    showSuccessMessage('Error: Contenedor de ítems no encontrado', false);
    return;
  }
  const divItem = document.createElement('div');
  divItem.className = 'item-row';
  const fechaVencimiento = item.fechaVencimiento ? new Date(item.fechaVencimiento).toISOString().split('T')[0] : '';
  divItem.innerHTML = `
    <input type="text" class="item-lote" placeholder="Lote" value="${item.lote || ''}" autocomplete="off">
    <input type="date" class="item-fecha-vencimiento" placeholder="Fecha de Vencimiento" value="${fechaVencimiento}">
    <input type="number" class="item-cantidad" placeholder="Cantidad" min="0" step="1" value="${item.cantidad || 0}" autocomplete="off">
    <button class="scan-item-btn"><i class="fas fa-qrcode"></i></button>
    <button class="remove-item-btn"><i class="fas fa-trash"></i></button>
  `;
  container.appendChild(divItem);
  divItem.querySelector('.remove-item-btn').addEventListener('click', () => divItem.remove());
  divItem.querySelector('.scan-item-btn').addEventListener('click', () => initBarcodeScanner(divItem));
}

async function initBarcodeScanner(itemRow) {
  const barcodeScannerModal = document.getElementById('barcodeScanner');
  const scannerContainer = document.getElementById('scanner-container');
  const scannerResult = document.getElementById('scanner-result');
  const closeScannerBtn = document.getElementById('close-scanner');

  if (!barcodeScannerModal || !scannerContainer || !scannerResult || !closeScannerBtn) {
    showSuccessMessage('Error: Configuración del escáner no encontrada', false);
    return;
  }

  try {
    Dynamsoft.DBR.BarcodeReader.license = 'DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==';
    showModal(barcodeScannerModal);
    scanner = await Dynamsoft.DBR.BarcodeScanner.createInstance();
    scanner.onFrameRead = results => {
      if (results.length > 0) {
        const result = results[0];
        const barcodeText = result.barcodeText;
        const [lote, fecha] = barcodeText.split('|');
        itemRow.querySelector('.item-lote').value = lote || '';
        itemRow.querySelector('.item-fecha-vencimiento').value = fecha || '';
        scannerResult.textContent = `Lote: ${lote || 'N/A'}, Fecha: ${fecha || 'N/A'}`;
        scanner.hide();
        hideModal(barcodeScannerModal);
      }
    };
    await scanner.show();
  } catch (ex) {
    showSuccessMessage('Error al iniciar el escáner. Asegúrate de usar HTTPS y permitir el acceso a la cámara.', false);
    hideModal(barcodeScannerModal);
  }

  closeScannerBtn.addEventListener('click', async () => {
    if (scanner) {
      await scanner.hide();
      hideModal(barcodeScannerModal);
    }
  }, { once: true });
}

async function handleDelivery(mantenedorId, itemIndex, quantityToDeliver) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');
    const fullName = await getUserFullName();
    const mantenedorRef = doc(db, 'mantenedor', mantenedorId);
    const batch = writeBatch(db);

    const mantenedor = mantenedores.find(p => p.docId === mantenedorId);
    if (!mantenedor || !mantenedor.items[itemIndex]) {
      throw new Error('Ítem no encontrado');
    }

    const itemToDeliver = mantenedor.items[itemIndex];
    if (quantityToDeliver < 1 || quantityToDeliver > itemToDeliver.cantidad) {
      throw new Error(`Cantidad inválida: debe ser entre 1 y ${itemToDeliver.cantidad}`);
    }

    let updatedItems = [...mantenedor.items];
    if (quantityToDeliver === itemToDeliver.cantidad) {
      updatedItems = mantenedor.items.filter((_, index) => index !== itemIndex);
    } else {
      updatedItems[itemIndex] = {
        ...itemToDeliver,
        cantidad: itemToDeliver.cantidad - quantityToDeliver
      };
    }
    const cantidad = updatedItems.reduce((sum, item) => sum + (item.entregado ? 0 : item.cantidad), 0);
    const precioTotal = mantenedor.precio * cantidad;

    batch.update(mantenedorRef, {
      items: updatedItems,
      cantidad,
      precioTotal
    });

    const mantenedorLogRef = doc(collection(db, 'mantenedor', mantenedorId, 'logs'));
    batch.set(mantenedorLogRef, {
      action: 'modified',
      details: `Trasladadas ${quantityToDeliver} unidades del ítem con lote "${itemToDeliver.lote}" a Tránsito`,
      timestamp: new Date(),
      usuario: fullName,
      uid: user.uid
    });

    const transitoQuery = query(
      collection(db, 'transito'),
      where('referencia', '==', mantenedor.referencia),
      where('estado', '==', 'Entregado')
    );
    const transitoSnapshot = await getDocs(transitoQuery);
    let transitoRef, transitoData;

    if (!transitoSnapshot.empty) {
      transitoRef = doc(db, 'transito', transitoSnapshot.docs[0].id);
      const existingTransito = transitoSnapshot.docs[0].data();
      transitoData = {
        ...existingTransito,
        items: [
          ...existingTransito.items,
          {
            lote: itemToDeliver.lote,
            fechaVencimiento: itemToDeliver.fechaVencimiento,
            cantidad: quantityToDeliver,
            entregado: true,
            fechaTraspaso: new Date()
          }
        ],
        cantidad: existingTransito.cantidad + quantityToDeliver,
        fechaActualizacion: new Date(),
        usuario: fullName,
        uid: user.uid
      };
      batch.update(transitoRef, transitoData);
    } else {
      const transitoId = await getNextTransitoId();
      transitoRef = doc(collection(db, 'transito'));
      transitoData = {
        transitoId,
        referencia: mantenedor.referencia,
        codigo: mantenedor.codigo,
        descripcion: mantenedor.descripcion,
        proveedor: mantenedor.proveedor,
        precio: mantenedor.precio,
        items: [{
          lote: itemToDeliver.lote,
          fechaVencimiento: itemToDeliver.fechaVencimiento,
          cantidad: quantityToDeliver,
          entregado: true,
          fechaTraspaso: new Date()
        }],
        cantidad: quantityToDeliver,
        estado: 'Entregado',
        fechaActualizacion: new Date(),
        usuario: fullName,
        uid: user.uid
      };
      batch.set(transitoRef, transitoData);
    }

    const transitoLogRef = doc(collection(db, 'transito', transitoRef.id, 'logs'));
    batch.set(transitoLogRef, {
      action: transitoSnapshot.empty ? 'created' : 'modified',
      details: `Recibidas ${quantityToDeliver} unidades del ítem con lote "${itemToDeliver.lote}" desde Mantenedor`,
      timestamp: new Date(),
      usuario: fullName,
      uid: user.uid
    });

    await batch.commit();

    mantenedor.items = updatedItems;
    mantenedor.cantidad = cantidad;
    mantenedor.precioTotal = precioTotal;

    showSuccessMessage(`${quantityToDeliver} unidades trasladadas a Tránsito`);
    renderTable();
  } catch (error) {
    showSuccessMessage('Error al trasladar ítem: ' + error.message, false);
  }
}

async function loadReferencias() {
  if (referenciasCache) {
    return referenciasCache;
  }
  try {
    const referenciasCollection = collection(db, 'referencias');
    const queryRef = query(referenciasCollection, where('estado', '==', 'Activo'));
    const querySnapshot = await getDocs(queryRef);
    referenciasCache = querySnapshot.docs.map(docData => docData.data());
    if (referenciasCache.length === 0) {
      showSuccessMessage('No hay referencias activas disponibles', false);
    }
    return referenciasCache;
  } catch (error) {
    showSuccessMessage('Error al cargar referencias: ' + error.message, false);
    return [];
  }
}

async function setupReferenciaAutocomplete(inputElement, suggestionsListElement) {
  const input = inputElement instanceof HTMLElement ? inputElement : document.getElementById(inputElement);
  const suggestionsList = suggestionsListElement instanceof HTMLElement ? suggestionsListElement : document.getElementById(suggestionsListElement);
  const icon = input?.parentElement.querySelector('.icon-list');
  
  if (!input || !suggestionsList || !icon) {
    showSuccessMessage('Error: Configuración de autocompletado no encontrada', false);
    return;
  }

  const referencias = await loadReferencias();
  const referenciasFiltradas = referencias.map(r => r.referencia);

  input.addEventListener('input', () => {
    const inputValue = input.value.trim();
    filterAndRenderReferenciaSuggestions(input, suggestionsList, referenciasFiltradas, false);
    suggestionsList.style.display = inputValue ? 'block' : 'none';
  });

  input.addEventListener('focus', () => {
    const inputValue = input.value.trim();
    filterAndRenderReferenciaSuggestions(input, suggestionsList, referenciasFiltradas, inputValue === '');
    suggestionsList.style.display = 'block';
  });

  icon.addEventListener('click', () => {
    filterAndRenderReferenciaSuggestions(input, suggestionsList, referenciasFiltradas, true);
    suggestionsList.style.display = 'block';
    input.focus();
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestionsList.contains(e.target) && !icon.contains(e.target)) {
      suggestionsList.innerHTML = '';
      suggestionsList.style.display = 'none';
    }
  });
}

function filterAndRenderReferenciaSuggestions(input, suggestionsList, referencias, showAll = false) {
  suggestionsList.innerHTML = '';
  const inputValue = input.value.trim().toLowerCase();
  const filteredReferencias = showAll ? referencias : referencias.filter(ref => ref.toLowerCase().includes(inputValue));
  
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
      updateFieldsFromReferencia(input);
    });
    suggestionsList.appendChild(li);
  });
  suggestionsList.style.display = filteredReferencias.length > 0 ? 'block' : 'none';
  suggestionsList.style.visibility = 'visible';
}

async function updateFieldsFromReferencia(input) {
  try {
    const referencia = input.value.trim();
    const referencias = await loadReferencias();
    const referenciaData = referencias.find(r => r.referencia === referencia);
    if (referenciaData && input.id === 'referencia') {
      codigoInput.value = referenciaData.codigo || '';
      descripcionInput.value = referenciaData.descripcion || '';
      precioInput.value = formatPrice(referenciaData.precio) || '0';
      proveedorInput.value = referenciaData.proveedor || '';
    } else if (input.id === 'referencia') {
      codigoInput.value = '';
      descripcionInput.value = '';
      precioInput.value = '0';
      proveedorInput.value = '';
    }
    if (referenciaData && input.id === 'edit-referencia') {
      const editCodigo = document.getElementById('edit-codigo');
      const editDescripcion = document.getElementById('edit-descripcion');
      const editPrecio = document.getElementById('edit-precio');
      const editProveedor = document.getElementById('edit-proveedor');
      if (editCodigo) editCodigo.value = referenciaData.codigo || '';
      if (editDescripcion) editDescripcion.value = referenciaData.descripcion || '';
      if (editPrecio) editPrecio.value = formatPrice(referenciaData.precio) || '0';
      if (editProveedor) editProveedor.value = referenciaData.proveedor || '';
    } else if (input.id === 'edit-referencia') {
      const editCodigo = document.getElementById('edit-codigo');
      const editDescripcion = document.getElementById('edit-descripcion');
      const editPrecio = document.getElementById('edit-precio');
      const editProveedor = document.getElementById('edit-proveedor');
      if (editCodigo) editCodigo.value = '';
      if (editDescripcion) editDescripcion.value = '';
      if (editPrecio) editPrecio.value = '0';
      if (editProveedor) editProveedor.value = '';
    }
  } catch (error) {
    showSuccessMessage('Error al buscar referencia: ' + error.message, false);
  }
}

async function loadMantenedores() {
  try {
    showModal(loadingModal, loadingProgress, 0);
    const mantenedoresCollection = collection(db, 'mantenedor');
    const filterConstraints = [];

    const q = query(mantenedoresCollection, ...filterConstraints, orderBy('mantenedorId', 'asc'));
    const querySnapshot = await getDocs(q);
    allMantenedores = [];

    querySnapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const cantidad = data.items ? data.items.reduce((sum, item) => sum + (item.entregado ? 0 : item.cantidad), 0) : 0;
      const precioTotal = (data.precio || 0) * cantidad;
      allMantenedores.push({
        docId: docSnapshot.id,
        ...data,
        cantidad,
        precioTotal
      });
    });

    mantenedores = allMantenedores.filter(mantenedor => {
      return Object.keys(filters).every(column => {
        const filterValue = filters[column]?.trim().toLowerCase();
        if (!filterValue) return true;

        if (column === 'estado') {
          return mantenedor[column]?.toLowerCase() === filterValue;
        } else if (['precio', 'cantidad', 'precioTotal'].includes(column)) {
          const numericValue = parseFloat(filterValue);
          return !isNaN(numericValue) && mantenedor[column] === numericValue;
        } else {
          const fieldValue = mantenedor[`${column}LowerCase`] || 
                           (mantenedor[column] ? mantenedor[column].toString().toLowerCase() : '');
          return fieldValue.includes(filterValue);
        }
      });
    });

    if (mantenedores.length === 0 && Object.keys(filters).length > 0) {
      const filterDetails = Object.entries(filters)
        .map(([key, value]) => `${key}: "${value}"`)
        .join(', ');
      showSuccessMessage(`No se encontraron registros con los filtros: ${filterDetails}`, false);
    }

    const totalRecordsCount = mantenedores.length;
    totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
    totalPages = Math.ceil(totalRecordsCount / recordsPerPage);

    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    mantenedores = mantenedores.slice(startIndex, endIndex);

    renderTable();
    updatePagination();
    tableContainer.style.display = 'block';
    hideModal(loadingModal);
  } catch (error) {
    showSuccessMessage('Error al cargar registros: ' + error.message, false);
    hideModal(loadingModal);
  }
}

function updateTotalSum() {
  if (!totalSumElement) {
    return;
  }
  const totalSum = mantenedores.reduce((sum, mantenedor) => sum + (mantenedor.precioTotal || 0), 0);
  totalSumElement.textContent = `Total General: $${formatPrice(totalSum)}`;
}

function renderTable() {
  mantenedorTableBody.innerHTML = '';
  mantenedores.forEach(mantenedor => {
    const fechaCreacion = mantenedor.fechaCreacion && typeof mantenedor.fechaCreacion.toDate === 'function'
      ? mantenedor.fechaCreacion.toDate()
      : mantenedor.fechaCreacion instanceof Date
      ? mantenedor.fechaCreacion
      : null;
    const fechaDisplay = fechaCreacion && !isNaN(fechaCreacion)
      ? fechaCreacion.toLocaleString('es-ES')
      : 'Sin fecha';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${mantenedor.mantenedorId || 'N/A'}</td>
      <td>
        <i class="fas fa-edit action-icon" data-id="${mantenedor.docId}" title="Editar"></i>
        <i class="fas fa-trash action-icon" data-id="${mantenedor.docId}" title="Eliminar"></i>
        <i class="fas fa-history action-icon" data-id="${mantenedor.docId}" title="Historial"></i>
      </td>
      <td><span class="referencia" data-id="${mantenedor.docId}">${mantenedor.referencia || 'N/A'}</span></td>
      <td>${mantenedor.codigo || 'N/A'}</td>
      <td>${mantenedor.descripcion || 'N/A'}</td>
      <td>${mantenedor.proveedor || 'N/A'}</td>
      <td>${mantenedor.cantidad || 0}</td>
      <td>$${formatPrice(mantenedor?.precio || 0)}</td>
      <td>$${formatPrice(mantenedor?.precioTotal || 0)}</td>
      <td>${fechaDisplay}</td>
      <td>${mantenedor?.usuario || 'N/A'}</td>
      <td>${mantenedor?.estado || 'N/A'}</td>
    `;
    mantenedorTableBody.appendChild(tr);

    if (expandedRows.has(mantenedor.docId)) {
      const detailRow = document.createElement('tr');
      detailRow.className = 'item-details';
      detailRow.style.display = 'table-row';
      detailRow.innerHTML = `
        <td colspan="12">
          <table>
            <thead>
              <tr>
                <th>Lote</th>
                <th>Fecha de Vencimiento</th>
                <th>Cantidad</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              ${mantenedor.items && mantenedor.items.length > 0 ? mantenedor.items.map((item, index) => `
                <tr>
                  <td>${item?.lote || 'N/A'}</td>
                  <td>${item?.fechaVencimiento ? formatDate(item.fechaVencimiento) : 'N/A'}</td>
                  <td>${item?.cantidad || '0'}</td>
                  <td>
                    <button class="entregar-item-btn" data-mantenedor-id="${mantenedor.docId}" data-item-index="${index}" ${item?.entregado ? 'disabled' : ''}>
                      ${item?.entregado ? 'Entregado' : 'Entregar'}
                    </button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="4">No hay ítems registrados</td></tr>'}
            </tbody>
          </table>
        </td>
      `;
      mantenedorTableBody.appendChild(detailRow);
    }
  });

  document.querySelectorAll('.entregar-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mantenedorId = btn.dataset.mantenedorId;
      const itemIndex = parseInt(btn.dataset.itemIndex);
      const mantenedor = mantenedores.find(m => m.docId === mantenedorId);
      const item = mantenedor?.items?.[itemIndex];
      if (item) {
        deliveryDetails.textContent = `Lote: ${item.lote || 'N/A'}, Fecha de Vencimiento: ${formatDate(item.fechaVencimiento)}, Cantidad Disponible: ${item.cantidad || 0}`;
        deliveryQuantity.value = 1;
        deliveryQuantity.max = item.cantidad;
        deliveryQuantity.min = '1';
        showModal(deliveryModal);
        confirmDeliveryBtn.onclick = () => {
          const quantity = parseInt(deliveryQuantity.value);
          if (quantity >= 1 && quantity <= item.cantidad) {
            handleDelivery(mantenedorId, itemIndex, quantity);
            hideModal(deliveryModal);
          } else {
            showSuccessMessage(`La cantidad debe estar entre 1 y ${item.cantidad}`, false);
          }
        };
        cancelDeliveryBtn.onclick = () => hideModal(deliveryModal);
      }
    });
  });

  updateTotalSum();
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function setupFilters() {
  const filterIcons = document.querySelectorAll('.filter-icon');
  let activeFilter = null;

  filterIcons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const column = icon.dataset.column;
      const th = icon.closest('th');

      if (activeFilter && activeFilter !== icon) {
        const existingContainer = tableContainer.querySelector('.filter-input-container');
        if (existingContainer) {
          existingContainer.remove();
          if (!filters[activeFilter.dataset.column]) {
            activeFilter.classList.remove('fa-filter-circle-xmark', 'active');
            activeFilter.classList.add('fa-filter');
          }
        }
      }

      const existingContainer = tableContainer.querySelector('.filter-input-container');
      if (existingContainer && existingContainer.dataset.column === column) {
        existingContainer.remove();
        if (!filters[column]) {
          icon.classList.remove('fa-filter-circle-xmark', 'active');
          icon.classList.add('fa-filter');
        }
        if (activeFilter === icon) {
          activeFilter = null;
          return;
        }
      }

      const filterContainer = document.createElement('div');
      filterContainer.className = 'filter-input-container';
      filterContainer.dataset.column = column;
      let inputElement;

      if (column === 'estado') {
        inputElement = document.createElement('select');
        inputElement.innerHTML = `
          <option value="">Todos</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        `;
        inputElement.value = filters[column] || '';
      } else if (['precio', 'cantidad', 'precioTotal'].includes(column)) {
        inputElement = document.createElement('input');
        inputElement.type = 'number';
        inputElement.placeholder = `Filtrar ${column}`;
        inputElement.min = '0';
        inputElement.value = filters[column] || '';
      } else {
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.placeholder = `Filtrar ${column}`;
        inputElement.value = filters[column] || '';
      }

      inputElement.dataset.column = column;
      filterContainer.appendChild(inputElement);
      tableContainer.appendChild(filterContainer);
      icon.classList.remove('fa-filter');
      icon.classList.add('fa-filter-circle-xmark', 'active');
      activeFilter = icon;

      const thRect = th.getBoundingClientRect();
      const tableContainerRect = tableContainer.getBoundingClientRect();
      const scrollLeft = tableContainer.scrollLeft;
      filterContainer.style.position = 'absolute';
      filterContainer.style.top = `${thRect.bottom - tableContainerRect.top}px`;
      filterContainer.style.left = `${th.offsetLeft - scrollLeft}px`;
      filterContainer.style.width = `${th.offsetWidth - 12}px`;
      inputElement.style.width = '100%';
      inputElement.focus();

      const applyFilter = debounce(() => {
        const filterValue = inputElement.tagName === 'SELECT' ? inputElement.value : inputElement.value.trim();
        if (filterValue) {
          filters[column] = filterValue;
          icon.classList.remove('fa-filter');
          icon.classList.add('fa-filter-circle-xmark', 'active');
        } else {
          delete filters[column];
          icon.classList.remove('fa-filter-circle-xmark', 'active');
          icon.classList.add('fa-filter');
        }
        currentPage = 1;
        loadMantenedores();
      }, 300);

      if (inputElement.tagName === 'SELECT') {
        inputElement.addEventListener('change', applyFilter);
      } else {
        inputElement.addEventListener('input', applyFilter);
        inputElement.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            applyFilter();
          }
        });
      }

      const handleClickOutside = (event) => {
        if (!filterContainer.contains(event.target) && !icon.contains(event.target)) {
          filterContainer.remove();
          if (!filters[column]) {
            icon.classList.remove('fa-filter-circle-xmark', 'active');
            icon.classList.add('fa-filter');
          }
          activeFilter = null;
          document.removeEventListener('click', handleClickOutside);
        }
      };

      document.addEventListener('click', handleClickOutside);
    });
  });

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      filters = {};
      document.querySelectorAll('.filter-input-container').forEach(container => container.remove());
      document.querySelectorAll('.filter-icon').forEach(icon => {
        icon.classList.remove('fa-filter-circle-xmark', 'active');
        icon.classList.add('fa-filter');
      });
      activeFilter = null;
      currentPage = 1;
      loadMantenedores();
    });
  }
}

function updatePagination() {
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

async function exportToExcel() {
  try {
    const data = mantenedores.map(mantenedor => ({
      ID: mantenedor.mantenedorId || 'N/A',
      Referencia: mantenedor.referencia || 'N/A',
      Código: mantenedor.codigo || 'N/A',
      Descripción: mantenedor.descripcion || 'N/A',
      Proveedor: mantenedor.proveedor || 'N/A',
      Cantidad: mantenedor.cantidad || 0,
      Precio: formatPrice(mantenedor.precio) || '0',
      'Precio Total': formatPrice(mantenedor.precioTotal) || '0',
      'Fecha Creación': formatDate(mantenedor.fechaCreacion) || 'N/A',
      Usuario: mantenedor.usuario || 'N/A',
      Estado: mantenedor.estado || 'N/A'
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mantenedores');
    XLSX.writeFile(workbook, 'mantenedores.xlsx');
  } catch (error) {
    showSuccessMessage('Error al exportar a Excel: ' + error.message, false);
  }
}

async function showEditModal(mantenedorId) {
  try {
    const mantenedor = mantenedores.find(m => m.docId === mantenedorId);
    if (!mantenedor) {
      showSuccessMessage('Registro no encontrado', false);
      return;
    }
    const modalContent = editModal.querySelector('.modal-content');
    modalContent.innerHTML = `
      <h2>Editar Registro</h2>
      <div class="edit-form-container">
        <div class="edit-form-grid">
          <div class="form-group">
            <label for="edit-referencia">Referencia</label>
            <div class="input-with-icon">
              <input type="text" id="edit-referencia" value="${mantenedor.referencia || ''}" autocomplete="off">
              <i class="fas fa-list icon-list"></i>
            </div>
            <ul id="edit-referencia-suggestions" class="suggestions-list"></ul>
          </div>
          <div class="form-group">
            <label for="edit-codigo">Código</label>
            <input type="text" id="edit-codigo" value="${mantenedor.codigo || ''}" readonly>
          </div>
          <div class="form-group">
            <label for="edit-descripcion">Descripción</label>
            <input type="text" id="edit-descripcion" value="${mantenedor.descripcion || ''}" readonly>
          </div>
          <div class="form-group">
            <label for="edit-proveedor">Proveedor</label>
            <input type="text" id="edit-proveedor" value="${mantenedor.proveedor || ''}" readonly>
          </div>
          <div class="form-group">
            <label for="edit-precio">Precio</label>
            <input type="text" id="edit-precio" value="${formatPrice(mantenedor.precio) || '0'}" readonly>
          </div>
          <div class="form-group estado-container">
            <label><input type="radio" name="estado" value="Activo" ${mantenedor.estado === 'Activo' ? 'checked' : ''}> Activo</label>
            <label><input type="radio" name="estado" value="Inactivo" ${mantenedor.estado === 'Inactivo' ? 'checked' : ''}> Inactivo</label>
          </div>
          <div class="form-group form-group-empty"></div>
          <div class="form-group form-group-empty"></div>
        </div>
        <div class="divider"></div>
        <div id="edit-items-container"></div>
        <button id="add-item-btn">Agregar Ítem</button>
        <div class="modal-buttons">
          <button id="save-edit-btn">Guardar</button>
          <button id="cancel-edit-btn">Cancelar</button>
        </div>
      </div>
    `;
    const itemsContainer = modalContent.querySelector('#edit-items-container');
    (mantenedor.items || []).forEach(item => addItemRow(item, itemsContainer));
    showModal(editModal);

    const addItemBtn = modalContent.querySelector('#add-item-btn');
    addItemBtn.addEventListener('click', () => addItemRow({}, itemsContainer));

    setupReferenciaAutocomplete('edit-referencia', 'edit-referencia-suggestions');

    const saveEditBtn = modalContent.querySelector('#save-edit-btn');
    saveEditBtn.addEventListener('click', async () => {
      try {
        const referencia = modalContent.querySelector('#edit-referencia').value.trim();
        const estado = modalContent.querySelector('input[name="estado"]:checked')?.value;
        const items = Array.from(modalContent.querySelectorAll('.item-row')).map(row => {
          const lote = row.querySelector('.item-lote').value.trim();
          const fechaVencimiento = row.querySelector('.item-fecha-vencimiento').value;
          const cantidad = parseInt(row.querySelector('.item-cantidad').value) || 0;
          return { lote, fechaVencimiento, cantidad, entregado: false };
        }).filter(item => item.lote && item.cantidad > 0);

        if (!referencia || !estado) {
          showSuccessMessage('Complete todos los campos obligatorios', false);
          return;
        }

        const duplicateCheck = await checkDuplicate(referencia, mantenedorId);
        if (duplicateCheck.isExists) {
          showSuccessMessage(`La referencia "${referencia}" ya está registrada`, false);
          return;
        }

        const user = auth.currentUser;
        if (!user) throw new Error('Usuario no autenticado');
        const fullName = await getUserFullName();

        const referencias = await loadReferencias();
        const referenciaData = referencias.find(r => r.referencia === referencia);
        if (!referenciaData) {
          showSuccessMessage('Referencia no encontrada en la base de datos', false);
          return;
        }

        const cantidad = items.reduce((sum, item) => sum + item.cantidad, 0);
        const precioTotal = referenciaData.precio * cantidad;

        const mantenedorRef = doc(db, 'mantenedor', mantenedorId);
        await updateDoc(mantenedorRef, {
          referencia,
          referenciaLowerCase: referencia.toLowerCase(),
          codigo: referenciaData.codigo,
          codigoLowerCase: (referenciaData.codigo || '').toLowerCase(),
          descripcion: referenciaData.descripcion,
          descripcionLowerCase: (referenciaData.descripcion || '').toLowerCase(),
          proveedor: referenciaData.proveedor,
          proveedorLowerCase: (referenciaData.proveedor || '').toLowerCase(),
          precio: referenciaData.precio,
          items,
          cantidad,
          precioTotal,
          estado,
          fechaActualizacion: new Date(),
          usuario: fullName,
          uid: user.uid
        });

        const mantenedorLogRef = doc(collection(db, 'mantenedor', mantenedorId, 'logs'));
        await setDoc(mantenedorLogRef, {
          action: 'modified',
          details: `Registro actualizado: Referencia "${referencia}", Estado "${estado}", ${items.length} ítems`,
          timestamp: new Date(),
          usuario: fullName,
          uid: user.uid
        });

        const index = mantenedores.findIndex(m => m.docId === mantenedorId);
        mantenedores[index] = {
          ...mantenedores[index],
          referencia,
          referenciaLowerCase: referencia.toLowerCase(),
          codigo: referenciaData.codigo,
          codigoLowerCase: (referenciaData.codigo || '').toLowerCase(),
          descripcion: referenciaData.descripcion,
          descripcionLowerCase: (referenciaData.descripcion || '').toLowerCase(),
          proveedor: referenciaData.proveedor,
          proveedorLowerCase: (referenciaData.proveedor || '').toLowerCase(),
          precio: referenciaData.precio,
          items,
          cantidad,
          precioTotal,
          estado,
          fechaActualizacion: new Date(),
          usuario: fullName,
          uid: user.uid
        };

        showSuccessMessage('Registro actualizado correctamente');
        renderTable();
        hideModal(editModal);
      } catch (error) {
        showSuccessMessage('Error al guardar cambios: ' + error.message, false);
      }
    });

    const cancelEditBtn = modalContent.querySelector('#cancel-edit-btn');
    cancelEditBtn.addEventListener('click', () => hideModal(editModal));
  } catch (error) {
    showSuccessMessage('Error al abrir modal de edición: ' + error.message, false);
  }
}

async function showDeleteModal(mantenedorId) {
  const mantenedor = mantenedores.find(m => m.docId === mantenedorId);
  if (!mantenedor) {
    showSuccessMessage('Registro no encontrado', false);
    return;
  }
  deleteMessage.textContent = `¿Estás seguro de que deseas eliminar el registro con referencia "${mantenedor.referencia}"?`;
  showModal(deleteModal);
  confirmDeleteBtn.onclick = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuario no autenticado');
      const fullName = await getUserFullName();
      const mantenedorRef = doc(db, 'mantenedor', mantenedorId);
      const mantenedorLogRef = collection(db, 'mantenedor', mantenedorId, 'logs');
      
      await addDoc(mantenedorLogRef, {
        action: 'deleted',
        details: `Registro eliminado: Referencia "${mantenedor.referencia}"`,
        timestamp: new Date(),
        usuario: fullName,
        uid: user.uid
      });

      await deleteDoc(mantenedorRef);
      mantenedores = mantenedores.filter(m => m.docId !== mantenedorId);
      showSuccessMessage('Registro eliminado correctamente');
      renderTable();
      hideModal(deleteModal);
    } catch (error) {
      showSuccessMessage('Error al eliminar registro: ' + error.message, false);
      hideModal(deleteModal);
    }
  };
  cancelDeleteBtn.onclick = () => hideModal(deleteModal);
}

async function showLogModal(mantenedorId) {
  try {
    const logCollection = collection(db, 'mantenedor', mantenedorId, 'logs');
    const querySnapshot = await getDocs(query(logCollection, orderBy('timestamp', 'desc')));
    logContent.innerHTML = querySnapshot.empty
      ? '<p>No hay registros de historial disponibles.</p>'
      : querySnapshot.docs.map(doc => {
          const data = doc.data();
          return `
            <div class="log-entry">
              <p><strong>Acción:</strong> ${data.action}</p>
              <p><strong>Detalles:</strong> ${data.details}</p>
              <p><small><strong>Fecha:</strong> ${formatDate(data.timestamp)}</small></p>
              <p><small><strong>Usuario:</strong> ${data.usuario}</small></p>
            </div>
          `;
        }).join('');
    showModal(logModal);
    closeLogBtn.onclick = () => hideModal(logModal);
  } catch (error) {
    showSuccessMessage('Error al cargar historial: ' + error.message, false);
  }
}

async function registerMantenedor() {
  try {
    const referencia = referenciaInput.value.trim();

    if (!referencia) {
      showSuccessMessage('Complete el campo de referencia', false);
      return;
    }

    const duplicateCheck = await checkDuplicate(referencia);
    if (duplicateCheck.isExists) {
      showSuccessMessage(`La referencia "${referencia}" ya está registrada`, false);
      return;
    }

    showModal(registerModal, registerProgress, 0);
    const user = auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');
    const fullName = await getUserFullName();

    const referencias = await loadReferencias();
    const referenciaData = referencias.find(r => r.referencia === referencia);
    if (!referenciaData) {
      showSuccessMessage('Referencia no encontrada en la base de datos', false);
      hideModal(registerModal);
      return;
    }

    const mantenedorId = await getNextMantenedorId();
    const items = [];
    const cantidad = 0;
    const precioTotal = 0;

    const mantenedorRef = await addDoc(collection(db, 'mantenedor'), {
      mantenedorId,
      referencia: referencia.trim(),
      referenciaLowerCase: referencia.trim().toLowerCase(),
      codigo: referenciaData.codigo,
      codigoLowerCase: (referenciaData.codigo || '').toLowerCase(),
      descripcion: referenciaData.descripcion,
      descripcionLowerCase: (referenciaData.descripcion || '').toLowerCase(),
      proveedor: referenciaData.proveedor,
      proveedorLowerCase: (referenciaData.proveedor || '').toLowerCase(),
      precio: referenciaData.precio,
      items,
      cantidad,
      precioTotal,
      estado: 'Activo',
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      usuario: fullName,
      uid: user.uid
    });

    const mantenedorLogRef = doc(collection(db, 'mantenedor', mantenedorRef.id, 'logs'));
    await setDoc(mantenedorLogRef, {
      action: 'created',
      details: `Registro creado: Referencia "${referencia}"`,
      timestamp: new Date(),
      usuario: fullName,
      uid: user.uid
    });

    mantenedores.push({
      docId: mantenedorRef.id,
      mantenedorId,
      referencia: referencia.trim(),
      referenciaLowerCase: referencia.trim().toLowerCase(),
      codigo: referenciaData.codigo,
      codigoLowerCase: (referenciaData.codigo || '').toLowerCase(),
      descripcion: referenciaData.descripcion,
      descripcionLowerCase: (referenciaData.descripcion || '').toLowerCase(),
      proveedor: referenciaData.proveedor,
      proveedorLowerCase: (referenciaData.proveedor || '').toLowerCase(),
      precio: referenciaData.precio,
      items,
      cantidad,
      precioTotal,
      estado: 'Activo',
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      usuario: fullName,
      uid: user.uid
    });

    showSuccessMessage('Registro creado correctamente. Use el botón Editar para agregar ítems.');
    renderTable();
    hideModal(registerModal);
    referenciaInput.value = '';
    codigoInput.value = '';
    descripcionInput.value = '';
    precioInput.value = '';
    proveedorInput.value = '';
  } catch (error) {
    showSuccessMessage('Error al registrar: ' + error.message, false);
    hideModal(registerModal);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await configurePersistence();
    try {
    } catch (error) {
      showSuccessMessage('Error al normalizar datos: ' + error.message, false);
    }
    await loadMantenedores();
    setupReferenciaAutocomplete('referencia', 'referencia-suggestions');
    setupFilters();

    registrarBtn.addEventListener('click', registerMantenedor);
    exportExcelBtn.addEventListener('click', exportToExcel);

    mantenedorTableBody.addEventListener('click', async (e) => {
      const target = e.target;
      const id = target.dataset.id;
      if (target.classList.contains('fa-edit')) {
        currentEditId = id;
        await showEditModal(id);
      } else if (target.classList.contains('fa-trash')) {
        await showDeleteModal(id);
      } else if (target.classList.contains('fa-history')) {
        await showLogModal(id);
      } else if (target.classList.contains('referencia')) {
        const rowId = target.dataset.id;
        if (expandedRows.has(rowId)) {
          expandedRows.delete(rowId);
        } else {
          expandedRows.add(rowId);
        }
        renderTable();
      }
    });

    prevBtn.addEventListener('click', async () => {
      if (currentPage > 1) {
        currentPage--;
        lastVisible = null;
        await loadMantenedores();
      }
    });

    nextBtn.addEventListener('click', async () => {
      if (currentPage < totalPages) {
        currentPage++;
        await loadMantenedores();
      }
    });
  } else {
    window.location.href = '/login.html';
  }

});

