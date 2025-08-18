document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('implantes-table');
    const thElements = table?.querySelectorAll('th');

    if (!table || thElements.length === 0) {
        console.warn('Tabla o encabezados no encontrados. Verifica que #implantes-table y sus <th> existan en el DOM.');
        return;
    }

    console.log(`Encontrados ${thElements.length} encabezados para redimensionamiento.`);

    thElements.forEach((th, index) => {
        if (index === 0) return; // No agregar resize-handle a la primera columna (checkboxes)
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

    const form = document.getElementById('implantes-form');
    const fechaIngresoInput = document.getElementById('fecha-ingreso');
    const atributoInput = document.getElementById('atributo');
    const previsionInput = document.getElementById('prevision');
    const convenioInput = document.getElementById('convenio');
    const admisionInput = document.getElementById('admisión');
    const nombrePacienteInput = document.getElementById('nombrePaciente');
    const medicoInput = document.getElementById('medico');
    const medicoSearch = document.getElementById('medico-search');
    const medicoList = document.getElementById('medico-list');
    const fechaCXInput = document.getElementById('fechaCX');
    const proveedorInput = document.getElementById('proveedor');
    const proveedorSearch = document.getElementById('proveedor-search');
    const proveedorList = document.getElementById('proveedor-list');
    const estadoSelect = document.getElementById('estado');
    const fechaCargoInput = document.getElementById('fecha-cargo');
    const informeSelect = document.getElementById('informe');
    const totalCotizacionInput = document.getElementById('total-cotizacion');
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

    const elements = {
        form,
        fechaIngresoInput,
        atributoInput,
        previsionInput,
        convenioInput,
        admisionInput,
        nombrePacienteInput,
        medicoInput,
        medicoSearch,
        medicoList,
        fechaCXInput,
        proveedorInput,
        proveedorSearch,
        proveedorList,
        estadoSelect,
        fechaCargoInput,
        informeSelect,
        totalCotizacionInput,
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
        messageContainer
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
                console.log(`Updated totalCotizacion in cargosimp for admision ${admision} and proveedor ${proveedor}`);
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
            const [day, month, year] = date.split('-').map(Number);
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
            <option value="" disabled selected>Seleccione un mes</option>
            ${monthNames
                .filter(month => validMonths.includes(parseInt(month.value)))
                .map(month => `<option value="${month.value}">${month.name}</option>`)
                .join('')}
        `;
        filterMonthSelect.value = validMonths.includes(parseInt(selectedMonth)) ? selectedMonth : '';
    }

    function filterImplantes(implantes, year, month, estado) {
        if (month === '') return [];
        return implantes.filter(implante => {
            if (!(implante.fechaCX instanceof Timestamp) || isNaN(implante.fechaCX.toDate().getTime())) return false;
            const date = implante.fechaCX.toDate();
            date.setHours(0, 0, 0, 0);
            const implanteYear = date.getFullYear();
            const implanteMonth = date.getMonth() + 1;
            if (year !== 'all' && implanteYear !== parseInt(year)) return false;
            if (month && implanteMonth !== parseInt(month)) return false;
            if (estado && implante.estado !== estado) return false;
            const fields = [
                '', // Checkbox column
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
            return Object.entries(columnFilters).every(([index, filterValue]) => {
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
        });
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
        if (!tableBody) return;
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
            '30px', // Checkbox
            '80px', // Fecha Ingreso
            '80px', // Atributo
            '100px', // Previsión
            '100px', // Convenio
            '80px', // Admisión
            '120px', // Nombre Paciente
            '120px', // Médico
            '80px', // Fecha CX
            '100px', // Proveedor
            '100px', // Estado
            '80px', // Fecha Cargo
            '80px', // Informe
            '80px', // Total Cotización
            '80px' // Acciones
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

    async function loadAndRenderImplantes(preserveFilters = false) {
        await showLoadingModal(true);
        try {
            allImplantes = await loadImplantes();
            const { years, monthsByYear } = getYearsAndMonths(allImplantes);
            let selectedYear, selectedMonth;
            if (!preserveFilters) {
                populateYearFilter(years);
                selectedYear = filterYearSelect?.value || 'all';
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
                    const [day, month, year] = date.split('-').map(Number);
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
            // Update cargosimp if admision and proveedor match
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

    async function setupMedicoAutocomplete() {
        if (!medicoInput || !medicoList || !medicoSearch) return;
        try {
            const medicos = await loadMedicos();
            medicoInput.addEventListener('input', () => {
                if (!medicoInput.dataset.fromAdmision) {
                    filterAndRenderSuggestions(medicoInput, medicoList, medicos, false, 'nombreMedico');
                }
            });
            medicoInput.addEventListener('focus', () => {
                if (medicoInput.value.trim() && !medicoInput.dataset.fromAdmision) {
                    filterAndRenderSuggestions(medicoInput, medicoList, medicos, false, 'nombreMedico');
                }
            });
            medicoSearch.addEventListener('click', () => {
                if (!medicoInput.dataset.fromAdmision) {
                    filterAndRenderSuggestions(medicoInput, medicoList, medicos, true, 'nombreMedico');
                }
            });
            document.addEventListener('click', e => {
                if (!medicoInput.contains(e.target) && !medicoList.contains(e.target) && !medicoSearch.contains(e.target)) {
                    medicoList.innerHTML = '';
                    medicoList.style.display = 'none';
                }
            });
        } catch (error) {
            console.error(`Error en autocompletado de médicos: ${error.message}`);
            showMessage(`Error en autocompletado de médicos: ${error.message}`, 'error');
        }
    }

    async function setupProveedorAutocomplete() {
        if (!proveedorInput || !proveedorList || !proveedorSearch) return;
        try {
            const empresas = await loadEmpresas();
            proveedorInput.addEventListener('input', () =>
                filterAndRenderSuggestions(proveedorInput, proveedorList, empresas, false, 'nombreEmpresa')
            );
            proveedorInput.addEventListener('focus', () => {
                if (proveedorInput.value.trim())
                    filterAndRenderSuggestions(proveedorInput, proveedorList, empresas, false, 'nombreEmpresa');
            });
            proveedorSearch.addEventListener('click', () =>
                filterAndRenderSuggestions(proveedorInput, proveedorList, empresas, true, 'nombreEmpresa')
            );
            document.addEventListener('click', e => {
                if (!proveedorInput.contains(e.target) && !proveedorList.contains(e.target) && !proveedorSearch.contains(e.target)) {
                    proveedorList.innerHTML = '';
                    proveedorList.style.display = 'none';
                }
            });
        } catch (error) {
            console.error(`Error en autocompletado de proveedores: ${error.message}`);
            showMessage(`Error en autocompletado de proveedores: ${error.message}`, 'error');
        }
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
                    filterAndRenderSuggestions(editProveedorInput, editProveedorList, empresas, 'nombreEmpresa');
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

    async function setupAdmisionAutocomplete() {
        if (!admisionInput || !previsionInput || !convenioInput || !medicoInput || !fechaCXInput) return;
        let timeout;
        admisionInput.addEventListener('input', async () => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const admisionValue = admisionInput.value.trim();
                if (admisionValue && auth.currentUser) {
                    try {
                        const reporte = await loadReporteByAdmision(admisionValue, auth.currentUser);
                        if (reporte) {
                            previsionInput.value = reporte.isapre || '';
                            convenioInput.value = reporte.convenio || '';
                            medicoInput.value = reporte.primerCirujano || '';
                            medicoInput.dataset.id = reporte.medicoId || '';
                            medicoInput.dataset.fromAdmision = 'true';
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
                            fechaCXInput.value = formatDateInput(reporte.fecha);
                            medicoList.innerHTML = '';
                            medicoList.style.display = 'none';
                        } else {
                            previsionInput.value = '';
                            convenioInput.value = '';
                            medicoInput.value = '';
                            medicoInput.dataset.id = '';
                            delete medicoInput.dataset.fromAdmision;
                            fechaCXInput.value = '';
                        }
                    } catch (error) {
                        console.error(`Error en autocompletado de admisión: ${error.message}`);
                        showMessage(`Error en autocompletado de admisión: ${error.message}`, 'error');
                    }
                } else {
                    previsionInput.value = '';
                    convenioInput.value = '';
                    medicoInput.value = '';
                    medicoInput.dataset.id = '';
                    delete medicoInput.dataset.fromAdmision;
                    fechaCXInput.value = '';
                }
            }, 500);
        });
    }

    async function setupEditAdmisionAutocomplete() {
        if (!editAdmisionInput || !editPrevisionInput || !editConvenioInput || !editMedicoInput || !editFechaCXInput) return;
        let timeout;
        editAdmisionInput.addEventListener('input', async () => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const admisionValue = editAdmisionInput.value.trim();
                if (admisionValue && auth.currentUser) {
                    try {
                        const reporte = await loadReporteByAdmision(admisionValue, auth.currentUser);
                        if (reporte) {
                            editPrevisionInput.value = reporte.isapre || '';
                            editConvenioInput.value = reporte.convenio || '';
                            editMedicoInput.value = reporte.primerCirujano || '';
                            editMedicoInput.dataset.id = reporte.medicoId || '';
                            editMedicoInput.dataset.fromAdmision = 'true';
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
                            editFechaCXInput.value = formatDateInput(reporte.fecha);
                            editMedicoList.innerHTML = '';
                            editMedicoList.style.display = 'none';
                        } else {
                            editPrevisionInput.value = '';
                            editConvenioInput.value = '';
                            editMedicoInput.value = '';
                            editMedicoInput.dataset.id = '';
                            delete editMedicoInput.dataset.fromAdmision;
                            editFechaCXInput.value = '';
                        }
                    } catch (error) {
                        console.error(`Error en autocompletado de admisión (editar): ${error.message}`);
                        showMessage(`Error en autocompletado de admisión (editar): ${error.message}`, 'error');
                    }
                } else {
                    editPrevisionInput.value = '';
                    editConvenioInput.value = '';
                    editMedicoInput.value = '';
                    editMedicoInput.dataset.id = '';
                    delete editMedicoInput.dataset.fromAdmision;
                    editFechaCXInput.value = '';
                }
            }, 500);
        });
    }

    function clearForm() {
        if (form) {
            form.reset();
            atributoInput.value = 'Implantes';
            convenioInput.value = '';
            totalCotizacionInput.value = '0';
            medicoInput.dataset.id = '';
            proveedorInput.dataset.id = '';
            delete medicoInput.dataset.fromAdmision;
            medicoList.innerHTML = '';
            medicoList.style.display = 'none';
            proveedorList.innerHTML = '';
            proveedorList.style.display = 'none';
        }
    }

    async function checkUserPermissions() {
        const user = auth.currentUser;
        if (!user) return false;
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                console.error('Documento de usuario no encontrado');
                return false;
            }
            const userData = userDoc.data();
            const isAdminOrOperator = ['Administrador', 'Operador'].includes(userData.role);
            const hasImplantesPermission = userData.permissions && userData.permissions.includes('Implantes:PacientesImplantes');
            return isAdminOrOperator || hasImplantesPermission;
        } catch (error) {
            console.error(`Error al verificar permisos: ${error.message}`);
            showMessage(`Error al verificar permisos: ${error.message}`, 'error');
            return false;
        }
    }

    async function registerImplante(e) {
        e.preventDefault();
        try {
            const user = auth.currentUser;
            if (!user) {
                showMessage('Usuario no autenticado. Por favor, inicia sesión.', 'error');
                return;
            }
            if (!informeSelect.value) {
                showMessage('El campo Informe es requerido. Por favor, seleccione una opción.', 'error');
                informeSelect.focus();
                return;
            }
            const totalCotizacionValue = parseNumberWithThousands(totalCotizacionInput.value);
            if (isNaN(totalCotizacionValue)) {
                showMessage('El campo Total Cotización debe ser un número entero válido.', 'error');
                totalCotizacionInput.focus();
                return;
            }
            await showLoadingModal(true);
            const parseDateInput = (dateString) => {
                if (!dateString) return null;
                const [year, month, day] = dateString.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                date.setHours(0, 0, 0, 0);
                return isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
            };
            const implanteData = {
                fechaIngreso: parseDateInput(fechaIngresoInput.value),
                atributo: atributoInput.value || 'Implantes',
                prevision: previsionInput.value.trim() || '',
                convenio: convenioInput.value.trim() || '',
                admision: admisionInput.value.trim() || '',
                nombrePaciente: nombrePacienteInput.value.trim() || '',
                medico: medicoInput.value.trim() || '',
                medicoId: medicoInput.dataset.id || '',
                fechaCX: parseDateInput(fechaCXInput.value),
                proveedor: proveedorInput.value.trim() || '',
                proveedorId: proveedorInput.dataset.id || '',
                estado: estadoSelect.value || 'Agendando',
                fechaCargo: parseDateInput(fechaCargoInput.value),
                informe: informeSelect.value || '',
                totalCotizacion: totalCotizacionValue,
                uid: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            const implanteRef = await addDoc(collection(db, 'pacientesimplantes'), implanteData);
            await logAction(implanteRef.id, 'create', implanteData);
            // Update cargosimp if admision and proveedor match
            if (implanteData.admision && implanteData.proveedor) {
                await updateCargosimpTotalCotizacion(implanteData.admision, implanteData.proveedor, totalCotizacionValue);
            }
            showMessage('Implante registrado exitosamente.', 'success');
            clearForm();
            await loadAndRenderImplantes(true);
        } catch (error) {
            showMessage(`Error al registrar implante: ${error.message}`, 'error');
            if (error.code === 'permission-denied') {
                showMessage('No tienes permisos suficientes para registrar implantes. Contacta al administrador.', 'error');
            }
        } finally {
            await showLoadingModal(false);
        }
    }

    function setupRegistrarButton() {
        if (!form) {
            console.error('Formulario no encontrado');
            return;
        }
        form.addEventListener('submit', registerImplante);
    }

    function setupEditAndDeleteButtons() {
        document.getElementById('save-edit-btn')?.addEventListener('click', saveEditImplante);
        document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
            editModal.style.display = 'none';
        });
        document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDeleteImplante);
        document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
            document.getElementById('delete-modal').style.display = 'none';
        });
        document.getElementById('close-log-btn')?.addEventListener('click', () => {
            document.getElementById('log-modal').style.display = 'none';
        });
        document.getElementById('confirm-mass-status-btn')?.addEventListener('click', updateMassStatus);
        document.getElementById('cancel-mass-status-btn')?.addEventListener('click', () => {
            document.getElementById('mass-status-modal').style.display = 'none';
        });
        document.getElementById('confirm-single-status-btn')?.addEventListener('click', updateSingleStatus);
        document.getElementById('cancel-single-status-btn')?.addEventListener('click', () => {
            document.getElementById('single-status-modal').style.display = 'none';
            currentRowId = null;
            currentCell = null;
        });
        document.getElementById('confirm-single-informe-btn')?.addEventListener('click', updateSingleInforme);
        document.getElementById('cancel-single-informe-btn')?.addEventListener('click', () => {
            document.getElementById('single-informe-modal').style.display = 'none';
            currentRowId = null;
            currentCell = null;
        });
    }

    function setupInputFormatters() {
        setupNumberInputFormatting(totalCotizacionInput);
        setupNumberInputFormatting(editTotalCotizacionInput);
    }

    async function init() {
        try {
            await new Promise((resolve, reject) => {
                onAuthStateChanged(auth, async user => {
                    if (user) {
                        const hasPermissions = await checkUserPermissions();
                        if (!hasPermissions) {
                            showMessage('No tienes permisos para gestionar pacientesimplantes.', 'error');
                            reject(new Error('Usuario sin permisos'));
                            return;
                        }
                        resolve();
                    } else {
                        showMessage('Usuario no autenticado. Por favor, inicia sesión.', 'error');
                        reject(new Error('Usuario no autenticado'));
                    }
                });
            });
            await Promise.all([
                setupMedicoAutocomplete(),
                setupProveedorAutocomplete(),
                setupEditMedicoAutocomplete(),
                setupEditProveedorAutocomplete(),
                setupAdmisionAutocomplete(),
                setupEditAdmisionAutocomplete(),
                setupRegistrarButton(),
                setupEditAndDeleteButtons(),
                setupInputFormatters(),
                setupFilterListeners(),
                loadAndRenderImplantes()
            ]);
        } catch (error) {
            console.error('Error al inicializar la aplicación:', error);
            showMessage(`Error al inicializar la aplicación: ${error.message}`, 'error');
        }
    }

    init();
} catch (error) {
    console.error('Error crítico al cargar la aplicación:', error);
    showMessage('Error crítico al cargar la aplicación. Contacta al soporte técnico.', 'error');
}