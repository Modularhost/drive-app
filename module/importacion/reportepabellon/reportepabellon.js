import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, updateDoc, getDocs, query, where, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm';

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
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(error => {
    console.error('Error al configurar persistencia:', error);
});

const filterYear = document.getElementById('filter-year');
const filterMonth = document.getElementById('filter-month');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const downloadFormatBtn = document.getElementById('download-format-btn');
const exportBtn = document.getElementById('export-btn');
const table = document.getElementById('reporte-pabellon-table');
const tableBody = table.querySelector('tbody');
const totalRecords = document.getElementById('total-records');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const loadingModal = document.getElementById('loading-import-modal');
const importProgress = document.getElementById('import-progress');
const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

let filters = Array(16).fill('');
let columnWidths = Array(table.querySelectorAll('th').length).fill('150px');
const tableContainer = document.querySelector('.table-container');

function formatDate(timestamp) {
    if (!timestamp) return '';
    let date;
    if (timestamp instanceof Date) {
        date = timestamp;
    } else if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else {
        return '';
    }
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function showSuccessModal(message, isError = false) {
    successIcon.className = `fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}`;
    successMessage.textContent = message;
    successModal.className = `modal ${isError ? 'error' : 'success'}`;
    successModal.style.display = 'flex';
    setTimeout(() => {
        successModal.style.display = 'none';
    }, 3000);
}

function showImportModal(percentage) {
    loadingModal.style.display = 'flex';
    importProgress.textContent = `${percentage}%`;
}

function hideImportModal() {
    loadingModal.style.display = 'none';
}

function updateFilterIcons() {
    const filterIcons = document.querySelectorAll('.filter-icon');
    filterIcons.forEach(icon => {
        const columnIndex = parseInt(icon.getAttribute('data-column-index'));
        const th = icon.parentElement;
        if (filters[columnIndex]) {
            icon.classList.add('filter-active');
            th.classList.add('filter-active');
            th.title = `Filtro: ${filters[columnIndex]}`;
        } else {
            icon.classList.remove('filter-active');
            th.classList.remove('filter-active');
            th.title = '';
        }
    });
}

function createFilterContainer(columnIndex, th, icon) {
    const container = document.createElement('div');
    container.className = 'filter-container';

    // Crear botón "Borrar Filtro"
    const clearButton = document.createElement('button');
    clearButton.className = 'clear-filter-button';
    clearButton.textContent = 'Borrar Filtro';
    clearButton.disabled = !filters[columnIndex]; // Deshabilitar si no hay filtro
    clearButton.addEventListener('click', () => {
        filters[columnIndex] = '';
        loadReportData();
        closeAllFilters();
    });
    container.appendChild(clearButton);

    // Crear label "Filtrar por:"
    const containerLabel = document.createElement('label');
    containerLabel.className = 'filter-label';
    containerLabel.textContent = 'Filtrar por:';
    container.appendChild(containerLabel);

    // Crear campo de texto para búsqueda
    const input = document.createElement('input');
    input.type = 'text';
    input.value = filters[columnIndex] || '';
    input.placeholder = `Filtrar ${th.querySelector('.column-title').textContent.trim()}...`;
    container.appendChild(input);

    // Posicionar el contenedor
    const iconRect = icon.getBoundingClientRect();
    const tableRect = tableContainer.getBoundingClientRect();
    const thRect = th.getBoundingClientRect();
    const topPosition = iconRect.bottom - tableRect.top + tableContainer.scrollTop + 2;
    const leftPosition = iconRect.left - tableRect.left + tableContainer.scrollLeft;
    container.style.top = `${topPosition}px`;
    container.style.left = `${leftPosition}px`;
    container.style.width = `${Math.min(thRect.width - 12, 200)}px`;

    // Configurar eventos del campo de texto
    let timeout;
    input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            filters[columnIndex] = input.value.trim();
            loadReportData();
            clearButton.disabled = !filters[columnIndex]; // Actualizar estado del botón
        }, 300);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            filters[columnIndex] = input.value.trim();
            loadReportData();
            closeAllFilters();
        } else if (e.key === 'Escape') {
            closeAllFilters();
        }
    });

    return container;
}

