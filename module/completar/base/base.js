import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, startAfter, getDoc, writeBatch, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDuF7p0X6N8IE19Bqt78LQAp805tMl84Ds",
  authDomain: "modular-app-16bd6.firebaseapp.com",
  projectId: "modular-app-16bd6",
  storageBucket: "modular-app-16bd6.firebasestorage.app",
  messagingSenderId: "1006327040835",
  appId: "1:1006327040835:web:b8b4f510da46514a3d3df6",
  measurementId: "G-GVKBWL9GT9"
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
        showSuccessMessage('Error al configurar persistencia: ' + error.message, false);
    });

    const container = document.querySelector('.referencias-container');
    const downloadTemplateBtn = document.getElementById('download-template-btn');
    const importFileBtn = document.getElementById('import-file-btn');
    const fileInput = document.getElementById('file-input');
    const registerModal = document.getElementById('register-modal');
    const registerProgress = document.getElementById('register-progress');
    const successModal = document.getElementById('success-modal');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.getElementById('success-message');
    const editModal = document.getElementById('edit-modal');
    const editReferenciaInput = document.getElementById('edit-referencia');
    const editDescripcionInput = document.getElementById('edit-descripcion');
    const editPrecioInput = document.getElementById('edit-precio');
    const editCodigoInput = document.getElementById('edit-codigo');
    const editProveedorInput = document.getElementById('edit-proveedor');
    const editProveedorSearch = document.getElementById('edit-proveedor-search');
    const editProveedorList = document.getElementById('edit-proveedor-list');
    const editModalidadSelect = document.getElementById('edit-modalidad');
    const editCategoriaSelect = document.getElementById('edit-categoria');
    const editEstadoSelect = document.getElementById('edit-estado');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const deleteModal = document.getElementById('delete-modal');
    const deleteMessage = document.getElementById('delete-message');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const logModal = document.getElementById('log-modal');
    const logContent = document.getElementById('log-content');
    const closeLogBtn = document.getElementById('close-log-btn');
    const loadingModal = document.getElementById('loading-modal');
    const loadingProgress = document.getElementById('loading-progress');
    const importResultsModal = document.getElementById('import-results-modal');
    const importResultsContent = document.getElementById('import-results-content');
    const closeImportResultsBtn = document.getElementById('close-import-results-btn');
    const tableContainer = document.querySelector('.table-container');
    const referenciasTableBody = document.querySelector('#referencias-table tbody');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const totalRecords = document.getElementById('total-records');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    const requiredElements = {
        container, downloadTemplateBtn, importFileBtn, fileInput, registerModal, registerProgress,
        successModal, successIcon, successMessage, editModal, editReferenciaInput, editDescripcionInput,
        editPrecioInput, editCodigoInput, editProveedorInput, editProveedorSearch, editProveedorList,
        editModalidadSelect, editCategoriaSelect, editEstadoSelect, saveEditBtn, cancelEditBtn,
        deleteModal, deleteMessage, confirmDeleteBtn, cancelDeleteBtn, logModal, logContent,
        closeLogBtn, loadingModal, loadingProgress, importResultsModal, importResultsContent,
        closeImportResultsBtn, tableContainer, referenciasTableBody, prevBtn, nextBtn, pageInfo,
        totalRecords, exportExcelBtn, clearFiltersBtn
    };

    for (const [key, element] of Object.entries(requiredElements)) {
        if (!element) {
            console.warn(`Elemento ${key} no encontrado en el DOM`);
        }
    }

    let currentPage = 1;
    const recordsPerPage = 100;
    let totalPages = 1;
    let referencias = [];
    let allReferencias = [];
    let currentEditId = null;
    let lastReferenciaId = 0;
    let filters = {};
    let isLoading = false;

    function formatPrice(input) {
        if (!input) return;
        input.addEventListener('input', () => {
            let value = input.value.replace(/[^0-9]/g, '');
            if (value) {
                value = value.slice(0, 7);
                value = parseInt(value).toLocaleString('es-CL', { minimumFractionDigits: 0 });
                input.value = value;
            } else {
                input.value = '';
            }
        });
        input.addEventListener('blur', () => {
            if (!input.value) {
                input.value = '0';
                return;
            }
            let value = input.value.replace(/[^0-9]/g, '');
            value = value ? parseInt(value).toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '0';
            input.value = value;
        });
    }

    function formatDate(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            return '-';
        }
        return date.toLocaleString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
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
        if (!input || !suggestionsList) return;
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

    async function setupProveedorAutocomplete(inputId, suggestionsListId, searchIconId) {
        const input = document.getElementById(inputId);
        const suggestionsList = document.getElementById(suggestionsListId);
        const icon = document.getElementById(searchIconId);
        if (!input || !suggestionsList || !icon) {
            console.warn('Elementos de autocompletado no encontrados para:', inputId);
            return;
        }

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

    async function getNextReferenciaId() {
        if (lastReferenciaId > 0) {
            lastReferenciaId++;
            return lastReferenciaId.toString().padStart(4, '0');
        }
        const referenciasCollection = collection(db, 'referencias');
        const q = query(referenciasCollection, orderBy('referenciaId', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        let nextId = 1;
        if (!querySnapshot.empty) {
            const lastRef = querySnapshot.docs[0].data();
            nextId = parseInt(lastRef.referenciaId || '0') + 1;
        }
        lastReferenciaId = nextId;
        return nextId.toString().padStart(4, '0');
    }

    async function getUserFullName() {
        const user = auth.currentUser;
        if (!user) throw new Error('No se encontró el usuario autenticado');
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
        return userSnap.data().fullName || 'Usuario Desconocido';
    }

    function showModal(modal, progressElement = null, percentage = null) {
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
            alert(message);
            return;
        }
        successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
        successMessage.textContent = message;
        successModal.classList.toggle('success', isSuccess);
        successModal.classList.toggle('error', !isSuccess);
        showModal(successModal);
        setTimeout(() => hideModal(successModal), 3000);
    }

    // Función para descargar el formato de importación
    function downloadTemplate() {
        const templateData = [
            {
                'Referencia': 'REF001',
                'Descripción': 'EJEMPLO DESCRIPCIÓN',
                'Precio': '100000',
                'Código': 'COD001',
                'Proveedor': 'Proveedor Ejemplo',
                'Modalidad': 'Cotización',
                'Categoría': 'Implantes',
                'Estado': 'Activo'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        
        // Agregar comentarios en las celdas para guiar al usuario
        const comments = {
            'A1': 'Referencia única del producto (obligatorio)',
            'B1': 'Descripción detallada del producto (obligatorio)', 
            'C1': 'Precio en pesos chilenos sin puntos ni comas (obligatorio)',
            'D1': 'Código del producto (opcional, se asignará "Pendiente" si está vacío)',
            'E1': 'Nombre del proveedor (obligatorio)',
            'F1': 'Modalidad: "Cotización" o "Consignación"',
            'G1': 'Categoría: "Implantes" o "Insumos"',
            'H1': 'Estado: "Activo" o "Inactivo"'
        };

        // Configurar ancho de columnas
        ws['!cols'] = [
            { width: 15 }, // Referencia
            { width: 30 }, // Descripción
            { width: 12 }, // Precio
            { width: 15 }, // Código
            { width: 20 }, // Proveedor
            { width: 15 }, // Modalidad
            { width: 12 }, // Categoría
            { width: 10 }  // Estado
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Formato Referencias');
        
        const fileName = `formato_referencias_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showSuccessMessage('Formato descargado exitosamente', true);
    }

    // Función para procesar el archivo importado
    async function processImportFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    // Función para validar datos de importación
    function validateImportData(data) {
        const errors = [];
        const validData = [];

        data.forEach((row, index) => {
            const rowNumber = index + 2; // +2 porque Excel empezó en fila 1 y arrays en 0
            const rowErrors = [];

            // Validar campos obligatorios
            if (!row['Referencia'] || row['Referencia'].toString().trim() === '') {
                rowErrors.push('Referencia es obligatoria');
            }
            if (!row['Descripción'] || row['Descripción'].toString().trim() === '') {
                rowErrors.push('Descripción es obligatoria');
            }
            if (!row['Proveedor'] || row['Proveedor'].toString().trim() === '') {
                rowErrors.push('Proveedor es obligatorio');
            }
            
            // Validar precio
            let precio = 0;
            if (row['Precio']) {
                const precioStr = row['Precio'].toString().replace(/[^0-9]/g, '');
                precio = parseInt(precioStr) || 0;
                if (precio > 9999999) {
                    rowErrors.push('El precio no puede superar 9.999.999');
                }
            } else {
                rowErrors.push('Precio es obligatorio');
            }

            // Validar modalidad
            const modalidad = row['Modalidad'] || 'Cotización';
            if (!['Cotización', 'Consignación'].includes(modalidad)) {
                rowErrors.push('Modalidad debe ser "Cotización" o "Consignación"');
            }

            // Validar categoría
            const categoria = row['Categoría'] || 'Implantes';
            if (!['Implantes', 'Insumos'].includes(categoria)) {
                rowErrors.push('Categoría debe ser "Implantes" o "Insumos"');
            }

            // Validar estado
            const estado = row['Estado'] || 'Activo';
            if (!['Activo', 'Inactivo'].includes(estado)) {
                rowErrors.push('Estado debe ser "Activo" o "Inactivo"');
            }

            if (rowErrors.length > 0) {
                errors.push(`Fila ${rowNumber}: ${rowErrors.join(', ')}`);
            } else {
                validData.push({
                    referencia: row['Referencia'].toString().trim().toUpperCase(),
                    descripcion: row['Descripción'].toString().trim().toUpperCase(),
                    precio: precio,
                    codigo: row['Código'] ? row['Código'].toString().trim() : 'Pendiente',
                    proveedor: row['Proveedor'].toString().trim(),
                    modalidad: modalidad,
                    categoria: categoria,
                    estado: estado
                });
            }
        });

        return { errors, validData };
    }

    // Función para verificar duplicados
    async function checkDuplicatesInBatch(validData) {
        const duplicates = [];
        const referenciasCollection = collection(db, 'referencias');

        for (let i = 0; i < validData.length; i++) {
            const item = validData[i];
            
            // Verificar referencia duplicada
            const refQuery = query(referenciasCollection, where('referencia', '==', item.referencia), limit(1));
            const refSnapshot = await getDocs(refQuery);
            if (!refSnapshot.empty) {
                duplicates.push(`Referencia "${item.referencia}" ya existe en la base de datos`);
                continue;
            }

            // Verificar código duplicado (solo si no es "Pendiente")
            if (item.codigo && item.codigo !== 'Pendiente') {
                const codeQuery = query(referenciasCollection, where('codigo', '==', item.codigo), limit(1));
                const codeSnapshot = await getDocs(codeQuery);
                if (!codeSnapshot.empty) {
                    duplicates.push(`Código "${item.codigo}" ya existe en la base de datos`);
                    continue;
                }
            }
        }

        return duplicates;
    }

    // Función para importar datos válidos
    async function importValidData(validData) {
        const user = auth.currentUser;
        const fullName = await getUserFullName();
        const now = Timestamp.fromDate(new Date());
        let imported = 0;
        const batch = writeBatch(db);

        for (const item of validData) {
            const referenciaId = await getNextReferenciaId();
            const docRef = doc(collection(db, 'referencias'));
            
            const referenciaData = {
                referenciaId,
                referencia: item.referencia,
                descripcion: item.descripcion,
                precio: item.precio,
                codigo: item.codigo,
                proveedor: item.proveedor,
                proveedorLowerCase: item.proveedor.toLowerCase(),
                modalidad: item.modalidad,
                categoria: item.categoria,
                estado: item.estado,
                fechaCreacion: now,
                usuario: fullName,
                uid: user.uid
            };

            batch.set(docRef, referenciaData);
            imported++;

            // Procesar en lotes de 500 para evitar límites de Firestore
            if (imported % 500 === 0) {
                await batch.commit();
                showModal(registerModal, registerProgress, Math.round((imported / validData.length) * 100));
            }
        }

        // Confirmar el último lote
        if (imported % 500 !== 0) {
            await batch.commit();
        }

        return imported;
    }

    // Función principal de importación
    async function handleFileImport() {
        const file = fileInput.files[0];
        if (!file) {
            showSuccessMessage('Por favor selecciona un archivo', false);
            return;
        }

        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];

        if (!allowedTypes.includes(file.type)) {
            showSuccessMessage('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV', false);
            return;
        }

        try {
            showModal(registerModal, registerProgress, 10);
            
            // Procesar archivo
            const data = await processImportFile(file);
            showModal(registerModal, registerProgress, 30);

            if (!data || data.length === 0) {
                hideModal(registerModal);
                showSuccessMessage('El archivo está vacío o no contiene datos válidos', false);
                return;
            }

            // Validar datos
            const { errors, validData } = validateImportData(data);
            showModal(registerModal, registerProgress, 50);

            if (validData.length === 0) {
                hideModal(registerModal);
                showImportResults(0, data.length, errors, []);
                return;
            }

            // Verificar duplicados
            const duplicates = await checkDuplicatesInBatch(validData);
            showModal(registerModal, registerProgress, 70);

            // Filtrar datos válidos sin duplicados
            const finalValidData = validData.filter((item, index) => {
                const isDuplicate = duplicates.some(dup => 
                    dup.includes(item.referencia) || 
                    (item.codigo !== 'Pendiente' && dup.includes(item.codigo))
                );
                return !isDuplicate;
            });

            if (finalValidData.length === 0) {
                hideModal(registerModal);
                showImportResults(0, data.length, [...errors, ...duplicates], []);
                return;
            }

            // Importar datos válidos
            const imported = await importValidData(finalValidData);
            showModal(registerModal, registerProgress, 100);

            hideModal(registerModal);
            showImportResults(imported, data.length, [...errors, ...duplicates], finalValidData);
            
            // Recargar tabla
            await loadReferencias();
            
            // Limpiar input
            fileInput.value = '';

        } catch (error) {
            hideModal(registerModal);
            showSuccessMessage('Error al procesar el archivo: ' + error.message, false);
            fileInput.value = '';
        }
    }

    // Función para mostrar resultados de importación
    function showImportResults(imported, total, errors, validData) {
        if (!importResultsContent) return;

        const skipped = total - imported;
        const hasErrors = errors.length > 0;

        let resultHTML = `
            <div class="import-summary">
                <h3>Resumen de Importación</h3>
                <p><strong>Total de filas procesadas:</strong> ${total}</p>
                <p><strong>Referencias importadas:</strong> ${imported}</p>
                <p><strong>Referencias omitidas:</strong> ${skipped}</p>
            </div>
        `;

        if (hasErrors) {
            resultHTML += `
                <div class="import-errors">
                    <h3>Errores y Duplicados (${errors.length})</h3>
                    <ul class="error-list">
                        ${errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        importResultsContent.innerHTML = resultHTML;
        showModal(importResultsModal);
    }

    async function loadReferencias() {
        if (isLoading) return;
        isLoading = true;

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Tiempo de espera agotado en loadReferencias')), 15000);
        });

        try {
            if (!tableContainer || !loadingModal || !loadingProgress || !referenciasTableBody) {
                console.error('loadReferencias: Elementos esenciales no encontrados');
                showSuccessMessage('Elementos esenciales no encontrados', false);
                throw new Error('No se encontraron elementos necesarios');
            }

            showModal(loadingModal, loadingProgress, 0);

            const referenciasCollection = collection(db, 'referencias');
            const filterConstraints = [];

            Object.keys(filters).forEach(column => {
                const filterValue = filters[column]?.trim();
                if (!filterValue) return;
                if (column === 'precio') {
                    const numericValue = parseInt(filterValue.replace(/[^0-9]/g, '')) || 0;
                    if (!isNaN(numericValue)) {
                        filterConstraints.push(where(column, '>=', numericValue));
                        filterConstraints.push(where(column, '<=', numericValue));
                    }
                } else if (column === 'estado' || column === 'modalidad' || column === 'categoria') {
                    filterConstraints.push(where(column, '==', filterValue));
                } else if (column !== 'referencia' && column !== 'descripcion' && column !== 'proveedor' && column !== 'fechaCreacion' && column !== 'fechaActualizada') {
                    filterConstraints.push(where(column, '>=', filterValue.toLowerCase()));
                    filterConstraints.push(where(column, '<=', filterValue.toLowerCase() + '\uf8ff'));
                }
            });

            const q = query(referenciasCollection, ...filterConstraints, orderBy('referenciaId', 'asc'));
            const querySnapshot = await Promise.race([getDocs(q), timeoutPromise]);
            allReferencias = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                allReferencias.push({
                    docId: doc.id,
                    referenciaId: data.referenciaId || '',
                    referencia: data.referencia || '',
                    descripcion: data.descripcion || '',
                    precio: data.precio || 0,
                    codigo: data.codigo || '',
                    proveedor: data.proveedor || '',
                    proveedorLowerCase: data.proveedorLowerCase || data.proveedor?.toLowerCase() || '',
                    modalidad: data.modalidad || '',
                    categoria: data.categoria || '',
                    estado: data.estado || 'Activo',
                    fechaCreacion: data.fechaCreacion || null,
                    fechaActualizada: data.fechaActualizada || null,
                    usuario: data.usuario || '',
                    uid: data.uid || ''
                });
            });

            referencias = allReferencias.filter(ref => {
                let match = true;
                Object.keys(filters).forEach(column => {
                    const filterValue = filters[column]?.toLowerCase()?.trim();
                    if (!filterValue) return;
                    if (column === 'referencia') {
                        const referenciaValue = ref.referencia ? ref.referencia.toLowerCase() : '';
                        match = match && referenciaValue.includes(filterValue);
                    } else if (column === 'proveedor') {
                        const proveedorValue = ref.proveedorLowerCase || ref.proveedor?.toLowerCase() || '';
                        match = match && proveedorValue.includes(filterValue);
                    } else if (column === 'descripcion') {
                        const descripcionValue = ref.descripcion ? ref.descripcion.toLowerCase() : '';
                        match = match && descripcionValue.includes(filterValue);
                    } else if (column === 'fechaCreacion') {
                        const fechaDisplay = ref.fechaCreacion ? formatDate(ref.fechaCreacion.toDate()) : '-';
                        match = match && fechaDisplay.toLowerCase().includes(filterValue);
                    } else if (column === 'fechaActualizada') {
                        const fechaDisplay = ref.fechaActualizada ? `Modificado ${formatDate(ref.fechaActualizada.toDate())}` : '-';
                        match = match && fechaDisplay.toLowerCase().includes(filterValue);
                    }
                });
                return match;
            });

            const totalRecordsCount = referencias.length;
            totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
            totalPages = Math.ceil(totalRecordsCount / recordsPerPage);

            const startIndex = (currentPage - 1) * recordsPerPage;
            const endIndex = startIndex + recordsPerPage;
            referencias = referencias.slice(startIndex, endIndex);

            renderTable();
            updatePagination();
            tableContainer.style.display = 'block';
            hideModal(loadingModal);
        } catch (error) {
            console.error('loadReferencias: Error al cargar referencias:', error);
            showSuccessMessage('Error al cargar referencias: ' + error.message, false);
            hideModal(loadingModal);
        } finally {
            isLoading = false;
        }
    }

    function renderTable() {
        if (!referenciasTableBody) {
            showSuccessMessage('Tabla de referencias no encontrada', false);
            return;
        }
        referenciasTableBody.innerHTML = '';

        referencias.forEach(ref => {
            const fechaDisplay = ref.fechaActualizada ? `Modificado ${formatDate(ref.fechaActualizada.toDate())}` :
                ref.fechaCreacion ? formatDate(ref.fechaCreacion.toDate()) : '-';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ref.referenciaId}</td>
                <td>
                    <i class="fas fa-edit action-icon" data-id="${ref.docId}" title="Editar"></i>
                    <i class="fas fa-trash action-icon" data-id="${ref.docId}" title="Eliminar"></i>
                    <i class="fas fa-history action-icon" data-id="${ref.docId}" title="Historial"></i>
                </td>
                <td>${ref.referencia || '-'}</td>
                <td>${ref.descripcion || '-'}</td>
                <td>${ref.precio ? ref.precio.toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '-'}</td>
                <td>${ref.codigo || '-'}</td>
                <td>${ref.proveedor || '-'}</td>
                <td>${ref.modalidad || '-'}</td>
                <td>${ref.categoria || '-'}</td>
                <td>${ref.estado || 'Activo'}</td>
                <td>${fechaDisplay}</td>
                <td>${ref.usuario || '-'}</td>
            `;
            referenciasTableBody.appendChild(tr);
        });
    }

    function updatePagination() {
        if (!pageInfo) return;
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage >= totalPages;
    }

    async function loadLogs(referenciaId) {
        if (!logContent) {
            showSuccessMessage('Contenedor de logs no encontrado', false);
            return;
        }
        try {
            const logsCollection = collection(db, 'referencias', referenciaId, 'logs');
            const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'));
            const logsSnapshot = await getDocs(logsQuery);
            logContent.innerHTML = '';
            if (logsSnapshot.empty) {
                logContent.innerHTML = '<p>No hay registros de cambios.</p>';
            } else {
                logsSnapshot.forEach(doc => {
                    const logData = doc.data();
                    const timestamp = logData.timestamp?.toDate?.() || new Date();
                    const fechaDisplay = formatDate(timestamp);
                    let action = logData.action;
                    if (action.startsWith('Creado:')) {
                        action = 'Creación';
                    } else if (action.startsWith('Actualizado:')) {
                        action = 'Modificado';
                    } else if (action.startsWith('Eliminado:')) {
                        action = 'Eliminado';
                    }
                    const logEntry = document.createElement('div');
                    logEntry.className = 'log-entry';
                    logEntry.innerHTML = `
                        <strong>${action}</strong>: 
                        ${logData.details || '-'}<br>
                        <small>Fecha: ${fechaDisplay} | Usuario: ${logData.user || '-'}</small>
                    `;
                    logContent.appendChild(logEntry);
                });
            }
            showModal(logModal);
        } catch (error) {
            showSuccessMessage('Error al cargar historial: ' + error.message, false);
        }
    }

    function openEditModal(ref) {
        if (!editModal) return;
        currentEditId = ref.docId;
        editReferenciaInput.value = ref.referencia || '';
        editDescripcionInput.value = ref.descripcion || '';
        editPrecioInput.value = ref.precio ? ref.precio.toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '0';
        editCodigoInput.value = ref.codigo || '';
        editProveedorInput.value = ref.proveedor || '';
        editModalidadSelect.value = ref.modalidad || 'Cotización';
        editCategoriaSelect.value = ref.categoria || 'Implantes';
        editEstadoSelect.value = ref.estado || 'Activo';
        showModal(editModal);
    }

    function openDeleteModal(ref) {
        if (!deleteMessage) return;
        deleteMessage.textContent = `¿Estás seguro de que quieres eliminar la referencia "${ref.referencia}"?`;
        confirmDeleteBtn.dataset.id = ref.docId;
        showModal(deleteModal);
    }

    function exportToExcel() {
        const data = allReferencias.map(ref => ({
            ID: ref.referenciaId,
            Referencia: ref.referencia || '-',
            Descripción: ref.descripcion || '-',
            Precio: ref.precio ? ref.precio.toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '-',
            Código: ref.codigo || '-',
            Proveedor: ref.proveedor || '-',
            Modalidad: ref.modalidad || '-',
            Categoría: ref.categoria || '-',
            Estado: ref.estado || 'Activo',
            'Fecha Creación': ref.fechaActualizada ? `Modificado ${formatDate(ref.fechaActualizada.toDate())}` :
                ref.fechaCreacion ? formatDate(ref.fechaCreacion.toDate()) : '-',
            Usuario: ref.usuario || '-'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Referencias');
        XLSX.writeFile(wb, `referencias_${new Date().toISOString().split('T')[0]}.xlsx`);
        showSuccessMessage('Archivo exportado exitosamente', true);
    }

    function setupFilters() {
        const filterIcons = document.querySelectorAll('.filter-icon');
        const headers = document.querySelectorAll('#referencias-table th');
        if (!tableContainer || filterIcons.length === 0) {
            console.warn('No se encontraron íconos de filtro o table-container');
            return;
        }

        function closeAllFilters() {
            document.querySelectorAll('.filter-container').forEach(container => container.remove());
            headers.forEach(header => {
                const column = header.querySelector('.filter-icon')?.dataset.column;
                header.classList.toggle('filter-active', !!filters[column]);
                header.title = filters[column] ? `Filtro: ${filters[column]}` : '';
            });
        }

        filterIcons.forEach(icon => {
            icon.removeEventListener('click', handleFilterIconClick);
            icon.addEventListener('click', handleFilterIconClick);
        });

        function handleFilterIconClick(e) {
            e.stopPropagation();
            const column = e.target.dataset.column;
            const th = e.target.parentElement;
            const existingContainer = document.querySelector('.filter-container');

            if (existingContainer) {
                closeAllFilters();
            }

            const container = document.createElement('div');
            container.className = 'filter-container';

            const clearButton = document.createElement('button');
            clearButton.className = 'clear-filter-button';
            clearButton.textContent = 'Borrar Filtro';
            clearButton.disabled = !filters[column];
            clearButton.addEventListener('click', () => {
                filters[column] = '';
                currentPage = 1;
                loadReferencias();
                closeAllFilters();
            });
            container.appendChild(clearButton);

            const label = document.createElement('label');
            label.className = 'filter-label';
            label.textContent = 'Filtrar por:';
            container.appendChild(label);

            let input;
            if (column === 'estado' || column === 'modalidad' || column === 'categoria') {
                input = document.createElement('select');
                let options = [];
                if (column === 'estado') {
                    options = ['Activo', 'Inactivo'];
                } else if (column === 'modalidad') {
                    options = ['Cotización', 'Consignación'];
                } else if (column === 'categoria') {
                    options = ['Implantes', 'Insumos'];
                }
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    input.appendChild(option);
                });
                input.value = filters[column] || '';
            } else {
                input = document.createElement('input');
                input.type = 'text';
                input.value = filters[column] || '';
                input.placeholder = `Filtrar ${th.textContent.trim().replace(/[\n\r]+/g, '')}...`;
                if (column === 'precio') {
                    formatPrice(input);
                }
            }
            container.appendChild(input);

            const iconRect = e.target.getBoundingClientRect();
            const tableRect = tableContainer.getBoundingClientRect();
            const thRect = th.getBoundingClientRect();
            const topPosition = iconRect.bottom - tableRect.top + tableContainer.scrollTop + 2;
            const leftPosition = iconRect.left - tableRect.left + tableContainer.scrollLeft;
            container.style.top = `${topPosition}px`;
            container.style.left = `${leftPosition}px`;
            container.style.width = `${Math.min(thRect.width - 12, 200)}px`;

            let timeout;
            if (input.tagName === 'SELECT') {
                input.addEventListener('change', () => {
                    filters[column] = input.value.trim();
                    currentPage = 1;
                    loadReferencias();
                    closeAllFilters();
                });
            } else {
                input.addEventListener('input', () => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        filters[column] = input.value.trim();
                        currentPage = 1;
                        loadReferencias();
                        headers.forEach(header => {
                            header.classList.toggle('filter-active', !!filters[header.querySelector('.filter-icon')?.dataset.column]);
                            header.title = filters[header.querySelector('.filter-icon')?.dataset.column] ? `Filtro: ${filters[header.querySelector('.filter-icon')?.dataset.column]}` : '';
                        });
                        clearButton.disabled = !filters[column];
                    }, 300);
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        filters[column] = input.value.trim();
                        currentPage = 1;
                        loadReferencias();
                        closeAllFilters();
                    } else if (e.key === 'Escape') {
                        closeAllFilters();
                    }
                });
            }

            tableContainer.appendChild(container);
            container.style.display = 'block';
            input.focus();
        }

        document.removeEventListener('click', handleOutsideClick);
        document.addEventListener('click', handleOutsideClick);

        function handleOutsideClick(e) {
            if (!e.target.closest('.filter-container') && !e.target.classList.contains('filter-icon')) {
                closeAllFilters();
            }
        }

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                filters = {};
                currentPage = 1;
                loadReferencias();
                closeAllFilters();
            });
        }
    }

    async function init() {
        if (!container) {
            showSuccessMessage('Contenedor .referencias-container no encontrado', false);
            return;
        }

        formatPrice(editPrecioInput);
        await setupProveedorAutocomplete('edit-proveedor', 'edit-proveedor-list', 'edit-proveedor-search');

        try {
            onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    showSuccessMessage('No hay usuario autenticado', false);
                    container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión.</p>';
                    setTimeout(() => {
                        window.location.href = 'index.html?error=auth-required';
                    }, 2000);
                    return;
                }

                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (!userDoc.exists()) {
                        showSuccessMessage('Documento de usuario no encontrado', false);
                        container.innerHTML = '<p>Error: Tu cuenta no está registrada. Contacta al administrador.</p>';
                        return;
                    }

                    const userData = userDoc.data();
                    const hasAccess = userData.role === 'Administrador' ||
                        (userData.permissions && userData.permissions.includes('Implantes:Referencias'));
                    if (!hasAccess) {
                        showSuccessMessage('Acceso denegado', false);
                        container.innerHTML = '<p>Acceso denegado. No tienes permisos para este módulo.</p>';
                        return;
                    }

                    await loadReferencias();
                    setupFilters();

                    // Event listeners para los botones de importación
                    if (downloadTemplateBtn) {
                        downloadTemplateBtn.addEventListener('click', downloadTemplate);
                    }

                    if (importFileBtn) {
                        importFileBtn.addEventListener('click', () => {
                            fileInput.click();
                        });
                    }

                    if (fileInput) {
                        fileInput.addEventListener('change', handleFileImport);
                    }

                    if (closeImportResultsBtn) {
                        closeImportResultsBtn.addEventListener('click', () => {
                            hideModal(importResultsModal);
                        });
                    }

                    // Event listeners para edición
                    if (saveEditBtn) {
                        saveEditBtn.addEventListener('click', async () => {
                            const referencia = editReferenciaInput.value.trim().toUpperCase();
                            const descripcion = editDescripcionInput.value.trim().toUpperCase();
                            let precio = editPrecioInput.value.replace(/[^0-9]/g, '');
                            precio = precio ? parseInt(precio) : 0;
                            const codigo = editCodigoInput.value.trim() || "Pendiente";
                            const proveedor = editProveedorInput.value.trim();
                            const proveedorLowerCase = proveedor.toLowerCase();
                            const modalidad = editModalidadSelect.value;
                            const categoria = editCategoriaSelect.value;
                            const estado = editEstadoSelect.value;

                            if (!referencia || !descripcion || !proveedor || !precio) {
                                showSuccessMessage('Complete todos los campos obligatorios (referencia, descripción, proveedor, precio)', false);
                                return;
                            }

                            if (precio > 9999999) {
                                showSuccessMessage('El precio no puede superar 9.999.999', false);
                                return;
                            }

                            try {
                                showModal(registerModal, registerProgress, 20);
                                const refRef = doc(db, 'referencias', currentEditId);
                                const fullName = await getUserFullName();
                                const now = Timestamp.fromDate(new Date());

                                const updatedData = {
                                    referencia,
                                    descripcion,
                                    precio,
                                    codigo,
                                    proveedor,
                                    proveedorLowerCase,
                                    modalidad,
                                    categoria,
                                    estado,
                                    fechaActualizada: now,
                                    usuario: fullName,
                                    uid: user.uid
                                };

                                await updateDoc(refRef, updatedData);
                                registerProgress.textContent = '60%';

                                const logRef = collection(db, 'referencias', currentEditId, 'logs');
                                await addDoc(logRef, {
                                    action: `Actualizado: ${referencia}`,
                                    details: `Referencia actualizada con precio ${precio.toLocaleString('es-CL')}`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: user.uid
                                });

                                registerProgress.textContent = '100%';
                                hideModal(registerModal);
                                hideModal(editModal);
                                showSuccessMessage('Referencia actualizada exitosamente', true);
                                await loadReferencias();
                            } catch (error) {
                                hideModal(registerModal);
                                showSuccessMessage('Error al actualizar referencia: ' + error.message, false);
                            }
                        });
                    }

                    if (cancelEditBtn) {
                        cancelEditBtn.addEventListener('click', () => {
                            hideModal(editModal);
                        });
                    }

                    if (confirmDeleteBtn) {
                        confirmDeleteBtn.addEventListener('click', async () => {
                            const refId = confirmDeleteBtn.dataset.id;
                            if (!refId) return;

                            try {
                                showModal(registerModal, registerProgress, 20);
                                const refRef = doc(db, 'referencias', refId);
                                const refSnap = await getDoc(refRef);
                                if (!refSnap.exists()) {
                                    showSuccessMessage('Referencia no encontrada', false);
                                    hideModal(registerModal);
                                    hideModal(deleteModal);
                                    return;
                                }

                                const refData = refSnap.data();
                                const fullName = await getUserFullName();
                                const now = Timestamp.fromDate(new Date());

                                await deleteDoc(refRef);
                                registerProgress.textContent = '60%';

                                const logRef = collection(db, 'referencias', refId, 'logs');
                                await addDoc(logRef, {
                                    action: `Eliminado: ${refData.referencia}`,
                                    details: `Referencia eliminada`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: user.uid
                                });

                                registerProgress.textContent = '100%';
                                hideModal(registerModal);
                                hideModal(deleteModal);
                                showSuccessMessage('Referencia eliminada exitosamente', true);
                                await loadReferencias();
                            } catch (error) {
                                hideModal(registerModal);
                                showSuccessMessage('Error al eliminar referencia: ' + error.message, false);
                            }
                        });
                    }

                    if (cancelDeleteBtn) {
                        cancelDeleteBtn.addEventListener('click', () => {
                            hideModal(deleteModal);
                        });
                    }

                    if (closeLogBtn) {
                        closeLogBtn.addEventListener('click', () => {
                            hideModal(logModal);
                        });
                    }

                    if (exportExcelBtn) {
                        exportExcelBtn.addEventListener('click', exportToExcel);
                    }

                    if (prevBtn) {
                        prevBtn.addEventListener('click', () => {
                            if (currentPage > 1) {
                                currentPage--;
                                loadReferencias();
                            }
                        });
                    }

                    if (nextBtn) {
                        nextBtn.addEventListener('click', () => {
                            if (currentPage < totalPages) {
                                currentPage++;
                                loadReferencias();
                            }
                        });
                    }

                    // Event listeners para acciones de tabla
                    referenciasTableBody.addEventListener('click', (e) => {
                        const target = e.target;
                        const refId = target.dataset.id;
                        if (!refId) return;

                        const ref = allReferencias.find(r => r.docId === refId) || referencias.find(r => r.docId === refId);
                        if (!ref) return;

                        if (target.classList.contains('fa-edit')) {
                            openEditModal(ref);
                        } else if (target.classList.contains('fa-trash')) {
                            openDeleteModal(ref);
                        } else if (target.classList.contains('fa-history')) {
                            loadLogs(refId);
                        }
                    });

                } catch (error) {
                    showSuccessMessage('Error al verificar permisos: ' + error.message, false);
                    container.innerHTML = '<p>Error al verificar permisos. Contacta al administrador.</p>';
                }
            });
        } catch (error) {
            showSuccessMessage('Error al inicializar la aplicación: ' + error.message, false);
            container.innerHTML = '<p>Error crítico al cargar la aplicación. Contacta al administrador.</p>';
        }
    }

    init();
} catch (error) {
    console.error('Error crítico al inicializar Firebase:', error);
    if (document.querySelector('.referencias-container')) {
        document.querySelector('.referencias-container').innerHTML = '<p>Error crítico al cargar la aplicación. Contacta al administrador.</p>';
    }

}
