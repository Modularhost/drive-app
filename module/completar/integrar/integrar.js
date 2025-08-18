import { getFirestore, collection, getDocs, getDoc, doc, writeBatch, query, where, Timestamp, orderBy, addDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getApps, initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';

const firebaseConfig = {
  apiKey: "AIzaSyDuF7p0X6N8IE19Bqt78LQAp805tMl84Ds",
  authDomain: "modular-app-16bd6.firebaseapp.com",
  projectId: "modular-app-16bd6",
  storageBucket: "modular-app-16bd6.firebasestorage.app",
  messagingSenderId: "1006327040835",
  appId: "1:1006327040835:web:b8b4f510da46514a3d3df6",
  measurementId: "G-GVKBWL9GT9"
};

let app, auth, db;
let currentUser = null;
let registros = [];
let currentPage = 1;
const recordsPerPage = 50;
let filters = {};
let quickFilters = {
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    state: null
};

const elements = {
    container: document.querySelector('.integrar-container'),
    integrarTableBody: document.querySelector('#integrar-table tbody'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    pageInfo: document.getElementById('page-info'),
    totalRecords: document.getElementById('total-records'),
    exportExcelBtn: document.getElementById('export-excel-btn'),
    downloadTemplateBtn: document.getElementById('download-template-btn'),
    importExcelBtn: document.getElementById('import-excel-btn'),
    excelFileInput: document.getElementById('excel-file-input'),
    filterYearSelect: document.getElementById('filter-year'),
    filterMonthSelect: document.getElementById('filter-month'),
    showAllBtn: document.getElementById('show-all-btn'),
    stateButtonsContainer: document.getElementById('state-buttons'),
    loadingSpinner: document.getElementById('loading-spinner'),
    successModal: document.getElementById('success-modal'),
    successIcon: document.getElementById('success-icon'),
    successMessage: document.getElementById('success-message'),
    importProgressModal: document.getElementById('import-progress-modal'),
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),
    importResults: document.getElementById('import-results'),
    successCount: document.getElementById('success-count'),
    errorCount: document.getElementById('error-count'),
    errorDetails: document.getElementById('error-details'),
    errorList: document.getElementById('error-list'),
    closeImportBtn: document.getElementById('close-import-btn')
};

const monthNames = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

function formatDate(date) {
    if (!date || isNaN(new Date(date))) return '-';
    return new Date(date).toLocaleString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
    });
}

function formatDateOnly(date) {
    console.debug('Procesando fecha en formatDateOnly:', {
        inputDate: date,
        inputType: typeof date,
        isTimestamp: date instanceof Timestamp
    });

    if (!date) {
        console.debug('Fecha no proporcionada, retornando "-"');
        return '-';
    }

    let parsedDate;

    if (typeof date === 'string') {
        const [year, month, day] = date.split('-');
        if (year && month && day && year.length === 4 && month.length === 2 && day.length === 2) {
            parsedDate = new Date(Date.UTC(year, month - 1, day));
        } else {
            console.debug('Fecha en formato de cadena inválida:', date);
            return '-';
        }
    } else if (date instanceof Timestamp) {
        parsedDate = date.toDate();
    } else if (date instanceof Date) {
        parsedDate = date;
    } else {
        console.debug('Formato de fecha no reconocido:', date, 'Tipo:', typeof date);
        return '-';
    }

    if (!parsedDate || isNaN(parsedDate.getTime())) {
        console.debug('Fecha parseada inválida:', date, 'Parsed:', parsedDate);
        return '-';
    }

    const day = parsedDate.getUTCDate().toString().padStart(2, '0');
    const month = (parsedDate.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = parsedDate.getUTCFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    console.debug('Fecha formateada:', formattedDate);
    return formattedDate;
}

function formatPrice(value) {
    return value ? parseInt(value).toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '-';
}

function formatPercentage(value) {
    if (!value || value === '-' || value === '') return '-';
    
    if (typeof value === 'string' && value.includes('%')) {
        return value.trim();
    }
    if (typeof value === 'number') {

        const percentageValue = Math.round(value * 100);
        return `${percentageValue}%`;
    }
    
    if (typeof value === 'string') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            if (numValue <= 10) {
                const percentageValue = Math.round(numValue * 100);
                return `${percentageValue}%`;
            } else {
                return `${numValue}%`;
            }
        }
        const trimmed = value.trim();
        return trimmed ? `${trimmed}%` : '-';
    }
    
    return '-';
}

