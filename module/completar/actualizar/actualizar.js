document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('implantes-table');
    const thElements = table?.querySelectorAll('th');

    if (!table || thElements.length === 0) {
        console.warn('Tabla o encabezados no encontrados. Verifica que #implantes-table y sus <th> existan en el DOM.');
        return;
    }

    thElements.forEach((th, index) => {
        if (index === 0) return; 
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        th.style.position = 'relative';
        th.appendChild(resizeHandle);

        let startX, startWidth;
        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startX = e.clientX;
            startWidth = parseFloat(getComputedStyle(th).width) || th.getBoundingClientRect().width;
            resizeHandle.classList.add('active');

            const onMouseMove = (e) => {
                const newWidth = Math.max(50, Math.min(500, startWidth + (e.clientX - startX)));
                th.style.width = `${newWidth}px`;
                th.style.minWidth = `${newWidth}px`;
                document.querySelectorAll(`#implantes-table td:nth-child(${index + 1})`).forEach(cell => {
                    cell.style.width = `${newWidth}px`;
                    cell.style.minWidth = `${newWidth}px`;
                });
            };

            const onMouseUp = () => {
                resizeHandle.classList.remove('active');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
});

import { getFirestore, collection, getDocs, query, where, addDoc, getDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getApps, initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

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

    const editModal = document.getElementById('edit-modal');
    const editFechaIngresoInput = document.getElementById('edit-fecha-ingreso');
    const editAtributoInput = document.getElementById('edit-atributo');
    const editPrevisionInput = document.getElementById('edit-prevision');
    const editConvenioInput = document.getElementById('edit-convenio');
    const editAdmisionInput = document.getElementById('edit-admisión');
    const editNombrePacienteInput = document.getElementById('edit-nombrePaciente');
    const editMedicoInput = document.getElementById('edit-medico');
    const editMedicoSearch = document.getElementById('edit-medico-search');
    const editMedicoList = document.getElementById('edit-medico-list');
    const editFechaCXInput = document.getElementById('edit-fechaCX');
    const editProveedorInput = document.getElementById('edit-proveedor');
    const editProveedorSearch = document.getElementById('edit-proveedor-search');
    const editProveedorList = document.getElementById('edit-proveedor-list');
    const editEstadoSelect = document.getElementById('edit-estado');
    const editFechaCargoInput = document.getElementById('edit-fecha-cargo');
    const editInformeSelect = document.getElementById('edit-informe');
    const editTotalCotizacionInput = document.getElementById('edit-total-cotizacion');
    const filterYearSelect = document.getElementById('filter-year');
    const filterMonthSelect = document.getElementById('filter-month');
    const estadoButtonsContainer = document.getElementById('estado-buttons');
    const loadingModal = document.getElementById('loading-modal');
    const messageContainer = document.getElementById('message-container');
    const downloadTemplateBtn = document.getElementById('download-template-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file');

    const elements = {
        editModal,
        editFechaIngresoInput,
        editAtributoInput,
        editPrevisionInput,
        editConvenioInput,
        editAdmisionInput,
        editNombrePacienteInput,
        editMedicoInput,
        editMedicoSearch,
        editMedicoList,
        editFechaCXInput,
        editProveedorInput,
        editProveedorSearch,
        editProveedorList,
        editEstadoSelect,
        editFechaCargoInput,
        editInformeSelect,
        editTotalCotizacionInput,
        filterYearSelect,
        filterMonthSelect,
        estadoButtonsContainer,
        loadingModal,
        messageContainer,
        downloadTemplateBtn,
        importBtn,
        importFileInput
    };

    Object.entries(elements).forEach(([key, el]) => {
        if (!el) console.warn(`Elemento ${key} no encontrado en el DOM`);
    });

    let allImplantes = [];
    let selectedEstado = '';
    let columnFilters = {};
    let currentRowId = null;
    let currentCell = null;

    function showMessage(messageText, type = 'success') {
        if (!messageContainer) {
            console.error('Contenedor de mensajes no encontrado');
            return;
        }
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = messageText;
        messageContainer.appendChild(message);
        setTimeout(() => {
            message.classList.add('fade-out');
            setTimeout(() => {
                message.remove();
            }, 300);
        }, 3000);
    }

    function formatNumberWithThousands(value) {
        if (!value && value !== 0) return '0';
        const num = parseInt(value.toString().replace(/\D/g, ''), 10);
        if (isNaN(num)) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    function parseNumberWithThousands(value) {
        if (!value) return 0;
        const cleanValue = value.replace(/\./g, '');
        const num = parseInt(cleanValue, 10);
        return isNaN(num) ? 0 : num;
    }

    function setupNumberInputFormatting(input) {
        if (!input) return;
        input.addEventListener('input', () => {
            const cleanValue = input.value.replace(/\D/g, '');
            input.value = formatNumberWithThousands(cleanValue);
        });
        input.addEventListener('blur', () => {
            input.value = formatNumberWithThousands(input.value);
        });
    }

    async function showLoadingModal(show) {
        if (loadingModal) {
            loadingModal.style.display = show ? 'flex' : 'none';
        }
    }

    async function logAction(implanteId, action, data = {}) {
        try {
            await addDoc(collection(db, `pacientesimplantes/${implanteId}/logs`), {
                action,
                timestamp: serverTimestamp(),
                uid: auth.currentUser.uid,
                data
            });
        } catch (error) {
            console.error(`Error logging action: ${error.message}`);
            showMessage(`Error al registrar log: ${error.message}`, 'error');
        }
    }

    async function loadMedicos() {
        const medicosSnapshot = await getDocs(collection(db, 'medicos'));
        const medicos = medicosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return medicos;
    }

    async function loadEmpresas() {
        const empresasSnapshot = await getDocs(collection(db, 'empresas'));
        const empresas = empresasSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return empresas;
    }

    async function loadReporteByAdmision(admision, user) {
        const reportesQuery = query(
            collection(db, 'reportesPabellon'),
            where('uid', '==', user.uid),
            where('admision', '==', admision.trim())
        );
        const reportesSnapshot = await getDocs(reportesQuery);
        if (reportesSnapshot.empty) {
            return null;
        }
        const reporte = reportesSnapshot.docs[0].data();
        return reporte;
    }

    async function loadImplantes() {
        const implantesQuery = query(
            collection(db, 'pacientesimplantes'),
            where('uid', '==', auth.currentUser.uid)
        );
        const implantesSnapshot = await getDocs(implantesQuery);
        const implantes = implantesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return implantes;
    }

    async function loadLogs(implanteId) {
        const logsQuery = query(collection(db, `pacientesimplantes/${implanteId}/logs`));
        const logsSnapshot = await getDocs(logsQuery);
        const logs = logsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return logs;
    }

    async function updateCargosimpTotalCotizacion(admision, proveedor, totalCotizacion) {
        try {
            const cargosQuery = query(
                collection(db, 'cargosimp'),
                where('admision', '==', admision.trim()),
                where('proveedor', '==', proveedor.trim()),
                where('uid', '==', auth.currentUser.uid)
            );
            const cargosSnapshot = await getDocs(cargosQuery);
            if (!cargosSnapshot.empty) {
                for (const cargoDoc of cargosSnapshot.docs) {
                    await updateDoc(doc(db, 'cargosimp', cargoDoc.id), {
                        totalCotizacion: totalCotizacion,
                        updatedAt: serverTimestamp()
                    });
                    await logAction(cargoDoc.id, 'update', { totalCotizacion: totalCotizacion });
                }
            }
        } catch (error) {
            console.error(`Error updating cargosimp totalCotizacion: ${error.message}`);
            showMessage(`Error al actualizar totalCotizacion en cargosimp: ${error.message}`, 'error');
        }
    }

    function formatDate(date, withTime = false) {
        if (!date) return 'Sin fecha';
        let d;
        if (date instanceof Timestamp) {
            d = date.toDate();
        } else if (date instanceof Date) {
            d = date;
        } else if (typeof date === 'string') {
            const [year, month, day] = date.split('-').map(Number);
            d = new Date(year, month - 1, day);
        } else {
            return 'Sin fecha';
        }
        if (isNaN(d.getTime())) return 'Sin fecha';
        d.setHours(0, 0, 0, 0);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        if (withTime) {
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        }
        return `${day}/${month}/${year}`;
    }

    function parseCSVDate(dateString) {
        if (!dateString) return null;
        const normalizedDate = dateString.replace(/-/g, '/');
        const [day, month, year] = normalizedDate.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
    }

    function getYearsAndMonths(implantes) {
        const years = new Set([new Date().getFullYear()]);
        const monthsByYear = {};
        implantes.forEach(implante => {
            if (implante.fechaCX instanceof Timestamp && !isNaN(implante.fechaCX.toDate().getTime())) {
                const date = implante.fechaCX.toDate();
                date.setHours(0, 0, 0, 0);
                const year = date.getFullYear();
                const month = date.getMonth() + 1;
                years.add(year);
                if (!monthsByYear[year]) {
                    monthsByYear[year] = new Set();
                }
                monthsByYear[year].add(month);
            }
        });
        return {
            years: Array.from(years).sort((a, b) => b - a),
            monthsByYear: Object.fromEntries(
                Object.entries(monthsByYear).map(([year, months]) => [year, Array.from(months).sort((a, b) => a - b)])
            )
        };
    }

    function getUniqueEstados(implantes) {
        const estados = new Set(implantes.map(implante => implante.estado || 'Sin estado'));
        return Array.from(estados).sort();
    }

    function populateYearFilter(years) {
        if (!filterYearSelect) return;
        filterYearSelect.innerHTML = '<option value="all">Todos</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            filterYearSelect.appendChild(option);
        });
        const currentYear = new Date().getFullYear();
        filterYearSelect.value = years.includes(currentYear) ? currentYear.toString() : 'all';
    }

    function populateMonthFilter(months, selectedMonth = '') {
        if (!filterMonthSelect) return;
        const monthNames = [
            { value: '1', name: 'Enero' },
            { value: '2', name: 'Febrero' },
            { value: '3', name: 'Marzo' },
            { value: '4', name: 'Abril' },
            { value: '5', name: 'Mayo' },
            { value: '6', name: 'Junio' },
            { value: '7', name: 'Julio' },
            { value: '8', name: 'Agosto' },
            { value: '9', name: 'Septiembre' },
            { value: '10', name: 'Octubre' },
            { value: '11', name: 'Noviembre' },
            { value: '12', name: 'Diciembre' }
        ];
        const validMonths = Array.isArray(months) ? months : [];
        filterMonthSelect.innerHTML = `
            <option value="" disabled ${!selectedMonth ? 'selected' : ''}>Seleccione un mes</option>
            ${monthNames
                .filter(month => validMonths.includes(parseInt(month.value)))
                .map(month => `<option value="${month.value}" ${month.value === selectedMonth ? 'selected' : ''}>${month.name}</option>`)
                .join('')}
        `;
        filterMonthSelect.value = validMonths.includes(parseInt(selectedMonth)) ? selectedMonth : '';
    }

    function filterImplantes(implantes, year, month, estado) {
        const invalidFechaCX = [];
        const filtered = implantes.filter(implante => {
            let passesDateFilter = true;
            if (implante.fechaCX instanceof Timestamp && !isNaN(implante.fechaCX.toDate().getTime())) {
                const date = implante.fechaCX.toDate();
                date.setHours(0, 0, 0, 0);
                const implanteYear = date.getFullYear();
                const implanteMonth = date.getMonth() + 1;
                if (year !== 'all' && implanteYear !== parseInt(year)) passesDateFilter = false;
                if (month && implanteMonth !== parseInt(month)) passesDateFilter = false;
            } else {
                invalidFechaCX.push(implante);
                console.warn('Implante con fechaCX inválida:', implante);
            }
            if (!passesDateFilter) return false;
            if (estado && implante.estado !== estado) return false;
            const fields = [
                '', 
                'fechaIngreso',
                'atributo',
                'prevision',
                'convenio',
                'admision',
                'nombrePaciente',
                'medico',
                'fechaCX',
                'proveedor',
                'estado',
                'fechaCargo',
                'informe',
                'totalCotizacion',
                'actions'
            ];
            const passesColumnFilters = Object.entries(columnFilters).every(([index, filterValue]) => {
                if (!filterValue) return true;
                const field = fields[parseInt(index)];
                let value;
                switch (field) {
                    case 'fechaIngreso':
                    case 'fechaCX':
                    case 'fechaCargo':
                        value = formatDate(implante[field], false);
                        break;
                    case 'totalCotizacion':
                        value = formatNumberWithThousands(implante[field]);
                        break;
                    default:
                        value = (implante[field] || '').toString();
                }
                return value.toLowerCase().includes(filterValue.toLowerCase());
            });
            return passesColumnFilters;
        });
        if (invalidFechaCX.length > 0) {
            showMessage(`Advertencia: ${invalidFechaCX.length} implante(s) con fechaCX inválida.`, 'warning');
        }
        return filtered;
    }

    function renderEstadoButtons(implantes) {
        if (!estadoButtonsContainer) return;
        estadoButtonsContainer.innerHTML = '';
        const estados = getUniqueEstados(implantes);
        if (estados.length === 0) {
            estadoButtonsContainer.style.display = 'none';
            return;
        }
        estadoButtonsContainer.style.display = 'flex';
        estados.forEach(estado => {
            const button = document.createElement('button');
            button.className = 'estado-button';
            button.textContent = estado;
            if (estado === selectedEstado) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                selectedEstado = estado === selectedEstado ? '' : estado;
                const selectedYear = filterYearSelect.value || 'all';
                const selectedMonth = filterMonthSelect.value || '';
                const filteredImplantes = filterImplantes(allImplantes, selectedYear, selectedMonth, selectedEstado);
                renderImplantes(filteredImplantes);
                renderEstadoButtons(filteredImplantes);
                updatePagination(filteredImplantes);
            });
            estadoButtonsContainer.appendChild(button);
        });
    }

    function renderImplantes(implantes) {
        const tableBody = document.querySelector('#implantes-table tbody');
        if (!tableBody) {
            console.error('No se encontró el tbody de #implantes-table');
            return;
        }
        tableBody.innerHTML = '';
        if (implantes.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="15" class="text-center">No hay datos para mostrar. Seleccione un mes para ver los implantes.</td></tr>';
            return;
        }
        const sortedImplantes = implantes.sort((a, b) => {
            const dateA = a.fechaCX instanceof Timestamp ? a.fechaCX.toDate().getTime() : 0;
            const dateB = b.fechaCX instanceof Timestamp ? b.fechaCX.toDate().getTime() : 0;
            if (dateA !== dateB) {
                return dateA - dateB;
            }
            const nameA = (a.nombrePaciente || '').toLowerCase();
            const nameB = (b.nombrePaciente || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        sortedImplantes.forEach(implante => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="row-checkbox" data-id="${implante.id}"></td>
                <td>${formatDate(implante.fechaIngreso, false)}</td>
                <td>${implante.atributo || ''}</td>
                <td>${implante.prevision || ''}</td>
                <td>${implante.convenio || ''}</td>
                <td>${implante.admision || ''}</td>
                <td>${implante.nombrePaciente || ''}</td>
                <td>${implante.medico || ''}</td>
                <td>${formatDate(implante.fechaCX, false)}</td>
                <td>${implante.proveedor || ''}</td>
                <td class="estado-cell">${implante.estado || ''}</td>
                <td>${formatDate(implante.fechaCargo, false)}</td>
                <td class="informe-cell">${implante.informe || ''}</td>
                <td>${formatNumberWithThousands(implante.totalCotizacion)}</td>
                <td>
                    <i class="fas fa-edit action-icon" data-id="${implante.id}"></i>
                    <i class="fas fa-trash action-icon" data-id="${implante.id}"></i>
                    <i class="fas fa-history action-icon" data-id="${implante.id}"></i>
                </td>
            `;
            tableBody.appendChild(row);
        });
        document.querySelectorAll('.fa-edit').forEach(icon => {
            icon.addEventListener('click', () => editImplante(icon.dataset.id));
        });
        document.querySelectorAll('.fa-trash').forEach(icon => {
            icon.addEventListener('click', () => showDeleteModal(icon.dataset.id));
        });
        document.querySelectorAll('.fa-history').forEach(icon => {
            icon.addEventListener('click', () => showLogModal(icon.dataset.id));
        });
        setupCheckboxListeners();
        setupDoubleClickListeners();
        initializeColumnWidths();
        const headers = document.querySelectorAll('#implantes-table th');
        headers.forEach((header, index) => {
            header.classList.toggle('filter-active', !!columnFilters[index]);
            header.title = columnFilters[index] ? `Filtro: ${columnFilters[index]}` : '';
        });
    }

    function setupDoubleClickListeners() {
        document.querySelectorAll('.estado-cell').forEach(cell => {
            cell.addEventListener('dblclick', () => openSingleStatusModal(cell));
        });
        document.querySelectorAll('.informe-cell').forEach(cell => {
            cell.addEventListener('dblclick', () => openSingleInformeModal(cell));
        });
    }

    function openSingleStatusModal(cell) {
        currentRowId = cell.parentElement.querySelector('.row-checkbox').dataset.id;
        currentCell = cell;
        const currentStatus = cell.textContent;
        const select = document.getElementById('single-status-select');
        if (select) {
            select.value = currentStatus || 'Agendando';
            document.getElementById('single-status-modal').style.display = 'flex';
        } else {
            console.error('Selector single-status-select no encontrado');
        }
    }

    function openSingleInformeModal(cell) {
        currentRowId = cell.parentElement.querySelector('.row-checkbox').dataset.id;
        currentCell = cell;
        const currentInforme = cell.textContent;
        const select = document.getElementById('single-informe-select');
        if (select) {
            select.value = currentInforme || '';
            document.getElementById('single-informe-modal').style.display = 'flex';
        } else {
            console.error('Selector single-informe-select no encontrado');
        }
    }

    async function updateSingleStatus() {
        const newStatus = document.getElementById('single-status-select').value;
        if (!newStatus) {
            showMessage('Por favor, seleccione un estado.', 'error');
            return;
        }
        if (!currentRowId || !currentCell) {
            showMessage('Error: No se seleccionó ninguna fila.', 'error');
            return;
        }
        await showLoadingModal(true);
        try {
            const implanteData = {
                estado: newStatus,
                updatedAt: serverTimestamp(),
                uid: auth.currentUser.uid
            };
            await updateDoc(doc(db, 'pacientesimplantes', currentRowId), implanteData);
            await logAction(currentRowId, 'update', { estado: newStatus });
            currentCell.textContent = newStatus;
            showMessage('Estado actualizado exitosamente.', 'success');
            document.getElementById('single-status-modal').style.display = 'none';
            await loadAndRenderImplantes(true);
        } catch (error) {
            showMessage(`Error al actualizar estado: ${error.message}`, 'error');
        } finally {
            currentRowId = null;
            currentCell = null;
            await showLoadingModal(false);
        }
    }

    async function updateSingleInforme() {
        const newInforme = document.getElementById('single-informe-select').value;
        if (!newInforme) {
            showMessage('Por favor, seleccione una opción para Informe.', 'error');
            return;
        }
        if (!currentRowId || !currentCell) {
            showMessage('Error: No se seleccionó ninguna fila.', 'error');
            return;
        }
        await showLoadingModal(true);
        try {
            const implanteData = {
                informe: newInforme,
                updatedAt: serverTimestamp(),
                uid: auth.currentUser.uid
            };
            await updateDoc(doc(db, 'pacientesimplantes', currentRowId), implanteData);
            await logAction(currentRowId, 'update', { informe: newInforme });
            currentCell.textContent = newInforme;
            showMessage('Informe actualizado exitosamente.', 'success');
            document.getElementById('single-informe-modal').style.display = 'none';
            await loadAndRenderImplantes(true);
        } catch (error) {
            showMessage(`Error al actualizar informe: ${error.message}`, 'error');
        } finally {
            currentRowId = null;
            currentCell = null;
            await showLoadingModal(false);
        }
    }

    function toggleMassStatusButton() {
        let massStatusButton = document.getElementById('mass-status-button');
        const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        const filterContainer = document.querySelector('.filter-container-main');
        if (!filterContainer) {
            console.error('Contenedor de filtros (.filter-container-main) no encontrado');
            return;
        }
        if (selectedCheckboxes.length > 0) {
            if (!massStatusButton) {
                massStatusButton = document.createElement('button');
                massStatusButton.id = 'mass-status-button';
                massStatusButton.className = 'estado-button';
                massStatusButton.textContent = 'Estado Masivo';
                massStatusButton.addEventListener('click', showMassStatusModal);
                filterContainer.appendChild(massStatusButton);
            }
            massStatusButton.style.display = 'inline-block';
        } else {
            if (massStatusButton) {
                massStatusButton.style.display = 'none';
            }
        }
    }

    function showMassStatusModal() {
        const modal = document.getElementById('mass-status-modal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.error('Modal mass-status-modal no encontrado');
        }
    }

    async function updateMassStatus() {
        const newStatus = document.getElementById('mass-status-select').value;
        if (!newStatus) {
            showMessage('Por favor, seleccione un estado.', 'error');
            return;
        }
        const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            showMessage('No hay filas seleccionadas.', 'error');
            return;
        }
        await showLoadingModal(true);
        try {
            for (const checkbox of selectedCheckboxes) {
                const implanteId = checkbox.dataset.id;
                const implanteData = {
                    estado: newStatus,
                    updatedAt: serverTimestamp(),
                    uid: auth.currentUser.uid
                };
                await updateDoc(doc(db, 'pacientesimplantes', implanteId), implanteData);
                await logAction(implanteId, 'update', implanteData);
            }
            showMessage('Estados actualizados exitosamente.', 'success');
            document.getElementById('mass-status-modal').style.display = 'none';
            await loadAndRenderImplantes(true);
        } catch (error) {
            showMessage(`Error al actualizar estados: ${error.message}`, 'error');
        } finally {
            await showLoadingModal(false);
        }
    }

    function setupCheckboxListeners() {
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        const rowCheckboxes = document.querySelectorAll('.row-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => {
                const isChecked = selectAllCheckbox.checked;
                rowCheckboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
                toggleMassStatusButton();
            });
        }
        rowCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
                selectAllCheckbox.checked = allChecked;
                toggleMassStatusButton();
            });
        });
    }

    function initializeColumnWidths() {
        const initialWidths = [
            '30px', 
            '80px', 
            '80px', 
            '100px', 
            '100px', 
            '80px', 
            '120px', 
            '120px', 
            '80px', 
            '100px', 
            '100px', 
            '80px', 
            '80px', 
            '80px', 
            '80px' 
        ];
        const headers = document.querySelectorAll('#implantes-table th');
        const tableContainer = document.querySelector('.table-container');
        headers.forEach((header, index) => {
            const width = initialWidths[index] || '100px';
            header.style.width = width;
            header.style.minWidth = width;
            document.querySelectorAll(`#implantes-table td:nth-child(${index + 1})`).forEach(cell => {
                cell.style.width = width;
                cell.style.minWidth = width;
            });
        });
        const table = document.getElementById('implantes-table');
        if (table) {
            table.style.minWidth = initialWidths.reduce((sum, w) => sum + parseInt(w), 0) + 'px';
        }
        setupColumnFilters();
    }

    function setupColumnFilters() {
        const filterIcons = document.querySelectorAll('.filter-icon');
        const tableContainer = document.querySelector('.table-container');
        const headers = document.querySelectorAll('#implantes-table th');
        if (filterIcons.length === 0) {
            console.warn('No se encontraron íconos de filtro (.filter-icon) en el DOM');
        }
        function closeAllFilters() {
            document.querySelectorAll('.filter-container').forEach(container => {
                container.remove();
            });
        }
        filterIcons.forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const columnIndex = parseInt(icon.getAttribute('data-column'));
                const th = icon.parentElement;
                const existingContainer = document.querySelector('.filter-container');
                if (existingContainer) {
                    closeAllFilters();
                    return;
                }
                const container = document.createElement('div');
                container.className = 'filter-container';
                const input = document.createElement('input');
                input.type = 'text';
                input.value = columnFilters[columnIndex] || '';
                input.placeholder = `Filtrar ${th.textContent.trim()}...`;
                container.appendChild(input);
                const iconRect = icon.getBoundingClientRect();
                const tableRect = tableContainer.getBoundingClientRect();
                const thRect = th.getBoundingClientRect();
                const topPosition = iconRect.bottom - tableRect.top + tableContainer.scrollTop + 2;
                const leftPosition = iconRect.left - tableRect.left + tableContainer.scrollLeft;
                container.style.top = `${topPosition}px`;
                container.style.left = `${leftPosition}px`;
                container.style.width = `${Math.min(thRect.width - 12, 200)}px`;
                let timeout;
                input.addEventListener('input', () => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        columnFilters[columnIndex] = input.value.trim();
                        const selectedYear = filterYearSelect.value || 'all';
                        const selectedMonth = filterMonthSelect.value || '';
                        const filteredImplantes = filterImplantes(allImplantes, selectedYear, selectedMonth, selectedEstado);
                        renderImplantes(filteredImplantes);
                        renderEstadoButtons(filteredImplantes);
                        updatePagination(filteredImplantes);
                        headers.forEach((header, idx) => {
                            header.classList.toggle('filter-active', !!columnFilters[idx]);
                            header.title = columnFilters[idx] ? `Filtro: ${columnFilters[idx]}` : '';
                        });
                    }, 300);
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        columnFilters[columnIndex] = input.value.trim();
                        const selectedYear = filterYearSelect.value || 'all';
                        const selectedMonth = filterMonthSelect.value || '';
                        const filteredImplantes = filterImplantes(allImplantes, selectedYear, selectedMonth, selectedEstado);
                        renderImplantes(filteredImplantes);
                        renderEstadoButtons(filteredImplantes);
                        updatePagination(filteredImplantes);
                        headers.forEach((header, idx) => {
                            header.classList.toggle('filter-active', !!columnFilters[idx]);
                            header.title = columnFilters[idx] ? `Filtro: ${columnFilters[idx]}` : '';
                        });
                        closeAllFilters();
                    } else if (e.key === 'Escape') {
                        closeAllFilters();
                    }
                });
                tableContainer.appendChild(container);
                container.style.display = 'block';
                container.querySelector('input').focus();
            });
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-container') && !e.target.classList.contains('filter-icon')) {
                closeAllFilters();
            }
        });
    }

    async function loadAndRenderImplantes(preserveFilters = false, showAllAfterImport = false) {
        await showLoadingModal(true);
        try {
            allImplantes = await loadImplantes();
            const { years, monthsByYear } = getYearsAndMonths(allImplantes);
            let selectedYear, selectedMonth;
            if (!preserveFilters || showAllAfterImport) {
                populateYearFilter(years);
                selectedYear = 'all';
                filterYearSelect.value = 'all';
                populateMonthFilter(monthsByYear[selectedYear] || []);
                selectedMonth = '';
                filterMonthSelect.value = '';
                selectedEstado = '';
                columnFilters = {};
            } else {
                selectedYear = filterYearSelect?.value || 'all';
                selectedMonth = filterMonthSelect?.value || '';
                populateMonthFilter(monthsByYear[selectedYear] || [], selectedMonth);
                filterMonthSelect.value = (selectedMonth && monthsByYear[selectedYear]?.includes(parseInt(selectedMonth))) ? selectedMonth : '';
                selectedMonth = filterMonthSelect.value || '';
            }
            const filteredImplantes = filterImplantes(allImplantes, selectedYear, selectedMonth, selectedEstado);
            renderImplantes(filteredImplantes);
            renderEstadoButtons(filteredImplantes);
            updatePagination(filteredImplantes);
        } catch (error) {
            console.error('Error al cargar implantes:', error);
            showMessage(`Error al cargar implantes: ${error.message}`, 'error');
        } finally {
            await showLoadingModal(false);
        }
    }

    function updatePagination(implantes) {
        const pageInfo = document.getElementById('page-info');
        const prevButton = document.getElementById('prev-page-btn');
        const nextButton = document.getElementById('next-page-btn');
        if (!pageInfo || !prevButton || !nextButton) return;
        pageInfo.textContent = `Página 1 de 1`;
        prevButton.disabled = true;
        nextButton.disabled = true;
    }

    function setupFilterListeners() {
        if (!filterYearSelect || !filterMonthSelect) return;
        filterYearSelect.addEventListener('change', () => {
            const selectedYear = filterYearSelect.value;
            const months = getYearsAndMonths(allImplantes).monthsByYear[selectedYear] || [];
            populateMonthFilter(months);
            selectedEstado = '';
            const filteredImplantes = filterImplantes(allImplantes, selectedYear, filterMonthSelect.value || '', selectedEstado);
            renderImplantes(filteredImplantes);
            renderEstadoButtons(filteredImplantes);
            updatePagination(filteredImplantes);
        });
        filterMonthSelect.addEventListener('change', () => {
            const selectedYear = filterYearSelect.value;
            const selectedMonth = filterMonthSelect.value;
            selectedEstado = '';
            const filteredImplantes = filterImplantes(allImplantes, selectedYear, selectedMonth, selectedEstado);
            renderImplantes(filteredImplantes);
            renderEstadoButtons(filteredImplantes);
            updatePagination(filteredImplantes);
        });
    }

    async function editImplante(id) {
        await showLoadingModal(true);
        try {
            const implanteDoc = await getDoc(doc(db, 'pacientesimplantes', id));
            if (!implanteDoc.exists()) {
                showMessage('Implante no encontrado.', 'error');
                return;
            }
            const implante = implanteDoc.data();
            const formatDateInput = (date) => {
                if (!date) return '';
                let d;
                if (date instanceof Timestamp) {
                    d = date.toDate();
                } else if (date instanceof Date) {
                    d = date;
                } else if (typeof date === 'string') {
                    const [year, month, day] = date.split('-').map(Number);
                    d = new Date(year, month - 1, day);
                } else {
                    return '';
                }
                if (isNaN(d.getTime())) return '';
                d.setHours(0, 0, 0, 0);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            };
            editFechaIngresoInput.value = formatDateInput(implante.fechaIngreso);
            editAtributoInput.value = implante.atributo || 'Implantes';
            editPrevisionInput.value = implante.prevision || '';
            editConvenioInput.value = implante.convenio || '';
            editAdmisionInput.value = implante.admision || '';
            editNombrePacienteInput.value = implante.nombrePaciente || '';
            editMedicoInput.value = implante.medico || '';
            editMedicoInput.dataset.id = implante.medicoId || '';
            editFechaCXInput.value = formatDateInput(implante.fechaCX);
            editProveedorInput.value = implante.proveedor || '';
            editProveedorInput.dataset.id = implante.proveedorId || '';
            editEstadoSelect.value = implante.estado || 'Agendando';
            editFechaCargoInput.value = formatDateInput(implante.fechaCargo);
            editInformeSelect.value = implante.informe || '';
            editTotalCotizacionInput.value = formatNumberWithThousands(implante.totalCotizacion);
            editModal.dataset.id = id;
            editModal.style.display = 'flex';
        } catch (error) {
            console.error('Error al cargar implante para edición:', error);
            showMessage(`Error al cargar implante para edición: ${error.message}`, 'error');
        } finally {
            await showLoadingModal(false);
        }
    }

    async function saveEditImplante() {
        const id = editModal.dataset.id;
        if (!editInformeSelect.value) {
            showMessage('El campo Informe es requerido. Por favor, seleccione una opción.', 'error');
            editInformeSelect.focus();
            return;
        }
        const totalCotizacionValue = parseNumberWithThousands(editTotalCotizacionInput.value);
        if (isNaN(totalCotizacionValue)) {
            showMessage('El campo Total Cotización debe ser un número entero válido.', 'error');
            editTotalCotizacionInput.focus();
            return;
        }
        await showLoadingModal(true);
        try {
            const parseDateInput = (dateString) => {
                if (!dateString) return null;
                const [year, month, day] = dateString.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                date.setHours(0, 0, 0, 0);
                return isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
            };
            const implanteData = {
                fechaIngreso: parseDateInput(editFechaIngresoInput.value),
                atributo: editAtributoInput.value || 'Implantes',
                prevision: editPrevisionInput.value.trim() || '',
                convenio: editConvenioInput.value.trim() || '',
                admision: editAdmisionInput.value.trim() || '',
                nombrePaciente: editNombrePacienteInput.value.trim() || '',
                medico: editMedicoInput.value.trim() || '',
                medicoId: editMedicoInput.dataset.id || '',
                fechaCX: parseDateInput(editFechaCXInput.value),
                proveedor: editProveedorInput.value.trim() || '',
                proveedorId: editProveedorInput.dataset.id || '',
                estado: editEstadoSelect.value || 'Agendando',
                fechaCargo: parseDateInput(editFechaCargoInput.value),
                informe: editInformeSelect.value || '',
                totalCotizacion: totalCotizacionValue,
                uid: auth.currentUser.uid,
                updatedAt: serverTimestamp()
            };
            await updateDoc(doc(db, 'pacientesimplantes', id), implanteData);
            await logAction(id, 'update', implanteData);
            if (implanteData.admision && implanteData.proveedor) {
                await updateCargosimpTotalCotizacion(implanteData.admision, implanteData.proveedor, totalCotizacionValue);
            }
            showMessage('Implante actualizado exitosamente.', 'success');
            editModal.style.display = 'none';
            await loadAndRenderImplantes(true);
        } catch (error) {
            showMessage(`Error al actualizar implante: ${error.message}`, 'error');
        } finally {
            await showLoadingModal(false);
        }
    }

    async function showDeleteModal(id) {
        document.getElementById('delete-message').textContent = '¿Estás seguro de que deseas eliminar este implante?';
        document.getElementById('delete-modal').dataset.id = id;
        document.getElementById('delete-modal').style.display = 'flex';
    }

    async function confirmDeleteImplante() {
        const id = document.getElementById('delete-modal').dataset.id;
        await showLoadingModal(true);
        try {
            await deleteDoc(doc(db, 'pacientesimplantes', id));
            await logAction(id, 'delete');
            showMessage('Implante eliminado exitosamente.', 'success');
            document.getElementById('delete-modal').style.display = 'none';
            await loadAndRenderImplantes(true);
        } catch (error) {
            showMessage(`Error al eliminar implante: ${error.message}`, 'error');
        } finally {
            await showLoadingModal(false);
        }
    }

    async function showLogModal(id) {
        await showLoadingModal(true);
        try {
            const logs = await loadLogs(id);
            const logContent = document.getElementById('log-content');
            if (!logContent) return;
            logContent.innerHTML = logs.length > 0
                ? logs.map(log => `
                    <div class="log-entry">
                        <p><strong>Acción:</strong> ${log.action}</p>
                        <p><strong>Fecha:</strong> ${formatDate(log.timestamp, true)}</p>
                        <p><strong>Usuario:</strong> ${log.uid}</p>
                        <p><strong>Datos:</strong></p>
                        <ul>
                            ${Object.entries(log.data).map(([key, value]) => {
                                if (['fechaIngreso', 'fechaCX', 'fechaCargo', 'createdAt', 'updatedAt'].includes(key)) {
                                    return `<li><strong>${key}:</strong> ${formatDate(value, true)}</li>`;
                                }
                                if (key === 'totalCotizacion') {
                                    return `<li><strong>${key}:</strong> ${formatNumberWithThousands(value)}</li>`;
                                }
                                return `<li><strong>${key}:</strong> ${value || 'Sin valor'}</li>`;
                            }).join('')}
                        </ul>
                    </div>
                `).join('')
                : '<p>No hay logs disponibles para este implante.</p>';
            document.getElementById('log-modal').style.display = 'flex';
        } catch (error) {
            showMessage(`Error al cargar logs: ${error.message}`, 'error');
            logContent.innerHTML = '<p>Error al cargar el historial.</p>';
            document.getElementById('log-modal').style.display = 'flex';
        } finally {
            await showLoadingModal(false);
        }
    }

    async function filterAndRenderSuggestions(input, list, items, showAll, displayProperty) {
        if (!input || !list) return;
        const query = input.value.trim().toLowerCase();
        list.innerHTML = '';
        const filteredItems = showAll ? items : items.filter(item =>
            item[displayProperty]?.toLowerCase().includes(query)
        );
        if (filteredItems.length === 0 && !showAll) {
            list.style.display = 'none';
            return;
        }
        filteredItems.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item[displayProperty] || 'Sin nombre';
            li.addEventListener('click', () => {
                input.value = item[displayProperty] || '';
                input.dataset.id = item.id;
                list.innerHTML = '';
                list.style.display = 'none';
            });
            list.appendChild(li);
        });
        list.style.display = filteredItems.length > 0 ? 'block' : 'none';
    }

    async function setupEditMedicoAutocomplete() {
        if (!editMedicoInput || !editMedicoList || !editMedicoSearch) return;
        try {
            const medicos = await loadMedicos();
            editMedicoInput.addEventListener('input', () => {
                if (!editMedicoInput.dataset.fromAdmision) {
                    filterAndRenderSuggestions(editMedicoInput, editMedicoList, medicos, false, 'nombreMedico');
                }
            });
            editMedicoInput.addEventListener('focus', () => {
                if (editMedicoInput.value.trim() && !editMedicoInput.dataset.fromAdmision) {
                    filterAndRenderSuggestions(editMedicoInput, editMedicoList, medicos, false, 'nombreMedico');
                }
            });
            editMedicoSearch.addEventListener('click', () => {
                if (!editMedicoInput.dataset.fromAdmision) {
                    filterAndRenderSuggestions(editMedicoInput, editMedicoList, medicos, true, 'nombreMedico');
                }
            });
            document.addEventListener('click', e => {
                if (!editMedicoInput.contains(e.target) && !editMedicoList.contains(e.target) && !editMedicoSearch.contains(e.target)) {
                    editMedicoList.innerHTML = '';
                    editMedicoList.style.display = 'none';
                }
            });
        } catch (error) {
            console.error(`Error en autocompletado de médicos (editar): ${error.message}`);
            showMessage(`Error en autocompletado de médicos (editar): ${error.message}`, 'error');
        }
    }

    async function setupEditProveedorAutocomplete() {
        if (!editProveedorInput || !editProveedorList || !editProveedorSearch) return;
        try {
            const empresas = await loadEmpresas();
            editProveedorInput.addEventListener('input', () =>
                filterAndRenderSuggestions(editProveedorInput, editProveedorList, empresas, false, 'nombreEmpresa')
            );
            editProveedorInput.addEventListener('focus', () => {
                if (editProveedorInput.value.trim())
                    filterAndRenderSuggestions(editProveedorInput, editProveedorList, empresas, false, 'nombreEmpresa');
            });
            editProveedorSearch.addEventListener('click', () =>
                filterAndRenderSuggestions(editProveedorInput, editProveedorList, empresas, true, 'nombreEmpresa')
            );
            document.addEventListener('click', e => {
                if (!editProveedorInput.contains(e.target) && !editProveedorList.contains(e.target) && !editProveedorSearch.contains(e.target)) {
                    editProveedorList.innerHTML = '';
                    editProveedorList.style.display = 'none';
                }
            });
        } catch (error) {
            console.error(`Error en autocompletado de proveedores (editar): ${error.message}`);
            showMessage(`Error en autocompletado de proveedores (editar): ${error.message}`, 'error');
        }
    }

    function downloadTemplate() {
        const headers = [
            'Fecha de ingreso',
            'Atributo',
            'Previsión',
            'Convenio',
            'Admisión',
            'Nombre Paciente',
            'Médico',
            'Fecha CX',
            'Proveedor',
            'Estado',
            'Fecha Cargo',
            'Informe',
            'Total Cotización'
        ];
        const bom = '\uFEFF';
        const csvContent = bom + headers.map(header => `"${header}"`).join(';') + '\n';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'plantilla_implantes.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showMessage('Plantilla descargada exitosamente.', 'success');
    }

    async function importCSV() {
        if (!importFileInput.files || importFileInput.files.length === 0) {
            showMessage('Por favor, seleccione un archivo CSV.', 'error');
            return;
        }
        const file = importFileInput.files[0];
        if (!file.name.endsWith('.csv')) {
            showMessage('El archivo debe ser un CSV.', 'error');
            return;
        }
        await showLoadingModal(true);
        try {
            const text = await file.text();
            const lines = text.replace(/^\uFEFF/, '').split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length < 2) {
                showMessage('El archivo CSV está vacío o no tiene datos válidos.', 'error');
                return;
            }
            const headers = lines[0].split(';').map(header => header.trim().replace(/^"|"$/g, ''));
            const expectedHeaders = [
                'Fecha de ingreso',
                'Atributo',
                'Previsión',
                'Convenio',
                'Admisión',
                'Nombre Paciente',
                'Médico',
                'Fecha CX',
                'Proveedor',
                'Estado',
                'Fecha Cargo',
                'Informe',
                'Total Cotización'
            ];
            if (headers.length !== expectedHeaders.length || !headers.every((header, index) => header === expectedHeaders[index])) {
                showMessage('El formato del CSV no coincide con la plantilla esperada.', 'error');
                return;
            }
            const validEstados = ['Agendando', 'Cargado', 'Esperando Cotización', 'Pendiente el Código', 'Cuenta Cerrada', 'Pendiente Cargo'];
            const validInformes = ['Sí', 'No', 'Consignado'];
            const medicos = await loadMedicos();
            const empresas = await loadEmpresas();
            let successCount = 0;
            let errorCount = 0;
            const importedImplantes = [];
            for (let i = 1; i < lines.length; i++) {
                const row = lines[i].split(';').map(cell => cell.trim().replace(/^"|"$/g, ''));
                if (row.length !== headers.length) {
                    console.warn(`Fila ${i + 1} inválida: número de columnas incorrecto`);
                    showMessage(`Fila ${i + 1}: Número de columnas incorrecto.`, 'error');
                    errorCount++;
                    continue;
                }
                const [fechaIngreso, atributo, prevision, convenio, admision, nombrePaciente, medico, fechaCX, proveedor, estado, fechaCargo, informe, totalCotizacion] = row;
                if (!estado || !validEstados.includes(estado)) {
                    showMessage(`Fila ${i + 1}: Estado inválido. Debe ser uno de: ${validEstados.join(', ')}`, 'error');
                    errorCount++;
                    continue;
                }
                if (!informe || !validInformes.includes(informe)) {
                    showMessage(`Fila ${i + 1}: Informe inválido. Debe ser uno de: ${validInformes.join(', ')}`, 'error');
                    errorCount++;
                    continue;
                }
                const totalCotizacionValue = parseNumberWithThousands(totalCotizacion);
                if (isNaN(totalCotizacionValue)) {
                    showMessage(`Fila ${i + 1}: Total Cotización debe ser un número entero válido.`, 'error');
                    errorCount++;
                    continue;
                }
                const parsedFechaCX = parseCSVDate(fechaCX);
                if (!parsedFechaCX) {
                    showMessage(`Fila ${i + 1}: Fecha CX inválida. Use formato DD/MM/YYYY o DD-MM-YYYY.`, 'error');
                    errorCount++;
                    continue;
                }
                const medicoObj = medicos.find(m => m.nombreMedico.toLowerCase() === medico.toLowerCase());
                const proveedorObj = empresas.find(e => e.nombreEmpresa.toLowerCase() === proveedor.toLowerCase());
                const implanteData = {
                    fechaIngreso: parseCSVDate(fechaIngreso) || null,
                    atributo: atributo || 'Implantes',
                    prevision: prevision || '',
                    convenio: convenio || '',
                    admision: admision || '',
                    nombrePaciente: nombrePaciente || '',
                    medico: medico || '',
                    medicoId: medicoObj ? medicoObj.id : '',
                    fechaCX: parsedFechaCX,
                    proveedor: proveedor || '',
                    proveedorId: proveedorObj ? proveedorObj.id : '',
                    estado: estado || 'Agendando',
                    fechaCargo: parseCSVDate(fechaCargo) || null,
                    informe: informe || '',
                    totalCotizacion: totalCotizacionValue,
                    uid: auth.currentUser.uid,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };
                try {
                    const docRef = await addDoc(collection(db, 'pacientesimplantes'), implanteData);
                    await logAction(docRef.id, 'create', implanteData);
                    if (implanteData.admision && implanteData.proveedor) {
                        await updateCargosimpTotalCotizacion(implanteData.admision, implanteData.proveedor, totalCotizacionValue);
                    }
                    importedImplantes.push({ id: docRef.id, ...implanteData });
                    successCount++;
                } catch (error) {
                    console.error(`Error al importar fila ${i + 1}: ${error.message}`);
                    showMessage(`Error al importar fila ${i + 1}: ${error.message}`, 'error');
                    errorCount++;
                }
            }
            showMessage(`Importación completada: ${successCount} registros importados, ${errorCount} errores.`, successCount > 0 ? 'success' : 'error');
            importFileInput.value = '';
            await loadAndRenderImplantes(false, true);
        } catch (error) {
            console.error('Error al procesar el archivo CSV:', error);
            showMessage(`Error al procesar el archivo CSV: ${error.message}`, 'error');
        } finally {
            await showLoadingModal(false);
        }
    }

    function setupEventListeners() {
        if (document.getElementById('save-edit-btn')) {
            document.getElementById('save-edit-btn').addEventListener('click', saveEditImplante);
        }
        if (document.getElementById('cancel-edit-btn')) {
            document.getElementById('cancel-edit-btn').addEventListener('click', () => {
                editModal.style.display = 'none';
            });
        }
        if (document.getElementById('confirm-delete-btn')) {
            document.getElementById('confirm-delete-btn').addEventListener('click', confirmDeleteImplante);
        }
        if (document.getElementById('cancel-delete-btn')) {
            document.getElementById('cancel-delete-btn').addEventListener('click', () => {
                document.getElementById('delete-modal').style.display = 'none';
            });
        }
        if (document.getElementById('close-log-btn')) {
            document.getElementById('close-log-btn').addEventListener('click', () => {
                document.getElementById('log-modal').style.display = 'none';
            });
        }
        if (document.getElementById('confirm-mass-status-btn')) {
            document.getElementById('confirm-mass-status-btn').addEventListener('click', updateMassStatus);
        }
        if (document.getElementById('cancel-mass-status-btn')) {
            document.getElementById('cancel-mass-status-btn').addEventListener('click', () => {
                document.getElementById('mass-status-modal').style.display = 'none';
            });
        }
        if (document.getElementById('confirm-single-status-btn')) {
            document.getElementById('confirm-single-status-btn').addEventListener('click', updateSingleStatus);
        }
        if (document.getElementById('cancel-single-status-btn')) {
            document.getElementById('cancel-single-status-btn').addEventListener('click', () => {
                document.getElementById('single-status-modal').style.display = 'none';
            });
        }
        if (document.getElementById('confirm-single-informe-btn')) {
            document.getElementById('confirm-single-informe-btn').addEventListener('click', updateSingleInforme);
        }
        if (document.getElementById('cancel-single-informe-btn')) {
            document.getElementById('cancel-single-informe-btn').addEventListener('click', () => {
                document.getElementById('single-informe-modal').style.display = 'none';
            });
        }
        if (downloadTemplateBtn) {
            downloadTemplateBtn.addEventListener('click', downloadTemplate);
        }
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                importFileInput.click();
            });
        }
        if (importFileInput) {
            importFileInput.addEventListener('change', importCSV);
        }
        setupNumberInputFormatting(editTotalCotizacionInput);
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await loadAndRenderImplantes();
            await setupEditMedicoAutocomplete();
            await setupEditProveedorAutocomplete();
            setupFilterListeners();
            setupEventListeners();
        } else {
            showMessage('Usuario no autenticado. Por favor, inicia sesión.', 'error');
            window.location.href = '/login.html';
        }
    });
} catch (error) {
    console.error('Error al inicializar la aplicación:', error);
    showMessage(`Error al inicializar la aplicación: ${error.message}`, 'error');

}
