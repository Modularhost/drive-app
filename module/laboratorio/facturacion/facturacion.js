import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, getDoc, updateDoc, query, orderBy, limit, startAfter, writeBatch, where } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

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

const numeroFacturaInput = document.getElementById('numero-factura');
const fechaFacturaInput = document.getElementById('fecha-factura');
const montoFacturaInput = document.getElementById('monto-factura');
const ocInput = document.getElementById('oc');
const fechaOCInput = document.getElementById('fecha-oc');
const proveedorInput = document.getElementById('proveedor');
const actaInput = document.getElementById('acta');
const fechaSalidaInput = document.getElementById('fecha-salida');
const salidaInput = document.getElementById('salida');
const fechaIngresoInput = document.getElementById('fecha-ingreso');
const ingresarBtn = document.getElementById('ingresar-btn');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const editNumeroFacturaInput = document.getElementById('edit-numero-factura');
const editFechaFacturaInput = document.getElementById('edit-fecha-factura');
const editMontoFacturaInput = document.getElementById('edit-monto-factura');
const editOCInput = document.getElementById('edit-oc');
const editFechaOCInput = document.getElementById('edit-fecha-oc');
const editProveedorInput = document.getElementById('edit-proveedor');
const editActaInput = document.getElementById('edit-acta');
const editFechaSalidaInput = document.getElementById('edit-fecha-salida');
const editSalidaInput = document.getElementById('edit-salida');
const editFechaIngresoInput = document.getElementById('edit-fecha-ingreso');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const facturasTableBody = document.querySelector('#facturas-table tbody');
const tableContainer = document.getElementById('table-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const downloadFormatBtn = document.getElementById('download-format-btn');
const importFileInput = document.getElementById('import-file');
const pageInfo = document.getElementById('page-info');
const totalRecords = document.getElementById('total-records');
const logModal = document.getElementById('log-modal');
const logContent = document.getElementById('log-content');
const closeLogBtn = document.getElementById('close-log-btn');
const duplicateModal = document.getElementById('duplicate-modal');
const duplicateMessage = document.getElementById('duplicate-message');
const confirmDuplicateBtn = document.getElementById('confirm-duplicate-btn');
const cancelDuplicateBtn = document.getElementById('cancel-duplicate-btn');

let currentPage = 1;
const recordsPerPage = 50;
let lastVisible = null;
let firstVisible = null;
let totalPages = 1;
let facturas = [];
let currentEditId = null;
let filters = {};
let lastFacturaId = 0;
let debounceTimeout = null;
let isLoading = false;

const userNameCache = {};

const getUserFullName = async (uid) => {
    if (userNameCache[uid]) return userNameCache[uid];
    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        const fullName = userSnap.exists() ? userSnap.data().fullName || 'Usuario Desconocido' : 'Usuario no encontrado';
        userNameCache[uid] = fullName;
        return fullName;
    } catch (error) {
        console.error('Error al obtener nombre de usuario:', error);
        userNameCache[uid] = uid;
        return uid;
    }
};

const createLocalDate = (dateInput) => {
    if (!dateInput) return null;
    try {
        let year, month, day;
        if (typeof dateInput === 'string') {
            const yyyymmdd = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (yyyymmdd) {
                year = parseInt(yyyymmdd[1], 10);
                month = parseInt(yyyymmdd[2], 10) - 1;
                day = parseInt(yyyymmdd[3], 10);
            } else {
                const date = new Date(dateInput);
                if (isNaN(date.getTime())) return null;
                year = date.getUTCFullYear();
                month = date.getUTCMonth();
                day = date.getUTCDate();
            }
        } else if (dateInput.toDate) {
            const date = dateInput.toDate();
            year = date.getUTCFullYear();
            month = date.getUTCMonth();
            day = date.getUTCDate();
        } else if (dateInput instanceof Date) {
            year = dateInput.getUTCFullYear();
            month = dateInput.getUTCMonth();
            day = dateInput.getUTCDate();
        } else {
            return null;
        }
        const utcDate = new Date(Date.UTC(year, month, day));
        if (isNaN(utcDate.getTime())) return null;
        return utcDate;
    } catch (error) {
        console.error('Error en createLocalDate:', error);
        return null;
    }
};

