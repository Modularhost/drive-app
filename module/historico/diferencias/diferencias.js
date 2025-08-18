import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, orderBy, limit, startAfter, getDoc, doc, Timestamp, writeBatch, onSnapshot, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

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
        console.error('Error al configurar persistencia:', error.message);
    });

    const container = document.querySelector('.datos-historico-container');
    const downloadFormatBtn = document.getElementById('download-format-btn');
    const importFileInput = document.getElementById('import-file');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const tableBody = document.querySelector('#diferencias-table tbody');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const totalRecords = document.getElementById('total-records');
    const successModal = document.getElementById('success-modal');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.getElementById('success-message');
    const loadingModal = document.getElementById('loading-modal');
    const loadingProgress = document.getElementById('loading-progress');
    const yearFilter = document.getElementById('year-filter');
    const monthFilter = document.getElementById('month-filter');
    const providerFilter = document.getElementById('provider-filter');
    const ocMontoTotal = document.getElementById('oc-monto-total');
    const empresaRutDisplay = document.getElementById('empresa-rut-display');

    const elements = {
        container, downloadFormatBtn, importFileInput, exportExcelBtn, tableBody,
        prevBtn, nextBtn, pageInfo, totalRecords, successModal, successIcon, successMessage,
        loadingModal, loadingProgress, yearFilter, monthFilter, providerFilter, ocMontoTotal, empresaRutDisplay
    };

    Object.entries(elements).forEach(([key, el]) => {
        if (!el) console.warn(`Elemento ${key} no encontrado`);
    });

    let currentUser = null;
    let registros = [];
    let filteredRegistros = [];
    let currentPage = 1;
    const recordsPerPage = 100;
    let lastVisible = null;
    let totalPages = 1;
    let years = [];
    let monthsByYear = {};
    let columnFilters = {};
    let isInitialized = false;

    function parseCustomDate(dateStr, allowInvalid = false) {
        if (!dateStr) return null;
        if (allowInvalid && typeof dateStr === 'string' && !dateStr.match(/^\d{2}-\d{2}-\d{4}(?:\s\d{2}:\d{2})?$/)) return dateStr.trim();
        if (dateStr instanceof Date && !isNaN(dateStr)) return new Date(dateStr);
        if (typeof dateStr === 'string' && dateStr.match(/^\d{2}-\d{2}-\d{4}(?:\s\d{2}:\d{2})?$/)) {
            const regex = /^(\d{2})-(\d{2})-(\d{4})(?:\s(\d{2}):(\d{2}))?$/;
            const match = dateStr.match(regex);
            if (match) {
                const day = parseInt(match[1], 10);
                const month = parseInt(match[2], 10) - 1;
                const year = parseInt(match[3], 10);
                const hours = match[4] ? parseInt(match[4], 10) : 0;
                const minutes = match[5] ? parseInt(match[5], 10) : 0;
                const date = new Date(year, month, day, hours, minutes);
                if (!isNaN(date.getTime())) return date;
            }
        }
        if (typeof dateStr === 'number' && dateStr > 0) {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + dateStr * 24 * 60 * 60 * 1000);
            if (!isNaN(date.getTime())) return date;
        }
        if (!allowInvalid) console.warn(`Formato de fecha inválido: ${dateStr}`);
        return null;
    }

    function formatDate(date) {
        if (typeof date === 'string') return date.trim() || '-';
        if (!date) return '-';
        let parsedDate;
        if (typeof date === 'number') parsedDate = parseCustomDate(date);
        else if (date instanceof Timestamp) parsedDate = date.toDate();
        else if (date instanceof Date) parsedDate = date;
        if (!parsedDate || isNaN(parsedDate)) return '-';
        return parsedDate.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function parseNumber(value) {
        if (!value) return 0;
        const cleaned = value.toString().replace(/[^0-9.-]/g, '');
        const number = parseFloat(cleaned);
        return isNaN(number) ? 0 : number;
    }

    function showModal(modal, progressElement = null, percentage = null) {
        if (!modal) { console.warn('Modal no encontrado'); return; }
        modal.style.display = 'flex';
        if (progressElement && percentage !== null) progressElement.textContent = `${percentage}%`;
    }

    function hideModal(modal) {
        if (!modal) { console.warn('Modal no encontrado'); return; }
        modal.style.display = 'none';
    }

    function showSuccessMessage(message, isSuccess = true) {
        if (!successModal || !successIcon || !successMessage) {
            console.warn('Elementos de éxito no encontrados');
            alert(message);
            return;
        }
        successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
        successMessage.textContent = message;
        successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
        showModal(successModal);
        setTimeout(() => hideModal(successModal), 2000);
    }

    function populateYearFilter() {
        if (!yearFilter) { console.error('Elemento year-filter no encontrado'); return; }
        yearFilter.innerHTML = '<option value="">Todos los años</option>';
        if (years.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Sin años disponibles';
            option.disabled = true;
            yearFilter.appendChild(option);
        } else {
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilter.appendChild(option);
            });
        }
    }

    function populateMonthFilter(selectedYear) {
        if (!monthFilter) { console.error('Elemento month-filter no encontrado'); return; }
        monthFilter.innerHTML = '<option value="">Todos los meses</option>';
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        if (!selectedYear) {
            const allMonths = new Set();
            Object.values(monthsByYear).forEach(months => months.forEach(month => allMonths.add(month)));
            if (allMonths.size === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Sin meses disponibles';
                option.disabled = true;
                monthFilter.appendChild(option);
            } else {
                Array.from(allMonths).sort((a, b) => a - b).forEach(monthIndex => {
                    const option = document.createElement('option');
                    option.value = monthIndex;
                    option.textContent = months[monthIndex];
                    monthFilter.appendChild(option);
                });
            }
        } else {
            const availableMonths = monthsByYear[selectedYear] || [];
            if (availableMonths.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Sin meses disponibles';
                option.disabled = true;
                monthFilter.appendChild(option);
            } else {
                availableMonths.sort((a, b) => a - b).forEach(monthIndex => {
                    const option = document.createElement('option');
                    option.value = monthIndex;
                    option.textContent = months[monthIndex];
                    monthFilter.appendChild(option);
                });
            }
        }
    }

    function populateProviderFilter(providers) {
        if (!providerFilter) { console.error('Elemento provider-filter no encontrado'); return; }
        providerFilter.innerHTML = '<option value="">Todos los proveedores</option>';
        providers.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider || 'Sin Proveedor';
            option.textContent = provider || 'Sin Proveedor';
            providerFilter.appendChild(option);
        });
    }

    async function displayEmpresaRut(providerName) {
        if (!empresaRutDisplay) return;
        if (!providerName || providerName === 'Sin Proveedor' || providerName === '') {
            empresaRutDisplay.textContent = 'RUT: -';
            return;
        }
        try {
            const empresasCollection = collection(db, 'empresas');
            const q = query(empresasCollection, where('nombreEmpresa', '==', providerName));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const empresa = querySnapshot.docs[0].data();
                empresaRutDisplay.textContent = `RUT: ${empresa.rutEmpresa || '-'}`;
            } else {
                empresaRutDisplay.textContent = 'RUT: Empresa no encontrada';
            }
        } catch (error) {
            console.error('Error al buscar RUT:', error.message);
            empresaRutDisplay.textContent = 'RUT: Error al buscar empresa';
        }
    }

    function applyFilters() {
        const selectedYear = yearFilter ? yearFilter.value : '';
        const selectedMonth = monthFilter ? monthFilter.value : '';
        const selectedProvider = providerFilter ? providerFilter.value : '';
        filteredRegistros = registros.filter(registro => {
            if (!registro.fecha_cirugia || !(registro.fecha_cirugia instanceof Date) || isNaN(registro.fecha_cirugia)) return false;
            const year = registro.fecha_cirugia.getFullYear().toString();
            const month = registro.fecha_cirugia.getMonth().toString();
            const yearMatch = !selectedYear || year === selectedYear;
            const monthMatch = !selectedMonth || month === selectedMonth;
            const estadoMatch = (registro.estado || '').toString().trim() === 'Pendiente factura' || (registro.estado || '').toString().trim() === '';
            const providerMatch = !selectedProvider || (registro.proveedor || '').toString().trim() === selectedProvider;
            
            let columnMatch = true;
            Object.entries(columnFilters).forEach(([column, value]) => {
                if (value) {
                    let cellValue = registro[column];
                    if (['fecha_cirugia', 'fecha_recepcion', 'fecha_cargo', 'fecha_emision', 'fecha_ingreso', 'fecha_vencimiento'].includes(column)) {
                        cellValue = formatDate(cellValue);
                    } else if (['cantidad', 'precio_unitario', 'oc_monto'].includes(column)) {
                        cellValue = cellValue ? cellValue.toString() : '0';
                    } else {
                        cellValue = cellValue ? cellValue.toString().toLowerCase() : '-';
                    }
                    columnMatch = columnMatch && cellValue.toLowerCase().includes(value.toLowerCase());
                }
            });

            return yearMatch && monthMatch && estadoMatch && columnMatch && providerMatch;
        });
        currentPage = 1;
        lastVisible = null;
        renderTable(filteredRegistros);
        updatePagination(filteredRegistros.length);
    }

    function setupColumnFilters() {
        const filterIcons = document.querySelectorAll('.filter-icon');
        if (filterIcons.length === 0) {
            console.warn('No se encontraron íconos de filtro. Verifica que los elementos con clase .filter-icon estén en el DOM.');
            return;
        }
        filterIcons.forEach(icon => {
            icon.removeEventListener('click', icon.clickHandler);
            icon.clickHandler = (e) => {
                e.stopPropagation();
                e.preventDefault();
                const column = icon.getAttribute('data-column');
                const th = icon.closest('th');
                let filterContainer = document.querySelector('.filter-input-container');
                
                if (filterContainer) {
                    filterContainer.remove();
                    if (columnFilters[column]) {
                        icon.classList.remove('fa-filter-circle-xmark', 'active');
                        icon.classList.add('fa-filter');
                        delete columnFilters[column];
                        applyFilters();
                    }
                    return;
                }

                filterContainer = document.createElement('div');
                filterContainer.className = 'filter-input-container';
                filterContainer.style.display = 'block';
                const tableContainer = document.querySelector('.table-container');
                tableContainer.appendChild(filterContainer);
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = `Filtrar ${column}`;
                input.value = columnFilters[column] || '';
                filterContainer.appendChild(input);

                const thRect = th.getBoundingClientRect();
                const tableContainerRect = tableContainer.getBoundingClientRect();
                const headerHeight = th.offsetHeight;
                filterContainer.style.top = `${thRect.top - tableContainerRect.top + headerHeight + 2}px`;
                filterContainer.style.left = `${thRect.left - tableContainerRect.left}px`;
                filterContainer.style.width = `${thRect.width}px`;

                setTimeout(() => {
                    filterContainer.classList.add('visible');
                }, 10);

                input.focus();

                icon.classList.remove('fa-filter');
                icon.classList.add('fa-filter-circle-xmark', 'active');

                input.addEventListener('input', () => {
                    columnFilters[column] = input.value.trim();
                    applyFilters();
                });

                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        filterContainer.remove();
                        if (!columnFilters[column]) {
                            icon.classList.remove('fa-filter-circle-xmark', 'active');
                            icon.classList.add('fa-filter');
                        }
                    }
                });

                const closeOnClickOutside = (e) => {
                    if (!filterContainer.contains(e.target) && !icon.contains(e.target)) {
                        filterContainer.remove();
                        if (!columnFilters[column]) {
                            icon.classList.remove('fa-filter-circle-xmark', 'active');
                            icon.classList.add('fa-filter');
                        }
                        document.removeEventListener('click', closeOnClickOutside);
                    }
                };

                setTimeout(() => {
                    document.addEventListener('click', closeOnClickOutside);
                }, 200);
            };
            icon.addEventListener('click', icon.clickHandler);
            icon.style.display = 'inline';
        });
    }

    function setupColumnResizing() {
        const headers = document.querySelectorAll('#diferencias-table th.resizeable');
        headers.forEach(th => {
            const resizer = th.querySelector('::after') || th;
            th.addEventListener('mousedown', (e) => {
                if (e.offsetX > th.offsetWidth - 10) {
                    e.preventDefault();
                    th.classList.add('resizing');
                    const startX = e.clientX;
                    const startWidth = th.offsetWidth;
                    const table = th.closest('table');

                    const onMouseMove = (e) => {
                        const newWidth = startWidth + (e.clientX - startX);
                        if (newWidth >= 80) {
                            th.style.width = `${newWidth}px`;
                            th.style.minWidth = `${newWidth}px`;
                            th.style.maxWidth = `${newWidth}px`;
                            const colIndex = Array.from(th.parentNode.children).indexOf(th);
                            const cells = table.querySelectorAll(`tr td:nth-child(${colIndex + 1})`);
                            cells.forEach(cell => {
                                cell.style.width = `${newWidth}px`;
                                cell.style.minWidth = `${newWidth}px`;
                                cell.style.maxWidth = `${newWidth}px`;
                            });
                        }
                    };

                    const onMouseUp = () => {
                        th.classList.remove('resizing');
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        // Forzar repintado del navegador para solucionar problemas con position: sticky
                        setTimeout(() => {
                            th.style.display = 'none';
                            th.offsetHeight; // Forzar reflow
                            th.style.display = '';
                        }, 0);
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                }
            });
        });

        // Depuración: Verificar conflictos de DOM que puedan afectar position: sticky
        const tableContainer = document.querySelector('.table-container');
        const datosContainer = document.querySelector('.datos-historico-container');
        const computedTableContainer = window.getComputedStyle(tableContainer);
        const computedDatosContainer = window.getComputedStyle(datosContainer);
        if (computedTableContainer.overflow !== 'auto' && computedTableContainer.overflowY !== 'auto') {
            console.warn('Advertencia: .table-container no tiene overflow-y: auto');
        }
        if (computedDatosContainer.transform !== 'none' || computedDatosContainer.filter !== 'none' || computedDatosContainer.willChange !== 'auto') {
            console.warn('Advertencia: .datos-historico-container tiene transform, filter o will-change que podrían romper position: sticky');
        }
    }

    async function loadRegistros() {
        try {
            if (!tableBody || !loadingModal || !loadingProgress) {
                showSuccessMessage('Error: Elementos esenciales no encontrados', false);
                return;
            }

            showModal(loadingModal, loadingProgress, 0);
            const registrosCollection = collection(db, 'datos_historico');
            const querySnapshot = await getDocs(registrosCollection);
            registros = [];
            years = new Set();
            monthsByYear = {};
            const providers = new Set();

            let invalidDates = 0;
            querySnapshot.forEach((doc, index) => {
                const data = doc.data();
                let fechaCirugia = data.fecha_cirugia;
                if (fechaCirugia instanceof Timestamp) {
                    fechaCirugia = fechaCirugia.toDate();
                } else if (typeof fechaCirugia === 'string') {
                    fechaCirugia = parseCustomDate(fechaCirugia);
                }
                if (fechaCirugia && !isNaN(fechaCirugia)) {
                    data.fecha_cirugia = fechaCirugia;
                    const year = fechaCirugia.getFullYear();
                    const month = fechaCirugia.getMonth();
                    years.add(year);
                    if (!monthsByYear[year]) monthsByYear[year] = new Set();
                    monthsByYear[year].add(month);
                } else {
                    invalidDates++;
                    data.fecha_cirugia = null;
                }
                const proveedor = data.proveedor || '';
                providers.add(proveedor);
                registros.push({ importOrder: index, docId: doc.id, ...data });
            });

            years = Array.from(years).sort((a, b) => a - b);
            Object.keys(monthsByYear).forEach(year => {
                monthsByYear[year] = Array.from(monthsByYear[year]).sort((a, b) => a - b);
            });
            const sortedProviders = Array.from(providers).sort((a, b) => a.localeCompare(b));
            console.log(`Proveedores encontrados (ordenados alfabéticamente): ${sortedProviders.length}`, sortedProviders);
            populateProviderFilter(sortedProviders);

            filteredRegistros = [...registros];
            totalRecords.textContent = `Total de registros: ${filteredRegistros.length}`;
            totalPages = Math.ceil(filteredRegistros.length / recordsPerPage);

            populateYearFilter();
            populateMonthFilter(yearFilter ? yearFilter.value : '');
            applyFilters();
            updatePagination(filteredRegistros.length);
            setupColumnFilters();
            setupColumnResizing();
            hideModal(loadingModal);

            if (invalidDates > 0) {
                showSuccessMessage(`${invalidDates} registro(s) con fechas inválidas en FECHA_CIRUGIA no se incluirán en los filtros de año/mes`, false);
            }
        } catch (error) {
            console.error('Error al cargar registros:', error.message);
            showSuccessMessage('Error al cargar datos: ' + error.message, false);
            hideModal(loadingModal);
        }
    }

    function setupRealtimeUpdates() {
        const registrosCollection = collection(db, 'datos_historico');
        onSnapshot(registrosCollection, (snapshot) => {
            if (snapshot.docChanges().length > 0) {
                currentPage = 1;
                lastVisible = null;
                loadRegistros();
            }
        }, error => {
            console.error('Error en listener en tiempo real:', error.message);
            showSuccessMessage('Error en actualización en tiempo real: ' + error.message, false);
        });
    }

    function renderTable(data) {
        if (!tableBody || !ocMontoTotal) return;
        tableBody.innerHTML = '';
        const fragment = document.createDocumentFragment();
        let totalOcMonto = 0;

        totalOcMonto = filteredRegistros.reduce((sum, registro) => sum + (registro.oc_monto || 0), 0);

        if (data.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="21" style="text-align: center;">No se encontraron registros que coincidan con los filtros aplicados.</td>`;
            fragment.appendChild(tr);
        } else {
            const start = (currentPage - 1) * recordsPerPage;
            const end = start + recordsPerPage;
            const sortedData = [...data].sort((a, b) => {
                const dateA = a.fecha_cirugia || new Date(0);
                const dateB = b.fecha_cirugia || new Date(0);
                if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
                return (a.id_pacient || '').localeCompare(b.id_pacient || '');
            });
            const paginatedData = sortedData.slice(start, end);

            paginatedData.forEach(registro => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${registro.id_pacient || '-'}</td>
                    <td>${registro.paciente || '-'}</td>
                    <td>${registro.medico || '-'}</td>
                    <td>${formatDate(registro.fecha_cirugia)}</td>
                    <td>${registro.proveedor || '-'}</td>
                    <td>${registro.codigo_clinica || '-'}</td>
                    <td>${registro.codigo_proveedor || '-'}</td>
                    <td>${registro.cantidad || 0}</td>
                    <td>${registro.precio_unitario ? registro.precio_unitario.toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '-'}</td>
                    <td>${registro.atributo || '-'}</td>
                    <td>${registro.oc || '-'}</td>
                    <td>${registro.oc_monto ? registro.oc_monto.toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '-'}</td>
                    <td>${registro.estado || '-'}</td>
                    <td>${formatDate(registro.fecha_recepcion)}</td>
                    <td>${formatDate(registro.fecha_cargo)}</td>
                    <td>${registro.numero_guia || '-'}</td>
                    <td>${registro.numero_factura || '-'}</td>
                    <td>${formatDate(registro.fecha_emision)}</td>
                    <td>${formatDate(registro.fecha_ingreso)}</td>
                    <td>${registro.lote || '-'}</td>
                    <td>${formatDate(registro.fecha_vencimiento)}</td>
                `;
                fragment.appendChild(tr);
            });
        }
        tableBody.appendChild(fragment);
        ocMontoTotal.textContent = `Total OC_MONTO: ${totalOcMonto.toLocaleString('es-CL', { minimumFractionDigits: 0 })}`;
    }

    function updatePagination(total) {
        if (!pageInfo || !totalRecords || !prevBtn || !nextBtn) return;
        const totalPagesFiltered = Math.ceil(total / recordsPerPage);
        pageInfo.textContent = `Página ${currentPage} de ${totalPagesFiltered || 1}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPagesFiltered || totalPagesFiltered === 0;
    }

    async function descargarFormato() {
        try {
            const data = [{
                ID_PACIENT: '',
                PACIENTE: '',
                MEDICO: '',
                FECHA_CIRUGIA: '',
                PROVEEDOR: '',
                CODIGO_CLINICA: '',
                CODIGO_PROVEEDOR: '',
                CANTIDAD: '',
                PRECIO_UNITARIO: '',
                ATRIBUTO: '',
                OC: '',
                OC_MONTO: '',
                ESTADO: '',
                FECHA_RECEPCION: '',
                FECHA_CARGO: '',
                NUMERO_GUIA: '',
                NUMERO_FACTURA: '',
                FECHA_EMISION: '',
                FECHA_INGRESO: '',
                LOTE: '',
                FECHA_VENCIMIENTO: ''
            }];
            const ws = XLSX.utils.json_to_sheet(data);
            ws['!cols'] = [
                { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
                { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
                { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
                { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }
            ];
            const instructions = [
                ['Instrucciones para llenar el formato:'],
                ['1. La primera fila debe contener los encabezados exactos: ID_PACIENT, PACIENTE, MEDICO, ..., FECHA_VENCIMIENTO.'],
                ['2. ID_PACIENT: Identificador único del paciente (texto o número, obligatorio).'],
                ['3. PACIENTE, MEDICO, PROVEEDOR, CODIGO_CLINICA, CODIGO_PROVEEDOR, ATRIBUTO, OC, ESTADO, NUMERO_GUIA, NUMERO_FACTURA, LOTE: Campos de texto.'],
                ['4. CANTIDAD, PRECIO_UNITARIO, OC_MONTO: Números sin caracteres especiales (ejemplo: 1234, no $1.234).'],
                ['5. FECHA_CIRUGIA, FECHA_RECEPCION, FECHA_CARGO, FECHA_EMISION, FECHA_INGRESO: Formato DD-MM-YYYY (ejemplo: 02-07-2025). Pueden dejarse vacíos.'],
                ['6. FECHA_VENCIMIENTO: Puede ser una fecha en formato DD-MM-YYYY (ejemplo: 02-07-2025), texto como "Sin fecha", "PAD", o cualquier otro valor de texto. Puede dejarse vacío.'],
                ['7. Guarde el archivo en formato .xlsx y súbalo usando el botón "Importar".']
            ];
            const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
            wsInstructions['!cols'] = [{ wch: 100 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Formato Datos');
            XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');
            XLSX.writeFile(wb, 'formato_diferencias.xlsx');
        } catch (error) {
            console.error('Error al descargar formato:', error.message);
            showSuccessMessage('Error al descargar formato: ' + error.message, false);
        }
    }

    async function exportarExcel() {
        try {
            showModal(loadingModal, loadingProgress, 0);
            const data = filteredRegistros.map(registro => ({
                ID_PACIENT: registro.id_pacient || '-',
                PACIENTE: registro.paciente || '-',
                MEDICO: registro.medico || '-',
                FECHA_CIRUGIA: formatDate(registro.fecha_cirugia),
                PROVEEDOR: registro.proveedor || '-',
                CODIGO_CLINICA: registro.codigo_clinica || '-',
                CODIGO_PROVEEDOR: registro.codigo_proveedor || '-',
                CANTIDAD: registro.cantidad || 0,
                PRECIO_UNITARIO: registro.precio_unitario || 0,
                ATRIBUTO: registro.atributo || '-',
                OC: registro.oc || '-',
                OC_MONTO: registro.oc_monto || 0,
                ESTADO: registro.estado || '-',
                FECHA_RECEPCION: formatDate(registro.fecha_recepcion),
                FECHA_CARGO: formatDate(registro.fecha_cargo),
                NUMERO_GUIA: registro.numero_guia || '-',
                NUMERO_FACTURA: registro.numero_factura || '-',
                FECHA_EMISION: formatDate(registro.fecha_emision),
                FECHA_INGRESO: formatDate(registro.fecha_ingreso),
                LOTE: registro.lote || '-',
                FECHA_VENCIMIENTO: formatDate(registro.fecha_vencimiento)
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            ws['!cols'] = [
                { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
                { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
                { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
                { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Diferencias');
            XLSX.writeFile(wb, 'diferencias_export.xlsx');
            hideModal(loadingModal);
            showSuccessMessage('Datos exportados correctamente');
        } catch (error) {
            console.error('Error al exportar datos:', error.message);
            showSuccessMessage('Error al exportar datos: ' + error.message, false);
            hideModal(loadingModal);
        }
    }

    async function importarDatos(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;
            showModal(loadingModal, loadingProgress, 0);
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', raw: true });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
                    if (jsonData.length <= 1) {
                        showSuccessMessage('El archivo Excel está vacío o solo contiene encabezados', false);
                        hideModal(loadingModal);
                        return;
                    }

                    const headers = jsonData[0].map(h => h ? h.toString().trim() : '');
                    const expectedHeaders = [
                        'ID_PACIENT', 'PACIENTE', 'MEDICO', 'FECHA_CIRUGIA', 'PROVEEDOR',
                        'CODIGO_CLINICA', 'CODIGO_PROVEEDOR', 'CANTIDAD', 'PRECIO_UNITARIO', 'ATRIBUTO',
                        'OC', 'OC_MONTO', 'ESTADO', 'FECHA_RECEPCION', 'FECHA_CARGO',
                        'NUMERO_GUIA', 'NUMERO_FACTURA', 'FECHA_EMISION', 'FECHA_INGRESO', 'LOTE', 'FECHA_VENCIMIENTO'
                    ];
                    if (!headers.every((h, i) => h === expectedHeaders[i])) {
                        showSuccessMessage('Los encabezados del Excel no coinciden con el formato esperado', false);
                        hideModal(loadingModal);
                        return;
                    }

                    const fullName = await getUserFullName();
                    const now = Timestamp.fromDate(new Date());
                    let batch = writeBatch(db);
                    let processed = 0;
                    let updated = 0;
                    let added = 0;
                    let skippedRows = 0;
                    const batchSize = 500;

                    const registrosCollection = collection(db, 'datos_historico');
                    const querySnapshot = await getDocs(registrosCollection);
                    const existingRecords = new Map();
                    querySnapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.id_pacient) existingRecords.set(data.id_pacient, { docId: doc.id, ...data });
                    });

                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.length === 0 || row.every(cell => !cell || cell.toString().trim() === '')) {
                            skippedRows++;
                            continue;
                        }

                        while (row.length < 21) row.push('');

                        const idPacient = (row[0] || '').toString().trim();
                        if (!idPacient) {
                            skippedRows++;
                            continue;
                        }

                        const registro = {
                            id_pacient: idPacient,
                            paciente: (row[1] || '').toString().trim(),
                            medico: (row[2] || '').toString().trim(),
                            fecha_cirugia: parseCustomDate(row[3]),
                            proveedor: (row[4] || '').toString().trim(),
                            codigo_clinica: (row[5] || '').toString().trim(),
                            codigo_proveedor: (row[6] || '').toString().trim(),
                            cantidad: parseNumber(row[7]),
                            precio_unitario: parseNumber(row[8]),
                            atributo: (row[9] || '').toString().trim(),
                            oc: (row[10] || '').toString().trim(),
                            oc_monto: parseNumber(row[11]),
                            estado: (row[12] || '').toString().trim(),
                            fecha_recepcion: parseCustomDate(row[13]),
                            fecha_cargo: parseCustomDate(row[14]),
                            numero_guia: (row[15] || '').toString().trim(),
                            numero_factura: (row[16] || '').toString().trim(),
                            fecha_emision: parseCustomDate(row[17]),
                            fecha_ingreso: parseCustomDate(row[18]),
                            lote: (row[19] || '').toString().trim(),
                            fecha_vencimiento: parseCustomDate(row[20], true),
                            importOrder: i - 1,
                            fechaCreacion: existingRecords.has(idPacient) ? existingRecords.get(idPacient).fechaCreacion : now,
                            usuario: fullName,
                            lastAction: `Actualizado: ${formatDate(new Date(now.toMillis()))}`,
                            uid: auth.currentUser.uid
                        };

                        const hasData = Object.values(registro).slice(0, 21).some(val => val !== '' && val !== 0 && val !== null);
                        if (!hasData) {
                            skippedRows++;
                            continue;
                        }

                        let logMessage = '';
                        if (existingRecords.has(idPacient)) {
                            const existing = existingRecords.get(idPacient);
                            const changes = [];
                            Object.keys(registro).forEach(key => {
                                if (key !== 'fechaCreacion' && key !== 'lastAction' && key !== 'uid' && key !== 'usuario' && key !== 'importOrder') {
                                    const newValue = registro[key];
                                    const oldValue = existing[key];
                                    if (newValue instanceof Date && oldValue instanceof Date) {
                                        if (newValue.getTime() !== oldValue.getTime()) changes.push(`${key}: ${formatDate(oldValue)} -> ${formatDate(newValue)}`);
                                    } else if (newValue !== oldValue) changes.push(`${key}: ${oldValue || '-'} -> ${newValue || '-'}`);
                                }
                            });

                            if (changes.length > 0) {
                                const registroRef = doc(db, 'datos_historico', existing.docId);
                                batch.update(registroRef, {
                                    ...registro,
                                    lastAction: `Actualizado: ${formatDate(new Date(now.toMillis()))}`
                                });
                                const logRef = doc(collection(db, 'datos_historico', existing.docId, 'logs'));
                                batch.set(logRef, {
                                    action: `Actualizado: ${formatDate(new Date(now.toMillis()))}`,
                                    details: `Campos modificados: ${changes.join(', ')}`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: auth.currentUser.uid
                                });
                                updated++;
                            }
                        } else {
                            const registroRef = doc(collection(db, 'datos_historico'));
                            batch.set(registroRef, registro);
                            const logRef = doc(collection(db, 'datos_historico', registroRef.id, 'logs'));
                            batch.set(logRef, {
                                action: `Creado: ${formatDate(new Date(now.toMillis()))}`,
                                details: `Registro importado (ID_PACIENT: ${registro.id_pacient})`,
                                timestamp: now,
                                user: fullName,
                                uid: auth.currentUser.uid
                            });
                            added++;
                        }

                        processed++;
                        const progress = Math.round((processed / (jsonData.length - 1)) * 100);
                        showModal(loadingModal, loadingProgress, progress);

                        if (processed % 500 === 0) {
                            await batch.commit();
                            batch = writeBatch(db);
                        }
                    }

                    if (processed % 500 !== 0) await batch.commit();

                    hideModal(loadingModal);
                    let message = `Datos importados correctamente (${processed} registros procesados: ${added} nuevos, ${updated} actualizados)`;
                    if (skippedRows > 0) message += `. ${skippedRows} fila(s) vacía(s) o sin ID_PACIENT fueron ignoradas.`;
                    showSuccessMessage(message);
                    importFileInput.value = '';
                } catch (error) {
                    console.error('Error al importar datos:', error.message);
                    showSuccessMessage('Error al importar datos: ' + error.message, false);
                    hideModal(loadingModal);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('Error al procesar archivo:', error.message);
            showSuccessMessage('Error al procesar archivo: ' + error.message, false);
            hideModal(loadingModal);
        }
    }

    async function getUserFullName() {
        const user = auth.currentUser;
        if (!user) throw new Error('No se encontró el usuario autenticado');
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
        return userSnap.data().fullName || 'Usuario Desconocido';
    }

    async function init() {
        if (isInitialized) return;
        isInitialized = true;

        if (!container) {
            console.error('Contenedor .datos-historico-container no encontrado');
            return;
        }

        if (downloadFormatBtn) downloadFormatBtn.addEventListener('click', descargarFormato);
        if (importFileInput) importFileInput.addEventListener('change', importarDatos);
        if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportarExcel);
        if (prevBtn) prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable(filteredRegistros);
                updatePagination(filteredRegistros.length);
            }
        });
        if (nextBtn) nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable(filteredRegistros);
                updatePagination(filteredRegistros.length);
            }
        });
        if (yearFilter) yearFilter.addEventListener('change', () => {
            populateMonthFilter(yearFilter.value);
            applyFilters();
        });
        if (monthFilter) monthFilter.addEventListener('change', applyFilters);
        if (providerFilter) providerFilter.addEventListener('change', () => {
            applyFilters();
            displayEmpresaRut(providerFilter.value);
        });

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                console.error('No hay usuario autenticado');
                container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión.</p>';
                setTimeout(() => window.location.href = 'index.html?error=auth-required', 2000);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    console.error('Documento de usuario no encontrado');
                    container.innerHTML = '<p>Error: Tu cuenta no está registrada. Contacta al administrador.</p>';
                    return;
                }

                const userData = userDoc.data();
                const hasAccess = userData.role === 'Administrador' || (userData.permissions && userData.permissions.includes('Tablas:Historico'));
                if (!hasAccess) {
                    console.error('Acceso denegado');
                    container.innerHTML = '<p>Acceso denegado. No tienes permisos para este módulo.</p>';
                    return;
                }

                currentUser = user;
                await loadRegistros();
                setupRealtimeUpdates();
            } catch (error) {
                console.error('Error en verificación de usuario:', error.message);
                container.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => init());
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(() => init(), 1);
} catch (error) {
    console.error('Error al inicializar Firebase:', error.message);
    const container = document.querySelector('.datos-historico-container');
    if (container) container.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;

}