function showModal(modal) {
    if (!modal) {
        console.error('Modal no encontrado en el DOM');
        return;
    }
    modal.style.display = 'flex';
    modal.removeAttribute('hidden');
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
}

function hideModal(modal) {
    if (!modal) {
        console.error('Modal no encontrado en el DOM');
        return;
    }
    modal.style.display = 'none';
    modal.setAttribute('hidden', true);
    modal.style.visibility = 'hidden';
}

function showSuccessMessage(message, isSuccess = true) {
    if (!elements.successModal || !elements.successIcon || !elements.successMessage) {
        console.warn('Elementos de éxito no encontrados');
        alert(message);
        return;
    }

    console.debug('Mostrando mensaje de éxito:', { message, isSuccess });
    elements.successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
    elements.successMessage.textContent = message;
    elements.successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
    showModal(elements.successModal);
    setTimeout(() => hideModal(elements.successModal), 3000);
}

function showSpinner() {
    if (elements.loadingSpinner) {
        console.debug('Mostrando spinner');
        elements.loadingSpinner.style.display = 'flex';
        elements.loadingSpinner.removeAttribute('hidden');
    }
}

function hideSpinner() {
    if (elements.loadingSpinner) {
        console.debug('Ocultando spinner');
        elements.loadingSpinner.style.display = 'none';
        elements.loadingSpinner.setAttribute('hidden', true);
    }
}

async function getUserFullName() {
    if (!currentUser) throw new Error('No se encontró el usuario autenticado');
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
    return userSnap.data().fullName || 'Usuario Desconocido';
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
        const fechaCX = item.fechaCX;
        if (!fechaCX) return false;

        let fechaCXDate;
        if (typeof fechaCX === 'string') {
            fechaCXDate = new Date(fechaCX);
        } else if (fechaCX instanceof Timestamp) {
            fechaCXDate = fechaCX.toDate();
        } else if (fechaCX instanceof Date) {
            fechaCXDate = fechaCX;
        }

        if (!fechaCXDate || isNaN(fechaCXDate)) return false;

        const year = fechaCXDate.getUTCFullYear().toString();
        const month = (fechaCXDate.getUTCMonth() + 1).toString().padStart(2, '0');

        const yearMatch = !quickFilters.year || year === quickFilters.year;
        const monthMatch = !quickFilters.month || month === quickFilters.month;
        const stateMatch = !quickFilters.state || item.estado === quickFilters.state;

        return yearMatch && monthMatch && stateMatch;
    });
}

function updateYearFilter(data) {
    if (!elements.filterYearSelect) return;

    const years = [...new Set(data
        .filter(p => p.fechaCX)
        .map(p => {
            const fechaCX = p.fechaCX;
            let fechaCXDate;
            if (typeof fechaCX === 'string') fechaCXDate = new Date(fechaCX);
            else if (fechaCX instanceof Timestamp) fechaCXDate = fechaCX.toDate();
            else if (fechaCX instanceof Date) fechaCXDate = fechaCX;
            return fechaCXDate && !isNaN(fechaCXDate) ? fechaCXDate.getUTCFullYear().toString() : null;
        })
        .filter(y => y)
    )].sort((a, b) => b - a);

    elements.filterYearSelect.innerHTML = '<option value="">Todos los años</option>' +
        years.map(year => `<option value="${year}">${year}</option>`).join('');
    elements.filterYearSelect.value = quickFilters.year || '';
}

