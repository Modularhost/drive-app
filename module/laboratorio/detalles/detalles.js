import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import * as XLSX from "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

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
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const detallesTableBody = document.querySelector('#detalles-table tbody');
const tableContainer = document.getElementById('table-container');
const totalRecords = document.getElementById('total-records');
const yearFilter = document.getElementById('year-filter');

let detalles = [];
let filters = {};
let availableYears = [];

function showModal(modal, progressElement, percentage) {
    if (modal && progressElement) {
        modal.style.display = 'flex';
        progressElement.textContent = `${percentage}%`;
    }
}

function hideModal(modal) {
    if (modal) {
        modal.style.display = 'none';
    }
}

function showSuccessMessage(message, isSuccess = true) {
    if (successModal && successIcon && successMessage) {
        successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
        successIcon.className = `fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
        successMessage.textContent = message;
        successModal.style.display = 'flex';
        setTimeout(() => hideModal(successModal), 5000);
    }
}

async function loadDetalles() {
    try {
        showModal(loadingModal, loadingProgress, 0);
        const facturasCollection = collection(db, 'facturas');
        const querySnapshot = await getDocs(facturasCollection);

        const monthlyData = {};
        availableYears = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();

            let fechaIngreso;
            if (data.fechaIngreso) {
                if (data.fechaIngreso.toDate && typeof data.fechaIngreso.toDate === 'function') {
                    fechaIngreso = data.fechaIngreso.toDate();
                } else if (typeof data.fechaIngreso === 'string') {
                    fechaIngreso = new Date(data.fechaIngreso);
                } else if (data.fechaIngreso instanceof Date) {
                    fechaIngreso = data.fechaIngreso;
                }
            }

            if (!fechaIngreso || isNaN(fechaIngreso)) {
                return;
            }

            const year = fechaIngreso.getFullYear();
            if (!availableYears.includes(year)) {
                availableYears.push(year);
            }

            const month = fechaIngreso.getMonth() + 1;
            const mesNombre = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(fechaIngreso);
            const key = `${month}-${year}`;

            const actaRaw = data.acta ?? 0;
            const salidaRaw = data.salida ?? 0;
            const montoRaw = data.montoFactura ?? 0;

            const acta = typeof actaRaw === 'string' ? parseFloat(actaRaw.replace(/\./g, '')) || 0 : parseFloat(actaRaw) || 0;
            const salida = typeof salidaRaw === 'string' ? parseFloat(salidaRaw.replace(/\./g, '')) || 0 : parseFloat(salidaRaw) || 0;
            const monto = typeof montoRaw === 'string' ? parseFloat(montoRaw.replace(/\./g, '')) || 0 : parseFloat(montoRaw) || 0;

            if (acta > 0 || salida > 0) {
                if (!monthlyData[key]) {
                    monthlyData[key] = {
                        mes: mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1),
                        anio: year,
                        totalIngresadas: 0,
                        totalSalidas: 0,
                        totalFacturas: 0
                    };
                }
                if (acta > 0) {
                    monthlyData[key].totalIngresadas += monto;
                }
                if (salida > 0) {
                    monthlyData[key].totalSalidas += monto;
                }
                monthlyData[key].totalFacturas += 1;
            }
        });

        detalles = Object.values(monthlyData).filter(d => d.totalIngresadas > 0 || d.totalSalidas > 0);

        availableYears.sort((a, b) => b - a);

        yearFilter.innerHTML = '';
        availableYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        });
        yearFilter.value = new Date().getFullYear();

        detalles.sort((a, b) => {
            if (a.anio === b.anio) {
                return a.mes.localeCompare(b.mes);
            }
            return b.anio - a.anio;
        });

        if (tableContainer && totalRecords) {
            totalRecords.textContent = `Total de registros: ${detalles.length}`;
            renderTable();
            tableContainer.style.display = 'block';
        } else {
            showSuccessMessage('Error: Elementos de la tabla no encontrados.', false);
        }
        hideModal(loadingModal);
    } catch (error) {
        showSuccessMessage('Error al cargar detalles: ' + error.message, false);
        hideModal(loadingModal);
    }
}

function renderTable() {
    const selectedYear = parseInt(yearFilter.value);
    let filteredData = detalles.filter((detalle) => {
        return Object.entries(filters).every(([column, value]) => {
            if (!value) return true;
            const columnValue = detalle[column]?.toString().toLowerCase() || '';
            return columnValue.includes(value.toLowerCase());
        }) && detalle.anio === selectedYear;
    });

    if (detallesTableBody) {
        detallesTableBody.innerHTML = '';
        filteredData.forEach(detalle => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${detalle.mes}</td>
                <td>${detalle.anio}</td>
                <td>${detalle.totalIngresadas.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</td>
                <td>${detalle.totalSalidas.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</td>
                <td>${detalle.totalFacturas}</td>
            `;
            detallesTableBody.appendChild(tr);
        });
    }

    document.querySelectorAll('.filter-icon').forEach(icon => {
        const column = icon.dataset.column;
        if (filters[column]) {
            icon.classList.remove('fa-filter');
            icon.classList.add('fa-filter-circle-xmark', 'active');
        } else {
            icon.classList.remove('fa-filter-circle-xmark', 'active');
            icon.classList.add('fa-filter');
        }
    });
}

async function init() {
    const container = document.querySelector('.detalles-container');
    if (!container) {
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión nuevamente.</p>';
            window.location.href = 'main.html?error=auth-required';
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                container.innerHTML = '<p>Error: Tu cuenta no está registrada en la base de datos. Contacta al administrador.</p>';
                return;
            }

            const userData = userDoc.data();

            const hasAccess = userData.role === 'Administrador' || userData.role === 'Operador';
            if (!hasAccess) {
                container.innerHTML = '<p>Acceso denegado. No tienes permisos para acceder a este módulo.</p>';
                return;
            }

            loadDetalles();

            yearFilter.addEventListener('change', () => {
                renderTable();
            });

            document.querySelectorAll('.filter-icon').forEach(icon => {
                icon.addEventListener('click', (e) => {
                    const column = e.target.dataset.column;

                    if (e.target.classList.contains('fa-filter-circle-xmark')) {
                        delete filters[column];
                        renderTable();
                        return;
                    }

                    document.querySelectorAll('.filter-input-container').forEach(input => input.remove());

                    const container = document.createElement('div');
                    container.className = 'filter-input-container';
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = `Filtrar por ${column}`;
                    input.value = filters[column] || '';
                    input.addEventListener('input', () => {
                        const value = input.value.trim();
                        if (value) {
                            filters[column] = value;
                        } else {
                            delete filters[column];
                        }
                        renderTable();
                    });
                    container.appendChild(input);
                    e.target.parentElement.appendChild(container);
                    input.focus();
                });
            });

            document.addEventListener('click', (e) => {
                if (!e.target.classList.contains('fa-filter') && !e.target.classList.contains('fa-filter-circle-xmark') && !e.target.closest('.filter-input-container')) {
                    document.querySelectorAll('.filter-input-container').forEach(input => input.remove());
                }
            });

        } catch (error) {
            container.innerHTML = `<p>Error al verificar permisos: ${error.message}</p>`;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
};