function closeAllFilters() {
    document.querySelectorAll('.filter-container').forEach(container => {
        container.remove();
    });
    updateFilterIcons(); // Actualizar íconos y estado de los encabezados
}

async function logAction(reporteId, action, data = {}) {
    try {
        await addDoc(collection(db, `reportesPabellon/${reporteId}/logs`), {
            action,
            timestamp: serverTimestamp(),
            uid: auth.currentUser.uid,
            data
        });
    } catch (error) {
        console.error('Error logging action:', error);
    }
}

async function loadYearsAndMonths() {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuario no autenticado');

        const reportesQuery = query(
            collection(db, 'reportesPabellon'),
            where('uid', '==', user.uid)
        );
        const reportesSnapshot = await getDocs(reportesQuery);
        const years = new Set();
        const yearMonths = {};

        reportesSnapshot.forEach(doc => {
            const reporte = doc.data();
            if (reporte.fecha) {
                const date = reporte.fecha.toDate ? reporte.fecha.toDate() : new Date(reporte.fecha);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = date.getMonth();
                    years.add(year);
                    if (!yearMonths[year]) yearMonths[year] = new Set();
                    yearMonths[year].add(month);
                }
            }
        });

        filterYear.innerHTML = '<option value="">Todos</option>';
        const sortedYears = [...years].sort();
        sortedYears.forEach(year => {
            const opt = document.createElement('option');
            opt.value = year;
            opt.textContent = year;
            filterYear.appendChild(opt);
        });

        const currentYear = new Date().getFullYear();
        if (years.has(currentYear)) {
            filterYear.value = currentYear;
        } else {
            filterYear.value = '';
        }

        const updateMonths = () => {
            const selectedYear = filterYear.value;
            filterMonth.innerHTML = '<option value="">Todos</option>';
            if (selectedYear && yearMonths[selectedYear]) {
                [...yearMonths[selectedYear]].sort().forEach(month => {
                    const opt = document.createElement('option');
                    opt.value = month;
                    opt.textContent = meses[month];
                    filterMonth.appendChild(opt);
                });
            }
            filterMonth.value = ''; // Ensure month is empty by default
            loadReportData();
        };

        filterYear.addEventListener('change', updateMonths);
        filterMonth.addEventListener('change', loadReportData);

        updateMonths();
    } catch (error) {
        console.error('Error loading years:', error);
        showSuccessModal('Error al cargar filtros de año/mes.', true);
    }
}

