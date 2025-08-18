import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp, Timestamp, writeBatch, doc, deleteDoc, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getApps, initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

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

    const db = getFirestore(app);
    const auth = getAuth(app);

    function showMessage(messageText, type = 'success') {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = messageText;
        messageContainer.appendChild(message);
        setTimeout(() => {
            message.classList.add('fade-out');
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }

    let allCargos = [];
    let currentPage = 1;
    const itemsPerPage = 50;
    let selectedEstado = null;
    let selectedDayGlobal = '';
    let filterTimeout = null;
    let editingCargoId = null;
    let cargoIdToDelete = null;
    let paquetizationCodes = new Set();

    async function loadPaquetizationCodes() {
        try {
            showLoading();
            const paquetesCollection = collection(db, 'paquetes');
            const querySnapshot = await getDocs(paquetesCollection);
            paquetizationCodes = new Set(querySnapshot.docs.map(doc => doc.data().codigo?.trim()));
        } catch (error) {
            console.error(error.message);
            showMessage(`Error al cargar códigos de paquetes: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    function validateDOMElements() {
        const elements = {
            form: document.getElementById('implantes-form'),
            admisionInput: document.getElementById('admision'),
            previsionSpan: document.getElementById('prevision'),
            convenioSpan: document.getElementById('convenio'),
            pacienteSpan: document.getElementById('paciente'),
            medicoSpan: document.getElementById('medico'),
            fechaCxSpan: document.getElementById('fecha-cx'),
            ingresoInput: document.getElementById('ingreso'),
            cotizacionInput: document.getElementById('cotizacion'),
            referenciaInput: document.getElementById('referencia'),
            cantidadInput: document.getElementById('cantidad'),
            loteInput: document.getElementById('lote'),
            vencimientoInput: document.getElementById('vencimiento'),
            precioSpan: document.getElementById('precio'),
            descripcionSpan: document.getElementById('descripcion'),
            totalSpan: document.getElementById('total'),
            proveedorSpan: document.getElementById('proveedor'),
            codigoSpan: document.getElementById('codigo'),
            totalCotizacionSpan: document.getElementById('total-cotizacion'),
            modalidadSpan: document.getElementById('modalidad'),
            categoriaSpan: document.getElementById('categoria'),
            registrarBtn: document.getElementById('registrar-btn'),
            limpiarBtn: document.getElementById('limpiar-btn'),
            tabla1Body: document.querySelector('#tabla1 tbody'),
            tabla2Body: document.querySelector('#tabla2 tbody'),
            tabla3Body: document.querySelector('#tabla3 tbody'),
            prevPageBtn: document.getElementById('prev-page'),
            nextPageBtn: document.getElementById('next-page'),
            pageInfo: document.getElementById('page-info'),
            messageContainer: document.getElementById('message-container'),
            formGroupButton: document.querySelector('.form-group-button'),
            estadoModal: document.getElementById('estado-modal'),
            estadoSelect: document.getElementById('estado-select'),
            confirmarEstadoBtn: document.getElementById('confirmar-estado-btn'),
            cancelarEstadoBtn: document.getElementById('cancelar-estado-btn'),
            lotesModal: document.getElementById('lotes-modal'),
            modalLoteInput: document.getElementById('lote-input'),
            modalVencimientoInput: document.getElementById('vencimiento-input'),
            confirmarLotesBtn: document.getElementById('confirmar-lotes-btn'),
            cancelarLotesBtn: document.getElementById('cancelar-lotes-btn'),
            yearSelect: document.getElementById('year-filter'),
            monthSelect: document.getElementById('month-filter'),
            daySelect: document.getElementById('day-filter'),
            admisionFilter: document.getElementById('admision-filter'),
            pacienteFilter: document.getElementById('paciente-filter'),
            columnFilter: document.getElementById('column-filter'),
            columnSearch: document.getElementById('column-search'),
            ocModal: document.getElementById('oc-modal'),
            ocTable: document.querySelector('#oc-table'),
            downloadExcelBtn: document.getElementById('download-excel-btn'),
            cancelarOcBtn: document.getElementById('cancelar-oc-btn'),
            deleteModal: document.getElementById('delete-modal'),
            confirmarDeleteBtn: document.getElementById('confirmar-delete-btn'),
            cancelarDeleteBtn: document.getElementById('cancelar-delete-btn'),
            loadingOverlay: document.getElementById('loading-overlay'),
            downloadBtn: document.getElementById('download-btn'),
            downloadOptions: document.getElementById('download-options'),
            downloadYearSelect: document.getElementById('download-year-select'),
            downloadMonthSelect: document.getElementById('download-month-select'),
            downloadMonthGroup: document.getElementById('download-month-group'),
            confirmarDownloadBtn: document.getElementById('confirmar-download-btn'),
            cancelarDownloadBtn: document.getElementById('cancelar-download-btn'),
            downloadModal: document.getElementById('download-modal')
        };

        let missingElements = false;
        Object.entries(elements).forEach(([key, el]) => {
            if (!el) {
                console.error(`Elemento faltante: ${key}`);
                missingElements = true;
            }
        });

        if (missingElements) {
            alert('Faltan elementos en el formulario o tablas. Revisa el HTML.');
            return null;
        }

        return elements;
    }

    const domElements = validateDOMElements();
    if (!domElements) {
        throw new Error('Faltan elementos del DOM');
    }

    const {
        form,
        admisionInput,
        previsionSpan,
        convenioSpan,
        pacienteSpan,
        medicoSpan,
        fechaCxSpan,
        ingresoInput,
        cotizacionInput,
        referenciaInput,
        cantidadInput,
        loteInput,
        vencimientoInput,
        precioSpan,
        descripcionSpan,
        totalSpan,
        proveedorSpan,
        codigoSpan,
        totalCotizacionSpan,
        modalidadSpan,
        categoriaSpan,
        registrarBtn,
        limpiarBtn,
        tabla1Body,
        tabla2Body,
        tabla3Body,
        prevPageBtn,
        nextPageBtn,
        pageInfo,
        messageContainer,
        formGroupButton,
        estadoModal,
        estadoSelect,
        confirmarEstadoBtn,
        cancelarEstadoBtn,
        lotesModal,
        modalLoteInput,
        modalVencimientoInput,
        confirmarLotesBtn,
        cancelarLotesBtn,
        yearSelect,
        monthSelect,
        daySelect,
        admisionFilter,
        pacienteFilter,
        columnFilter,
        columnSearch,
        ocModal,
        ocTable,
        downloadExcelBtn,
        cancelarOcBtn,
        deleteModal,
        confirmarDeleteBtn,
        cancelarDeleteBtn,
        loadingOverlay,
        downloadBtn,
        downloadOptions,
        downloadYearSelect,
        downloadMonthSelect,
        downloadMonthGroup,
        confirmarDownloadBtn,
        cancelarDownloadBtn,
        downloadModal
    } = domElements;

    downloadBtn.addEventListener('click', () => {
        downloadOptions.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!downloadBtn.contains(e.target) && !downloadOptions.contains(e.target)) {
            downloadOptions.classList.remove('active');
        }
    });

    document.getElementById('download-year').addEventListener('click', () => handleDownload('year'));
    document.getElementById('download-year-month').addEventListener('click', () => handleDownload('year-month'));
    document.getElementById('download-all').addEventListener('click', () => handleDownload('all'));
    document.getElementById('download-gestionado').addEventListener('click', () => handleDownload('gestionado'));
    document.getElementById('download-empty-corpo').addEventListener('click', () => handleDownload('empty-corpo'));

    downloadYearSelect.addEventListener('change', async () => {
        const selectedYear = downloadYearSelect.value;
        if (selectedYear && downloadYearSelect.dataset.downloadType === 'year-month') {
            await populateDownloadMonthSelect(selectedYear);
            downloadMonthGroup.style.display = 'block';
        } else {
            downloadMonthGroup.style.display = 'none';
            downloadMonthSelect.innerHTML = '<option value="">Seleccionar mes</option>';
        }
    });

    confirmarDownloadBtn.addEventListener('click', async () => {
        const selectedYear = downloadYearSelect.value;
        const selectedMonth = downloadMonthSelect.value;
        const downloadType = downloadYearSelect.dataset.downloadType;
        if (!selectedYear) {
            showMessage('Por favor, selecciona un año.', 'error');
            return;
        }

        if (!allCargos || allCargos.length === 0) {
            showMessage('Cargando datos, por favor espera...', 'info');
            allCargos = await loadCargos(auth.currentUser);
            if (!allCargos || allCargos.length === 0) {
                showMessage('No se encontraron datos para descargar.', 'error');
                return;
            }
        }

        console.log(`confirmarDownloadBtn: downloadType=${downloadType}, selectedYear=${selectedYear}, selectedMonth=${selectedMonth}, allCargos length=${allCargos.length}`);

        let filteredCargos = allCargos;
        if (downloadType === 'year') {
            filteredCargos = allCargos.filter(cargo => {
                if (!cargo.fechaIngreso || !(cargo.fechaIngreso instanceof Timestamp)) {
                    console.warn(`Cargo con ID ${cargo.id} tiene fechaIngreso inválida: ${cargo.fechaIngreso}`);
                    return false;
                }
                const date = cargo.fechaIngreso.toDate();
                return !isNaN(date.getTime()) && date.getFullYear() === parseInt(selectedYear);
            });
            console.log(`filteredCargos (year) length=${filteredCargos.length}`);
            if (filteredCargos.length === 0) {
                showMessage(`No hay registros para el año ${selectedYear}.`, 'error');
                return;
            }
            downloadCSV(filteredCargos, `registros_${selectedYear}.csv`);
        } else if (downloadType === 'year-month') {
            if (!selectedMonth) {
                showMessage('Por favor, selecciona un mes.', 'error');
                return;
            }
            filteredCargos = allCargos.filter(cargo => {
                if (!cargo.fechaIngreso || !(cargo.fechaIngreso instanceof Timestamp)) {
                    console.warn(`Cargo con ID ${cargo.id} tiene fechaIngreso inválida: ${cargo.fechaIngreso}`);
                    return false;
                }
                const date = cargo.fechaIngreso.toDate();
                return !isNaN(date.getTime()) &&
                    date.getFullYear() === parseInt(selectedYear) &&
                    (date.getMonth() + 1) === parseInt(selectedMonth);
            });
            console.log(`filteredCargos (year-month) length=${filteredCargos.length}`);
            if (filteredCargos.length === 0) {
                showMessage(`No hay registros para ${selectedYear}-${selectedMonth}.`, 'error');
                return;
            }
            const monthNames = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];
            downloadCSV(filteredCargos, `registros_${selectedYear}_${monthNames[parseInt(selectedMonth) - 1]}.csv`);
        }
        downloadModal.classList.remove('active');
        downloadOptions.classList.remove('active');
    });

    cancelarDownloadBtn.addEventListener('click', () => {
        downloadModal.classList.remove('active');
        downloadOptions.classList.remove('active');
        downloadYearSelect.value = '';
        downloadMonthSelect.value = '';
        downloadMonthGroup.style.display = 'none';
    });

    async function populateDownloadYearSelect() {
        if (!downloadYearSelect || !auth.currentUser) {
            return;
        }
        downloadYearSelect.innerHTML = '<option value="">Seleccionar año</option>';
        const cargosQuery = query(
            collection(db, 'cargosimp'),
            where('uid', '==', auth.currentUser.uid)
        );
        const cargosSnapshot = await getDocs(cargosQuery);
        const years = new Set();
        cargosSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.fechaIngreso && data.fechaIngreso instanceof Timestamp) {
                const date = data.fechaIngreso.toDate();
                if (!isNaN(date.getTime())) {
                    years.add(date.getFullYear());
                }
            }
        });
        const sortedYears = Array.from(years).sort((a, b) => b - a);
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            downloadYearSelect.appendChild(option);
        });
    }

    async function populateDownloadMonthSelect(selectedYear) {
        if (!downloadMonthSelect || !auth.currentUser || !selectedYear) {
            return;
        }
        downloadMonthSelect.innerHTML = '<option value="">Seleccionar mes</option>';
        const months = await fetchMonthsForYear(auth.currentUser, selectedYear);
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        months.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = monthNames[month - 1];
            downloadMonthSelect.appendChild(option);
        });
    }

    function showLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }
    }

    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
    }

    function formatDateForInput(date) {
        if (!date || !(date instanceof Timestamp)) {
            return '';
        }
        const d = date.toDate();
        if (isNaN(d.getTime())) {
            return '';
        }
        d.setHours(0, 0, 0, 0);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDateForDisplay(date) {
        if (!date || !(date instanceof Timestamp)) {
            return '-';
        }
        const d = date.toDate();
        if (isNaN(d.getTime())) {
            return '-';
        }
        d.setHours(0, 0, 0, 0);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function formatNumberWithThousands(value) {
        if (!value && value !== 0) return '0';
        const num = Math.round(parseFloat(value));
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    function getTodayDate() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getTodayDateForDisplay() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function calculateMargin(precioSistema) {
        const precio = parseFloat(precioSistema) || 0;
        if (precio < 301) return 500;
        if (precio < 1001) return 400;
        if (precio < 5001) return 300;
        if (precio < 10001) return 250;
        if (precio < 25001) return 200;
        if (precio < 50001) return 160;
        if (precio < 100001) return 140;
        if (precio < 200001) return 80;
        if (precio < 10000000) return 50;
        return 50;
    }

    function calculateVenta(precio, cantidad, modalidad, margen) {
        const precioNum = parseFloat(precio) || 0;
        const cantidadNum = parseInt(cantidad) || 0;
        const margenPercent = parseFloat(margen) / 100 || 0;
        if (modalidad === 'Cotización') {
            return (precioNum + (precioNum * 0.3)) * cantidadNum;
        } else if (modalidad === 'Consignación') {
            return (precioNum + (precioNum * margenPercent)) * cantidadNum;
        }
        return 0;
    }

    function calculateTotalGrupo(admision, proveedor, cargos) {
        try {
            const matchingCargos = cargos.filter(cargo =>
                cargo.admision?.trim() === admision?.trim() &&
                cargo.proveedor?.trim() === proveedor?.trim() &&
                !cargo.parentCargoId
            );
            const totalGrupo = matchingCargos.reduce((sum, cargo) => {
                const totalItem = (cargo.cantidad || 0) * (cargo.precioSistema || cargo.precio || 0);
                return sum + totalItem;
            }, 0);
            return totalGrupo;
        } catch (error) {
            console.error(error.message);
            showMessage(`Error al calcular Total Grupo: ${error.message}`, 'error');
            return 0;
        }
    }

    function convertToCSV(data, columns, separator = ';') {
        const escapeCSVValue = (value) => {
            if (value === null || value === undefined) return '""';
            let strValue = String(value);
            if (strValue.includes('"') || strValue.includes(separator) || strValue.includes('\n')) {
                strValue = strValue.replace(/"/g, '""');
                return `"${strValue}"`;
            }
            return strValue;
        };

        if (!data || data.length === 0) {
            console.warn('No hay datos para generar el CSV');
            return '';
        }

        // Inspeccionar todos los campos presentes en los datos
        const allKeys = new Set();
        data.forEach(item => {
            Object.keys(item).forEach(key => allKeys.add(key));
        });
        console.log('Campos encontrados en los datos:', Array.from(allKeys));

        const headers = columns.map(col => escapeCSVValue(col.header)).join(separator);
        const rows = data.map(item => {
            return columns.map(col => {
                let value;
                // Si es una subfila (parentCargoId no es null), ajustar valores específicos
                if (item.parentCargoId) {
                    if (col.key === 'codigo' || col.key === 'codigo_duplicado') {
                        value = 'No lleva OC';
                    } else if (['precio', 'precioSistema', 'totalItem', 'venta', 'margen'].includes(col.key)) {
                        value = '';
                    } else if (col.key === 'estado') {
                        value = 'Estado PAD';
                    } else if (col.key === 'admision_duplicado') {
                        value = item['admision'] || ''; // Duplicar admision
                    } else {
                        value = item[col.key] || '';
                    }
                } else {
                    value = item[col.key] || '';
                }
                if (value instanceof Timestamp) {
                    value = formatDateForDisplay(value);
                } else if (typeof value === 'number' && !['precio', 'precioSistema', 'totalItem', 'venta', 'margen'].includes(col.key)) {
                    value = formatNumberWithThousands(value);
                }
                return escapeCSVValue(value);
            }).join(separator);
        });

        const csvContent = [headers, ...rows].join('\n');
        console.log('CSV generado:', csvContent.substring(0, 500) + (csvContent.length > 500 ? '...' : ''));
        return csvContent;
    }


    function downloadCSV(data, filename) {
        if (!data || data.length === 0) {
            showMessage('No hay datos para descargar.', 'error');
            return;
        }

        const columns = [
            { key: 'fechaIngreso', header: 'Fecha Ingreso' },
            { key: 'admision', header: 'Admisión' },
            { key: 'admision_duplicado', header: 'Admisión (Repetida)' }, // Columna duplicada
            { key: 'codigo', header: 'Código' },
            { key: 'codigo_duplicado', header: 'Código (Repetido)' }, // Columna duplicada
            { key: 'cantidad', header: 'Cantidad' },
            { key: 'venta', header: 'Venta' },
            { key: 'estado', header: 'Estado' },
            { key: 'fechaCargo', header: 'Fecha Cargo' },
            { key: 'descripcion', header: 'Descripción' },
            { key: 'cotizacion', header: 'Cotización' },
            { key: 'referencia', header: 'Referencia' },
            { key: 'precio', header: 'Precio' },
            { key: 'lote', header: 'Lote' },
            { key: 'vencimiento', header: 'Fecha Vencimiento' },
            { key: 'corpo', header: 'Corpo' },
            { key: 'totalCotizacion', header: 'Total Cotización' },
            { key: 'totalGrupo', header: 'Total Grupo' },
            { key: 'convenio', header: 'Convenio' },
            { key: 'prevision', header: 'Previsión' },
            { key: 'nombrePaciente', header: 'Paciente' },
            { key: 'medico', header: 'Médico' },
            { key: 'fechaCx', header: 'Fecha Cx' },
            { key: 'proveedor', header: 'Proveedor' },
            { key: 'precioSistema', header: 'Precio Sistema' },
            { key: 'modalidad', header: 'Modalidad' },
            { key: 'categoria', header: 'Categoría' },
            { key: 'totalItem', header: 'Total Item' },
            { key: 'margen', header: 'Margen' },
            { key: 'agrupacion', header: 'Agrupación' },
            { key: 'isPackage', header: 'Es Paquete' },
            { key: 'parentCargoId', header: 'ID Cargo Padre' }
        ];

        // Ordenar datos: primero cargos principales, luego sus subfilas
        const sortedData = [];
        const mainCargos = data.filter(cargo => !cargo.parentCargoId);
        mainCargos.sort((a, b) => {
            const dateA = a.fechaIngreso?.toMillis() || 0;
            const dateB = b.fechaIngreso?.toMillis() || 0;
            if (dateB !== dateA) return dateB - dateA; // desc
            const patientA = a.nombrePaciente?.toLowerCase() || '';
            const patientB = b.nombrePaciente?.toLowerCase() || '';
            if (patientA !== patientB) return patientA.localeCompare(patientB); // asc
            const provA = a.proveedor?.toLowerCase() || '';
            const provB = b.proveedor?.toLowerCase() || '';
            return provA.localeCompare(provB); // asc
        });

        mainCargos.forEach(mainCargo => {
            sortedData.push(mainCargo);
            const subCargos = data
                .filter(cargo => cargo.parentCargoId === mainCargo.id)
                .sort((a, b) => {
                    const dateA = a.fechaCargo ? a.fechaCargo.toMillis() : 0;
                    const dateB = b.fechaCargo ? b.fechaCargo.toMillis() : 0;
                    return dateB - dateA;
                });
            sortedData.push(...subCargos);
        });

        console.log(`downloadCSV: ${sortedData.length} registros a exportar (principales: ${mainCargos.length}, subfilas: ${sortedData.length - mainCargos.length})`, sortedData[0]);
        const csv = convertToCSV(sortedData, columns, ';');
        if (!csv) {
            showMessage('No se pudo generar el archivo CSV debido a datos vacíos.', 'error');
            return;
        }

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function handleDownload(type) {
        if (!auth.currentUser) {
            showMessage('Debes iniciar sesión para descargar datos.', 'error');
            return;
        }

        if (!allCargos || allCargos.length === 0) {
            showMessage('Cargando datos, por favor espera...', 'info');
            allCargos = await loadCargos(auth.currentUser);
            if (!allCargos || allCargos.length === 0) {
                showMessage('No se encontraron datos para descargar.', 'error');
                return;
            }
        }

        console.log(`handleDownload: type=${type}, allCargos length=${allCargos.length}`);

        if (type === 'all') {
            downloadCSV(allCargos, 'libro_completo.csv');
            return;
        }
        if (type === 'gestionado') {
            const gestionadoCargos = allCargos.filter(cargo => cargo.corpo?.toLowerCase().includes('gestionado'));
            console.log(`gestionadoCargos length=${gestionadoCargos.length}`);
            if (gestionadoCargos.length === 0) {
                showMessage('No hay registros gestionados para descargar.', 'error');
                return;
            }
            downloadCSV(gestionadoCargos, 'registros_gestionados.csv');
            return;
        }
        if (type === 'empty-corpo') {
            const emptyCorpoCargos = allCargos.filter(cargo => !cargo.corpo || cargo.corpo.trim() === '');
            console.log(`emptyCorpoCargos length=${emptyCorpoCargos.length}`);
            if (emptyCorpoCargos.length === 0) {
                showMessage('No hay registros sin corpo para descargar.', 'error');
                return;
            }
            downloadCSV(emptyCorpoCargos, 'registros_sin_corpo.csv');
            return;
        }
        downloadModal.classList.add('active');
        await populateDownloadYearSelect();
        downloadMonthGroup.style.display = type === 'year-month' ? 'block' : 'none';
        downloadYearSelect.dataset.downloadType = type;
    }

    function checkPaquetizationCode(codigo) {
        return paquetizationCodes.has(codigo?.trim());
    }

    async function updateFormFieldsForPaquetization() {
        const codigo = codigoSpan.textContent.trim();
        if (!codigo) {
            loteInput.value = '';
            vencimientoInput.value = '';
            loteInput.readOnly = false;
            vencimientoInput.readOnly = false;
            return;
        }

        const isPaquetizationCode = checkPaquetizationCode(codigo);
        if (isPaquetizationCode && !editingCargoId) {
            loteInput.value = 'PAD';
            vencimientoInput.value = 'PAD';
            loteInput.readOnly = true;
            vencimientoInput.readOnly = true;
        } else {
            if (!editingCargoId) {
                loteInput.value = '';
                vencimientoInput.value = '';
            }
            loteInput.readOnly = false;
            vencimientoInput.readOnly = false;
        }
    }

    async function loadImplanteByAdmision(admision, user) {
        try {
            showLoading();
            const implantesQuery = query(
                collection(db, 'pacientesimplantes'),
                where('uid', '==', user.uid),
                where('admision', '==', admision.trim())
            );
            const implantesSnapshot = await getDocs(implantesQuery);
            if (implantesSnapshot.empty) {
                return null;
            }
            const data = implantesSnapshot.docs[0].data();
            return {
                prevision: data.prevision || '',
                convenio: data.convenio || '',
                nombrePaciente: data.nombrePaciente || '',
                medico: data.medico || '',
                fechaCX: data.fechaCX || null
            };
        } catch (error) {
            console.error(error.message);
            showMessage(`Error al buscar datos de admisión: ${error.message}`, 'error');
            return null;
        } finally {
            hideLoading();
        }
    }

    async function fetchReferenciaData(referencia) {
        try {
            showLoading();
            const referenciaValue = referencia.toLowerCase().trim().replace(/\s+/g, '');
            const referenciasQuery = query(
                collection(db, 'referencias'),
                where('referenciaLowerCase', '==', referenciaValue)
            );
            const referenciasSnapshot = await getDocs(referenciasQuery);
            if (referenciasSnapshot.empty) {
                return null;
            }
            const refData = referenciasSnapshot.docs[0].data();
            const modalidadValue = refData.modalidad || 'Cotización';
            return {
                precio: refData.precio || 0,
                descripcion: refData.descripcion || 'Implante estándar',
                proveedor: refData.proveedor || '',
                codigo: refData.codigo || '',
                precioSistema: refData.precioSistema || refData.precio || 0,
                agrupacion: refData.agrupacion || '',
                venta: refData.venta || 0,
                corpo: refData.corpo || '',
                modalidad: modalidadValue,
                categoria: refData.categoria || 'Implantes'
            };
        } catch (error) {
            console.error(error.message);
            showMessage(`Error al buscar referencia: ${error.message}`, 'error');
            return null;
        } finally {
            hideLoading();
        }
    }

    async function fetchTotalCotizacionByAdmisionAndProveedor(admision, proveedor, user) {
        try {
            showLoading();
            const implantesQuery = query(
                collection(db, 'pacientesimplantes'),
                where('uid', '==', user.uid),
                where('admision', '==', admision.trim()),
                where('proveedor', '==', proveedor.trim())
            );
            const implantesSnapshot = await getDocs(implantesQuery);
            if (implantesSnapshot.empty) {
                return null;
            }
            const implanteData = implantesSnapshot.docs[0].data();
            return implanteData.totalCotizacion || 0;
        } catch (error) {
            console.error(error.message);
            showMessage(`Error al buscar total cotización: ${error.message}`, 'error');
            return null;
        } finally {
            hideLoading();
        }
    }

    async function updateReferenciasWithLowerCase() {
        try {
            showLoading();
            const referenciasCollection = collection(db, 'referencias');
            const querySnapshot = await getDocs(referenciasCollection);
            const batch = writeBatch(db);
            let updatedCount = 0;
            querySnapshot.forEach(doc => {
                const refData = doc.data();
                if (!refData.referenciaLowerCase && refData.referencia) {
                    batch.update(doc.ref, {
                        referenciaLowerCase: refData.referencia.toLowerCase().trim().replace(/\s+/g, '')
                    });
                    updatedCount++;
                }
            });
            await batch.commit();
            showMessage(`Actualizados ${updatedCount} documentos con referenciaLowerCase`, 'success');
        } catch (error) {
            console.error(error.message);
            showMessage(`Error al actualizar documentos: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    async function fetchMonthsForYear(user, selectedYear) {
        if (!user || !selectedYear) {
            return [];
        }
        try {
            showLoading();
            const cargosQuery = query(
                collection(db, 'cargosimp'),
                where('uid', '==', user.uid),
                where('fechaIngreso', '>=', Timestamp.fromDate(new Date(parseInt(selectedYear), 0, 1))),
                where('fechaIngreso', '<=', Timestamp.fromDate(new Date(parseInt(selectedYear), 11, 31)))
            );
            const cargosSnapshot = await getDocs(cargosQuery);
            const months = new Set();
            cargosSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.fechaIngreso && data.fechaIngreso instanceof Timestamp) {
                    const date = data.fechaIngreso.toDate();
                    if (!isNaN(date.getTime()) && date.getFullYear() === parseInt(selectedYear)) {
                        months.add(date.getMonth() + 1);
                    }
                }
            });
            return Array.from(months).sort((a, b) => a - b);
        } catch (error) {
            console.error(error.message);
            showMessage(`Error al cargar meses: ${error.message}`, 'error');
            return [];
        } finally {
            hideLoading();
        }
    }

    async function fetchDaysForYearMonth(user, selectedYear, selectedMonth) {
        if (!user || !selectedYear || !selectedMonth) {
            return [];
        }
        try {
            showLoading();
            const startDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
            const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);
            const cargosQuery = query(
                collection(db, 'cargosimp'),
                where('uid', '==', user.uid),
                where('fechaIngreso', '>=', Timestamp.fromDate(startDate)),
                where('fechaIngreso', '<=', Timestamp.fromDate(endDate))
            );
            const cargosSnapshot = await getDocs(cargosQuery);
            const days = new Set();
            cargosSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.fechaIngreso && data.fechaIngreso instanceof Timestamp) {
                    const date = data.fechaIngreso.toDate();
                    if (!isNaN(date.getTime()) &&
                        date.getFullYear() === parseInt(selectedYear) &&
                        (date.getMonth() + 1) === parseInt(selectedMonth)) {
                        days.add(date.getDate());
                    }
                }
            });
            return Array.from(days).sort((a, b) => a - b);
        } catch (error) {
            console.error(error.message);
            showMessage(`Error al cargar días: ${error.message}`, 'error');
            return [];
        } finally {
            hideLoading();
        }
    }

    function clearRelatedFields() {
        previsionSpan.textContent = '';
        convenioSpan.textContent = '';
        pacienteSpan.textContent = '';
        medicoSpan.textContent = '';
        fechaCxSpan.textContent = '';
        proveedorSpan.textContent = '';
        totalCotizacionSpan.textContent = '';
        modalidadSpan.textContent = '';
        categoriaSpan.textContent = '';
    }

    function clearForm() {
        referenciaInput.value = '';
        cantidadInput.value = '';
        loteInput.value = '';
        vencimientoInput.value = '';
        precioSpan.textContent = '';
        descripcionSpan.textContent = '';
        proveedorSpan.textContent = '';
        codigoSpan.textContent = '';
        totalSpan.textContent = '0';
        totalCotizacionSpan.textContent = '';
        modalidadSpan.textContent = '';
        categoriaSpan.textContent = '';
    }

    function resetForm() {
        admisionInput.value = '';
        cotizacionInput.value = '';
        referenciaInput.value = '';
        cantidadInput.value = '';
        loteInput.value = '';
        vencimientoInput.value = '';
        precioSpan.textContent = '';
        descripcionSpan.textContent = '';
        proveedorSpan.textContent = '';
        codigoSpan.textContent = '';
        totalSpan.textContent = '0';
        totalCotizacionSpan.textContent = '';
        modalidadSpan.textContent = '';
        categoriaSpan.textContent = '';
        clearRelatedFields();
        ingresoInput.value = getTodayDate();
        editingCargoId = null;
        toggleFormButtons(false);
        updateFormFieldsForPaquetization();
    }

    function toggleFormButtons(isEditing) {
        if (isEditing) {
            registrarBtn.style.display = 'none';
            limpiarBtn.style.display = 'none';
            let guardarCambiosBtn = document.getElementById('guardar-cambios-btn');
            if (!guardarCambiosBtn) {
                guardarCambiosBtn = document.createElement('button');
                guardarCambiosBtn.type = 'button';
                guardarCambiosBtn.id = 'guardar-cambios-btn';
                guardarCambiosBtn.className = 'success-btn';
                guardarCambiosBtn.textContent = 'Guardar Cambios';
                formGroupButton.appendChild(guardarCambiosBtn);
                guardarCambiosBtn.addEventListener('click', saveChanges);
            }
            guardarCambiosBtn.style.display = 'inline-block';
        } else {
            registrarBtn.style.display = 'inline-block';
            limpiarBtn.style.display = 'inline-block';
            const guardarCambiosBtn = document.getElementById('guardar-cambios-btn');
            if (guardarCambiosBtn) {
                guardarCambiosBtn.style.display = 'none';
            }
        }
    }

    async function saveChanges() {
        const user = auth.currentUser;
        if (!user) {
            showMessage('Debes iniciar sesión para actualizar un cargo.', 'error');
            return;
        }
        if (!editingCargoId) {
            showMessage('No se está editando ningún cargo.', 'error');
            return;
        }
        const admision = admisionInput.value.trim();
        const ingreso = ingresoInput.value;
        const cotizacion = cotizacionInput.value.trim();
        const referencia = referenciaInput.value.trim();
        const cantidad = parseInt(cantidadInput.value) || 0;
        const lote = loteInput.value.trim();
        const vencimiento = vencimientoInput.value.trim();
        const precio = parseFloat(precioSpan.textContent.replace(/\./g, '')) || 0;
        const descripcion = descripcionSpan.textContent.trim();
        const proveedor = proveedorSpan.textContent.trim();
        const codigo = codigoSpan.textContent.trim();
        const totalCotizacion = parseFloat(totalCotizacionSpan.textContent.replace(/\./g, '')) || 0;
        const modalidad = modalidadSpan.textContent.trim();
        const categoria = categoriaSpan.textContent.trim();
        if (!admision || !ingreso || !cotizacion || !referencia || !cantidad || !modalidad) {
            showMessage('Completa todos los campos obligatorios, incluyendo Modalidad.', 'error');
            return;
        }
        try {
            showLoading();
            const implanteData = await loadImplanteByAdmision(admision, user);
            if (!implanteData) {
                showMessage('No se encontraron datos para la admisión ingresada.', 'error');
                return;
            }
            const cargoData = {
                admision,
                fechaIngreso: Timestamp.fromDate(new Date(ingreso)),
                cotizacion,
                referencia,
                cantidad,
                lote,
                vencimiento,
                precio,
                descripcion,
                proveedor,
                codigo,
                totalCotizacion,
                modalidad,
                categoria,
                prevision: implanteData.prevision,
                convenio: implanteData.convenio,
                nombrePaciente: implanteData.nombrePaciente,
                medico: implanteData.medico,
                fechaCx: implanteData.fechaCX || null,
                precioSistema: precio,
                agrupacion: (await fetchReferenciaData(referencia))?.agrupacion || '',
                totalItem: cantidad * precio,
                margen: calculateMargin(precio),
                venta: calculateVenta(precio, cantidad, modalidad, calculateMargin(precio))
            };
            const cargoRef = doc(db, 'cargosimp', editingCargoId);
            await updateDoc(cargoRef, cargoData);
            showMessage('Cargo actualizado correctamente.', 'success');
            resetForm();
            allCargos = await loadCargos(user);
            filterData();
        } catch (error) {
            console.error(error.message);
            showMessage(`Error al actualizar cargo: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    async function deleteCargo(cargoId) {
        try {
            showLoading();
            const batch = writeBatch(db);
            const cargoRef = doc(db, 'cargosimp', cargoId);
            batch.delete(cargoRef);
            const subCargosQuery = query(
                collection(db, 'cargosimp'),
                where('parentCargoId', '==', cargoId)
            );
            const subCargosSnapshot = await getDocs(subCargosQuery);
            subCargosSnapshot.forEach(subCargoDoc => {
                batch.delete(subCargoDoc.ref);
            });
            await batch.commit();
            showMessage('Cargo y sus ítems de paquete eliminados correctamente.', 'success');
            allCargos = await loadCargos(auth.currentUser);
            filterData();
        } catch (error) {
            console.error(error.message);
            showMessage(`Error al eliminar cargo: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    function calculateTotal() {
        const cantidad = parseInt(cantidadInput.value) || 0;
        const precio = parseFloat(precioSpan.textContent.replace(/\./g, '')) || 0;
        if (isNaN(cantidad) || cantidad < 0) {
            showMessage('La cantidad debe ser un número mayor o igual a 0.', 'error');
            totalSpan.textContent = '0';
            return;
        }
        if (isNaN(precio) || precio < 0) {
            showMessage('El precio debe ser un número válido.', 'error');
            totalSpan.textContent = '0';
            return;
        }
        const total = cantidad * precio;
        totalSpan.textContent = formatNumberWithThousands(total);
    }

    async function loadPaquetizationItems(codigo) {
        try {
            showLoading();
            const paquetesQuery = query(
                collection(db, 'paquetes'),
                where('codigo', '==', codigo.trim())
            );
            const querySnapshot = await getDocs(paquetesQuery);
            if (querySnapshot.empty) {
                return [];
            }
            const paqueteData = querySnapshot.docs[0].data();
            return paqueteData.items || [];
        } catch (error) {
            console.error(error.message);
            showMessage(`Error al cargar ítems del paquete: ${error.message}`, 'error');
            return [];
        } finally {
            hideLoading();
        }
    }

    async function loadCargos(user) {
        console.log('Cargando cargos para UID:', user.uid); // Log inicial
        if (!user) {
            return [];
        }
        try {
            showLoading();
            const cargosQuery = query(
                collection(db, 'cargosimp'),
                where('uid', '==', user.uid)
            );
            const cargosSnapshot = await getDocs(cargosQuery);
            let cargos = cargosSnapshot.docs.map(doc => {
                const data = doc.data();
                const totalItem = (data.cantidad || 0) * (data.precioSistema || data.precio || 0);
                const margen = data.margen || calculateMargin(data.precioSistema || data.precio || 0);
                const venta = calculateVenta(
                    data.precio || 0,
                    data.cantidad || 0,
                    data.modalidad || 'Cotización',
                    margen
                );
                return {
                    id: doc.id,
                    ...data,
                    venta: venta,
                    estado: data.estado || 'Pendiente',
                    fechaCargo: data.fechaCargo || null,
                    corpo: data.corpo || '',
                    precioSistema: data.precioSistema || data.precio || 0,
                    agrupacion: data.agrupacion || '',
                    totalItem: totalItem,
                    margen: margen,
                    convenio: data.convenio || '',
                    modalidad: data.modalidad || '',
                    categoria: data.categoria || '',
                    fechaDescarga: data.fechaDescarga || null,
                    parentCargoId: data.parentCargoId || null,
                    isPackage: data.isPackage || false
                };
            });
            // Sort in JS since orderBy was removed
            cargos.sort((a, b) => (b.fechaCargo?.toMillis() || 0) - (a.fechaCargo?.toMillis() || 0));
            const groupedCargos = {};
            cargos.forEach(cargo => {
                const key = `${cargo.admision?.trim() || ''}|${cargo.proveedor?.trim() || ''}`;
                if (!groupedCargos[key]) {
                    groupedCargos[key] = [];
                }
                groupedCargos[key].push(cargo);
            });
            Object.values(groupedCargos).forEach(group => {
                const totalGrupo = group
                    .filter(cargo => !cargo.parentCargoId)
                    .reduce((sum, cargo) => sum + (cargo.totalItem || 0), 0);
                group.forEach(cargo => {
                    cargo.totalGrupo = totalGrupo;
                });
            });
            console.log('Cargos cargados:', cargos.length); // Log final
            return cargos;
        } catch (error) {
            console.error(error.message);
            showMessage(`Error al cargar cargos: ${error.message}`, 'error');
            return [];
        } finally {
            hideLoading();
        }
    }

    function renderStateFilterButtons(cargos) {
        const existingButtons = formGroupButton.querySelectorAll('.estado-filter-btn');
        existingButtons.forEach(btn => btn.remove());
        const estados = [...new Set(cargos.map(cargo => cargo.estado || 'Pendiente'))].sort();
        estados.forEach(estado => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'estado-filter-btn';
            button.dataset.estado = estado;
            button.textContent = estado;
            if (estado === selectedEstado) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                selectedEstado = estado === selectedEstado ? null : estado;
                const buttons = formGroupButton.querySelectorAll('.estado-filter-btn');
                buttons.forEach(btn => btn.classList.remove('active'));
                if (selectedEstado) {
                    button.classList.add('active');
                }
                filterData();
            });
            formGroupButton.appendChild(button);
        });
    }

    async function populateDateFilters(cargos = []) {
        if (!yearSelect || !monthSelect || !daySelect) {
            return;
        }
        yearSelect.innerHTML = '<option value="">Todos los años</option>';
        const currentYear = new Date().getFullYear();
        const years = new Set([currentYear]);
        if (cargos.length > 0) {
            cargos.forEach(cargo => {
                if (cargo.fechaIngreso && cargo.fechaIngreso instanceof Timestamp) {
                    const date = cargo.fechaIngreso.toDate();
                    if (!isNaN(date.getTime())) {
                        years.add(date.getFullYear());
                    }
                }
            });
        }
        const sortedYears = Array.from(years).sort();
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
        yearSelect.value = currentYear.toString();
        monthSelect.innerHTML = '<option value="">Todos los meses</option>';
        daySelect.innerHTML = '<option value="">Todos los días</option>';
        window.updateMonths = async (preserveSelection = true) => {
            const selectedYear = yearSelect.value;
            const currentMonth = preserveSelection ? monthSelect.value : '';
            monthSelect.innerHTML = '<option value="">Todos los meses</option>';
            daySelect.innerHTML = '<option value="">Todos los días</option>';
            selectedDayGlobal = '';
            if (selectedYear && auth.currentUser) {
                const months = await fetchMonthsForYear(auth.currentUser, selectedYear);
                const monthNames = [
                    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                ];
                const uniqueMonths = [...new Set(months)];
                uniqueMonths.forEach(month => {
                    const option = document.createElement('option');
                    option.value = month;
                    option.textContent = monthNames[month - 1];
                    monthSelect.appendChild(option);
                });
                if (preserveSelection && currentMonth && uniqueMonths.includes(parseInt(currentMonth))) {
                    monthSelect.value = currentMonth;
                }
                if (monthSelect.value) {
                    await window.updateDays(false);
                }
            }
        };
        window.updateDays = async (preserveSelection = true) => {
            const selectedYear = yearSelect.value;
            const selectedMonth = monthSelect.value;
            const currentDay = preserveSelection && selectedDayGlobal ? selectedDayGlobal : null;
            daySelect.innerHTML = '<option value="">Todos los días</option>';
            if (selectedYear && selectedMonth && auth.currentUser) {
                const days = await fetchDaysForYearMonth(auth.currentUser, selectedYear, selectedMonth);
                days.forEach(day => {
                    const option = document.createElement('option');
                    option.value = String(day).padStart(2, '0');
                    option.textContent = day;
                    daySelect.appendChild(option);
                });
                if (preserveSelection && currentDay && days.includes(parseInt(currentDay))) {
                    daySelect.value = String(currentDay).padStart(2, '0');
                } else {
                    daySelect.value = '';
                    selectedDayGlobal = '';
                }
            } else {
                daySelect.value = '';
                selectedDayGlobal = '';
            }
        };
        await window.updateMonths();
        const currentMonth = new Date().getMonth() + 1;
        const uniqueMonths = await fetchMonthsForYear(auth.currentUser, yearSelect.value); // Reusa la función existente
        if (uniqueMonths.includes(currentMonth)) {
            monthSelect.value = currentMonth;
            await window.updateDays();
            filterData(); // Llama inmediatamente para mostrar datos del mes actual
        } else {
            // Si no hay datos para el mes actual, muestra mensaje inicial
            tabla1Body.innerHTML = '<tr><td colspan="9" class="text-center">No hay datos para el mes actual. Selecciona otro mes.</td></tr>';
            tabla2Body.innerHTML = '<tr><td colspan="10" class="text-center">No hay datos para el mes actual. Selecciona otro mes.</td></tr>';
            tabla3Body.innerHTML = '<tr><td colspan="15" class="text-center">No hay datos para el mes actual. Selecciona otro mes.</td></tr>';
        }
    }

    function updateDateFilters(cargos) {
        const monthsByYear = {};
        const daysByYearMonth = {};
        cargos.forEach(cargo => {
            if (cargo.fechaIngreso && cargo.fechaIngreso instanceof Timestamp) {
                const date = cargo.fechaIngreso.toDate();
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = date.getMonth() + 1;
                    const day = String(date.getDate()).padStart(2, '0');
                    if (!monthsByYear[year]) {
                        monthsByYear[year] = new Set();
                    }
                    monthsByYear[year].add(month);
                    const yearMonthKey = `${year}-${month}`;
                    if (!daysByYearMonth[yearMonthKey]) {
                        daysByYearMonth[yearMonthKey] = new Set();
                    }
                    daysByYearMonth[yearMonthKey].add(day);
                }
            }
        });
        window.updateMonths(true);
        const selectedYear = yearSelect.value;
        const selectedMonth = monthSelect.value;
        if (selectedYear && selectedMonth && monthsByYear[selectedYear] && monthsByYear[selectedYear].has(parseInt(selectedMonth))) {
            window.updateDays(true);
        } else {
            daySelect.value = '';
            selectedDayGlobal = '';
        }
    }

    function setupEventListeners() {
        yearSelect.removeEventListener('change', filterData);
        monthSelect.removeEventListener('change', filterData);
        daySelect.removeEventListener('change', filterData);
        admisionFilter.removeEventListener('input', filterData);
        pacienteFilter.removeEventListener('input', filterData);
        columnFilter.removeEventListener('change', updateColumnSearchPlaceholder);
        columnSearch.removeEventListener('input', filterData);
        yearSelect.addEventListener('change', async () => {
            selectedDayGlobal = '';
            await window.updateMonths(false);
            filterData();
        });
        monthSelect.addEventListener('change', async () => {
            selectedDayGlobal = '';
            await window.updateDays(false);
            filterData();
        });
        daySelect.addEventListener('change', () => {
            selectedDayGlobal = daySelect.value;
            filterData();
        });
        admisionFilter.addEventListener('input', () => {
            filterData();
        });
        pacienteFilter.addEventListener('input', () => {
            filterData();
        });
        columnFilter.addEventListener('change', updateColumnSearchPlaceholder);
        columnSearch.addEventListener('input', () => {
            filterData();
        });

        confirmarDeleteBtn.addEventListener('click', async () => {
            if (cargoIdToDelete) {
                await deleteCargo(cargoIdToDelete);
                cargoIdToDelete = null;
                deleteModal.classList.remove('active');
            }
        });

        cancelarDeleteBtn.addEventListener('click', () => {
            cargoIdToDelete = null;
            deleteModal.classList.remove('active');
        });
    }

    function updateColumnSearchPlaceholder() {
        const selectedColumn = columnFilter.value;
        columnSearch.value = '';
        if (selectedColumn) {
            columnSearch.placeholder = `Buscar por ${columnFilter.options[columnFilter.selectedIndex].text}...`;
        } else {
            columnSearch.placeholder = 'Buscar en columna seleccionada...';
        }
        filterData();
    }

    function filterData() {
        if (filterTimeout) {
            clearTimeout(filterTimeout);
        }
        filterTimeout = setTimeout(async () => {
            showLoading();
            const selectedYear = yearSelect.value;
            const selectedMonth = monthSelect.value;
            const selectedDay = selectedDayGlobal;
            const admisionSearch = admisionFilter.value.trim().toLowerCase();
            const pacienteSearch = pacienteFilter.value.trim().toLowerCase();
            const columnSearchValue = columnSearch.value.trim().toLowerCase();
            const selectedColumn = columnFilter.value;
            const user = auth.currentUser;
            if (!user) {
                showMessage('Usuario no autenticado.', 'error');
                hideLoading();
                return;
            }
            if (!selectedMonth) {
                tabla1Body.innerHTML = '<tr><td colspan="9" class="text-center">Selecciona un mes para ver los datos.</td></tr>';
                tabla2Body.innerHTML = '<tr><td colspan="10" class="text-center">Selecciona un mes para ver los datos.</td></tr>';
                tabla3Body.innerHTML = '<tr><td colspan="15" class="text-center">Selecciona un mes para ver los datos.</td></tr>';
                updatePagination([]);
                updateActionButtons();
                renderStateFilterButtons([]);
                hideLoading();
                return;
            }
            console.log('Filtrando datos... selectedMonth:', selectedMonth, 'allCargos length:', allCargos.length); // Log para depuración
            if (allCargos.length === 0) {
                allCargos = await loadCargos(user);
            }
            let filteredCargos = allCargos;
            if (selectedYear) {
                filteredCargos = filteredCargos.filter(cargo => {
                    if (!cargo.fechaIngreso || !(cargo.fechaIngreso instanceof Timestamp)) return false;
                    const date = cargo.fechaIngreso.toDate();
                    return date.getFullYear() === parseInt(selectedYear);
                });
            }
            if (selectedMonth) {
                filteredCargos = filteredCargos.filter(cargo => {
                    if (!cargo.fechaIngreso || !(cargo.fechaIngreso instanceof Timestamp)) return false;
                    const date = cargo.fechaIngreso.toDate();
                    return (date.getMonth() + 1) === parseInt(selectedMonth);
                });
            }
            if (selectedDay && selectedDay !== '') {
                filteredCargos = filteredCargos.filter(cargo => {
                    if (!cargo.fechaIngreso || !(cargo.fechaIngreso instanceof Timestamp)) {
                        return false;
                    }
                    const date = cargo.fechaIngreso.toDate();
                    if (isNaN(date.getTime())) {
                        return false;
                    }
                    const dayStr = String(date.getDate()).padStart(2, '0');
                    return dayStr === selectedDay;
                });
            }
            if (selectedEstado) {
                filteredCargos = filteredCargos.filter(cargo => (cargo.estado || 'Pendiente') === selectedEstado);
            }
            if (admisionSearch) {
                filteredCargos = filteredCargos.filter(cargo =>
                    cargo.admision?.toLowerCase().includes(admisionSearch)
                );
            }
            if (pacienteSearch) {
                filteredCargos = filteredCargos.filter(cargo =>
                    cargo.nombrePaciente?.toLowerCase().includes(pacienteSearch)
                );
            }
            if (selectedColumn && columnSearchValue) {
                filteredCargos = filteredCargos.filter(cargo =>
                    cargo[selectedColumn]?.toString().toLowerCase().includes(columnSearchValue)
                );
            }

            // Extract main cargos
            const mainFiltered = filteredCargos.filter(c => !c.parentCargoId);

            // Sort mainFiltered
            mainFiltered.sort((a, b) => {
                const dateA = a.fechaIngreso?.toMillis() || 0;
                const dateB = b.fechaIngreso?.toMillis() || 0;
                if (dateB !== dateA) return dateB - dateA; // desc
                const patientA = a.nombrePaciente?.toLowerCase() || '';
                const patientB = b.nombrePaciente?.toLowerCase() || '';
                if (patientA !== patientB) return patientA.localeCompare(patientB); // asc
                const provA = a.proveedor?.toLowerCase() || '';
                const provB = b.proveedor?.toLowerCase() || '';
                return provA.localeCompare(provB); // asc
            });

            if (mainFiltered.length === 0) {
                tabla1Body.innerHTML = '<tr><td colspan="9" class="text-center">No hay datos para los filtros seleccionados.</td></tr>';
                tabla2Body.innerHTML = '<tr><td colspan="10" class="text-center">No hay datos para los filtros seleccionados.</td></tr>';
                tabla3Body.innerHTML = '<tr><td colspan="15" class="text-center">No hay datos para los filtros seleccionados.</td></tr>';
            }
            updateDateFilters(filteredCargos);
            // Paginate mainFiltered
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const paginatedMains = mainFiltered.slice(start, end);
            renderTabla1(paginatedMains);
            renderTabla2(paginatedMains);
            renderTabla3(paginatedMains);
            updatePagination(mainFiltered);
            updateActionButtons();
            setupRowHoverSync();
            renderStateFilterButtons(filteredCargos);
            hideLoading();
        }, 100);
    }

    function updateActionButtons() {
        const checkboxes = tabla1Body.querySelectorAll('.row-checkbox:checked');
        let cambiarEstadoBtn = document.getElementById('cambiar-estado-btn');
        let ingresarLotesBtn = document.getElementById('ingresar-lotes-btn');
        let solicitudOcBtn = document.getElementById('solicitud-oc-btn');
        if (cambiarEstadoBtn) cambiarEstadoBtn.remove();
        if (ingresarLotesBtn) ingresarLotesBtn.remove();
        if (solicitudOcBtn) solicitudOcBtn.remove();
        if (checkboxes.length > 0) {
            cambiarEstadoBtn = document.createElement('button');
            cambiarEstadoBtn.type = 'button';
            cambiarEstadoBtn.id = 'cambiar-estado-btn';
            cambiarEstadoBtn.className = 'success-btn';
            cambiarEstadoBtn.textContent = 'Cambiar Estado';
            formGroupButton.appendChild(cambiarEstadoBtn);
            ingresarLotesBtn = document.createElement('button');
            ingresarLotesBtn.type = 'button';
            ingresarLotesBtn.id = 'ingresar-lotes-btn';
            ingresarLotesBtn.className = 'success-btn';
            ingresarLotesBtn.textContent = 'Ingresar Lotes';
            formGroupButton.appendChild(ingresarLotesBtn);
            solicitudOcBtn = document.createElement('button');
            solicitudOcBtn.type = 'button';
            solicitudOcBtn.id = 'solicitud-oc-btn';
            solicitudOcBtn.className = 'success-btn';
            solicitudOcBtn.textContent = 'Solicitud OC';
            formGroupButton.appendChild(solicitudOcBtn);
            cambiarEstadoBtn.addEventListener('click', () => {
                const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.cargoId);
                showEstadoModal(selectedIds);
            });
            ingresarLotesBtn.addEventListener('click', () => {
                const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.cargoId);
                showLotesModal(selectedIds);
            });
            solicitudOcBtn.addEventListener('click', () => {
                const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.cargoId);
                showOcModal(selectedIds);
            });
        }
    }

    function showEstadoModal(cargoIds) {
        estadoModal.classList.add('active');
        confirmarEstadoBtn.onclick = async () => {
            const newEstado = estadoSelect.value;
            if (!newEstado) {
                showMessage('Selecciona un estado válido.', 'error');
                return;
            }
            try {
                showLoading();
                const batch = writeBatch(db);
                cargoIds.forEach(cargoId => {
                    const cargoRef = doc(db, 'cargosimp', cargoId);
                    const updateData = {
                        estado: newEstado,
                        fechaCarga: newEstado === 'CARGADO' ? serverTimestamp() : null
                    };
                    batch.update(cargoRef, updateData);
                });
                await batch.commit();
                showMessage(`Estado actualizado a ${newEstado} para ${cargoIds.length} cargos.`, 'success');
                estadoModal.classList.remove('active');
                allCargos = await loadCargos(auth.currentUser);
                filterData();
            } catch (error) {
                console.error(error.message);
                showMessage(`Error al actualizar estado: ${error.message}`, 'error');
            } finally {
                hideLoading();
            }
        };
        cancelarEstadoBtn.onclick = () => {
            estadoModal.classList.remove('active');
        };
    }

    function showLotesModal(cargoIds) {
        modalLoteInput.value = '';
        modalVencimientoInput.value = '';
        lotesModal.classList.add('active');
        confirmarLotesBtn.onclick = async () => {
            const lote = modalLoteInput.value.trim();
            const vencimiento = modalVencimientoInput.value.trim();
            if (!lote || !vencimiento) {
                showMessage('Lote y fecha de vencimiento son obligatorios.', 'error');
                return;
            }
            try {
                showLoading();
                const batch = writeBatch(db);
                cargoIds.forEach(cargoId => {
                    const cargo = allCargos.find(c => c.id === cargoId);
                    if (cargo && !checkPaquetizationCode(cargo.codigo)) {
                        const cargoRef = doc(db, 'cargosimp', cargoId);
                        batch.update(cargoRef, { lote, vencimiento });
                    }
                });
                await batch.commit();
                showMessage(`Lote y vencimiento actualizados para ${cargoIds.length} cargos.`, 'success');
                lotesModal.classList.remove('active');
                allCargos = await loadCargos(auth.currentUser);
                filterData();
            } catch (error) {
                console.error(error.message);
                showMessage(`Error al actualizar lotes: ${error.message}`, 'error');
            } finally {
                hideLoading();
            }
        };
        cancelarLotesBtn.onclick = () => {
            lotesModal.classList.remove('active');
        };
    }

    function showOcModal(cargoIds) {
        if (!ocModal || !ocTable) {
            showMessage('Modal o tabla no encontrados en el DOM.', 'error');
            return;
        }
        const selectedCargos = allCargos.filter(cargo => cargoIds.includes(cargo.id) && !cargo.parentCargoId);
        let rows = [];
        selectedCargos.forEach(cargo => {
            rows.push({
                id: cargo.id,
                admision: cargo.admision || '',
                nombrePaciente: cargo.nombrePaciente || '',
                medico: cargo.medico || '',
                fechaCx: formatDateForDisplay(cargo.fechaCx),
                proveedor: cargo.proveedor || '',
                codigo: cargo.codigo || '',
                descripcion: cargo.descripcion || '',
                cantidad: cargo.cantidad || 0,
                precioSistema: formatNumberWithThousands(cargo.precioSistema),
                modalidad: cargo.modalidad || '',
                oc: '',
                ocMonto: '',
                estado: '',
                fechaIngreso: formatDateForDisplay(cargo.fechaIngreso),
                fechaCargo: formatDateForDisplay(cargo.fechaCargo),
                cotizacion: cargo.cotizacion || '',
                factura: '',
                fechaFactura: '',
                fechaEmision: getTodayDateForDisplay(),
                lote: cargo.lote || '',
                vencimiento: cargo.vencimiento || '',
                corpo: cargo.corpo || '',
                fechaDescarga: formatDateForDisplay(cargo.fechaDescarga)
            });

            const subCargos = allCargos.filter(subCargo => subCargo.parentCargoId === cargo.id);
            subCargos.forEach(subCargo => {
                rows.push({
                    id: subCargo.id,
                    admision: cargo.admision || '',
                    nombrePaciente: cargo.nombrePaciente || '',
                    medico: cargo.medico || '',
                    fechaCx: formatDateForDisplay(cargo.fechaCx),
                    proveedor: cargo.proveedor || '',
                    codigo: 'No lleva OC',
                    descripcion: subCargo.descripcion || '',
                    cantidad: subCargo.cantidad || 0,
                    precioSistema: '',
                    modalidad: cargo.modalidad || '',
                    oc: '',
                    ocMonto: '',
                    estado: '',
                    fechaIngreso: formatDateForDisplay(cargo.fechaIngreso),
                    fechaCargo: formatDateForDisplay(cargo.fechaCargo),
                    cotizacion: cargo.cotizacion || '',
                    factura: '',
                    fechaFactura: '',
                    fechaEmision: getTodayDateForDisplay(),
                    lote: subCargo.lote || '',
                    vencimiento: subCargo.vencimiento || '',
                    corpo: cargo.corpo || '',
                    fechaDescarga: formatDateForDisplay(cargo.fechaDescarga)
                });
            });
        });

        ocTable.innerHTML = `
        <thead>
            <tr>
                <th class="admision">Admisión</th>
                <th class="paciente">Paciente</th>
                <th class="medico">Médico</th>
                <th class="fecha-cx">Fecha Cx</th>
                <th class="proveedor">Proveedor</th>
                <th class="codigo">Código</th>
                <th class="descripcion">Descripción</th>
                <th class="cantidad">Cantidad</th>
                <th class="precio-sistema">Precio</th>
                <th class="modalidad">Modalidad</th>
                <th class="oc">OC</th>
                <th class="oc-monto">OC Monto</th>
                <th class="estado">Estado</th>
                <th class="fecha-ingreso">Fecha Ingreso</th>
                <th class="fecha-cargo">Fecha Cargo</th>
                <th class="cotizacion">Cotización</th>
                <th class="factura">Factura</th>
                <th class="fecha-factura">Fecha Factura</th>
                <th class="fecha-emision">Fecha Emisión</th>
                <th class="lote">Lote</th>
                <th class="fecha-vencimiento">Fecha Vencimiento</th>
                <th class="corpo">Corpo</th>
                <th class="fecha-descarga">Fecha Descarga</th>
            </tr>
        </thead>
        <tbody>
            ${rows.length === 0 ? '<tr><td colspan="23" class="text-center">No hay cargos seleccionados.</td></tr>' :
                rows.map(row => `
                <tr data-cargo-id="${row.id}">
                    <td class="admision">${row.admision}</td>
                    <td class="paciente">${row.nombrePaciente}</td>
                    <td class="medico">${row.medico}</td>
                    <td class="fecha-cx">${row.fechaCx}</td>
                    <td class="proveedor">${row.proveedor}</td>
                    <td class="codigo">${row.codigo}</td>
                    <td class="descripcion">${row.descripcion}</td>
                    <td class="cantidad">${row.cantidad}</td>
                    <td class="precio-sistema">${row.precioSistema}</td>
                    <td class="modalidad">${row.modalidad}</td>
                    <td class="oc">${row.oc}</td>
                    <td class="oc-monto">${row.ocMonto}</td>
                    <td class="estado">${row.estado}</td>
                    <td class="fecha-ingreso">${row.fechaIngreso}</td>
                    <td class="fecha-cargo">${row.fechaCargo}</td>
                    <td class="cotizacion">${row.cotizacion}</td>
                    <td class="factura">${row.factura}</td>
                    <td class="fecha-factura">${row.fechaFactura}</td>
                    <td class="fecha-emision">${row.fechaEmision}</td>
                    <td class="lote">${row.lote}</td>
                    <td class="fecha-vencimiento">${row.vencimiento}</td>
                    <td class="corpo">${row.corpo}</td>
                    <td class="fecha-descarga">${row.fechaDescarga}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
        ocModal.classList.add('active');
        cancelarOcBtn.onclick = () => {
            ocModal.classList.remove('active');
        };
        downloadExcelBtn.onclick = () => {
            downloadExcel(rows, cargoIds);
        };
    }

    async function downloadExcel(rows, cargoIds) {
        try {
            showLoading();
            const batch = writeBatch(db);
            cargoIds.forEach(cargoId => {
                const cargoRef = doc(db, 'cargosimp', cargoId);
                batch.update(cargoRef, {
                    corpo: 'Gestionado',
                    fechaDescarga: serverTimestamp()
                });
            });
            await batch.commit();
            showMessage(`Corpo actualizado a 'Gestionado' y fecha de descarga establecida para ${cargoIds.length} cargos.`, 'success');
            allCargos = allCargos.map(cargo => {
                if (cargoIds.includes(cargo.id)) {
                    return {
                        ...cargo,
                        corpo: 'Gestionado',
                        fechaDescarga: Timestamp.fromDate(new Date())
                    };
                }
                return cargo;
            });
            const data = rows.map(row => ({
                Admisión: row.admision,
                Paciente: row.nombrePaciente,
                Médico: row.medico,
                'Fecha Cx': row.fechaCx,
                Proveedor: row.proveedor,
                Código: row.codigo,
                Descripción: row.descripcion,
                Cantidad: row.cantidad,
                'Precio Sistema': row.precioSistema,
                Modalidad: row.modalidad,
                OC: row.oc,
                'OC Monto': row.ocMonto,
                Estado: row.estado,
                'Fecha Ingreso': row.fechaIngreso,
                'Fecha Cargo': row.fechaCargo,
                Cotización: row.cotizacion,
                Factura: row.factura,
                'Fecha Factura': row.fechaFactura,
                'Fecha Emisión': row.fechaEmision,
                Lote: row.lote,
                'Fecha Vencimiento': row.vencimiento,
                Corpo: cargoIds.includes(row.id) ? 'Gestionado' : row.corpo,
                'Fecha Descarga': cargoIds.includes(row.id) ? getTodayDateForDisplay() : row.fechaDescarga
            }));
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitud OC');
            XLSX.writeFile(workbook, `Solicitud_OC_${getTodayDateForDisplay().replace(/\//g, '-')}.xlsx`);
            filterData();
        } catch (error) {
            console.error(error.message);
            showMessage(`Error al generar Excel o actualizar Firestore: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    function renderTabla1(cargos) {
        tabla1Body.innerHTML = '';
        // cargos here is paginatedMains
        console.log('Renderizando Tabla1: paginatedCargos length:', cargos.length);

        if (cargos.length === 0) {
            tabla1Body.innerHTML = '<tr><td colspan="9" class="text-center">No hay datos disponibles.</td></tr>';
            return;
        }

        cargos.forEach((cargo) => {
            const isPaquetizationCode = cargo.isPackage && checkPaquetizationCode(cargo.codigo || '');
            const paquetizationIcon = isPaquetizationCode ? `<i class="fas fa-arrow-down action-icon toggle-subrows" data-cargo-id="${cargo.id}" title="Mostrar ítems de paquete"></i>` : '';
            const row = document.createElement('tr');
            row.dataset.cargoId = cargo.id;
            row.innerHTML = `
            <td class="seleccion"><input type="checkbox" class="row-checkbox" data-cargo-id="${cargo.id}"></td>
            <td class="fecha-ingreso">${formatDateForDisplay(cargo.fechaIngreso)}</td>
            <td class="admision">${cargo.admision || ''}</td>
            <td class="codigo">${cargo.codigo || ''}</td>
            <td class="cantidad">${cargo.cantidad || 0}</td>
            <td class="venta">${formatNumberWithThousands(cargo.venta)}</td>
            <td class="estado">${cargo.estado || 'Pendiente'}</td>
            <td class="fecha-carga">${formatDateForDisplay(cargo.fechaCargo)}</td>
            <td class="acciones">
                <i class="fas fa-edit action-icon edit-icon" data-cargo-id="${cargo.id}"></i>
                <i class="fas fa-trash action-icon delete-icon" data-cargo-id="${cargo.id}"></i>
                ${paquetizationIcon}
            </td>
        `;
            tabla1Body.appendChild(row);
        });

        tabla1Body.querySelectorAll('.row-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const cargoId = checkbox.dataset.cargoId;
                const isChecked = checkbox.checked;
                const subRows = tabla1Body.querySelectorAll(`tr.sub-row[data-parent-cargo-id="${cargoId}"] .row-checkbox`);
                subRows.forEach(subCheckbox => {
                    subCheckbox.checked = isChecked;
                });
                updateActionButtons();
            });
        });

        tabla1Body.querySelectorAll('.edit-icon').forEach(icon => {
            icon.addEventListener('click', async () => {
                const cargoId = icon.dataset.cargoId;
                editingCargoId = cargoId;
                const cargo = allCargos.find(c => c.id === cargoId);
                if (cargo) {
                    admisionInput.value = cargo.admision || '';
                    ingresoInput.value = formatDateForInput(cargo.fechaIngreso);
                    cotizacionInput.value = cargo.cotizacion || '';
                    referenciaInput.value = cargo.referencia || '';
                    cantidadInput.value = cargo.cantidad || '';
                    loteInput.value = cargo.lote || '';
                    vencimientoInput.value = cargo.vencimiento || '';
                    precioSpan.textContent = formatNumberWithThousands(cargo.precio);
                    descripcionSpan.textContent = cargo.descripcion || '';
                    proveedorSpan.textContent = cargo.proveedor || '';
                    codigoSpan.textContent = cargo.codigo || '';
                    totalSpan.textContent = formatNumberWithThousands(cargo.totalItem);
                    modalidadSpan.textContent = cargo.modalidad || '';
                    categoriaSpan.textContent = cargo.categoria || '';
                    const implanteData = await loadImplanteByAdmision(cargo.admision, auth.currentUser);
                    if (implanteData) {
                        previsionSpan.textContent = implanteData.prevision;
                        convenioSpan.textContent = implanteData.convenio;
                        pacienteSpan.textContent = implanteData.nombrePaciente;
                        medicoSpan.textContent = implanteData.medico;
                        fechaCxSpan.textContent = formatDateForDisplay(implanteData.fechaCX);
                    }
                    const totalCotizacion = await fetchTotalCotizacionByAdmisionAndProveedor(cargo.admision, cargo.proveedor, auth.currentUser);
                    totalCotizacionSpan.textContent = totalCotizacion !== null ? formatNumberWithThousands(totalCotizacion) : '';
                    toggleFormButtons(true);
                    await updateFormFieldsForPaquetization();
                }
            });
        });

        tabla1Body.querySelectorAll('.delete-icon').forEach(icon => {
            icon.addEventListener('click', () => {
                cargoIdToDelete = icon.dataset.cargoId;
                deleteModal.classList.add('active');
            });
        });

        tabla1Body.querySelectorAll('.toggle-subrows').forEach(icon => {
            icon.addEventListener('click', async () => {
                const cargoId = icon.dataset.cargoId;
                const parentRow1 = tabla1Body.querySelector(`tr[data-cargo-id="${cargoId}"]`);
                const parentRow2 = tabla2Body.querySelector(`tr[data-cargo-id="${cargoId}"]`);
                const parentRow3 = tabla3Body.querySelector(`tr[data-cargo-id="${cargoId}"]`);
                const existingSubRows1 = tabla1Body.querySelectorAll(`tr.sub-row[data-parent-cargo-id="${cargoId}"]`);
                const isVisible = existingSubRows1.length > 0 && existingSubRows1[0].style.display !== 'none';

                if (isVisible) {
                    [tabla1Body, tabla2Body, tabla3Body].forEach(body => {
                        const subRows = body.querySelectorAll(`tr.sub-row[data-parent-cargo-id="${cargoId}"]`);
                        subRows.forEach(row => row.remove());
                    });
                    icon.className = 'fas fa-arrow-down action-icon toggle-subrows';
                    icon.title = 'Mostrar ítems de paquete';
                } else {
                    const subCargos = allCargos.filter(subCargo => subCargo.parentCargoId === cargoId);
                    if (subCargos.length === 0) {
                        const cargo = allCargos.find(c => c.id === cargoId);
                        if (cargo && cargo.codigo) {
                            const paqueteItems = await loadPaquetizationItems(cargo.codigo);
                            if (paqueteItems.length === 0) {
                                showMessage('No se encontraron ítems para este paquete.', 'info');
                                return;
                            }
                        }
                    }

                    subCargos.forEach(subCargo => {
                        const subRow = document.createElement('tr');
                        subRow.dataset.cargoId = subCargo.id;
                        subRow.dataset.parentCargoId = cargoId;
                        subRow.classList.add('sub-row');
                        subRow.innerHTML = `
                        <td class="seleccion"><input type="checkbox" class="row-checkbox" data-cargo-id="${subCargo.id}"></td>
                        <td class="fecha-ingreso">${formatDateForDisplay(subCargo.fechaIngreso)}</td>
                        <td class="admision">${subCargo.admision || ''}</td>
                        <td class="codigo">No lleva OC</td>
                        <td class="cantidad">${subCargo.cantidad || 0}</td>
                        <td class="venta"></td>
                        <td class="estado">Estado PAD</td>
                        <td class="fecha-carga">${formatDateForDisplay(subCargo.fechaCargo)}</td>
                        <td class="acciones">
                            <i class="fas fa-edit action-icon edit-icon" data-cargo-id="${subCargo.id}"></i>
                            <i class="fas fa-trash action-icon delete-icon" data-cargo-id="${subCargo.id}"></i>
                        </td>
                    `;
                        parentRow1.insertAdjacentElement('afterend', subRow);
                    });

                    subCargos.forEach(subCargo => {
                        const subRow = document.createElement('tr');
                        subRow.dataset.cargoId = subCargo.id;
                        subRow.dataset.parentCargoId = cargoId;
                        subRow.classList.add('sub-row');
                        const isValid = subCargo.totalCotizacion === subCargo.totalGrupo;
                        const validacionContent = isValid
                            ? '<span class="validacion-tick">✔</span>'
                            : '<span class="validacion-x">✖</span>';
                        subRow.innerHTML = `
                        <td class="descripcion">${subCargo.descripcion || ''}</td>
                        <td class="validacion">${validacionContent}</td>
                        <td class="cotizacion">${subCargo.cotizacion || ''}</td>
                        <td class="referencia">${subCargo.referencia || ''}</td>
                        <td class="precio"></td>
                        <td class="lote">${subCargo.lote || ''}</td>
                        <td class="fecha-vencimiento">${subCargo.vencimiento || ''}</td>
                        <td class="corpo">${subCargo.corpo || ''}</td>
                        <td class="total-cotizacion">${formatNumberWithThousands(subCargo.totalCotizacion)}</td>
                        <td class="total-grupo">${formatNumberWithThousands(subCargo.totalGrupo)}</td>
                    `;
                        if (parentRow2) {
                            parentRow2.insertAdjacentElement('afterend', subRow);
                        } else {
                            tabla2Body.appendChild(subRow);
                        }
                    });

                    subCargos.forEach(subCargo => {
                        const subRow = document.createElement('tr');
                        subRow.dataset.cargoId = subCargo.id;
                        subRow.dataset.parentCargoId = cargoId;
                        subRow.classList.add('sub-row');
                        subRow.innerHTML = `
                        <td class="convenio">${subCargo.convenio || ''}</td>
                        <td class="prevision">${subCargo.prevision || ''}</td>
                        <td class="admision">${subCargo.admision || ''}</td>
                        <td class="paciente">${subCargo.nombrePaciente || ''}</td>
                        <td class="medico">${subCargo.medico || ''}</td>
                        <td class="fecha-cx">${formatDateForDisplay(subCargo.fechaCx)}</td>
                        <td class="proveedor">${subCargo.proveedor || ''}</td>
                        <td class="codigo">No lleva OC</td>
                        <td class="descripcion">${subCargo.descripcion || ''}</td>
                        <td class="cantidad">${subCargo.cantidad || 0}</td>
                        <td class="precio-sistema"></td>
                        <td class="modalidad">${subCargo.modalidad || ''}</td>
                        <td class="categoria">${subCargo.categoria || ''}</td>
                        <td class="total-item"></td>
                        <td class="margen"></td>
                    `;
                        if (parentRow3) {
                            parentRow3.insertAdjacentElement('afterend', subRow);
                        } else {
                            tabla3Body.appendChild(subRow);
                        }
                    });

                    tabla1Body.querySelectorAll('.sub-row .row-checkbox').forEach(checkbox => {
                        checkbox.addEventListener('change', updateActionButtons);
                    });

                    tabla1Body.querySelectorAll('.sub-row .edit-icon').forEach(icon => {
                        icon.addEventListener('click', async () => {
                            const cargoId = icon.dataset.cargoId;
                            editingCargoId = cargoId;
                            const cargo = allCargos.find(c => c.id === cargoId);
                            if (cargo) {
                                admisionInput.value = cargo.admision || '';
                                ingresoInput.value = formatDateForInput(cargo.fechaIngreso);
                                cotizacionInput.value = cargo.cotizacion || '';
                                referenciaInput.value = cargo.referencia || '';
                                cantidadInput.value = cargo.cantidad || '';
                                loteInput.value = cargo.lote || '';
                                vencimientoInput.value = cargo.vencimiento || '';
                                precioSpan.textContent = formatNumberWithThousands(cargo.precio);
                                descripcionSpan.textContent = cargo.descripcion || '';
                                proveedorSpan.textContent = cargo.proveedor || '';
                                codigoSpan.textContent = cargo.codigo || '';
                                totalSpan.textContent = formatNumberWithThousands(cargo.totalItem);
                                modalidadSpan.textContent = cargo.modalidad || '';
                                categoriaSpan.textContent = cargo.categoria || '';
                                const implanteData = await loadImplanteByAdmision(cargo.admision, auth.currentUser);
                                if (implanteData) {
                                    previsionSpan.textContent = implanteData.prevision;
                                    convenioSpan.textContent = implanteData.convenio;
                                    pacienteSpan.textContent = implanteData.nombrePaciente;
                                    medicoSpan.textContent = implanteData.medico;
                                    fechaCxSpan.textContent = formatDateForDisplay(implanteData.fechaCX);
                                }
                                const totalCotizacion = await fetchTotalCotizacionByAdmisionAndProveedor(cargo.admision, cargo.proveedor, auth.currentUser);
                                totalCotizacionSpan.textContent = totalCotizacion !== null ? formatNumberWithThousands(totalCotizacion) : '';
                                toggleFormButtons(true);
                                await updateFormFieldsForPaquetization();
                            }
                        });
                    });

                    tabla1Body.querySelectorAll('.sub-row .delete-icon').forEach(icon => {
                        icon.addEventListener('click', () => {
                            cargoIdToDelete = icon.dataset.cargoId;
                            deleteModal.classList.add('active');
                        });
                    });

                    tabla2Body.querySelectorAll('.sub-row td.lote, .sub-row td.fecha-vencimiento').forEach(cell => {
                        cell.addEventListener('dblclick', () => {
                            const cargoId = cell.parentElement.dataset.cargoId;
                            showLotesModal([cargoId]);
                        });
                    });

                    icon.className = 'fas fa-arrow-up action-icon toggle-subrows';
                    icon.title = 'Ocultar ítems de paquete';

                    setupRowHoverSync();
                }
            });
        });

        tabla1Body.querySelectorAll('td.estado').forEach(cell => {
            cell.addEventListener('dblclick', () => {
                const cargoId = cell.parentElement.dataset.cargoId;
                showEstadoModal([cargoId]);
            });
        });
    }

    function renderTabla2(cargos) {
        tabla2Body.innerHTML = '';
        if (cargos.length === 0) {
            tabla2Body.innerHTML = '<tr><td colspan="10" class="text-center">No hay datos disponibles.</td></tr>';
            return;
        }
        cargos.forEach(cargo => {
            const row = document.createElement('tr');
            row.dataset.cargoId = cargo.id;
            const isValid = cargo.totalCotizacion === cargo.totalGrupo;
            const validacionContent = isValid
                ? '<span class="validacion-tick">✔</span>'
                : '<span class="validacion-x">✖</span>';
            row.innerHTML = `
            <td class="descripcion">${cargo.descripcion || ''}</td>
            <td class="validacion">${validacionContent}</td>
            <td class="cotizacion">${cargo.cotizacion || ''}</td>
            <td class="referencia">${cargo.referencia || ''}</td>
            <td class="precio">${formatNumberWithThousands(cargo.precio)}</td>
            <td class="lote">${cargo.lote || ''}</td>
            <td class="fecha-vencimiento">${cargo.vencimiento || ''}</td>
            <td class="corpo">${cargo.corpo || ''}</td>
            <td class="total-cotizacion">${formatNumberWithThousands(cargo.totalCotizacion)}</td>
            <td class="total-grupo">${formatNumberWithThousands(cargo.totalGrupo)}</td>
        `;
            tabla2Body.appendChild(row);
        });
        tabla2Body.querySelectorAll('td.lote, td.fecha-vencimiento').forEach(cell => {
            cell.addEventListener('dblclick', () => {
                const cargoId = cell.parentElement.dataset.cargoId;
                showLotesModal([cargoId]);
            });
        });
    }

    function renderTabla3(cargos) {
        tabla3Body.innerHTML = '';
        if (cargos.length === 0) {
            tabla3Body.innerHTML = '<tr><td colspan="17" class="text-center">No hay datos disponibles.</td></tr>';
            return;
        }
        cargos.forEach(cargo => {
            const row = document.createElement('tr');
            row.dataset.cargoId = cargo.id;
            row.innerHTML = `
            <td class="convenio">${cargo.convenio || ''}</td>
            <td class="prevision">${cargo.prevision || ''}</td>
            <td class="admision">${cargo.admision || ''}</td>
            <td class="paciente">${cargo.nombrePaciente || ''}</td>
            <td class="medico">${cargo.medico || ''}</td>
            <td class="fecha-cx">${formatDateForDisplay(cargo.fechaCx)}</td>
            <td class="proveedor">${cargo.proveedor || ''}</td>
            <td class="codigo">${cargo.codigo || ''}</td>
            <td class="descripcion">${cargo.descripcion || ''}</td>
            <td class="cantidad">${cargo.cantidad || 0}</td>
            <td class="precio-sistema">${formatNumberWithThousands(cargo.precioSistema)}</td>
            <td class="modalidad">${cargo.modalidad || ''}</td>
            <td class="categoria">${cargo.categoria || ''}</td>
            <td class="total-item">${formatNumberWithThousands(cargo.totalItem)}</td>
            <td class="margen">${cargo.margen || 0}%</td>
        `;
            tabla3Body.appendChild(row);
        });
        tabla3Body.querySelectorAll('td.lote, td.fecha-vencimiento').forEach(cell => {
            cell.addEventListener('dblclick', () => {
                const cargoId = cell.parentElement.dataset.cargoId;
                showLotesModal([cargoId]);
            });
        });
    }

    const subRowStyle = `
    .sub-row {
        background-color: #f9f9f9;
        padding-left: 20px;
    }
`;

    function updatePagination(mains) {
        const totalPages = Math.ceil(mains.length / itemsPerPage);
        pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    function setupRowHoverSync() {
        const tables = [tabla1Body, tabla2Body, tabla3Body];
        tables.forEach(table => {
            table.addEventListener('mouseenter', (event) => {
                const row = event.target.closest('tr');
                if (!row) return;
                const cargoId = row.dataset.cargoId;
                const parentCargoId = row.dataset.parentCargoId;
                const isSubRow = row.classList.contains('sub-row');

                tables.forEach(t => {
                    if (isSubRow && parentCargoId) {
                        const matchingSubRows = t.querySelectorAll(
                            `tr.sub-row[data-cargo-id="${cargoId}"][data-parent-cargo-id="${parentCargoId}"]`
                        );
                        matchingSubRows.forEach(subRow => {
                            subRow.classList.add('row-hover');
                        });
                    } else if (cargoId && !isSubRow) {
                        const matchingRow = t.querySelector(`tr[data-cargo-id="${cargoId}"]:not(.sub-row)`);
                        if (matchingRow) {
                            matchingRow.classList.add('row-hover');
                        }
                    }
                });
            }, true);

            table.addEventListener('mouseleave', (event) => {
                const row = event.target.closest('tr');
                if (!row) return;
                const cargoId = row.dataset.cargoId;
                const parentCargoId = row.dataset.parentCargoId;
                const isSubRow = row.classList.contains('sub-row');

                tables.forEach(t => {
                    if (isSubRow && parentCargoId) {
                        const matchingSubRows = t.querySelectorAll(
                            `tr.sub-row[data-cargo-id="${cargoId}"][data-parent-cargo-id="${parentCargoId}"]`
                        );
                        matchingSubRows.forEach(subRow => {
                            subRow.classList.remove('row-hover');
                        });
                    } else if (cargoId && !isSubRow) {
                        const matchingRow = t.querySelector(`tr[data-cargo-id="${cargoId}"]:not(.sub-row)`);
                        if (matchingRow) {
                            matchingRow.classList.remove('row-hover');
                        }
                    }
                });
            }, true);
        });
    }

    admisionInput.addEventListener('change', async () => {
        const admision = admisionInput.value.trim();
        if (admision) {
            const user = auth.currentUser;
            if (user) {
                const implanteData = await loadImplanteByAdmision(admision, user);
                if (implanteData) {
                    previsionSpan.textContent = implanteData.prevision;
                    convenioSpan.textContent = implanteData.convenio;
                    pacienteSpan.textContent = implanteData.nombrePaciente;
                    medicoSpan.textContent = implanteData.medico;
                    fechaCxSpan.textContent = formatDateForDisplay(implanteData.fechaCX);
                } else {
                    clearRelatedFields();
                    showMessage('No se encontraron datos para la admisión ingresada.', 'error');
                }
            }
        } else {
            clearRelatedFields();
        }
    });

    referenciaInput.addEventListener('change', async () => {
        const referencia = referenciaInput.value.trim();
        const admision = admisionInput.value.trim();
        if (referencia) {
            const refData = await fetchReferenciaData(referencia);
            if (refData) {
                precioSpan.textContent = formatNumberWithThousands(refData.precio);
                descripcionSpan.textContent = refData.descripcion;
                proveedorSpan.textContent = refData.proveedor;
                codigoSpan.textContent = refData.codigo;
                modalidadSpan.textContent = refData.modalidad || 'Cotización';
                categoriaSpan.textContent = refData.categoria;
                if (admision && refData.proveedor) {
                    const totalCotizacion = await fetchTotalCotizacionByAdmisionAndProveedor(admision, refData.proveedor, auth.currentUser);
                    totalCotizacionSpan.textContent = totalCotizacion !== null ? formatNumberWithThousands(totalCotizacion) : '';
                    if (totalCotizacion === null) {
                        showMessage('No se encontró Total Cotización para la combinación de admisión y proveedor.', 'error');
                    }
                } else {
                    totalCotizacionSpan.textContent = '';
                }
                calculateTotal();
                await updateFormFieldsForPaquetization();
            } else {
                precioSpan.textContent = '';
                descripcionSpan.textContent = '';
                proveedorSpan.textContent = '';
                codigoSpan.textContent = '';
                totalSpan.textContent = '0';
                totalCotizacionSpan.textContent = '';
                modalidadSpan.textContent = '';
                categoriaSpan.textContent = '';
                await updateFormFieldsForPaquetization();
                showMessage('Referencia no encontrada.', 'error');
            }
        } else {
            precioSpan.textContent = '';
            descripcionSpan.textContent = '';
            proveedorSpan.textContent = '';
            codigoSpan.textContent = '';
            totalSpan.textContent = '0';
            totalCotizacionSpan.textContent = '';
            modalidadSpan.textContent = '';
            categoriaSpan.textContent = '';
            await updateFormFieldsForPaquetization();
        }
    });

    cantidadInput.addEventListener('input', calculateTotal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (editingCargoId) {
            return;
        }
        const user = auth.currentUser;
        if (!user) {
            showMessage('Debes iniciar sesión para registrar un cargo.', 'error');
            return;
        }
        const admision = admisionInput.value.trim();
        const ingreso = ingresoInput.value;
        const cotizacion = cotizacionInput.value.trim();
        const referencia = referenciaInput.value.trim();
        const cantidad = parseInt(cantidadInput.value) || 0;
        const lote = loteInput.value.trim();
        const vencimiento = vencimientoInput.value.trim();
        const precio = parseFloat(precioSpan.textContent.replace(/\./g, '')) || 0;
        const descripcion = descripcionSpan.textContent.trim();
        const proveedor = proveedorSpan.textContent.trim();
        const codigo = codigoSpan.textContent.trim();
        const totalCotizacion = parseFloat(totalCotizacionSpan.textContent.replace(/\./g, '')) || 0;
        const modalidad = modalidadSpan.textContent.trim();
        const categoria = categoriaSpan.textContent.trim();
        if (!admision || !ingreso || !cotizacion || !referencia || !cantidad || !modalidad) {
            showMessage('Completa todos los campos obligatorios, incluyendo Modalidad.', 'error');
            return;
        }
        try {
            showLoading();
            const implanteData = await loadImplanteByAdmision(admision, user);
            if (!implanteData) {
                showMessage('No se encontraron datos para la admisión ingresada.', 'error');
                return;
            }
            const batch = writeBatch(db);
            const refData = await fetchReferenciaData(referencia);
            const isPaquetizationCode = checkPaquetizationCode(codigo);
            const cargoData = {
                uid: user.uid,
                admision,
                fechaIngreso: Timestamp.fromDate(new Date(ingreso)),
                cotizacion,
                referencia,
                cantidad,
                lote,
                vencimiento,
                precio,
                descripcion,
                proveedor,
                codigo,
                totalCotizacion,
                modalidad,
                categoria,
                prevision: implanteData.prevision,
                convenio: implanteData.convenio,
                nombrePaciente: implanteData.nombrePaciente,
                medico: implanteData.medico,
                fechaCx: implanteData.fechaCX || null,
                precioSistema: precio,
                agrupacion: refData?.agrupacion || '',
                totalItem: cantidad * precio,
                margen: calculateMargin(precio),
                estado: 'Pendiente',
                fechaCarga: serverTimestamp(),
                corpo: refData?.corpo || '',
                venta: calculateVenta(precio, cantidad, modalidad, calculateMargin(precio)),
                isPackage: isPaquetizationCode,
                parentCargoId: null
            };
            const cargoRef = collection(db, 'cargosimp');
            const mainCargoDocRef = doc(cargoRef);
            batch.set(mainCargoDocRef, cargoData);
            if (isPaquetizationCode) {
                const paqueteItems = await loadPaquetizationItems(codigo);
                for (const item of paqueteItems) {
                    const itemRefData = await fetchReferenciaData(item.referencia);
                    if (itemRefData) {
                        const itemCargoData = {
                            uid: user.uid,
                            admision,
                            fechaIngreso: Timestamp.fromDate(new Date(ingreso)),
                            cotizacion,
                            referencia: item.referencia,
                            cantidad: item.cantidad || 1,
                            lote: 'PAD',
                            vencimiento: 'PAD',
                            precio: itemRefData.precio || 0,
                            descripcion: itemRefData.descripcion || 'Ítem de paquete',
                            proveedor: itemRefData.proveedor || proveedor,
                            codigo: itemRefData.codigo || '',
                            totalCotizacion,
                            modalidad,
                            categoria: itemRefData.categoria || 'Implantes',
                            prevision: implanteData.prevision,
                            convenio: implanteData.convenio,
                            nombrePaciente: implanteData.nombrePaciente,
                            medico: implanteData.medico,
                            fechaCx: implanteData.fechaCX || null,
                            precioSistema: itemRefData.precioSistema || itemRefData.precio || 0,
                            agrupacion: itemRefData.agrupacion || '',
                            totalItem: (item.cantidad || 1) * (itemRefData.precio || 0),
                            margen: calculateMargin(itemRefData.precio || 0),
                            estado: 'Pendiente',
                            fechaCarga: serverTimestamp(),
                            corpo: itemRefData.corpo || '',
                            venta: calculateVenta(
                                itemRefData.precio || 0,
                                item.cantidad || 1,
                                modalidad,
                                calculateMargin(itemRefData.precio || 0)
                            ),
                            isPackage: false,
                            parentCargoId: mainCargoDocRef.id
                        };
                        const itemCargoRef = collection(db, 'cargosimp');
                        batch.set(doc(itemCargoRef), itemCargoData);
                    }
                }
            }
            await batch.commit();
            showMessage('Cargo y posibles ítems de paquete registrados correctamente.', 'success');
            resetForm();
            allCargos = await loadCargos(user);
            filterData();
        } catch (error) {
            console.error(error.message);
            showMessage(`Error al registrar cargo: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    });

    limpiarBtn.addEventListener('click', resetForm);

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            filterData();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(allCargos.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            filterData();
        }
    });

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await loadPaquetizationCodes();
            allCargos = await loadCargos(user);
            await updateReferenciasWithLowerCase();
            populateDateFilters(allCargos);
            setupEventListeners();
            ingresoInput.value = getTodayDate();
            filterData();
            const observer = new MutationObserver(updateFormFieldsForPaquetization);
            observer.observe(codigoSpan, { childList: true, characterData: true, subtree: true });
        } else {
            tabla1Body.innerHTML = '<tr><td colspan="9" class="text-center">Por favor, inicia sesión.</td></tr>';
            tabla2Body.innerHTML = '<tr><td colspan="10" class="text-center">Por favor, inicia sesión.</td></tr>';
            tabla3Body.innerHTML = '<tr><td colspan="15" class="text-center">Por favor, inicia sesión.</td></tr>';
            showMessage('Por favor, inicia sesión.', 'error');
        }
    });

} catch (error) {
    console.error(error.message);
    showMessage(`Error en la inicialización: ${error.message}`, 'error');
}