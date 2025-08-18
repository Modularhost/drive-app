import { getFirestore, collection, query, where, getDocs, updateDoc, serverTimestamp, Timestamp, writeBatch, doc, deleteDoc, addDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getApps, initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs';

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

    const db = getFirestore(app);
    const auth = getAuth(app);

    let allCargos = [];
    let currentPage = 1;
    const itemsPerPage = 50;
    let selectedEstado = null;
    let selectedDayGlobal = '';
    let filterTimeout = null;
    let cargoIdToDelete = null;

    function validateDOMElements() {
        const elements = {
            tabla1Body: document.querySelector('#tabla1 tbody'),
            tabla2Body: document.querySelector('#tabla2 tbody'),
            tabla3Body: document.querySelector('#tabla3 tbody'),
            prevPageBtn: document.getElementById('prev-page'),
            nextPageBtn: document.getElementById('next-page'),
            pageInfo: document.getElementById('page-info'),
            messageContainer: document.getElementById('message-container'),
            formGroupButton: document.querySelector('.form-group-button'),
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
            loadingOverlay: document.getElementById('loading-overlay')
        };

        let missingElements = false;
        Object.entries(elements).forEach(([key, el]) => {
            if (!el) {
                console.error(`Elemento faltante: ${key}`);
                missingElements = true;
            }
        });

        if (missingElements) {
            console.error('Faltan elementos en las tablas o filtros. Revisa el HTML.');
            return null;
        }

        return elements;
    }

    const domElements = validateDOMElements();
    if (!domElements) {
        throw new Error('Faltan elementos del DOM');
    }

    const {
        tabla1Body,
        tabla2Body,
        tabla3Body,
        prevPageBtn,
        nextPageBtn,
        pageInfo,
        messageContainer,
        formGroupButton,
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
        loadingOverlay
    } = domElements;

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

    function parseDateForTimestamp(dateStr) {
        if (!dateStr) return null;

        if (typeof dateStr === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + dateStr * 24 * 60 * 60 * 1000);
            if (!isNaN(date.getTime())) {
                return Timestamp.fromDate(date);
            }
        }

        if (typeof dateStr !== 'string') {
            console.warn(`Fecha no válida: ${dateStr}`);
            return null;
        }

        let match = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
        if (match) {
            const [_, day, month, year] = match;
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0);
            if (!isNaN(date.getTime())) {
                return Timestamp.fromDate(date);
            }
        }

        match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (match) {
            const [_, year, month, day] = match;
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0);
            if (!isNaN(date.getTime())) {
                return Timestamp.fromDate(date);
            }
        }

        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return Timestamp.fromDate(date);
        }

        console.warn(`Formato de fecha no reconocido: ${dateStr}`);
        return null;
    }

    function formatDateForDisplay(date) {
        if (!date || !(date instanceof Timestamp)) {
            return '-';
        }
        const d = date.toDate();
        if (isNaN(d.getTime())) {
            return '-';
        }
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

    function calculateVenta(precioSistema, cantidad, modalidad, margen) {
        const precio = parseFloat(precioSistema) || 0;
        const qty = parseInt(cantidad) || 0;
        let venta = 0;

        if (modalidad === 'Cotización') {
            venta = (precio + (precio * 0.30)) * qty;
        } else if (modalidad === 'Consignación') {
            const margenDecimal = (parseFloat(margen) || 0) / 100;
            venta = (precio + (precio * margenDecimal)) * qty;
        }

        return Math.round(venta);
    }

    const reportesCache = new Map();

    async function loadReporteByAdmision(admision, user) {
        const cacheKey = `${user.uid}_${admision.trim()}`;
        if (reportesCache.has(cacheKey)) {
            return reportesCache.get(cacheKey);
        }
        try {
            const reportesQuery = query(
                collection(db, 'reportesPabellon'),
                where('uid', '==', user.uid),
                where('admision', '==', admision.trim())
            );
            const reportesSnapshot = await getDocs(reportesQuery);
            if (reportesSnapshot.empty) {
                reportesCache.set(cacheKey, null);
                return null;
            }
            const reporte = reportesSnapshot.docs[0].data();
            reportesCache.set(cacheKey, reporte);
            return reporte;
        } catch (error) {
            console.error(`Error al buscar reporte para admisión ${admision}: ${error.message}`);
            showMessage(`Error al buscar reporte para admisión ${admision}: ${error.message}`, 'error');
            return null;
        }
    }

    async function loadCargos(user) {
        if (!user) {
            console.warn('No hay usuario autenticado en loadCargos');
            return [];
        }
        try {
            showLoading();
            const cargosQuery = query(
                collection(db, 'cargosimp'),
                where('uid', '==', user.uid)
            );
            const cargosSnapshot = await getDocs(cargosQuery);
            if (cargosSnapshot.empty) {
                return [];
            }

            let cargos = cargosSnapshot.docs.map(doc => {
                const data = doc.data();
                const totalItem = (data.cantidad || 0) * (data.precioSistema || data.precio || 0);
                const margen = data.margen || calculateMargin(data.precioSistema || data.precio || 0);
                const venta = data.venta || calculateVenta(data.precioSistema || data.precio, data.cantidad, data.modalidad, margen);
                return {
                    id: doc.id,
                    ...data,
                    estado: data.estado || 'Pendiente',
                    fechaCargo: data.fechaCargo || null,
                    corpo: data.corpo || '',
                    precioSistema: data.precioSistema || data.precio || 0,
                    agrupacion: data.agrupacion || '',
                    totalItem: totalItem,
                    margen: margen,
                    venta: venta,
                    convenio: data.convenio || '',
                    prevision: data.prevision || '',
                    medico: data.medico || '',
                    modalidad: data.modalidad || '',
                    categoria: data.categoria || '',
                    fechaDescarga: data.fechaDescarga || null,
                    totalCotizacion: data.totalCotizacion || 0
                };
            });

            let pacientesMap = new Map();
            try {
                const pacientesQuery = query(
                    collection(db, 'pacientesimplantes'),
                    where('uid', '==', user.uid)
                );
                const pacientesSnapshot = await getDocs(pacientesQuery);
                pacientesSnapshot.forEach(doc => {
                    const data = doc.data();
                    const key = `${data.admision?.trim() || ''}|${data.proveedor?.trim() || ''}`;
                    pacientesMap.set(key, data.totalCotizacion || 0);
                });
            } catch (error) {
                console.error('Error al consultar pacientesimplantes:', error.message);
                showMessage('No se pudo acceder a la colección pacientesimplantes. Verifica los permisos en Firestore.', 'error');
            }

            const batch = writeBatch(db);
            let updateCount = 0;
            for (const cargo of cargos) {
                let needsUpdate = false;
                const cargoRef = doc(db, 'cargosimp', cargo.id);
                const calculatedVenta = calculateVenta(cargo.precioSistema, cargo.cantidad, cargo.modalidad, cargo.margen);
                const cargoKey = `${cargo.admision?.trim() || ''}|${cargo.proveedor?.trim() || ''}`;
                const totalCotizacionFromPacientes = pacientesMap.get(cargoKey) || 0;

                if (cargo.totalCotizacion !== totalCotizacionFromPacientes) {
                    cargo.totalCotizacion = totalCotizacionFromPacientes;
                    batch.update(cargoRef, {
                        totalCotizacion: totalCotizacionFromPacientes,
                        updatedAt: serverTimestamp(),
                        uid: user.uid
                    });
                    needsUpdate = true;
                }

                if (cargo.venta !== calculatedVenta) {
                    batch.update(cargoRef, {
                        venta: calculatedVenta,
                        updatedAt: serverTimestamp(),
                        uid: user.uid
                    });
                    needsUpdate = true;
                }

                if (cargo.admision && (!cargo.convenio || !cargo.prevision || !cargo.medico)) {
                    try {
                        const reporte = await loadReporteByAdmision(cargo.admision, user);
                        if (reporte) {
                            const newConvenio = reporte.convenio || cargo.convenio || '';
                            const newPrevision = reporte.isapre || cargo.prevision || '';
                            const newMedico = reporte.primerCirujano || cargo.medico || '';
                            if (
                                newConvenio !== cargo.convenio ||
                                newPrevision !== cargo.prevision ||
                                newMedico !== cargo.medico
                            ) {
                                batch.update(cargoRef, {
                                    convenio: newConvenio,
                                    prevision: newPrevision,
                                    medico: newMedico,
                                    updatedAt: serverTimestamp(),
                                    uid: user.uid
                                });
                                needsUpdate = true;
                            }
                        }
                    } catch (error) {
                        console.error(`Error al actualizar cargo ${cargo.id} para admisión ${cargo.admision}: ${error.message}`);
                    }
                }

                if (needsUpdate) {
                    updateCount++;
                }
            }

            if (updateCount > 0) {
                try {
                    await batch.commit();
                    const updatedCargosSnapshot = await getDocs(cargosQuery);
                    cargos = updatedCargosSnapshot.docs.map(doc => {
                        const data = doc.data();
                        const totalItem = (data.cantidad || 0) * (data.precioSistema || data.precio || 0);
                        const margen = data.margen || calculateMargin(data.precioSistema || data.precio || 0);
                        const venta = data.venta || calculateVenta(data.precioSistema || data.precio, data.cantidad, data.modalidad, margen);
                        return {
                            id: doc.id,
                            ...data,
                            estado: data.estado || 'Pendiente',
                            fechaCargo: data.fechaCargo || null,
                            corpo: data.corpo || '',
                            precioSistema: data.precioSistema || data.precio || 0,
                            agrupacion: data.agrupacion || '',
                            totalItem: totalItem,
                            margen: margen,
                            venta: venta,
                            convenio: data.convenio || '',
                            prevision: data.prevision || '',
                            medico: data.medico || '',
                            modalidad: data.modalidad || '',
                            categoria: data.categoria || '',
                            fechaDescarga: data.fechaDescarga || null,
                            totalCotizacion: data.totalCotizacion || 0
                        };
                    });
                } catch (error) {
                    console.error('Error al actualizar documentos en batch:', error.message);
                    showMessage('Error al actualizar documentos en Firestore.', 'error');
                }
            }

            const groupedCargos = {};
            cargos.forEach(cargo => {
                const key = `${cargo.admision?.trim() || ''}|${cargo.proveedor?.trim() || ''}`;
                if (!groupedCargos[key]) {
                    groupedCargos[key] = [];
                }
                groupedCargos[key].push(cargo);
            });
            Object.values(groupedCargos).forEach(group => {
                const totalGrupo = group.reduce((sum, cargo) => sum + (cargo.totalItem || 0), 0);
                group.forEach(cargo => {
                    cargo.totalGrupo = totalGrupo;
                });
            });

            return cargos;
        } catch (error) {
            console.error('Error al cargar cargos:', error.message);
            showMessage('Error al cargar cargos. Verifica los permisos en Firestore.', 'error');
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

    async function fetchMonthsForYear(user, selectedYear) {
        if (!user || !selectedYear) {
            return [];
        }
        try {
            showLoading();
            const cargosQuery = query(
                collection(db, 'cargosimp'),
                where('uid', '==', user.uid),
                where('fechaCx', '>=', Timestamp.fromDate(new Date(parseInt(selectedYear), 0, 1))),
                where('fechaCx', '<=', Timestamp.fromDate(new Date(parseInt(selectedYear), 11, 31)))
            );
            const cargosSnapshot = await getDocs(cargosQuery);
            const months = new Set();
            cargosSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.fechaCx && data.fechaCx instanceof Timestamp) {
                    const date = data.fechaCx.toDate();
                    if (!isNaN(date.getTime()) && date.getFullYear() === parseInt(selectedYear)) {
                        months.add(date.getMonth() + 1);
                    }
                }
            });
            return Array.from(months).sort((a, b) => a - b);
        } catch (error) {
            console.error('Error al cargar meses:', error.message);
            showMessage('Error al cargar meses.', 'error');
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
                where('fechaCx', '>=', Timestamp.fromDate(startDate)),
                where('fechaCx', '<=', Timestamp.fromDate(endDate))
            );
            const cargosSnapshot = await getDocs(cargosQuery);
            const days = new Set();
            cargosSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.fechaCx && data.fechaCx instanceof Timestamp) {
                    const date = data.fechaCx.toDate();
                    if (!isNaN(date.getTime()) &&
                        date.getFullYear() === parseInt(selectedYear) &&
                        (date.getMonth() + 1) === parseInt(selectedMonth)) {
                        days.add(date.getDate());
                    }
                }
            });
            return Array.from(days).sort((a, b) => a - b);
        } catch (error) {
            console.error('Error al cargar días:', error.message);
            showMessage('Error al cargar días.', 'error');
            return [];
        } finally {
            hideLoading();
        }
    }

    function populateDateFilters(cargos = []) {
        if (!yearSelect || !monthSelect || !daySelect) {
            return;
        }
        yearSelect.innerHTML = '<option value="">Todos los años</option>';
        const currentYear = new Date().getFullYear();
        const years = new Set([currentYear]);
        if (cargos.length > 0) {
            cargos.forEach(cargo => {
                if (cargo.fechaCx && cargo.fechaCx instanceof Timestamp) {
                    const date = cargo.fechaCx.toDate();
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
        window.updateMonths();
    }

    function updateDateFilters(cargos) {
        const monthsByYear = {};
        const daysByYearMonth = {};
        cargos.forEach(cargo => {
            if (cargo.fechaCx && cargo.fechaCx instanceof Timestamp) {
                const date = cargo.fechaCx.toDate();
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

    function downloadImportFormat() {
        const headers = [
            'Fecha de Ingreso', 'Admisión', 'Código', 'Cantidad', 'Estado',
            'Fecha de Cargo', 'Descripción', 'Cotización', 'Referencia', 'Precio',
            'Corporativo', 'Paciente', 'Fecha Cx', 'Proveedor', 'Modalidad', 'Categoría'
        ];
        const worksheet = XLSX.utils.json_to_sheet([{}], { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Formato Importación');
        XLSX.writeFile(workbook, `Formato_Importacion_${getTodayDateForDisplay().replace(/\//g, '-')}.xlsx`);
    }

    async function importExcel(event) {
        const file = event.target.files[0];
        if (!file) {
            showMessage('No se seleccionó ningún archivo.', 'error');
            return;
        }
        try {
            showLoading();
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', dateNF: 'dd/mm/yyyy' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    const expectedHeaders = [
                        'Fecha de Ingreso', 'Admisión', 'Código', 'Cantidad', 'Estado',
                        'Fecha de Cargo', 'Descripción', 'Cotización', 'Referencia', 'Precio',
                        'Corporativo', 'Paciente', 'Fecha Cx', 'Proveedor', 'Modalidad', 'Categoría'
                    ];
                    const headers = jsonData[0];
                    if (!headers || !expectedHeaders.every((header, index) => header === headers[index])) {
                        showMessage('El formato del archivo Excel no coincide con las columnas esperadas.', 'error');
                        return;
                    }

                    const cargos = jsonData.slice(1).filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined));
                    if (cargos.length === 0) {
                        showMessage('No hay datos válidos para importar.', 'error');
                        return;
                    }

                    const user = auth.currentUser;
                    if (!user) {
                        showMessage('Usuario no autenticado.', 'error');
                        return;
                    }

                    const batch = writeBatch(db);
                    const invalidRows = [];
                    const reportesCacheForImport = new Map();
                    for (const [index, row] of cargos.entries()) {
                        const [
                            fechaIngreso, admision, codigo, cantidad, estado,
                            fechaCargo, descripcion, cotizacion, referencia, precio,
                            corporativo, paciente, fechaCx, proveedor, modalidad, categoria
                        ] = row;

                        const admisionStr = admision != null ? String(admision).trim() : '';
                        if (!admisionStr) {
                            console.warn(`Fila ${index + 2}: Admisión es vacía o inválida`, { admision });
                            invalidRows.push(index + 2);
                            continue;
                        }

                        const parsedFechaIngreso = parseDateForTimestamp(fechaIngreso);
                        const parsedFechaCargo = parseDateForTimestamp(fechaCargo);
                        const parsedFechaCx = parseDateForTimestamp(fechaCx);
                        if ((fechaIngreso && !parsedFechaIngreso) || (fechaCargo && !parsedFechaCargo) || (fechaCx && !parsedFechaCx)) {
                            console.warn(`Fila ${index + 2}: Formato de fecha inválido`, { fechaIngreso, fechaCargo, fechaCx });
                            invalidRows.push(index + 2);
                            continue;
                        }

                        const precioSistema = parseFloat(precio) || 0;
                        const margen = calculateMargin(precioSistema);
                        const venta = calculateVenta(precioSistema, cantidad, modalidad, margen);

                        let convenio = '';
                        let prevision = '';
                        let medico = '';

                        if (admisionStr) {
                            const cacheKey = `${user.uid}_${admisionStr}`;
                            let reporte = reportesCacheForImport.get(cacheKey);
                            if (!reporte) {
                                try {
                                    const reportesQuery = query(
                                        collection(db, 'reportesPabellon'),
                                        where('uid', '==', user.uid),
                                        where('admision', '==', admisionStr)
                                    );
                                    const reportesSnapshot = await getDocs(reportesQuery);
                                    reporte = reportesSnapshot.empty ? null : reportesSnapshot.docs[0].data();
                                    reportesCacheForImport.set(cacheKey, reporte);
                                } catch (error) {
                                    console.error(`Fila ${index + 2}: Error al buscar reporte para admisión ${admisionStr}: ${error.message}`);
                                }
                            }
                            if (reporte) {
                                convenio = reporte.convenio || '';
                                prevision = reporte.isapre || '';
                                medico = reporte.primerCirujano || '';
                            }
                        }

                        const cargoData = {
                            fechaIngreso: parsedFechaIngreso || null,
                            admision: admisionStr,
                            codigo: codigo != null ? String(codigo).trim() : '',
                            cantidad: parseInt(cantidad) || 0,
                            estado: estado != null ? String(estado).trim() : 'Pendiente',
                            fechaCargo: parsedFechaCargo || null,
                            fechaCx: parsedFechaCx || null,
                            descripcion: descripcion != null ? String(descripcion).trim() : '',
                            cotizacion: cotizacion != null ? String(cotizacion).trim() : '',
                            referencia: referencia != null ? String(referencia).trim() : '',
                            precio: precioSistema,
                            corpo: corporativo != null ? String(corporativo).trim() : '',
                            nombrePaciente: paciente != null ? String(paciente).trim() : '',
                            proveedor: proveedor != null ? String(proveedor).trim() : '',
                            modalidad: modalidad != null ? String(modalidad).trim() : '',
                            categoria: categoria != null ? String(categoria).trim() : '',
                            uid: user.uid,
                            precioSistema: precioSistema,
                            margen: margen,
                            venta: venta,
                            totalItem: (parseInt(cantidad) || 0) * precioSistema,
                            convenio,
                            prevision,
                            medico
                        };

                        const cargoRef = doc(collection(db, 'cargosimp'));
                        batch.set(cargoRef, cargoData);
                    }

                    if (invalidRows.length > 0) {
                        showMessage(`Error: Datos inválidos en las filas ${invalidRows.join(', ')}. Revisa el archivo Excel.`, 'error');
                        return;
                    }

                    await batch.commit();
                    showMessage(`Se importaron ${cargos.length} cargos correctamente.`, 'success');
                    allCargos = await loadCargos(user);
                    filterData();
                } catch (error) {
                    console.error('Error al importar Excel:', error.message);
                    showMessage('Error al importar el archivo Excel.', 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('Error al importar Excel:', error.message);
            showMessage('Error al importar el archivo Excel.', 'error');
        } finally {
            hideLoading();
            event.target.value = '';
        }
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
                console.warn('Usuario no autenticado en filterData');
                showMessage('Usuario no autenticado.', 'error');
                tabla1Body.innerHTML = '<tr><td colspan="9" class="text-center">Por favor, inicia sesión.</td></tr>';
                tabla2Body.innerHTML = '<tr><td colspan="10" class="text-center">Por favor, inicia sesión.</td></tr>';
                tabla3Body.innerHTML = '<tr><td colspan="15" class="text-center">Por favor, inicia sesión.</td></tr>';
                hideLoading();
                return;
            }
            if (!selectedMonth) {
                tabla1Body.innerHTML = '<tr><td colspan="9" class="text-center">Selecciona un mes para ver los datos.</td></tr>';
                tabla2Body.innerHTML = '<tr><td colspan="10" class="text-center">Selecciona un mes para ver los datos.</td></tr>';
                tabla3Body.innerHTML = '<tr><td colspan="15" class="text-center">Selecciona un mes para ver los datos.</td></tr>';
                allCargos = [];
                updatePagination([]);
                updateActionButtons();
                renderStateFilterButtons([]);
                hideLoading();
                return;
            }
            if (allCargos.length === 0 || selectedYear || selectedMonth) {
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

            filteredCargos.sort((a, b) => {
                const dateA = a.fechaIngreso ? a.fechaIngreso.toDate() : new Date(0);
                const dateB = b.fechaIngreso ? b.fechaIngreso.toDate() : new Date(0);
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA.getTime() - dateB.getTime();
                }
                const admisionA = a.admision?.toLowerCase() || '';
                const admisionB = b.admision?.toLowerCase() || '';
                if (admisionA !== admisionB) {
                    return admisionA.localeCompare(admisionB);
                }
                const proveedorA = a.proveedor?.toLowerCase() || '';
                const proveedorB = b.proveedor?.toLowerCase() || '';
                return proveedorA.localeCompare(proveedorB);
            });

            if (filteredCargos.length === 0) {
                tabla1Body.innerHTML = '<tr><td colspan="9" class="text-center">No hay datos para los filtros seleccionados.</td></tr>';
                tabla2Body.innerHTML = '<tr><td colspan="10" class="text-center">No hay datos para los filtros seleccionados.</td></tr>';
                tabla3Body.innerHTML = '<tr><td colspan="15" class="text-center">No hay datos para los filtros seleccionados.</td></tr>';
            }
            updateDateFilters(filteredCargos);
            renderTabla1(filteredCargos);
            renderTabla2(filteredCargos);
            renderTabla3(filteredCargos);
            updateActionButtons();
            setupRowHoverSync();
            renderStateFilterButtons(filteredCargos);
            hideLoading();
        }, 100);
    }

    function updateActionButtons() {
        const checkboxes = tabla1Body.querySelectorAll('.row-checkbox:checked');
        let solicitudOcBtn = document.getElementById('solicitud-oc-btn');
        let downloadFormatBtn = document.getElementById('download-format-btn');
        let importExcelBtn = document.getElementById('import-excel-btn');

        if (solicitudOcBtn) solicitudOcBtn.remove();
        if (downloadFormatBtn) downloadFormatBtn.remove();
        if (importExcelBtn) importExcelBtn.remove();

        downloadFormatBtn = document.createElement('button');
        downloadFormatBtn.type = 'button';
        downloadFormatBtn.id = 'download-format-btn';
        downloadFormatBtn.className = 'action-btn';
        downloadFormatBtn.textContent = 'Descargar Formato';
        formGroupButton.appendChild(downloadFormatBtn);
        downloadFormatBtn.addEventListener('click', downloadImportFormat);

        importExcelBtn = document.createElement('button');
        importExcelBtn.type = 'button';
        importExcelBtn.id = 'import-excel-btn';
        importExcelBtn.className = 'action-btn';
        importExcelBtn.textContent = 'Importar Excel';
        formGroupButton.appendChild(importExcelBtn);
        importExcelBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx, .xls';
            input.addEventListener('change', importExcel);
            input.click();
        });

        if (checkboxes.length > 0) {
            solicitudOcBtn = document.createElement('button');
            solicitudOcBtn.type = 'button';
            solicitudOcBtn.id = 'solicitud-oc-btn';
            solicitudOcBtn.className = 'success-btn';
            solicitudOcBtn.textContent = 'Solicitud OC';
            formGroupButton.appendChild(solicitudOcBtn);
            solicitudOcBtn.addEventListener('click', () => {
                const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.cargoId);
                showOcModal(selectedIds);
            });
        }
    }

    function showOcModal(cargoIds) {
        if (!ocModal || !ocTable) {
            showMessage('Modal o tabla no encontrados en el DOM.', 'error');
            return;
        }
        const selectedCargos = allCargos.filter(cargo => cargoIds.includes(cargo.id));
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
                    <th class="precio-sistema">Precio Sistema</th>
                    <th class="modalidad">Modalidad</th>
                    <th class="oc">OC</th>
                    <th class="oc-monto">OC Monto</th>
                    <th class="estado">Estado</th>
                    <th class="fecha-ingreso">Fecha Ingreso</th>
                    <th class="fecha-cargo">Fecha de Cargo</th>
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
                ${selectedCargos.length === 0 ? '<tr><td colspan="23" class="text-center">No hay cargos seleccionados.</td></tr>' :
                selectedCargos.map(cargo => `
                    <tr data-cargo-id="${cargo.id}">
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
                        <td class="oc"></td>
                        <td class="oc-monto"></td>
                        <td class="estado"></td>
                        <td class="fecha-ingreso">${formatDateForDisplay(cargo.fechaIngreso)}</td>
                        <td class="fecha-cargo">${formatDateForDisplay(cargo.fechaCargo)}</td>
                        <td class="cotizacion">${cargo.cotizacion || ''}</td>
                        <td class="factura"></td>
                        <td class="fecha-factura"></td>
                        <td class="fecha-emision">${getTodayDateForDisplay()}</td>
                        <td class="lote">${cargo.lote || ''}</td>
                        <td class="fecha-vencimiento">${cargo.vencimiento || ''}</td>
                        <td class="corpo">${cargo.corpo || ''}</td>
                        <td class="fecha-descarga">${formatDateForDisplay(cargo.fechaDescarga)}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        ocModal.classList.add('active');
        cancelarOcBtn.onclick = () => {
            ocModal.classList.remove('active');
        };
        downloadExcelBtn.onclick = () => {
            downloadExcel(selectedCargos, cargoIds);
        };
    }

    async function downloadExcel(cargos, cargoIds) {
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
            const data = cargos.map(cargo => ({
                Admisión: cargo.admision || '',
                Paciente: cargo.nombrePaciente || '',
                Médico: cargo.medico || '',
                'Fecha Cx': formatDateForDisplay(cargo.fechaCx),
                Proveedor: cargo.proveedor || '',
                Código: cargo.codigo || '',
                Descripción: cargo.descripcion || '',
                Cantidad: cargo.cantidad || 0,
                'Precio Sistema': formatNumberWithThousands(cargo.precioSistema),
                Modalidad: cargo.modalidad || '',
                OC: '',
                'OC Monto': '',
                Estado: '',
                'Fecha Ingreso': formatDateForDisplay(cargo.fechaIngreso),
                'Fecha de Cargo': formatDateForDisplay(cargo.fechaCargo),
                Cotización: cargo.cotizacion || '',
                Factura: '',
                'Fecha Factura': '',
                'Fecha Emisión': getTodayDateForDisplay(),
                Lote: cargo.lote || '',
                'Fecha Vencimiento': cargo.vencimiento || '',
                Corpo: cargoIds.includes(cargo.id) ? 'Gestionado' : (cargo.corpo || ''),
                'Fecha Descarga': cargoIds.includes(cargo.id) ? getTodayDateForDisplay() : formatDateForDisplay(cargo.fechaDescarga)
            }));
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitud OC');
            XLSX.writeFile(workbook, `Solicitud_OC_${getTodayDateForDisplay().replace(/\//g, '-')}.xlsx`);
            filterData();
        } catch (error) {
            console.error('Error al generar Excel o actualizar Firestore:', error.message);
            showMessage('Error al generar Excel.', 'error');
        } finally {
            hideLoading();
        }
    }

    async function deleteCargo(cargoId) {
        try {
            showLoading();
            const cargoRef = doc(db, 'cargosimp', cargoId);
            await deleteDoc(cargoRef);
            showMessage('Cargo eliminado correctamente.', 'success');
            allCargos = await loadCargos(auth.currentUser);
            filterData();
        } catch (error) {
            console.error('Error al eliminar cargo:', error.message);
            showMessage('Error al eliminar cargo.', 'error');
        } finally {
            hideLoading();
        }
    }

    function renderTabla1(cargos) {
        tabla1Body.innerHTML = '';
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedCargos = cargos.slice(start, end);
        if (paginatedCargos.length === 0) {
            tabla1Body.innerHTML = '<tr><td colspan="9" class="text-center">No hay datos disponibles.</td></tr>';
            updatePagination(cargos);
            return;
        }
        paginatedCargos.forEach((cargo, index) => {
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
                <td class="fecha-cargo">${formatDateForDisplay(cargo.fechaCargo)}</td>
                <td class="acciones">
                    <i class="fas fa-trash action-icon" data-cargo-id="${cargo.id}"></i>
                </td>
            `;
            tabla1Body.appendChild(row);
        });
        tabla1Body.querySelectorAll('.row-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateActionButtons);
        });
        tabla1Body.querySelectorAll('.fa-trash').forEach(icon => {
            icon.addEventListener('click', () => {
                cargoIdToDelete = icon.dataset.cargoId;
                deleteModal.classList.add('active');
            });
        });
        updatePagination(cargos);
    }

    function renderTabla2(cargos) {
        tabla2Body.innerHTML = '';
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedCargos = cargos.slice(start, end);
        if (paginatedCargos.length === 0) {
            tabla2Body.innerHTML = '<tr><td colspan="10" class="text-center">No hay datos disponibles.</td></tr>';
            return;
        }
        paginatedCargos.forEach(cargo => {
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
    }

    function renderTabla3(cargos) {
        tabla3Body.innerHTML = '';
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedCargos = cargos.slice(start, end);
        if (paginatedCargos.length === 0) {
            tabla3Body.innerHTML = '<tr><td colspan="15" class="text-center">No hay datos disponibles.</td></tr>';
            return;
        }

        for (const cargo of paginatedCargos) {
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
        }
    }

    function updatePagination(cargos) {
        const totalPages = Math.ceil(cargos.length / itemsPerPage);
        pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    function setupRowHoverSync() {
        const tables = [tabla1Body, tabla2Body, tabla3Body];
        tables.forEach(table => {
            table.querySelectorAll('tr').forEach(row => {
                row.addEventListener('mouseenter', () => {
                    const cargoId = row.dataset.cargoId;
                    tables.forEach(t => {
                        const matchingRow = t.querySelector(`tr[data-cargo-id="${cargoId}"]`);
                        if (matchingRow) {
                            matchingRow.classList.add('row-hover');
                        }
                    });
                });
                row.addEventListener('mouseleave', () => {
                    const cargoId = row.dataset.cargoId;
                    tables.forEach(t => {
                        const matchingRow = t.querySelector(`tr[data-cargo-id="${cargoId}"]`);
                        if (matchingRow) {
                            matchingRow.classList.remove('row-hover');
                        }
                    });
                });
            });
        });
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            populateDateFilters([]);
            setupEventListeners();
            tabla1Body.innerHTML = '<tr><td colspan="9" class="text-center">Selecciona un mes para ver los datos.</td></tr>';
            tabla2Body.innerHTML = '<tr><td colspan="10" class="text-center">Selecciona un mes para ver los datos.</td></tr>';
            tabla3Body.innerHTML = '<tr><td colspan="15" class="text-center">Selecciona un mes para ver los datos.</td></tr>';
            updateActionButtons();
        } else {
            tabla1Body.innerHTML = '<tr><td colspan="9" class="text-center">Por favor, inicia sesión.</td></tr>';
            tabla2Body.innerHTML = '<tr><td colspan="10" class="text-center">Por favor, inicia sesión.</td></tr>';
            tabla3Body.innerHTML = '<tr><td colspan="15" class="text-center">Por favor, inicia sesión.</td></tr>';
        }
    });

} catch (error) {
    console.error('Error en la inicialización:', error.message);
    alert('Ocurrió un error al inicializar la aplicación.');

}