const formatDate = (dateInput, includeTime = false, isIngresoOrSalida = false) => {
    if (!dateInput) return '';
    let date;
    try {
        if (dateInput.toDate) {
            date = dateInput.toDate();
        } else if (typeof dateInput === 'string') {
            date = createLocalDate(dateInput);
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            return '';
        }
        if (isNaN(date.getTime())) return '';
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        if (includeTime && !isIngresoOrSalida) {
            const hours = String(date.getUTCHours()).padStart(2, '0');
            const minutes = String(date.getUTCMinutes()).padStart(2, '0');
            const seconds = String(date.getUTCSeconds()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        }
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

const formatDateTimeForInput = (dateInput) => {
    if (!dateInput) return '';
    let date;
    try {
        if (dateInput.toDate) {
            date = dateInput.toDate();
        } else if (typeof dateInput === 'string') {
            date = createLocalDate(dateInput);
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            return '';
        }
        if (isNaN(date.getTime())) return '';
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error formatting date for input:', error);
        return '';
    }
};

const parseCurrency = (value) => {
    if (!value) return null;
    const cleaned = value.toString().replace(/[^0-9]/g, '');
    const parsed = parseInt(cleaned);
    return isNaN(parsed) ? null : parsed;
};

const formatCurrency = (value, forDisplay = false) => {
    if (value === null || value === undefined || value === '') return '';
    const numericValue = Math.floor(Number(value));
    if (isNaN(numericValue)) return '';
    if (forDisplay) {
        let str = numericValue.toString();
        if (str.length > 8) {
            str = str.slice(-8);
        }
        let result = '';
        let count = 0;
        for (let i = str.length - 1; i >= 0; i--) {
            count++;
            result = str[i] + result;
            if (count % 3 === 0 && i > 0) {
                result = '.' + result;
            }
        }
        return result;
    }
    return numericValue.toString();
};

const parseFilterDate = (dateStr) => {
    if (!dateStr) return null;
    const ddmmyyyy = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (ddmmyyyy) {
        const [_, day, month, year] = ddmmyyyy;
        return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    }
    const parsedDate = new Date(dateStr);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const showModal = (modal, progressElement, percentage) => {
    if (modal) {
        modal.style.display = 'flex';
        if (progressElement) {
            progressElement.textContent = `${percentage}%`;
        }
    }
};

const hideModal = (modal) => {
    if (modal) {
        modal.style.display = 'none';
    }
};

const showSuccessMessage = (message, isSuccess = true) => {
    if (successModal && successIcon && successMessage) {
        successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
        successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
        successMessage.textContent = message;
        successModal.style.display = 'flex';
        setTimeout(() => hideModal(successModal), 2000);
    }
};

const parseOCDate = (dateInput) => {
    if (!dateInput) return null;
    let date;
    try {
        if (dateInput.toDate) {
            date = dateInput.toDate();
        } else if (typeof dateInput === 'string') {
            const ddmericayyyy = dateInput.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
            if (ddmmyyyy) {
                const [_, day, month, year] = ddmmyyyy;
                date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
            } else {
                date = new Date(dateInput);
            }
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            return null;
        }
        return isNaN(date.getTime()) ? null : createLocalDate(date);
    } catch (error) {
        console.error('Error parsing OC date:', error);
        return null;
    }
};

const fetchOCData = async (oc) => {
    if (!oc || oc.trim() === '') {
        return null;
    }
    try {
        const ocQuery = query(collection(db, 'ordenesCompra'), where('codigo', '==', oc.trim()));
        const ocSnapshot = await getDocs(ocQuery);
        if (!ocSnapshot.empty) {
            const ocData = ocSnapshot.docs[0].data();
            return {
                generacion: parseOCDate(ocData.generacion || ocData.fecha),
                proveedorId: ocData.proveedorId ? String(ocData.proveedorId).trim() : ''
            };
        } else {
            showSuccessMessage(`Orden de compra ${oc} no encontrada`, false);
            return null;
        }
    } catch (error) {
        console.error('Error al buscar orden de compra:', error);
        showSuccessMessage(`Error al buscar orden de compra: ${error.message}`, false);
        return null;
    }
};

const updateOCFields = async (ocInputElement, fechaOCInputElement, proveedorInputElement) => {
    const oc = ocInputElement.value.trim();
    if (!oc) {
        fechaOCInputElement.value = '';
        proveedorInputElement.value = '';
        return;
    }

    const ocData = await fetchOCData(oc);
    if (ocData && ocData.generacion) {
        fechaOCInputElement.value = formatDateTimeForInput(ocData.generacion);
        proveedorInputElement.value = ocData.proveedorId || '';
    } else {
        fechaOCInputElement.value = '';
        proveedorInputElement.value = '';
        if (ocData) {
            showSuccessMessage('La orden de compra no tiene una fecha válida.', false);
        }
    }
};

if (ocInput && fechaOCInput && proveedorInput) {
    const handleOCInput = () => updateOCFields(ocInput, fechaOCInput, proveedorInput);
    ocInput.addEventListener('input', handleOCInput);
    ocInput.addEventListener('change', handleOCInput);
}

if (editOCInput && editFechaOCInput && editProveedorInput) {
    const handleEditOCInput = () => updateOCFields(editOCInput, editFechaOCInput, editProveedorInput);
    editOCInput.addEventListener('input', handleEditOCInput);
    editOCInput.addEventListener('change', handleEditOCInput);
}

const formatMontoInput = (input) => {
    if (!input) return;

    input.addEventListener('input', () => {
        let value = input.value.replace(/[^0-9]/g, '');
        if (value.length > 12) {
            value = value.slice(-12);
        }
        if (value) {
            const numericValue = parseInt(value, 10);
            if (!isNaN(numericValue)) {
                input.value = formatCurrency(numericValue, true);
            } else {
                input.value = '';
            }
        }
    });

    input.addEventListener('blur', () => {
        const numericValue = parseCurrency(input.value);
        if (numericValue !== null) {
            input.value = formatCurrency(numericValue, true);
        } else {
            input.value = '';
        }
    });

    input.addEventListener('keypress', (e) => {
        const char = String.fromCharCode(e.which || e.keyCode);
        if (!/[0-9]/.test(char)) {
            e.preventDefault();
        }
    });
};

if (montoFacturaInput) formatMontoInput(montoFacturaInput);
if (editMontoFacturaInput) formatMontoInput(editMontoFacturaInput);

async function checkDuplicateFactura(numeroFactura) {
    try {
        const q = query(collection(db, 'facturas'), where('numeroFactura', '==', numeroFactura.toLowerCase().trim()));
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error('Error al verificar factura duplicada:', error);
        return false;
    }
}

async function getNextFacturaId() {
    try {
        if (lastFacturaId > 0) {
            lastFacturaId++;
            return lastFacturaId.toString();
        }
        const facturasCollection = collection(db, 'facturas');
        const q = query(facturasCollection, orderBy('facturaIdNumeric', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        let nextId = 1;
        if (!querySnapshot.empty) {
            const lastFactura = querySnapshot.docs[0].data();
            nextId = (lastFactura.facturaIdNumeric || 0) + 1;
        }
        lastFacturaId = nextId;
        return nextId.toString();
    } catch (error) {
        console.error('Error al obtener próximo facturaId:', error);
        return null;
    }
}

function generateSearchKeywords(proveedor) {
    if (!proveedor || typeof proveedor !== 'string') return [];
    const normalized = proveedor.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const words = normalized.split(' ').filter(word => word.length >= 3);
    const keywords = [];
    words.forEach(word => {
        for (let i = 3; i <= word.length; i++) {
            keywords.push(word.slice(0, i));
        }
    });
    return [...new Set(keywords)];
}

async function normalizeProviderField() {
    try {
        const facturasCollection = collection(db, 'facturas');
        const snapshot = await getDocs(facturasCollection);
        const batch = writeBatch(db);
        let updatedCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            let providerValue = data.proveedor;
            if (providerValue === null || providerValue === undefined) {
                providerValue = '';
            } else {
                providerValue = String(providerValue).trim().replace(/\s+/g, ' ').toUpperCase();
            }
            const searchKeywords = generateSearchKeywords(providerValue);
            if (providerValue !== data.proveedor || !data.proveedorSearch || data.proveedorSearch.join(',') !== searchKeywords.join(',')) {
                batch.update(doc.ref, {
                    proveedor: providerValue,
                    proveedorSearch: searchKeywords
                });
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
        }
    } catch (error) {
        console.error('Error al normalizar campo proveedor:', error);
    }
}

async function loadFacturas(isFilter = false) {
    if (isLoading) return;
    isLoading = true;
    try {
        const facturasCollection = collection(db, 'facturas');
        const countSnapshot = await getDocs(facturasCollection);
        const totalRecordsCount = countSnapshot.size;
        totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
        if (totalRecords) {
            totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
        }

        let q = query(facturasCollection, orderBy('facturaIdNumeric', 'asc'), limit(recordsPerPage));
        if (lastVisible && currentPage > 1) {
            q = query(facturasCollection, orderBy('facturaIdNumeric', 'asc'), startAfter(lastVisible), limit(recordsPerPage));
        }

        Object.keys(filters).forEach(column => {
            if (filters[column]) {
                if (['numeroFactura', 'oc', 'acta', 'mesIngreso', 'anioIngreso', 'mesSalida', 'anioSalida', 'userName'].includes(column)) {
                    const value = String(filters[column]).trim().toLowerCase();
                    if (value) {
                        q = query(q, where(column, '>=', value), where(column, '<=', value + '\uf8ff'));
                    }
                } else if (column === 'proveedor') {
                    let value = String(filters[column]).trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
                    if (value && value.length >= 3) {
                        q = query(q, where('proveedorSearch', 'array-contains', value));
                    } else if (!value) {
                        q = query(q, where('proveedor', 'in', ['', null]));
                    }
                } else if (['montoFactura', 'salida'].includes(column)) {
                    const numericValue = parseCurrency(filters[column]);
                    if (numericValue !== null) {
                        q = query(q, where(column, '==', numericValue));
                    }
                } else if (['fechaIngreso', 'fechaFactura', 'fechaOC', 'fechaSalida'].includes(column)) {
                    const startDate = parseFilterDate(filters[column]);
                    if (startDate) {
                        const endDate = new Date(startDate.getTime());
                        endDate.setUTCHours(23, 59, 59, 999);
                        q = query(q, where(column, '>=', startDate), where(column, '<=', endDate));
                    }
                }
            }
        });

        if (!isFilter) {
            showModal(loadingModal, loadingProgress, 0);
        }

        const querySnapshot = await getDocs(q);
        facturas = [];
        for (let doc of querySnapshot.docs) {
            const data = doc.data();
            data.docId = doc.id;
            data.userName = data.userName || await getUserFullName(data.uid);
            facturas.push(data);
        }
        if (facturas.length > 0) {
            lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            firstVisible = querySnapshot.docs[0];
        }
        renderTable();
        updatePagination();
        if (tableContainer) {
            tableContainer.style.display = 'block';
        }
        if (facturas.length === 0 && Object.keys(filters).length > 0) {
            showSuccessMessage('No se encontraron facturas con los filtros aplicados. Verifica los datos en Firestore o los índices.', false);
        }
    } catch (error) {
        console.error('Error al cargar facturas:', error);
        showSuccessMessage(`Error al cargar facturas: ${error.message}. Verifica los índices en Firestore.`, false);
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }
    } finally {
        if (!isFilter) {
            hideModal(loadingModal);
        }
        isLoading = false;
    }
}

function renderTable() {
    if (!facturasTableBody) return;
    facturasTableBody.innerHTML = '';
    facturas.forEach(factura => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td title="${factura.facturaId}">${factura.facturaId}</td>
            <td>
                <i class="fas fa-edit action-icon" data-id="${factura.docId}" title="Editar"></i>
                <i class="fas fa-trash action-icon" data-id="${factura.docId}" title="Eliminar"></i>
                <i class="fas fa-history action-icon" data-id="${factura.docId}" title="Historial"></i>
            </td>
            <td title="${formatDate(factura.fechaIngreso, true, true)}">${formatDate(factura.fechaIngreso, true, true)}</td>
            <td title="${factura.numeroFactura}">${factura.numeroFactura}</td>
            <td title="${formatDate(factura.fechaFactura)}">${formatDate(factura.fechaFactura)}</td>
            <td title="${formatCurrency(factura.montoFactura, true)}">${formatCurrency(factura.montoFactura, true)}</td>
            <td title="${factura.oc}">${factura.oc}</td>
            <td title="${formatDate(factura.fechaOC)}">${formatDate(factura.fechaOC)}</td>
            <td title="${factura.proveedor || ''}">${factura.proveedor || ''}</td>
            <td title="${factura.acta || ''}">${factura.acta || ''}</td>
            <td title="${formatDate(factura.fechaSalida, true, true)}">${formatDate(factura.fechaSalida, true, true)}</td>
            <td title="${factura.salida || ''}">${factura.salida || ''}</td>
            <td title="${factura.mesIngreso}">${factura.mesIngreso}</td>
            <td title="${factura.anioIngreso}">${factura.anioIngreso}</td>
            <td title="${factura.mesSalida || ''}">${factura.mesSalida || ''}</td>
            <td title="${factura.anioSalida || ''}">${factura.anioSalida || ''}</td>
            <td title="${factura.userName}">${factura.userName}</td>
        `;
        facturasTableBody.appendChild(tr);
    });
}

function setupFilterIcons() {
    document.querySelectorAll('.filter-icon').forEach(icon => {
        icon.removeEventListener('click', icon._clickHandler);
        icon._clickHandler = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const column = e.target.dataset.column;
            if (column === 'acciones') return;

            if (e.target.classList.contains('fa-filter-circle-xmark')) {
                e.target.classList.remove('fa-filter-circle-xmark', 'active');
                e.target.classList.add('fa-filter');
                delete filters[column];
                document.querySelectorAll(`.filter-input-container[data-column="${column}"]`).forEach(input => input.remove());
                currentPage = 1;
                if (debounceTimeout) clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => {
                    loadFacturas(true);
                }, 300);
                return;
            }

            document.querySelectorAll('.filter-input-container').forEach(input => {
                if (input.dataset.column !== column) {
                    input.remove();
                }
            });

            e.target.classList.remove('fa-filter');
            e.target.classList.add('fa-filter-circle-xmark', 'active');

            const container = document.createElement('div');
            container.className = 'filter-input-container';
            container.dataset.column = column;
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Filtrar por ${column}`;
            input.value = filters[column] || '';
            input.addEventListener('input', (e) => {
                e.stopPropagation();
                const value = input.value.trim();
                const iconElement = e.target.parentNode.parentNode.querySelector('.filter-icon');
                if (value) {
                    filters[column] = value;
                } else {
                    delete filters[column];
                    iconElement.classList.remove('fa-filter-circle-xmark', 'active');
                    iconElement.classList.add('fa-filter');
                    container.remove();
                }
                currentPage = 1;
                if (debounceTimeout) clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => {
                    loadFacturas(true);
                    container.remove(); // Ocultar el input después de aplicar el filtro
                    iconElement.classList.add('fa-filter-circle-xmark', 'active'); // Mantener el ícono de filtro activo
                }, 300);
            });
            input.addEventListener('click', (e) => e.stopPropagation());
            input.addEventListener('blur', () => {
                // Opcional: Ocultar el input al perder el foco, si no se ha aplicado el filtro
                if (!filters[column]) {
                    container.remove();
                    e.target.parentNode.querySelector('.filter-icon').classList.remove('fa-filter-circle-xmark', 'active');
                    e.target.parentNode.querySelector('.filter-icon').classList.add('fa-filter');
                }
            });
            container.appendChild(input);
            e.target.parentNode.appendChild(container);
            input.focus();
        };
        icon.addEventListener('click', icon._clickHandler);
    });
}

function updatePagination() {
    if (pageInfo && prevBtn && nextBtn) {
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    }
}

async function loadLogs(facturaId) {
    try {
        const logsCollection = collection(db, 'facturas', facturaId, 'logs');
        const logQuery = query(logsCollection, orderBy('timestamp', 'desc'));
        const logsSnapshot = await getDocs(logQuery);
        if (logContent) {
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
                        ? formatDate(timestamp, true)
                        : 'Sin fecha';
                    const logEntry = document.createElement('div');
                    logEntry.className = 'log-entry';
                    logEntry.innerHTML = `
                        <strong>${data.action === 'created' ? 'Creada' : data.action === 'modified' ? 'Modificada' : 'Eliminada'}</strong>: 
                        ${data.description}<br>
                        <small>Fecha: ${fechaDisplay} | Usuario: ${data.user}</small>
                    `;
                    logContent.appendChild(logEntry);
                });
            }
            showModal(logModal);
        }
    } catch (error) {
        console.error('Error al cargar historial:', error);
        showSuccessMessage(`Error al cargar historial: ${error.message}`, false);
    }
}