function updateMonthFilter(data) {
    if (!elements.filterMonthSelect) return;

    let months = [];
    if (quickFilters.year) {
        months = [...new Set(data
            .filter(p => {
                const fechaCX = p.fechaCX;
                if (!fechaCX) return false;
                let fechaCXDate;
                if (typeof fechaCX === 'string') fechaCXDate = new Date(fechaCX);
                else if (fechaCX instanceof Timestamp) fechaCXDate = fechaCX.toDate();
                else if (fechaCX instanceof Date) fechaCXDate = fechaCX;
                if (!fechaCXDate || isNaN(fechaCXDate)) return false;
                return fechaCXDate.getUTCFullYear().toString() === quickFilters.year;
            })
            .map(p => {
                const fechaCX = p.fechaCX;
                let fechaCXDate;
                if (typeof fechaCX === 'string') fechaCXDate = new Date(fechaCX);
                else if (fechaCX instanceof Timestamp) fechaCXDate = fechaCX.toDate();
                else if (fechaCX instanceof Date) fechaCXDate = fechaCX;
                return (fechaCXDate.getUTCMonth() + 1).toString().padStart(2, '0');
            })
        )].sort();
    }

    elements.filterMonthSelect.innerHTML = '<option value="">Todos los meses</option>' +
        months.map(month => `<option value="${month}">${monthNames[month]}</option>`).join('');
    elements.filterMonthSelect.value = quickFilters.month || '';
}

function updateStateButtons(data) {
    if (!elements.stateButtonsContainer) return;

    const filteredData = applyQuickFilters(data);
    const states = [...new Set(filteredData
        .map(p => p.estado)
        .filter(s => s)
    )].sort();

    elements.stateButtonsContainer.innerHTML = states.map(state => {
        const stateClass = state.toLowerCase().replace(/\s+/g, '-');
        return `<button class="state-button ${quickFilters.state === state ? 'active' : ''}" data-state="${stateClass}">${state}</button>`;
    }).join('');

    const stateButtons = elements.stateButtonsContainer.querySelectorAll('.state-button');
    stateButtons.forEach(button => {
        button.addEventListener('click', () => {
            const state = button.textContent;
            quickFilters.state = quickFilters.state === state ? null : state;
            stateButtons.forEach(btn => btn.classList.remove('active'));
            if (quickFilters.state) button.classList.add('active');
            loadRegistros();
        });
    });
}

