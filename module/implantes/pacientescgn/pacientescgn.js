import { getFirestore, collection, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, Timestamp, writeBatch, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getApps, initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

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
        console.error('Error al configurar persistencia:', error);
    });

    const container = document.querySelector('.pacientesconsignacion-container');
    const pacientesTableBody = document.querySelector('#pacientesconsignacion-table tbody');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const totalRecords = document.getElementById('total-records');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const editModal = document.getElementById('edit-paciente-modal');
    const editFechaIngresoInput = document.getElementById('edit-fechaIngreso');
    const editAdmisionInput = document.getElementById('edit-admision');
    const editNombrePacienteInput = document.getElementById('edit-nombrePaciente');
    const editFechaCXInput = document.getElementById('edit-fechaCX');
    const editMedicoInput = document.getElementById('edit-medico');
    const editProveedorInput = document.getElementById('edit-proveedor');
    const editPrevisionInput = document.getElementById('edit-prevision');
    const editAtributoInput = document.getElementById('edit-atributo');
    const editEstadoSelect = document.getElementById('edit-estado');
    const editFechaCargoInput = document.getElementById('edit-fechaCargo');
    const editTotalPacienteInput = document.getElementById('edit-totalPaciente');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const deleteModal = document.getElementById('delete-paciente-modal');
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
    const loadingSpinner = document.getElementById('loading-spinner');
    const massiveStateBtn = document.getElementById('massive-state-btn');
    const massiveStateModal = document.getElementById('massive-state-modal');
    const massiveStateSelect = document.getElementById('massive-state-select');
    const massiveFechaCargoInput = document.getElementById('massive-fechaCargo');
    const saveMassiveStateBtn = document.getElementById('save-massive-state-btn');
    const cancelMassiveStateBtn = document.getElementById('cancel-massive-state-btn');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');

    const elements = {
        container, pacientesTableBody, prevBtn, nextBtn, pageInfo, totalRecords, exportExcelBtn,
        editModal, editFechaIngresoInput, editAdmisionInput, editNombrePacienteInput, editFechaCXInput,
        editMedicoInput, editProveedorInput, editPrevisionInput, editAtributoInput, editEstadoSelect,
        editFechaCargoInput, editTotalPacienteInput, saveEditBtn, cancelEditBtn, deleteModal,
        deleteMessage, confirmDeleteBtn, cancelDeleteBtn, logModal, logContent, closeLogBtn,
        successModal, successIcon, successMessage, changeStateModal, changeStateSelect,
        saveStateBtn, cancelStateBtn, filterYearSelect, filterMonthSelect, showAllBtn,
        stateButtonsContainer, loadingSpinner, massiveStateBtn, massiveStateModal,
        massiveStateSelect, massiveFechaCargoInput, saveMassiveStateBtn, cancelMassiveStateBtn,
        selectAllCheckbox
    };

    Object.entries(elements).forEach(([key, el]) => {
        if (!el) console.warn(`Elemento ${key} no encontrado en el DOM`);
    });

    let currentUser = null;
    let currentEditId = null;
    let currentStateChangeId = null;
    let pacientes = [];
    let currentPage = 1;
    const recordsPerPage = 100;
    let filters = {};
    let quickFilters = { year: new Date().getFullYear().toString(), month: (new Date().getMonth() + 1).toString().padStart(2, '0'), state: null };
    let selectedPacientes = new Set();

    const monthNames = {
        '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
        '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
    };

    function formatDate(date) {
        if (!date || isNaN(new Date(date))) return '-';
        const parsedDate = date instanceof Timestamp ? date.toDate() : new Date(date);
        return parsedDate.toLocaleString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC'
        });
    }

    function formatDateOnly(date) {
        console.debug('Procesando fecha en formatDateOnly:', {
            inputDate: date,
            inputType: typeof date,
            isTimestamp: date instanceof Timestamp
        });
        if (!date) {
            console.warn('Fecha no proporcionada:', date);
            return '';
        }
        let parsedDate;
        if (typeof date === 'string') {
            const [year, month, day] = date.split('-');
            if (year && month && day && year.length === 4 && month.length === 2 && day.length === 2) {
                parsedDate = new Date(Date.UTC(year, month - 1, day));
            } else {
                console.warn('Fecha en formato de cadena inválida:', date);
                return '';
            }
        } else if (date instanceof Timestamp) {
            parsedDate = date.toDate();
        } else if (date instanceof Date) {
            parsedDate = date;
        } else {
            console.warn('Formato de fecha no reconocido:', date, 'Tipo:', typeof date);
            return '';
        }
        if (!parsedDate || isNaN(parsedDate.getTime())) {
            console.warn('Fecha parseada inválida:', date, 'Parsed:', parsedDate);
            return '';
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
        if (!successModal || !successIcon || !successMessage) {
            console.warn('Elementos de éxito no encontrados');
            alert(message);
            return;
        }
        console.debug('Mostrando mensaje de éxito:', { message, isSuccess });
        successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
        successMessage.textContent = message;
        successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
        showModal(successModal);
        setTimeout(() => hideModal(successModal), 2000);
    }

    function showSpinner() {
        if (loadingSpinner) {
            console.debug('Mostrando spinner');
            loadingSpinner.style.display = 'flex';
            loadingSpinner.removeAttribute('hidden');
        }
    }

    function hideSpinner() {
        if (loadingSpinner) {
            console.debug('Ocultando spinner');
            loadingSpinner.style.display = 'none';
            loadingSpinner.setAttribute('hidden', true);
        }
    }

    async function getUserFullName() {
        if (!currentUser) throw new Error('No se encontró el usuario autenticado');
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
        return userSnap.data().fullName || 'Usuario Desconocido';
    }

    async function updatePrevisionFromReportesPabellon() {
        try {
            const reportesCollection = collection(db, 'reportesPabellon');
            const reportesSnapshot = await getDocs(query(reportesCollection, where('uid', '==', currentUser.uid)));
            const reportes = [];
            reportesSnapshot.forEach(doc => {
                const data = doc.data();
                reportes.push({ id: doc.id, ...data });
            });

            const batch = writeBatch(db);
            let updatedCount = 0;

            for (const paciente of pacientes) {
                if (!paciente.admision) continue;

                const matchingReporte = reportes.find(reporte => reporte.admision === paciente.admision);
                if (matchingReporte && matchingReporte.isapre && matchingReporte.isapre !== paciente.prevision) {
                    const pacienteRef = doc(db, 'pacientesconsignacion', paciente.docId);
                    const newPrevision = matchingReporte.isapre;
                    const now = Timestamp.fromDate(new Date());
                    const fullName = await getUserFullName();

                    batch.update(pacienteRef, {
                        prevision: newPrevision,
                        usuario: fullName,
                        fechaActualizada: now,
                        uid: currentUser.uid
                    });

                    const logRef = doc(collection(db, 'pacientesconsignacion', paciente.docId, 'logs'));
                    batch.set(logRef, {
                        action: `Actualizado: ${formatDate(new Date(now.toMillis()))}`,
                        details: `Previsión actualizada a ${newPrevision} desde reportesPabellon`,
                        timestamp: now,
                        user: fullName,
                        uid: currentUser.uid
                    });

                    paciente.prevision = newPrevision;
                    updatedCount++;
                }
            }

            if (updatedCount > 0) {
                await batch.commit();
                showSuccessMessage(`Se actualizaron ${updatedCount} registros de Previsión desde reportesPabellon.`);
            }
        } catch (error) {
            console.error('Error al actualizar previsión desde reportesPabellon:', error);
            showSuccessMessage('Error al actualizar previsión desde reportesPabellon: ' + error.message, false);
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
            console.warn('Registro sin fechaCX:', item); 
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
            console.warn('FechaCX inválida:', item.fechaCX); 
            return false;
        }

        const year = fechaCX.getFullYear().toString();
        const month = (fechaCX.getMonth() + 1).toString().padStart(2, '0');

        const yearMatch = !quickFilters.year || year === quickFilters.year;
        const monthMatch = !quickFilters.month || quickFilters.month === 'all' || month === quickFilters.month;
        const stateMatch = !quickFilters.state || item.estado === quickFilters.state;

        return yearMatch && monthMatch && stateMatch;
    });
}

    function updateYearFilter(data) {
        if (!filterYearSelect) return;
        const years = [...new Set(data
            .filter(p => p.fechaCX)
            .map(p => {
                let fechaCX;
                if (typeof p.fechaCX === 'string') fechaCX = new Date(p.fechaCX);
                else if (p.fechaCX instanceof Timestamp) fechaCX = p.fechaCX.toDate();
                else if (p.fechaCX instanceof Date) fechaCX = p.fechaCX;
                return fechaCX && !isNaN(fechaCX) ? fechaCX.getFullYear().toString() : null;
            })
            .filter(y => y)
        )].sort((a, b) => b - a);

        filterYearSelect.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
        filterYearSelect.value = quickFilters.year || new Date().getFullYear().toString();
    }

    function updateMonthFilter(data) {
        if (!filterMonthSelect) return;
        
        let months = [];
        if (quickFilters.year) {
            months = [...new Set(data
                .filter(p => {
                    if (!p.fechaCX) return false;
                    let fechaCX;
                    if (typeof p.fechaCX === 'string') fechaCX = new Date(p.fechaCX);
                    else if (p.fechaCX instanceof Timestamp) fechaCX = p.fechaCX.toDate();
                    else if (p.fechaCX instanceof Date) fechaCX = p.fechaCX;
                    if (!fechaCX || isNaN(fechaCX)) return false;
                    return fechaCX.getFullYear().toString() === quickFilters.year;
                })
                .map(p => {
                    let fechaCX;
                    if (typeof p.fechaCX === 'string') fechaCX = new Date(p.fechaCX);
                    else if (p.fechaCX instanceof Timestamp) fechaCX = p.fechaCX.toDate();
                    else if (p.fechaCX instanceof Date) fechaCX = p.fechaCX;
                    return (fechaCX.getMonth() + 1).toString().padStart(2, '0');
                })
            )].sort();
        }

        filterMonthSelect.innerHTML = `<option value="all">Todos</option>` + 
            months.map(month => `<option value="${month}">${monthNames[month]}</option>`).join('');
        
        const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
        
        if (quickFilters.month && months.includes(quickFilters.month)) {
            filterMonthSelect.value = quickFilters.month;
        } else {
            filterMonthSelect.value = months.includes(currentMonth) && quickFilters.year === new Date().getFullYear().toString() ? currentMonth : 'all';
            quickFilters.month = filterMonthSelect.value;
        }
    }

    function updateStateButtons(data) {
        if (!stateButtonsContainer) return;
        const filteredData = applyQuickFilters(data);
        const states = [...new Set(filteredData
            .map(p => p.estado)
            .filter(s => s)
        )].sort();

        stateButtonsContainer.innerHTML = states.map(state => {
            const stateClass = state.toLowerCase().replace(/\s+/g, '-');
            return `<button class="state-button ${quickFilters.state === state ? 'active' : ''}" data-state="${stateClass}">${state}</button>`;
        }).join('');

        const stateButtons = stateButtonsContainer.querySelectorAll('.state-button');
        stateButtons.forEach(button => {
            button.addEventListener('click', () => {
                const state = button.textContent;
                quickFilters.state = quickFilters.state === state ? null : state;
                stateButtons.forEach(btn => btn.classList.remove('active'));
                if (quickFilters.state) button.classList.add('active');
                loadPacientes();
            });
        });
    }

    function updatePagination(totalRecordsCount) {
        if (!pageInfo || !totalRecords || !prevBtn || !nextBtn) return;
        const totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    function updateMassiveStateButton() {
        if (!massiveStateBtn) {
            console.error('Botón massive-state-btn no encontrado en el DOM');
            return;
        }
        console.debug('Actualizando visibilidad del botón Estado Masivo:', {
            selectedPacientesSize: selectedPacientes.size,
            selectedPacientes: [...selectedPacientes]
        });
        massiveStateBtn.style.display = selectedPacientes.size > 0 ? 'inline-block' : 'none';
        if (selectedPacientes.size > 0) {
            massiveStateBtn.removeAttribute('hidden');
        } else {
            massiveStateBtn.setAttribute('hidden', true);
        }
    }

   async function loadPacientes() {
    try {
        if (!pacientesTableBody) {
            console.error('Tabla de pacientes no encontrada');
            showSuccessMessage('Error: No se encontró la tabla de pacientes', false);
            hideSpinner();
            return;
        }

        showSpinner();

        const pacientesCollection = collection(db, 'pacientesconsignacion');
        const q = query(
            pacientesCollection,
            orderBy('fechaCX', 'desc'),
            orderBy('nombrePaciente', 'asc'),
            orderBy('proveedor', 'asc')
        );
        const querySnapshot = await getDocs(q);
        pacientesTableBody.innerHTML = '';
        pacientes = [];
        selectedPacientes.clear();
        querySnapshot.forEach(doc => {
            const data = doc.data();
            console.debug('Documento cargado:', {
                docId: doc.id,
                fechaIngreso: data.fechaIngreso,
                fechaCX: data.fechaCX,
                fechaCargo: data.fechaCargo,
                data: data
            });
            pacientes.push({
                docId: doc.id,
                fechaCX: data.fechaCX instanceof Timestamp ? data.fechaCX : null,
                fechaIngreso: data.fechaIngreso instanceof Timestamp ? data.fechaIngreso : null,
                fechaCargo: data.fechaCargo instanceof Timestamp ? data.fechaCargo : null,
                ...data
            });
        });

        if (pacientes.length === 0) {
            console.warn('No se encontraron documentos en pacientesconsignacion');
            pacientesTableBody.innerHTML = '<tr><td colspan="14">No hay pacientes disponibles</td></tr>';
            hideSpinner();
            updateMassiveStateButton();
            return;
        }

        await updatePrevisionFromReportesPabellon();

        updateYearFilter(pacientes);
        updateMonthFilter(pacientes);
        updateStateButtons(pacientes);

        let filteredPacientes = applyQuickFilters(pacientes);
        filteredPacientes = applyFilters(filteredPacientes);

        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        const paginatedPacientes = filteredPacientes.slice(startIndex, endIndex);

        paginatedPacientes.forEach(paciente => {
            const tr = document.createElement('tr');
            const estado = paciente.estado || '';
            const estadoClass = estado ? `state-${estado.toLowerCase().replace(/\s+/g, '-')}` : '';
            tr.className = estadoClass;
            tr.innerHTML = `
                <td><input type="checkbox" class="select-paciente" data-id="${paciente.docId}"></td>
                <td>
                    <i class="fas fa-edit action-icon" data-id="${paciente.docId}" title="Editar"></i>
                    <i class="fas fa-trash action-icon" data-id="${paciente.docId}" title="Eliminar"></i>
                    <i class="fas fa-history action-icon" data-id="${paciente.docId}" title="Historial"></i>
                </td>
                <td>${formatDateOnly(paciente.fechaIngreso)}</td>
                <td>${paciente.modalidad || '-'}</td>
                <td>${paciente.prevision || '-'}</td>
                <td>${paciente.admision || '-'}</td>
                <td>${paciente.nombrePaciente || '-'}</td>
                <td>${paciente.medico || '-'}</td>
                <td>${formatDateOnly(paciente.fechaCX)}</td>
                <td>${paciente.proveedor || '-'}</td>
                <td class="state-cell" data-id="${paciente.docId}">${paciente.estado || '-'}</td>
                <td>${formatDateOnly(paciente.fechaCargo)}</td>
                <td>${formatPrice(paciente.totalPaciente)}</td>
                <td>${paciente.usuario || '-'}</td>
            `;
            pacientesTableBody.appendChild(tr);
        });

        updatePagination(filteredPacientes.length);
        updateMassiveStateButton();
        setupCheckboxListeners();
        hideSpinner();
    } catch (error) {
        console.error('Error al cargar pacientes:', error.code, error.message);
        showSuccessMessage('Error al cargar pacientes: ' + error.message, false);
        hideSpinner();
    }
}

    function setupCheckboxListeners() {
        const checkboxes = document.querySelectorAll('.select-paciente');
        console.debug('Configurando listeners para checkboxes:', { count: checkboxes.length });
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) {
                    selectedPacientes.add(id);
                } else {
                    selectedPacientes.delete(id);
                }
                console.debug('Checkbox cambiado:', { id, checked: e.target.checked, selectedPacientes: [...selectedPacientes] });
                updateMassiveStateButton();
            });
        });

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const checkboxes = document.querySelectorAll('.select-paciente');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                    const id = checkbox.dataset.id;
                    if (isChecked) {
                        selectedPacientes.add(id);
                    } else {
                        selectedPacientes.delete(id);
                    }
                });
                console.debug('Select all cambiado:', { isChecked, selectedPacientes: [...selectedPacientes] });
                updateMassiveStateButton();
            });
        } else {
            console.warn('Checkbox select-all-checkbox no encontrado');
        }
    }

    function openEditModal(paciente) {
        if (!editModal) {
            console.error('editModal no encontrado');
            return;
        }
        console.debug('Abriendo modal para paciente:', {
            docId: paciente.docId,
            fechaIngreso: paciente.fechaIngreso,
            fechaIngresoType: typeof paciente.fechaIngreso,
            fechaIngresoIsTimestamp: paciente.fechaIngreso instanceof Timestamp,
            fechaIngresoFormatted: formatDateOnly(paciente.fechaIngreso),
            fechaCX: paciente.fechaCX,
            fechaCXType: typeof paciente.fechaCX,
            fechaCXIsTimestamp: paciente.fechaCX instanceof Timestamp,
            fechaCXFormatted: formatDateOnly(paciente.fechaCX),
            fechaCargo: paciente.fechaCargo,
            fechaCargoType: typeof paciente.fechaCargo,
            fechaCargoIsTimestamp: paciente.fechaCargo instanceof Timestamp,
            fechaCargoFormatted: formatDateOnly(paciente.fechaCargo),
            paciente: paciente
        });
        currentEditId = paciente.docId;
        const today = new Date().toISOString().split('T')[0];
        editFechaIngresoInput.value = formatDateOnly(paciente.fechaIngreso) || today;
        editAdmisionInput.value = paciente.admision || '';
        editNombrePacienteInput.value = paciente.nombrePaciente || '';
        editFechaCXInput.value = formatDateOnly(paciente.fechaCX) || today;
        editMedicoInput.value = paciente.medico || '';
        editProveedorInput.value = paciente.proveedor || '';
        editPrevisionInput.value = paciente.prevision || '';
        editAtributoInput.value = paciente.modalidad || '';
        editEstadoSelect.value = paciente.estado || 'Actualizar Precio';
        editFechaCargoInput.value = formatDateOnly(paciente.fechaCargo) || today;
        editTotalPacienteInput.value = paciente.totalPaciente ? formatPrice(paciente.totalPaciente) : '0';
        console.debug('Valores asignados a inputs:', {
            fechaIngresoInput: editFechaIngresoInput.value,
            fechaCXInput: editFechaCXInput.value,
            fechaCargoInput: editFechaCargoInput.value
        });
        showModal(editModal);
    }

    function openChangeStateModal(paciente) {
        if (!changeStateModal || !changeStateSelect) {
            console.error('changeStateModal o changeStateSelect no encontrados');
            return;
        }
        currentStateChangeId = paciente.docId;
        changeStateSelect.value = paciente.estado || 'Actualizar Precio';
        showModal(changeStateModal);
    }

    function openMassiveStateModal(e) {
        if (!massiveStateModal || !massiveStateSelect || !massiveFechaCargoInput) {
            console.error('Elementos del modal masivo no encontrados:', {
                massiveStateModal: !!massiveStateModal,
                massiveStateSelect: !!massiveStateSelect,
                massiveFechaCargoInput: !!massiveFechaCargoInput
            });
            showSuccessMessage('Error: No se pudo abrir el modal de estado masivo', false);
            return;
        }
        massiveStateSelect.value = 'Actualizar Precio';
        const today = new Date().toISOString().split('T')[0];
        massiveFechaCargoInput.value = today;
        showModal(massiveStateModal);
        if (e) e.stopPropagation(); 
    }

    function openDeleteModal(paciente) {
        if (!deleteModal || !deleteMessage) {
            console.error('deleteModal o deleteMessage no encontrados');
            return;
        }
        deleteMessage.textContent = `¿Estás seguro de que quieres eliminar el paciente "${paciente?.nombrePaciente || 'Sin paciente'}"?`;
        confirmDeleteBtn.dataset.id = paciente.docId;
        showModal(deleteModal);
    }

    async function loadLogs(pacienteId) {
        if (!logContent) {
            console.error('logContent no encontrado');
            return;
        }
        try {
            const logsCollection = collection(db, 'pacientesconsignacion', pacienteId, 'logs');
            const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'));
            const logsSnapshot = await getDocs(logsQuery);
            logContent.innerHTML = '';
            if (logsSnapshot.empty) {
                logContent.innerHTML = '<p>No hay registros de cambios.</p>';
            } else {
                logsSnapshot.forEach(doc => {
                    const logData = doc.data();
                    const timestamp = logData.timestamp?.toDate?.() || new Date();
                    const fechaDisplay = timestamp ? formatDate(timestamp) : 'Sin fecha';
                    let action = logData.action;
                    if (action.startsWith('Creado:')) action = 'Creación';
                    else if (action.startsWith('Actualizado:')) action = 'Modificado';
                    else if (action.startsWith('Eliminado:')) action = 'Eliminado';
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
            console.error('Error al cargar logs:', error);
            showSuccessMessage('Error al cargar historial: ' + error.message, false);
        }
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
                    loadPacientes();
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
                    loadPacientes();
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
                            loadPacientes();
                        }
                    }
                }, { once: true });
            });
        });
    }

    function setupQuickFilters() {
        if (filterYearSelect) {
            filterYearSelect.addEventListener('change', () => {
                quickFilters.year = filterYearSelect.value;
                quickFilters.month = null;
                quickFilters.state = null;
                currentPage = 1;
                loadPacientes();
            });
        }

        if (filterMonthSelect) {
            filterMonthSelect.addEventListener('change', () => {
                quickFilters.month = filterMonthSelect.value;
                quickFilters.state = null;
                currentPage = 1;
                loadPacientes();
            });
        }

        if (showAllBtn) {
            showAllBtn.addEventListener('click', () => {
                quickFilters.year = null;
                quickFilters.month = null;
                quickFilters.state = null;
                currentPage = 1;
                loadPacientes();
            });
        }
    }

    function exportToExcel() {
        if (!pacientes.length) {
            showSuccessMessage('No hay datos para exportar', false);
            return;
        }
        let filteredPacientes = applyQuickFilters(pacientes);
        filteredPacientes = applyFilters(filteredPacientes);
        const data = filteredPacientes.map(p => ({
            'Fecha de Ingreso': formatDateOnly(p.fechaIngreso),
            'Modalidad': p.modalidad || '-',
            'Previsión': p.prevision || '-',
            'Admisión': p.admision || '-',
            'Nombre del Paciente': p.nombrePaciente || '-',
            'Médico': p.medico || '-',
            'Fecha de Cx': formatDateOnly(p.fechaCX),
            'Proveedor': p.proveedor || '-',
            'Estado': p.estado || '-',
            'Fecha de Cargo': formatDateOnly(p.fechaCargo),
            'Total Paciente': formatPrice(p.totalPaciente),
            'Usuario': p.usuario || '-'
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'PacientesConsignacion');
        XLSX.write(workbook, 'pacientesconsignacion.xlsx');
    }

    async function init() {
        if (!container || !pacientesTableBody) {
            console.error('Contenedor o tabla no encontrado');
            container.innerHTML = '<p>Error: No se encontraron elementos esenciales. Verifica la configuración.</p>';
            return;
        }


        try {
            setupFilters();
            setupQuickFilters();

            if (massiveStateBtn) {
                massiveStateBtn.addEventListener('click', (e) => {
                    openMassiveStateModal(e); 
                });
            } else {
                console.error('Botón massive-state-btn no encontrado en el DOM');
                showSuccessMessage('Error: Botón de Estado Masivo no encontrado', false);
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    if (currentPage > 1) {
                        currentPage--;
                        loadPacientes();
                    }
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    currentPage++;
                    loadPacientes();
                });
            }

            if (exportExcelBtn) {
                exportExcelBtn.addEventListener('click', exportToExcel);
            }

            if (saveMassiveStateBtn) {
                saveMassiveStateBtn.addEventListener('click', async () => {
                    const estado = massiveStateSelect?.value || 'Actualizar Precio';
                    const fechaCargo = massiveFechaCargoInput?.value || '';
                    if (selectedPacientes.size === 0) {
                        showSuccessMessage('No se han seleccionado pacientes', false);
                        return;
                    }

                    let fechaCargoTimestamp = null;
                    if (fechaCargo) {
                        const [year, month, day] = fechaCargo.split('-');
                        const fechaCargoDate = new Date(year, month - 1, day);
                        fechaCargoDate.setHours(0, 0, 0, 0);
                        if (!isNaN(fechaCargoDate)) {
                            fechaCargoTimestamp = Timestamp.fromDate(fechaCargoDate);
                        } else {
                            showSuccessMessage('Fecha de Cargo inválida', false);
                            return;
                        }
                    }

                    try {
                        const fullName = await getUserFullName();
                        const now = Timestamp.fromDate(new Date());
                        const batch = writeBatch(db);

                        for (const id of selectedPacientes) {
                            const pacienteRef = doc(db, 'pacientesconsignacion', id);
                            const updateData = {
                                estado,
                                usuario: fullName,
                                fechaActualizada: now,
                                uid: currentUser.uid
                            };
                            if (fechaCargoTimestamp) {
                                updateData.fechaCargo = fechaCargoTimestamp;
                            }
                            batch.update(pacienteRef, updateData);
                            const logRef = doc(collection(db, 'pacientesconsignacion', id, 'logs'));
                            batch.set(logRef, {
                                action: `Actualizado: ${formatDate(new Date(now.toMillis()))}`,
                                details: `Cambio masivo: Estado a ${estado}${fechaCargoTimestamp ? `, Fecha de Cargo a ${formatDateOnly(fechaCargoTimestamp)}` : ''}`,
                                timestamp: now,
                                user: fullName,
                                uid: currentUser.uid
                            });
                        }

                        await batch.commit();
                        hideModal(massiveStateModal);
                        showSuccessMessage(`Se actualizaron ${selectedPacientes.size} pacientes correctamente`);
                        selectedPacientes.clear();
                        if (selectAllCheckbox) selectAllCheckbox.checked = false;
                        await loadPacientes();
                    } catch (error) {
                        console.error('Error al actualizar estado masivo:', error);
                        showSuccessMessage('Error al actualizar estado masivo: ' + error.message, false);
                    }
                });
            } else {
                console.error('Botón save-massive-state-btn no encontrado');
            }

            if (cancelMassiveStateBtn) {
                cancelMassiveStateBtn.addEventListener('click', () => {
                    hideModal(massiveStateModal);
                });
            } else {
                console.error('Botón cancel-massive-state-btn no encontrado');
            }

            if (saveStateBtn) {
                saveStateBtn.addEventListener('click', async () => {
                    const estado = changeStateSelect?.value || 'Actualizar Precio';
                    if (!currentStateChangeId) {
                        showSuccessMessage('Error: No se seleccionó un paciente', false);
                        return;
                    }

                    try {
                        const fullName = await getUserFullName();
                        const now = Timestamp.fromDate(new Date());
                        const pacienteRef = doc(db, 'pacientesconsignacion', currentStateChangeId);
                        const batch = writeBatch(db);
                        batch.update(pacienteRef, {
                            estado,
                            usuario: fullName,
                            fechaActualizada: now,
                            uid: currentUser.uid
                        });
                        const logRef = doc(collection(db, 'pacientesconsignacion', currentStateChangeId, 'logs'));
                        batch.set(logRef, {
                            action: `Actualizado: ${formatDate(new Date(now.toMillis()))}`,
                            details: `Estado cambiado a ${estado}`,
                            timestamp: now,
                            user: fullName,
                            uid: currentUser.uid
                        });
                        await batch.commit();
                        hideModal(changeStateModal);
                        showSuccessMessage('Estado actualizado correctamente');
                        await loadPacientes();
                    } catch (error) {
                        console.error('Error al actualizar estado:', error);
                        showSuccessMessage('Error al actualizar estado: ' + error.message, false);
                    }
                });
            }

            if (cancelStateBtn) {
                cancelStateBtn.addEventListener('click', () => {
                    hideModal(changeStateModal);
                    currentStateChangeId = null;
                });
            }

            onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    console.error('No hay usuario autenticado');
                    container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión.</p>';
                    setTimeout(() => {
                        window.location.href = 'index.html?error=auth-required';
                    }, 1000);
                    return;
                }

                currentUser = user;
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (!userDoc.exists()) {
                        console.error('Documento de usuario no encontrado para UID:', user.uid);
                        container.innerHTML = '<p>Error: Tu cuenta no está registrada. Contacta al administrador.</p>';
                        return;
                    }

                    const userData = userDoc.data();
                    const hasAccess = userData.role === 'Administrador' ||
                        (userData.permissions && userData.permissions.includes('Consignacion:PacientesConsignacion'));
                    if (!hasAccess) {
                        console.error('Acceso denegado');
                        container.innerHTML = '<p>Acceso denegado. No tienes permisos para este módulo.</p>';
                        return;
                    }

                    await loadPacientes();

                    if (saveEditBtn) {
                        saveEditBtn.addEventListener('click', async () => {
                            const fechaIngreso = editFechaIngresoInput?.value || '';
                            const admision = editAdmisionInput?.value.trim() || '';
                            const nombrePaciente = editNombrePacienteInput?.value.trim() || '';
                            const fechaCX = editFechaCXInput?.value || '';
                            const medico = editMedicoInput?.value.trim() || '';
                            const proveedor = editProveedorInput?.value.trim() || '';
                            const prevision = editPrevisionInput?.value.trim() || '';
                            const modalidad = editAtributoInput?.value.trim() || '';
                            const estado = editEstadoSelect?.value || 'Actualizar Precio';
                            const fechaCargo = editFechaCargoInput?.value || '';
                            let totalPaciente = editTotalPacienteInput?.value.replace(/[^0-9]/g, '') || '0';
                            totalPaciente = parseInt(totalPaciente) || 0;

                            if (!admision || !nombrePaciente || !fechaCX || !medico || !proveedor) {
                                showSuccessMessage('Complete todos los campos obligatorios', false);
                                return;
                            }

                            try {
                                const fullName = await getUserFullName();
                                const now = Timestamp.fromDate(new Date());
                                const pacienteRef = doc(db, 'pacientesconsignacion', currentEditId);
                                const batch = writeBatch(db);

                                let fechaIngresoTimestamp = null;
                                if (fechaIngreso) {
                                    const [year, month, day] = fechaIngreso.split('-');
                                    const fechaIngresoDate = new Date(year, month - 1, day);
                                    fechaIngresoDate.setHours(0, 0, 0, 0);
                                    if (!isNaN(fechaIngresoDate)) {
                                        fechaIngresoTimestamp = Timestamp.fromDate(fechaIngresoDate);
                                    } else {
                                        showSuccessMessage('Fecha de Ingreso inválida', false);
                                        return;
                                    }
                                }

                                let fechaCXTimestamp = null;
                                if (fechaCX) {
                                    const [year, month, day] = fechaCX.split('-');
                                    const fechaCXDate = new Date(year, month - 1, day);
                                    fechaCXDate.setHours(0, 0, 0, 0);
                                    if (!isNaN(fechaCXDate)) {
                                        fechaCXTimestamp = Timestamp.fromDate(fechaCXDate);
                                    } else {
                                        showSuccessMessage('Fecha de Cx inválida', false);
                                        return;
                                    }
                                }

                                let fechaCargoTimestamp = null;
                                if (fechaCargo) {
                                    const [year, month, day] = fechaCargo.split('-');
                                    const fechaCargoDate = new Date(year, month - 1, day);
                                    fechaCargoDate.setHours(0, 0, 0, 0);
                                    if (!isNaN(fechaCargoDate)) {
                                        fechaCargoTimestamp = Timestamp.fromDate(fechaCargoDate);
                                    } else {
                                        showSuccessMessage('Fecha de Cargo inválida', false);
                                        return;
                                    }
                                }

                                batch.update(pacienteRef, {
                                    fechaIngreso: fechaIngresoTimestamp,
                                    admision,
                                    nombrePaciente,
                                    fechaCX: fechaCXTimestamp,
                                    medico,
                                    proveedor,
                                    prevision,
                                    modalidad,
                                    estado,
                                    fechaCargo: fechaCargoTimestamp,
                                    totalPaciente,
                                    usuario: fullName,
                                    fechaActualizada: now,
                                    uid: currentUser.uid
                                });
                                const logRef = doc(collection(db, 'pacientesconsignacion', currentEditId, 'logs'));
                                batch.set(logRef, {
                                    action: `Actualizado: ${formatDate(new Date(now.toMillis()))}`,
                                    details: `Paciente ${nombrePaciente} actualizado`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: currentUser.uid
                                });
                                await batch.commit();
                                hideModal(editModal);
                                showSuccessMessage('Paciente actualizado correctamente');
                                await loadPacientes();
                            } catch (error) {
                                console.error('Error al actualizar:', error);
                                showSuccessMessage('Error al actualizar: ' + error.message, false);
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
                            const id = confirmDeleteBtn.dataset.id;
                            try {
                                const fullName = await getUserFullName();
                                const now = Timestamp.fromDate(new Date());
                                const batch = writeBatch(db);
                                batch.delete(doc(db, 'pacientesconsignacion', id));
                                const logRef = doc(collection(db, 'pacientesconsignacion', id, 'logs'));
                                batch.set(logRef, {
                                    action: `Eliminado: ${formatDate(new Date(now.toMillis()))}`,
                                    details: `Paciente eliminado`,
                                    timestamp: now,
                                    user: fullName,
                                    uid: currentUser.uid
                                });
                                await batch.commit();
                                hideModal(deleteModal);
                                showSuccessMessage('Paciente eliminado correctamente');
                                await loadPacientes();
                            } catch (error) {
                                console.error('Error al eliminar:', error);
                                showSuccessMessage('Error al eliminar: ' + error.message, false);
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

                    pacientesTableBody.addEventListener('click', e => {
                        const target = e.target;
                        if (!target.classList.contains('action-icon')) return;
                        const id = target.dataset.id;
                        const paciente = pacientes.find(p => p.docId === id);
                        if (!paciente) return;
                        if (target.classList.contains('fa-edit')) {
                            openEditModal(paciente);
                        } else if (target.classList.contains('fa-trash')) {
                            openDeleteModal(paciente);
                        } else if (target.classList.contains('fa-history')) {
                            loadLogs(id);
                        }
                    });

                    pacientesTableBody.addEventListener('dblclick', e => {
                        const target = e.target;
                        if (!target.classList.contains('state-cell')) return;
                        const id = target.dataset.id;
                        const paciente = pacientes.find(p => p.docId === id);
                        if (!paciente) return;
                        openChangeStateModal(paciente);
                    });

                    document.addEventListener('click', (e) => {
                        if (
                            e.target.closest('.modal-content') ||
                            e.target.classList.contains('action-icon') ||
                            e.target.classList.contains('modal-btn') ||
                            e.target.id === 'massive-state-btn' ||
                            e.target.id === 'show-all-btn' ||
                            e.target.id === 'prev-btn' ||
                            e.target.id === 'next-btn' ||
                            e.target.id === 'export-excel-btn' ||
                            e.target.classList.contains('state-button') ||
                            e.target.classList.contains('filter-icon')
                        ) {
                            console.debug('Clic ignorado para cierre de modales:', { target: e.target.id || e.target.className });
                            return;
                        }
                        console.debug('Clic fuera de modales, verificando cuáles cerrar', { target: e.target.id || e.target.className });
                        if (editModal && !editModal.hasAttribute('hidden')) hideModal(editModal);
                        if (deleteModal && !deleteModal.hasAttribute('hidden')) hideModal(deleteModal);
                        if (logModal && !logModal.hasAttribute('hidden')) hideModal(logModal);
                        if (changeStateModal && !changeStateModal.hasAttribute('hidden')) hideModal(changeStateModal);
                        if (massiveStateModal && !massiveStateModal.hasAttribute('hidden')) hideModal(massiveStateModal);
                    });
                } catch (error) {
                    console.error('Error al inicializar:', error);
                    container.innerHTML = '<p>Error al inicializar el módulo. Por favor, intenta de nuevo.</p>';
                }
            });

            await loadPacientes();
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
} catch (error) {
    console.error('Error global:', error);
    const container = document.querySelector('.pacientesconsignacion-container');
    if (container) {
        container.innerHTML = '<p>Error crítico al cargar el módulo. Contacta al administrador.</p>';
    }

}

