import { getFirestore, collection, addDoc, updateDoc, doc, getDocs, getDoc, deleteDoc, query, where, Timestamp, writeBatch, orderBy, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getApps, initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';

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
        console.error('Error al configurar persistencia:', error);
    });

    const elements = {
        container: document.querySelector('.referencias-container'),
        asignacionForm: document.getElementById('asignacion-form'),
        fechaIngresoInput: document.getElementById('fecha-ingreso'),
        admisionInput: document.getElementById('admisión'),
        nombrePacienteInput: document.getElementById('nombrePaciente'),
        fechaCXInput: document.getElementById('fechaCX'),
        medicoInput: document.getElementById('medico'),
        medicoSearch: document.getElementById('medico-search'),
        medicoList: document.getElementById('medico-list'),
        descripcionInput: document.getElementById('descripcion'),
        descripcionSearch: document.getElementById('descripcion-search'),
        descripcionModeToggle: document.getElementById('descripcion-mode-toggle'),
        descripcionList: document.getElementById('descripcion-list'),
        cantidadInput: document.getElementById('cantidad'),
        estadoSelect: document.getElementById('estado'),
        codigoInput: document.getElementById('codigo'),
        referenciaInput: document.getElementById('referencia'),
        proveedorInput: document.getElementById('proveedor'),
        proveedorSearch: document.getElementById('proveedor-search'),
        proveedorList: document.getElementById('proveedor-list'),
        modalidadSelect: document.getElementById('modalidad'),
        precioInput: document.getElementById('precio'),
        totalInput: document.getElementById('total'),
        registrarBtn: document.getElementById('registrar-btn'),
        limpiarBtn: document.getElementById('limpiar-btn'),
        traspasoModal: document.getElementById('traspaso-modal'),
        traspasoTypeSelect: document.getElementById('traspaso-type'),
        traspasoSelect: document.getElementById('traspaso-select'),
        currentDateSpan: document.getElementById('current-date'),
        confirmTraspasoBtn: document.getElementById('confirm-traspaso-btn'),
        cancelTraspasoBtn: document.getElementById('cancel-traspaso-btn'),
        selectAsignacionesModal: document.getElementById('select-asignaciones-modal'),
        selectAsignacionesTableBody: document.querySelector('#select-asignaciones-table tbody'),
        confirmSelectBtn: document.getElementById('confirm-select-btn'),
        cancelSelectBtn: document.getElementById('cancel-select-btn'),
        successModal: document.getElementById('success-modal'),
        successIcon: document.getElementById('success-icon'),
        successMessage: document.getElementById('success-message'),
        editModal: document.getElementById('edit-modal'),
        editFechaIngresoInput: document.getElementById('edit-fecha-ingreso'),
        editAdmisionInput: document.getElementById('edit-admisión'),
        editNombrePacienteInput: document.getElementById('edit-nombrePaciente'),
        editFechaCXInput: document.getElementById('edit-fechaCX'),
        editMedicoInput: document.getElementById('edit-medico'),
        editMedicoSearch: document.getElementById('edit-medico-search'),
        editMedicoList: document.getElementById('edit-medico-list'),
        editDescripcionInput: document.getElementById('edit-descripcion'),
        editDescripcionSearch: document.getElementById('edit-descripcion-search'),
        editDescripcionModeToggle: document.getElementById('edit-descripcion-mode-toggle'),
        editDescripcionList: document.getElementById('edit-descripcion-list'),
        editCantidadInput: document.getElementById('edit-cantidad'),
        editEstadoSelect: document.getElementById('edit-estado'),
        editCodigoInput: document.getElementById('edit-codigo'),
        editReferenciaInput: document.getElementById('edit-referencia'),
        editProveedorInput: document.getElementById('edit-proveedor'),
        editModalidadSelect: document.getElementById('edit-modalidad'),
        editPrecioInput: document.getElementById('edit-precio'),
        editTotalInput: document.getElementById('edit-total'),
        saveEditBtn: document.getElementById('save-edit-btn'),
        cancelEditBtn: document.getElementById('cancel-edit-btn'),
        deleteModal: document.getElementById('delete-modal'),
        deleteMessage: document.getElementById('delete-message'),
        confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
        cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
        logModal: document.getElementById('log-modal'),
        logContent: document.getElementById('log-content'),
        closeLogBtn: document.getElementById('close-log-btn'),
        asignacionesTableBody: document.querySelector('#asignaciones-table tbody'),
        loadingModal: document.getElementById('loading-modal')
    };

    Object.entries(elements).forEach(([key, el]) => {
        if (!el) console.warn(`Elemento ${key} no encontrado`);
    });

    let currentUser = null;
    let currentEditId = null;
    let asignaciones = [];
    let descripcionMode = 'Consignación';
    let editDescripcionMode = 'Consignación';

    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0]; 
    if (elements.fechaIngresoInput) {
        elements.fechaIngresoInput.value = formattedToday;
    }

    function parseDate(dateStr) {
        if (!dateStr) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            return isNaN(date.getTime()) ? null : date;
        }
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            return isNaN(date.getTime()) ? null : date;
        }
        return null;
    }

    function formatDateForInput(date) {
        if (!date || isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    }

    function formatDateOnly(date) {
        if (!date) return '';
        let parsedDate;
        if (date instanceof Timestamp) {
            parsedDate = date.toDate();
        } else if (date instanceof Date) {
            parsedDate = date;
        } else if (typeof date === 'string') {
            parsedDate = parseDate(date);
        } else {
            return '';
        }
        if (!parsedDate || isNaN(parsedDate.getTime())) return '';
        return `${String(parsedDate.getDate()).padStart(2, '0')}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${parsedDate.getFullYear()}`;
    }

    function validateDateFormat(dateStr) {
        return parseDate(dateStr) !== null;
    }

    function showLoadingModal() {
        if (elements.loadingModal) {
            elements.loadingModal.style.display = 'flex';
            elements.loadingModal.removeAttribute('hidden');
        }
    }

    function hideLoadingModal() {
        if (elements.loadingModal) {
            elements.loadingModal.style.display = 'none';
            elements.loadingModal.setAttribute('hidden', true);
        }
    }

    function formatPrice(input) {
        if (!input) return;
        input.addEventListener('input', () => {
            let value = input.value.replace(/[^0-9]/g, '');
            if (value) {
                value = parseInt(value).toLocaleString('es-CL', { minimumFractionDigits: 0 });
                input.value = value;
            } else {
                input.value = '';
            }
            updateTotal(input === elements.precioInput ? elements.totalInput : elements.editTotalInput);
        });
        input.addEventListener('blur', () => {
            if (!input.value) {
                input.value = '0';
                updateTotal(input === elements.precioInput ? elements.totalInput : elements.editTotalInput);
                return;
            }
            let value = input.value.replace(/[^0-9]/g, '');
            value = value ? parseInt(value).toLocaleString('es-CL', { minimumFractionDigits: 0 }) : '0';
            input.value = value;
            updateTotal(input === elements.precioInput ? elements.totalInput : elements.editTotalInput);
        });
    }

    function updateTotal(totalField) {
        if (!elements.cantidadInput || !elements.precioInput || !elements.totalInput || !elements.editCantidadInput || !elements.editPrecioInput || !elements.editTotalInput) return;
        const cantidad = parseInt(totalField === elements.totalInput ? elements.cantidadInput.value : elements.editCantidadInput.value) || 1;
        let precio = (totalField === elements.totalInput ? elements.precioInput.value : elements.editPrecioInput.value).replace(/[^0-9]/g, '');
        precio = parseInt(precio) || 0;
        totalField.value = (cantidad * precio).toLocaleString('es-CL', { minimumFractionDigits: 0 });
    }

    function formatDate(date) {
        return date.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    }

    async function loadEmpresas() {
        try {
            const empresasSnapshot = await getDocs(collection(db, 'empresas'));
            return empresasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error al cargar empresas:', error);
            showSuccessMessage('No se pudieron cargar las empresas.', false);
            return [];
        }
    }

    async function loadMedicos() {
        try {
            const medicosSnapshot = await getDocs(collection(db, 'medicos'));
            const medicos = medicosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (medicos.length === 0) console.warn('No se encontraron médicos.');
            return medicos;
        } catch (error) {
            console.error('Error al cargar médicos:', error);
            showSuccessMessage('No se pudieron cargar los médicos.', false);
            return [];
        }
    }

    async function loadDescripciones(mode = 'Consignación') {
        try {
            const q = query(collection(db, 'referencias'), where('modalidad', '==', mode));
            const referenciasSnapshot = await getDocs(q);
            return referenciasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error al cargar descripciones:', error);
            showSuccessMessage('No se pudieron cargar las descripciones.', false);
            return [];
        }
    }

    async function fetchReferenciaData(descripcion, modalidad) {
        try {
            const q = query(collection(db, 'referencias'), where('descripcion', '==', descripcion), where('modalidad', '==', modalidad));
            const querySnapshot = await getDocs(q);
            return querySnapshot.empty ? null : querySnapshot.docs[0].data();
        } catch (error) {
            console.error('Error al obtener datos de referencia:', error);
            showSuccessMessage('Error al obtener datos de referencia.', false);
            return null;
        }
    }

    function fillFormFields(data, isEdit = false) {
        const fields = isEdit ? {
            codigo: elements.editCodigoInput,
            referencia: elements.editReferenciaInput,
            proveedor: elements.editProveedorInput,
            modalidad: elements.editModalidadSelect,
            precio: elements.editPrecioInput,
            total: elements.editTotalInput
        } : {
            codigo: elements.codigoInput,
            referencia: elements.referenciaInput,
            proveedor: elements.proveedorInput,
            modalidad: elements.modalidadSelect,
            precio: elements.precioInput,
            total: elements.totalInput
        };

        if (data) {
            fields.codigo.value = data.codigo || '';
            fields.referencia.value = data.referencia || '';
            fields.proveedor.value = data.proveedor || '';
            fields.modalidad.value = data.modalidad || 'Consignación';
            fields.precio.value = data.precio ? parseInt(data.precio).toLocaleString('es-CL') : '0';
            fields.codigo.setAttribute('readonly', true);
            fields.referencia.setAttribute('readonly', true);
            fields.proveedor.setAttribute('readonly', true);
            fields.modalidad.disabled = true;
            fields.precio.setAttribute('readonly', true);
            updateTotal(fields.total);
        } else {
            fields.codigo.value = '';
            fields.referencia.value = '';
            fields.proveedor.value = '';
            fields.modalidad.value = 'Consignación';
            fields.precio.value = '0';
            fields.codigo.setAttribute('readonly', true);
            fields.referencia.setAttribute('readonly', true);
            fields.proveedor.setAttribute('readonly', true);
            fields.modalidad.disabled = true;
            fields.precio.setAttribute('readonly', true);
            updateTotal(fields.total);
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
            li.addEventListener('click', async () => {
                input.value = item[displayProperty] || '';
                input.dataset.id = item.id;
                list.innerHTML = '';
                list.style.display = 'none';
                if (input.id === 'descripcion' || input.id === 'edit-descripcion') {
                    const isEdit = input.id === 'edit-descripcion';
                    const modalidad = isEdit ? elements.editModalidadSelect.value : elements.modalidadSelect.value;
                    const referenciaData = await fetchReferenciaData(item[displayProperty], modalidad);
                    fillFormFields(referenciaData, isEdit);
                }
            });
            list.appendChild(li);
        });
        list.style.display = filteredItems.length > 0 ? 'block' : 'none';
    }

    async function setupProveedorAutocomplete() {
        if (!elements.proveedorInput || !elements.proveedorSearch || !elements.proveedorList) return;
        const empresas = await loadEmpresas();
        elements.proveedorInput.addEventListener('input', () => filterAndRenderSuggestions(elements.proveedorInput, elements.proveedorList, empresas, false, 'nombre'));
        elements.proveedorInput.addEventListener('focus', () => {
            if (elements.proveedorInput.value.trim()) filterAndRenderSuggestions(elements.proveedorInput, elements.proveedorList, empresas, false, 'nombre');
        });
        elements.proveedorSearch.addEventListener('click', () => filterAndRenderSuggestions(elements.proveedorInput, elements.proveedorList, empresas, true, 'nombre'));
        document.addEventListener('click', e => {
            if (!elements.proveedorInput.contains(e.target) && !elements.proveedorList.contains(e.target) && !elements.proveedorSearch.contains(e.target)) {
                elements.proveedorList.innerHTML = '';
                elements.proveedorList.style.display = 'none';
            }
        });
    }

    async function setupMedicoAutocomplete() {
        if (!elements.medicoInput || !elements.medicoList || !elements.medicoSearch) return;
        const medicos = await loadMedicos();
        elements.medicoInput.addEventListener('input', () => filterAndRenderSuggestions(elements.medicoInput, elements.medicoList, medicos, false, 'nombreMedico'));
        elements.medicoInput.addEventListener('focus', () => {
            if (elements.medicoInput.value.trim()) filterAndRenderSuggestions(elements.medicoInput, elements.medicoList, medicos, false, 'nombreMedico');
        });
        elements.medicoSearch.addEventListener('click', () => filterAndRenderSuggestions(elements.medicoInput, elements.medicoList, medicos, true, 'nombreMedico'));
        document.addEventListener('click', e => {
            if (!elements.medicoInput.contains(e.target) && !elements.medicoList.contains(e.target) && !elements.medicoSearch.contains(e.target)) {
                elements.medicoList.innerHTML = '';
                elements.medicoList.style.display = 'none';
            }
        });
    }

    async function setupEditMedicoAutocomplete() {
        if (!elements.editMedicoInput || !elements.editMedicoList || !elements.editMedicoSearch) return;
        const medicos = await loadMedicos();
        elements.editMedicoInput.addEventListener('input', () => filterAndRenderSuggestions(elements.editMedicoInput, elements.editMedicoList, medicos, false, 'nombreMedico'));
        elements.editMedicoInput.addEventListener('focus', () => {
            if (elements.editMedicoInput.value.trim()) filterAndRenderSuggestions(elements.editMedicoInput, elements.editMedicoList, medicos, false, 'nombreMedico');
        });
        elements.editMedicoSearch.addEventListener('click', () => filterAndRenderSuggestions(elements.editMedicoInput, elements.editMedicoList, medicos, true, 'nombreMedico'));
        document.addEventListener('click', e => {
            if (!elements.editMedicoInput.contains(e.target) && !elements.editMedicoList.contains(e.target) && !elements.editMedicoSearch.contains(e.target)) {
                elements.editMedicoList.innerHTML = '';
                elements.editMedicoList.style.display = 'none';
            }
        });
    }

    async function setupDescriptionAutocomplete() {
        if (!elements.descripcionInput || !elements.descripcionList || !elements.descripcionSearch || !elements.descripcionModeToggle) return;
        let descripciones = await loadDescripciones(descripcionMode);
        elements.descripcionModeToggle.className = `fas fa-toggle-${descripcionMode === 'Consignación' ? 'on' : 'off'}`;
        elements.descripcionModeToggle.title = descripcionMode;

        const updateDescriptionSuggestions = () => filterAndRenderSuggestions(elements.descripcionInput, elements.descripcionList, descripciones, false, 'descripcion');

        elements.descripcionInput.addEventListener('input', async () => {
            updateDescriptionSuggestions();
            if (!elements.descripcionInput.value.trim()) fillFormFields(null);
        });
        elements.descripcionInput.addEventListener('focus', () => {
            if (elements.descripcionInput.value.trim()) updateDescriptionSuggestions();
        });
        elements.descripcionSearch.addEventListener('click', () => filterAndRenderSuggestions(elements.descripcionInput, elements.descripcionList, descripciones, true, 'descripcion'));
        elements.descripcionModeToggle.addEventListener('click', async () => {
            descripcionMode = descripcionMode === 'Consignación' ? 'Cotización' : 'Consignación';
            elements.descripcionModeToggle.className = `fas fa-toggle-${descripcionMode === 'Consignación' ? 'on' : 'off'}`;
            elements.descripcionModeToggle.title = descripcionMode;
            descripciones = await loadDescripciones(descripcionMode);
            fillFormFields(null);
            updateDescriptionSuggestions();
        });
        document.addEventListener('click', e => {
            if (!elements.descripcionInput.contains(e.target) && !elements.descripcionList.contains(e.target) && !elements.descripcionSearch.contains(e.target) && !elements.descripcionModeToggle.contains(e.target)) {
                elements.descripcionList.innerHTML = '';
                elements.descripcionList.style.display = 'none';
            }
        });
    }

    async function setupEditDescriptionAutocomplete() {
        if (!elements.editDescripcionInput || !elements.editDescripcionList || !elements.editDescripcionSearch || !elements.editDescripcionModeToggle) return;
        let descripciones = await loadDescripciones(editDescripcionMode);
        elements.editDescripcionModeToggle.className = `fas fa-toggle-${editDescripcionMode === 'Consignación' ? 'on' : 'off'}`;
        elements.editDescripcionModeToggle.title = editDescripcionMode;

        const updateEditDescriptionSuggestions = () => filterAndRenderSuggestions(elements.editDescripcionInput, elements.editDescripcionList, descripciones, false, 'descripcion');

        elements.editDescripcionInput.addEventListener('input', async () => {
            updateEditDescriptionSuggestions();
            if (!elements.editDescripcionInput.value.trim()) fillFormFields(null, true);
        });
        elements.editDescripcionInput.addEventListener('focus', () => {
            if (elements.editDescripcionInput.value.trim()) updateEditDescriptionSuggestions();
        });
        elements.editDescripcionSearch.addEventListener('click', () => filterAndRenderSuggestions(elements.editDescripcionInput, elements.editDescripcionList, descripciones, true, 'descripcion'));
        elements.editDescripcionModeToggle.addEventListener('click', async () => {
            editDescripcionMode = editDescripcionMode === 'Consignación' ? 'Cotización' : 'Consignación';
            elements.editDescripcionModeToggle.className = `fas fa-toggle-${editDescripcionMode === 'Consignación' ? 'on' : 'off'}`;
            elements.editDescripcionModeToggle.title = editDescripcionMode;
            descripciones = await loadDescripciones(editDescripcionMode);
            fillFormFields(null, true);
            updateEditDescriptionSuggestions();
        });
        document.addEventListener('click', e => {
            if (!elements.editDescripcionInput.contains(e.target) && !elements.editDescripcionList.contains(e.target) && !elements.editDescripcionSearch.contains(e.target) && !elements.editDescripcionModeToggle.contains(e.target)) {
                elements.editDescripcionList.innerHTML = '';
                elements.editDescripcionList.style.display = 'none';
            }
        });
    }

    async function getUserFullName() {
        if (!currentUser) throw new Error('No se encontró el usuario autenticado');
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
        return userSnap.data().fullName || 'Usuario Desconocido';
    }

    function showModal(modal) {
        if (modal) {
            modal.style.display = 'flex';
            modal.removeAttribute('hidden');
        }
    }

    function hideModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            modal.setAttribute('hidden', true);
        }
    }

    function showSuccessMessage(message, isSuccess = true) {
        if (!elements.successModal || !elements.successIcon || !elements.successMessage) {
            alert(message);
            return;
        }
        elements.successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
        elements.successMessage.textContent = message;
        elements.successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
        showModal(elements.successModal);
        setTimeout(() => hideModal(elements.successModal), 2000);
    }

    async function loadAsignaciones() {
        if (!elements.asignacionesTableBody) {
            showSuccessMessage('Error: No se encontró la tabla de asignaciones', false);
            return;
        }

        const q = query(collection(db, 'asignaciones'), orderBy('fechaCreacion', 'asc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            elements.asignacionesTableBody.innerHTML = '';
            asignaciones = [];
            if (elements.traspasoSelect) {
                elements.traspasoSelect.innerHTML = '<option value="">Seleccione una asignación</option>';
            }

            if (querySnapshot.empty) {
                elements.asignacionesTableBody.innerHTML = '<tr><td colspan="16">No hay asignaciones disponibles</td></tr>';
            }

            querySnapshot.forEach(doc => {
                const data = doc.data();
                asignaciones.push({ docId: doc.id, ...data });
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDateOnly(data.fechaIngreso)}</td>
                    <td>${data.admision || '-'}</td>
                    <td>${data.nombrePaciente || '-'}</td>
                    <td>${formatDateOnly(data.fechaCX)}</td>
                    <td>${data.medico || '-'}</td>
                    <td>${data.proveedor || '-'}</td>
                    <td>${data.codigo || '-'}</td>
                    <td>${data.descripcion || '-'}</td>
                    <td>${data.cantidad || '-'}</td>
                    <td>${data.precio ? parseInt(data.precio).toLocaleString('es-CL') : '-'}</td>
                    <td>${data.total ? parseInt(data.total).toLocaleString('es-CL') : '-'}</td>
                    <td>${data.estado || '-'}</td>
                    <td>${data.referencia || '-'}</td>
                    <td>${data.modalidad || '-'}</td>
                    <td>${data.usuario || '-'}</td>
                    <td>
                        <i class="fas fa-edit action-icon" data-id="${doc.id}" title="Editar"></i>
                        <i class="fas fa-trash action-icon" data-id="${doc.id}" title="Eliminar"></i>
                        <i class="fas fa-history action-icon" data-id="${doc.id}" title="Historial"></i>
                    </td>
                `;
                elements.asignacionesTableBody.appendChild(tr);
                if (elements.traspasoSelect) {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = `${data.admision || 'Sin admisión'} - ${data.nombrePaciente || 'Sin paciente'}`;
                    elements.traspasoSelect.appendChild(option);
                }
            });

            const traspasoRow = document.createElement('tr');
            traspasoRow.innerHTML = `
                <td colspan="16" style="text-align: center;">
                    <button id="traspasar-btn" class="btn">Traspasar</button>
                </td>
            `;
            elements.asignacionesTableBody.appendChild(traspasoRow);
            const traspasarBtn = document.getElementById('traspasar-btn');
            if (traspasarBtn) {
                traspasarBtn.addEventListener('click', () => {
                    if (asignaciones.length === 0) {
                        showSuccessMessage('No hay asignaciones para traspasar', false);
                        return;
                    }
                    if (elements.currentDateSpan) {
                        elements.currentDateSpan.textContent = formatDate(new Date());
                    }
                    showModal(elements.traspasoModal);
                });
            }

            setupTableResize('#asignaciones-table');
        }, (error) => {
            console.error('Error al escuchar asignaciones:', error);
            showSuccessMessage('Error al cargar asignaciones en tiempo real.', false);
        });

        window.addEventListener('moduleCleanup', () => unsubscribe());
    }

    async function loadAsignacionesForSelection() {
        if (!elements.selectAsignacionesTableBody) return;
        elements.selectAsignacionesTableBody.innerHTML = '';
        asignaciones.forEach(asignacion => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" class="select-asignacion" data-id="${asignacion.docId}"></td>
                <td>${asignacion.admision || '-'}</td>
                <td>${asignacion.nombrePaciente || '-'}</td>
                <td>${asignacion.descripcion || '-'}</td>
            `;
            elements.selectAsignacionesTableBody.appendChild(tr);
        });
        setupTableResize('#select-asignaciones-table');
    }

    async function traspasarAsignaciones(asignacionIds) {
        try {
            showLoadingModal();
            if (!currentUser) throw new Error('No hay usuario autenticado');
            const fullName = await getUserFullName();
            const now = Timestamp.fromDate(new Date());

            const asignacionesToProcess = [];
            for (const id of asignacionIds) {
                const asignacionRef = doc(db, 'asignaciones', id);
                const asignacionSnap = await getDoc(asignacionRef);
                if (!asignacionSnap.exists()) {
                    console.warn(`Asignación no encontrada: ${id}`);
                    continue;
                }
                const data = asignacionSnap.data();
                let fechaCX = data.fechaCX instanceof Timestamp ? data.fechaCX.toDate() : parseDate(data.fechaCX);
                let fechaIngreso = data.fechaIngreso instanceof Timestamp ? data.fechaIngreso.toDate() : parseDate(data.fechaIngreso) || new Date('2025-01-01');
                if (fechaCX) fechaCX.setHours(0, 0, 0, 0);
                fechaIngreso.setHours(0, 0, 0, 0);
                if (!fechaCX || isNaN(fechaCX)) {
                    console.warn(`Asignación ${id} omitida: fechaCX inválida`);
                    continue;
                }
                asignacionesToProcess.push({ docId: asignacionSnap.id, ...data, fechaCX, fechaIngreso });
            }

            if (asignacionesToProcess.length === 0) {
                showSuccessMessage('No hay asignaciones válidas para traspasar.', false);
                hideLoadingModal();
                return;
            }

            const pacientesMap = {};
            asignacionesToProcess.forEach(asignacion => {
                const key = `${asignacion.admision}_${asignacion.proveedor}`;
                if (!pacientesMap[key]) {
                    pacientesMap[key] = {
                        admision: asignacion.admision || '',
                        proveedor: asignacion.proveedor || '',
                        nombrePaciente: asignacion.nombrePaciente || '',
                        medico: asignacion.medico || '',
                        fechaCX: asignacion.fechaCX ? Timestamp.fromDate(asignacion.fechaCX) : null,
                        totalPaciente: 0,
                        modalidad: asignacion.modalidad || 'Consignación',
                        prevision: asignacion.prevision || 'Desconocido',
                        estado: asignacion.estado || 'Reposición',
                        fechaIngreso: Timestamp.fromDate(asignacion.fechaIngreso),
                        fechaCargo: null,
                        usuario: fullName,
                        uid: currentUser.uid
                    };
                }
                pacientesMap[key].totalPaciente += parseFloat(asignacion.total) || 0;
            });

            for (const paciente of Object.values(pacientesMap)) {
                await addDoc(collection(db, 'pacientesconsignacion'), paciente);
            }

            for (const asignacion of asignacionesToProcess) {
                const fechaVencimiento = new Date(asignacion.fechaIngreso);
                fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);
                const cargo = await addDoc(collection(db, 'cargosconsignacion'), {
                    admision: asignacion.admision || '',
                    nombrePaciente: asignacion.nombrePaciente || '',
                    fechaCX: asignacion.fechaCX ? Timestamp.fromDate(asignacion.fechaCX) : null,
                    medico: asignacion.medico || '',
                    descripcion: asignacion.descripcion || '',
                    cantidad: asignacion.cantidad || 1,
                    estado: asignacion.estado || 'Reposición',
                    codigo: asignacion.codigo || '',
                    referencia: asignacion.referencia || '',
                    proveedor: asignacion.proveedor || '',
                    modalidad: asignacion.modalidad || 'Consignación',
                    precio: parseFloat(asignacion.precio) || 0,
                    total: parseFloat(asignacion.total) || 0,
                    usuario: fullName,
                    fechaCreacion: Timestamp.fromDate(asignacion.fechaIngreso),
                    fechaTraspaso: Timestamp.fromDate(asignacion.fechaIngreso),
                    uid: currentUser.uid,
                    ID: '',
                    COD: asignacion.codigo || '',
                    CANTID: asignacion.cantidad || 1,
                    VENTA: parseFloat(asignacion.total) || 0,
                    'N° GUIA': 'Pendiente',
                    LOTE: 'Pendiente',
                    'FECHA DE VENCIMIENTO': Timestamp.fromDate(fechaVencimiento),
                    CARGO: asignacion.estado || 'Reposición'
                });
                await updateDoc(doc(db, 'cargosconsignacion', cargo.id), { ID: cargo.id });
            }

            const lotesMap = {};
            asignacionesToProcess.forEach(asignacion => {
                const key = `${asignacion.admision}_${asignacion.proveedor}`;
                if (!lotesMap[key]) {
                    lotesMap[key] = {
                        admision: asignacion.admision || '-',
                        nombrePaciente: asignacion.nombrePaciente || '-',
                        fechaCX: asignacion.fechaCX ? Timestamp.fromDate(asignacion.fechaCX) : null,
                        documentoDelivery: '',
                        insumoDevuelto: '',
                        cantidad: 0,
                        cargado: false,
                        estado: '',
                        guia: '',
                        proveedor: asignacion.proveedor || '-',
                        fechaCreacion: Timestamp.fromDate(asignacion.fechaIngreso),
                        uid: currentUser.uid,
                        usuario: fullName
                    };
                }
            });

            for (const [key, lote] of Object.entries(lotesMap)) {
                const [admision, proveedor] = key.split('_');
                const loteId = `${admision}_${proveedor}_${lote.fechaCreacion.toMillis()}`;
                await setDoc(doc(db, 'lotes', loteId), lote);
            }

            for (const asignacion of asignacionesToProcess) {
                const asignacionRef = doc(db, 'asignaciones', asignacion.docId);
                await addDoc(collection(db, 'asignaciones', asignacion.docId, 'logs'), {
                    action: `Traspasado: ${formatDate(new Date(now.toMillis()))}`,
                    details: `Asignación traspasada a cargosconsignacion, pacientesconsignacion y lotes, y eliminada de asignaciones`,
                    timestamp: now,
                    user: fullName,
                    uid: currentUser.uid
                });
                await deleteDoc(asignacionRef);
            }

            showSuccessMessage('Traspaso realizado y asignaciones eliminadas con éxito', true);
            hideModal(elements.traspasoModal);
            hideModal(elements.selectAsignacionesModal);
            await loadAsignaciones();
        } catch (error) {
            console.error('Error al realizar traspaso:', error);
            showSuccessMessage('Error al realizar traspaso: ' + error.message, false);
        } finally {
            hideLoadingModal();
        }
    }

    function clearForm(isEdit = false, partial = false) {
        const inputs = isEdit ? [
            elements.editFechaIngresoInput, elements.editAdmisionInput, elements.editNombrePacienteInput, elements.editFechaCXInput,
            elements.editMedicoInput, elements.editCantidadInput, elements.editEstadoSelect, elements.editDescripcionInput,
            elements.editCodigoInput, elements.editReferenciaInput, elements.editProveedorInput, elements.editModalidadSelect,
            elements.editPrecioInput, elements.editTotalInput
        ] : [
            elements.fechaIngresoInput, elements.admisionInput, elements.nombrePacienteInput, elements.fechaCXInput,
            elements.medicoInput, elements.cantidadInput, elements.estadoSelect, elements.descripcionInput,
            elements.codigoInput, elements.referenciaInput, elements.proveedorInput, elements.modalidadSelect,
            elements.precioInput, elements.totalInput
        ];

        const partialFields = isEdit ? [
            elements.editDescripcionInput, elements.editCantidadInput, elements.editCodigoInput, elements.editReferenciaInput,
            elements.editProveedorInput, elements.editModalidadSelect, elements.editPrecioInput, elements.editTotalInput
        ] : [
            elements.descripcionInput, elements.cantidadInput, elements.codigoInput, elements.referenciaInput,
            elements.proveedorInput, elements.modalidadSelect, elements.precioInput, elements.totalInput
        ];

        const fieldsToClear = partial ? partialFields : inputs;

        fieldsToClear.forEach(field => {
            if (!field) return;
            if (field.tagName === 'INPUT') {
                if (field.id.includes('fecha-ingreso')) {
                    field.value = formattedToday;
                } else if (field.type === 'number') {
                    field.value = '1';
                } else if (field.id.includes('precio') || field.id.includes('total')) {
                    field.value = '0';
                } else if (field.id.includes('fechaCX')) {
                    field.value = '';
                } else {
                    field.value = '';
                }
                if (field.id.includes('codigo') || field.id.includes('referencia') || field.id.includes('proveedor') || field.id.includes('precio')) {
                    field.setAttribute('readonly', true);
                }
            } else if (field.tagName === 'SELECT') {
                field.value = field.id.includes('estado') ? 'Reposición' : field.id.includes('modalidad') ? 'Consignación' : '';
                if (field.id.includes('modalidad')) field.disabled = true;
            }
        });

        if (!isEdit) {
            if (!partial) {
                descripcionMode = 'Consignación';
                if (elements.descripcionModeToggle) {
                    elements.descripcionModeToggle.className = 'fas fa-toggle-on';
                    elements.descripcionModeToggle.title = 'Consignación';
                }
            }
        } else {
            editDescripcionMode = 'Consignación';
            if (elements.editDescripcionModeToggle) {
                elements.editDescripcionModeToggle.className = 'fas fa-toggle-on';
                elements.editDescripcionModeToggle.title = 'Consignación';
            }
        }

        updateTotal(isEdit ? elements.editTotalInput : elements.totalInput);
    }

    function openEditModal(asignacion) {
        if (!elements.editModal || !elements.editFechaIngresoInput || !elements.editFechaCXInput) {
            showSuccessMessage('Error: Modal de edición no encontrado', false);
            return;
        }
        currentEditId = asignacion.docId;

        const fechaIngreso = asignacion.fechaIngreso instanceof Timestamp ? asignacion.fechaIngreso.toDate() : parseDate(asignacion.fechaIngreso) || new Date();
        const fechaCX = asignacion.fechaCX instanceof Timestamp ? asignacion.fechaCX.toDate() : parseDate(asignacion.fechaCX);

        elements.editFechaIngresoInput.value = formatDateForInput(fechaIngreso);
        elements.editAdmisionInput.value = asignacion.admision || '';
        elements.editNombrePacienteInput.value = asignacion.nombrePaciente || '';
        elements.editFechaCXInput.value = formatDateForInput(fechaCX);
        elements.editMedicoInput.value = asignacion.medico || '';
        elements.editDescripcionInput.value = asignacion.descripcion || '';
        elements.editCantidadInput.value = asignacion.cantidad || '1';
        elements.editEstadoSelect.value = asignacion.estado || 'Reposición';
        elements.editCodigoInput.value = asignacion.codigo || '';
        elements.editReferenciaInput.value = asignacion.referencia || '';
        elements.editProveedorInput.value = asignacion.proveedor || '';
        elements.editModalidadSelect.value = asignacion.modalidad || 'Consignación';
        elements.editPrecioInput.value = asignacion.precio ? parseInt(asignacion.precio).toLocaleString('es-CL') : '0';
        elements.editTotalInput.value = asignacion.total ? parseInt(asignacion.total).toLocaleString('es-CL') : '0';
        editDescripcionMode = asignacion.modalidad || 'Consignación';

        if (elements.editDescripcionModeToggle) {
            elements.editDescripcionModeToggle.className = `fas fa-toggle-${editDescripcionMode === 'Consignación' ? 'on' : 'off'}`;
            elements.editDescripcionModeToggle.title = editDescripcionMode;
        }

        elements.editCodigoInput.setAttribute('readonly', true);
        elements.editReferenciaInput.setAttribute('readonly', true);
        elements.editProveedorInput.setAttribute('readonly', true);
        elements.editModalidadSelect.disabled = true;
        elements.editPrecioInput.setAttribute('readonly', true);

        showModal(elements.editModal);
    }

    function openDeleteModal(asignacion) {
        if (!elements.deleteModal || !elements.deleteMessage) {
            showSuccessMessage('Error: Modal de eliminación no encontrado', false);
            return;
        }
        elements.deleteMessage.textContent = `¿Estás seguro de que quieres eliminar la asignación para "${asignacion.nombrePaciente || 'Sin paciente'}"?`;
        elements.confirmDeleteBtn.dataset.id = asignacion.docId;
        showModal(elements.deleteModal);
    }

    async function loadLogs(asignacionId) {
        if (!elements.logContent) {
            showSuccessMessage('Error: Contenedor de logs no encontrado', false);
            return;
        }
        try {
            showLoadingModal();
            const logsQuery = query(collection(db, 'asignaciones', asignacionId, 'logs'), orderBy('timestamp', 'desc'));
            const logsSnapshot = await getDocs(logsQuery);
            elements.logContent.innerHTML = logsSnapshot.empty ? '<p>No hay registros de cambios.</p>' : '';
            logsSnapshot.forEach(doc => {
                const logData = doc.data();
                const timestamp = logData.timestamp?.toDate?.() || new Date();
                const fechaDisplay = formatDate(timestamp);
                let action = logData.action;
                if (action.startsWith('Creado:')) action = 'Creación';
                else if (action.startsWith('Actualizado:')) action = 'Modificado';
                else if (action.startsWith('Eliminado:')) action = 'Eliminado';
                else if (action.startsWith('Traspasado:')) action = 'Traspasado';
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry';
                logEntry.innerHTML = `
                    <strong>${action}</strong>: 
                    ${logData.details || '-'}<br>
                    <small>Fecha: ${fechaDisplay} | Usuario: ${logData.user || '-'}</small>
                `;
                elements.logContent.appendChild(logEntry);
            });
            showModal(elements.logModal);
        } catch (error) {
            console.error('Error al cargar logs:', error);
            showSuccessMessage('Error al cargar historial.', false);
        } finally {
            hideLoadingModal();
        }
    }

    function setupTableResize(tableId) {
        const table = document.querySelector(tableId);
        if (!table) return;

        const ths = table.querySelectorAll('th');
        ths.forEach((th, index) => {
            if (tableId === '#asignaciones-table' && index === ths.length - 1) return;
            if (tableId === '#select-asignaciones-table' && index === 0) return;

            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle';
            th.appendChild(resizeHandle);

            let startX, startWidth;
            resizeHandle.addEventListener('mousedown', (e) => {
                startX = e.clientX;
                startWidth = th.offsetWidth;
                resizeHandle.classList.add('active');

                function onMouseMove(e) {
                    const newWidth = startWidth + (e.clientX - startX);
                    if (newWidth >= 50) {
                        th.style.width = `${newWidth}px`;
                        th.style.maxWidth = `${newWidth}px`;
                    }
                }

                function onMouseUp() {
                    resizeHandle.classList.remove('active');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    }

    async function init() {
        if (!elements.container || !elements.asignacionForm) {
            document.body.innerHTML = '<p>Error: Contenedor o formulario no encontrado.</p>';
            return;
        }

        showLoadingModal();

        try {
            formatPrice(elements.precioInput);
            formatPrice(elements.editPrecioInput);

            if (elements.cantidadInput) elements.cantidadInput.addEventListener('input', () => updateTotal(elements.totalInput));
            if (elements.editCantidadInput) elements.editCantidadInput.addEventListener('input', () => updateTotal(elements.editTotalInput));

            await Promise.all([
                setupProveedorAutocomplete(),
                setupMedicoAutocomplete(),
                setupEditMedicoAutocomplete(),
                setupDescriptionAutocomplete(),
                setupEditDescriptionAutocomplete()
            ]);

            onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    elements.container.innerHTML = '<p>Error: No estás autenticado. Redirigiendo...</p>';
                    setTimeout(() => window.location.href = 'index.html?error=auth-required', 1000);
                    hideLoadingModal();
                    return;
                }

                currentUser = user;
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    elements.container.innerHTML = '<p>Error: Cuenta no registrada.</p>';
                    hideLoadingModal();
                    return;
                }

                const userData = userDoc.data();
                if (!['Administrador', 'Operador'].includes(userData.role)) {
                    elements.container.innerHTML = '<p>Acceso denegado.</p>';
                    hideLoadingModal();
                    return;
                }

                await loadAsignaciones();

                if (elements.registrarBtn) {
                    elements.registrarBtn.addEventListener('click', async () => {
                        showLoadingModal();
                        const fechaIngreso = parseDate(elements.fechaIngresoInput?.value || formattedToday);
                        const admision = elements.admisionInput?.value.trim() || '';
                        const nombrePaciente = elements.nombrePacienteInput?.value.trim() || '';
                        const fechaCX = parseDate(elements.fechaCXInput?.value);
                        const medico = elements.medicoInput?.value.trim() || '';
                        const descripcion = elements.descripcionInput?.value || '';
                        const cantidad = parseInt(elements.cantidadInput?.value) || 1;
                        const estado = elements.estadoSelect?.value || 'Reposición';
                        const codigo = elements.codigoInput?.value.trim() || '';
                        const referencia = elements.referenciaInput?.value.trim() || '';
                        const proveedor = elements.proveedorInput?.value.trim() || '';
                        const modalidad = elements.modalidadSelect?.value || 'Consignación';
                        let precio = elements.precioInput?.value.replace(/[^0-9]/g, '') || '0';
                        precio = parseInt(precio) || 0;
                        const total = cantidad * precio;

                        if (!admision || !nombrePaciente || !fechaCX || !medico || !descripcion || !proveedor || !precio || !modalidad) {
                            showSuccessMessage('Complete todos los campos obligatorios', false);
                            hideLoadingModal();
                            return;
                        }

                        if (precio > 9999999) {
                            showSuccessMessage('El precio no puede superar 9.999.999', false);
                            hideLoadingModal();
                            return;
                        }

                        if (!fechaIngreso || !validateDateFormat(elements.fechaIngresoInput.value)) {
                            showSuccessMessage('La fecha de ingreso es inválida', false);
                            hideLoadingModal();
                            return;
                        }

                        if (!fechaCX || !validateDateFormat(elements.fechaCXInput.value)) {
                            showSuccessMessage('La fecha de cirugía es inválida', false);
                            hideLoadingModal();
                            return;
                        }

                        try {
                            const fullName = await getUserFullName();
                            const now = Timestamp.fromDate(new Date());
                            const batch = writeBatch(db);
                            const asignacionRef = doc(collection(db, 'asignaciones'));

                            batch.set(asignacionRef, {
                                fechaIngreso: Timestamp.fromDate(fechaIngreso),
                                admision,
                                nombrePaciente,
                                fechaCX: Timestamp.fromDate(fechaCX),
                                medico,
                                descripcion,
                                cantidad,
                                estado,
                                codigo,
                                referencia,
                                proveedor,
                                modalidad,
                                precio,
                                total,
                                usuario: fullName,
                                fechaCreacion: now,
                                uid: currentUser.uid
                            });

                            batch.set(doc(collection(db, 'asignaciones', asignacionRef.id, 'logs')), {
                                action: `Creado: ${formatDate(new Date(now.toMillis()))}`,
                                details: `Asignación para ${nombrePaciente} creada`,
                                timestamp: now,
                                user: fullName,
                                uid: currentUser.uid
                            });

                            await batch.commit();
                            showSuccessMessage('Asignación registrada correctamente');
                            clearForm(false, true);
                        } catch (error) {
                            console.error('Error al registrar:', error);
                            showSuccessMessage('Error al registrar: ' + error.message, false);
                        } finally {
                            hideLoadingModal();
                        }
                    });
                }

                if (elements.limpiarBtn) {
                    elements.limpiarBtn.addEventListener('click', () => clearForm(false));
                }

                if (elements.saveEditBtn) {
                    elements.saveEditBtn.addEventListener('click', async () => {
                        showLoadingModal();
                        try {
                            const fechaIngreso = parseDate(elements.editFechaIngresoInput?.value || formattedToday);
                            const admision = elements.editAdmisionInput?.value.trim() || '';
                            const nombrePaciente = elements.editNombrePacienteInput?.value.trim() || '';
                            const fechaCX = parseDate(elements.editFechaCXInput?.value);
                            const medico = elements.editMedicoInput?.value.trim() || '';
                            const descripcion = elements.editDescripcionInput?.value.trim() || '';
                            const cantidad = parseInt(elements.editCantidadInput?.value) || 1;
                            const estado = elements.editEstadoSelect?.value || 'Reposición';
                            const codigo = elements.editCodigoInput?.value.trim() || '';
                            const referencia = elements.editReferenciaInput?.value.trim() || '';
                            const proveedor = elements.editProveedorInput?.value.trim() || '';
                            const modalidad = elements.editModalidadSelect?.value || 'Consignación';
                            let precio = elements.editPrecioInput?.value.replace(/[^0-9]/g, '') || '0';
                            precio = parseInt(precio) || 0;
                            const total = cantidad * precio;

                            if (!admision || !nombrePaciente || !fechaCX || !medico || !descripcion || !proveedor || !precio || !modalidad) {
                                showSuccessMessage('Complete todos los campos obligatorios', false);
                                hideLoadingModal();
                                return;
                            }

                            if (precio > 9999999) {
                                showSuccessMessage('El precio no puede superar 9.999.999', false);
                                hideLoadingModal();
                                return;
                            }

                            if (!fechaIngreso || !validateDateFormat(elements.editFechaIngresoInput.value)) {
                                showSuccessMessage('La fecha de ingreso es inválida', false);
                                hideLoadingModal();
                                return;
                            }

                            if (!fechaCX || !validateDateFormat(elements.editFechaCXInput.value)) {
                                showSuccessMessage('La fecha de cirugía es inválida', false);
                                hideLoadingModal();
                                return;
                            }

                            if (!currentEditId) {
                                showSuccessMessage('Error: ID de asignación no válido', false);
                                hideLoadingModal();
                                return;
                            }

                            const fullName = await getUserFullName();
                            const now = Timestamp.fromDate(new Date());
                            const batch = writeBatch(db);
                            const asignacionRef = doc(db, 'asignaciones', currentEditId);

                            batch.update(asignacionRef, {
                                fechaIngreso: Timestamp.fromDate(fechaIngreso),
                                admision,
                                nombrePaciente,
                                fechaCX: Timestamp.fromDate(fechaCX),
                                medico,
                                descripcion,
                                cantidad,
                                estado,
                                codigo,
                                referencia,
                                proveedor,
                                modalidad,
                                precio,
                                total,
                                usuario: fullName,
                                fechaActualizada: now,
                                uid: currentUser.uid
                            });

                            batch.set(doc(collection(db, 'asignaciones', asignacionRef.id, 'logs')), {
                                action: `Actualizado: ${formatDate(new Date(now.toMillis()))}`,
                                details: `Asignación para ${nombrePaciente} actualizada`,
                                timestamp: now,
                                user: fullName,
                                uid: currentUser.uid
                            });

                            await batch.commit();
                            hideModal(elements.editModal);
                            showSuccessMessage('Asignación actualizada correctamente');
                            await loadAsignaciones();
                        } catch (error) {
                            console.error('Error al actualizar asignación:', error);
                            showSuccessMessage('Error al actualizar: ' + error.message, false);
                        } finally {
                            hideLoadingModal();
                        }
                    });
                }

                if (elements.cancelEditBtn) {
                    elements.cancelEditBtn.addEventListener('click', () => hideModal(elements.editModal));
                }

                if (elements.confirmDeleteBtn) {
                    elements.confirmDeleteBtn.addEventListener('click', async () => {
                        showLoadingModal();
                        const id = elements.confirmDeleteBtn.dataset.id;
                        try {
                            const fullName = await getUserFullName();
                            const now = Timestamp.fromDate(new Date());
                            const batch = writeBatch(db);
                            batch.delete(doc(db, 'asignaciones', id));
                            batch.set(doc(collection(db, 'asignaciones', id, 'logs')), {
                                action: `Eliminado: ${formatDate(new Date(now.toMillis()))}`,
                                details: `Asignación eliminada`,
                                timestamp: now,
                                user: fullName,
                                uid: currentUser.uid
                            });
                            await batch.commit();
                            hideModal(elements.deleteModal);
                            showSuccessMessage('Asignación eliminada correctamente');
                            await loadAsignaciones();
                        } catch (error) {
                            console.error('Error al eliminar:', error);
                            showSuccessMessage('Error al eliminar: ' + error.message, false);
                        } finally {
                            hideLoadingModal();
                        }
                    });
                }

                if (elements.cancelDeleteBtn) {
                    elements.cancelDeleteBtn.addEventListener('click', () => hideModal(elements.deleteModal));
                }

                if (elements.traspasoTypeSelect) {
                    elements.traspasoTypeSelect.addEventListener('change', () => {
                        if (elements.traspasoTypeSelect.value === 'select') {
                            elements.traspasoSelect.style.display = 'none';
                            loadAsignacionesForSelection();
                            if (elements.currentDateSpan) {
                                elements.currentDateSpan.textContent = 'Se usará la fecha de ingreso de las asignaciones seleccionadas';
                            }
                            showModal(elements.selectAsignacionesModal);
                        } else if (elements.traspasoTypeSelect.value === 'single') {
                            elements.traspasoSelect.style.display = 'block';
                            const selectedId = elements.traspasoSelect.value;
                            if (selectedId && elements.currentDateSpan) {
                                const asignacion = asignaciones.find(a => a.docId === selectedId);
                                elements.currentDateSpan.textContent = asignacion && asignacion.fechaIngreso
                                    ? formatDateOnly(asignacion.fechaIngreso)
                                    : 'Seleccione una asignación';
                            } else if (elements.currentDateSpan) {
                                elements.currentDateSpan.textContent = 'Seleccione una asignación';
                            }
                        } else {
                            elements.traspasoSelect.style.display = 'block';
                            if (elements.currentDateSpan) {
                                elements.currentDateSpan.textContent = 'Se usará la fecha de ingreso de todas las asignaciones';
                            }
                        }
                    });
                }

                if (elements.confirmTraspasoBtn) {
                    elements.confirmTraspasoBtn.addEventListener('click', async () => {
                        showLoadingModal();
                        if (!currentUser) {
                            showSuccessMessage('Usuario no autenticado', false);
                            hideLoadingModal();
                            return;
                        }

                        const traspasoType = elements.traspasoTypeSelect.value;
                        let asignacionesToProcess = [];

                        try {
                            if (traspasoType === 'all') {
                                const querySnapshot = await getDocs(collection(db, 'asignaciones'));
                                asignacionesToProcess = querySnapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
                            } else if (traspasoType === 'single') {
                                const selectedId = elements.traspasoSelect.value;
                                if (!selectedId) {
                                    showSuccessMessage('Seleccione una asignación', false);
                                    hideLoadingModal();
                                    return;
                                }
                                const asignacionDoc = await getDoc(doc(db, 'asignaciones', selectedId));
                                if (asignacionDoc.exists()) {
                                    asignacionesToProcess = [{ docId: asignacionDoc.id, ...asignacionDoc.data() }];
                                }
                            } else if (traspasoType === 'select') {
                                const selectedAsignaciones = Array.from(document.querySelectorAll('.select-asignacion:checked')).map(input => input.dataset.id);
                                if (selectedAsignaciones.length === 0) {
                                    showSuccessMessage('Seleccione al menos una asignación', false);
                                    hideLoadingModal();
                                    return;
                                }
                                for (const id of selectedAsignaciones) {
                                    const asignacionDoc = await getDoc(doc(db, 'asignaciones', id));
                                    if (asignacionDoc.exists()) {
                                        asignacionesToProcess.push({ docId: asignacionDoc.id, ...asignacionDoc.data() });
                                    }
                                }
                            }

                            if (asignacionesToProcess.length === 0) {
                                showSuccessMessage('No hay asignaciones válidas para traspasar', false);
                                hideLoadingModal();
                                return;
                            }

                            await traspasarAsignaciones(asignacionesToProcess.map(a => a.docId));
                        } catch (error) {
                            console.error('Error al iniciar traspaso:', error);
                            showSuccessMessage('Error al iniciar traspaso: ' + error.message, false);
                            hideLoadingModal();
                        }
                    });
                }

                if (elements.cancelTraspasoBtn) {
                    elements.cancelTraspasoBtn.addEventListener('click', () => hideModal(elements.traspasoModal));
                }

                if (elements.confirmSelectBtn) {
                    elements.confirmSelectBtn.addEventListener('click', () => {
                        const selectedAsignaciones = Array.from(document.querySelectorAll('.select-asignacion:checked')).map(input => input.dataset.id);
                        if (selectedAsignaciones.length === 0) {
                            showSuccessMessage('Seleccione al menos una asignación', false);
                            return;
                        }
                        hideModal(elements.selectAsignacionesModal);
                        traspasarAsignaciones(selectedAsignaciones);
                    });
                }

                if (elements.cancelSelectBtn) {
                    elements.cancelSelectBtn.addEventListener('click', () => hideModal(elements.selectAsignacionesModal));
                }

                if (elements.closeLogBtn) {
                    elements.closeLogBtn.addEventListener('click', () => hideModal(elements.logModal));
                }

                if (elements.traspasoSelect) {
                    elements.traspasoSelect.addEventListener('change', () => {
                        const selectedId = elements.traspasoSelect.value;
                        if (elements.currentDateSpan) {
                            if (selectedId) {
                                const asignacion = asignaciones.find(a => a.docId === selectedId);
                                elements.currentDateSpan.textContent = asignacion && asignacion.fechaIngreso
                                    ? formatDateOnly(asignacion.fechaIngreso)
                                    : 'Seleccione una asignación';
                            } else {
                                elements.currentDateSpan.textContent = 'Seleccione una asignación';
                            }
                        }
                    });
                }

                if (elements.asignacionesTableBody) {
                    elements.asignacionesTableBody.addEventListener('click', (e) => {
                        const target = e.target;
                        const id = target.dataset.id;
                        const asignacion = asignaciones.find(a => a.docId === id);
                        if (!asignacion) return;
                        if (target.classList.contains('fa-edit')) {
                            openEditModal(asignacion);
                        } else if (target.classList.contains('fa-trash')) {
                            openDeleteModal(asignacion);
                        } else if (target.classList.contains('fa-history')) {
                            loadLogs(id);
                        }
                    });
                }

            });
        } catch (error) {
            console.error('Error al inicializar:', error);
            elements.container.innerHTML = '<p>Error al inicializar la aplicación.</p>';
        } finally {
            hideLoadingModal();
        }
    }

    init();

} catch (error) {
    console.error('Error crítico:', error);
    document.body.innerHTML = '<p>Error crítico al cargar la aplicación.</p>';
}