function updatePagination(totalRecordsCount) {
    const { pageInfo, totalRecords, prevBtn, nextBtn } = elements;
    if (!pageInfo || !totalRecords || !prevBtn || !nextBtn) return;

    const totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

async function loadRegistros() {
    try {
        if (!elements.integrarTableBody) {
            console.error('Tabla de registros no encontrada');
            showSuccessMessage('Error: No se encontró la tabla de registros', false);
            hideSpinner();
            return;
        }

        showSpinner();

        const registrosCollection = collection(db, 'cargosconsignacion');

        let querySnapshot;
        try {
            const q = query(
                registrosCollection,
                orderBy('fechaCX', 'desc'),
                orderBy('nombrePaciente', 'asc'),
                orderBy('proveedor', 'asc')
            );
            querySnapshot = await getDocs(q);
        } catch (orderError) {
            console.warn('Error con orderBy múltiple, intentando consulta simplificada:', orderError);
            try {
                const q = query(registrosCollection, orderBy('fechaCX', 'desc'));
                querySnapshot = await getDocs(q);
            } catch (singleOrderError) {
                console.warn('Error con orderBy de fechaCX, intentando sin orderBy:', singleOrderError);
                querySnapshot = await getDocs(registrosCollection);
            }
        }

        elements.integrarTableBody.innerHTML = '';
        registros = [];

        if (querySnapshot.size === 0) {
            console.warn('No se encontraron documentos en cargosconsignacion');

            try {
                const allDocs = await getDocs(collection(db, 'cargosconsignacion'));

                if (allDocs.size > 0) {
                    querySnapshot = allDocs;
                } else {
                    elements.integrarTableBody.innerHTML = '<tr><td colspan="26" style="text-align: center; padding: 40px;">No hay registros disponibles</td></tr>';
                    hideSpinner();
                    return;
                }
            } catch (verifyError) {
                console.error('Error al verificar colección:', verifyError);
                elements.integrarTableBody.innerHTML = '<tr><td colspan="26" style="text-align: center; padding: 40px;">Error al acceder a los datos</td></tr>';
                hideSpinner();
                return;
            }
        }

        querySnapshot.forEach(doc => {
            const data = doc.data();
            console.debug('Documento cargado:', {
                docId: doc.id,
                fechaCreacion: data.fechaCreacion,
                fechaCX: data.fechaCX,
                fechaCargo: data.fechaCargo,
                data: data
            });

            const normalizedData = {
                ...data,
                fechaCX: data.fechaCX,
                nombrePaciente: data.nombrePaciente,
                proveedor: data.proveedor
            };

            registros.push({ docId: doc.id, ...normalizedData });
        });

        if (registros.length === 0) {
            console.warn('No se pudieron procesar documentos');
            elements.integrarTableBody.innerHTML = '<tr><td colspan="26" style="text-align: center; padding: 40px;">No hay registros disponibles</td></tr>';
            hideSpinner();
            return;
        }

        registros.sort((a, b) => {
            let fechaA = a.fechaCX ? (a.fechaCX instanceof Timestamp ? a.fechaCX.toDate() : new Date(a.fechaCX)) : new Date(0);
            let fechaB = b.fechaCX ? (b.fechaCX instanceof Timestamp ? b.fechaCX.toDate() : new Date(b.fechaCX)) : new Date(0);

            if (fechaA.getTime() !== fechaB.getTime()) {
                return fechaB.getTime() - fechaA.getTime(); 
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

        updateYearFilter(registros);
        updateMonthFilter(registros);
        updateStateButtons(registros);

        let filteredRegistros = applyQuickFilters(registros);
        filteredRegistros = applyFilters(filteredRegistros);

        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        const paginatedRegistros = filteredRegistros.slice(startIndex, endIndex);

        if (paginatedRegistros.length === 0) {
            elements.integrarTableBody.innerHTML = '<tr><td colspan="26" style="text-align: center; padding: 40px;">No se encontraron registros con los filtros aplicados</td></tr>';
        } else {
            paginatedRegistros.forEach(registro => {
                const tr = document.createElement('tr');
                const estado = registro.estado || '';
                const estadoClass = estado ? `state-${estado.toLowerCase().replace(/\s+/g, '-')}` : '';
                tr.className = estadoClass;

                tr.innerHTML = `
                    <td>${registro.estado || '-'}</td>
                    <td>${registro.admision || '-'}</td>
                    <td>${registro.COD || '-'}</td>
                    <td>${registro.CANTID || '-'}</td>
                    <td>${registro.VENTA || '-'}</td>
                    <td>${registro.nGuia || '-'}</td>
                    <td>${registro.lote || '-'}</td>
                    <td>${formatDateOnly(registro.fechaVencimiento)}</td>
                    <td>${registro.CARGO || '-'}</td>
                    <td>${formatDateOnly(registro.fechaCargo)}</td>
                    <td>${registro.admision || '-'}</td>
                    <td>${registro.nombrePaciente || '-'}</td>
                    <td>${registro.medico || '-'}</td>
                    <td>${formatDateOnly(registro.fechaCX)}</td>
                    <td>${registro.proveedor || '-'}</td>
                    <td>${registro.codigo || '-'}</td>
                    <td>${registro.descripcion || '-'}</td>
                    <td>${registro.cantidad || '-'}</td>
                    <td>${formatPrice(registro.precio)}</td>
                    <td>${registro.modalidad || '-'}</td>
                    <td>${formatPrice(registro.total)}</td>
                    <td>${registro.referencia || '-'}</td>
                    <td>${formatDateOnly(registro.fechaCreacion)}</td>
                    <td>${formatDateOnly(registro.fechaTraspaso)}</td>
                    <td>${formatPercentage(registro.margen)}</td>
                    <td>${registro.usuario || '-'}</td>
                `;

                elements.integrarTableBody.appendChild(tr);
            });
        }

        updatePagination(filteredRegistros.length);
        hideSpinner();

    } catch (error) {
        console.error('Error al cargar registros:', error.code, error.message);
        showSuccessMessage('Error al cargar registros: ' + error.message, false);
        hideSpinner();
    }
}

async function downloadTemplate() {
    try {
        const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');

        const templateData = [{
            'Estado': 'Actualizar Precio',
            'Admisión': '123',
            'COD': 'ABC123',
            'CANTID': '10',
            'VENTA': '100000',
            'N° Guia': '456',
            'Lote': 'LOT001',
            'Fecha Vencimiento': '15-01-2025',
            'CARGO': 'Cargo Ejemplo',
            'Fecha de Cargo': '16-01-2024',
            'Admisión': '789',
            'Nombre Paciente': 'Juan Pérez',
            'Médico': 'Dr. García',
            'Fecha CX': '17-01-2024',
            'Proveedor': 'Proveedor ABC',
            'Código': 'COD001',
            'Descripción': 'Descripción del producto',
            'Cantidad': '5',
            'Precio': '20000',
            'Modalidad': 'Ambulatorio',
            'Total': '100000',
            'Referencia': 'REF001',
            'Fecha Creación': '18-01-2024',
            'Fecha Traspaso': '19-01-2024',
            'Margen': '20%',
            'Usuario': 'Sistema'
        }];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');

        XLSX.writeFile(workbook, 'plantilla_integrar_consignacion.xlsx');
        showSuccessMessage('Plantilla descargada correctamente');

    } catch (error) {
        console.error('Error al descargar plantilla:', error);
        showSuccessMessage('Error al descargar la plantilla: ' + error.message, false);
    }
}

async function exportToExcel() {
    try {
        const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');

        if (!registros.length) {
            showSuccessMessage('No hay datos para exportar', false);
            return;
        }

        let filteredRegistros = applyQuickFilters(registros);
        filteredRegistros = applyFilters(filteredRegistros);

        const data = filteredRegistros.map(p => ({
            'Estado': p.estado || '-',
            'Admisión': p.admision || '-',
            'COD': p.COD || '-',
            'CANTID': p.CANTID || '-',
            'VENTA': formatPrice(p.VENTA),
            'N° Guia': p.nGuia || '-',
            'Lote': p.lote || '-',
            'Fecha Vencimiento': formatDateOnly(p.fechaVencimiento),
            'CARGO': p.CARGO || '-',
            'Fecha de Cargo': formatDateOnly(p.fechaCargo),
            'Admisión': p.admision || '-',
            'Nombre Paciente': p.nombrePaciente || '-',
            'Médico': p.medico || '-',
            'Fecha CX': formatDateOnly(p.fechaCX),
            'Proveedor': p.proveedor || '-',
            'Código': p.codigo || '-',
            'Descripción': p.descripcion || '-',
            'Cantidad': p.cantidad || '-',
            'Precio': formatPrice(p.precio),
            'Modalidad': p.modalidad || '-',
            'Total': formatPrice(p.total),
            'Referencia': p.referencia || '-',
            'Fecha Creación': formatDateOnly(p.fechaCreacion),
            'Fecha Traspaso': formatDateOnly(p.fechaTraspaso),
            'Margen': formatPercentage(p.margen),
            'Usuario': p.usuario || '-'
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'cargosconsignacion');

        XLSX.writeFile(workbook, 'integrar_consignacion.xlsx');
        showSuccessMessage('Datos exportados correctamente');

    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        showSuccessMessage('Error al exportar los datos: ' + error.message, false);
    }
}

function parseExcelDate(value) {
    if (!value) return null;

    if (typeof value === 'number') {
        const date = new Date((value - 25569) * 86400 * 1000);
        return Timestamp.fromDate(date);
    }

    if (typeof value === 'string') {
        const formats = [
            /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, 
            /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, 
            /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/  
        ];

        for (const format of formats) {
            const match = value.match(format);
            if (match) {
                let day, month, year;
                if (format === formats[1]) {
                    year = parseInt(match[1], 10);
                    month = parseInt(match[2], 10);
                    day = parseInt(match[3], 10);
                } else {
                    const first = parseInt(match[1], 10);
                    const second = parseInt(match[2], 10);
                    year = parseInt(match[3], 10);
                    day = first;
                    month = second;
                    if (format === formats[2]) {
                        year = year < 100 ? 2000 + year : year;
                    }
                }
                const date = new Date(Date.UTC(year, month - 1, day));
                if (!isNaN(date.getTime())) {
                    return Timestamp.fromDate(date);
                }
            }
        }
    }

    return null;
}

async function importExcel(file) {
    return new Promise(async (resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                showModal(elements.importProgressModal);
                elements.progressText.textContent = 'Leyendo archivo...';
                elements.progressBar.style.width = '10%';

                const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');

                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: true });

                if (jsonData.length === 0) {
                    throw new Error('El archivo está vacío o no contiene datos válidos');
                }

                elements.progressText.textContent = 'Validando datos...';
                elements.progressBar.style.width = '20%';

                const fullName = await getUserFullName();
                const now = Timestamp.fromDate(new Date());

                let successImports = 0;
                let errorImports = 0;
                const errors = [];
                const batch = writeBatch(db);
                let batchCount = 0;

                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const progress = ((i + 1) / jsonData.length) * 70 + 20; 
                    elements.progressBar.style.width = `${progress}%`;
                    elements.progressText.textContent = `Procesando registro ${i + 1} de ${jsonData.length}...`;

                    try {
                        const requiredFields = ['Admisión', 'Nombre Paciente', 'Fecha CX', 'Médico', 'Proveedor'];
                        for (const field of requiredFields) {
                            if (!row[field] || row[field].toString().trim() === '') {
                                throw new Error(`Campo obligatorio faltante: ${field}`);
                            }
                        }

                        const existingRegistro = registros.find(p => p.admision === row['Admisión'].toString().trim());
                        if (existingRegistro) {
                            throw new Error(`Ya existe un registro con admisión: ${row['Admisión']}`);
                        }

                        const fechaVencimiento = parseExcelDate(row['Fecha Vencimiento']);
                        const fechaCargo = parseExcelDate(row['Fecha de Cargo']);
                        const fechaCX = parseExcelDate(row['Fecha CX']);
                        const fechaCreacionRaw = row['Fecha Creación'] || row['Fecha Creacion'];
                        const fechaCreacion = parseExcelDate(fechaCreacionRaw) || now;
                        const fechaTraspaso = parseExcelDate(row['Fecha Traspaso']);

                        if (!fechaCX) {
                            throw new Error('Fecha CX es obligatoria y debe ser válida');
                        }

                        let venta = 0;
                        if (row['VENTA']) {
                            const ventaStr = row['VENTA'].toString().replace(/[^0-9]/g, '');
                            venta = parseInt(ventaStr) || 0;
                        }

                        let precio = 0;
                        if (row['Precio']) {
                            const precioStr = row['Precio'].toString().replace(/[^0-9]/g, '');
                            precio = parseInt(precioStr) || 0;
                        }

                        let total = 0;
                        if (row['Total']) {
                            const totalStr = row['Total'].toString().replace(/[^0-9]/g, '');
                            total = parseInt(totalStr) || 0;
                        }

                        const admisionValue = row['Admisión'].toString().trim();
                        const codigoValue = row['Código']?.toString().trim() || '';
                        const cantidadValue = row['Cantidad']?.toString().trim() || '';

                        const docRef = doc(collection(db, 'cargosconsignacion'));
                        const registroData = {
                            estado: row['Estado']?.toString().trim() || 'Actualizar Precio',
                            admision: admisionValue,
                            COD: row['COD']?.toString().trim() || codigoValue,
                            CANTID: row['CANTID']?.toString().trim() || cantidadValue,
                            VENTA: venta,
                            nGuia: row['N° Guia']?.toString().trim() || '',
                            lote: row['Lote']?.toString().trim() || '',
                            fechaVencimiento: fechaVencimiento,
                            CARGO: row['CARGO']?.toString().trim() || '',
                            fechaCargo: fechaCargo,
                            admision: admisionValue,
                            nombrePaciente: row['Nombre Paciente'].toString().trim(),
                            medico: row['Médico'].toString().trim(),
                            fechaCX: fechaCX,
                            proveedor: row['Proveedor'].toString().trim(),
                            codigo: codigoValue,
                            descripcion: row['Descripción']?.toString().trim() || '',
                            cantidad: cantidadValue,
                            precio: precio,
                            modalidad: row['Modalidad']?.toString().trim() || '',
                            total: total,
                            referencia: row['Referencia']?.toString().trim() || '',
                            fechaCreacion: fechaCreacion,
                            fechaTraspaso: fechaTraspaso,
                            margen: row['Margen']?.toString().trim() || '',
                            usuario: row['Usuario']?.toString().trim() || fullName,  
                            fechaActualizada: now,
                            uid: currentUser.uid
                        };

                        batch.set(docRef, registroData);
                        batchCount++;

                        const logRef = doc(collection(db, 'cargosconsignacion', docRef.id, 'logs'));
                        batch.set(logRef, {
                            action: `Creado: ${formatDate(new Date(now.toMillis()))}`,
                            details: `Registro ${registroData.nombrePaciente} importado desde Excel por ${fullName}`,
                            timestamp: now,
                            user: row['Usuario']?.toString().trim() || fullName,  
                            uid: currentUser.uid
                        });
                        batchCount++;

                        successImports++;
                        if (batchCount >= 400) {
                            await batch.commit();
                            batchCount = 0;
                        }

                    } catch (error) {
                        console.error(`Error en fila ${i + 2}:`, error.message);
                        errorImports++;
                        errors.push(`Fila ${i + 2}: ${error.message}`);
                    }
                }

                if (batchCount > 0) {
                    await batch.commit();
                }

                elements.progressText.textContent = 'Finalizando importación...';
                elements.progressBar.style.width = '100%';

                elements.successCount.textContent = `Registros importados: ${successImports}`;
                elements.errorCount.textContent = `Errores: ${errorImports}`;

                if (errors.length > 0) {
                    elements.errorList.innerHTML = errors.map(error => `<li>${error}</li>`).join('');
                    elements.errorDetails.removeAttribute('hidden');
                } else {
                    elements.errorDetails.setAttribute('hidden', true);
                }

                elements.importResults.removeAttribute('hidden');
                elements.closeImportBtn.removeAttribute('hidden');
                elements.progressText.textContent = 'Importación completada';

                if (successImports > 0) {
                    await loadRegistros();
                }

                resolve({ success: successImports, errors: errorImports });

            } catch (error) {
                console.error('Error al importar:', error);
                hideModal(elements.importProgressModal);
                showSuccessMessage('Error al importar: ' + error.message, false);
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('Error al leer el archivo'));
        };

        reader.readAsArrayBuffer(file);
    });
}

function setupFilters() {
    const filterIcons = document.querySelectorAll('.filter-icon');
    console.debug('Configurando filtros:', { count: filterIcons.length });

    filterIcons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            const column = icon.dataset.column;
            const th = icon.closest('th');
            let inputContainer = th.querySelector('.filter-input-container');

            if (inputContainer) {
                inputContainer.remove();
                icon.classList.remove('fa-filter-circle-xmark');
                icon.classList.add('fa-filter');
                delete filters[column];
                currentPage = 1;
                loadRegistros();
                return;
            }

            inputContainer = document.createElement('div');
            inputContainer.className = 'filter-input-container';
            const input = document.createElement('input');
            input.type = 'text';
            input.value = filters[column] || '';

            input.addEventListener('input', () => {
                filters[column] = input.value.trim();
                currentPage = 1;
                loadRegistros();
            });

            inputContainer.appendChild(input);
            th.appendChild(inputContainer);
            input.focus();

            icon.classList.remove('fa-filter');
            icon.classList.add('fa-filter-circle-xmark');

            document.addEventListener('click', (e) => {
                if (!th.contains(e.target) && !inputContainer.contains(e.target)) {
                    inputContainer.remove();
                    icon.classList.remove('fa-filter-circle-xmark');
                    icon.classList.add('fa-filter');
                    if (!filters[column]) {
                        delete filters[column];
                        currentPage = 1;
                        loadRegistros();
                    }
                }
            }, { once: true });
        });
    });
}