function setupColumnResizing() {
    const headers = document.querySelectorAll('#facturas-table th.resizeable');
    headers.forEach((header, index) => {
        header.style.position = 'relative';
        header.style.overflow = 'visible';

        let isResizing = false;
        let startX;
        let startWidth;

        const onMouseDown = (e) => {
            const rect = header.getBoundingClientRect();
            const resizeZone = 8;
            if (e.clientX >= rect.right - resizeZone && e.clientX <= rect.right + resizeZone) {
                isResizing = true;
                startX = e.clientX;
                startWidth = header.offsetWidth;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                e.preventDefault();
            }
        };

        const onMouseMove = (e) => {
            if (!isResizing) return;
            const delta = e.clientX - startX;
            const newWidth = Math.max(80, startWidth + delta);
            header.style.width = `${newWidth}px`;
            header.style.minWidth = `${newWidth}px`;
            header.style.maxWidth = `${newWidth}px`;
            const cells = document.querySelectorAll(`#facturas-table tr td:nth-child(${index + 1})`);
            cells.forEach(cell => {
                cell.style.width = `${newWidth}px`;
                cell.style.minWidth = `${newWidth}px`;
                cell.style.maxWidth = `${newWidth}px`;
            });
        };

        const onMouseUp = () => {
            if (isResizing) {
                isResizing = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
        };

        header.addEventListener('mousedown', onMouseDown);
    });
}

async function normalizeOCField() {
    try {
        const facturasCollection = collection(db, 'facturas');
        const snapshot = await getDocs(facturasCollection);
        const batch = writeBatch(db);
        let updatedCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.oc) {
                const cleanedOC = String(data.oc).trim();
                if (cleanedOC !== data.oc) {
                    batch.update(doc.ref, { oc: cleanedOC });
                    updatedCount++;
                }
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
        }
    } catch (error) {
        console.error('Error al normalizar campo oc:', error);
    }
}

