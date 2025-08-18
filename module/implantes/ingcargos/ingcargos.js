import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp, Timestamp, writeBatch, doc, deleteDoc, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
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

    let allCargos = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let selectedEstado = null;
    let selectedDayGlobal = '';
    let filterTimeout = null;
    let editingCargoId = null;
    let cargoIdToDelete = null;

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
            loadingOverlay: document.getElementById('loading-overlay')
        };

        let missingElements = false;
        Object.entries(elements).forEach(([key, el]) => {
            if (!el) {
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
                cargo.proveedor?.trim() === proveedor?.trim()
            );
            const totalGrupo = matchingCargos.reduce((sum, cargo) => {
                const totalItem = (cargo.cantidad || 0) * (cargo.precioSistema || cargo.precio || 0);
                return sum + totalItem;
            }, 0);
            return totalGrupo;
        } catch (error) {
            showMessage(`Error al calcular Total Grupo: ${error.message}`, 'error');
            return 0;
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
            showMessage(`Error al buscar referencia: ${error.message}`, 'error');
            return null;
        } finally {
            hideLoading();
        }
    }

    async function checkPaqueteAndFillFields(codigo) {
        try {
            const paquetesQuery = query(
                collection(db, 'paquetes'),
                where('codigo', '==', codigo.trim())
            );
            const paquetesSnapshot = await getDocs(paquetesQuery);
            if (!paquetesSnapshot.empty) {
                loteInput.value = 'PAD';
                vencimientoInput.value = 'PAD';
            } else {
                loteInput.value = '';
                vencimientoInput.value = '';
            }
        } catch (error) {
            showMessage(`Error al verificar el código en paquetes: ${error.message}`, 'error');
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
            showMessage(`Error al actualizar cargo: ${error.message}`, 'error');
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

    async function loadCargos(user) {
        if (!user) {
            return [];
        }
        try {
            showLoading();
            const cargosQuery = query(
                collection(db, 'cargosimp'),
                where('uid', '==', user.uid),
                orderBy('fechaCarga', 'desc')
            );
            const cargosSnapshot = await getDocs(cargosQuery);
            const cargos = cargosSnapshot.docs.map(doc => {
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
                    fechaCarga: data.fechaCarga || null,
                    corpo: data.corpo || '',
                    precioSistema: data.precioSistema || data.precio || 0,
                    agrupacion: data.agrupacion || '',
                    totalItem: totalItem,
                    margen: margen,
                    convenio: data.convenio || '',
                    modalidad: data.modalidad || '',
                    categoria: data.categoria || '',
                    fechaDescarga: data.fechaDescarga || null
                };
            });
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
            const hasAdditionalFilters = selectedMonth || selectedDay || admisionSearch || pacienteSearch || selectedEstado || (selectedColumn && columnSearchValue);
            if (!hasAdditionalFilters) {
                tabla1Body.innerHTML = '<tr><td colspan="9" class="text-center">No hay filtros aplicados. Selecciona un filtro o escribe un término de búsqueda.</td></tr>';
                tabla2Body.innerHTML = '<tr><td colspan="10" class="text-center">No hay filtros aplicados. Selecciona un filtro o escribe un término de búsqueda.</td></tr>';
                tabla3Body.innerHTML = '<tr><td colspan="15" class="text-center">No hay filtros aplicados. Selecciona un filtro o escribe un término de búsqueda.</td></tr>';
                allCargos = [];
                updatePagination([]);
                updateActionButtons();
                renderStateFilterButtons([]);
                hideLoading();
                return;
            }
            const user = auth.currentUser;
            if (!user) {
                showMessage('Usuario no autenticado.', 'error');
                hideLoading();
                return;
            }
            if (allCargos.length === 0) {
                allCargos = await loadCargos(user);
            }
            let filteredCargos = allCargos;
            if (selectedYear) {
                filteredCargos = filteredCargos.filter(cargo => {
                    if (!cargo.fechaCx || !(cargo.fechaCx instanceof Timestamp)) return false;
                    const date = cargo.fechaCx.toDate();
                    return date.getFullYear() === parseInt(selectedYear);
                });
            }
            if (selectedMonth) {
                filteredCargos = filteredCargos.filter(cargo => {
                    if (!cargo.fechaCx || !(cargo.fechaCx instanceof Timestamp)) return false;
                    const date = cargo.fechaCx.toDate();
                    return (date.getMonth() + 1) === parseInt(selectedMonth);
                });
            }
            if (selectedDay && selectedDay !== '') {
                filteredCargos = filteredCargos.filter(cargo => {
                    if (!cargo.fechaCx || !(cargo.fechaCx instanceof Timestamp)) {
                        return false;
                    }
                    const date = cargo.fechaCx.toDate();
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
                    const cargoRef = doc(db, 'cargosimp', cargoId);
                    batch.update(cargoRef, { lote, vencimiento });
                });
                await batch.commit();
                showMessage(`Lote y vencimiento actualizados para ${cargoIds.length} cargos.`, 'success');
                lotesModal.classList.remove('active');
                allCargos = await loadCargos(auth.currentUser);
                filterData();
            } catch (error) {
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
                        <td class="fecha-cargo">${formatDateForDisplay(cargo.fechaCx)}</td>
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
                'Fecha Cargo': formatDateForDisplay(cargo.fechaCx),
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
            showMessage(`Error al generar Excel o actualizar Firestore: ${error.message}`, 'error');
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
                <td class="fecha-carga">${formatDateForDisplay(cargo.fechaCarga)}</td>
                <td class="acciones">
                    <i class="fas fa-edit action-icon" data-cargo-id="${cargo.id}"></i>
                    <i class="fas fa-trash action-icon" data-cargo-id="${cargo.id}"></i>
                </td>
            `;
            tabla1Body.appendChild(row);
        });
        tabla1Body.querySelectorAll('.row-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateActionButtons);
        });
        tabla1Body.querySelectorAll('.fa-edit').forEach(icon => {
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
                }
            });
        });
        tabla1Body.querySelectorAll('.fa-trash').forEach(icon => {
            icon.addEventListener('click', () => {
                cargoIdToDelete = icon.dataset.cargoId;
                deleteModal.classList.add('active');
            });
        });
        tabla1Body.querySelectorAll('td.estado').forEach(cell => {
            cell.addEventListener('dblclick', () => {
                const cargoId = cell.parentElement.dataset.cargoId;
                showEstadoModal([cargoId]);
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
        tabla2Body.querySelectorAll('td.lote, td.fecha-vencimiento').forEach(cell => {
            cell.addEventListener('dblclick', () => {
                const cargoId = cell.parentElement.dataset.cargoId;
                showLotesModal([cargoId]);
            });
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
        paginatedCargos.forEach(cargo => {
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
                // Verificar si el código existe en la colección 'paquetes' y autocompletar lote y vencimiento
                await checkPaqueteAndFillFields(codigoSpan.textContent);
            } else {
                precioSpan.textContent = '';
                descripcionSpan.textContent = '';
                proveedorSpan.textContent = '';
                codigoSpan.textContent = '';
                totalSpan.textContent = '0';
                totalCotizacionSpan.textContent = '';
                modalidadSpan.textContent = '';
                categoriaSpan.textContent = '';
                loteInput.value = '';
                vencimientoInput.value = '';
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
            loteInput.value = '';
            vencimientoInput.value = '';
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
                agrupacion: (await fetchReferenciaData(referencia))?.agrupacion || '',
                totalItem: cantidad * precio,
                margen: calculateMargin(precio),
                estado: 'Pendiente',
                fechaCarga: serverTimestamp(),
                corpo: (await fetchReferenciaData(referencia))?.corpo || '',
                venta: calculateVenta(precio, cantidad, modalidad, calculateMargin(precio))
            };
            await addDoc(collection(db, 'cargosimp'), cargoData);
            showMessage('Cargo registrado correctamente.', 'success');
            resetForm();
            allCargos = await loadCargos(user);
            filterData();
        } catch (error) {
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
            allCargos = await loadCargos(user);
            await updateReferenciasWithLowerCase();
            populateDateFilters(allCargos);
            setupEventListeners();
            ingresoInput.value = getTodayDate();
            filterData();
        } else {
            tabla1Body.innerHTML = '<tr><td colspan="9" class="text-center">Por favor, inicia sesión.</td></tr>';
            tabla2Body.innerHTML = '<tr><td colspan="10" class="text-center">Por favor, inicia sesión.</td></tr>';
            tabla3Body.innerHTML = '<tr><td colspan="15" class="text-center">Por favor, inicia sesión.</td></tr>';
            showMessage('Por favor, inicia sesión.', 'error');
        }
    });

} catch (error) {
    showMessage(`Error en la inicialización: ${error.message}`, 'error');

}