function setupQuickFilters() {
    if (elements.filterYearSelect) {
        elements.filterYearSelect.addEventListener('change', () => {
            quickFilters.year = elements.filterYearSelect.value;
            quickFilters.month = null;
            quickFilters.state = null;
            currentPage = 1;
            loadRegistros();
        });
    }

    if (elements.filterMonthSelect) {
        elements.filterMonthSelect.addEventListener('change', () => {
            quickFilters.month = elements.filterMonthSelect.value;
            quickFilters.state = null;
            currentPage = 1;
            loadRegistros();
        });
    }

    if (elements.showAllBtn) {
        elements.showAllBtn.addEventListener('click', () => {
            quickFilters.year = null;
            quickFilters.month = null;
            quickFilters.state = null;
            currentPage = 1;
            loadRegistros();
        });
    }
}

async function init() {
    try {

        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }

        auth = getAuth(app);
        db = getFirestore(app);

        setPersistence(auth, browserLocalPersistence).catch(error => {
            console.error('Error al configurar persistencia:', error);
        });

        if (!elements.container || !elements.integrarTableBody) {
            console.error('Contenedor o tabla no encontrado');
            elements.container.innerHTML = '<p>Error: No se encontraron elementos esenciales. Verifica la configuración.</p>';
            return;
        }

        setupFilters();
        setupQuickFilters();

        if (elements.prevBtn) {
            elements.prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    loadRegistros();
                }
            });
        }

        if (elements.nextBtn) {
            elements.nextBtn.addEventListener('click', () => {
                currentPage++;
                loadRegistros();
            });
        }

        if (elements.exportExcelBtn) {
            elements.exportExcelBtn.addEventListener('click', exportToExcel);
        }

        if (elements.downloadTemplateBtn) {
            elements.downloadTemplateBtn.addEventListener('click', downloadTemplate);
        }

        if (elements.importExcelBtn) {
            elements.importExcelBtn.addEventListener('click', () => {
                elements.excelFileInput.click();
            });
        }

        if (elements.excelFileInput) {
            elements.excelFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        await importExcel(file);
                    } catch (error) {
                        console.error('Error en importación:', error);
                    } finally {
                        e.target.value = ''; 
                    }
                }
            });
        }

        if (elements.closeImportBtn) {
            elements.closeImportBtn.addEventListener('click', () => {
                hideModal(elements.importProgressModal);
                elements.progressBar.style.width = '0%';
                elements.progressText.textContent = 'Procesando...';
                elements.importResults.setAttribute('hidden', true);
                elements.closeImportBtn.setAttribute('hidden', true);
            });
        }

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                console.error('No hay usuario autenticado');
                elements.container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión.</p>';
                setTimeout(() => {
                    window.location.href = 'index.html?error=auth-required';
                }, 1000);
                return;
            }

            currentUser = user;

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    console.error('Documento de usuario no encontrado');
                    elements.container.innerHTML = '<p>Error: Tu cuenta no está registrada. Contacta al administrador.</p>';
                    return;
                }

                const userData = userDoc.data();
                const hasAccess = userData.role === 'Administrador' ||
                    (userData.permissions && userData.permissions.includes('Consignacion:IntegrarConsignacion'));

                if (!hasAccess) {
                    console.error('Acceso denegado');
                    elements.container.innerHTML = '<p>Acceso denegado. No tienes permisos para este módulo.</p>';
                    return;
                }

                await loadRegistros();

            } catch (error) {
                console.error('Error al inicializar:', error);
                elements.container.innerHTML = '<p>Error al inicializar el módulo. Por favor, intenta de nuevo.</p>';
            }
        });


        document.addEventListener('click', (e) => {
            if (
                e.target.closest('.modal-content') ||
                e.target.classList.contains('modal-btn') ||
                e.target.id === 'download-template-btn' ||
                e.target.id === 'import-excel-btn' ||
                e.target.id === 'show-all-btn' ||
                e.target.id === 'prev-btn' ||
                e.target.id === 'next-btn' ||
                e.target.id === 'export-excel-btn' ||
                e.target.classList.contains('state-button') ||
                e.target.classList.contains('filter-icon')
            ) {
                return;
            }

            if (elements.successModal && !elements.successModal.hasAttribute('hidden')) {
                hideModal(elements.successModal);
            }
        });

    } catch (error) {
        console.error('Error en init:', error);
        showSuccessMessage('Error al inicializar el módulo: ' + error.message, false);
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        init();
    });

}
