import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, startAfter, where, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

const firebaseConfig = {
  apiKey: "AIzaSyDmAf-vi7PhzzQkPZh89q9p3Mz4vGGPtd0",
  authDomain: "modular-app-387da.firebaseapp.com",
  projectId: "modular-app-387da",
  storageBucket: "modular-app-387da.firebasestorage.app",
  messagingSenderId: "271561966774",
  appId: "1:271561966774:web:e197c00e2abd67b4f0d217",
  measurementId: "G-7YT6MMR47X"
};

let app;
try {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
} catch (error) {
    console.error('Error al inicializar Firebase:', error);
    throw error;
}

const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(error => {
    console.error('Error al configurar persistencia:', error);
});

const nombreMedicoInput = document.getElementById('nombre-medico');
const estadoInputs = document.querySelectorAll('input[name="estado"]');
const registrarBtn = document.getElementById('registrar-btn');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const editNombreMedicoInput = document.getElementById('edit-nombre-medico');
const editEstadoInputs = document.querySelectorAll('input[name="edit-estado"]');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const medicosTableBody = document.querySelector('#medicos-table tbody');
const tableContainer = document.getElementById('table-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const pageInfo = document.getElementById('page-info');
const totalRecords = document.getElementById('total-records');
const logModal = document.getElementById('log-modal');
const closeLogBtn = document.getElementById('close-log-btn');
const logContent = document.getElementById('log-content');

let currentPage = 1;
const recordsPerPage = 50;
let lastVisible = null;
let firstVisible = null;
let totalPages = 1;
let medicos = [];
let currentEditId = null;
let filters = Array(6).fill('');
let lastMedicoId = 0;

async function getUserFullName() {
    const user = auth.currentUser;
    if (!user) throw new Error('No se encontró el usuario autenticado');
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
    return userSnap.data().fullName || 'Usuario Desconocido';
}

async function checkDuplicate(nombreMedico, excludeDocId = null) {
    const medicosCollection = collection(db, 'medicos');
    const nombreQuery = query(medicosCollection, where('nombreMedico', '==', nombreMedico));
    const nombreSnapshot = await getDocs(nombreQuery);
    if (!nombreSnapshot.empty) {
        const existingDoc = nombreSnapshot.docs.find(doc => doc.id !== excludeDocId);
        if (existingDoc) return { isDuplicate: true, field: 'nombreMedico', value: nombreMedico };
    }
    return { isDuplicate: false };
}

async function getNextMedicoId() {
    if (lastMedicoId > 0) {
        lastMedicoId++;
        return lastMedicoId.toString().padStart(3, '0');
    }
    const medicosCollection = collection(db, 'medicos');
    const q = query(medicosCollection, orderBy('id', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    let nextId = 1;
    if (!querySnapshot.empty) {
        const lastMedico = querySnapshot.docs[0].data();
        nextId = (parseInt(lastMedico.id) || 0) + 1;
    }
    lastMedicoId = nextId;
    return nextId.toString().padStart(3, '0');
}

function showModal(modal, progressElement, percentage) {
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
        console.warn('Elementos de éxito no encontrados');
        alert(message);
        return;
    }
    successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
    successIcon.className = `fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
    successMessage.textContent = message;
    showModal(successModal);
    setTimeout(() => hideModal(successModal), 2000);
}

function updateFilterIcons() {
    const filterIcons = document.querySelectorAll('.filter-icon');
    filterIcons.forEach(icon => {
        const columnIndex = parseInt(icon.getAttribute('data-column-index'));
        if (filters[columnIndex]) {
            icon.classList.add('filter-active');
        } else {
            icon.classList.remove('filter-active');
        }
    });
}

function createFilterContainer(columnIndex, th, icon) {
    const container = document.createElement('div');
    container.className = 'filter-container';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = filters[columnIndex] || '';
    input.placeholder = `Filtrar ${th.textContent.trim()}...`;
    container.appendChild(input);

    // Calcular la posición relativa al encabezado de la tabla
    const thRect = th.getBoundingClientRect();
    const tableRect = document.querySelector('#medicos-table').getBoundingClientRect();
    const scrollContainer = tableContainer;

    // Posicionar debajo del encabezado, teniendo en cuenta el desplazamiento
    const topPosition = thRect.bottom - tableRect.top + scrollContainer.scrollTop + 2;
    const leftPosition = thRect.left - tableRect.left + scrollContainer.scrollLeft;

    container.style.top = `${topPosition}px`;
    container.style.left = `${leftPosition}px`;
    container.style.width = `${Math.min(thRect.width - 12, 200)}px`;

    let timeout;
    input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            filters[columnIndex] = input.value.trim();
            renderTable();
            updateFilterIcons(); // Actualizar íconos después de aplicar el filtro
        }, 300);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            filters[columnIndex] = input.value.trim();
            renderTable();
            updateFilterIcons(); // Actualizar íconos al presionar Enter
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
}

async function loadMedicos() {
    try {
        showModal(loadingModal, loadingProgress, 0);
        const medicosCollection = collection(db, 'medicos');
        const countSnapshot = await getDocs(medicosCollection);
        const totalRecordsCount = countSnapshot.size;
        totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
        totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
        let q = query(medicosCollection, orderBy('id', 'asc'), limit(recordsPerPage));
        if (lastVisible && currentPage > 1) {
            q = query(medicosCollection, orderBy('id', 'asc'), startAfter(lastVisible), limit(recordsPerPage));
        }
        const querySnapshot = await getDocs(q);
        medicos = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            medicos.push({ docId: doc.id, ...data });
        });
        if (medicos.length > 0) {
            lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            firstVisible = querySnapshot.docs[0];
        }
        renderTable();
        updatePagination();
        tableContainer.style.display = 'block';
        hideModal(loadingModal);
    } catch (error) {
        console.error('Error al cargar médicos:', error);
        showSuccessMessage('Error al cargar médicos: ' + error.message, false);
        hideModal(loadingModal);
    }
}

function renderTable() {
    let filteredMedicos = [...medicos];
    filteredMedicos = filteredMedicos.filter(medico => {
        const rowData = [
            medico.id || '',
            '', // Acciones
            medico.nombreMedico || '',
            medico.estado || 'activo',
            medico.fechaCreacion && typeof medico.fechaCreacion.toDate === 'function'
                ? medico.fechaCreacion.toDate().toLocaleString('es-ES')
                : medico.fechaCreacion instanceof Date
                    ? medico.fechaCreacion.toLocaleString('es-ES')
                    : 'Sin fecha',
            medico.usuario || ''
        ];
        return filters.every((filterValue, index) => {
            if (!filterValue || index === 1) return true; // Ignorar columna de acciones
            return rowData[index]?.toString().toLowerCase().includes(filterValue.toLowerCase());
        });
    });

    medicosTableBody.innerHTML = '';
    filteredMedicos.forEach(medico => {
        const fechaCreacion = medico.fechaCreacion && typeof medico.fechaCreacion.toDate === 'function'
            ? medico.fechaCreacion.toDate()
            : medico.fechaCreacion instanceof Date
                ? medico.fechaCreacion
                : null;
        const fechaDisplay = fechaCreacion && !isNaN(fechaCreacion)
            ? fechaCreacion.toLocaleString('es-ES')
            : 'Sin fecha';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${medico.id}</td>
            <td>
                <i class="fas fa-edit action-icon" data-id="${medico.docId}" title="Editar"></i>
                <i class="fas fa-trash action-icon" data-id="${medico.docId}" title="Eliminar"></i>
                <i class="fas fa-history action-icon" data-id="${medico.docId}" title="Historial"></i>
            </td>
            <td>${medico.nombreMedico}</td>
            <td>${medico.estado === 'activo' ? 'Activo' : 'Inactivo'}</td>
            <td>${fechaDisplay}</td>
            <td>${medico.usuario}</td>
        `;
        medicosTableBody.appendChild(tr);
    });

    updateFilterIcons();

    const filterIcons = document.querySelectorAll('.filter-icon');
    filterIcons.forEach((icon, index) => {
        icon.removeEventListener('click', icon._clickHandler);
        icon._clickHandler = (e) => {
            e.stopPropagation();
            const columnIndex = parseInt(icon.getAttribute('data-column-index'));
            if (columnIndex === 1) return; // Ignorar columna de acciones
            const th = icon.parentElement;

            closeAllFilters();

            // Si el filtro ya está activo, permitir limpiarlo al hacer clic nuevamente
            if (filters[columnIndex]) {
                filters[columnIndex] = '';
                renderTable();
                updateFilterIcons();
                return;
            }

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
}

function updatePagination() {
    if (!pageInfo) return;
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

async function loadLogs(medicoId) {
    try {
        const logsCollection = collection(db, 'medicos', medicoId, 'logs');
        const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'));
        const logsSnapshot = await getDocs(logsQuery);
        logContent.innerHTML = '';
        if (logsSnapshot.empty) {
            logContent.innerHTML = '<p>No hay registros de cambios.</p>';
        } else {
            logsSnapshot.forEach((doc) => {
                const data = doc.data();
                const timestamp = data.timestamp && typeof data.timestamp.toDate === 'function'
                    ? data.timestamp.toDate()
                    : data.timestamp instanceof Date
                        ? data.timestamp
                        : null;
                const fechaDisplay = timestamp && !isNaN(timestamp)
                    ? timestamp.toLocaleString('es-ES')
                    : 'Sin fecha';
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry';
                logEntry.innerHTML = `
                    <strong>${data.action}</strong>: ${data.message}<br>
                    <small>Fecha: ${fechaDisplay} | Usuario: ${data.uid}</small>
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

async function init() {
    const container = document.querySelector('.medicos-container');
    if (!container) {
        console.error('Contenedor .medicos-container no encontrado');
        return;
    }

    try {
        const user = await new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    unsubscribe();
                    resolve(user);
                } else {
                    setTimeout(() => {
                        if (auth.currentUser) {
                            unsubscribe();
                            resolve(auth.currentUser);
                        } else {
                            unsubscribe();
                            resolve(null);
                        }
                    }, 2000);
                }
            }, (error) => {
                console.error('Error en onAuthStateChanged:', error);
                unsubscribe();
                reject(error);
            });
        });

        if (!user) {
            console.error('No hay usuario autenticado');
            container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión nuevamente.</p>';
            setTimeout(() => {
                window.location.href = 'main.html?error=auth-required';
            }, 2000);
            return;
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
            console.error('Documento de usuario no encontrado');
            container.innerHTML = '<p>Error: Tu cuenta no está registrada en la base de datos. Contacta al administrador.</p>';
            return;
        }

        const userData = userDoc.data();
        const hasAccess = userData.role === 'Administrador' ||
            (userData.permissions && userData.permissions.includes('Prestaciones:Medicos'));
        if (!hasAccess) {
            console.error('Acceso denegado');
            container.innerHTML = '<p>Acceso denegado. No tienes permisos para acceder a este módulo.</p>';
            return;
        }

        await loadMedicos();

        registrarBtn.addEventListener('click', async () => {
            const nombreMedico = nombreMedicoInput.value.trim();
            const estado = Array.from(estadoInputs).find(input => input.checked)?.value;
            if (!nombreMedico) {
                showSuccessMessage('Por favor, complete el campo Nombre del Médico', false);
                return;
            }
            try {
                showModal(registerModal, registerProgress, 0);
                const duplicateCheck = await checkDuplicate(nombreMedico);
                if (duplicateCheck.isDuplicate) {
                    showSuccessMessage(`Error: Ya existe un médico con el nombre "${duplicateCheck.value}"`, false);
                    hideModal(registerModal);
                    return;
                }
                const fullName = await getUserFullName();
                const medicoId = await getNextMedicoId();
                const fechaCreacion = new Date();
                const medicoRef = doc(collection(db, 'medicos'));
                const medicoData = {
                    id: medicoId,
                    nombreMedico,
                    estado: estado || 'activo',
                    fechaCreacion,
                    usuario: fullName,
                    uid: user.uid
                };
                const batch = writeBatch(db);
                batch.set(medicoRef, medicoData);
                const logRef = doc(collection(db, 'medicos', medicoRef.id, 'logs'));
                batch.set(logRef, {
                    action: 'Creación',
                    message: `Médico "${nombreMedico}" creado por ${fullName} con estado ${estado || 'activo'}`,
                    timestamp: new Date(),
                    uid: user.uid
                });
                await batch.commit();
                showModal(registerModal, registerProgress, 100);
                setTimeout(() => {
                    hideModal(registerModal);
                    showSuccessMessage('Médico registrado exitosamente');
                    nombreMedicoInput.value = '';
                    estadoInputs.forEach(input => input.checked = input.value === 'activo');
                    medicos.push({ docId: medicoRef.id, ...medicoData });
                    renderTable();
                }, 300);
            } catch (error) {
                console.error('Error al registrar médico:', error);
                showSuccessMessage('Error al registrar médico: ' + error.message, false);
                hideModal(registerModal);
            }
        });

        saveEditBtn.addEventListener('click', async () => {
            const nombreMedico = editNombreMedicoInput.value.trim();
            const estado = Array.from(editEstadoInputs).find(input => input.checked)?.value;
            if (!nombreMedico) {
                showSuccessMessage('Por favor, complete el campo Nombre del Médico', false);
                return;
            }
            try {
                const duplicateCheck = await checkDuplicate(nombreMedico, currentEditId);
                if (duplicateCheck.isDuplicate) {
                    showSuccessMessage(`Error: Ya existe un médico con el nombre "${duplicateCheck.value}"`, false);
                    return;
                }
                const medicoRef = doc(db, 'medicos', currentEditId);
                const medicoSnap = await getDoc(medicoRef);
                const oldData = medicoSnap.data();
                const changes = [];
                if (oldData.nombreMedico !== nombreMedico) {
                    changes.push(`Nombre cambiado de "${oldData.nombreMedico}" a "${nombreMedico}"`);
                }
                if (oldData.estado !== estado) {
                    changes.push(`Estado cambiado de "${oldData.estado}" a "${estado}"`);
                }
                const fullName = await getUserFullName();
                const batch = writeBatch(db);
                batch.update(medicoRef, {
                    nombreMedico,
                    estado: estado || 'activo',
                    usuario: fullName,
                    fechaActualizacion: new Date()
                });
                if (changes.length > 0) {
                    const logRef = doc(collection(db, 'medicos', currentEditId, 'logs'));
                    batch.set(logRef, {
                        action: 'Edición',
                        message: changes.join('; '),
                        timestamp: new Date(),
                        uid: user.uid
                    });
                }
                await batch.commit();
                hideModal(editModal);
                showSuccessMessage('Médico actualizado exitosamente');
                const index = medicos.findIndex(med => med.docId === currentEditId);
                if (index !== -1) {
                    medicos[index] = { ...medicos[index], nombreMedico, estado: estado || 'activo', usuario: fullName, fechaActualizacion: new Date() };
                    renderTable();
                }
            } catch (error) {
                console.error('Error al actualizar médico:', error);
                showSuccessMessage('Error al actualizar médico: ' + error.message, false);
            }
        });

        cancelEditBtn.addEventListener('click', () => {
            hideModal(editModal);
        });

        confirmDeleteBtn.addEventListener('click', async () => {
            const id = confirmDeleteBtn.dataset.id;
            try {
                const medicoRef = doc(db, 'medicos', id);
                const medicoSnap = await getDoc(medicoRef);
                const medicoData = medicoSnap.data();
                const fullName = await getUserFullName();
                const batch = writeBatch(db);
                batch.delete(medicoRef);
                const logRef = doc(collection(db, 'medicos', id, 'logs'));
                batch.set(logRef, {
                    action: 'Eliminación',
                    message: `Médico "${medicoData.nombreMedico}" eliminado por ${fullName}`,
                    timestamp: new Date(),
                    uid: user.uid
                });
                await batch.commit();
                hideModal(deleteModal);
                showSuccessMessage('Médico eliminado exitosamente');
                medicos = medicos.filter(med => med.docId !== id);
                renderTable();
                totalRecords.textContent = `Total de registros: ${medicos.length}`;
                totalPages = Math.ceil(medicos.length / recordsPerPage);
                updatePagination();
            } catch (error) {
                console.error('Error al eliminar médico:', error);
                showSuccessMessage('Error al eliminar médico: ' + error.message, false);
            }
        });

        cancelDeleteBtn.addEventListener('click', () => {
            hideModal(deleteModal);
        });

        medicosTableBody.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const medico = medicos.find(med => med.docId === id);
            if (!medico) return;
            if (e.target.classList.contains('fa-edit')) {
                openEditModal(medico);
            } else if (e.target.classList.contains('fa-trash')) {
                openDeleteModal(medico);
            } else if (e.target.classList.contains('fa-history')) {
                loadLogs(medico.docId);
            }
        });

        closeLogBtn.addEventListener('click', () => {
            hideModal(logModal);
        });

        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                if (modal) {
                    hideModal(modal);
                }
            });
        });

        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                lastVisible = firstVisible;
                loadMedicos();
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadMedicos();
            }
        });

        exportExcelBtn.addEventListener('click', () => {
            const data = medicos.map(medico => {
                const fechaCreacion = medico.fechaCreacion && typeof medico.fechaCreacion.toDate === 'function'
                    ? medico.fechaCreacion.toDate()
                    : medico.fechaCreacion instanceof Date
                        ? medico.fechaCreacion
                        : null;
                return {
                    ID: medico.id,
                    'Nombre del Médico': medico.nombreMedico,
                    Estado: medico.estado === 'activo' ? 'Activo' : 'Inactivo',
                    'Fecha de Creación': fechaCreacion && !isNaN(fechaCreacion)
                        ? fechaCreacion.toLocaleString('es-ES')
                        : 'Sin fecha',
                    Usuario: medico.usuario
                };
            });
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Medicos');
            XLSX.writeFile(workbook, 'medicos.xlsx');
        });

    } catch (error) {
        console.error('Error en init:', error);
        container.innerHTML = `<p>Error al verificar permisos: ${error.message}</p>`;
    }
}

function openEditModal(medico) {
    if (!editModal) return;
    currentEditId = medico.docId;
    editNombreMedicoInput.value = medico.nombreMedico;
    editEstadoInputs.forEach(input => input.checked = input.value === medico.estado);
    showModal(editModal);
}

function openDeleteModal(medico) {
    if (!deleteMessage) return;
    deleteMessage.textContent = `¿Estás seguro de que deseas eliminar al médico "${medico.nombreMedico}" (ID: ${medico.id})?`;
    confirmDeleteBtn.dataset.id = medico.docId;
    showModal(deleteModal);
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => init(), 1);
}