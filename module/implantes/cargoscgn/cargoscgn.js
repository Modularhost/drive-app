import { getFirestore, collection, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, Timestamp, writeBatch, orderBy, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getApps, initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';

const firebaseConfig = {
    apiKey: "AIzaSyDmAf-vi7PhzzQkPZh89q9p3Mz4vGGPtd0",
    authDomain: "modular-app-387da.firebaseapp.com",
    projectId: "modular-app-387da",
    storageBucket: "modular-app-387da.firebasestorage.app",
    messagingSenderId: "271561966774",
    appId: "1:271561966774:web:e197c00e2abd67b4f0d217",
    measurementId: "G-7YT6MMR47X"
};

try {
    let app;
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }

    const auth = getAuth(app);
    const db = getFirestore(app);

    setPersistence(auth, browserLocalPersistence).catch(error => {
        console.warn('Error al configurar persistencia:', error.message);
    });

    const style = document.createElement('style');
    style.textContent = `
        .autocomplete-container {
            position: relative;
            width: 100%;
        }
        .autocomplete-container input {
            padding-right: 20px;
        }
        .autocomplete-list {
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            max-height: 300px;
            overflow-y: auto;
            background: var(--filter-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            margin: 4px 0 0 0;
            padding: 4px 0;
            list-style: none;
            display: none;
            font-family: 'Arial', sans-serif;
        }
        body.dark-mode .autocomplete-list {
            background: var(--dark-filter-bg);
            border: 1px solid var(--dark-border-color);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .autocomplete-list li {
            padding: 10px 14px;
            cursor: pointer;
            font-size: 12px;
            color: var(--text-color);
            transition: background-color 0.2s ease, color 0.2s ease;
        }
        body.dark-mode .autocomplete-list li {
            color: var(--dark-text-color);
        }
        .autocomplete-list li:hover {
            background: var(--hover-bg);
            color: var(--primary);
        }
        body.dark-mode .autocomplete-list li:hover {
            background: var(--dark-hover-bg);
            color: var(--dark-primary);
        }
        .search-icon {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: var(--secondary);
            font-size: 13px;
            transition: color 0.2s ease;
        }
        body.dark-mode .search-icon {
            color: var(--dark-secondary);
        }
        .search-icon:hover {
            color: var(--primary);
        }
        body.dark-mode .search-icon:hover {
            color: var(--dark-primary);
        }
        .field {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .field label {
            width: 120px;
            margin-right: 10px;
            font-size: 11px;
            color: var(--text-color);
        }
        body.dark-mode .field label {
            color: var(--dark-text-color);
        }
        .field input, .field select {
            flex: 1;
            padding: 8px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 0.95rem;
            color: var(--text-color);
            background: var(--input-bg);
        }
        body.dark-mode .field input, body.dark-mode .field select {
            border: 1px solid var(--dark-border-color);
            color: var(--dark-text-color);
            background: var(--dark-input-bg);
        }
        .field input:focus, .field select:focus {
            outline: none;
            border-color: var(--primary);
        }
        body.dark-mode .field input:focus, body.dark-mode .field select:focus {
            border-color: var(--dark-primary);
        }
        .remove-item-btn {
            margin-left: 10px;
            cursor: pointer;
            color: var(--danger);
            font-size: 1.2rem;
        }
        body.dark-mode .remove-item-btn {
            color: var(--dark-danger);
        }
    `;
    document.head.appendChild(style);

    const container = document.querySelector('.cargosconsignacion-container');
    const tableBody = document.querySelector('#cargosconsignacion-table tbody');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const totalRecords = document.getElementById('total-records');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const editModal = document.getElementById('edit-cargo-modal');
    const editIdInput = document.getElementById('edit-id');
    const editAdmisionInput = document.getElementById('edit-admision');
    const editNombrePacienteInput = document.getElementById('edit-nombrePaciente');
    const editProveedorInput = document.getElementById('edit-proveedor');
    const editDescriptionInput = document.getElementById('edit-descripcion');
    const editCantidadInput = document.getElementById('edit-cantidad');
    const editPrecioInput = document.getElementById('edit-precio');
    const editTotalInput = document.getElementById('edit-total');
    const editEstadoSelect = document.getElementById('edit-estado');
    const editFechaTraspasoInput = document.getElementById('edit-fechaTraspaso');
    const editFechaCargoInput = document.getElementById('edit-fechaCargo');
    const editFechaCXInput = document.getElementById('edit-fechaCX');
    const editMedicoInput = document.getElementById('edit-medico');
    const editModalidadInput = document.getElementById('edit-modalidad');
    const editReferenciaInput = document.getElementById('edit-referencia');
    const editLoteInput = document.getElementById('edit-lote');
    const editNGuiaInput = document.getElementById('edit-nGuia');
    const editFechaVencimientoInput = document.getElementById('edit-fechaVencimiento');
    const editCANTIDInput = document.getElementById('edit-CANTID');
    const editCARGOInput = document.getElementById('edit-CARGO');
    const editCODInput = document.getElementById('edit-COD');
    const editVENTAInput = document.getElementById('edit-VENTA');
    const editMargenInput = document.getElementById('edit-margen');
    const editCodigoInput = document.getElementById('edit-codigo');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const deleteModal = document.getElementById('delete-cargo-modal');
    const deleteMessage = document.getElementById('delete-message');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const logModal = document.getElementById('log-modal');
    const logContent = document.getElementById('log-content');
    const closeLogBtn = document.getElementById('close-log-btn');
    const successModal = document.getElementById('success-modal');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.getElementById('success-message');
    const changeStateModal = document.getElementById('change-state-modal');
    const changeStateSelect = document.getElementById('change-state-select');
    const saveStateBtn = document.getElementById('save-state-btn');
    const cancelStateBtn = document.getElementById('cancel-state-btn');
    const filterYearSelect = document.getElementById('filter-year');
    const filterMonthSelect = document.getElementById('filter-month');
    const showAllBtn = document.getElementById('show-all-btn');
    const stateButtonsContainer = document.getElementById('state-buttons');
    const quickEditModal = document.getElementById('quick-edit-modal');
    const quickLoteInput = document.getElementById('quick-lote');
    const quickNGuiaInput = document.getElementById('quick-nGuia');
    const quickFechaVencimientoInput = document.getElementById('quick-fechaVencimiento');
    const saveQuickEditBtn = document.getElementById('save-quick-edit-btn');
    const cancelQuickEditBtn = document.getElementById('cancel-quick-edit-btn');
    const packageModal = document.getElementById('package-modal');
    const packageModalTitle = document.getElementById('package-modal-title');
    const packageItemsContainer = document.getElementById('package-items-container');
    const addItemBtn = document.getElementById('add-item-btn');
    const savePackageBtn = document.getElementById('save-package-btn');
    const cancelPackageBtn = document.getElementById('cancel-package-btn');
    const bulkChangeStateModal = document.getElementById('bulk-change-state-modal');
    const bulkChangeStateSelect = document.getElementById('bulk-change-state-select');
    const bulkChangeMessage = document.getElementById('bulk-change-message');
    const saveBulkStateBtn = document.getElementById('save-bulk-state-btn');
    const cancelBulkStateBtn = document.getElementById('cancel-bulk-state-btn');
    const bulkChangeStateBtn = document.getElementById('bulk-change-state-btn');

    const bulkChangeFechaCargoModal = document.getElementById('bulk-change-fechaCargo-modal');
    const bulkFechaCargoInput = document.getElementById('bulk-fechaCargo-input');
    const saveBulkFechaCargoBtn = document.getElementById('save-bulk-fechaCargo-btn');
    const cancelBulkFechaCargoBtn = document.getElementById('cancel-bulk-fechaCargo-btn');
    const bulkChangeFechaCargoMessage = document.getElementById('bulk-change-fechaCargo-message');
    const bulkChangeGuiaModal = document.getElementById('bulk-change-guia-modal');
    const bulkLoteInput = document.getElementById('bulk-lote-input');
    const bulkNGuiaInput = document.getElementById('bulk-nGuia-input');
    const bulkFechaVencimientoInput = document.getElementById('bulk-fechaVencimiento-input');
    const saveBulkGuiaBtn = document.getElementById('save-bulk-guia-btn');
    const cancelBulkGuiaBtn = document.getElementById('cancel-bulk-guia-btn');
    const bulkChangeGuiaMessage = document.getElementById('bulk-change-guia-message');
    const bulkChangeFechaCargoBtn = document.getElementById('bulk-change-fechaCargo-btn');
    const bulkChangeGuiaBtn = document.getElementById('bulk-change-guia-btn');

    const elements = {
        container, tableBody, prevBtn, nextBtn, pageInfo, totalRecords, exportExcelBtn,
        editModal, editIdInput, editAdmisionInput, editNombrePacienteInput, editProveedorInput, editDescriptionInput,
        editCantidadInput, editPrecioInput, editTotalInput, editEstadoSelect, editFechaTraspasoInput, editFechaCargoInput,
        editFechaCXInput, editMedicoInput, editModalidadInput, editReferenciaInput, editLoteInput,
        editNGuiaInput, editFechaVencimientoInput, editCANTIDInput, editCARGOInput, editCODInput,
        editVENTAInput, editMargenInput, editCodigoInput, saveEditBtn, cancelEditBtn, deleteModal, deleteMessage,
        confirmDeleteBtn, cancelDeleteBtn, logModal, logContent, closeLogBtn, successModal,
        successIcon, successMessage, changeStateModal, changeStateSelect, saveStateBtn, cancelStateBtn,
        filterYearSelect, filterMonthSelect, showAllBtn, stateButtonsContainer,
        quickEditModal, quickLoteInput, quickNGuiaInput, quickFechaVencimientoInput, saveQuickEditBtn,
        cancelQuickEditBtn, packageModal, packageModalTitle, packageItemsContainer, addItemBtn,
        savePackageBtn, cancelPackageBtn, bulkChangeStateModal, bulkChangeStateSelect, bulkChangeMessage,
        saveBulkStateBtn, cancelBulkStateBtn, bulkChangeStateBtn,
        bulkChangeFechaCargoModal, bulkFechaCargoInput, saveBulkFechaCargoBtn, cancelBulkFechaCargoBtn, bulkChangeFechaCargoMessage,
        bulkChangeGuiaModal, bulkLoteInput, bulkNGuiaInput, bulkFechaVencimientoInput, saveBulkGuiaBtn, cancelBulkGuiaBtn, bulkChangeGuiaMessage,
        bulkChangeFechaCargoBtn, bulkChangeGuiaBtn
    };

    Object.entries(elements).forEach(([key, el]) => {
        if (!el) console.warn(`Elemento ${key} no encontrado`);
    });

    let currentUser = null;
    let currentEditId = null;
    let currentStateChangeId = null;
    let currentQuickEditId = null;
    let currentPackageId = null;
    let cargos = [];
    let currentPage = 1;
    const recordsPerPage = 100;
    let filters = {};
    let quickFilters = { year: new Date().getFullYear().toString(), month: (new Date().getMonth() + 1).toString().padStart(2, '0'), state: null };
    let packageItems = [];
    const packageCache = new Map();
    let currentReferencias = [];
    let selectedCargos = new Set();

    const monthNames = {
        '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
        '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
    };

    function calculateMargin(precio) {
        if (!precio || isNaN(precio)) return '-';
        precio = parseFloat(precio);
        if (precio < 301) return '500%';
        if (precio < 1001) return '400%';
        if (precio < 5001) return '300%';
        if (precio < 10001) return '250%';
        if (precio < 25001) return '200%';
        if (precio < 50001) return '160%';
        if (precio < 100001) return '140%';
        if (precio < 200001) return '80%';
        return '50%';
    }

    function calculateVenta(modalidad, precio, margen, cantidad) {
        if (!precio || isNaN(precio) || !cantidad || isNaN(cantidad)) return '-';
        precio = parseFloat(precio);
        cantidad = parseInt(cantidad);
        let margenDecimal;
        if (modalidad === 'Consignación') {
            if (!margen || margen === '-') return '-';
            margenDecimal = parseFloat(margen.replace('%', '')) / 100;
        } else if (modalidad === 'Cotización') {
            margenDecimal = 0.30;
        } else {
            return '-';
        }
        const venta = (precio + (precio * margenDecimal)) * cantidad;
        return venta.toLocaleString('es-CO', {
            minimumFractionDigits: '0'
        });
    }

    function formatDate(date) {
        return date.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function formatDateOnly(date) {
        if (!date) return '-';
        let parsedDate;
        if (typeof date === 'string') {
            // Asumir que el string está en formato YYYY-MM-DD
            const [year, month, day] = date.split('-').map(Number);
            parsedDate = new Date(year, month - 1, day);
        } else if (date instanceof Timestamp) {
            parsedDate = date.toDate();
        } else if (date instanceof Date) {
            parsedDate = date;
        }
        if (!parsedDate || isNaN(parsedDate)) return '-';
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        return `${day}-${month}-${year}`;
    }

    function formatDateForInput(date) {
        if (!date) return '';
        let parsedDate;
        if (typeof date === 'string') {
            parsedDate = new Date(date);
        } else if (date instanceof Timestamp) {
            parsedDate = date.toDate();
        } else if (date instanceof Date) {
            parsedDate = date;
        }
        if (!parsedDate || isNaN(parsedDate.getTime())) return '';
        // Ajusta la fecha para que sea consistente con la zona horaria local
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatPrice(value) {
        return value ? parseFloat(value).toLocaleString('es-CO', { minimumFractionDigits: 0 }) : '-';
    }

    function showModal(modal) {
        if (!modal) {
            console.warn('Modal no encontrado');
            return;
        }
        modal.style.display = 'flex';
        modal.removeAttribute('hidden');
    }

    function hideModal(modal) {
        if (!modal) {
            console.warn('Modal no encontrado');
            return;
        }
        modal.style.display = 'none';
        modal.setAttribute('hidden', 'true');
    }

    let lastErrorMessage = null;
    let lastErrorTime = 0;
    const ERROR_DEBOUNCE_MS = 3000;

    function showSuccessMessage(message, isSuccess = true) {
        if (!successModal || !successIcon || !successMessage) {
            console.warn('Elementos de éxito no encontrados');
            alert('Mensaje:', message);
            return;
        }
        const now = Date.now();
        if (isSuccess || (message !== lastErrorMessage || now - lastErrorTime > ERROR_DEBOUNCE_MS)) {
            successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
            successMessage.textContent = message;
            successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
            showModal(successModal);
            setTimeout(() => hideModal(successModal), 2000);
            if (!isSuccess) {
                lastErrorMessage = message;
                lastErrorTime = now;
            }
        }
    }

    async function getUserFullName() {
        if (!currentUser) throw new Error('No se encontró el usuario autenticado');
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
        return userSnap.data().fullName || 'Usuario Desconocido';
    }

    async function loadReferenciasByProveedor(proveedor) {
        try {
            if (!proveedor) {
                currentReferencias = [];
                return [];
            }
            const q = query(collection(db, 'referencias'), where('proveedor', '==', proveedor), orderBy('referencia', 'asc'));
            const querySnapshot = await getDocs(q);
            const referencias = querySnapshot.docs.map(doc => ({
                docId: doc.id,
                referencia: doc.data().referencia || '-',
                descripcion: doc.data().descripcion || ''
            }));
            currentReferencias = referencias;
            return referencias;
        } catch (error) {
            console.error('Error al cargar referencias:', error);
            showSuccessMessage('Error al cargar referencias', false);
            return [];
        }
    }

    function filterAndRenderReferencias(input, suggestionsList, referencias, showAll = false) {
        suggestionsList.innerHTML = '';
        const inputValue = input.value.trim();
        let filteredReferencias = showAll || !inputValue
            ? referencias
            : referencias.filter(ref => ref.referencia.toLowerCase().includes(inputValue.toLowerCase()));
        if (filteredReferencias.length === 0 && !showAll) {
            suggestionsList.style.display = 'none';
            return;
        }
        filteredReferencias.forEach(ref => {
            const li = document.createElement('li');
            li.textContent = ref.referencia;
            li.addEventListener('click', async () => {
                input.value = ref.referencia;
                suggestionsList.innerHTML = '';
                suggestionsList.style.display = 'none';
                try {
                    const refDoc = await getDoc(doc(db, 'referencias', ref.docId));
                    const descripcionInput = input.closest('.field').parentNode.querySelector('input[id^="item-descripcion-"]');
                    if (refDoc.exists()) {
                        descripcionInput.value = refDoc.data().descripcion || '';
                    } else {
                        descripcionInput.value = '';
                    }
                } catch (err) {
                    console.error('Error al cargar descripción:', err.message);
                    showSuccessMessage('Error al cargar descripción', false);
                }
            });
            suggestionsList.appendChild(li);
        });
        suggestionsList.style.display = filteredReferencias.length > 0 ? 'block' : 'none';
    }

    function setupReferenciaAutocomplete(inputId, suggestionsListId, searchIconId, referencias) {
        const input = document.getElementById(inputId);
        const suggestionsList = document.getElementById(suggestionsListId);
        const icon = document.getElementById(searchIconId);
        if (!input || !suggestionsList || !icon) {
            console.error('Elementos no encontrados:', { inputId, suggestionsListId, searchIconId });
            return;
        }

        input.addEventListener('input', async () => {
            filterAndRenderReferencias(input, suggestionsList, referencias, false);
            const inputValue = input.value.trim().toUpperCase();
            const descripcionInput = input.closest('.field').parentNode.querySelector('input[id^="item-descripcion-"]');
            if (inputValue) {
                try {
                    const q = query(collection(db, 'referencias'), where('referencia', '==', inputValue));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const refData = querySnapshot.docs[0].data();
                        descripcionInput.value = refData.descripcion || '';
                    } else {
                        descripcionInput.value = '';
                    }
                } catch (error) {
                    console.error('Error al consultar descripción:', error.message);
                    descripcionInput.value = '';
                }
            } else {
                descripcionInput.value = '';
            }
        });

        input.addEventListener('focus', () => {
            if (input.value.trim()) filterAndRenderReferencias(input, suggestionsList, referencias, false);
        });

        icon.addEventListener('click', () => filterAndRenderReferencias(input, suggestionsList, referencias, true));

        document.addEventListener('click', e => {
            if (!input.contains(e.target) && !suggestionsList.contains(e.target) && !icon.contains(e.target)) {
                suggestionsList.innerHTML = '';
                suggestionsList.style.display = 'none';
            }
        });
    }

    async function checkAndExpandPackage(cod) {
        try {
            if (!cod) {
                packageItems = [];
                return false;
            }
            if (packageCache.has(cod)) {
                const cached = packageCache.get(cod);
                packageItems = cached.items;
                return cached.isPackage;
            }
            const paquetesCollection = collection(db, 'paquetes');
            let queryField = 'code';
            let q = query(paquetesCollection, where(queryField, '==', cod));
            let querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                queryField = 'codigo';
                q = query(paquetesCollection, where(queryField, '==', cod));
                querySnapshot = await getDocs(q);
            }
            if (!querySnapshot.empty) {
                const paquete = querySnapshot.docs[0].data();
                packageItems = paquete.items.map(item => ({
                    referencia: item.referencia || '',
                    descripcion: item.descripcion || '',
                    cantidad: item.cantidad || 1,
                    lote: item.lote || '',
                    fechaVencimiento: item.fechaVencimiento ? formatDateForInput(item.fechaVencimiento) : ''
                }));
                packageCache.set(cod, { isPackage: true, items: packageItems });
                return true;
            } else {
                packageItems = [];
                packageCache.set(cod, { isPackage: false, items: [] });
                return false;
            }
        } catch (error) {
            console.error('Error al buscar paquete:', error.message);
            showSuccessMessage('Error al cargar paquete', false);
            return false;
        }
    }

    async function getPackageData(cod) {
        try {
            if (!cod) {
                return { isPackage: false, items: [], descripcion: '' };
            }
            if (packageCache.has(cod)) {
                return packageCache.get(cod);
            }
            const paquetesCollection = collection(db, 'paquetes');
            let queryField = 'code';
            let q = query(paquetesCollection, where(queryField, '==', cod));
            let querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                queryField = 'codigo';
                q = query(paquetesCollection, where(queryField, '==', cod));
                querySnapshot = await getDocs(q);
            }
            if (!querySnapshot.empty) {
                const paquete = querySnapshot.docs[0].data();
                const items = paquete.items.map(item => ({
                    referencia: item.referencia || '-',
                    descripcion: item.descripcion || '',
                    cantidad: item.cantidad || 1,
                    lote: item.lote || '',
                    fechaVencimiento: item.fechaVencimiento ? formatDateForInput(item.fechaVencimiento) : ''
                }));
                const result = { isPackage: true, items, descripcion: paquete.descripcion || paquete.nombre || cod };
                packageCache.set(cod, result);
                return result;
            } else {
                const result = { isPackage: false, items: [], descripcion: cod };
                packageCache.set(cod, result);
                return result;
            }
        } catch (error) {
            console.error('Error al obtener datos del paquete:', error.message);
            showSuccessMessage('Error al obtener datos del paquete', false);
            return { isPackage: false, items: [], descripcion: cod };
        }
    }

    function togglePackageRows(cargoId) {
        const tbody = document.querySelector('#cargosconsignacion-table tbody');
        const rows = tbody.querySelectorAll('tr');
        const rowIndex = Array.from(rows).findIndex(row => row.dataset.cargoId === cargoId);
        const packageRows = tbody.querySelectorAll(`tr.package-sub-row[data-parent-id="${cargoId}"]`);
        const toggleIcon = rows[rowIndex].querySelector('.package-toggle');

        const isHidden = packageRows.length > 0 && packageRows[0].classList.contains('package-sub-row-hidden');

        packageRows.forEach(subRow => {
            subRow.classList.toggle('package-sub-row-hidden', !isHidden);
        });

        if (toggleIcon) {
            toggleIcon.className = `fas fa-${isHidden ? 'chevron-up' : 'chevron-down'} action-icon package-toggle`;
        }
    }

    function applyFilters(data) {
        return data.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = item[key]?.toString().toLowerCase() || '';
                return itemValue.includes(value.toLowerCase());
            });
        });
    }

    function applyQuickFilters(data) {
        return data.filter(item => {
            if (!item.fechaCX) {
                return false;
            }
            let fechaCX;
            if (typeof item.fechaCX === 'string') {
                fechaCX = new Date(item.fechaCX);
            } else if (item.fechaCX instanceof Timestamp) {
                fechaCX = item.fechaCX.toDate();
            } else if (item.fechaCX instanceof Date) {
                fechaCX = item.fechaCX;
            }
            if (!fechaCX || isNaN(fechaCX)) {
                return false;
            }
            const year = fechaCX.getFullYear().toString();
            const month = (fechaCX.getMonth() + 1).toString().padStart(2, '0');
            const yearMatch = !quickFilters.year || year === quickFilters.year;
            const monthMatch = !quickFilters.month || month === quickFilters.month;
            const stateMatch = !quickFilters.state || item.estado === quickFilters.state;
            return yearMatch && monthMatch && stateMatch;
        });
    }

    function updateYearFilter(data) {
        if (!filterYearSelect) return;
        const years = [...new Set(data
            .filter(p => p?.fechaCX)
            .map(p => {
                let fechaCX;
                if (typeof p.fechaCX === 'string') fechaCX = new Date(p.fechaCX);
                else if (p.fechaCX instanceof Timestamp) fechaCX = p.fechaCX.toDate();
                else if (p.fechaCX instanceof Date) fechaCX = p.fechaCX;
                return fechaCX && !isNaN(fechaCX) ? fechaCX.getFullYear().toString() : null;
            })
            .filter(y => y)
        )].sort((a, b) => b - a);

        filterYearSelect.innerHTML = '<option value="">Todos los años</option>' + years.map(year => `<option value="${year}">${year}</option>`).join('');
        filterYearSelect.value = quickFilters.year || '';
    }

    function updateMonthFilter(data) {
        if (!filterMonthSelect) return;
        const months = [...new Set(data
            .filter(p => {
                if (!p.fechaCX) return false;
                let fechaCX;
                if (typeof p.fechaCX === 'string') fechaCX = new Date(p.fechaCX);
                else if (p.fechaCX instanceof Timestamp) fechaCX = p.fechaCX.toDate();
                else if (p.fechaCX instanceof Date) fechaCX = p.fechaCX;
                if (!fechaCX || isNaN(fechaCX) || !quickFilters.year) return false;
                return !quickFilters.year || fechaCX.getFullYear().toString() === quickFilters.year;
            })
            .map(p => {
                let fechaCX;
                if (typeof p.fechaCX === 'string') fechaCX = new Date(p.fechaCX);
                else if (p.fechaCX instanceof Timestamp) fechaCX = p.fechaCX.toDate();
                return fechaCX ? (fechaCX.getMonth() + 1).toString().padStart(2, '0') : '';
            })
            .filter(m => m)
        )].sort();

        filterMonthSelect.innerHTML = '<option value="">Todos los meses</option>' + months.map(month => `<option value="${month}" title="${monthNames[month]}">${monthNames[month]}</option>`).join('');
        filterMonthSelect.value = quickFilters.month || '';
    }

    function updateStateButtons(data) {
        if (!stateButtonsContainer) return;
        const filteredCargos = applyQuickFilters(data);
        const states = [...new Set(filteredCargos
            .map(p => p.estado)
            .filter(s => s)
        )].sort();

        stateButtonsContainer.innerHTML = states.map(state => {
            const stateClass = state.toLowerCase().replace(/\s+/g, '-');
            const isActive = state === quickFilters.state ? 'active' : '';
            return `<button class="state-button ${isActive}" data-state="${state}">${state}</button>`;
        }).join('');

        const stateButtons = stateButtonsContainer.querySelectorAll('.state-button');
        stateButtons.forEach(button => {
            button.addEventListener('click', () => {
                const state = button.dataset.state;
                quickFilters.state = quickFilters.state === state ? null : state;
                stateButtons.forEach(btn => btn.classList.remove('active'));
                if (quickFilters.state) button.classList.add('active');
                loadCargos();
            });
        });
    }

    function updatePagination(total) {
        if (!pageInfo || !totalRecords || !prevBtn || !nextBtn) return;
        const totalPages = Math.ceil(total / recordsPerPage);
        totalRecords.textContent = total;
        pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    function updateBulkChangeButtonState() {
        if (bulkChangeStateBtn) {
            bulkChangeStateBtn.disabled = selectedCargos.size === 0;
        }
        if (bulkChangeFechaCargoBtn) {
            bulkChangeFechaCargoBtn.disabled = selectedCargos.size === 0;
        }
        if (bulkChangeGuiaBtn) {
            bulkChangeGuiaBtn.disabled = selectedCargos.size === 0;
        }
    }

    async function updateMarginInFirestore(cargo) {
        try {
            if (cargo.margen && cargo.margen !== '-') return; // Ya tiene margen guardado, no hacer nada
            const margenCalculado = calculateMargin(cargo.precio);
            if (margenCalculado === '-') return; // No hay margen válido para calcular

            const cargoRef = doc(db, 'cargosconsignacion', cargo.docId);
            const now = Timestamp.fromDate(new Date());
            const fullName = await getUserFullName();

            const batch = writeBatch(db);
            batch.update(cargoRef, {
                margen: margenCalculado,
                fechaActualizada: now,
                uid: currentUser.uid
            });

            const logRef = doc(collection(db, 'cargosconsignacion', cargo.docId, 'logs'));
            batch.set(logRef, {
                action: `Actualizado:${formatDate(now.toDate())}`,
                description: `Margen calculado y guardado automáticamente: ${margenCalculado}`,
                timestamp: now,
                user: fullName,
                uid: currentUser.uid
            });

            await batch.commit();

            // Actualizar el objeto local
            cargo.margen = margenCalculado;
        } catch (error) {
            console.error(`Error al guardar margen para cargo ${cargo.docId}:`, error.message);
        }
    }

    async function loadCargos() {
        try {
            if (!tableBody) {
                showSuccessMessage('Error: No se encontró la tabla de cargos', false);
                return;
            }

            packageCache.clear();

            const cargosCollection = collection(db, 'cargosconsignacion');
            const q = query(cargosCollection, orderBy('fechaCX', 'asc'));
            const querySnapshot = await getDocs(q);
            cargos = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                cargos.push({ docId: doc.id, ...data });
            });

            if (cargos.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="27">No hay cargos disponibles</td></tr>';
                updatePagination(0);
                return;
            }

            // Ordenar los cargos en el cliente
            cargos.sort((a, b) => {
                let fechaA = a.fechaCX ? (a.fechaCX instanceof Timestamp ? a.fechaCX.toDate() : new Date(a.fechaCX)) : new Date(0);
                let fechaB = b.fechaCX ? (b.fechaCX instanceof Timestamp ? b.fechaCX.toDate() : new Date(b.fechaCX)) : new Date(0);
                if (fechaA.getTime() !== fechaB.getTime()) {
                    return fechaA.getTime() - fechaB.getTime();
                }
                const nombreA = (a.nombrePaciente || '').toLowerCase();
                const nombreB = (b.nombrePaciente || '').toLowerCase();
                if (nombreA !== nombreB) {
                    return nombreA.localeCompare(nombreB);
                }
                const proveedorA = (a.proveedor || '').toLowerCase();
                const proveedorB = (b.proveedor || '').toLowerCase();
                return proveedorA.localeCompare(proveedorB);
            });

            // Calcular y guardar margen si no existe (para todos los cargos cargados)
            const updatePromises = cargos.map(cargo => updateMarginInFirestore(cargo));
            await Promise.all(updatePromises);

            updateYearFilter(cargos);
            updateMonthFilter(cargos);
            updateStateButtons(cargos);

            let filteredCargos = applyQuickFilters(cargos);
            filteredCargos = applyFilters(filteredCargos);
            const startIndex = (currentPage - 1) * recordsPerPage;
            const endIndex = startIndex + recordsPerPage;
            const paginatedCargos = filteredCargos.slice(startIndex, endIndex);

            // Fetch package data only for paginated cargos
            const packagePromises = paginatedCargos.map(cargo => getPackageData(cargo.COD));
            const packageData = await Promise.all(packagePromises);

            const fragment = document.createDocumentFragment();
            tableBody.innerHTML = '';
            selectedCargos.clear();
            updateBulkChangeButtonState();

            paginatedCargos.forEach((cargo, index) => {
                const packageInfo = packageData[index] || { isPackage: false, items: [], descripcion: cargo.COD || '-' };
                const isPackage = packageInfo.isPackage;
                const tr = document.createElement('tr');
                tr.dataset.cargoId = cargo.docId;
                const estado = cargo.estado || '';
                const estadoClass = estado ? `state-${estado.toLowerCase().replace(/\s+/g, '-')}` : '';
                tr.className = estadoClass;
                tr.innerHTML = `
                <td>
                    <i class="fas fa-edit action-icon" data-id="${cargo.docId}" title="Editar"></i>
                    <i class="fas fa-trash action-icon" data-id="${cargo.docId}" title="Eliminar"></i>
                    <i class="fas fa-history action-icon" data-id="${cargo.docId}" title="Historial"></i>
                    ${isPackage ? `
                        <i class="fas fa-plus action-icon package-add" data-id="${cargo.docId}" title="Agregar Paquete"></i>
                        <i class="fas fa-chevron-down action-icon package-toggle" data-id="${cargo.docId}" title="Ver ítems de paquete"></i>
                    ` : `
                        <i class="fas fa-plus-circle action-icon quick-add" data-id="${cargo.docId}" title="Editar Lote, Guía y Fecha"></i>
                    `}
                </td>
                <td class="checkbox-cell">
                    <input type="checkbox" data-id="${cargo.docId}" class="cargo-checkbox">
                </td>
                <td class="state-cell" data-id="${cargo.docId}">${cargo.estado || '-'}</td>
                <td>${cargo.admision || '-'}</td>
                <td>${cargo.COD || '-'}</td>
                <td>${cargo.CANTID || '-'}</td>
                <td>${calculateVenta(cargo.modalidad, cargo.precio, calculateMargin(cargo.precio), cargo.cantidad)}</td>
                <td>${cargo.nGuia || '-'}</td>
                <td>${cargo.lote || '-'}</td>
                <td>${formatDateOnly(cargo.fechaVencimiento)}</td>
                <td>${cargo.CARGO || '-'}</td>
                <td>${formatDateOnly(cargo.fechaCargo)}</td>
                <td>${cargo.admision || '-'}</td>
                <td>${cargo.nombrePaciente || '-'}</td>
                <td>${cargo.medico || '-'}</td>
                <td>${formatDateOnly(cargo.fechaCX)}</td>
                <td>${cargo.proveedor || '-'}</td>
                <td>${cargo.codigo || '-'}</td>
                <td>${cargo.descripcion || '-'}</td>
                <td>${cargo.cantidad || '-'}</td>
                <td>${formatPrice(cargo.precio)}</td>
                <td>${cargo.modalidad || '-'}</td>
                <td>${formatPrice(cargo.total)}</td>
                <td>${cargo.referencia || '-'}</td>
                <td>${formatDateOnly(cargo.fechaCreacion)}</td>
                <td>${formatDateOnly(cargo.fechaTraspaso)}</td>
                <td>${cargo.margen || calculateMargin(cargo.precio)}</td> <!-- Usar margen guardado o calcular si no existe -->
                <td>${cargo.usuario || '-'}</td>
            `;
                fragment.appendChild(tr);

                if (isPackage && packageInfo.items.length > 0) {
                    packageInfo.items.forEach(item => {
                        const subRow = document.createElement('tr');
                        subRow.className = 'package-sub-row package-sub-row-hidden';
                        subRow.dataset.parentId = cargo.docId;
                        subRow.innerHTML = `
                        <td colspan="27">
                            <span>Ítem de Paquete: </span>
                            <strong>Referencia:</strong> ${item.referencia || '-'}, 
                            <strong>Descripción:</strong> ${item.descripcion || '-'}, 
                            <strong>Cantidad:</strong> ${item.cantidad || '1'}, 
                            <strong>Lote:</strong> ${item.lote || '-'}, 
                            <strong>Fecha Vencimiento:</strong> ${item.fechaVencimiento || '-'}
                        </td>
                    `;
                        fragment.appendChild(subRow);
                    });
                }
            });

            tableBody.appendChild(fragment);
            updatePagination(filteredCargos.length);
            setupTableEventListeners();
        } catch (error) {
            showSuccessMessage('Error al cargar cargos: ' + error.message, false);
        }
    }

    function openEditModal(cargoId) {
        if (!editModal) {
            console.warn('editModal no encontrado');
            return;
        }
        const cargo = cargos.find(c => c.docId === cargoId);
        if (!cargo) return;
        currentEditId = cargoId;
        editIdInput.value = cargo.admision || '';
        editAdmisionInput.value = cargo.admision || '';
        editNombrePacienteInput.value = cargo.nombrePaciente || '';
        editProveedorInput.value = cargo.proveedor || '';
        editDescriptionInput.value = cargo.descripcion || '';
        editCantidadInput.value = cargo.cantidad || '1';
        editPrecioInput.value = cargo.precio || '0';
        editTotalInput.value = cargo.total || '0';
        editEstadoSelect.value = cargo.estado || 'Actualizar Precio';
        editFechaTraspasoInput.value = formatDateForInput(cargo.fechaTraspaso);
        editFechaCargoInput.value = formatDateForInput(cargo.fechaCargo);
        editFechaCXInput.value = formatDateForInput(cargo.fechaCX);
        editMedicoInput.value = cargo.medico || '';
        editModalidadInput.value = cargo.modalidad || '';
        editReferenciaInput.value = cargo.referencia || '';
        editLoteInput.value = cargo.lote || '';
        editNGuiaInput.value = cargo.nGuia || '';
        editFechaVencimientoInput.value = formatDateForInput(cargo.fechaVencimiento);
        editCANTIDInput.value = cargo.CANTID || '1';
        editCARGOInput.value = cargo.CARGO || '';
        editCODInput.value = cargo.COD || '';
        editVENTAInput.value = calculateVenta(cargo.modalidad, cargo.precio, calculateMargin(cargo.precio), cargo.cantidad) || '';
        editMargenInput.value = cargo.margen || calculateMargin(cargo.precio) || ''; // Usar margen guardado o calcular
        editCodigoInput.value = cargo.codigo || '';
        packageItems = [];
        showModal(editModal);
    }

    function openQuickEditModal(cargoId) {
        if (!quickEditModal) {
            console.warn('quickEditModal no encontrado');
            return;
        }
        const cargo = cargos.find(c => c.docId === cargoId);
        if (!cargo) return;
        currentQuickEditId = cargoId;
        quickLoteInput.value = cargo.lote || '';
        quickNGuiaInput.value = cargo.nGuia || '';
        quickFechaVencimientoInput.value = formatDateForInput(cargo.fechaVencimiento);
        showModal(quickEditModal);
    }

    function openChangeStateModal(cargoId) {
        if (!changeStateModal || !changeStateSelect) {
            console.warn('changeStateModal o changeStateSelect no encontrados');
            return;
        }
        const cargo = cargos.find(c => c.docId === cargoId);
        if (!cargo) return;
        currentStateChangeId = cargoId;
        changeStateSelect.value = cargo.estado || 'Actualizar Precio';
        showModal(changeStateModal);
    }

    function openDeleteModal(cargoId) {
        if (!deleteModal || !deleteMessage) {
            console.warn('deleteModal o deleteMessage no encontrados');
            return;
        }
        const cargo = cargos.find(c => c.docId === cargoId);
        if (!cargo) return;
        deleteMessage.textContent = `¿Estás seguro de que quieres eliminar el cargo para "${cargo.nombrePaciente || 'Sin paciente'}"?`;
        confirmDeleteBtn.dataset.id = cargoId;
        showModal(deleteModal);
    }

    async function openPackageModal(cargoId) {
        if (!packageModal || !packageModalTitle || !packageItemsContainer) {
            console.warn('packageModal o sus elementos no encontrados');
            showSuccessMessage('Error: No se encontró el modal de paquete', false);
            return;
        }
        const cargo = cargos.find(c => c.docId === cargoId);
        if (!cargo) {
            showSuccessMessage('Error: Cargo no encontrado', false);
            return;
        }
        currentPackageId = cargoId;
        currentReferencias = await loadReferenciasByProveedor(cargo.proveedor);
        const packageData = await getPackageData(cargo.COD);
        packageModalTitle.textContent = `${cargo.descripcion || cargo.COD || 'Paquete'} - Proveedor: ${cargo.proveedor || '-'}`;
        packageItemsContainer.innerHTML = '';
        if (packageData.items.length > 0) {
            packageData.items.forEach(item => addPackageItem(item));
        } else {
            addPackageItem();
        }
        showModal(packageModal);
    }

    function addPackageItem(data = {}) {
        if (!packageItemsContainer) return;
        const itemCount = packageItemsContainer.querySelectorAll('.package-item').length + 1;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'package-item';
        itemDiv.innerHTML = `
            <div class="field">
                <label for="item-referencia-${itemCount}">Referencia</label>
                <div class="autocomplete-container">
                    <input id="item-referencia-${itemCount}" type="text" placeholder="Buscar referencia" value="${data.referencia || ''}" required>
                    <i id="item-referencia-search-${itemCount}" class="fas fa-search search-icon" title="Mostrar todas las referencias"></i>
                    <ul id="item-referencia-list-${itemCount}" class="autocomplete-list"></ul>
                </div>
            </div>
            <div class="field">
                <label for="item-descripcion-${itemCount}">Descripción</label>
                <input id="item-descripcion-${itemCount}" type="text" placeholder="Descripción" value="${data.descripcion || ''}" required readonly>
            </div>
            <div class="field">
                <label for="item-cantidad-${itemCount}">Cantidad</label>
                <input id="item-cantidad-${itemCount}" type="number" min="1" placeholder="Cantidad" value="${data.cantidad || 1}">
            </div>
            <div class="field">
                <label for="item-lote-${itemCount}">Lote</label>
                <input id="item-lote-${itemCount}" type="text" placeholder="Lote" value="${data.lote || ''}">
            </div>
            <div class="field">
                <label for="item-fechaVencimiento-${itemCount}">Fecha Vencimiento</label>
                <input id="item-fechaVencimiento-${itemCount}" type="date" value="${data.fechaVencimiento || ''}">
            </div>
            <i class="fas fa-trash remove-item-btn" title="Eliminar Item"></i>
        `;
        packageItemsContainer.appendChild(itemDiv);
        setupReferenciaAutocomplete(
            `item-referencia-${itemCount}`,
            `item-referencia-list-${itemCount}`,
            `item-referencia-search-${itemCount}`,
            currentReferencias
        );
        const removeBtn = itemDiv.querySelector('.remove-item-btn');
        removeBtn.addEventListener('click', () => {
            itemDiv.remove();
            renumberPackageItems();
        });
    }

    function renumberPackageItems() {
        const items = packageItemsContainer.querySelectorAll('.package-item');
        items.forEach((item, index) => {
            const inputs = item.querySelectorAll('input, select');
            inputs.forEach(input => {
                const oldId = input.id;
                const newId = oldId.replace(/-\d+$/, `-${index + 1}`);
                input.id = newId;
                const label = item.querySelector(`label[for="${oldId}"]`);
                if (label) label.setAttribute('for', newId);
                if (input.id.startsWith('item-referencia-')) {
                    const suggestionsList = item.querySelector('.autocomplete-list');
                    if (suggestionsList) {
                        suggestionsList.id = `item-referencia-list-${index + 1}`;
                    }
                    const searchIcon = item.querySelector('.search-icon');
                    if (searchIcon) {
                        searchIcon.id = `item-referencia-search-${index + 1}`;
                    }
                }
            });
        });
    }

    async function handlePackageSave() {
        if (!currentPackageId) {
            showSuccessMessage('Error: No se seleccionó un cargo', false);
            return;
        }
        const cargo = cargos.find(c => c.docId === currentPackageId);
        if (!cargo) {
            showSuccessMessage('Error: Cargo no encontrado', false);
            return;
        }
        const items = [];
        const itemDivs = packageItemsContainer.querySelectorAll('.package-item');
        for (const itemDiv of itemDivs) {
            const referencia = itemDiv.querySelector(`input[id^="item-referencia-"]`)?.value.trim() || '';
            const descripcion = itemDiv.querySelector(`input[id^="item-descripcion-"]`)?.value.trim() || '';
            const cantidad = parseInt(itemDiv.querySelector(`input[id^="item-cantidad-"]`)?.value) || 1;
            const lote = itemDiv.querySelector(`input[id^="item-lote-"]`)?.value.trim() || '';
            const fechaVencimiento = itemDiv.querySelector(`input[id^="item-fechaVencimiento-"]`)?.value || '';
            if (!referencia || !descripcion) {
                showSuccessMessage('Error: Todos los ítems deben tener referencia y descripción', false);
                return;
            }
            if (!currentReferencias.some(ref => ref.referencia === referencia)) {
                showSuccessMessage(`Error: La referencia "${referencia}" no es válida para el proveedor ${cargo.proveedor}`, false);
                return;
            }
            items.push({
                referencia,
                descripcion,
                cantidad,
                lote,
                fechaVencimiento: fechaVencimiento ? Timestamp.fromDate(new Date(fechaVencimiento)) : null
            });
        }
        try {
            const fullName = await getUserFullName();
            const now = Timestamp.fromDate(new Date());
            const packageRef = doc(db, 'paquetes', cargo.COD);
            const packageData = {
                code: cargo.COD,
                codigo: cargo.COD,
                paqueteId: cargo.COD,
                descripcion: cargo.descripcion || cargo.COD,
                items,
                fechaActualizada: now,
                usuario: fullName,
                uid: currentUser.uid
            };
            const batch = writeBatch(db);
            batch.set(packageRef, packageData);
            const logRef = doc(collection(db, 'cargosconsignacion', currentPackageId, 'logs'));
            batch.set(logRef, {
                action: `Actualizado:${formatDate(now.toDate())}`,
                description: `Paquete actualizado con ${items.length} ítems`,
                timestamp: now,
                user: fullName,
                uid: currentUser.uid
            });
            await batch.commit();
            packageCache.set(cargo.COD, { isPackage: true, items, descripcion: cargo.descripcion || cargo.COD });
            hideModal(packageModal);
            showSuccessMessage('Paquete guardado correctamente');
            loadCargos();
        } catch (error) {
            console.error('Error al guardar paquete:', error.message);
            showSuccessMessage('Error al guardar paquete', false);
        }
    }

    async function handleQuickEditSave() {
        if (!currentQuickEditId) {
            showSuccessMessage('Error: No se seleccionó un cargo', false);
            return;
        }
        const lote = quickLoteInput?.value.trim() || '';
        const nGuia = quickNGuiaInput?.value.trim() || '';
        const fechaVencimiento = quickFechaVencimientoInput?.value || '';
        try {
            const fullName = await getUserFullName(); // Esto aún se necesita para el log
            const now = Timestamp.fromDate(new Date());
            const batch = writeBatch(db);
            const cargoRef = doc(db, 'cargosconsignacion', currentQuickEditId);
            const cargoData = {
                lote,
                nGuia,
                fechaVencimiento: fechaVencimiento ? Timestamp.fromDate(new Date(fechaVencimiento)) : null,
                fechaActualizada: now,
                uid: currentUser.uid // Mantenemos el uid para trazabilidad, pero no el usuario
            };
            batch.update(cargoRef, cargoData);
            const logRef = doc(collection(db, 'cargosconsignacion', currentQuickEditId, 'logs'));
            batch.set(logRef, {
                action: `Actualizado:${formatDate(now.toDate())}`,
                description: `Lote, N° Guía y Fecha de Vencimiento actualizados`,
                timestamp: now,
                user: fullName, // El log sí registra quién hizo el cambio
                uid: currentUser.uid
            });
            await batch.commit();
            hideModal(quickEditModal);
            showSuccessMessage('Lote, N° Guía y Fecha actualizados correctamente');
            loadCargos();
        } catch (error) {
            console.error('Error al actualizar lote, guía y fecha:', error.message);
            showSuccessMessage('Error al actualizar lote, guía y fecha', false);
        }
    }

    async function handleEditSave() {
        if (!currentEditId) {
            showSuccessMessage('Error: No se seleccionó un cargo', false);
            return;
        }
        try {
            const fullName = await getUserFullName();
            const now = Timestamp.fromDate(new Date());
            const cargoRef = doc(db, 'cargosconsignacion', currentEditId);

            // Ajustar las fechas para mantener la zona horaria local
            function parseLocalDate(dateString) {
                if (!dateString) return null;
                const [year, month, day] = dateString.split('-').map(Number);
                return new Date(year, month - 1, day);
            }

            const cargoData = {
                admision: editAdmisionInput.value.trim() || '',
                nombrePaciente: editNombrePacienteInput.value.trim() || '',
                proveedor: editProveedorInput.value.trim() || '',
                descripcion: editDescriptionInput.value.trim() || '',
                cantidad: parseInt(editCantidadInput.value) || 1,
                precio: parseFloat(editPrecioInput.value) || 0,
                total: parseFloat(editTotalInput.value) || 0,
                estado: editEstadoSelect.value || 'Actualizar Precio',
                fechaTraspaso: editFechaTraspasoInput.value ? Timestamp.fromDate(parseLocalDate(editFechaTraspasoInput.value)) : null,
                fechaCargo: editFechaCargoInput.value ? Timestamp.fromDate(parseLocalDate(editFechaCargoInput.value)) : null,
                fechaCX: editFechaCXInput.value ? Timestamp.fromDate(parseLocalDate(editFechaCXInput.value)) : null,
                medico: editMedicoInput?.value.trim() || '',
                modalidad: editModalidadInput?.value.trim() || '',
                referencia: editReferenciaInput?.value.trim() || '',
                lote: editLoteInput?.value.trim() || '',
                nGuia: editNGuiaInput?.value.trim() || '',
                fechaVencimiento: editFechaVencimientoInput.value ? Timestamp.fromDate(parseLocalDate(editFechaVencimientoInput.value)) : null,
                CANTID: parseInt(editCANTIDInput.value) || 1,
                CARGO: editCARGOInput?.value.trim() || '',
                COD: editCODInput?.value.trim() || '',
                VENTA: parseFloat(editVENTAInput.value.replace(/,/g, '')) || 0,
                margen: editMargenInput?.value.trim() || '',
                codigo: editCodigoInput?.value.trim() || '',
                fechaActualizada: now,
                uid: currentUser.uid
            };
            const batch = writeBatch(db);
            batch.update(cargoRef, cargoData);
            const logRef = doc(collection(db, 'cargosconsignacion', currentEditId, 'logs'));
            batch.set(logRef, {
                action: `Actualizado:${formatDate(now.toDate())}`,
                description: `Cargo actualizado por ${fullName}`,
                timestamp: now,
                user: fullName,
                uid: currentUser.uid
            });
            await batch.commit();
            hideModal(editModal);
            showSuccessMessage('Cargo actualizado correctamente');
            loadCargos();
        } catch (error) {
            console.error('Error al guardar cargo:', error.message);
            showSuccessMessage('Error al guardar cargo', false);
        }
    }

    async function handleStateChange() {
        if (!currentStateChangeId) {
            showSuccessMessage('Error: No se seleccionó un cargo', false);
            return;
        }
        try {
            const fullName = await getUserFullName();
            const now = Timestamp.fromDate(new Date());
            const cargoRef = doc(db, 'cargosconsignacion', currentStateChangeId);
            const newState = changeStateSelect.value;
            const cargoData = {
                estado: newState,
                CARGO: newState === 'Cargado' ? fullName : '', // Actualiza CARGO solo si el estado es 'Cargado'
                fechaActualizada: now
            };
            if (newState === 'Cargado') {
                cargoData.fechaCargo = now;
            }
            const batch = writeBatch(db);
            batch.update(cargoRef, cargoData);
            const logRef = doc(collection(db, 'cargosconsignacion', currentStateChangeId, 'logs'));
            batch.set(logRef, {
                action: `Actualizado:${formatDate(now.toDate())}`,
                description: `Estado cambiado a ${newState} por ${fullName}`,
                timestamp: now,
                user: fullName,
                uid: currentUser.uid
            });
            await batch.commit();
            hideModal(changeStateModal);
            showSuccessMessage('Estado actualizado correctamente');
            loadCargos();
        } catch (error) {
            console.error('Error al cambiar estado:', error.message);
            showSuccessMessage('Error al cambiar estado', false);
        }
    }

    async function handleDelete() {
        const cargoId = confirmDeleteBtn.dataset.id;
        if (!cargoId) {
            showSuccessMessage('Error: No se seleccionó un cargo', false);
            return;
        }
        try {
            const fullName = await getUserFullName();
            const now = Timestamp.fromDate(new Date());
            const cargoRef = doc(db, 'cargosconsignacion', cargoId);
            const batch = writeBatch(db);
            batch.delete(cargoRef);
            const logRef = doc(collection(db, 'cargosconsignacion', cargoId, 'logs'));
            batch.set(logRef, {
                action: `Eliminado:${formatDate(now.toDate())}`,
                description: `Cargo eliminado por ${fullName}`,
                timestamp: now,
                user: fullName,
                uid: currentUser.uid
            });
            await batch.commit();
            hideModal(deleteModal);
            showSuccessMessage('Cargo eliminado correctamente');
            loadCargos();
        } catch (error) {
            console.error('Error al eliminar cargo:', error.message);
            showSuccessMessage('Error al eliminar cargo', false);
        }
    }

    async function exportToExcel() {
        try {
            if (!window.XLSX || !window.XLSX.utils || !window.XLSX.utils.json_to_sheet) {
                throw new Error('Biblioteca XLSX no está cargada correctamente');
            }

            const packagePromises = cargos.map(cargo => getPackageData(cargo.COD));
            const packageData = await Promise.all(packagePromises);
            const filteredCargos = applyQuickFilters(cargos).filter(cargo => applyFilters([cargo]).length > 0);
            const data = [];
            filteredCargos.forEach(cargo => {
                const packageInfo = packageData[cargos.indexOf(cargo)];
                const isPackage = packageInfo.isPackage;
                data.push({
                    Tipo: 'Cargo Principal',
                    Estado: cargo.estado || '-',
                    ID: cargo.admision || '-',
                    COD: cargo.COD || '-',
                    CANTID: cargo.CANTID || '-',
                    VENTA: calculateVenta(cargo.modalidad, cargo.precio, calculateMargin(cargo.precio), cargo.cantidad),
                    'N° Guía': cargo.nGuia || '-',
                    Lote: cargo.lote || '-',
                    'Fecha Vencimiento': formatDateOnly(cargo.fechaVencimiento),
                    CARGO: cargo.CARGO || '-',
                    'Fecha de Cargo': formatDateOnly(cargo.fechaCargo),
                    Admisión: cargo.admision || '-',
                    'Nombre Paciente': cargo.nombrePaciente || '-',
                    Médico: cargo.medico || '-',
                    'Fecha Cx': formatDateOnly(cargo.fechaCX),
                    Proveedor: cargo.proveedor || '-',
                    Código: cargo.codigo || '-',
                    Descripción: cargo.descripcion || '-',
                    Cantidad: cargo.cantidad || '-',
                    Precio: formatPrice(cargo.precio),
                    Modalidad: cargo.modalidad || '-',
                    Total: formatPrice(cargo.total),
                    Referencia: cargo.referencia || '-',
                    'Fecha Creación': formatDateOnly(cargo.fechaCreacion),
                    'Fecha Traspaso': formatDateOnly(cargo.fechaTraspaso),
                    Margen: cargo.margen || calculateMargin(cargo.precio), // Usar margen guardado o calcular
                    Usuario: cargo.usuario || '-'
                });

                if (isPackage && packageInfo.items.length > 0) {
                    packageInfo.items.forEach(item => {
                        data.push({
                            Tipo: 'Ítem de Paquete',
                            Estado: cargo.estado || '-',
                            ID: cargo.admision || '-',
                            COD: cargo.COD || '-',
                            CANTID: '',
                            VENTA: '',
                            'N° Guía': cargo.nGuia || '-',
                            Lote: cargo.lote || '-',
                            'Fecha Vencimiento': formatDateOnly(cargo.fechaVencimiento),
                            CARGO: cargo.CARGO || '-',
                            'Fecha de Cargo': formatDateOnly(cargo.fechaCargo),
                            Admisión: cargo.admision || '-',
                            'Nombre Paciente': cargo.nombrePaciente || '-',
                            Médico: cargo.medico || '-',
                            'Fecha Cx': formatDateOnly(cargo.fechaCX),
                            Proveedor: cargo.proveedor || '-',
                            Código: 'No lleva OC',
                            Descripción: item.descripcion || '-',
                            Cantidad: item.cantidad || '1',
                            Precio: '0',
                            Modalidad: cargo.modalidad || '-',
                            Total: '0',
                            Referencia: item.referencia || '-',
                            'Fecha Creación': formatDateOnly(cargo.fechaCreacion),
                            'Fecha Traspaso': formatDateOnly(cargo.fechaTraspaso),
                            Margen: '',
                            Usuario: cargo.usuario || '-'
                        });
                    });
                }
            });
            const worksheet = window.XLSX.utils.json_to_sheet(data);
            const workbook = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(workbook, worksheet, 'CargosConsignacion');
            window.XLSX.writeFile(workbook, 'cargosconsignacion.xlsx');
        } catch (error) {
            console.error('Error al exportar a Excel:', error.message);
            showSuccessMessage('Error al exportar a Excel', false);
        }
    }

    async function loadLogs(cargoId) {
        if (!logContent || !logModal) {
            console.warn('logContent o logModal no encontrados');
            return;
        }
        try {
            const logsCollection = collection(db, 'cargosconsignacion', cargoId, 'logs');
            const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'));
            const logsSnapshot = await getDocs(logsQuery);
            logContent.innerHTML = '';
            if (logsSnapshot.empty) {
                logContent.innerHTML = '<p>No hay registros de cambios.</p>';
            } else {
                logsSnapshot.forEach(doc => {
                    const logData = doc.data();
                    const timestamp = logData.timestamp?.toDate() || new Date();
                    const fecha = timestamp ? formatDate(timestamp) : 'Sin fecha';
                    let action = logData.action || '-';
                    if (action.startsWith('Creado:')) {
                        action = 'Creación';
                    } else if (action.startsWith('Actualizado:')) {
                        action = 'Modificación';
                    } else if (action.startsWith('Eliminado:')) {
                        action = 'Eliminado';
                    }
                    const logEntry = document.createElement('div');
                    logEntry.className = 'log-entry';
                    logEntry.innerHTML = `
                        <strong>${action}</strong>
                        <p>${logData.description || '-'}</p>
                        <small>Fecha: ${fecha} | Usuario: ${logData.user || '-'}</small>
                    `;
                    logContent.appendChild(logEntry);
                });
            }
            showModal(logModal);
        } catch (error) {
            console.error('Error al cargar logs:', error.message);
            showSuccessMessage('Error al cargar historial', false);
        }
    }

    function setupTableEventListeners() {
        tableBody.querySelectorAll('.fa-edit').forEach(icon => {
            icon.addEventListener('click', () => openEditModal(icon.dataset.id));
        });

        tableBody.querySelectorAll('.fa-trash').forEach(icon => {
            icon.addEventListener('click', () => openDeleteModal(icon.dataset.id));
        });

        tableBody.querySelectorAll('.fa-history').forEach(icon => {
            icon.addEventListener('click', () => loadLogs(icon.dataset.id));
        });

        tableBody.querySelectorAll('.quick-add').forEach(icon => {
            icon.addEventListener('click', () => openQuickEditModal(icon.dataset.id));
        });

        tableBody.querySelectorAll('.package-add').forEach(icon => {
            icon.addEventListener('click', () => openPackageModal(icon.dataset.id));
        });

        tableBody.querySelectorAll('.package-toggle').forEach(icon => {
            icon.addEventListener('click', () => togglePackageRows(icon.dataset.id));
        });

        tableBody.querySelectorAll('.state-cell').forEach(cell => {
            cell.addEventListener('click', () => openChangeStateModal(cell.dataset.id));
        });

        tableBody.querySelectorAll('.cargo-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const cargoId = checkbox.dataset.id;
                if (checkbox.checked) {
                    selectedCargos.add(cargoId);
                } else {
                    selectedCargos.delete(cargoId);
                }
                updateBulkChangeButtonState();
            });
        });
    }

    async function handleBulkFechaCargoSave() {
        try {
            if (selectedCargos.size === 0) {
                showSuccessMessage('Error: No se seleccionaron cargos', false);
                return;
            }
            const fechaCargo = bulkFechaCargoInput?.value || '';
            if (!fechaCargo) {
                showSuccessMessage('Error: Debe seleccionar una fecha de cargo', false);
                return;
            }
            const fullName = await getUserFullName();
            const now = Timestamp.fromDate(new Date());
            // Parsear la fecha explícitamente en formato YYYY-MM-DD
            const [year, month, day] = fechaCargo.split('-').map(Number);
            const fechaCargoDate = Timestamp.fromDate(new Date(year, month - 1, day));
            const batch = writeBatch(db);

            for (const cargoId of selectedCargos) {
                const cargoRef = doc(db, 'cargosconsignacion', cargoId);
                const cargoSnap = await getDoc(cargoRef);
                if (!cargoSnap.exists()) continue;
                const updates = {
                    fechaCargo: fechaCargoDate,
                    CARGO: cargoSnap.data().estado === 'Cargado' ? fullName : cargoSnap.data().CARGO || '',
                    fechaActualizada: now
                };
                batch.update(cargoRef, updates);
                const logRef = doc(collection(db, `cargosconsignacion/${cargoId}/logs`));
                batch.set(logRef, {
                    action: `Actualizado:${formatDate(now.toDate())}`,
                    description: `Fecha de Cargo actualizada a ${formatDateOnly(fechaCargo)} por ${fullName} (cambio masivo)`,
                    timestamp: now,
                    user: fullName,
                    uid: currentUser.uid
                });
            }

            await batch.commit();
            showSuccessMessage(`Fecha de Cargo de ${selectedCargos.size} cargo(s) actualizada(s) correctamente`);
            selectedCargos.clear();
            updateBulkChangeButtonState();
            hideModal(bulkChangeFechaCargoModal);
            loadCargos();
        } catch (error) {
            console.error('Error al cambiar fecha de cargo masivamente:', error);
            showSuccessMessage('Error al cambiar fecha de cargo masivamente', false);
        }
    }

    async function handleBulkGuiaSave() {
        try {
            if (selectedCargos.size === 0) {
                showSuccessMessage('Error: No se seleccionaron cargos', false);
                return;
            }
            const lote = bulkLoteInput?.value.trim() || '';
            const nGuia = bulkNGuiaInput?.value.trim() || '';
            const fechaVencimiento = bulkFechaVencimientoInput?.value || '';
            const fullName = await getUserFullName();
            const now = Timestamp.fromDate(new Date());
            const batch = writeBatch(db);

            for (const cargoId of selectedCargos) {
                const cargoRef = doc(db, 'cargosconsignacion', cargoId);
                const cargoSnap = await getDoc(cargoRef);
                if (!cargoSnap.exists()) continue;
                const cargoData = cargoSnap.data();
                const isPackage = await checkAndExpandPackage(cargoData.COD);
                if (isPackage) {
                    showSuccessMessage(`Advertencia: No se puede actualizar el cargo ${cargoData.admision} porque es un paquete`, false);
                    continue;
                }
                const updates = {
                    lote,
                    nGuia,
                    fechaVencimiento: fechaVencimiento ? Timestamp.fromDate(new Date(fechaVencimiento)) : null,
                    fechaActualizada: now
                };
                batch.update(cargoRef, updates);
                const logRef = doc(collection(db, `cargosconsignacion/${cargoId}/logs`));
                batch.set(logRef, {
                    action: `Actualizado:${formatDate(now.toDate())}`,
                    description: `Lote, N° Guía y Fecha de Vencimiento actualizados por ${fullName} (cambio masivo)`,
                    timestamp: now,
                    user: fullName,
                    uid: currentUser.uid
                });
            }

            await batch.commit();
            showSuccessMessage(`Lote, N° Guía y Fecha de Vencimiento de ${selectedCargos.size} cargo(s) actualizada(s) correctamente`);
            selectedCargos.clear();
            updateBulkChangeButtonState();
            hideModal(bulkChangeGuiaModal);
            loadCargos();
        } catch (error) {
            console.error('Error al cambiar guía masivamente:', error);
            showSuccessMessage('Error al cambiar guía masivamente', false);
        }
    }

    function setupEventListeners() {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadCargos();
            }
        });

        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(applyQuickFilters(cargos).filter(cargo => applyFilters([cargo]).length > 0).length / recordsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                loadCargos();
            }
        });

        exportExcelBtn.addEventListener('click', exportToExcel);

        saveEditBtn.addEventListener('click', handleEditSave);
        cancelEditBtn.addEventListener('click', () => hideModal(editModal));

        confirmDeleteBtn.addEventListener('click', handleDelete);
        cancelDeleteBtn.addEventListener('click', () => hideModal(deleteModal));

        closeLogBtn.addEventListener('click', () => hideModal(logModal));

        saveStateBtn.addEventListener('click', handleStateChange);
        cancelStateBtn.addEventListener('click', () => hideModal(changeStateModal));

        saveQuickEditBtn.addEventListener('click', handleQuickEditSave);
        cancelQuickEditBtn.addEventListener('click', () => hideModal(quickEditModal));

        addItemBtn.addEventListener('click', () => addPackageItem());
        savePackageBtn.addEventListener('click', handlePackageSave);
        cancelPackageBtn.addEventListener('click', () => hideModal(packageModal));

        filterYearSelect.addEventListener('change', () => {
            quickFilters.year = filterYearSelect.value || null;
            updateMonthFilter(cargos);
            loadCargos();
        });

        filterMonthSelect.addEventListener('change', () => {
            quickFilters.month = filterMonthSelect.value || null;
            loadCargos();
        });

        showAllBtn.addEventListener('click', () => {
            quickFilters.year = null;
            quickFilters.month = null;
            quickFilters.state = null;
            filterYearSelect.value = '';
            filterMonthSelect.value = '';
            stateButtonsContainer.querySelectorAll('.state-button').forEach(btn => btn.classList.remove('active'));
            updateMonthFilter(cargos);
            loadCargos();
        });

        bulkChangeStateBtn.addEventListener('click', () => {
            if (selectedCargos.size === 0) {
                showSuccessMessage('Error: No se seleccionaron cargos', false);
                return;
            }
            bulkChangeMessage.textContent = `¿Estás seguro de que quieres cambiar el estado de ${selectedCargos.size} cargo(s)?`;
            showModal(bulkChangeStateModal);
        });

        saveBulkStateBtn.addEventListener('click', async () => {
            try {
                if (selectedCargos.size === 0) {
                    showSuccessMessage('Error: No se seleccionaron cargos', false);
                    return;
                }
                const newState = bulkChangeStateSelect.value;
                const fullName = await getUserFullName();
                const now = Timestamp.fromDate(new Date());
                const batch = writeBatch(db);

                for (const cargoId of selectedCargos) {
                    const cargoRef = doc(db, 'cargosconsignacion', cargoId);
                    const cargoSnap = await getDoc(cargoRef);
                    if (!cargoSnap.exists()) continue;
                    const updates = {
                        estado: newState,
                        CARGO: newState === 'Cargado' ? fullName : '',
                        fechaActualizada: now
                    };
                    if (newState === 'Cargado') {
                        updates.fechaCargo = now;
                    }
                    batch.update(cargoRef, updates);
                    const logRef = doc(collection(db, `cargosconsignacion/${cargoId}/logs`));
                    batch.set(logRef, {
                        action: `Actualizado:${formatDate(now.toDate())}`,
                        description: `Estado cambiado a ${newState} por ${fullName} (cambio masivo)`,
                        timestamp: now,
                        user: fullName,
                        uid: currentUser.uid
                    });
                }

                await batch.commit();
                showSuccessMessage(`Estado de ${selectedCargos.size} cargo(s) actualizado(s) correctamente`);
                selectedCargos.clear();
                updateBulkChangeButtonState();
                hideModal(bulkChangeStateModal);
                loadCargos();
            } catch (error) {
                console.error('Error al cambiar estado masivamente:', error);
                showSuccessMessage('Error al cambiar estado masivamente', false);
            }
        });

        cancelBulkStateBtn.addEventListener('click', () => hideModal(bulkChangeStateModal));

        // Event listeners para el cambio masivo de Fecha de Cargo
        bulkChangeFechaCargoBtn.addEventListener('click', () => {
            if (selectedCargos.size === 0) {
                showSuccessMessage('Error: No se seleccionaron cargos', false);
                return;
            }
            bulkChangeFechaCargoMessage.textContent = `¿Estás seguro de que quieres cambiar la Fecha de Cargo de ${selectedCargos.size} cargo(s)?`;
            bulkFechaCargoInput.value = '';
            showModal(bulkChangeFechaCargoModal);
        });

        saveBulkFechaCargoBtn.addEventListener('click', handleBulkFechaCargoSave);
        cancelBulkFechaCargoBtn.addEventListener('click', () => hideModal(bulkChangeFechaCargoModal));

        // Event listeners para el cambio masivo de Guía
        bulkChangeGuiaBtn.addEventListener('click', () => {
            if (selectedCargos.size === 0) {
                showSuccessMessage('Error: No se seleccionaron cargos', false);
                return;
            }
            bulkChangeGuiaMessage.textContent = `¿Estás seguro de que quieres cambiar el N° Guía, Lote y Fecha de Vencimiento de ${selectedCargos.size} cargo(s)?`;
            bulkLoteInput.value = '';
            bulkNGuiaInput.value = '';
            bulkFechaVencimientoInput.value = '';
            showModal(bulkChangeGuiaModal);
        });

        saveBulkGuiaBtn.addEventListener('click', handleBulkGuiaSave);
        cancelBulkGuiaBtn.addEventListener('click', () => hideModal(bulkChangeGuiaModal));

        // Configurar filtros en las cabeceras de la tabla
        document.querySelectorAll('.filter-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const column = e.target.dataset.column;
                // Verificar si ya existe un input para esta columna
                let input = document.querySelector(`input[data-column="${column}"]`);
                if (!input) {
                    // Crear nuevo input de filtro
                    input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = `Filtrar por ${column}`;
                    input.className = 'filter-input';
                    input.dataset.column = column;
                    input.value = filters[column] || ''; // Cargar valor existente del filtro
                    input.addEventListener('input', (e) => {
                        const value = e.target.value.trim();
                        if (value) {
                            filters[column] = value;
                        } else {
                            delete filters[column]; // Eliminar filtro si el input está vacío
                        }
                        currentPage = 1;
                        loadCargos();
                    });
                    // Agregar botón para limpiar filtro individual
                    const clearIcon = document.createElement('i');
                    clearIcon.className = 'fas fa-times clear-filter-icon';
                    clearIcon.title = 'Limpiar filtro';
                    clearIcon.addEventListener('click', () => {
                        delete filters[column];
                        input.remove();
                        currentPage = 1;
                        loadCargos();
                    });
                    const filterContainer = document.createElement('div');
                    filterContainer.className = 'filter-container';
                    filterContainer.appendChild(input);
                    filterContainer.appendChild(clearIcon);
                    e.target.parentElement.appendChild(filterContainer);
                    input.focus();
                } else {
                    // Si ya existe un input, enfocarlo
                    input.focus();
                }
            });
        });

        // Manejo de clics fuera de los inputs de filtro
        document.addEventListener('click', (e) => {
            if (!e.target.classList.contains('filter-icon') &&
                !e.target.classList.contains('filter-input') &&
                !e.target.classList.contains('clear-filter-icon')) {
                document.querySelectorAll('.filter-container').forEach(container => {
                    const input = container.querySelector('.filter-input');
                    if (!input.value.trim()) {
                        // Solo eliminar si el input está vacío
                        delete filters[input.dataset.column];
                        container.remove();
                        currentPage = 1;
                        loadCargos();
                    }
                });
            }
        });
        const clearColumnFiltersBtn = document.getElementById('clear-column-filters-btn');
        if (clearColumnFiltersBtn) {
            clearColumnFiltersBtn.addEventListener('click', () => {
                filters = {};
                document.querySelectorAll('.filter-container').forEach(container => container.remove());
                currentPage = 1;
                loadCargos();
            });
        }
    }
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            setupEventListeners();
            loadCargos();
        } else {
            console.warn('Usuario no autenticado');
            showSuccessMessage('Por favor, inicia sesión para continuar', false);
            window.location.href = '/login';
        }
    });

} catch (error) {
    console.error('Error en la inicialización del módulo:', error.message);
    showSuccessMessage('Error al inicializar el módulo', false);
}