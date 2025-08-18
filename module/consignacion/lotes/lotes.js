import { getFirestore, collection, getDocs, query, orderBy, onSnapshot, setDoc, doc, Timestamp, updateDoc, getDoc, where, limit, startAfter } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getApps, initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';

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
        console.error('Error al configurar persistencia:', error.message);
    });

    const container = document.querySelector('.lotes-container');
    const tableBody = document.querySelector('#lotes-table tbody');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const totalRecords = document.getElementById('total-records');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const successModal = document.getElementById('success-modal');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.getElementById('success-message');
    const filterYearSelect = document.getElementById('filter-year');
    const filterMonthSelect = document.getElementById('filter-month');
    const showAllBtn = document.getElementById('show-all-btn');
    const editLoteModal = document.getElementById('edit-lote-modal');
    const editLoteForm = document.getElementById('edit-lote-form');
    const loadingIndicator = document.getElementById('loading-indicator');

    const elements = {
        container, tableBody, prevBtn, nextBtn, pageInfo, totalRecords, exportExcelBtn,
        successModal, successIcon, successMessage, filterYearSelect, filterMonthSelect,
        showAllBtn, editLoteModal, editLoteForm, loadingIndicator
    };

    let missingElements = [];
    Object.entries(elements).forEach(([key, el]) => {
        if (!el) missingElements.push(key);
    });
    if (missingElements.length > 0) {
        console.error('Elementos faltantes en el DOM:', missingElements.join(', '));
        if (container) {
            container.innerHTML = `<p>Error: Faltan elementos en la página (${missingElements.join(', ')}). Contacta al administrador.</p>`;
        } else {
            document.body.innerHTML = `<p>Error: No se encontró el contenedor .lotes-container. Verifica el HTML.</p>`;
        }
        throw new Error(`Elementos faltantes: ${missingElements.join(', ')}`);
    }

    let currentUser = null;
    let lotes = [];
    let currentPage = 1;
    const recordsPerPage = 20;
    let quickFilters = { year: new Date().getFullYear().toString(), month: (new Date().getMonth() + 1).toString().padStart(2, '0') };
    let isLoading = false;
    let cargosUnsubscribe = null;
    let lastVisibleDoc = null;
    let firstVisibleDoc = null;
    let totalLotesCount = 0;

    const CACHE_KEY = 'lotes_cache';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

    const monthNames = {
        '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
        '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
    };

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async function isAdmin() {
        try {
            if (!currentUser) return false;
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                console.error('Documento de usuario no encontrado para UID:', currentUser.uid);
                return false;
            }
            const userData = userSnap.data();
            const role = userData.role || '';
            return role === 'Administrador';
        } catch (error) {
            console.error('Error al verificar si el usuario es administrador:', error.message);
            return false;
        }
    }

    async function preloadGuiasAndCargos(lotes) {
        const guiasMap = new Map();
        const cargosMap = new Map();

        const [guiasResult, cargosResult] = await Promise.all([
            (async () => {
                try {
                    const guiasCollection = collection(db, 'guias');
                    const guiasSnapshot = await getDocs(guiasCollection);
                    guiasSnapshot.forEach(doc => {
                        const data = doc.data();
                        guiasMap.set(data.guiaDespacho, data.folio || '-');
                    });
                } catch (error) {
                    console.error('Error al precargar guías:', error.message);
                }
            })(),
            (async () => {
                try {
                    const admisiones = [...new Set(lotes.map(lote => lote.admision).filter(a => a && a !== '-'))];
                    if (admisiones.length > 0) {
                        const cargosQuery = query(collection(db, 'cargosconsignacion'), where('admision', 'in', admisiones));
                        const cargosSnapshot = await getDocs(cargosQuery);
                        const cargosByAdmision = new Map();
                        cargosSnapshot.forEach(doc => {
                            const data = doc.data();
                            if (!cargosByAdmision.has(data.admision)) {
                                cargosByAdmision.set(data.admision, []);
                            }
                            cargosByAdmision.get(data.admision).push(data);
                        });
                        admisiones.forEach(admision => {
                            const cargos = cargosByAdmision.get(admision) || [];
                            const allCargado = cargos.length > 0 && cargos.every(cargo => cargo.estado === 'Cargado');
                            cargosMap.set(admision, allCargado ? 'Sí' : 'No');
                        });
                    }
                } catch (error) {
                    console.error('Error al precargar cargos:', error.message);
                }
            })()
        ]);

        return { guiasMap, cargosMap };
    }

    function getFolioForGuiaDespacho(guiaDespacho, guiasMap) {
        return guiaDespacho && guiasMap.has(guiaDespacho) ? guiasMap.get(guiaDespacho) : '-';
    }

    function checkAllCargadoForAdmision(admision, cargosMap) {
        return admision && cargosMap.has(admision) ? cargosMap.get(admision) : 'No';
    }

    function formatDateOnly(date) {
        if (!date) return '-';
        let parsedDate;
        if (typeof date === 'string') {
            parsedDate = new Date(date);
        } else if (date instanceof Timestamp) {
            parsedDate = date.toDate();
        } else if (date instanceof Date) {
            parsedDate = date;
        }
        if (!parsedDate || isNaN(parsedDate)) return '-';
        return parsedDate.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-');
    }

    function showModal(modal) {
        if (!modal) {
            return;
        }
        modal.style.display = 'block';
        modal.removeAttribute('hidden');
    }

    function hideModal(modal) {
        if (!modal) {
            return;
        }
        modal.style.display = 'none';
        modal.setAttribute('hidden', 'true');
    }

    function showLoading() {
        if (loadingIndicator) {
            loadingIndicator.classList.add('active');
        }
    }

    function hideLoading() {
        if (loadingIndicator) {
            loadingIndicator.classList.remove('active');
        }
    }

    let lastErrorMessage = null;
    let lastErrorTime = 0;
    const ERROR_DEBOUNCE_MS = 3000;

    function showSuccessMessage(message, isSuccess = true) {
        if (!successModal || !successIcon || !successMessage) {
            alert('Mensaje: ' + message);
            return;
        }
        const now = Date.now();
        if (isSuccess || (message !== lastErrorMessage || now - lastErrorTime > ERROR_DEBOUNCE_MS)) {
            successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
            successMessage.textContent = message;
            successModal.className = `lotes-success-modal ${isSuccess ? 'success' : 'error'}`;
            showModal(successModal);
            setTimeout(() => hideModal(successModal), 2000);
            if (!isSuccess) {
                lastErrorMessage = message;
                lastErrorTime = now;
            }
        }
    }

    function applyQuickFilters(data) {
        return data.filter(item => {
            if (!item.fechaCX) return false;
            let fechaCX;
            if (typeof item.fechaCX === 'string') {
                fechaCX = new Date(item.fechaCX);
            } else if (item.fechaCX instanceof Timestamp) {
                fechaCX = item.fechaCX.toDate();
            } else if (item.fechaCX instanceof Date) {
                fechaCX = item.fechaCX;
            }
            if (!fechaCX || isNaN(fechaCX)) return false;

            const year = fechaCX.getFullYear().toString();
            const month = (fechaCX.getMonth() + 1).toString().padStart(2, '0');

            const yearMatch = !quickFilters.year || year === quickFilters.year;
            const monthMatch = !quickFilters.month || month === quickFilters.month;

            return yearMatch && monthMatch;
        });
    }

    function removeDuplicatePatients(data) {
        const seenPatients = new Map();
        return data.reduce((uniqueLotes, lote) => {
            const nombrePaciente = (lote.nombrePaciente || '').toLowerCase().trim();
            if (!nombrePaciente || nombrePaciente === '-') return uniqueLotes;

            const existingLote = seenPatients.get(nombrePaciente);
            if (!existingLote) {
                seenPatients.set(nombrePaciente, lote);
                uniqueLotes.push(lote);
            } else {
                const existingFechaCX = existingLote.fechaCX
                    ? (typeof existingLote.fechaCX === 'string' ? new Date(existingLote.fechaCX) : existingLote.fechaCX.toDate())
                    : new Date(0);
                const currentFechaCX = lote.fechaCX
                    ? (typeof lote.fechaCX === 'string' ? new Date(lote.fechaCX) : lote.fechaCX.toDate())
                    : new Date(0);

                if (currentFechaCX > existingFechaCX || 
                    (currentFechaCX.getTime() === existingFechaCX.getTime() && 
                     (lote.fechaCreacion?.toDate() || new Date(0)) > (existingLote.fechaCreacion?.toDate() || new Date(0)))) {
                    seenPatients.set(nombrePaciente, lote);
                    const index = uniqueLotes.findIndex(l => l.docId === existingLote.docId);
                    uniqueLotes[index] = lote;
                }
            }
            return uniqueLotes;
        }, []);
    }

    function updateYearFilter(data) {
        if (!filterYearSelect) return;
        const years = [...new Set(data
            .filter(p => p?.fechaCX)
            .map(p => {
                let fechaCX;
                if (typeof p.fechaCX === 'string') fechaCX = new Date(p.fechaCX);
                else if (p.fechaCX instanceof Timestamp) fechaCX = p.fechaCX.toDate();
                else if (p.fechaCX instanceof Date) fechaCX = p.fechaCX;
                return fechaCX && !isNaN(fechaCX) ? fechaCX.getFullYear().toString() : null;
            })
            .filter(y => y)
        )].sort((a, b) => b - a);

        filterYearSelect.innerHTML = '<option value="">Todos los años</option>' + years.map(year => `<option value="${year}">${year}</option>`).join('');
        filterYearSelect.value = quickFilters.year || '';
    }

    function updateMonthFilter(data) {
        if (!filterMonthSelect) return;
        const months = [...new Set(data
            .filter(p => {
                if (!p.fechaCX) return false;
                let fechaCX;
                if (typeof p.fechaCX === 'string') fechaCX = new Date(p.fechaCX);
                else if (p.fechaCX instanceof Timestamp) fechaCX = p.fechaCX.toDate();
                else if (p.fechaCX instanceof Date) fechaCX = p.fechaCX;
                if (!fechaCX || isNaN(fechaCX)) return false;
                return !quickFilters.year || fechaCX.getFullYear().toString() === quickFilters.year;
            })
            .map(p => {
                let fechaCX;
                if (typeof p.fechaCX === 'string') fechaCX = new Date(p.fechaCX);
                else if (p.fechaCX instanceof Timestamp) fechaCX = p.fechaCX.toDate();
                return fechaCX ? (fechaCX.getMonth() + 1).toString().padStart(2, '0') : '';
            })
            .filter(m => m)
        )].sort();

        filterMonthSelect.innerHTML = '<option value="">Todos los meses</option>' + months.map(month => `<option value="${month}" title="${monthNames[month]}">${monthNames[month]}</option>`).join('');
        filterMonthSelect.value = quickFilters.month || '';
    }

    function updatePagination(total) {
        if (!pageInfo || !totalRecords || !prevBtn || !nextBtn) return;
        const totalPages = Math.ceil(total / recordsPerPage);
        totalRecords.textContent = total;
        pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    async function syncLotesFromAsignaciones() {
        try {
            showLoading();
            const asignacionesCollection = collection(db, 'asignaciones');
            const q = query(asignacionesCollection);
            cargosUnsubscribe = onSnapshot(q, async (snapshot) => {
                let changesMade = false;
                for (const change of snapshot.docChanges()) {
                    const asignacion = change.doc.data();
                    const asignacionId = change.doc.id;
                    if (change.type === 'added' || change.type === 'modified') {
                        const loteData = {
                            admision: asignacion.admision || '-',
                            nombrePaciente: asignacion.nombrePaciente || '-',
                            fechaCX: asignacion.fechaCX || null,
                            documentoDelivery: asignacion.documentoDelivery || '-',
                            insumoDevuelto: asignacion.insumoDevuelto || '-',
                            cantidad: asignacion.cantidad || 0,
                            cargado: asignacion.cargado || false,
                            estado: asignacion.estado || '-',
                            fechaCreacion: asignacion.fechaCreacion || Timestamp.now()
                        };
                        await setDoc(doc(db, 'lotes', asignacionId), loteData);
                        changesMade = true;
                    }
                }
                if (changesMade) {
                    await debouncedLoadLotes();
                }
                hideLoading();
            }, error => {
                showSuccessMessage('Error al sincronizar lotes: ' + error.message, false);
                hideLoading();
            });
        } catch (error) {
            showSuccessMessage('Error al sincronizar lotes: ' + error.message, false);
            hideLoading();
        }
    }

    function getCachedData() {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_DURATION) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return data;
    }

    function setCachedData(data) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    }

    const debouncedLoadLotes = debounce(loadLotes, 500);

    async function loadLotes() {
        if (isLoading) {
            return;
        }
        isLoading = true;
        showLoading();

        try {
            if (!tableBody) {
                showSuccessMessage('Error: No se encontró la tabla de lotes', false);
                return;
            }

            // Intentar cargar desde caché
            let cachedLotes = getCachedData();
            if (cachedLotes && quickFilters.year === cachedLotes.filters?.year && quickFilters.month === cachedLotes.filters?.month) {
                lotes = cachedLotes.lotes;
                totalLotesCount = cachedLotes.total;
            } else {
                const lotesCollection = collection(db, 'lotes');
                let q = query(lotesCollection, orderBy('fechaCX', 'desc'), orderBy('fechaCreacion', 'desc'), limit(recordsPerPage));
                if (lastVisibleDoc && currentPage > 1) {
                    q = query(lotesCollection, orderBy('fechaCX', 'desc'), orderBy('fechaCreacion', 'desc'), startAfter(lastVisibleDoc), limit(recordsPerPage));
                }

                const querySnapshot = await getDocs(q);
                lotes = [];
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    lotes.push({ docId: doc.id, ...data });
                });

                // Contar total de documentos para paginación
                const totalQuery = query(collection(db, 'lotes'));
                const totalSnapshot = await getDocs(totalQuery);
                totalLotesCount = totalSnapshot.size;

                lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
                firstVisibleDoc = currentPage === 1 ? querySnapshot.docs[0] : firstVisibleDoc;

                setCachedData({ lotes, total: totalLotesCount, filters: quickFilters });
            }

            const uniqueLotes = removeDuplicatePatients(lotes);
            const { guiasMap, cargosMap } = await preloadGuiasAndCargos(uniqueLotes);

            updateYearFilter(uniqueLotes);
            updateMonthFilter(uniqueLotes);

            let filteredLotes = applyQuickFilters(uniqueLotes);
            const startIndex = (currentPage - 1) * recordsPerPage;
            const paginatedLotes = filteredLotes.slice(0, recordsPerPage); // Usar solo los registros cargados

            const isUserAdmin = await isAdmin();
            const fragment = document.createDocumentFragment();
            tableBody.innerHTML = '';

            for (const lote of paginatedLotes) {
                const folio = getFolioForGuiaDespacho(lote.documentoDelivery, guiasMap);
                const cargado = checkAllCargadoForAdmision(lote.admision, cargosMap);
                const tr = document.createElement('tr');
                tr.dataset.loteId = lote.docId;
                tr.innerHTML = `
                    <td>${lote.admision || '-'}</td>
                    <td>${lote.nombrePaciente || '-'}</td>
                    <td>${formatDateOnly(lote.fechaCX)}</td>
                    <td class="editable">${lote.documentoDelivery || '-'}</td>
                    <td class="editable">${lote.insumoDevuelto || '-'}</td>
                    <td class="editable">${lote.cantidad || '-'}</td>
                    <td class="editable ${isUserAdmin ? 'admin-only' : ''}">${cargado}</td>
                    <td class="editable ${isUserAdmin ? 'admin-only' : ''}">${lote.estado || '-'}</td>
                    <td>${folio}</td>
                `;
                fragment.appendChild(tr);
            }

            tableBody.appendChild(fragment);
            updatePagination(totalLotesCount);

            const editableCells = tableBody.querySelectorAll('td.editable');
            editableCells.forEach(cell => {
                cell.addEventListener('dblclick', () => handleCellDoubleClick(cell, isUserAdmin));
            });
        } catch (error) {
            showSuccessMessage('Error al cargar lotes: ' + error.message, false);
        } finally {
            isLoading = false;
            hideLoading();
        }
    }

    function listenCargosChanges() {
        if (cargosUnsubscribe) {
            cargosUnsubscribe();
        }

        const cargosCollection = collection(db, 'cargosconsignacion');
        cargosUnsubscribe = onSnapshot(cargosCollection, async (snapshot) => {
            let changesMade = false;
            for (const change of snapshot.docChanges()) {
                if (change.type === 'modified' || change.type === 'added' || change.type === 'removed') {
                    const cargoData = change.doc.data();
                    const admision = cargoData.admision;
                    if (admision) {
                        changesMade = true;
                    }
                }
            }
            if (changesMade) {
                localStorage.removeItem(CACHE_KEY);
                debouncedLoadLotes();
            }
        }, error => {
            showSuccessMessage('Error al sincronizar estados: ' + error.message, false);
        });
    }

    function cleanup() {
        if (cargosUnsubscribe) {
            cargosUnsubscribe();
            cargosUnsubscribe = null;
        }
    }

    async function handleCellDoubleClick(cell, isUserAdmin) {
        if (!editLoteModal || !editLoteForm) {
            showSuccessMessage('Error: No se encontró el formulario de edición', false);
            return;
        }

        const row = cell.closest('tr');
        const loteId = row.dataset.loteId;
        const lote = lotes.find(l => l.docId === loteId);
        if (!lote) {
            showSuccessMessage('Error: No se encontró el lote', false);
            return;
        }

        editLoteForm['documentoDelivery'].value = lote.documentoDelivery || '';
        editLoteForm['insumoDevuelto'].value = lote.insumoDevuelto || '';
        editLoteForm['cantidad'].value = lote.cantidad || '';
        if (isUserAdmin) {
            editLoteForm['cargado'].value = lote.cargado ? 'true' : 'false';
            editLoteForm['estado'].value = lote.estado || '';
            editLoteForm.classList.add('admin');
        } else {
            editLoteForm.classList.remove('admin');
        }

        showModal(editLoteModal);

        const submitHandler = async (e) => {
            e.preventDefault();
            try {
                const updatedData = {
                    documentoDelivery: editLoteForm['documentoDelivery'].value || '-',
                    insumoDevuelto: editLoteForm['insumoDevuelto'].value || '-',
                    cantidad: parseInt(editLoteForm['cantidad'].value) || 0
                };
                if (isUserAdmin) {
                    updatedData.cargado = editLoteForm['cargado'].value === 'true';
                    updatedData.estado = editLoteForm['estado'].value || '-';
                }
                const loteRef = doc(db, 'lotes', loteId);
                await updateDoc(loteRef, updatedData);
                showSuccessMessage('Lote actualizado correctamente');
                hideModal(editLoteModal);
                localStorage.removeItem(CACHE_KEY);
                await debouncedLoadLotes();
            } catch (error) {
                showSuccessMessage('Error al actualizar el lote: ' + error.message, false);
            }
            editLoteForm.removeEventListener('submit', submitHandler);
        };

        const cancelBtn = editLoteForm.querySelector('.form-btn.cancel');
        const cancelHandler = () => {
            hideModal(editLoteModal);
            editLoteForm.removeEventListener('submit', submitHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
        };

        editLoteForm.addEventListener('submit', submitHandler);
        cancelBtn.addEventListener('click', cancelHandler);
    }

    async function exportToExcel() {
        try {
            if (!window.XLSX || !window.XLSX.utils || !window.XLSX.utils.json_to_sheet) {
                throw new Error('Biblioteca XLSX no está cargada correctamente');
            }
            showLoading();
            const lotesCollection = collection(db, 'lotes');
            const querySnapshot = await getDocs(lotesCollection); // Cargar todos los lotes para exportar
            let allLotes = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                allLotes.push({ docId: doc.id, ...data });
            });

            const uniqueLotes = removeDuplicatePatients(allLotes);
            const filteredLotes = applyQuickFilters(uniqueLotes);
            const { guiasMap, cargosMap } = await preloadGuiasAndCargos(filteredLotes);
            const data = filteredLotes.map(lote => ({
                Admisión: lote.admision || '-',
                'Nombre Paciente': lote.nombrePaciente || '-',
                'Fecha Cx': formatDateOnly(lote.fechaCX),
                'Documento Delivery': lote.documentoDelivery || '-',
                'Insumo Devuelto': lote.insumoDevuelto || '-',
                Cantidad: lote.cantidad || '-',
                Cargado: checkAllCargadoForAdmision(lote.admision, cargosMap),
                Estado: lote.estado || '-',
                Guía: getFolioForGuiaDespacho(lote.documentoDelivery, guiasMap)
            }));
            const worksheet = window.XLSX.utils.json_to_sheet(data);
            const workbook = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Lotes');
            window.XLSX.writeFile(workbook, 'lotes.xlsx');
        } catch (error) {
            showSuccessMessage('Error al exportar a Excel: ' + error.message, false);
        } finally {
            hideLoading();
        }
    }

    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            debouncedLoadLotes();
            syncLotesFromAsignaciones();
            listenCargosChanges();
        } else {
            showSuccessMessage('Por favor, inicia sesión para continuar', false);
            container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión.</p>';
            setTimeout(() => {
                window.location.href = 'index.html?error=auth-required';
            }, 2000);
        }
    });

    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            lastVisibleDoc = firstVisibleDoc; // Retroceder usando el primer documento de la página actual
            debouncedLoadLotes();
        }
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
        currentPage++;
        debouncedLoadLotes();
    });

    if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);

    if (filterYearSelect) filterYearSelect.addEventListener('change', () => {
        quickFilters.year = filterYearSelect.value || null;
        updateMonthFilter(lotes);
        currentPage = 1;
        lastVisibleDoc = null;
        firstVisibleDoc = null;
        localStorage.removeItem(CACHE_KEY);
        debouncedLoadLotes();
    });

    if (filterMonthSelect) filterMonthSelect.addEventListener('change', () => {
        quickFilters.month = filterMonthSelect.value || null;
        currentPage = 1;
        lastVisibleDoc = null;
        firstVisibleDoc = null;
        localStorage.removeItem(CACHE_KEY); 
        debouncedLoadLotes();
    });

    if (showAllBtn) showAllBtn.addEventListener('click', () => {
        quickFilters = { year: null, month: null };
        filterYearSelect.value = '';
        filterMonthSelect.value = '';
        currentPage = 1;
        lastVisibleDoc = null;
        firstVisibleDoc = null;
        localStorage.removeItem(CACHE_KEY);
        debouncedLoadLotes();
    });

    window.addEventListener('beforeunload', cleanup);

} catch (error) {
    const container = document.querySelector('.lotes-container');
    if (container) {
        container.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;
    } else {
        document.body.innerHTML = `<p>Error al inicializar Firebase: ${error.message}</p>`;
    }
}