async function init() {
    const container = document.querySelector('.facturas-container');
    if (!container) {
        console.error('Contenedor .facturas-container no encontrado');
        return;
    }

    try {
        await setPersistence(auth, browserLocalPersistence);
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión nuevamente.</p>';
                setTimeout(() => {
                    window.location.href = 'main.html?error=auth-required';
                }, 5000);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    console.error('Usuario no registrado en la base de datos');
                    container.innerHTML = '<p>Error: Tu cuenta no está registrada en la base de datos. Contacta al administrador.</p>';
                    return;
                }

                const userData = userDoc.data();
                const hasAccess = userData.role === 'Administrador' || userData.role === 'Operador';
                if (!hasAccess) {
                    console.error('Usuario sin permisos para este módulo');
                    container.innerHTML = '<p>Acceso denegado. No tienes permisos para acceder a este módulo.</p>';
                    return;
                }

                document.querySelectorAll('.close-modal').forEach(button => {
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        const modal = button.closest('.modal');
                        if (modal) {
                            hideModal(modal);
                        }
                    });
                });

                if (fechaSalidaInput) fechaSalidaInput.value = formatDateTimeForInput(new Date());
                if (fechaIngresoInput) fechaIngresoInput.value = formatDateTimeForInput(new Date());

                await normalizeOCField();
                await normalizeProviderField();
                await loadFacturas();
                setupColumnResizing();
                setupFilterIcons();

                if (ingresarBtn) {
                    ingresarBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        if (!auth.currentUser) {
                            showSuccessMessage('Sesión expirada. Por favor, inicia sesión nuevamente.', false);
                            setTimeout(() => {
                                window.location.href = 'main.html?error=auth-required';
                            }, 2000);
                            return;
                        }

                        const missingFields = [];
                        const resetFieldStyles = () => {
                            [numeroFacturaInput, fechaFacturaInput, montoFacturaInput, ocInput].forEach(input => {
                                if (input) input.style.border = '';
                            });
                        };

                        resetFieldStyles();
                        if (!numeroFacturaInput?.value) {
                            missingFields.push('Número de factura');
                            numeroFacturaInput.style.border = '2px solid red';
                        }
                        if (!fechaFacturaInput?.value) {
                            missingFields.push('Fecha de factura');
                            fechaFacturaInput.style.border = '2px solid red';
                        }
                        if (!montoFacturaInput?.value) {
                            missingFields.push('Monto');
                            montoFacturaInput.style.border = '2px solid red';
                        }
                        if (!ocInput?.value) {
                            missingFields.push('OC');
                            ocInput.style.border = '2px solid red';
                        }

                        if (missingFields.length > 0) {
                            showSuccessMessage(`Faltan los siguientes campos: ${missingFields.join(', ')}`, false);
                            return;
                        }

                        const montoFactura = parseCurrency(montoFacturaInput.value);
                        if (!montoFactura) {
                            showSuccessMessage('El monto de la factura debe ser un número válido.', false);
                            montoFacturaInput.style.border = '2px solid red';
                            return;
                        }

                        const numeroFactura = numeroFacturaInput.value.toLowerCase().trim();
                        const isDuplicate = await checkDuplicateFactura(numeroFactura);
                        if (isDuplicate) {
                            if (duplicateModal && duplicateMessage && confirmDuplicateBtn && cancelDuplicateBtn) {
                                duplicateMessage.textContent = `La factura "${numeroFactura}" ya se encuentra registrada, ¿desea seguir ingresando?`;
                                showModal(duplicateModal);
                                return new Promise((resolve) => {
                                    const onConfirm = async () => {
                                        confirmDuplicateBtn.removeEventListener('click', onConfirm);
                                        cancelDuplicateBtn.removeEventListener('click', onCancel);
                                        hideModal(duplicateModal);
                                        resolve(true);
                                    };
                                    const onCancel = () => {
                                        confirmDuplicateBtn.removeEventListener('click', onConfirm);
                                        cancelDuplicateBtn.removeEventListener('click', onCancel);
                                        hideModal(duplicateModal);
                                        resolve(false);
                                    };
                                    confirmDuplicateBtn.addEventListener('click', onConfirm);
                                    cancelDuplicateBtn.addEventListener('click', onCancel);
                                }).then(async (shouldProceed) => {
                                    if (shouldProceed) {
                                        await proceedWithRegistration();
                                    }
                                });
                            } else {
                                showSuccessMessage('Error: No se pudo mostrar el modal de confirmación de duplicado.', false);
                                return;
                            }
                        } else {
                            await proceedWithRegistration();
                        }

                        async function proceedWithRegistration() {
                            const oc = ocInput.value.trim();
                            let ocData = null;
                            if (oc) {
                                ocData = await fetchOCData(oc);
                                if (!ocData) return;
                            }

                            try {
                                showModal(registerModal, registerProgress, 0);
                                const fullName = await getUserFullName(auth.currentUser.uid);
                                const facturaId = await getNextFacturaId();
                                if (!facturaId) {
                                    showSuccessMessage('Error al generar ID de factura.', false);
                                    hideModal(registerModal);
                                    return;
                                }
                                const fechaIngreso = fechaIngresoInput?.value ? createLocalDate(fechaIngresoInput.value) : null;
                                const fechaSalida = fechaSalidaInput?.value ? createLocalDate(fechaSalidaInput.value) : null;
                                const proveedor = ocData?.proveedorId || '';

                                const facturaData = {
                                    facturaId,
                                    facturaIdNumeric: parseInt(facturaId),
                                    numeroFactura,
                                    fechaFactura: createLocalDate(fechaFacturaInput.value).toISOString(),
                                    montoFactura,
                                    oc: oc.trim(),
                                    fechaOC: ocData && ocData.generacion ? createLocalDate(ocData.generacion).toISOString() : null,
                                    proveedor,
                                    proveedorSearch: generateSearchKeywords(proveedor),
                                    acta: actaInput?.value.trim() || null,
                                    fechaSalida: fechaSalida ? fechaSalida.toISOString() : null,
                                    salida: parseCurrency(salidaInput?.value) || null,
                                    fechaIngreso: fechaIngreso ? fechaIngreso.toISOString() : null,
                                    mesIngreso: fechaIngreso ? fechaIngreso.toLocaleString('es', { month: 'long' }).toLowerCase() : null,
                                    anioIngreso: fechaIngreso ? fechaIngreso.getFullYear() : null,
                                    mesSalida: fechaSalida ? fechaSalida.toLocaleString('es', { month: 'long' }).toLowerCase() : null,
                                    anioSalida: fechaSalida ? fechaSalida.getFullYear() : null,
                                    uid: auth.currentUser.uid,
                                    userName: fullName
                                };

                                const facturaRef = doc(collection(db, 'facturas'));
                                const batch = writeBatch(db);
                                batch.set(facturaRef, facturaData);
                                const logRef = doc(collection(db, 'facturas', facturaRef.id, 'logs'));
                                batch.set(logRef, {
                                    action: 'created',
                                    description: `Factura "${facturaData.numeroFactura}" creada`,
                                    timestamp: new Date(),
                                    user: fullName,
                                    uid: auth.currentUser.uid
                                });

                                await batch.commit();

                                showModal(registerModal, registerProgress, 100);
                                setTimeout(() => {
                                    hideModal(registerModal);
                                    showSuccessMessage('Factura registrada exitosamente');
                                    resetFieldStyles();
                                    numeroFacturaInput.value = '';
                                    fechaFacturaInput.value = '';
                                    montoFacturaInput.value = '';
                                    ocInput.value = '';
                                    fechaOCInput.value = '';
                                    if (proveedorInput) proveedorInput.value = '';
                                    if (actaInput) actaInput.value = '';
                                    if (salidaInput) salidaInput.value = '';
                                    if (fechaSalidaInput) fechaSalidaInput.value = formatDateTimeForInput(new Date());
                                    if (fechaIngresoInput) fechaIngresoInput.value = formatDateTimeForInput(new Date());
                                    facturas.push({ docId: facturaRef.id, ...facturaData });
                                    renderTable();
                                }, 300);
                            } catch (error) {
                                console.error('Error al registrar factura:', error);
                                showSuccessMessage(`Error al registrar factura: ${error.message}`, false);
                                hideModal(registerModal);
                            }
                        }
                    });
                }

                if (saveEditBtn) {
                    saveEditBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        const numeroFactura = editNumeroFacturaInput?.value.trim().toLowerCase();
                        const fechaFactura = editFechaFacturaInput?.value;
                        const montoFactura = parseCurrency(editMontoFacturaInput?.value);
                        const oc = editOCInput?.value.trim();
                        const acta = editActaInput?.value.trim() || null;
                        const fechaSalida = editFechaSalidaInput?.value ? createLocalDate(editFechaSalidaInput.value) : null;
                        const salida = parseCurrency(editSalidaInput?.value);
                        const fechaIngreso = editFechaIngresoInput?.value ? createLocalDate(editFechaIngresoInput.value) : null;

                        if (!numeroFactura || !fechaFactura || montoFactura === null || !oc) {
                            showSuccessMessage('Por favor, completa todos los campos requeridos', false);
                            return;
                        }

                        try {
                            const facturaRef = doc(db, 'facturas', currentEditId);
                            const facturaSnap = await getDoc(facturaRef);
                            const oldData = facturaSnap.data();

                            const changes = [];
                            if (oldData.numeroFactura !== numeroFactura) {
                                changes.push(`Número de factura cambiado de "${oldData.numeroFactura}" a "${numeroFactura}"`);
                            }
                            if (oldData.fechaFactura !== fechaFactura) {
                                changes.push(`Fecha de factura cambiado de "${formatDate(oldData.fechaFactura)}" a "${formatDate(fechaFactura)}"`);
                            }
                            if (oldData.montoFactura !== montoFactura) {
                                changes.push(`Monto cambiado de "${formatCurrency(oldData.montoFactura, true)}" a "${formatCurrency(montoFactura, true)}"`);
                            }
                            if (oldData.oc !== oc) {
                                changes.push(`OC cambiado de "${oldData.oc}" a "${oc}"`);
                            }
                            if (oldData.acta !== acta) {
                                changes.push(`Acta cambiado de "${oldData.acta || ''}" a "${acta || ''}"`);
                            }
                            if (oldData.fechaSalida !== (fechaSalida ? fechaSalida.toISOString() : null)) {
                                changes.push(`Fecha de salida cambiado de "${formatDate(oldData.fechaSalida, true, true) || ''}" a "${formatDate(fechaSalida, true, true) || ''}"`);
                            }
                            if (oldData.salida !== salida) {
                                changes.push(`Salida cambiado de "${formatCurrency(oldData.salida) || ''}" a "${formatCurrency(salida) || ''}"`);
                            }
                            if (oldData.fechaIngreso !== (fechaIngreso ? fechaIngreso.toISOString() : null)) {
                                changes.push(`Fecha de ingreso cambiado de "${formatDate(oldData.fechaIngreso, true, true) || ''}" a "${formatDate(fechaIngreso, true, true) || ''}"`);
                            }

                            const fullName = await getUserFullName(auth.currentUser.uid);
                            const ocData = oc ? await fetchOCData(oc) : null;
                            const proveedor = ocData ? ocData.proveedorId || '' : '';

                            const facturaData = {
                                numeroFactura,
                                facturaId: oldData.facturaId,
                                facturaIdNumeric: parseInt(oldData.facturaId),
                                fechaFactura: createLocalDate(fechaFactura).toISOString(),
                                montoFactura,
                                oc,
                                fechaOC: ocData && ocData.generacion ? createLocalDate(ocData.generacion).toISOString() : null,
                                proveedor,
                                proveedorSearch: generateSearchKeywords(proveedor),
                                acta,
                                fechaSalida: fechaSalida ? fechaSalida.toISOString() : null,
                                salida,
                                fechaIngreso: fechaIngreso ? fechaIngreso.toISOString() : null,
                                mesIngreso: fechaIngreso ? fechaIngreso.toLocaleString('es', { month: 'long' }).toLowerCase() : null,
                                anioIngreso: fechaIngreso ? fechaIngreso.getFullYear() : null,
                                mesSalida: fechaSalida ? fechaSalida.toLocaleString('es', { month: 'long' }).toLowerCase() : null,
                                anioSalida: fechaSalida ? fechaSalida.getFullYear() : null,
                                uid: oldData.uid,
                                userName: fullName
                            };

                            const batch = writeBatch(db);
                            batch.update(facturaRef, facturaData);

                            if (changes.length > 0) {
                                const logRef = doc(collection(db, 'facturas', currentEditId, 'logs'));
                                batch.set(logRef, {
                                    action: 'modified',
                                    description: changes.join('; '),
                                    timestamp: new Date(),
                                    user: fullName,
                                    uid: auth.currentUser.uid
                                });
                            }

                            await batch.commit();

                            hideModal(editModal);
                            showSuccessMessage('Factura actualizada exitosamente');

                            const index = facturas.findIndex(f => f.docId === currentEditId);
                            if (index !== -1) {
                                facturas[index] = { ...facturas[index], ...facturaData };
                                renderTable();
                            }
                        } catch (error) {
                            console.error('Error al actualizar factura:', error);
                            showSuccessMessage(`Error al actualizar factura: ${error.message}`, false);
                        }
                    });
                }

                if (cancelEditBtn) {
                    cancelEditBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        hideModal(editModal);
                    });
                }

                if (facturasTableBody) {
                    facturasTableBody.addEventListener('click', async (e) => {
                        const target = e.target;
                        if (target.classList.contains('fa-edit')) {
                            currentEditId = target.dataset.id;
                            const factura = facturas.find(f => f.docId === currentEditId);
                            if (factura) {
                                editNumeroFacturaInput.value = factura.numeroFactura || '';
                                editFechaFacturaInput.value = formatDateTimeForInput(factura.fechaFactura) || '';
                                editMontoFacturaInput.value = formatCurrency(factura.montoFactura, true) || '';
                                editOCInput.value = factura.oc || '';
                                editFechaOCInput.value = formatDateTimeForInput(factura.fechaOC) || '';
                                editProveedorInput.value = factura.proveedor || '';
                                editActaInput.value = factura.acta || '';
                                editFechaSalidaInput.value = formatDateTimeForInput(factura.fechaSalida) || '';
                                editSalidaInput.value = formatCurrency(factura.salida, true) || '';
                                editFechaIngresoInput.value = formatDateTimeForInput(factura.fechaIngreso) || '';
                                showModal(editModal);
                            }
                        } else if (target.classList.contains('fa-trash')) {
                            currentEditId = target.dataset.id;
                            const factura = facturas.find(f => f.docId === currentEditId);
                            if (factura && deleteMessage) {
                                deleteMessage.textContent = `¿Estás seguro de que deseas eliminar la factura "${factura.numeroFactura}"?`;
                                showModal(deleteModal);
                            }
                        } else if (target.classList.contains('fa-history')) {
                            currentEditId = target.dataset.id;
                            await loadLogs(currentEditId);
                        }
                    });
                }

                if (confirmDeleteBtn) {
                    confirmDeleteBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        try {
                            const facturaRef = doc(db, 'facturas', currentEditId);
                            const facturaSnap = await getDoc(facturaRef);
                            const facturaData = facturaSnap.data();
                            const fullName = await getUserFullName(auth.currentUser.uid);

                            const batch = writeBatch(db);
                            batch.delete(facturaRef);
                            const logRef = doc(collection(db, 'facturas', currentEditId, 'logs'));
                            batch.set(logRef, {
                                action: 'deleted',
                                description: `Factura "${facturaData.numeroFactura}" eliminada`,
                                timestamp: new Date(),
                                user: fullName,
                                uid: auth.currentUser.uid
                            });

                            await batch.commit();

                            hideModal(deleteModal);
                            showSuccessMessage('Factura eliminada exitosamente');
                            facturas = facturas.filter(f => f.docId !== currentEditId);
                            renderTable();
                            updatePagination();
                        } catch (error) {
                            console.error('Error al eliminar factura:', error);
                            showSuccessMessage(`Error al eliminar factura: ${error.message}`, false);
                        }
                    });
                }

                if (cancelDeleteBtn) {
                    cancelDeleteBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        hideModal(deleteModal);
                    });
                }

                if (closeLogBtn) {
                    closeLogBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        hideModal(logModal);
                    });
                }

                if (prevBtn) {
                    prevBtn.addEventListener('click', () => {
                        if (currentPage > 1) {
                            currentPage--;
                            loadFacturas();
                        }
                    });
                }

                if (nextBtn) {
                    nextBtn.addEventListener('click', () => {
                        if (currentPage < totalPages) {
                            currentPage++;
                            loadFacturas();
                        }
                    });
                }

                if (exportExcelBtn) {
                    exportExcelBtn.addEventListener('click', async () => {
                        try {
                            showModal(loadingModal, loadingProgress, 0);
                            const facturasCollection = collection(db, 'facturas');
                            const snapshot = await getDocs(facturasCollection);
                            const data = [
                                ['ID', 'Fecha Ingreso', 'Número Factura', 'Fecha Factura', 'Monto Factura', 'OC', 'Fecha OC', 'Proveedor', 'Acta', 'Fecha Salida', 'Salida', 'Mes Ingreso', 'Año Ingreso', 'Mes Salida', 'Año Salida', 'Usuario'],
                                ...snapshot.docs.map(doc => {
                                    const d = doc.data();
                                    return [
                                        d.facturaId,
                                        formatDate(d.fechaIngreso, true, true),
                                        d.numeroFactura,
                                        formatDate(d.fechaFactura),
                                        formatCurrency(d.montoFactura, true),
                                        d.oc,
                                        formatDate(d.fechaOC),
                                        d.proveedor || '',
                                        d.acta || '',
                                        formatDate(d.fechaSalida, true, true),
                                        formatCurrency(d.salida) || '',
                                        d.mesIngreso,
                                        d.anioIngreso,
                                        d.mesSalida || '',
                                        d.anioSalida || '',
                                        d.userName
                                    ];
                                })
                            ];

                            const csvContent = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = 'facturas_export.csv';
                            link.click();
                            URL.revokeObjectURL(link.href);
                            showSuccessMessage('Exportación completada');
                            hideModal(loadingModal);
                        } catch (error) {
                            console.error('Error al exportar:', error);
                            showSuccessMessage(`Error al exportar: ${error.message}`, false);
                            hideModal(loadingModal);
                        }
                    });
                }

                if (downloadFormatBtn) {
                    downloadFormatBtn.addEventListener('click', () => {
                        const format = [
                            ['numeroFactura', 'fechaFactura', 'montoFactura', 'oc', 'acta', 'fechaSalida', 'salida', 'fechaIngreso'],
                            ['FACT001', '2023-10-01', '1000000', 'OC123', 'ACTA001', '2023-10-02', '500000', '2023-10-01']
                        ];
                        const csvContent = format.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = 'formato_importacion.csv';
                        link.click();
                        URL.revokeObjectURL(link.href);
                    });
                }

                if (importFileInput) {
                    importFileInput.addEventListener('change', async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        try {
                            showModal(loadingModal, loadingProgress, 0);
                            const text = await file.text();
                            const rows = text.split('\n').map(row => row.split(',').map(cell => cell.replace(/^"|"$/g, '').trim()));
                            const headers = rows[0];
                            const dataRows = rows.slice(1);

                            const batch = writeBatch(db);
                            let processed = 0;
                            const total = dataRows.length;

                            for (const row of dataRows) {
                                if (row.length !== headers.length) continue;

                                const facturaData = {};
                                headers.forEach((header, index) => {
                                    facturaData[header] = row[index] || '';
                                });

                                const numeroFactura = facturaData.numeroFactura?.toLowerCase().trim();
                                if (!numeroFactura || await checkDuplicateFactura(numeroFactura)) {
                                    continue;
                                }

                                const montoFactura = parseCurrency(facturaData.montoFactura);
                                const salida = parseCurrency(facturaData.salida);
                                const oc = facturaData.oc?.trim();
                                let ocData = null;
                                if (oc) {
                                    ocData = await fetchOCData(oc);
                                    if (!ocData) continue;
                                }

                                const facturaId = await getNextFacturaId();
                                if (!facturaId) continue;

                                const fechaIngreso = facturaData.fechaIngreso ? createLocalDate(facturaData.fechaIngreso) : null;
                                const fechaSalida = facturaData.fechaSalida ? createLocalDate(facturaData.fechaSalida) : null;

                                const fullName = await getUserFullName(auth.currentUser.uid);
                                const data = {
                                    facturaId,
                                    facturaIdNumeric: parseInt(facturaId),
                                    numeroFactura,
                                    fechaFactura: facturaData.fechaFactura ? createLocalDate(facturaData.fechaFactura).toISOString() : null,
                                    montoFactura,
                                    oc,
                                    fechaOC: ocData && ocData.generacion ? createLocalDate(ocData.generacion).toISOString() : null,
                                    proveedor: ocData ? ocData.proveedorId || '' : '',
                                    proveedorSearch: generateSearchKeywords(ocData ? ocData.proveedorId || '' : ''),
                                    acta: facturaData.acta?.trim() || null,
                                    fechaSalida: fechaSalida ? fechaSalida.toISOString() : null,
                                    salida,
                                    fechaIngreso: fechaIngreso ? fechaIngreso.toISOString() : null,
                                    mesIngreso: fechaIngreso ? fechaIngreso.toLocaleString('es', { month: 'long' }).toLowerCase() : null,
                                    anioIngreso: fechaIngreso ? fechaIngreso.getFullYear() : null,
                                    mesSalida: fechaSalida ? fechaSalida.toLocaleString('es', { month: 'long' }).toLowerCase() : null,
                                    anioSalida: fechaSalida ? fechaSalida.getFullYear() : null,
                                    uid: auth.currentUser.uid,
                                    userName: fullName
                                };

                                const facturaRef = doc(collection(db, 'facturas'));
                                batch.set(facturaRef, data);
                                const logRef = doc(collection(db, 'facturas', facturaRef.id, 'logs'));
                                batch.set(logRef, {
                                    action: 'created',
                                    description: `Factura "${numeroFactura}" importada`,
                                    timestamp: new Date(),
                                    user: fullName,
                                    uid: auth.currentUser.uid
                                });

                                processed++;
                                const percentage = Math.round((processed / total) * 100);
                                showModal(loadingModal, loadingProgress, percentage);
                            }

                            await batch.commit();
                            hideModal(loadingModal);
                            showSuccessMessage(`Importación completada: ${processed} facturas procesadas.`);
                            await loadFacturas();
                        } catch (error) {
                            console.error('Error al importar facturas:', error);
                            showSuccessMessage(`Error al importar facturas: ${error.message}`, false);
                            hideModal(loadingModal);
                        } finally {
                            importFileInput.value = '';
                        }
                    });
                }
            } catch (error) {
                console.error('Error al verificar permisos:', error);
                container.innerHTML = '<p>Error al cargar el módulo. Por favor, intenta de nuevo.</p>';
            }
        });
    } catch (error) {
        console.error('Error al inicializar:', error);
        container.innerHTML = '<p>Error al inicializar el módulo. Por favor, intenta de nuevo.</p>';
    }
}

init();