async function loadReportData() {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuario no autenticado');

        let reportesQuery = query(
            collection(db, 'reportesPabellon'),
            where('uid', '==', user.uid)
        );

        let selectedYear = filterYear.value;
        let selectedMonth = filterMonth.value;

        // If no month is selected, show empty table
        if (!selectedMonth) {
            tableBody.innerHTML = `<tr class="no-records"><td colspan="16">Seleccione un mes para ver los registros</td></tr>`;
            totalRecords.textContent = '0 registros';
            updateColumnWidths();
            updateFilterIcons();
            return;
        }

        const reportesSnapshot = await getDocs(reportesQuery);
        let reportes = [];

        reportesSnapshot.forEach(doc => {
            const reporte = { id: doc.id, ...doc.data() };
            const fechaDate = reporte.fecha?.toDate ? reporte.fecha.toDate() : new Date(reporte.fecha);
            if (isNaN(fechaDate.getTime())) return;

            const year = fechaDate.getFullYear();
            const month = fechaDate.getMonth();

            if (selectedYear && year.toString() !== selectedYear) return;
            if (selectedMonth !== '' && month.toString() !== selectedMonth) return;

            const rowData = [
                formatDate(reporte.fecha),
                reporte.dia || '',
                reporte.mes || '',
                reporte.codArticulo || '',
                reporte.descripcion || '',
                reporte.admision || '',
                reporte.rut || '',
                reporte.paciente || '',
                reporte.edad || '',
                reporte.prevision || '',
                reporte.isapre || '',
                reporte.convenio || '',
                reporte.codArancel || '',
                reporte.arancel || '',
                reporte.cantArt || '',
                reporte.primerCirujano || ''
            ];

            if (filters.every((filterValue, index) => {
                if (!filterValue) return true;
                return rowData[index]?.toString().toLowerCase().includes(filterValue.toLowerCase());
            })) {
                reportes.push(reporte);
            }
        });

        // Ordenar reportes por fecha de menor a mayor
        reportes.sort((a, b) => a.fecha.toDate().getTime() - b.fecha.toDate().getTime());

        tableBody.innerHTML = '';
        if (reportes.length === 0) {
            tableBody.innerHTML = `<tr class="no-records"><td colspan="16">Sin registros para el mes</td></tr>`;
        } else {
            reportes.forEach(reporte => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatDate(reporte.fecha)}</td>
                    <td>${reporte.dia || ''}</td>
                    <td>${reporte.mes || ''}</td>
                    <td>${reporte.codArticulo || ''}</td>
                    <td>${reporte.descripcion || ''}</td>
                    <td>${reporte.admision || ''}</td>
                    <td>${reporte.rut || ''}</td>
                    <td>${reporte.paciente || ''}</td>
                    <td>${reporte.edad || ''}</td>
                    <td>${reporte.prevision || ''}</td>
                    <td>${reporte.isapre || ''}</td>
                    <td>${reporte.convenio || ''}</td>
                    <td>${reporte.codArancel || ''}</td>
                    <td>${reporte.arancel || ''}</td>
                    <td>${reporte.cantArt || ''}</td>
                    <td>${reporte.primerCirujano || ''}</td>
                `;
                tableBody.appendChild(row);
            });
        }

        totalRecords.textContent = `${reportes.length} registros`;
        updateColumnWidths();

        const filterIcons = document.querySelectorAll('.filter-icon');
        filterIcons.forEach((icon, index) => {
            icon.removeEventListener('click', icon._clickHandler);
            icon._clickHandler = (e) => {
                e.stopPropagation();
                const columnIndex = parseInt(icon.getAttribute('data-column-index'));
                const th = icon.parentElement;

                closeAllFilters();

                const container = createFilterContainer(columnIndex, th, icon);
                tableContainer.appendChild(container);
                container.style.display = 'block';
                container.querySelector('input').focus();
            };
            icon.addEventListener('click', icon._clickHandler);
        });

        document.removeEventListener('click', document._clickHandler);
        document._clickHandler = (e) => {
            if (!e.target.closest('.filter-container') && !e.target.classList.contains('filter-icon')) {
                closeAllFilters();
            }
        };
        document.addEventListener('click', document._clickHandler);

        updateFilterIcons();
    } catch (error) {
        console.error('Error al cargar reportes:', error);
        showSuccessModal(`Error al cargar reportes: ${error.message}`, true);
    }
}

function updateColumnWidths() {
    const headers = table.querySelectorAll('th');
    const rows = table.querySelectorAll('tbody tr');

    headers.forEach((th, index) => {
        th.style.width = columnWidths[index];
    });

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach((td, index) => {
            td.style.width = columnWidths[index];
        });
    });
}

function initResize() {
    const headers = table.querySelectorAll('th');
    headers.forEach((th, index) => {
        const handle = th.querySelector('.resize-handle');
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = th.offsetWidth;

            const onMouseMove = (moveEvent) => {
                const newWidth = startWidth + (moveEvent.clientX - startX);
                if (newWidth >= 100 && newWidth <= 400) {
                    columnWidths[index] = `${newWidth}px`;
                    updateColumnWidths();
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

function downloadFormat() {
    const headers = [
        'Fecha', 'Día', 'Mes', 'Cod.Artículo', 'Descripción', 'Admisión', 'Rut', 'Paciente',
        'Edad', 'Previsión', 'Isapre', 'Convenio', 'Cód.Arancel', 'Arancel', 'Cant.Art.', '1° Cirujano'
    ];
    const exampleRow = [
        '2025-01-02', 'Lunes', 'Enero', 'ART123', 'Cirugía General', 'ADM456', '12345678-9', 'Juan Pérez',
        '45', 'FONASA', 'Isapre Ejemplo', 'Conv123', 'ARAN456', '50000', '2', 'Dr. García'
    ];
    const data = [headers, exampleRow];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Formato');
    XLSX.writeFile(wb, 'formato_reporte_pabellon.xlsx');
}

async function importReportes(file) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuario no autenticado');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                showImportModal(0);
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                if (json.length === 0) {
                    throw new Error('El archivo Excel está vacío.');
                }

                let headerRowIndex = -1;
                const expectedHeaders = [
                    'Fecha', 'Día', 'Mes', 'Cod.Artículo', 'Descripción', 'Admisión', 'Rut', 'Paciente',
                    'Edad', 'Previsión', 'Isapre', 'Convenio', 'Cód.Arancel', 'Arancel', 'Cant.Art.', '1° Cirujano'
                ];
                for (let i = 0; i < json.length; i++) {
                    if (json[i].join(',').toLowerCase().includes('fecha')) {
                        headerRowIndex = i;
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    throw new Error('No se encontraron los encabezados esperados en el archivo.');
                }

                const dataRows = XLSX.utils.sheet_to_json(sheet, { header: expectedHeaders, range: headerRowIndex });
                if (dataRows.length === 0) {
                    throw new Error('No se encontraron datos válidos en el archivo.');
                }

                const existingReportes = {};
                const reportesSnapshot = await getDocs(query(collection(db, 'reportesPabellon'), where('uid', '==', user.uid)));
                reportesSnapshot.forEach(doc => {
                    const reporte = doc.data();
                    existingReportes[formatDate(reporte.fecha) + reporte.admision] = { id: doc.id, ...reporte };
                });

                let created = 0, updated = 0;
                const totalRows = dataRows.length;

                for (let i = 0; i < dataRows.length; i++) {
                    const item = dataRows[i];
                    const progress = Math.round(((i + 1) / totalRows) * 100);
                    showImportModal(progress);

                    if (!item.Fecha || !item.Admisión) {
                        console.warn('Fila omitida por Fecha o Admisión vacíos:', item);
                        continue;
                    }

                    const fechaDate = item.Fecha ? (item.Fecha instanceof Date ? item.Fecha : new Date(item.Fecha)) : null;
                    if (!fechaDate || isNaN(fechaDate.getTime())) {
                        console.warn('Fecha inválida:', item.Fecha);
                        continue;
                    }

                    const reporteData = {
                        fecha: Timestamp.fromDate(fechaDate),
                        dia: item.Día?.toString().trim() || '',
                        mes: item.Mes?.toString().trim() || '',
                        codArticulo: item['Cod.Artículo']?.toString().trim() || '',
                        descripcion: item.Descripción?.toString().trim() || '',
                        admision: item.Admisión?.toString().trim() || '',
                        rut: item.Rut?.toString().trim() || '',
                        paciente: item.Paciente?.toString().trim() || '',
                        edad: item.Edad ? item.Edad.toString().trim() : '',
                        prevision: item.Previsión?.toString().trim() || '',
                        isapre: item.Isapre?.toString().trim() || '',
                        convenio: item.Convenio?.toString().trim() || '',
                        codArancel: item['Cód.Arancel']?.toString().trim() || '',
                        arancel: item.Arancel ? Math.floor(parseFloat(item.Arancel)) || 0 : 0,
                        cantArt: item['Cant.Art.'] ? Math.floor(parseFloat(item['Cant.Art.'])) || 0 : 0,
                        primerCirujano: item['1° Cirujano']?.toString().trim() || '',
                        uid: user.uid
                    };

                    const key = formatDate(reporteData.fecha) + reporteData.admision;
                    const existing = existingReportes[key];
                    if (existing) {
                        const changes = {};
                        for (const key in reporteData) {
                            let existingValue = existing[key];
                            let newValue = reporteData[key];
                            if (key === 'fecha') {
                                existingValue = existingValue?.toDate?.().getTime();
                                newValue = newValue?.toDate?.().getTime();
                            }
                            if (JSON.stringify(newValue) !== JSON.stringify(existingValue)) {
                                changes[key] = reporteData[key];
                            }
                        }
                        if (Object.keys(changes).length > 0) {
                            const reporteRef = doc(db, 'reportesPabellon', existing.id);
                            await updateDoc(reporteRef, changes);
                            await logAction(existing.id, 'update', changes);
                            updated++;
                        }
                    } else {
                        const reporteRef = await addDoc(collection(db, 'reportesPabellon'), reporteData);
                        await logAction(reporteRef.id, 'create', reporteData);
                        created++;
                    }
                }

                hideImportModal();
                if (created === 0 && updated === 0) {
                    showSuccessModal('No se importaron datos. Verifique el formato del archivo.', true);
                } else {
                    showSuccessModal(`Importación exitosa: ${created} creados, ${updated} actualizados`);
                }
                loadYearsAndMonths();
                loadReportData();
            } catch (error) {
                console.error('Error al procesar el archivo:', error);
                hideImportModal();
                showSuccessModal(`Error al procesar el archivo: ${error.message}`, true);
            }
        };
        reader.readAsArrayBuffer(file);
    } catch (error) {
        console.error('Error al importar reportes:', error);
        hideImportModal();
        showSuccessModal(`Error al importar reportes: ${error.message}`, true);
    }
}

importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', (e) => {
    if (e.target.files[0]) {
        importReportes(e.target.files[0]);
        e.target.value = '';
    }
});

downloadFormatBtn.addEventListener('click', downloadFormat);

exportBtn.addEventListener('click', async () => {
    try {
        const reportes = [];
        const rows = tableBody.querySelectorAll('tr:not(.no-records)');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            reportes.push({
                Fecha: cells[0]?.textContent || '',
                Día: cells[1]?.textContent || '',
                Mes: cells[2]?.textContent || '',
                'Cod.Artículo': cells[3]?.textContent || '',
                Descripción: cells[4]?.textContent || '',
                Admisión: cells[5]?.textContent || '',
                Rut: cells[6]?.textContent || '',
                Paciente: cells[7]?.textContent || '',
                Edad: cells[8]?.textContent || '',
                Previsión: cells[9]?.textContent || '',
                Isapre: cells[10]?.textContent || '',
                Convenio: cells[11]?.textContent || '',
                'Cód.Arancel': cells[12]?.textContent || '',
                Arancel: cells[13]?.textContent || '',
                'Cant.Art.': cells[14]?.textContent || '',
                '1° Cirujano': cells[15]?.textContent || ''
            });
        });

        const ws = XLSX.utils.json_to_sheet(reportes);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte Pabellon');
        XLSX.writeFile(wb, 'reporte_pabellon.xlsx');
    } catch (error) {
        console.error('Error al exportar datos:', error);
        showSuccessModal('Error al exportar reportes.', true);
    }
});

onAuthStateChanged(auth, user => {
    if (user) {
        loadYearsAndMonths();
        initResize();
    } else {
        showSuccessModal('Usuario no autenticado. Por favor, inicia sesión.', true);
    }
});

window.addEventListener('moduleCleanup', () => {
    successModal.style.display = 'none';
    loadingModal.style.display = 'none';

});
